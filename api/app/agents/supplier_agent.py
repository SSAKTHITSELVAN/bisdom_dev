"""
Supplier Agent — Human-like B2B sales agent representing the supplier.
Reads full seller profile + settings to negotiate naturally.
Conversations flow like real business discussions — ask questions, discuss, negotiate, close.
"""
import json
import re
from typing import Optional
from app.agents.bedrock_client import call_qwen3
from app.agents.config_agent import build_agent_system_prompt


SUPPLIER_AGENT_SYSTEM = """You are a sales assistant chatting on behalf of {trade_name}, based in {location}.

YOUR COMPANY INFO:
{profile_md}

PRICING & SETTINGS:
{seller_settings_md}

WHAT YOU DO:
- Talk to the buyer like a friendly salesperson on WhatsApp
- Gather information about their exact needs (specs, quantity, delivery, timeline)
- Answer buyer's questions about your products
- Negotiate price within your range (small concessions okay)
- Keep it short — 2-4 sentences per message, like a real chat

YOUR GOAL:
- The conversation is for GATHERING INFO from the buyer
- Once you have enough details (quantity, specs, delivery, timeline confirmed), BUILD a final offer
- When ready with a final offer, use the <FINAL_OFFER> tag (see below)

FINAL OFFER TAG — use when you have enough info and are ready to propose a deal:
<FINAL_OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." message="Your final offer message to present to the buyer" />

Use <FINAL_OFFER> when:
- Buyer has confirmed quantity, specs, delivery details
- You've discussed pricing and reached a reasonable point
- After 3+ rounds of conversation where key details are clear
- When buyer seems satisfied with your terms

WHAT YOU NEVER DO:
- NEVER accept a deal or close a deal — only humans do that
- NEVER say "deal done", "confirmed", "let's proceed" — that's the human's call
- NEVER make commitments the human hasn't approved
- If buyer says "let's go ahead" → say "Great! Let me confirm with my team and get back to you"
- If anything needs human approval → say "Let me check with my team" and add <NEEDS_SUPPLIER_INPUT reason="..." />

OFFER TAG (use when quoting price during discussion, NOT as final offer):
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

OUTPUT RULES:
- Write ONLY the chat message — no markdown, no bullets, no headers
- Sound like a real person texting, not a formal email
- 2-4 sentences max"""


async def generate_supplier_opener(
    requirement: dict,
    supplier_profile: dict,
    agent_config: dict,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """Generate the supplier's opening message — warm, natural, human-like."""

    trade_name = supplier_profile.get("trade_name", "our company")
    location = f"{supplier_profile.get('city', '')}, {supplier_profile.get('state', 'India')}".strip(", ")

    system = SUPPLIER_AGENT_SYSTEM.format(
        trade_name=trade_name,
        location=location,
        profile_md=profile_md or f"Supplier: {trade_name}, Location: {location}",
        seller_settings_md=seller_settings_md or "Standard negotiation — professional and balanced.",
    )

    product = requirement.get("product", "your product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget = requirement.get("budget_max", "")
    location_delivery = requirement.get("delivery_location", "")
    specs = requirement.get("specifications") or {}

    prompt = f"""A buyer has just posted this requirement and you've been matched:

Product: {product}
Quantity: {quantity} {qty_unit}
Budget indication: approx ₹{budget}/unit range
Delivery Location: {location_delivery}
Specifications provided: {json.dumps(specs, indent=2) if specs else "Not specified yet"}

Write your opening message — be DIRECT and lead with your offer:
- Greet warmly, introduce {trade_name} briefly (1 sentence about your expertise)
- Present 2-3 options with pricing immediately based on the requirement above
- Include an <OFFER> tag for your recommended option
- End by asking which option interests them or if they want customization
- Keep it conversational and concise (under 8 sentences)
- You have enough info from the requirement — don't ask questions before quoting"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=500, temperature=0.75)

    extracted_offer = _extract_offer(response)

    return {
        "message": response,
        "extracted_offer": extracted_offer,
        "needs_supplier_input": False,
    }


async def supplier_agent_respond(
    conversation_history: list,
    buyer_message: str,
    supplier_profile: dict,
    agent_config: dict,
    negotiation_round: int,
    max_rounds: int = 999,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """
    Generate supplier's natural, human-like response to buyer's message.
    Reads full company profile and settings. One question at a time.
    """
    trade_name = supplier_profile.get("trade_name", "our company")
    location = f"{supplier_profile.get('city', '')}, {supplier_profile.get('state', 'India')}".strip(", ")

    system = SUPPLIER_AGENT_SYSTEM.format(
        trade_name=trade_name,
        location=location,
        profile_md=profile_md or f"Supplier: {trade_name}, Location: {location}",
        seller_settings_md=seller_settings_md or "Standard negotiation — professional and balanced.",
    )

    # Build conversation history for context
    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_supplier", "assistant"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    # Add current buyer message
    round_hint = ""
    if negotiation_round >= 4:
        round_hint = "\n[Note: You've had several rounds of discussion. If you have enough info about the buyer's needs (quantity, specs, delivery, timeline), use the <FINAL_OFFER> tag to submit your formal offer for your team's review. Don't keep chatting indefinitely — build the offer when ready.]"

    messages.append({
        "role": "user",
        "content": [{"text": f"{buyer_message}{round_hint}"}]
    })

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=400,
        temperature=0.7,
    )

    # Check for final offer first
    final_offer = _extract_final_offer(response)

    # Parse markers
    needs_input = "<NEEDS_SUPPLIER_INPUT" in response
    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "This order needs your review"

    extracted_offer = _extract_offer(response)

    # Clean markers from display message
    clean = response
    for tag in ["<NEEDS_SUPPLIER_INPUT", "<OFFER ", "<FINAL_OFFER"]:
        if tag in clean:
            clean = clean[:clean.index(tag)].strip()

    # If model only output the tag with no message, use a natural fallback
    if not clean or clean.startswith("<"):
        if final_offer:
            clean = "Let me put together a formal offer for you. One moment."
        elif needs_input:
            clean = "Let me check with my team on this and get back to you shortly."
        else:
            clean = "Thank you, I'll review this and respond soon."

    # If buyer sounds like they want to proceed, build final offer for supplier review
    if _detect_acceptance(buyer_message) and not final_offer:
        final_offer = extracted_offer or {}
        # Build a readable offer message for the seller to review
        offer_parts = []
        if final_offer.get("price_per_unit"):
            offer_parts.append(f"Price: ₹{final_offer['price_per_unit']}/unit")
        if final_offer.get("quantity"):
            offer_parts.append(f"Quantity: {final_offer['quantity']}")
        if final_offer.get("lead_time_days"):
            offer_parts.append(f"Delivery: {final_offer['lead_time_days']} days")
        if final_offer.get("payment_terms"):
            offer_parts.append(f"Payment: {final_offer['payment_terms']}")
        final_offer["message"] = clean + ("\n\n" + " · ".join(offer_parts) if offer_parts else "")
        clean = "Great! Let me confirm with my team and get back to you with our final offer."

    return {
        "message": clean,
        "needs_supplier_input": needs_input,
        "supplier_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "final_offer": final_offer,
        "is_deal_closed": False,
    }


async def generate_supplier_suggestion(
    conversation_history: list,
    buyer_message: str,
    supplier_profile: dict,
    negotiation_round: int,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> str:
    """
    Generate a suggested response for the human seller.
    This helps sellers craft the best reply without needing to think about strategy.
    """
    trade_name = supplier_profile.get("trade_name", "our company")
    location = supplier_profile.get("city", "India")

    system = f"""You are a B2B sales advisor helping a seller ({trade_name}) craft their next response to a buyer.

SELLER'S PROFILE:
{profile_md or f"Seller: {trade_name}"}

SELLER'S PRICING & SETTINGS:
{seller_settings_md or "Standard negotiation settings."}

YOUR JOB:
- Analyze the conversation and suggest the BEST response the seller should send
- Consider: where in the negotiation we are, what the buyer wants, pricing strategy
- Write the response AS the seller — ready to send as-is
- Keep it natural, professional, 3-6 sentences
- If the buyer asked a question, answer it helpfully
- If it's time to quote, present clear options with pricing
- If negotiating, be strategic — concede only where it makes sense
- Do NOT include XML tags like <OFFER> or <NEEDS_SUPPLIER_INPUT> — this is for human use
- Do NOT include any meta-commentary — just the message text itself

CONVERSATION ROUND: {negotiation_round}
"""

    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_supplier", "human_supplier", "assistant"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    if buyer_message:
        messages.append({
            "role": "user",
            "content": [{"text": f"{buyer_message}\n\n[SYSTEM: Generate the seller's best response to this.]"}]
        })

    response = await call_qwen3(messages, system_prompt=system, max_tokens=400, temperature=0.7)

    for tag in ["<OFFER", "<NEEDS_SUPPLIER_INPUT"]:
        if tag in response:
            response = response[:response.index(tag)].strip()

    return response


def _extract_final_offer(text: str) -> dict | None:
    """Extract <FINAL_OFFER .../> tag — signals supplier AI is ready to present a formal offer."""
    if "<FINAL_OFFER" not in text:
        return None
    try:
        start = text.index("<FINAL_OFFER")
        end = text.index("/>", start) + 2
        offer_str = text[start:end]
        attrs = re.findall(r'(\w+)="([^"]*)"', offer_str)
        result = {}
        for key, val in attrs:
            try:
                result[key] = float(val) if "." in val else int(val)
            except ValueError:
                result[key] = val
        return result if result else None
    except Exception:
        return None


def _extract_offer(text: str) -> dict | None:
    if "<OFFER " not in text:
        return None
    try:
        start = text.index("<OFFER ")
        end = text.index("/>", start) + 2
        offer_str = text[start:end]
        attrs = re.findall(r'(\w+)="([^"]*)"', offer_str)
        result = {}
        for key, val in attrs:
            try:
                result[key] = float(val) if "." in val else int(val)
            except ValueError:
                result[key] = val
        return result
    except Exception:
        return None


def _detect_acceptance(message: str) -> bool:
    keywords = ["accept", "confirm", "deal done", "we agree", "finaliz", "go ahead", "proceed", "approved", "perfect deal", "that works", "agreed"]
    return any(kw in message.lower() for kw in keywords)


def get_default_agent_config() -> dict:
    return {
        "negotiation_style": "balanced",
        "max_rounds": 999,
        "auto_accept_score": 80,
        "auto_decline_score": 40,
        "escalation_order_value": 500000,
        "volume_discount_rules": [],
        "price_floors": {},
    }
