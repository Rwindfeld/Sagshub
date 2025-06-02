import { differenceInBusinessDays, addBusinessDays } from 'date-fns';
import { Case, StatusHistory } from './schema';

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