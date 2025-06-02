import { getBusinessDaysDifference, addWorkingDays, isFourDayPriorityAlarm, isInProgressAlarm, isReadyForPickupAlarm, isWaitingCustomerAlarm, isCaseInAlarm, getAlarmMessage } from '@shared/alarm';
import { isWeekend } from 'date-fns';
import { Case, StatusHistory } from '@shared/schema';

// Her kan du tilføje evt. andre hjælpefunktioner, der ikke er alarm-relaterede.