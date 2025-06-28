// =============================================================================
// SAGSHUB WINSTON LOGGER KONFIGURATION
// =============================================================================
// Denne fil konfigurerer Winston logging bibliotek til server logging og indeholder:
// - Professional logging setup med multiple output targets
// - Log niveau konfiguration (error, warn, info, debug)
// - Console output til development
// - Fil output til production logging
// - Timestamp og formattering
// =============================================================================

// =================================================================
// LOGGING LIBRARY IMPORTS
// =================================================================
import winston from 'winston';                                // Professional Node.js logging library

// =================================================================
// WINSTON LOGGER KONFIGURATION
// =================================================================
const logger = winston.createLogger({
  // Log niveau konfiguration (miljøvariabel eller default til 'info')
  level: process.env.LOG_LEVEL || 'info',                     // Minimum log niveau (error < warn < info < debug)
  
  // Log format konfiguration
  format: winston.format.combine(
    winston.format.timestamp(),                               // Tilføjer timestamp til alle log entries
    winston.format.json()                                     // JSON format til struktureret logging
  ),
  
  // Log output targets (transports)
  transports: [
    // Console output til development og debugging
    new winston.transports.Console({
      format: winston.format.simple()                         // Simple format til console (human readable)
    })
    
    // Fil output kan tilføjes til production:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// =================================================================
// EXPORT LOGGER INSTANCE
// =================================================================
export default logger;                                        // Eksporterer konfigureret logger til brug i hele applikationen

// =================================================================
// USAGE EXAMPLES
// =================================================================
// logger.error('Kritisk fejl opstået', { error: errorObject });
// logger.warn('Advarsel: Lav disk plads');
// logger.info('Server startet på port 3000');
// logger.debug('Database query udført', { query: 'SELECT * FROM users' }); 