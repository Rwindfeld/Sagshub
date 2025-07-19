-- Migration: Tilføj loginInfo, purchasedHere og purchaseDate felter til cases tabellen
-- Dato: 2024-12-19

-- Tilføj de nye kolonner til cases tabellen
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS login_info TEXT,
ADD COLUMN IF NOT EXISTS purchased_here BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;

-- Opdater eksisterende rækker til at have purchased_here = false som standard
UPDATE cases SET purchased_here = FALSE WHERE purchased_here IS NULL; 