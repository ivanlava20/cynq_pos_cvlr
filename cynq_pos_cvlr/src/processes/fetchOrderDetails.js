import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch order details from Firestore
 * @param {string} orderNo - Order number
 * @param {string} orderDate - Order date (YYYY-MM-DD)
 * @param {string} branchCode - Branch code
 * @returns {Promise<Object>} - Result object with order data or error
 */
export const fetchOrderDetails = async (orderNo, orderDate, branchCode) => {
  try {
    console.log('=== FETCHING ORDER DETAILS ===');
    console.log('Order No:', orderNo);
    console.log('Order Date:', orderDate);
    console.log('Branch Code:', branchCode);

    // Validate inputs
    if (!orderNo || !orderDate || !branchCode) {
      throw new Error('Missing required parameters: orderNo, orderDate, and branchCode are required');
    }

    // Query to find the order
    const ordersQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('orderNo', '==', orderNo),
      where('orderDate', '==', orderDate),
      where('branchCode', '==', branchCode)
    );

    console.log('Querying Firestore...');
    const querySnapshot = await getDocs(ordersQuery);

    if (querySnapshot.empty) {
      console.log('❌ No order found matching the criteria');
      return {
        success: false,
        error: 'Order not found',
        message: `No order found with orderNo: ${orderNo}, orderDate: ${orderDate}, branchCode: ${branchCode}`
      };
    }

    console.log(`✅ Found ${querySnapshot.size} matching document(s)`);

    // Get the first matching document
    const doc = querySnapshot.docs[0];
    const orderData = {
      id: doc.id,
      ...doc.data()
    };

    console.log('Order data retrieved:', orderData);
    console.log('===============================\n');

    return {
      success: true,
      data: orderData,
      documentId: doc.id,
      message: 'Order details fetched successfully'
    };

  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    console.error('Error details:', error.message);
    console.log('===============================\n');

    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch order details'
    };
  }
};

/**
 * Fetch multiple orders by order numbers
 * @param {Array<string>} orderNumbers - Array of order numbers
 * @param {string} orderDate - Order date (YYYY-MM-DD)
 * @param {string} branchCode - Branch code
 * @returns {Promise<Object>} - Result object with array of orders or error
 */
export const fetchMultipleOrders = async (orderNumbers, orderDate, branchCode) => {
  try {
    console.log('=== FETCHING MULTIPLE ORDERS ===');
    console.log('Order Numbers:', orderNumbers);
    console.log('Order Date:', orderDate);
    console.log('Branch Code:', branchCode);

    // Validate inputs
    if (!orderNumbers || orderNumbers.length === 0) {
      throw new Error('At least one order number is required');
    }

    if (!orderDate || !branchCode) {
      throw new Error('orderDate and branchCode are required');
    }

    // Firestore 'in' query can handle up to 10 values at a time
    if (orderNumbers.length > 10) {
      console.warn('⚠️  More than 10 order numbers provided. Will fetch in batches.');
    }

    const orders = [];

    // Split into batches of 10
    for (let i = 0; i < orderNumbers.length; i += 10) {
      const batch = orderNumbers.slice(i, i + 10);

      const ordersQuery = query(
        collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
        where('orderNo', 'in', batch),
        where('orderDate', '==', orderDate),
        where('branchCode', '==', branchCode)
      );

      const querySnapshot = await getDocs(ordersQuery);

      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }

    console.log(`✅ Found ${orders.length} order(s)`);
    console.log('===============================\n');

    return {
      success: true,
      data: orders,
      count: orders.length,
      message: `${orders.length} order(s) fetched successfully`
    };

  } catch (error) {
    console.error('❌ Error fetching multiple orders:', error);
    console.log('===============================\n');

    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch orders'
    };
  }
};

/**
 * Fetch all orders for a specific date and branch
 * @param {string} orderDate - Order date (YYYY-MM-DD)
 * @param {string} branchCode - Branch code
 * @returns {Promise<Object>} - Result object with array of orders or error
 */
export const fetchOrdersByDate = async (orderDate, branchCode) => {
  try {
    console.log('=== FETCHING ORDERS BY DATE ===');
    console.log('Order Date:', orderDate);
    console.log('Branch Code:', branchCode);

    // Validate inputs
    if (!orderDate || !branchCode) {
      throw new Error('orderDate and branchCode are required');
    }

    const ordersQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('orderDate', '==', orderDate),
      where('branchCode', '==', branchCode)
    );

    console.log('Querying Firestore...');
    const querySnapshot = await getDocs(ordersQuery);

    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Found ${orders.length} order(s) for date ${orderDate}`);
    console.log('===============================\n');

    return {
      success: true,
      data: orders,
      count: orders.length,
      message: `${orders.length} order(s) fetched successfully`
    };

  } catch (error) {
    console.error('❌ Error fetching orders by date:', error);
    console.log('===============================\n');

    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch orders'
    };
  }
};
