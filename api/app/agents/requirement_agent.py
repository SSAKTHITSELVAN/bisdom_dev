from app.agents.config_agent import build_agent_system_prompt
"""
Requirement Agent — Enriches buyer requirements through conversational AI.
Collects mandatory fields (product, quantity, budget) and additional details
via follow-up questions, one at a time.
"""
import json
from typing import Optional
from app.agents.bedrock_client import call_qwen3


REQUIREMENT_SYSTEM = """You are Bisdom's sourcing assistant — a smart, efficient AI agent helping
Indian SME business owners post procurement requirements.

Your job:
1. Analyze the buyer's requirement message
2. Identify what information is STILL missing (don't re-ask what they already told you)
3. Ask ONE short follow-up question to fill the most important gap
4. Once you have enough info, present the structured summary

MUST HAVE (need at minimum):
- product: what exactly they need
- quantity: how much (with unit — kg, pieces, meters, liters, sets)

HELPFUL FOR SELLERS (ask max 2-3 of these, pick the most relevant):
- specifications: material, grade, color, size, GSM — only ask if it affects pricing/matching
- delivery_location: city/state for shipping cost
- budget_max: max price — if user says "flexible"/"market rate", set to null and move on

SKIP THESE unless user mentions them:
- delivery_days, order_type, packaging — not critical for matching

QUESTION STYLE:
- ONE question per message. Max 1-2 sentences.
- Frame as choices when possible: "Do you need 180 GSM or 240 GSM? Or no preference?"
- If user already gave specs in their first message, DON'T re-ask. Extract what they said.
- After 2-3 follow-ups, wrap up — don't interrogate.
- If user says "that's it"/"done"/"post it"/"go ahead"/"skip" — immediately produce summary.

WHAT HELPS SELLERS MOST:
- Exact product type + material (e.g. "cotton round-neck t-shirts" not just "t-shirts")
- Quantity with unit
- Key spec that affects price (GSM for fabric, TC for sheets, denier for yarn)
- Delivery city

DON'T ask about: packaging, payment terms, order frequency, brand preferences — sellers handle these in negotiation.

When ready, output:
<REQUIREMENT_READY>
{
  "product": "...",
  "quantity": 100,
  "quantity_unit": "pieces",
  "budget_min": null,
  "budget_max": 200,
  "budget_unit": "INR per piece",
  "specifications": {...},
  "delivery_location": "...",
  "delivery_days": null,
  "order_type": null,
  "packaging": null,
  "additional_notes": null
}
</REQUIREMENT_READY>
Then say: "Here's what I've got. Look good? Confirm to start matching with suppliers."

- Use null for fields not provided.
- Be brief. 1-2 sentences max per message. Indian business owners are busy."""


async def process_requirement_message(
    conversation_history: list,
    new_message: str,
    current_requirement: Optional[dict] = None,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """
    Process a new user message in the requirement enrichment conversation.

    Returns:
    {
        "ai_response": str,          # what to show the user
        "is_complete": bool,         # all mandatory fields captured
        "requirement_data": dict,    # structured requirement if complete
        "updated_history": list      # updated conversation history
    }
    """
    # Build message history for Qwen3
    messages = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": [{"text": msg["content"]}]})

    # Add current message
    messages.append({"role": "user", "content": [{"text": new_message}]})

    enriched_system = build_agent_system_prompt(REQUIREMENT_SYSTEM, profile_md, buyer_settings_md)
    ai_response = await call_qwen3(
        messages,
        system_prompt=enriched_system,
        max_tokens=1024,
        temperature=0.6,
    )

    # Check if requirement is ready
    is_complete = "<REQUIREMENT_READY>" in ai_response
    requirement_data = None
    display_response = ai_response

    if is_complete:
        try:
            # Extract JSON from response
            start = ai_response.index("<REQUIREMENT_READY>") + len("<REQUIREMENT_READY>")
            end = ai_response.index("</REQUIREMENT_READY>")
            json_str = ai_response[start:end].strip()
            requirement_data = json.loads(json_str)

            # Clean display response — remove the JSON block
            display_response = (
                ai_response[:ai_response.index("<REQUIREMENT_READY>")].strip()
                + "\n\n"
                + ai_response[end + len("</REQUIREMENT_READY>"):].strip()
            ).strip()

            if not display_response:
                display_response = (
                    "Here's your requirement summary. Does everything look correct? "
                    "Type 'yes' to confirm or let me know what to change."
                )
        except (ValueError, json.JSONDecodeError):
            is_complete = False

    # Update conversation history
    updated_history = conversation_history + [
        {"role": "user", "content": new_message},
        {"role": "assistant", "content": display_response},
    ]

    return {
        "ai_response": display_response,
        "is_complete": is_complete,
        "requirement_data": requirement_data,
        "updated_history": updated_history,
    }


async def confirm_requirement(requirement_data: dict, buyer_profile: dict) -> dict:
    """
    Final validation and structuring of requirement before matching.
    Adds buyer context and prepares the matching JSON.
    """
    matching_json = {
        **requirement_data,
        "buyer_location": buyer_profile.get("city", ""),
        "buyer_state": buyer_profile.get("state", ""),
        "buyer_business_type": buyer_profile.get("business_type", ""),
        "status": "confirmed",
    }
    return matching_json
