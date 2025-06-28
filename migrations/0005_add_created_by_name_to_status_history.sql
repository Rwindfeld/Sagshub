-- Migration: Tilføj created_by_name til status_history
ALTER TABLE status_history
ADD COLUMN created_by_name TEXT DEFAULT NULL; 