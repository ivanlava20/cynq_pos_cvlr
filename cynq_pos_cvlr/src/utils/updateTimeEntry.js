import { addDoc, collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
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

const getCurrentPhilippineTime = () => {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * action: TIME_IN | BREAK_IN | BREAK_OUT | TIME_OUT
 */
export const updateTimeEntry = async ({ branchCode, employeeId, employeeName, action }) => {
  try {
    if (!branchCode || !employeeId || !action) {
      return {
        success: false,
        message: 'branchCode, employeeId, and action are required.'
      };
    }

    const dateToday = getCurrentPhilippineDate();
    const currentTime = getCurrentPhilippineTime();

    const entryQuery = query(
      collection(firestore, 'TIME_ENTRY'),
      where('branchCode', '==', branchCode),
      where('employeeId', '==', employeeId),
      where('dateToday', '==', dateToday)
    );

    const snapshot = await getDocs(entryQuery);

    const fieldMap = {
      TIME_IN: 'timeIn',
      BREAK_IN: 'breakIn',
      BREAK_OUT: 'breakOut',
      TIME_OUT: 'timeOut'
    };

    const field = fieldMap[action];
    if (!field) {
      return {
        success: false,
        message: 'Invalid action. Use TIME_IN, BREAK_IN, BREAK_OUT, or TIME_OUT.'
      };
    }

    if (snapshot.empty) {
      await addDoc(collection(firestore, 'TIME_ENTRY'), {
        branchCode,
        employeeId,
        employeeName: employeeName || '',
        dateToday,
        timeIn: field === 'timeIn' ? currentTime : null,
        breakIn: field === 'breakIn' ? currentTime : null,
        breakOut: field === 'breakOut' ? currentTime : null,
        timeOut: field === 'timeOut' ? currentTime : null,
        updatedAt: new Date().toISOString()
      });
    } else {
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          updateDoc(docSnap.ref, {
            [field]: currentTime,
            employeeName: employeeName || docSnap.data().employeeName || '',
            updatedAt: new Date().toISOString()
          })
        )
      );
    }

    return {
      success: true,
      message: `${action} recorded successfully.`,
      data: {
        employeeId,
        dateToday,
        [field]: currentTime
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update time entry.'
    };
  }
};

export default updateTimeEntry;
