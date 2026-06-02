from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MessageOut(BaseModel):
    id: int
    role: str
    message_type: str
    content: str
    structured_data: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    lead_id: int
    mode: str
    messages: List[MessageOut]
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    conversation_id: int
    content: str


class SendMessageResponse(BaseModel):
    message: MessageOut


class RequirementBasic(BaseModel):
    id: int
    product: str
    quantity: float
    quantity_unit: Optional[str]
    budget_max: Optional[float]
    budget_unit: Optional[str] = "INR"
    delivery_location: Optional[str]
    specifications: Optional[dict]

    class Config:
        from_attributes = True


class SupplierBasic(BaseModel):
    supplier_id: int
    trade_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


# ── Supplier Card ────────────────────────────────────────────────────────────

class SupplierCardOut(BaseModel):
    price_estimate: Optional[float] = None
    price_unit: Optional[str] = None
    lead_time_days: Optional[int] = None
    payment_terms: Optional[str] = None
    moq: Optional[float] = None
    certifications: Optional[List[str]] = None
    key_strengths: Optional[List[str]] = None
    ai_verdict: Optional[str] = None
    raw_message: Optional[str] = None


# ── Q&A ─────────────────────────────────────────────────────────────────────

class CardQAOut(BaseModel):
    id: int
    lead_id: int
    question: str
    asked_by: int
    answer: Optional[str] = None
    answered_by: Optional[int] = None
    answered_by_ai: bool
    status: str
    created_at: datetime
    answered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CardQARequest(BaseModel):
    question: str


class CardQAAnswerRequest(BaseModel):
    answer: str


# ── Lead ─────────────────────────────────────────────────────────────────────

class LeadOut(BaseModel):
    id: int
    requirement_id: int
    buyer_id: int
    supplier_id: int
    fit_score: Optional[float]
    status: str
    card_status: str = "pending"
    supplier_card: Optional[dict] = None
    current_offer_price: Optional[float]
    current_offer_unit: Optional[str] = None
    current_lead_time: Optional[int]
    match_reasons: Optional[List[str]]
    final_price: Optional[float] = None
    final_lead_time: Optional[int] = None
    card_submitted_at: Optional[datetime] = None
    card_selected_at: Optional[datetime] = None
    deal_closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    requirement: Optional[RequirementBasic] = None
    supplier_info: Optional[SupplierBasic] = None

    class Config:
        from_attributes = True


# ── Buyer actions ─────────────────────────────────────────────────────────────

class BuyerSelectRequest(BaseModel):
    lead_id: int


class DealCloseRequest(BaseModel):
    lead_id: int


# ── Deal chat ────────────────────────────────────────────────────────────────

class ActionNeededOut(BaseModel):
    lead_id: int
    requirement_id: int
    counterpart_name: Optional[str] = None
    product: Optional[str] = None
    # action_type: card_ready (buyer must pick) | qa_pending (buyer must answer)
    action_type: str
    status: str
    card_status: str = "pending"
    current_offer_price: Optional[float] = None
    fit_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
