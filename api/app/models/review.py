from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text, nullable=True)

    # Context
    product = Column(String(255), nullable=True)
    deal_value = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    deal = relationship("Deal", lazy="select")
    reviewer = relationship("User", foreign_keys=[reviewer_id], lazy="select")
    reviewed_user = relationship("User", foreign_keys=[reviewed_user_id], lazy="select")
