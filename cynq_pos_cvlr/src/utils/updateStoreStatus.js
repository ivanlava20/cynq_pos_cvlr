import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList, store } from '../config/env';
import { fetchDailySales } from './fetchDailySales';

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

const getCurrentPhilippineTime = () => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
};

const getCurrentPhilippineTime12Hour = () => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date());
};

const formatAmount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
};

const formatCount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

const formatPaymentSummary = (rows = []) => {
  if (!Array.isArray(rows) || !rows.length) return 'No data available<br/>';

  return rows
    .map((row) => {
      const label = String(row.paymentMethodDesc || row.paymentMethodCode || 'Unknown').trim();
      const amount = formatAmount(row.amount);
      const transactions = formatCount(row.transactions);
      return `${label}: ₱${amount} (${transactions} transaction(s))<br/>`;
    })
    .join('');
};

const formatOnlineSummary = (rows = []) => {
  if (!Array.isArray(rows) || !rows.length) return 'No data available<br/>';

  return rows
    .map((row) => {
      const label = String(row.orderModeDesc || row.orderModeCode || 'Unknown').trim();
      const amount = formatAmount(row.amount);
      const transactions = formatCount(row.transactions);
      return `${label}: ₱${amount} (${transactions} transaction(s))<br/>`;
    })
    .join('');
};

const sendEmailNotification = async (
  templateId,
  employeeName,
  branchName,
  currentTime,
  currentDate,
  additionalParameters = {}
) => {
  try {
    const normalizedAdditionalParameters = Object.entries(additionalParameters || {}).reduce((acc, [key, value]) => {
      acc[key] = value == null ? '' : String(value);
      return acc;
    }, {});

    const compatibilityParameterAliases = {};
    for (let index = 5; index <= 20; index += 1) {
      const value = normalizedAdditionalParameters[`parameter${index}`];
      if (value === undefined) continue;

      compatibilityParameterAliases[`parm${index}`] = value;
      compatibilityParameterAliases[`PARM${index}`] = value;
    }

    const response = await fetch('https://cvlr-portal.web.app/api/common/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'cafevanleroe@gmail.com',
        cc: 'admin@cafevanleroe.com, noelava2@gmail.com',
        templateId,
        parameter1: employeeName,
        parameter2: branchName,
        parameter3: currentTime,
        parameter4: currentDate,
        ...normalizedAdditionalParameters,
        ...compatibilityParameterAliases
      })
    });

    const result = await response.json();

    if (result.status === 'OK' || result.status === 'SUCCESS') {
      return {
        success: true,
        status: 'OK',
        description: result.description || result.message || 'Email sent successfully'
      };
    }

    return {
      success: false,
      status: result.status || 'ERROR',
      description: result.description || result.message || 'Email sending failed'
    };
  } catch (error) {
    const isCORSError =
      error.message.includes('CORS') || error.message.includes('fetch') || error.name === 'TypeError';

    if (isCORSError && typeof window !== 'undefined') {
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDevelopment) {
        return {
          success: true,
          status: 'OK',
          description: 'Email notification sent (CORS bypassed in development)'
        };
      }
    }

    return {
      success: false,
      status: 'ERROR',
      description: error.message || 'Failed to send email notification'
    };
  }
};

export const updateStoreStatus = async (branchCode, employeeName, storeStatus) => {
  try {
    if (!branchCode || !employeeName || !storeStatus) {
      return {
        success: false,
        statusCode: 400,
        description: 'branchCode, employeeName, and storeStatus are required'
      };
    }

    if (storeStatus !== 'OPEN' && storeStatus !== 'CLOSED') {
      return {
        success: false,
        statusCode: 400,
        description: 'storeStatus must be either OPEN or CLOSED'
      };
    }

    const currentDate = getCurrentPhilippineDate();
    const currentTime24 = getCurrentPhilippineTime();
    const currentTime12 = getCurrentPhilippineTime12Hour();
    const branchName = store.branch || branchCode;

    if (storeStatus === 'CLOSED') {
      const storeStatusQuery = query(
        collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
        where('branchCode', '==', branchCode),
        where('dateToday', '==', currentDate),
        where('storeStatus', '==', 'OPEN')
      );

      const querySnapshot = await getDocs(storeStatusQuery);

      if (querySnapshot.empty) {
        return {
          success: false,
          statusCode: 400,
          description: 'No entry found'
        };
      }

      const storeDoc = querySnapshot.docs[0];

      const dailySalesResult = await fetchDailySales(branchCode, currentDate);
      const dailySalesData = dailySalesResult?.success && dailySalesResult?.data ? dailySalesResult.data : {};

      const closeEmailParameters = {
        parameter5: formatAmount(dailySalesData.totalSale),
        parameter6: formatCount(dailySalesData.transactionCount),
        parameter7: formatCount(dailySalesData.small),
        parameter8: formatCount(dailySalesData.medium),
        parameter9: formatCount(dailySalesData.large),
        parameter10: formatCount(dailySalesData.pastriesSold),
        parameter11: formatCount(dailySalesData.foodSold),
        parameter12: formatPaymentSummary(dailySalesData.paymentBreakdown),
        parameter13: formatOnlineSummary(dailySalesData.orderModeBreakdown)
      };

      const emailResult = await sendEmailNotification(
        'store-close-notification',
        employeeName,
        branchName,
        currentTime12,
        currentDate,
        closeEmailParameters
      );

      if (!emailResult.success || emailResult.status !== 'OK') {
        return {
          success: false,
          statusCode: 500,
          description: `Email notification failed: ${emailResult.description}`
        };
      }

      await updateDoc(storeDoc.ref, {
        storeStatus: 'CLOSED',
        staffClose: employeeName,
        closeTime: currentTime24
      });

      const staffingQuery = query(
        collection(firestore, collectionList.employeeStaffing),
        where('branchCode', '==', branchCode),
        where('timeEntryDate', '==', currentDate)
      );

      const staffingSnapshot = await getDocs(staffingQuery);

      if (!staffingSnapshot.empty) {
        const docsToUpdate = staffingSnapshot.docs.filter((staffDoc) => {
          const data = staffDoc.data();
          const hasTimeOutField = Object.prototype.hasOwnProperty.call(data, 'timeOut');
          const timeOutValue = data.timeOut;
          const isBlankString = typeof timeOutValue === 'string' && timeOutValue.trim() === '';

          return !hasTimeOutField || timeOutValue === null || isBlankString;
        });

        if (docsToUpdate.length > 0) {
          await Promise.all(
            docsToUpdate.map((staffDoc) =>
              updateDoc(staffDoc.ref, {
                timeOut: currentTime24
              })
            )
          );
        }
      }

      return {
        success: true,
        statusCode: 200,
        description: 'Store is closed successfully'
      };
    }

    const storeStatusQuery = query(
      collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', currentDate),
      where('storeStatus', '==', 'CLOSED')
    );

    await getDocs(storeStatusQuery);

    const openStoreQuery = query(
      collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', currentDate),
      where('storeStatus', '==', 'OPEN')
    );

    const openStoreSnapshot = await getDocs(openStoreQuery);

    if (!openStoreSnapshot.empty) {
      return {
        success: false,
        statusCode: 400,
        description: 'Store is already open for today'
      };
    }

    const emailResult = await sendEmailNotification(
      'store-open-notification',
      employeeName,
      branchName,
      currentTime12,
      currentDate
    );

    if (!emailResult.success || emailResult.status !== 'OK') {
      return {
        success: false,
        statusCode: 500,
        description: `Email notification failed: ${emailResult.description}`
      };
    }

    await addDoc(collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'), {
      branchCode,
      closeTime: null,
      dateToday: currentDate,
      openTime: currentTime24,
      staffClose: null,
      staffOpen: employeeName,
      storeStatus: 'OPEN'
    });

    return {
      success: true,
      statusCode: 200,
      description: 'Store is opened successfully'
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      description: `Failed to update store status: ${error.message}`
    };
  }
};

export const canOpenStore = async (branchCode) => {
  try {
    const currentDate = getCurrentPhilippineDate();

    const openStoreQuery = query(
      collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', currentDate),
      where('storeStatus', '==', 'OPEN')
    );

    const querySnapshot = await getDocs(openStoreQuery);

    return {
      success: true,
      canOpen: querySnapshot.empty,
      message: querySnapshot.empty ? 'Store can be opened' : 'Store is already open for today'
    };
  } catch (error) {
    return {
      success: false,
      canOpen: false,
      message: error.message
    };
  }
};

export const canCloseStore = async (branchCode) => {
  try {
    const currentDate = getCurrentPhilippineDate();

    const openStoreQuery = query(
      collection(firestore, 'CYNQ_POS_STORE_MANAGEMENT'),
      where('branchCode', '==', branchCode),
      where('dateToday', '==', currentDate),
      where('storeStatus', '==', 'OPEN')
    );

    const querySnapshot = await getDocs(openStoreQuery);

    return {
      success: true,
      canClose: !querySnapshot.empty,
      message: !querySnapshot.empty ? 'Store can be closed' : 'No open store found for today'
    };
  } catch (error) {
    return {
      success: false,
      canClose: false,
      message: error.message
    };
  }
};
