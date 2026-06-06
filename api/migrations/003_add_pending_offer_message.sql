-- Add pending_offer_message column to leads table
-- Used for supplier offer approval flow: AI drafts offer, supplier reviews before it goes to buyer
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pending_offer_message TEXT;
