CREATE TABLE IF NOT EXISTS case_status_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO case_status_types (name) VALUES
    ('Ny'),
    ('Igang'),
    ('Afventer'),
    ('Afsluttet')
ON CONFLICT (name) DO NOTHING; 