from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Match scoring
    fit_score = Column(Float, nullable=True)             # 0-100
    match_reasons = Column(JSON, nullable=True)          # why this supplier was matched

    # Lead status lifecycle:
    # new → card_generating → card_draft → card_qa → card_submitted → selected|rejected → deal_open → deal_closed
    status = Column(String(50), default="new")

    # Supplier card — AI-generated offer card (one-shot, no negotiation loop)
    supplier_card = Column(JSON, nullable=True)              # {price_estimate, price_unit, lead_time_days, payment_terms, moq, certifications, key_strengths, ai_verdict, raw_message}
    card_status = Column(String(50), default="pending")      # pending|generating|draft|qa_open|submitted|selected|rejected
    card_submitted_at = Column(DateTime, nullable=True)
    card_selected_at = Column(DateTime, nullable=True)

    # Offer snapshot (populated from card when submitted)
    current_offer_price = Column(Float, nullable=True)
    current_offer_unit = Column(String(50), nullable=True)
    current_lead_time = Column(Integer, nullable=True)       # days

    # Final deal details (set at deal_closed)
    final_price = Column(Float, nullable=True)
    final_lead_time = Column(Integer, nullable=True)
    final_payment_terms = Column(String(100), nullable=True)
    deal_summary = Column(JSON, nullable=True)

    # Ratings
    buyer_rating = Column(Integer, nullable=True)            # 1-5
    supplier_rating = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deal_closed_at = Column(DateTime, nullable=True)

    # Relationships
    requirement = relationship("Requirement", back_populates="leads", lazy="select")
    buyer = relationship("User", foreign_keys=[buyer_id], lazy="select")
    supplier = relationship("User", foreign_keys=[supplier_id], lazy="select")
    conversation = relationship("Conversation", back_populates="lead", uselist=False, lazy="select")
    card_qa = relationship("SupplierCardQA", foreign_keys="SupplierCardQA.lead_id", lazy="select")
