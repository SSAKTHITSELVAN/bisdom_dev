"""
Card Agent — generates a single-shot supplier offer card and auto-answers Q&A.
"""
import json
from app.agents.bedrock_client import call_qwen3

CARD_SYSTEM = """You are Bisdom's supplier offer card generator.
Given a buyer's requirement and supplier's profile, generate a professional offer card.

Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "price_per_unit": <number or null>,
  "price_unit": "<currency/unit string>",
  "lead_time_days": <integer or null>,
  "moq": <minimum order quantity integer or null>,
  "payment_terms": "<string>",
  "certifications": ["<cert1>", ...],
  "key_strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "offer_notes": "<any important notes or conditions>",
  "ai_verdict": "<1-2 sentence assessment of this supplier's fit for the requirement>"
}

Be realistic — use the supplier profile data to infer pricing and terms.
If you don't have specific data, make a reasonable estimate and note it in offer_notes."""

QA_SYSTEM = """You are Bisdom's Q&A assistant for supplier offer cards.
Answer the buyer's question about this supplier's offer card concisely and helpfully.
Use the requirement details, supplier card, and supplier profile to answer.
Keep the answer under 3 sentences."""


async def generate_card(requirement: dict, supplier_profile: dict, match_reasons: list) -> dict:
    req_text = json.dumps(requirement, ensure_ascii=False)
    profile_text = json.dumps(supplier_profile, ensure_ascii=False)
    reasons_text = ", ".join(match_reasons or [])

    messages = [
        {
            "role": "user",
            "content": f"""Generate a supplier offer card.

BUYER REQUIREMENT:
{req_text}

SUPPLIER PROFILE:
{profile_text}

MATCH REASONS:
{reasons_text}

Generate the offer card JSON now."""
        }
    ]

    raw = await call_qwen3(messages, system_prompt=CARD_SYSTEM, max_tokens=600, temperature=0.3)

    # Extract JSON from response
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        card = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: find JSON object in text
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            card = json.loads(raw[start:end])
        else:
            card = {
                "price_per_unit": None,
                "price_unit": "INR",
                "lead_time_days": None,
                "moq": None,
                "payment_terms": "To be discussed",
                "certifications": [],
                "key_strengths": ["Verified supplier"],
                "offer_notes": raw[:200],
                "ai_verdict": "Supplier matched based on profile. Review details before deciding."
            }

    return card


async def answer_qa(question: str, requirement: dict, supplier_card: dict, supplier_profile: dict) -> str:
    req_text = json.dumps(requirement, ensure_ascii=False)
    card_text = json.dumps(supplier_card, ensure_ascii=False)
    profile_text = json.dumps({
        "trade_name": supplier_profile.get("trade_name"),
        "business_summary": supplier_profile.get("profile_summary"),
        "certifications": supplier_profile.get("certifications"),
        "city": supplier_profile.get("city"),
        "state": supplier_profile.get("state"),
    }, ensure_ascii=False)

    messages = [
        {
            "role": "user",
            "content": f"""REQUIREMENT: {req_text}
SUPPLIER CARD: {card_text}
SUPPLIER PROFILE: {profile_text}

QUESTION: {question}

Answer the question concisely."""
        }
    ]

    answer = await call_qwen3(messages, system_prompt=QA_SYSTEM, max_tokens=200, temperature=0.5)
    return answer.strip()
