import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
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
  const now = new Date();
  const philippineTime = now.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const timeMatch = philippineTime.match(/(\d{2}:\d{2}:\d{2})/);
  return timeMatch ? timeMatch[1] : now.toTimeString().split(' ')[0];
};

const calculateElapsedTime = (startTime, endTime) => {
  try {
    const [startHour, startMin, startSec] = startTime.split(':').map(Number);
    const startTotalSeconds = (startHour * 3600) + (startMin * 60) + startSec;

    const [endHour, endMin, endSec] = endTime.split(':').map(Number);
    const endTotalSeconds = (endHour * 3600) + (endMin * 60) + endSec;

    let diffSeconds = endTotalSeconds - startTotalSeconds;
    if (diffSeconds < 0) diffSeconds += 24 * 3600;

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating elapsed time:', error);
    return '00:00';
  }
};

export const updateOrderStatus = async (orderNo, transactionId, branchCode, orderStatus, reason = '') => {
  try {
    if (!orderNo || !transactionId || !branchCode || !orderStatus) {
      throw new Error('Missing required parameters: orderNo, transactionId, branchCode, and orderStatus are required');
    }

    if (orderStatus === 'VOID' && !reason) {
      throw new Error('Void reason is required when order status is VOID');
    }

    if (orderStatus === 'UPD' && !reason) {
      throw new Error('Start time is required when order status is UPD');
    }

    const currentDate = getCurrentPhilippineDate();

    const ordersQuery = query(
      collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
      where('orderNo', '==', orderNo),
      where('branchCode', '==', branchCode),
      where('orderDate', '==', currentDate)
    );

    const querySnapshot = await getDocs(ordersQuery);

    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Order not found',
        message: `No order found with orderNo: ${orderNo}, branchCode: ${branchCode}, date: ${currentDate}`
      };
    }

    let targetDoc = null;
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.mainDetails?.transactionId === transactionId) {
        targetDoc = docSnapshot;
      }
    });

    if (!targetDoc) {
      return {
        success: false,
        error: 'Transaction ID mismatch',
        message: `Order found but transactionId does not match. Expected: ${transactionId}`
      };
    }

    const orderData = targetDoc.data();
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (orderStatus === 'UPD') {
      updateData['queueDetails.startTime'] = reason;
      updateData['queueDetails.isStarted'] = true;
    } else if (orderStatus === 'DONE') {
      updateData['queueDetails.orderStatus'] = orderStatus;
      const completionTime = getCurrentPhilippineTime();
      updateData['queueDetails.timeCompleted'] = completionTime;

      const startTime = orderData.queueDetails?.startTime;
      if (startTime) {
        updateData['queueDetails.elapsedTime'] = calculateElapsedTime(startTime, completionTime);
      } else {
        updateData['queueDetails.elapsedTime'] = '00:00';
      }
    } else if (orderStatus === 'VOID') {
      updateData['queueDetails.orderStatus'] = orderStatus;
      updateData['queueDetails.timeCompleted'] = getCurrentPhilippineTime();
      updateData['queueDetails.voidReason'] = reason;
    } else {
      updateData['queueDetails.orderStatus'] = orderStatus;
    }

    const docRef = doc(firestore, 'CYNQ_POS_ORDER_DETAILS', targetDoc.id);
    await updateDoc(docRef, updateData);

    return {
      success: true,
      documentId: targetDoc.id,
      orderNo,
      oldStatus: orderData.queueDetails?.orderStatus,
      newStatus: orderStatus === 'UPD' ? orderData.queueDetails?.orderStatus : orderStatus,
      message:
        orderStatus === 'UPD'
          ? `Order startTime set to ${reason}`
          : `Order status updated from ${orderData.queueDetails?.orderStatus} to ${orderStatus}`,
      ...(orderStatus === 'VOID' && { voidReason: reason }),
      ...(orderStatus === 'UPD' && { startTime: reason }),
      ...(orderStatus === 'DONE' && {
        timeCompleted: updateData['queueDetails.timeCompleted'],
        elapsedTime: updateData['queueDetails.elapsedTime']
      })
    };
  } catch (error) {
    console.error('❌ Error updating order status:', error);

    return {
      success: false,
      error: error.message,
      message: 'Failed to update order status'
    };
  }
};

export const markOrderAsDone = async (orderNo, transactionId, branchCode) => {
  return updateOrderStatus(orderNo, transactionId, branchCode, 'DONE');
};

export const voidOrder = async (orderNo, transactionId, branchCode, reason) => {
  return updateOrderStatus(orderNo, transactionId, branchCode, 'VOID', reason);
};

export const startOrderTimer = async (orderNo, transactionId, branchCode, startTime) => {
  return updateOrderStatus(orderNo, transactionId, branchCode, 'UPD', startTime);
};
