from pydantic import BaseModel
from typing import Optional, List, Any
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
    buyer_chat_enabled: bool
    supplier_chat_enabled: bool
    messages: List[MessageOut]
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    conversation_id: int
    content: str


class SendMessageResponse(BaseModel):
    message: MessageOut
    ai_response: Optional[MessageOut] = None


class ToggleChatRequest(BaseModel):
    lead_id: int
    enabled: bool


class RequirementBasic(BaseModel):
    """Basic requirement info for lead display"""
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
    """Basic supplier info for lead display"""
    supplier_id: int
    trade_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    requirement_id: int
    buyer_id: int
    supplier_id: int
    fit_score: Optional[float]
    status: str
    card_status: str = "pending"
    supplier_card: Optional[dict] = None
    card_submitted_at: Optional[datetime] = None
    card_selected_at: Optional[datetime] = None
    current_offer_price: Optional[float]
    current_offer_unit: Optional[str] = None
    current_lead_time: Optional[int]
    negotiation_round: int
    max_negotiation_rounds: int
    buyer_chat_enabled: bool
    supplier_chat_enabled: bool
    ai_paused_for_buyer: bool
    ai_paused_for_supplier: bool
    match_reasons: Optional[List[str]]
    final_price: Optional[float] = None
    final_lead_time: Optional[int] = None
    deal_closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    requirement: Optional[RequirementBasic] = None
    supplier_info: Optional[SupplierBasic] = None

    class Config:
        from_attributes = True


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


class AskQuestionRequest(BaseModel):
    question: str


class AnswerQuestionRequest(BaseModel):
    answer: str


class SelectSupplierRequest(BaseModel):
    lead_id: int


class CloseDealRequest(BaseModel):
    lead_id: int


class BuyerDecisionRequest(BaseModel):
    lead_id: int
    # action: accept | renegotiate | manual_chat | decline
    action: str
    renegotiate_target: Optional[str] = None   # e.g. "Get price below 170"


class SupplierEscalationResponse(BaseModel):
    lead_id: int
    # action: accept | counter | hold | decline
    action: str
    counter_price: Optional[float] = None


class SupplierConfirmRequest(BaseModel):
    lead_id: int
    action: str  # confirm | reject


class SuggestResponseRequest(BaseModel):
    lead_id: int


class SuggestResponseOut(BaseModel):
    suggested_message: str
    context: Optional[str] = None


class ActionNeededOut(BaseModel):
    lead_id: int
    requirement_id: int
    counterpart_name: Optional[str] = None
    product: Optional[str] = None
    action_type: str
    status: str
    card_status: str = "pending"
    current_offer_price: Optional[float] = None
    fit_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
