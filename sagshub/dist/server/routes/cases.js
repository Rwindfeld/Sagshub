// Endpoint for at hente sager i alarm
router.get('/alarm', async (req, res) => {
    try {
        const storage = getStorage();
        const cases = await storage.getCasesInAlarm();
        res.json(cases);
    }
    catch (error) {
        console.error('Fejl ved hentning af alarm-sager:', error);
        res.status(500).json({ error: 'Intern serverfejl' });
    }
});
