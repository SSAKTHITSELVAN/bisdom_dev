"""
Buyer Agent — Human-like B2B procurement agent representing the buyer.
Reads full buyer profile + settings. Negotiates naturally to get best price.
Conversations flow like real business discussions — answer questions, negotiate, close.
"""
import json
import re
from typing import Optional
from app.agents.bedrock_client import call_qwen3
from app.agents.config_agent import build_agent_system_prompt


BUYER_AGENT_SYSTEM = """You are a procurement assistant chatting on behalf of a buyer.

YOUR COMPANY INFO:
{profile_md}

BUYER SETTINGS:
{buyer_settings_md}

WHAT YOU'RE LOOKING FOR:
- Product: {product}
- Quantity: {quantity} {qty_unit}
- Budget: up to ₹{budget_max}/unit (NEVER tell the supplier this number)
- Delivery to: {delivery_location}
- Timeline: {delivery_days} days
- Specs: {specifications}

WHAT YOU DO:
- Talk to the supplier like a buyer on WhatsApp
- Answer their questions about what you need (quantity, specs, timeline, location)
- When they quote a price, try to negotiate lower — ask for better rate
- Use leverage: volume, quick payment, repeat orders
- Keep it short — 2-4 sentences per message, like a real chat

WHAT YOU NEVER DO:
- NEVER accept a deal or say "confirmed" or "let's proceed" — only the human buyer does that
- NEVER reveal your exact budget (₹{budget_max})
- NEVER walk away or decline — only humans decide that
- NEVER output analysis, bullet points, markdown, or comparisons
- If supplier asks something not in your specs → say "Let me check with my team" and add <NEEDS_BUYER_INPUT reason="..." />
- If the price looks good and you'd normally accept → say "This looks reasonable, let me get my team's approval" and add <NEEDS_BUYER_INPUT reason="Price is within range, needs human approval to proceed" />

OUTPUT RULES:
- Write ONLY the chat message — no markdown, no bullets, no headers
- Sound like a real person texting, not a formal email
- 2-4 sentences max
- NEVER mention Lead #, fit score, or any internal system data"""


async def generate_buyer_opener(
    requirement: dict,
    supplier_profile: dict,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """Generate buyer's opening inquiry to the supplier."""

    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget_max = requirement.get("budget_max", "")
    delivery_location = requirement.get("delivery_location", "")
    delivery_days = requirement.get("delivery_days", "")
    specs = requirement.get("specifications") or {}

    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
        product=product,
        quantity=quantity,
        qty_unit=qty_unit,
        budget_max=budget_max,
        delivery_location=delivery_location,
        delivery_days=delivery_days or "flexible",
        specifications=json.dumps(specs) if specs else "Standard quality",
    )

    trade_name = supplier_profile.get("trade_name", "your company")

    prompt = f"""You are reaching out to {trade_name} about your requirement.

Write a professional opening message:
- Briefly introduce yourself/your company (1 sentence)
- State what you need: {product}, {quantity} {qty_unit}
- Mention key specs if any: {json.dumps(specs) if specs else "standard quality"}
- Mention delivery to {delivery_location}
- Ask for their best offer (price, lead time, payment terms)
- Keep it concise — 3-4 sentences
- Do NOT reveal your budget ceiling"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=250, temperature=0.7)

    return {"message": response, "needs_buyer_input": False}


async def buyer_agent_respond(
    conversation_history: list,
    supplier_message: str,
    requirement: dict,
    negotiation_round: int,
    max_rounds: int = 999,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """
    Generate buyer's natural response to supplier's message.
    Answers questions, negotiates strategically, closes when terms are good.
    """
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget_max = requirement.get("budget_max", 0)
    delivery_location = requirement.get("delivery_location", "")
    delivery_days = requirement.get("delivery_days", "")
    specs = requirement.get("specifications") or {}

    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
        product=product,
        quantity=quantity,
        qty_unit=qty_unit,
        budget_max=budget_max,
        delivery_location=delivery_location,
        delivery_days=delivery_days or "flexible",
        specifications=json.dumps(specs) if specs else "Standard quality",
    )

    # Build conversation history
    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_supplier", "assistant"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    # Current supplier message with context
    round_context = ""
    if negotiation_round >= 5:
        round_context = "\n[Note: You've been negotiating for several rounds. Make a decision soon — accept if terms are reasonable, or walk away if they won't budge.]"

    messages.append({
        "role": "user",
        "content": [{"text": f"{supplier_message}{round_context}"}]
    })

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=350,
        temperature=0.7,
    )

    needs_input = "<NEEDS_BUYER_INPUT" in response
    extracted_offer = _extract_counter_offer(response)

    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "Needs your decision"

    clean = response
    if "<NEEDS_BUYER_INPUT" in clean:
        clean = clean[:clean.index("<NEEDS_BUYER_INPUT")].strip()

    # If model only output the tag with no message, use a natural fallback
    if not clean or clean.startswith("<"):
        if needs_input:
            clean = "I need to check with my team on this. Will get back to you shortly."
        else:
            clean = "Thanks, let me review this."

    # If AI accidentally said something that sounds like acceptance/walkaway,
    # force escalation to human — AI must never close or decline deals
    is_accepting = _detect_acceptance(clean)
    is_walking_away = _detect_walkaway(clean)
    if is_accepting or is_walking_away:
        needs_input = True
        input_reason = input_reason or ("Offer looks acceptable — needs your approval" if is_accepting else "Price may not work — needs your decision")

    return {
        "message": clean,
        "needs_buyer_input": needs_input,
        "buyer_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_ready": False,
        "is_walking_away": False,
    }


async def generate_buyer_suggestion(
    conversation_history: list,
    supplier_message: str,
    requirement: dict,
    negotiation_round: int,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> str:
    """
    Generate a suggested response for the human buyer.
    Helps buyers craft strategic replies without needing negotiation expertise.
    """
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    budget_max = requirement.get("budget_max", 0)

    system = f"""You are a B2B procurement advisor helping a buyer craft their next response to a supplier.

BUYER'S PROFILE:
{profile_md or "B2B buyer looking for quality products at competitive prices."}

BUYER'S PROCUREMENT SETTINGS:
{buyer_settings_md or "Standard procurement strategy."}

REQUIREMENT:
- Product: {product}
- Quantity: {quantity}
- Budget ceiling: ₹{budget_max}/unit (DO NOT reveal this number in the suggested response)

YOUR JOB:
- Analyze the conversation and suggest the BEST response the buyer should send
- Consider: negotiation stage, supplier's offer vs budget, leverage available
- Write the response AS the buyer — ready to send as-is
- Keep it natural, professional, 2-5 sentences
- If supplier asked a question about requirements, answer it clearly
- If supplier quoted a price, respond strategically (counter, accept, ask for options)
- Use specific numbers when countering — not vague "lower please"
- NEVER include the exact budget ceiling in the suggestion
- Do NOT include XML tags — this is for human use
- Do NOT include meta-commentary — just the message text itself

CONVERSATION ROUND: {negotiation_round}
"""

    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_supplier", "human_supplier", "assistant"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    if supplier_message:
        messages.append({
            "role": "user",
            "content": [{"text": f"{supplier_message}\n\n[SYSTEM: Generate the buyer's best strategic response.]"}]
        })

    response = await call_qwen3(messages, system_prompt=system, max_tokens=350, temperature=0.7)

    if "<NEEDS_BUYER_INPUT" in response:
        response = response[:response.index("<NEEDS_BUYER_INPUT")].strip()

    return response


def _detect_acceptance(message: str) -> bool:
    keywords = [
        "let's proceed", "agreed", "that works", "we accept", "confirm the order",
        "deal done", "go ahead", "approved", "we're happy with", "finaliz",
        "we'll take it", "please proceed", "works for us", "we agree to",
        "let's move forward", "we can proceed",
    ]
    return any(kw in message.lower() for kw in keywords)


def _detect_walkaway(message: str) -> bool:
    keywords = [
        "look at other options", "doesn't fit our budget", "we'll pass",
        "not going to work", "can't proceed at this price", "too expensive for us",
        "we'll have to decline",
    ]
    return any(kw in message.lower() for kw in keywords)


def _extract_counter_offer(text: str) -> dict | None:
    """Extract if buyer is proposing a specific counter price."""
    price_patterns = [
        r'₹\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|/piece|/unit)',
        r'([\d,]+(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|/piece|/unit)',
    ]
    for pattern in price_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            price_str = match.group(1).replace(",", "")
            try:
                return {"price_per_unit": float(price_str)}
            except ValueError:
                pass
    return None
