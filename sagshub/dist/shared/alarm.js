"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessDaysDifference = getBusinessDaysDifference;
exports.addWorkingDays = addWorkingDays;
exports.isFourDayPriorityAlarm = isFourDayPriorityAlarm;
exports.isInProgressAlarm = isInProgressAlarm;
exports.isReadyForPickupAlarm = isReadyForPickupAlarm;
exports.isWaitingCustomerAlarm = isWaitingCustomerAlarm;
exports.isCaseInAlarm = isCaseInAlarm;
exports.getAlarmMessage = getAlarmMessage;
const date_fns_1 = require("date-fns");
function getBusinessDaysDifference(startDate, endDate) {
    return (0, date_fns_1.differenceInBusinessDays)(endDate, startDate);
}
function addWorkingDays(date, days) {
    return (0, date_fns_1.addBusinessDays)(date, days);
}
function isFourDayPriorityAlarm(createdAt, status) {
    const today = new Date();
    const businessDays = getBusinessDaysDifference(createdAt, today);
    return status === 'created' && businessDays > 4;
}
function isInProgressAlarm(statusChangeDate) {
    const today = new Date();
    const businessDays = getBusinessDaysDifference(statusChangeDate, today);
    return businessDays > 1;
}
function isReadyForPickupAlarm(statusChangeDate) {
    const today = new Date();
    const businessDays = getBusinessDaysDifference(statusChangeDate, today);
    return businessDays > 14;
}
function isWaitingCustomerAlarm(statusChangeDate) {
    const today = new Date();
    const businessDays = getBusinessDaysDifference(statusChangeDate, today);
    return businessDays > 14;
}
function isCaseInAlarm(caseData, statusHistory) {
    const createdDate = new Date(caseData.createdAt);
    if (caseData.priority === 'four_days') {
        if (isFourDayPriorityAlarm(createdDate, caseData.status))
            return true;
    }
    let lastStatusChange;
    if (statusHistory && statusHistory.length > 0) {
        const relevantStatusChange = statusHistory
            .filter(h => h.status === caseData.status)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (relevantStatusChange) {
            lastStatusChange = new Date(relevantStatusChange.createdAt);
        }
        else {
            lastStatusChange = createdDate;
        }
    }
    else {
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
function getAlarmMessage(caseData, statusHistory) {
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
    const days = getBusinessDaysDifference(new Date(lastStatusChange?.createdAt || caseData.createdAt), new Date());
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
