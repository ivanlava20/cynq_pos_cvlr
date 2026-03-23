import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

const PH_TIME_ZONE = 'Asia/Manila';

const getCurrentPhilippineDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  const year = parts.find((part) => part.type === 'year')?.value || '1970';

  return `${year}-${month}-${day}`;
};

const toDateObject = (value) => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  if (typeof value === 'number') {
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (twentyFourHour) {
      const hour = String(Math.min(23, Math.max(0, Number(twentyFourHour[1])))).padStart(2, '0');
      const minute = String(Math.min(59, Math.max(0, Number(twentyFourHour[2])))).padStart(2, '0');
      return new Date(`1970-01-01T${hour}:${minute}:00+08:00`);
    }

    const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (twelveHour) {
      let hour = Number(twelveHour[1]);
      const minute = String(Math.min(59, Math.max(0, Number(twelveHour[2])))).padStart(2, '0');
      const meridiem = String(twelveHour[3]).toUpperCase();

      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;

      return new Date(`1970-01-01T${String(hour).padStart(2, '0')}:${minute}:00+08:00`);
    }

    const converted = new Date(trimmed);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  return null;
};

const formatPhilippineTime = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  }

  const dateValue = toDateObject(value);
  if (!dateValue) return null;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dateValue);
};

const toMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return 0;
  const match = timeValue.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return (Number.isNaN(hour) ? 0 : hour * 60) + (Number.isNaN(minute) ? 0 : minute);
};

export const checkStoreStatus = async (branchCode, branchName = '') => {
  try {
    if (!branchCode) {
      return {
        success: false,
        message: 'branchCode is required',
        data: {
          branchName: branchName || 'N/A',
          status: 'CLOSED',
          operatingHours: 'N/A',
          openingTime: null,
          closingTime: null,
          openedBy: null,
          closedBy: null
        }
      };
    }

    const currentDate = getCurrentPhilippineDate();

    const statusQuery = query(
      collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', currentDate)
    );

    const snapshot = await getDocs(statusQuery);

    if (snapshot.empty) {
      return {
        success: true,
        data: {
          branchName: branchName || 'N/A',
          status: 'CLOSED',
          operatingHours: 'N/A',
          openingTime: null,
          closingTime: null,
          openedBy: null,
          closedBy: null
        },
        message: 'No store status entry found for today'
      };
    }

    const rows = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      rows.push({
        id: docSnap.id,
        ...data,
        openTime: formatPhilippineTime(data.openTime),
        closeTime: formatPhilippineTime(data.closeTime)
      });
    });

    rows.sort((a, b) => toMinutes(b.openTime || b.closeTime) - toMinutes(a.openTime || a.closeTime));

    const openEntry = rows.find((row) => row.storeStatus === 'OPEN');
    const closedEntry = rows.find((row) => row.storeStatus === 'CLOSED');

    const selected = openEntry || closedEntry || rows[0];

    const openingTime = selected?.openTime || null;
    const closingTime = selected?.closeTime || null;

    return {
      success: true,
      data: {
        branchName: branchName || selected?.branchCode || branchCode,
        status: selected?.storeStatus || 'CLOSED',
        operatingHours:
          openingTime || closingTime
            ? `${openingTime || 'N/A'} - ${closingTime || 'N/A'}`
            : 'N/A',
        openingTime,
        closingTime,
        openedBy: selected?.staffOpen || null,
        closedBy: selected?.staffClose || null
      },
      message: 'Store status fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to fetch store status',
      data: {
        branchName: branchName || 'N/A',
        status: 'CLOSED',
        operatingHours: 'N/A',
        openingTime: null,
        closingTime: null,
        openedBy: null,
        closedBy: null
      }
    };
  }
};

export default checkStoreStatus;
