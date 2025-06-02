"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.casesRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../../db.js");
const drizzle_orm_1 = require("drizzle-orm");
const storage_js_1 = require("../../storage.js");
exports.casesRouter = (0, express_1.Router)();
// STATUS ENDPOINTS
exports.casesRouter.get('/types/status', async (req, res) => {
    try {
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `SELECT DISTINCT status FROM cases`);
        const statuses = result.rows.map((r) => r.status);
        res.json(statuses);
    }
    catch (error) {
        console.error('Fejl ved hentning af statustyper:', error);
        res.status(500).json({ error: 'Kunne ikke hente statustyper' });
    }
});
exports.casesRouter.post('/types/status', async (req, res) => {
    try {
        const { key, label } = req.body;
        const now = new Date();
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO case_status_types (key, label, created_at, updated_at)
      VALUES (${key}, ${label}, ${now}, ${now})
      RETURNING *
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Fejl ved oprettelse af statustype:', error);
        res.status(500).json({ error: 'Kunne ikke oprette statustype' });
    }
});
exports.casesRouter.put('/types/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { key, label } = req.body;
        const now = new Date();
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE case_status_types
      SET key = ${key}, label = ${label}, updated_at = ${now}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Fejl ved opdatering af statustype:', error);
        res.status(500).json({ error: 'Kunne ikke opdatere statustype' });
    }
});
exports.casesRouter.delete('/types/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM case_status_types
      WHERE id = ${parseInt(id)}
    `);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Fejl ved sletning af statustype:', error);
        res.status(500).json({ error: 'Kunne ikke slette statustype' });
    }
});
// PRIORITY ENDPOINTS
exports.casesRouter.get('/types/priority', async (req, res) => {
    try {
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `SELECT DISTINCT priority FROM cases`);
        const priorities = result.rows.map((r) => r.priority);
        res.json(priorities);
    }
    catch (error) {
        console.error('Fejl ved hentning af prioritetstyper:', error);
        res.status(500).json({ error: 'Kunne ikke hente prioritetstyper' });
    }
});
exports.casesRouter.post('/types/priority', async (req, res) => {
    try {
        const { key, label } = req.body;
        const now = new Date();
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      INSERT INTO priority_types (key, label, created_at, updated_at)
      VALUES (${key}, ${label}, ${now}, ${now})
      RETURNING *
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Fejl ved oprettelse af prioritetstype:', error);
        res.status(500).json({ error: 'Kunne ikke oprette prioritetstype' });
    }
});
exports.casesRouter.put('/types/priority/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { key, label } = req.body;
        const now = new Date();
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE priority_types
      SET key = ${key}, label = ${label}, updated_at = ${now}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Fejl ved opdatering af prioritetstype:', error);
        res.status(500).json({ error: 'Kunne ikke opdatere prioritetstype' });
    }
});
exports.casesRouter.delete('/types/priority/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM priority_types
      WHERE id = ${parseInt(id)}
    `);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Fejl ved sletning af prioritetstype:', error);
        res.status(500).json({ error: 'Kunne ikke slette prioritetstype' });
    }
});
// Specialruter SKAL stå før catch-all:
exports.casesRouter.get('/alarm', async (req, res) => {
    try {
        console.log('Alarm endpoint called');
        const startTime = Date.now();
        const alarmCases = await storage_js_1.storage.getAlarmCases();
        const endTime = Date.now();
        console.log(`Alarm cases retrieved in ${endTime - startTime}ms`);
        res.json(alarmCases);
    }
    catch (error) {
        console.error('Fejl ved hentning af alarm-sager:', error);
        res.status(500).json({ error: 'Kunne ikke hente alarm-sager' });
    }
});
exports.casesRouter.get('/total', async (req, res) => {
    try {
        const result = await db_js_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) as total FROM cases`);
        res.json({ total: result.rows[0].total });
    }
    catch (error) {
        console.error('Fejl ved hentning af total antal sager:', error);
        res.status(500).json({ error: 'Kunne ikke hente total antal sager' });
    }
});
exports.casesRouter.get('/alarm-count', async (req, res) => {
    try {
        console.log('Alarm count endpoint called');
        const startTime = Date.now();
        const alarmCountQuery = (0, drizzle_orm_1.sql) `
      SELECT COUNT(*) as count FROM (
        SELECT c.id
        FROM cases c
        WHERE c.status != 'completed'
        AND (
          -- Four day priority alarm: created status + priority four_days + > 4 business days
          (c.status = 'created' AND c.priority = 'four_days' AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 4)
          OR
          -- In progress alarm: > 1 business day
          (c.status = 'in_progress' AND EXTRACT(EPOCH FROM (NOW() - COALESCE(
            (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'in_progress'),
            c.created_at
          ))) / 86400 > 1)
          OR
          -- Ready for pickup alarm: > 14 business days
          (c.status = 'ready_for_pickup' AND EXTRACT(EPOCH FROM (NOW() - COALESCE(
            (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'ready_for_pickup'),
            c.created_at
          ))) / 86400 > 14)
          OR
          -- Waiting customer alarm: > 14 business days
          (c.status = 'waiting_customer' AND EXTRACT(EPOCH FROM (NOW() - COALESCE(
            (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'waiting_customer'),
            c.created_at
          ))) / 86400 > 14)
        )
      ) alarm_cases
    `;
        const result = await db_js_1.db.execute(alarmCountQuery);
        const count = Number(result.rows[0]?.count || 0);
        const endTime = Date.now();
        console.log(`Alarm count retrieved in ${endTime - startTime}ms: ${count}`);
        res.json({ count });
    }
    catch (error) {
        console.error('Fejl ved hentning af alarm-count:', error);
        res.status(500).json({ error: 'Kunne ikke hente alarm-count' });
    }
});
exports.casesRouter.get('/status-counts', async (req, res) => {
    try {
        console.log('Cases router status-counts endpoint called');
        const statusCounts = await storage_js_1.storage.getStatusCounts();
        console.log('Status counts from storage in router:', statusCounts);
        res.json(statusCounts);
    }
    catch (error) {
        console.error('Fejl ved hentning af status-tællinger:', error);
        res.status(500).json({ error: 'Kunne ikke hente status-tællinger' });
    }
});
exports.casesRouter.post('/:id/status', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        const caseId = parseInt(req.params.id);
        const { status, comment, updatedByName } = req.body;
        if (!status || !comment) {
            return res.status(400).json({ error: 'Status og kommentar er påkrævet' });
        }
        // Brug det manuelle navn hvis angivet, ellers brugerens navn
        const nameToUse = updatedByName?.trim() ? updatedByName.trim() : req.user.name;
        await storage_js_1.storage.updateCaseStatusWithHistory(caseId, status, comment, req.user.id, nameToUse);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Fejl ved statusopdatering:', error);
        res.status(500).json({ error: 'Kunne ikke opdatere status' });
    }
});
// Catch-all route til sidst!
exports.casesRouter.get('/:idOrNumber', async (req, res) => {
    try {
        const { idOrNumber } = req.params;
        // Tjek om det er et tal (ID) eller et sagsnummer
        const isNumeric = /^\d+$/.test(idOrNumber);
        let caseData;
        if (isNumeric) {
            // Hvis det er et tal, søg efter ID
            caseData = await storage_js_1.storage.getCase(parseInt(idOrNumber));
        }
        else {
            // Hvis det er et sagsnummer, søg efter det
            caseData = await storage_js_1.storage.getCaseByNumber(idOrNumber);
        }
        if (!caseData) {
            return res.status(404).json({ error: 'Sag ikke fundet' });
        }
        res.json(caseData);
    }
    catch (error) {
        console.error('Fejl ved hentning af sag:', error);
        res.status(500).json({ error: 'Kunne ikke hente sag' });
    }
});
