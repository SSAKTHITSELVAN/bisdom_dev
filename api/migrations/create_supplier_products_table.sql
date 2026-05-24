-- Migration: Create supplier_products table for efficient matching
-- Date: 2026-05-24
-- Description: Normalized product catalog with embeddings for fast semantic search

CREATE TABLE IF NOT EXISTS supplier_products (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Core fields
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(100),
    category VARCHAR(100),

    -- Normalized specifications
    material VARCHAR(100),
    gsm INTEGER,
    color VARCHAR(50),
    size VARCHAR(50),
    neck_style VARCHAR(50),
    sleeve_length VARCHAR(50),
    fabric_type VARCHAR(100),
    grade VARCHAR(50),
    finish VARCHAR(100),

    -- Pricing & MOQ
    price_min DECIMAL(10, 2),
    price_max DECIMAL(10, 2),
    price_unit VARCHAR(50),
    moq INTEGER,
    moq_unit VARCHAR(50),

    -- Additional metadata
    certifications JSONB,
    description TEXT,
    specifications JSONB,

    -- Location (denormalized)
    supplier_location VARCHAR(200),
    supplier_state VARCHAR(100),

    -- Embedding (384-dim vector stored as JSON)
    embedding JSONB,
    embedding_model VARCHAR(50) DEFAULT 'all-MiniLM-L6-v2',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Critical indexes for hard filtering (STEP 2 optimization)
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_name ON supplier_products(product_name);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_type ON supplier_products(product_type);
CREATE INDEX IF NOT EXISTS idx_supplier_products_material ON supplier_products(material);
CREATE INDEX IF NOT EXISTS idx_supplier_products_price_min ON supplier_products(price_min);
CREATE INDEX IF NOT EXISTS idx_supplier_products_price_max ON supplier_products(price_max);
CREATE INDEX IF NOT EXISTS idx_supplier_products_moq ON supplier_products(moq);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_state ON supplier_products(supplier_state);

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_supplier_products_type_material_price
    ON supplier_products(product_type, material, price_min, price_max);

-- Index for text search on product names
CREATE INDEX IF NOT EXISTS idx_supplier_products_name_gin
    ON supplier_products USING gin(to_tsvector('english', product_name));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_supplier_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_products_updated_at();

-- Comments for documentation
COMMENT ON TABLE supplier_products IS 'Preprocessed and normalized supplier product catalog with embeddings for efficient semantic matching';
COMMENT ON COLUMN supplier_products.embedding IS '384-dimensional MiniLM embedding stored as JSON array';
COMMENT ON COLUMN supplier_products.product_type IS 'Inferred product category: tshirt, fabric, chemical, electronics, etc.';
COMMENT ON COLUMN supplier_products.material IS 'Primary material: cotton, polyester, steel, plastic, etc.';
COMMENT ON INDEX idx_supplier_products_type_material_price IS 'Composite index for fast hard filtering by type, material, and price range';
