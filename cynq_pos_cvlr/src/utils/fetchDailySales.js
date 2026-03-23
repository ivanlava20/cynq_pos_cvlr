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

    const [querySnapshot, paymentMethodSnapshot, orderModeSnapshot] = await Promise.all([
      getDocs(salesQuery),
      getDocs(collection(firestore, 'CYNQ_POS_PAYMENT_METHODS')),
      getDocs(collection(firestore, 'CYNQ_POS_ORDER_MODES'))
    ]);

    let totalSale = 0;
    let transactionCount = 0;
    let totalCupsSold = 0;
    let small = 0;
    let medium = 0;
    let large = 0;
    let foodSold = 0;
    let pastriesSold = 0;

    const paymentSummary = {};
    const paymentMethodReference = {};
    const paymentBreakdownMap = {};
    const orderModeReference = {};
    const orderModeBreakdownMap = {};

    paymentMethodSnapshot.forEach((methodDoc) => {
      const method = methodDoc.data() || {};
      const code = String(method.paymentMethodCode || '').trim().toUpperCase();
      const description = String(method.paymentMethodDesc || '').trim();

      if (!code || code === 'BILL' || code === 'NEGA') return;

      paymentMethodReference[code] = description || code;
      paymentBreakdownMap[code] = {
        paymentMethodCode: code,
        paymentMethodDesc: description || code,
        amount: 0,
        transactions: 0
      };
    });

    const allowedOnlineModes = new Set(['FP', 'GB', 'FB', 'KI']);

    orderModeSnapshot.forEach((modeDoc) => {
      const mode = modeDoc.data() || {};
      const code = String(mode.orderModeCode || '').trim().toUpperCase();
      const description = String(mode.orderModeDesc || '').trim();

      if (!code || !allowedOnlineModes.has(code)) return;

      orderModeReference[code] = description || code;
      orderModeBreakdownMap[code] = {
        orderModeCode: code,
        orderModeDesc: description || code,
        amount: 0,
        transactions: 0
      };
    });

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.queueDetails?.orderStatus;
      const orderChange = Number(data.orderDetails?.orderChange ?? data.mainDetails?.orderChange ?? 0);

      if (status === 'VOID') return;

      transactionCount += 1;
      const totalAmount = Number(data.mainDetails?.totalAmount || 0);
      totalSale += totalAmount;

      const orderModeCode = String(data.orderMode ?? data.orderDetails?.orderMode ?? '').trim().toUpperCase();
      if (orderModeCode && orderModeBreakdownMap[orderModeCode]) {
        orderModeBreakdownMap[orderModeCode].transactions += 1;
        orderModeBreakdownMap[orderModeCode].amount += totalAmount;
      }

      (data.orderItems || []).forEach((item) => {
        const qty = Number(item.itemQuantity || 0);
        const category = String(item.itemCategory || '').toUpperCase();
        const isFoodOrPastry = category === 'FOD' || category === 'PST';

        if (!isFoodOrPastry) {
          totalCupsSold += qty;
        }

        const size = String(item.itemSize || '').trim().toUpperCase();
        if (size === 'S') small += qty;
        if (size === 'M') medium += qty;
        if (size === 'L') large += qty;

        if (category === 'FOD' || category.includes('FOOD')) foodSold += qty;
        if (category === 'PST' || category.includes('PASTRY')) pastriesSold += qty;
      });

      (data.paymentMethods || []).forEach((pay) => {
        const paymentCode = String(pay.modeOfPayment || '').trim().toUpperCase();
        const rawAmount = Number(pay.paymentAmount || 0);
        const amount = paymentCode === 'CASH' ? Math.max(0, rawAmount - orderChange) : rawAmount;
        const key = pay.modeOfPayment || 'OTHERS';

        paymentSummary[key] = (paymentSummary[key] || 0) + amount;

        if (!paymentCode || !paymentMethodReference[paymentCode]) return;

        paymentBreakdownMap[paymentCode].amount += amount;
        paymentBreakdownMap[paymentCode].transactions += 1;
      });
    });

    const paymentBreakdown = Object.values(paymentBreakdownMap)
      .filter((row) => row.amount > 0 || row.transactions > 0)
      .sort((left, right) => right.amount - left.amount);

    const orderModeBreakdown = Object.values(orderModeBreakdownMap)
      .filter((row) => row.amount > 0 || row.transactions > 0)
      .sort((left, right) => right.amount - left.amount);

    return {
      success: true,
      data: {
        totalSale,
        transactionCount,
        totalCupsSold,
        small,
        medium,
        large,
        foodSold,
        pastriesSold,
        paymentSummary,
        paymentBreakdown,
        orderModeBreakdown
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
