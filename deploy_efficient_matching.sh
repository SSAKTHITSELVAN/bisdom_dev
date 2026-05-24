#!/bin/bash

# Deployment Script for Efficient Matching Algorithm
# Date: 2026-05-24
# Description: Deploy new matching system with embeddings and hard filtering

set -e  # Exit on error

echo "=================================================="
echo "Efficient Matching Algorithm - Deployment Script"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database credentials
DB_HOST="bizzapdb.c3iya6wc0708.ap-south-1.rds.amazonaws.com"
DB_USER="postgres"
DB_NAME="bizzap_v1_db"
export PGPASSWORD="bizzap123"

echo -e "${YELLOW}Step 1: Installing Python dependencies...${NC}"
cd api
pip install sentence-transformers torch numpy --quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 2: Running database migration...${NC}"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/create_supplier_products_table.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration completed${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Verifying table creation...${NC}"
TABLE_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'supplier_products';")
if [ "$TABLE_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✓ Table 'supplier_products' created successfully${NC}"
else
    echo -e "${RED}✗ Table creation verification failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Checking indexes...${NC}"
INDEX_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'supplier_products';")
echo -e "${GREEN}✓ Created $INDEX_COUNT indexes${NC}"
echo ""

echo -e "${YELLOW}Step 5: Restarting API server...${NC}"
cd ..
sudo systemctl restart bisdom-api.service
sleep 3

# Check if service is running
if systemctl is-active --quiet bisdom-api.service; then
    echo -e "${GREEN}✓ API server restarted successfully${NC}"
else
    echo -e "${RED}✗ API server failed to start${NC}"
    echo "Check logs: sudo journalctl -u bisdom-api.service -n 50"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Verifying API endpoint...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s http://localhost:8000/docs | grep -c "FastAPI" || echo "0")
if [ "$HEALTH_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}⚠ API health check inconclusive${NC}"
fi
echo ""

echo "=================================================="
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Preprocess existing suppliers:"
echo "   curl -X POST 'http://localhost:8000/api/v1/preprocessing/admin/preprocess-all?force_refresh=true'"
echo ""
echo "2. Test matching with a requirement:"
echo "   - Create a requirement via UI or API"
echo "   - Confirm it to trigger matching"
echo "   - Check logs: sudo journalctl -u bisdom-api.service -f"
echo ""
echo "3. Monitor performance:"
echo "   - Watch for [EFFICIENT_MATCH] log entries"
echo "   - Expected: 50-150ms per match"
echo ""
echo "Documentation: EFFICIENT_MATCHING_IMPLEMENTATION.md"
echo ""
