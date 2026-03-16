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

export const fetchDailySales = async (branchCode, orderDate = getCurrentPhilippineDate()) => {
  try {
    if (!branchCode) {
      throw new Error('branchCode is required');
    }

    const salesQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('branchCode', '==', branchCode),
      where('orderDate', '==', orderDate)
    );

    const querySnapshot = await getDocs(salesQuery);

    let totalSale = 0;
    let transactionCount = 0;
    let totalCupsSold = 0;
    let foodSold = 0;
    let pastriesSold = 0;

    const paymentSummary = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.queueDetails?.orderStatus;

      if (status === 'VOID') return;

      transactionCount += 1;
      totalSale += Number(data.mainDetails?.totalAmount || 0);

      (data.orderItems || []).forEach((item) => {
        const qty = Number(item.itemQuantity || 0);
        totalCupsSold += qty;

        const category = String(item.itemCategory || '').toUpperCase();
        if (category.includes('FOOD')) foodSold += qty;
        if (category.includes('PASTRY')) pastriesSold += qty;
      });

      (data.paymentMethods || []).forEach((pay) => {
        const key = pay.modeOfPayment || 'OTHERS';
        const amount = Number(pay.paymentAmount || 0);
        paymentSummary[key] = (paymentSummary[key] || 0) + amount;
      });
    });

    return {
      success: true,
      data: {
        totalSale,
        transactionCount,
        totalCupsSold,
        foodSold,
        pastriesSold,
        paymentSummary
      },
      message: 'Daily sales fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error.message || 'Failed to fetch daily sales'
    };
  }
};

export default fetchDailySales;
