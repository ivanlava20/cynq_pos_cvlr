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

export const fetchExpenses = async (branchCode, expenseDate = getCurrentPhilippineDate()) => {
  try {
    if (!branchCode) {
      throw new Error('branchCode is required');
    }

    const expensesQuery = query(
      collection(firestore, collectionList.expenseItems),
      where('branchCode', '==', branchCode),
      //where('dateChecked', '==', '2026-03-24')
      where('dateChecked', '==', expenseDate)
    );

    const snapshot = await getDocs(expensesQuery);
    const expenses = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() || {})
    }));

    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

    return {
      success: true,
      data: expenses,
      summary: {
        totalExpenses,
        count: expenses.length
      },
      message: 'Expenses fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      summary: {
        totalExpenses: 0,
        count: 0
      },
      message: error.message || 'Failed to fetch expenses'
    };
  }
};

export default fetchExpenses;
