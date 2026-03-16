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

export const fetchEmployeeStaffing = async (branchCode, dateToday = getCurrentPhilippineDate()) => {
  try {
    if (!branchCode) {
      throw new Error('branchCode is required');
    }

    const staffingQuery = query(
      collection(firestore, 'TIME_ENTRY'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', dateToday)
    );

    const snapshot = await getDocs(staffingQuery);
    const staffing = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      staffing.push({
        id: doc.id,
        employee: data.employeeName || data.employee || '',
        employeeId: data.employeeId || '',
        timeIn: data.timeIn || null,
        breakIn: data.breakIn || null,
        breakOut: data.breakOut || null,
        timeOut: data.timeOut || null
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
