import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

// Cache for order mode descriptions to avoid repeated queries
let orderModesCache = {};
let orderModesCacheLoaded = false;

/**
 * Load order modes from CYNQ_POS_ORDER_MODES collection
 * This will be called once and cached
 */
const loadOrderModes = async () => {
  if (orderModesCacheLoaded) return;

  try {
    console.log('📥 Loading order modes from CYNQ_POS_ORDER_MODES...');
    const orderModesSnapshot = await getDocs(collection(firestore, 'CYNQ_POS_ORDER_MODES'));

    orderModesCache = {};
    orderModesSnapshot.forEach((doc) => {
      const data = doc.data();
      orderModesCache[data.orderModeCode] = data.orderModeDesc;
    });

    orderModesCacheLoaded = true;
    console.log('✅ Order modes loaded:', orderModesCache);
  } catch (error) {
    console.error('❌ Error loading order modes:', error);
  }
};

/**
 * Get order mode description from cache
 * @param {string} orderModeCode - Order mode code
 * @returns {string} - Order mode description
 */
const getOrderModeDesc = (orderModeCode) => {
  return orderModesCache[orderModeCode] || orderModeCode || 'Unknown';
};

/**
 * Get current date in Philippines timezone (YYYY-MM-DD format)
 * @returns {string} - Current date in YYYY-MM-DD format
 */
const getCurrentPhilippineDate = () => {
  const philippineDate = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const [month, day, year] = philippineDate.split(',')[0].split('/');
  const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  console.log('📅 Current Philippine Date:', formattedDate);
  return formattedDate;
};

const getOrderModeColor = (orderModeCode) => {
  const colorMap = {
    OS: 'gray',
    FP: 'pink',
    GB: 'green',
    FB: 'blue',
    KI: 'orange'
  };
  return colorMap[orderModeCode] || 'gray';
};

const toTimestamp = (value) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
};

const sortQueueByFcfs = (items) => {
  items.sort((a, b) => {
    const createdA = toTimestamp(a.createdAt);
    const createdB = toTimestamp(b.createdAt);
    if (createdA !== createdB) return createdA - createdB;
    return (a.orderNo || '').localeCompare(b.orderNo || '');
  });
};

export const loadQueueSummary = async (branchCode, callback) => {
  try {
    await loadOrderModes();

    const currentDate = getCurrentPhilippineDate();

    console.log('=== SETTING UP REAL-TIME QUEUE LISTENER ===');
    console.log('🏢 Branch Code:', branchCode);
    console.log('📅 Filtering by Date:', currentDate);

    const ordersQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('branchCode', '==', branchCode),
      where('orderDate', '==', currentDate)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const queueData = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          if (data.orderMode === 'FD') return;

          const queueItem = {
            id: data.mainDetails?.transactionId || doc.id,
            name: data.mainDetails?.customerName || 'Unknown',
            items: data.orderItems?.length || 0,
            time: data.queueDetails?.elapsedTime || '0:00',
            startTime: data.queueDetails?.startTime || '',
            isStarted: Boolean(data.queueDetails?.isStarted),
            createdAt: data.createdAt || '',
            orderMode: getOrderModeDesc(data.orderMode),
            color: getOrderModeColor(data.orderMode),
            orderStatus: data.queueDetails?.orderStatus || 'MAKE',
            orderNo: data.orderNo || '',
            orderDate: data.orderDate || '',
            branchCode: data.branchCode || ''
          };

          queueData.push(queueItem);
        });

        sortQueueByFcfs(queueData);
        callback(queueData);
      },
      (error) => {
        console.error('❌ Error in REAL-TIME queue listener:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up REAL-TIME queue summary listener:', error);
    callback([]);
    return () => {};
  }
};

export const loadQueueByStatus = async (branchCode, orderStatus, callback) => {
  try {
    await loadOrderModes();

    const currentDate = getCurrentPhilippineDate();

    const ordersQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('branchCode', '==', branchCode),
      where('orderDate', '==', currentDate),
      where('queueDetails.orderStatus', '==', orderStatus)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const queueData = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.orderMode === 'FD') return;

          queueData.push({
            id: data.mainDetails?.transactionId || doc.id,
            name: data.mainDetails?.customerName || 'Unknown',
            items: data.orderItems?.length || 0,
            time: data.queueDetails?.elapsedTime || '0:00',
            startTime: data.queueDetails?.startTime || '',
            isStarted: Boolean(data.queueDetails?.isStarted),
            createdAt: data.createdAt || '',
            orderMode: getOrderModeDesc(data.orderMode),
            color: getOrderModeColor(data.orderMode),
            orderStatus: data.queueDetails?.orderStatus || 'MAKE',
            orderNo: data.orderNo || '',
            orderDate: data.orderDate || '',
            branchCode: data.branchCode || ''
          });
        });

        sortQueueByFcfs(queueData);
        callback(queueData);
      },
      (error) => {
        console.error(`❌ Error in ${orderStatus} REAL-TIME queue listener:`, error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error(`❌ Error setting up ${orderStatus} REAL-TIME queue listener:`, error);
    callback([]);
    return () => {};
  }
};
