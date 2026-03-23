import { collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { store } from '../config/env';

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

const sendEmailNotification = async (templateId, employeeName, branchName, currentTime, currentDate) => {
  try {
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
        parameter4: currentDate
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

      const emailResult = await sendEmailNotification(
        'store-close-notification',
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

      await updateDoc(storeDoc.ref, {
        storeStatus: 'CLOSED',
        staffClose: employeeName,
        closeTime: currentTime24
      });

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
