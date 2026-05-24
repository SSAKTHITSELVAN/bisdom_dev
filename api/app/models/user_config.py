from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class UserConfig(Base):
    """
    Stores user's editable profile and AI settings.

    Profile storage strategy:
    - profile_json: Source of truth (structured JSON for UI editing)
    - profile_md: Auto-generated cache (markdown for AI agents)

    When user edits profile via UI:
    1. Update profile_json
    2. Auto-regenerate profile_md from JSON

    AI agents always read profile_md (no code changes needed).
    """
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Source of truth — structured JSON for UI editing
    profile_json = Column(JSON, nullable=True, default=dict)

    # Auto-generated cache — markdown for AI agents (DO NOT edit directly)
    profile_md = Column(Text, nullable=True, default="")

    # Buyer AI configuration — instructions for how to negotiate when buying
    buyer_settings_md = Column(Text, nullable=True, default="")

    # Seller AI configuration — instructions for how to negotiate when selling
    seller_settings_md = Column(Text, nullable=True, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship - using lazy loading to avoid circular imports
    user = relationship("User", foreign_keys=[user_id], lazy="select")
