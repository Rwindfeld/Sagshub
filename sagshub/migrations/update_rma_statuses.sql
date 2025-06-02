-- Opdater eksisterende RMA sager med forskellige statusser
UPDATE rma
SET status = CASE 
    WHEN random() < 0.15 THEN 'created'
    WHEN random() < 0.30 THEN 'sent_to_supplier'
    WHEN random() < 0.45 THEN 'waiting_supplier'
    WHEN random() < 0.60 THEN 'received_from_supplier'
    WHEN random() < 0.75 THEN 'ready_for_pickup'
    WHEN random() < 0.90 THEN 'completed'
    ELSE 'rejected'
END
WHERE status NOT IN (
    'created',
    'sent_to_supplier',
    'waiting_supplier',
    'received_from_supplier',
    'ready_for_pickup',
    'completed',
    'rejected'
);

-- Tilføj status historik for hver opdateret RMA sag
INSERT INTO rma_status_history (rma_id, status, comment, created_by)
SELECT 
    id as rma_id,
    status,
    CASE 
        WHEN status = 'created' THEN 'RMA sag oprettet'
        WHEN status = 'sent_to_supplier' THEN 'Produkt sendt til leverandør'
        WHEN status = 'waiting_supplier' THEN 'Afventer svar fra leverandør'
        WHEN status = 'received_from_supplier' THEN 'Produkt modtaget fra leverandør'
        WHEN status = 'ready_for_pickup' THEN 'Produkt klar til afhentning'
        WHEN status = 'completed' THEN 'RMA sag afsluttet'
        WHEN status = 'rejected' THEN 'RMA sag afvist'
    END as comment,
    created_by
FROM rma
WHERE status IN (
    'created',
    'sent_to_supplier',
    'waiting_supplier',
    'received_from_supplier',
    'ready_for_pickup',
    'completed',
    'rejected'
); 