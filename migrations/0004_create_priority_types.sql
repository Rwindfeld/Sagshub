CREATE TABLE IF NOT EXISTS priority_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO priority_types (name) VALUES
    ('Lav'),
    ('Normal'),
    ('Høj')
ON CONFLICT (name) DO NOTHING; 