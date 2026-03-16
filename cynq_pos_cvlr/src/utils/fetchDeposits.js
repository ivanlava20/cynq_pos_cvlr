import { collection, query, where, getDocs } from 'firebase/firestore';
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

export const fetchDeposits = async (branchCode) => {
  try {
    if (!branchCode) {
      throw new Error('branchCode is required');
    }

    const currentDate = getCurrentPhilippineDate();

    const depositsQuery = query(
      collection(firestore, 'DEPOSITS'),
      where('branchCode', '==', branchCode),
      where('depositDate', '==', currentDate)
    );

    const querySnapshot = await getDocs(depositsQuery);

    const deposits = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      deposits.push({
        depositId: data.depositId || 'N/A',
        amountDeposited: parseFloat(data.depositAmount) || 0
      });
    });

    const totalDepositAmount = deposits.reduce((sum, deposit) => sum + deposit.amountDeposited, 0);
    const totalDepositCount = deposits.length;

    return {
      success: true,
      data: deposits,
      summary: {
        totalDepositAmount,
        totalDepositCount,
        date: currentDate
      },
      message: 'Deposits fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch deposits',
      data: []
    };
  }
};

export const fetchDepositsByDateRange = async (branchCode, startDate, endDate) => {
  try {
    if (!branchCode || !startDate || !endDate) {
      throw new Error('branchCode, startDate, and endDate are required');
    }

    const depositsQuery = query(
      collection(firestore, 'DEPOSITS'),
      where('branchCode', '==', branchCode),
      where('depositDate', '>=', startDate),
      where('depositDate', '<=', endDate)
    );

    const querySnapshot = await getDocs(depositsQuery);

    const deposits = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      deposits.push({
        depositId: data.depositId || 'N/A',
        amountDeposited: parseFloat(data.depositAmount) || 0,
        depositDate: data.depositDate
      });
    });

    deposits.sort((a, b) => b.depositDate.localeCompare(a.depositDate));

    const totalDepositAmount = deposits.reduce((sum, deposit) => sum + deposit.amountDeposited, 0);

    return {
      success: true,
      data: deposits,
      summary: {
        totalDepositAmount,
        totalDepositCount: deposits.length,
        startDate,
        endDate
      },
      message: 'Deposits fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch deposits',
      data: []
    };
  }
};
