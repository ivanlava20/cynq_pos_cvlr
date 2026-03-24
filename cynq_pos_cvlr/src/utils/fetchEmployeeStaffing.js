import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList } from '../config/env';

const getCurrentPhilippineDate = () => {
  const philippineDate = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const [month, day, year] = philippineDate.split(',')[0].split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const to12HourTime = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    const twelveHourPattern = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;
    if (twelveHourPattern.test(trimmed)) {
      return trimmed.toUpperCase().replace(/\s+/, ' ');
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHourMatch) {
      const hour = Math.min(23, Math.max(0, Number(twentyFourHourMatch[1])));
      const minute = Math.min(59, Math.max(0, Number(twentyFourHourMatch[2])));
      const baseDate = new Date(Date.UTC(1970, 0, 1, hour, minute));

      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(baseDate);
    }

    return trimmed;
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(converted);
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(value);
  }

  return String(value);
};

const loadEmployeeNameMap = async (employeeIds = []) => {
  const ids = Array.from(new Set(employeeIds.filter(Boolean)));
  if (!ids.length) return {};

  const nameMap = {};

  await Promise.all(
    ids.map(async (employeeId) => {
      const employeeQuery = query(
        collection(firestore, collectionList.employeeInformation),
        where('employeeId', '==', employeeId)
      );

      const employeeSnapshot = await getDocs(employeeQuery);
      if (employeeSnapshot.empty) return;

      const employeeData = employeeSnapshot.docs[0]?.data() || {};
      nameMap[employeeId] = String(employeeData.name || '').trim();
    })
  );

  return nameMap;
};

export const fetchEmployeeStaffing = async (branchCode, dateToday = getCurrentPhilippineDate()) => {
  try {
    if (!branchCode) {
      throw new Error('branchCode is required');
    }

    const staffingQuery = query(
      collection(firestore, collectionList.employeeStaffing),
      where('branchCode', '==', branchCode),
      where('timeEntryDate', '==', '2026-03-24')
      //where('timeEntryDate', '==', dateToday)
    );

    const snapshot = await getDocs(staffingQuery);
    const staffing = [];
    const rawRows = [];

    snapshot.forEach((doc) => {
      rawRows.push({ id: doc.id, ...(doc.data() || {}) });
    });

    const employeeNameMap = await loadEmployeeNameMap(rawRows.map((row) => String(row.employeeId || '').trim()));

    rawRows.forEach((data) => {
      const employeeId = String(data.employeeId || '').trim();
      staffing.push({
        id: data.id,
        employee: employeeNameMap[employeeId] || data.employeeName || data.employee || '',
        employeeId,
        timeIn: to12HourTime(data.timeIn),
        breakIn: to12HourTime(data.breakIn),
        breakOut: to12HourTime(data.breakOut),
        timeOut: to12HourTime(data.timeOut)
      });
    });

    return {
      success: true,
      data: staffing,
      count: staffing.length,
      message: 'Employee staffing fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      count: 0,
      message: error.message || 'Failed to fetch employee staffing'
    };
  }
};

export default fetchEmployeeStaffing;
