import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

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
      collection(firestore, 'STORE_STATUS'),
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
      rows.push({ id: docSnap.id, ...docSnap.data() });
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
