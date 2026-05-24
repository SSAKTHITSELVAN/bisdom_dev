from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class SupplierProductBase(BaseModel):
    product_name: str
    product_type: Optional[str] = None
    category: Optional[str] = None
    material: Optional[str] = None
    gsm: Optional[int] = None
    color: Optional[str] = None
    size: Optional[str] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    price_unit: Optional[str] = None
    moq: Optional[int] = None
    moq_unit: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None


class SupplierProductCreate(SupplierProductBase):
    supplier_id: int


class SupplierProductOut(SupplierProductBase):
    id: int
    supplier_id: int
    supplier_location: Optional[str] = None
    supplier_state: Optional[str] = None
    certifications: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductMatchResult(BaseModel):
    """Result of matching a product against a requirement."""
    product_id: int
    supplier_id: int
    product_name: str
    material: Optional[str]
    price_min: Optional[Decimal]
    price_max: Optional[Decimal]
    moq: Optional[int]
    match_score: float
    semantic_similarity: float
    match_reasons: List[str]

    class Config:
        from_attributes = True
