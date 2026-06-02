from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class SupplierCardQA(Base):
    """Q&A thread between buyer and supplier on a supplier's offer card."""
    __tablename__ = "supplier_card_qa"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)

    question = Column(Text, nullable=False)
    asked_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    answer = Column(Text, nullable=True)
    answered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    answered_by_ai = Column(Boolean, default=False)

    # status: open | answered | closed
    status = Column(String(20), default="open")

    created_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)

    lead = relationship("Lead", foreign_keys=[lead_id], lazy="select")
    asker = relationship("User", foreign_keys=[asked_by], lazy="select")
    answerer = relationship("User", foreign_keys=[answered_by], lazy="select")
