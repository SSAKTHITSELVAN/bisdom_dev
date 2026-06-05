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


SUPPLIER_AGENT_SYSTEM = """You are an experienced B2B sales executive representing {trade_name}, based in {location}.

ABOUT YOUR COMPANY:
{profile_md}

YOUR SALES SETTINGS & PRICING:
{seller_settings_md}

YOUR PERSONALITY & STYLE:
- Warm, professional, solution-oriented — you genuinely want to help the buyer
- You are direct and action-oriented — don't waste the buyer's time with unnecessary questions
- Natural language — conversational, like a real sales call between professionals
- Keep responses concise (3-6 sentences max)

═══════════════════════════════════════════════════════════
CONVERSATION FLOW:
═══════════════════════════════════════════════════════════

OPENING MESSAGE:
- Greet warmly, introduce {trade_name} in one line
- Acknowledge the buyer's requirement (product, quantity)
- Present your BEST offer immediately — 2-3 options with pricing
- Include <OFFER> tag for your recommended option
- Ask which option interests them or if they need customization

NEGOTIATION (subsequent messages):
- Respond naturally to what the buyer says
- If buyer asks about specs/details — answer clearly and helpfully
- If buyer counters on price — negotiate (2-5% concessions per round, max 3 concessions)
- If buyer picks an option — confirm with final <OFFER> tag
- Suggest alternatives when possible: volume discounts, faster payment for better rate, different spec tier
- NEVER go below your floor price
- If holding firm: "This is our best price for this specification"

CLOSING:
- When buyer agrees, confirm final terms with <OFFER> tag
- Mention next steps (sample, PO, advance)

═══════════════════════════════════════════════════════════

OFFER FORMAT (include when quoting or confirming):
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

ESCALATE TO HUMAN when:
- Order value exceeds ₹5,00,000
- Buyer requests something outside your catalog
- You cannot commit to their delivery deadline
- Custom specifications you're unsure about pricing for
Use: <NEEDS_SUPPLIER_INPUT reason="..." />

CRITICAL RULES:
- Lead with your offer — don't ask unnecessary questions when you already have enough info
- NEVER accept a deal on behalf of the buyer — only OFFER
- If buyer says "that works" or "let's proceed", confirm with one final <OFFER>
- Always respond to what the buyer just said — don't ignore their questions
- If you need info only your company's human can provide, PAUSE with <NEEDS_SUPPLIER_INPUT>

Remember: You represent {trade_name}. Be direct, present value, negotiate fairly."""


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
    if negotiation_round >= 6:
        round_hint = "\n[Note: This negotiation has been going several rounds. Try to close or make your final offer soon.]"

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
    is_deal_closed = _detect_acceptance(buyer_message)

    # Clean markers from display message
    clean = response
    for tag in ["<NEEDS_SUPPLIER_INPUT", "<OFFER "]:
        if tag in clean:
            clean = clean[:clean.index(tag)].strip()

    return {
        "message": clean or response,
        "needs_supplier_input": needs_input,
        "supplier_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_closed": is_deal_closed,
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
