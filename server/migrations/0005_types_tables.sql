CREATE TABLE IF NOT EXISTS case_status_types (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS priority_types (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

INSERT INTO case_status_types (key, label) VALUES
    ('created', 'Oprettet'),
    ('in_progress', 'I gang'),
    ('offer_created', 'Tilbud oprettet'),
    ('waiting_customer', 'Venter på kunde'),
    ('offer_accepted', 'Tilbud accepteret'),
    ('offer_rejected', 'Tilbud afvist'),
    ('waiting_parts', 'Venter på dele'),
    ('preparing_delivery', 'Forbereder udlevering'),
    ('ready_for_pickup', 'Klar til afhentning'),
    ('completed', 'Afsluttet')
ON CONFLICT (key) DO NOTHING;

INSERT INTO priority_types (key, label) VALUES
    ('free_diagnosis', 'Gratis diagnose'),
    ('four_days', '4-dages prioritet'),
    ('first_priority', 'Første prioritet'),
    ('asap', 'Haster (ASAP)')
ON CONFLICT (key) DO NOTHING; 