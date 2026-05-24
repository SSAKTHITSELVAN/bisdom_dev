from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DECIMAL, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import DateTime
from app.db.base import Base


class SupplierProduct(Base):
    """
    Normalized supplier product catalog for efficient matching.
    Products are preprocessed ONCE and stored with embeddings.
    """
    __tablename__ = "supplier_products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Core fields
    product_name = Column(String(255), nullable=False, index=True)
    product_type = Column(String(100), index=True)  # tshirt, fabric, chemical, electronics, etc.
    category = Column(String(100), index=True)      # clothing, textile, industrial, etc.

    # Normalized specifications
    material = Column(String(100), index=True)      # cotton, polyester, blend, steel, plastic
    gsm = Column(Integer)                           # For textiles
    color = Column(String(50))
    size = Column(String(50))                       # S/M/L/XL or dimensions
    neck_style = Column(String(50))                 # round, polo, v-neck (for garments)
    sleeve_length = Column(String(50))              # short, long, sleeveless
    fabric_type = Column(String(100))               # single jersey, pique, etc.
    grade = Column(String(50))                      # A, B, industrial, medical, etc.
    finish = Column(String(100))                    # bio-washed, dyed, printed, etc.

    # Pricing & MOQ
    price_min = Column(DECIMAL(10, 2), index=True)
    price_max = Column(DECIMAL(10, 2), index=True)
    price_unit = Column(String(50))                 # INR per piece, INR per kg
    moq = Column(Integer, index=True)               # Minimum order quantity
    moq_unit = Column(String(50))                   # pieces, kg, meters

    # Additional metadata
    certifications = Column(JSON)                   # ["ISO 9001", "GOTS", "BIS"]
    description = Column(Text)                      # Full product description
    specifications = Column(JSON)                   # Additional specs as key-value

    # Location (denormalized for faster filtering)
    supplier_location = Column(String(200))         # City, State
    supplier_state = Column(String(100), index=True)

    # Embedding for semantic search (384 dimensions for MiniLM)
    embedding = Column(JSON)                        # Stored as JSON array of floats
    embedding_model = Column(String(50), default="all-MiniLM-L6-v2")

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    supplier = relationship("User", foreign_keys=[supplier_id])
