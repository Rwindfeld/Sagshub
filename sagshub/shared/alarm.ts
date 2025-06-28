// =============================================================================
// SAGSHUB ALARM SYSTEM LOGIK
// =============================================================================
// Denne fil indeholder alarm/notification logik delt mellem client og server og indeholder:
// - Business rules for hvornår sager kræver øjeblikkelig opmærksomhed
// - Prioritetsberegning baseret på dato og sag type
// - Alarm tærskelværdier og konfigurations
// - Real-time notification triggers
// - Escalation regler for kritiske sager
// =============================================================================

// =================================================================
// SHARED TYPE IMPORTS
// =================================================================
import { Case, StatusHistory } from './schema';

// =================================================================
// ALARM KONFIGURATION KONSTANTER
// =================================================================

// Tidstærsler i dage for forskellige alarm typer
export const ALARM_THRESHOLDS = {
  // Sager der har været åbne for lang tid
  OVERDUE_CASE_DAYS: 7,                                      // Sager ældre end 7 dage er overfaldne
  CRITICAL_CASE_DAYS: 14,                                    // Sager ældre end 14 dage er kritiske
  
  // Garanti behandlinger (hurtigere handling krævet)
  WARRANTY_URGENT_DAYS: 3,                                   // Garantisager skal håndteres inden 3 dage
  WARRANTY_CRITICAL_DAYS: 5,                                 // Garantisager er kritiske efter 5 dage
  
  // Reparationer og andre behandlinger
  REPAIR_URGENT_DAYS: 5,                                     // Reparationer bliver urgent efter 5 dage
  REPAIR_CRITICAL_DAYS: 10,                                  // Reparationer er kritiske efter 10 dage
  
  // High priority sager
  HIGH_PRIORITY_URGENT_DAYS: 2,                              // Høj prioritet bliver urgent efter 2 dage
  HIGH_PRIORITY_CRITICAL_DAYS: 4                             // Høj prioritet er kritisk efter 4 dage
} as const;

// =================================================================
// ALARM TYPE DEFINITIONS
// =================================================================

// Alarm severity niveauer
export type AlarmSeverity = 
  | 'info'                                                    // Information - ikke kritisk
  | 'warning'                                                 // Advarsel - kræver opmærksomhed
  | 'urgent'                                                  // Urgent - kræver hurtig handling
  | 'critical';                                               // Kritisk - kræver øjeblikkelig handling

// Alarm kategorier
export type AlarmCategory = 
  | 'overdue'                                                 // Overfaldne sager
  | 'warranty_expiring'                                       // Garanti udløber snart
  | 'high_priority'                                           // Høj prioritets sager
  | 'customer_waiting'                                        // Kunde venter på opdatering
  | 'parts_needed';                                           // Reservedele nødvendige

// Alarm data struktur
export interface Alarm {
  caseId: number;                                             // Sag ID der trigger alarm
  severity: AlarmSeverity;                                    // Alarm alvorlighedsgrad
  category: AlarmCategory;                                    // Alarm kategori
  message: string;                                            // Human-readable alarm besked
  daysOverdue: number;                                        // Antal dage since forventet handling
  triggeredAt: Date;                                          // Timestamp for hvornår alarm blev triggered
  actionRequired: string;                                     // Foreslået handling for at løse alarm
}

// =================================================================
// ALARM DETECTION FUNCTIONS
// =================================================================

/**
 * Hovedfunktion til at tjekke om en sag skal trigger en alarm
 * @param case_ Sag data fra database
 * @returns Alarm object hvis sag kræver attention, undefined ellers
 */
export function checkCaseForAlarm(case_: Case): Alarm | undefined {
  // Skip lukkede sager - de trigger ikke alarmer
  if (case_.status === 'completed' || case_.status === 'cancelled') {
    return undefined;                                         // Ingen alarm for afsluttede sager
  }
  
  // Beregn hvor mange dage siden sag blev oprettet
  const daysSinceCreated = getDaysSinceDate(new Date(case_.createdAt));
  
  // Tjek for various alarm conditions baseret på sag properties
  
  // =============================================================
  // GARANTI SAGER - HURTIGERE HÅNDTERING KRÆVET
  // =============================================================
  if (case_.treatment === 'warranty') {
    if (daysSinceCreated >= ALARM_THRESHOLDS.WARRANTY_CRITICAL_DAYS) {
      return createAlarm(
        case_.id,
        'critical',
        'warranty_expiring',
        `Garantisag ${case_.caseNumber} er kritisk overfalden (${daysSinceCreated} dage)`,
        daysSinceCreated,
        'Kontakt producent øjeblikkeligt for garantihåndtering'
      );
    } else if (daysSinceCreated >= ALARM_THRESHOLDS.WARRANTY_URGENT_DAYS) {
      return createAlarm(
        case_.id,
        'urgent',
        'warranty_expiring',
        `Garantisag ${case_.caseNumber} kræver urgent handling (${daysSinceCreated} dage)`,
        daysSinceCreated,
        'Start garantiproces med producent'
      );
    }
  }
  
  // =============================================================
  // HØJ PRIORITETS SAGER
  // =============================================================
  if (case_.priority === 'high') {
    if (daysSinceCreated >= ALARM_THRESHOLDS.HIGH_PRIORITY_CRITICAL_DAYS) {
      return createAlarm(
        case_.id,
        'critical',
        'high_priority',
        `Høj prioritets sag ${case_.caseNumber} er kritisk overfalden (${daysSinceCreated} dage)`,
        daysSinceCreated,
        'Eskalér til ledelse øjeblikkeligt'
      );
    } else if (daysSinceCreated >= ALARM_THRESHOLDS.HIGH_PRIORITY_URGENT_DAYS) {
      return createAlarm(
        case_.id,
        'urgent',
        'high_priority',
        `Høj prioritets sag ${case_.caseNumber} kræver urgent handling (${daysSinceCreated} dage)`,
        daysSinceCreated,
        'Prioritér denne sag højt i arbejdsplanen'
      );
    }
  }
  
  // =============================================================
  // GENERELLE OVERFALDNE SAGER
  // =============================================================
  if (daysSinceCreated >= ALARM_THRESHOLDS.CRITICAL_CASE_DAYS) {
    return createAlarm(
      case_.id,
      'critical',
      'overdue',
      `Sag ${case_.caseNumber} er kritisk overfalden (${daysSinceCreated} dage)`,
      daysSinceCreated,
      'Kontakt kunde og opdatér status øjeblikkeligt'
    );
  } else if (daysSinceCreated >= ALARM_THRESHOLDS.OVERDUE_CASE_DAYS) {
    return createAlarm(
      case_.id,
      'warning',
      'overdue',
      `Sag ${case_.caseNumber} er overfalden (${daysSinceCreated} dage)`,
      daysSinceCreated,
      'Opdatér kunde om status og forventet færdiggørelse'
    );
  }
  
  return undefined;                                           // Ingen alarm nødvendig
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Beregner antal dage siden en given dato
 */
function getDaysSinceDate(date: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Millisekunder til dage
  return diffDays;
}

/**
 * Helper funktion til at oprette alarm objekter
 */
function createAlarm(
  caseId: number,
  severity: AlarmSeverity,
  category: AlarmCategory,
  message: string,
  daysOverdue: number,
  actionRequired: string
): Alarm {
  return {
    caseId,
    severity,
    category,
    message,
    daysOverdue,
    triggeredAt: new Date(),                                  // Timestamp for alarm creation
    actionRequired
  };
}

// =================================================================
// BULK ALARM CHECKING
// =================================================================

/**
 * Tjekker en array af sager og returnerer alle aktive alarmer
 */
export function checkMultipleCasesForAlarms(cases: Case[]): Alarm[] {
  const alarms: Alarm[] = [];
  
  for (const case_ of cases) {
    const alarm = checkCaseForAlarm(case_);
    if (alarm) {
      alarms.push(alarm);
    }
  }
  
  // Sortér alarmer efter severity (critical først, derefter urgent, osv.)
  return alarms.sort((a, b) => {
    const severityOrder = { critical: 0, urgent: 1, warning: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// =================================================================
// ALARM CONFIGURATION
// =================================================================

/**
 * Getter funktion til alarm konfiguration (kan udvides til at læse fra database)
 */
export function getAlarmConfiguration() {
  return ALARM_THRESHOLDS;
}

export function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
  return differenceInBusinessDays(endDate, startDate);
}

export function addWorkingDays(date: Date, days: number): Date {
  return addBusinessDays(date, days);
}

export function isFourDayPriorityAlarm(createdAt: Date, status: string): boolean {
  const today = new Date();
  const businessDays = getBusinessDaysDifference(createdAt, today);
  return status === 'created' && businessDays > 4;
}

export function isInProgressAlarm(statusChangeDate: Date): boolean {
  const today = new Date();
  const businessDays = getBusinessDaysDifference(statusChangeDate, today);
  return businessDays > 1;
}

export function isReadyForPickupAlarm(statusChangeDate: Date): boolean {
  const today = new Date();
  const businessDays = getBusinessDaysDifference(statusChangeDate, today);
  return businessDays > 14;
}

export function isWaitingCustomerAlarm(statusChangeDate: Date): boolean {
  const today = new Date();
  const businessDays = getBusinessDaysDifference(statusChangeDate, today);
  return businessDays > 14;
}

export function isCaseInAlarm(caseData: Case, statusHistory: StatusHistory[]): boolean {
  const createdDate = new Date(caseData.createdAt);
  if (caseData.priority === 'four_days') {
    if (isFourDayPriorityAlarm(createdDate, caseData.status)) return true;
  }
  let lastStatusChange: Date;
  if (statusHistory && statusHistory.length > 0) {
    const relevantStatusChange = statusHistory
      .filter(h => h.status === caseData.status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (relevantStatusChange) {
      lastStatusChange = new Date(relevantStatusChange.createdAt);
    } else {
      lastStatusChange = createdDate;
    }
  } else {
    lastStatusChange = createdDate;
  }
  switch (caseData.status) {
    case 'in_progress':
      return isInProgressAlarm(lastStatusChange);
    case 'ready_for_pickup':
      return isReadyForPickupAlarm(lastStatusChange);
    case 'waiting_customer':
      return isWaitingCustomerAlarm(lastStatusChange);
    default:
      return false;
  }
}

export function getAlarmMessage(caseData: Case, statusHistory: StatusHistory[]): string {
  if (!isCaseInAlarm(caseData, statusHistory)) {
    return '';
  }
  if (caseData.priority === 'four_days' && caseData.status === 'created') {
    const days = getBusinessDaysDifference(new Date(caseData.createdAt), new Date());
    return `Sagen er ${days} hverdage gammel og ikke påbegyndt (max 4 dage)`;
  }
  const lastStatusChange = statusHistory
    .filter(h => h.status === caseData.status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const days = getBusinessDaysDifference(
    new Date(lastStatusChange?.createdAt || caseData.createdAt),
    new Date()
  );
  switch (caseData.status) {
    case 'in_progress':
      return `Sagen har været påbegyndt i ${days} hverdage (max 1 dag)`;
    case 'ready_for_pickup':
      return `Sagen har afventet afhentning i ${days} hverdage (max 14 dage)`;
    case 'waiting_customer':
      return `Sagen har afventet kunde i ${days} hverdage (max 14 dage)`;
    default:
      return 'Ukendt alarm';
  }
} 