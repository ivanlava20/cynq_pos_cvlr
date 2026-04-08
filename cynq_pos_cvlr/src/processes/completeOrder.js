import { collection, doc, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringSafe = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const pad2 = (value) => String(value).padStart(2, '0');

const getCurrentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const getCurrentTime = () => {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
};

const hashString = (input) => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const buildDedupeKey = ({ payload, branchCode, orderDate, orderMode }) => {
  const payloadOrderItems = Array.isArray(payload?.orderDetails?.orderItems)
    ? payload.orderDetails.orderItems
    : Array.isArray(payload?.orderItems)
      ? payload.orderItems
      : [];

  const signature = {
    branchCode,
    orderDate,
    orderMode,
    customerName: toStringSafe(payload?.mainDetails?.customerName, ''),
    totalAmount: toNumber(payload?.mainDetails?.totalAmount, 0),
    consumeMethod: toStringSafe(payload?.orderDetails?.consumeMethod, ''),
    orderNote: toStringSafe(payload?.orderDetails?.orderNote, ''),
    orderTakenBy: toStringSafe(payload?.orderDetails?.orderTakenBy, ''),
    discountDetails: {
      discountAmount: toNumber(payload?.discountDetails?.discountAmount, 0),
      discountCode: toStringSafe(payload?.discountDetails?.discountCode ?? payload?.discountDetails?.discountCd, ''),
      discountDescription: toStringSafe(payload?.discountDetails?.discountDescription ?? payload?.discountDetails?.discountDesc, '')
    },
    tableDetails: {
      retekessNumber: toStringSafe(payload?.tableDetails?.retekessNumber, ''),
      tableNumber: toStringSafe(payload?.tableDetails?.tableNumber, '')
    },
    orderItems: payloadOrderItems.map((item) => ({
          addOns: toStringSafe(item?.addOns, 'None'),
          itemCategory: toStringSafe(item?.itemCategory, ''),
          itemId: toStringSafe(item?.itemId, ''),
          itemName: toStringSafe(item?.itemName, ''),
          itemNotes: toStringSafe(item?.itemNotes, 'NA'),
          itemPrice: toNumber(item?.itemPrice, 0),
          itemQuantity: toNumber(item?.itemQuantity, 0),
          itemSize: toStringSafe(item?.itemSize, ''),
          itemStatus: toStringSafe(item?.itemStatus, 'MAKE'),
          itemTotalAmount: toNumber(item?.itemTotalAmount, 0)
        })),
    paymentMethods: Array.isArray(payload?.paymentMethods)
      ? payload.paymentMethods.map((method) => ({
          modeOfPayment: toStringSafe(method?.modeOfPayment, ''),
          paymentAmount: toNumber(method?.paymentAmount, 0),
          referenceNumber: toStringSafe(method?.referenceNumber, '')
        }))
      : []
  };

  return hashString(JSON.stringify(signature));
};

const extractSequence = (orderNo, orderMode) => {
  const code = toStringSafe(orderNo, '');
  const mode = toStringSafe(orderMode, '');
  if (!code.startsWith(mode)) return 0;
  const suffix = code.slice(mode.length);
  if (!/^\d+$/.test(suffix)) return 0;
  return Number(suffix);
};

const buildOrderNo = (orderMode, sequence) => `${orderMode}${String(sequence).padStart(4, '0')}`;

const sanitizeForDocId = (value) => String(value || '').replace(/[\/\s]+/g, '_');

const candidateExistsInScope = async (candidateOrderNo, branchCode, orderDate) => {
  const byOrderNo = query(collection(firestore, 'CYNQ_POS_ORDER_DETAILS'), where('orderNo', '==', candidateOrderNo));
  const snapshot = await getDocs(byOrderNo);

  if (snapshot.empty) return false;

  let existsInScope = false;
  snapshot.forEach((docSnap) => {
    const row = docSnap.data() || {};
    if (toStringSafe(row.branchCode) === branchCode && toStringSafe(row.orderDate) === orderDate) {
      existsInScope = true;
    }
  });

  return existsInScope;
};

const generateUniqueOrderNo = async ({ branchCode, orderDate, orderMode }) => {
  if (!branchCode || !orderDate || !orderMode) {
    throw new Error('Missing required values for order number generation.');
  }

  const byBranchAndDate = query(
    collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
    where('branchCode', '==', branchCode),
    where('orderDate', '==', orderDate)
  );
  const snapshot = await getDocs(byBranchAndDate);

  let maxSequence = 0;
  snapshot.forEach((docSnap) => {
    const row = docSnap.data() || {};
    if (toStringSafe(row.orderMode) !== orderMode) return;
    const seq = extractSequence(row.orderNo, orderMode);
    if (seq > maxSequence) maxSequence = seq;
  });

  let nextSequence = maxSequence + 1;
  let attempts = 0;

  while (attempts < 10000) {
    const candidate = buildOrderNo(orderMode, nextSequence);
    const exists = await candidateExistsInScope(candidate, branchCode, orderDate);
    if (!exists) return candidate;

    nextSequence += 1;
    attempts += 1;
  }

  throw new Error('Unable to generate a unique order number.');
};

const normalizeCompleteOrderPayload = (rawPayload = {}) => {
  const nowIso = new Date().toISOString();

  const orderNo = toStringSafe(rawPayload.orderNo ?? rawPayload.orderDetails?.orderNo, '');
  const orderMode = toStringSafe(rawPayload.orderMode ?? rawPayload.orderDetails?.orderMode, '');
  const branchCode = toStringSafe(rawPayload.branchCode ?? rawPayload.mainDetails?.branchCode, '');
  const orderDate = toStringSafe(rawPayload.orderDate ?? rawPayload.orderDetails?.orderDate, getCurrentDate());
  const orderTime = toStringSafe(rawPayload.orderDetails?.orderTime, getCurrentTime());
  const rawOrderItems = Array.isArray(rawPayload.orderDetails?.orderItems)
    ? rawPayload.orderDetails.orderItems
    : Array.isArray(rawPayload.orderItems)
      ? rawPayload.orderItems
      : [];

  const discountInput = rawPayload.discountDetails || {};
  const tableInput = rawPayload.tableDetails || {};
  const queueInput = rawPayload.queueDetails || {};
  const membershipInput = rawPayload.membershipDetails || {};

  const normalizedQueueStatus = toStringSafe(queueInput.orderStatus, 'DONE');

  return {
    branchCode,
    createdAt: nowIso,
    discountDetails: {
      discountAmount: toNumber(discountInput.discountAmount, 0),
      discountCode: toStringSafe(discountInput.discountCode ?? discountInput.discountCd, ''),
      discountDescription: toStringSafe(discountInput.discountDescription ?? discountInput.discountDesc, '')
    },
    mainDetails: {
      customerName: toStringSafe(rawPayload.mainDetails?.customerName, ''),
      id: toStringSafe(rawPayload.mainDetails?.id, ''),
      totalAmount: toNumber(rawPayload.mainDetails?.totalAmount, 0),
      transactionId: toStringSafe(rawPayload.mainDetails?.transactionId, '')
    },
    membershipDetails: {
      membershipId: toStringSafe(membershipInput.membershipId, ''),
      pointsEarned: toNumber(membershipInput.pointsEarned, 0)
    },
    orderDate,
    orderDetails: {
      consumeMethod: toStringSafe(rawPayload.orderDetails?.consumeMethod, ''),
      orderChange: toNumber(rawPayload.orderDetails?.orderChange, 0),
      orderMode,
      orderNo,
      orderNote: toStringSafe(rawPayload.orderDetails?.orderNote, ''),
      orderPaymentTotalAmount: toNumber(rawPayload.orderDetails?.orderPaymentTotalAmount, 0),
      orderTakenBy: toStringSafe(rawPayload.orderDetails?.orderTakenBy, ''),
      orderTime,
      orderItems: rawOrderItems.map((item) => ({
        addOns: toStringSafe(item?.addOns, 'None'),
        id: toStringSafe(item?.id, ''),
        itemCategory: toStringSafe(item?.itemCategory, ''),
        itemId: toStringSafe(item?.itemId, ''),
        itemName: toStringSafe(item?.itemName, ''),
        itemNotes: toStringSafe(item?.itemNotes, 'NA'),
        itemPrice: toNumber(item?.itemPrice, 0),
        itemQuantity: toNumber(item?.itemQuantity, 0),
        itemSize: toStringSafe(item?.itemSize, ''),
        itemStatus: toStringSafe(item?.itemStatus, 'MAKE'),
        itemTotalAmount: toNumber(item?.itemTotalAmount, 0),
        orderMode,
        orderNo
      }))
    },
    orderItems: rawOrderItems.map((item) => ({
          addOns: toStringSafe(item?.addOns, 'None'),
          id: toStringSafe(item?.id, ''),
          itemCategory: toStringSafe(item?.itemCategory, ''),
          itemId: toStringSafe(item?.itemId, ''),
          itemName: toStringSafe(item?.itemName, ''),
          itemNotes: toStringSafe(item?.itemNotes, 'NA'),
          itemPrice: toNumber(item?.itemPrice, 0),
          itemQuantity: toNumber(item?.itemQuantity, 0),
          itemSize: toStringSafe(item?.itemSize, ''),
          itemStatus: toStringSafe(item?.itemStatus, 'MAKE'),
          itemTotalAmount: toNumber(item?.itemTotalAmount, 0),
          orderMode,
          orderNo
        })),
    paymentMethods: Array.isArray(rawPayload.paymentMethods)
      ? rawPayload.paymentMethods.map((method) => ({
          id: toNumber(method?.id, 0),
          modeOfPayment: toStringSafe(method?.modeOfPayment, ''),
          paymentAmount: toNumber(method?.paymentAmount, 0),
          referenceNumber: toStringSafe(method?.referenceNumber, '')
        }))
      : [],
    queueDetails: {
      elapsedTime: toStringSafe(queueInput.elapsedTime, '00:00'),
      orderStatus: normalizedQueueStatus,
      startTime: toStringSafe(queueInput.startTime, ''),
      timeCompleted: toStringSafe(queueInput.timeCompleted, ''),
      isStarted: Boolean(queueInput.isStarted)
    },
    status: toStringSafe(rawPayload.status, 'completed'),
    tableDetails: {
      retekessNumber: toStringSafe(tableInput.retekessNumber, ''),
      tableNumber: toStringSafe(tableInput.tableNumber, '')
    },
    updatedAt: nowIso,

    // Kept for compatibility with queue/status queries in existing processes.
    orderNo,
    orderMode
  };
};

/**
 * Save a completed order payload to Firestore.
 * @param {Object} completeOrderObject
 * @returns {Promise<{success:boolean, id?:string, message:string}>}
 */
export const completeOrder = async (completeOrderObject) => {
  try {
    if (!completeOrderObject || typeof completeOrderObject !== 'object') {
      return {
        success: false,
        message: 'Invalid complete order payload.'
      };
    }

    const branchCode = toStringSafe(completeOrderObject.branchCode ?? completeOrderObject.mainDetails?.branchCode, '');
    const orderDate = getCurrentDate();
    const orderMode = toStringSafe(completeOrderObject.orderMode ?? completeOrderObject.orderDetails?.orderMode, '');

    if (!branchCode || !orderMode) {
      return {
        success: false,
        message: 'Missing required order context (branchCode/orderMode).'
      };
    }

    const dedupeKey = buildDedupeKey({
      payload: completeOrderObject,
      branchCode,
      orderDate,
      orderMode
    });

    const duplicateQuery = query(collection(firestore, 'CYNQ_POS_ORDER_DETAILS'), where('dedupeKey', '==', dedupeKey));
    const duplicateSnapshot = await getDocs(duplicateQuery);

    if (!duplicateSnapshot.empty) {
      const existingDoc = duplicateSnapshot.docs[0];
      return {
        success: true,
        id: existingDoc.id,
        message: 'Duplicate order prevented (already processed).'
      };
    }

    const incomingTransactionId = toStringSafe(
      completeOrderObject.mainDetails?.transactionId,
      ''
    ).trim();

    if (incomingTransactionId) {
      const seenDocIds = new Set();
      let existingTransactionDoc = null;
      const isSameScope = (row = {}) =>
        toStringSafe(row.branchCode, '') === branchCode &&
        toStringSafe(row.orderDate, '') === orderDate;

      const byMainTransactionId = query(
        collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
        where('mainDetails.transactionId', '==', incomingTransactionId)
      );
      const byMainTransactionSnapshot = await getDocs(byMainTransactionId);

      byMainTransactionSnapshot.forEach((docSnap) => {
        const row = docSnap.data() || {};
        if (isSameScope(row) && !seenDocIds.has(docSnap.id)) {
          seenDocIds.add(docSnap.id);
          if (!existingTransactionDoc) existingTransactionDoc = docSnap;
        }
      });

      const byLegacyTransactionId = query(
        collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
        where('transactionId', '==', incomingTransactionId)
      );
      const byLegacyTransactionSnapshot = await getDocs(byLegacyTransactionId);

      byLegacyTransactionSnapshot.forEach((docSnap) => {
        const row = docSnap.data() || {};
        if (isSameScope(row) && !seenDocIds.has(docSnap.id)) {
          seenDocIds.add(docSnap.id);
          if (!existingTransactionDoc) existingTransactionDoc = docSnap;
        }
      });

      if (existingTransactionDoc) {
        return {
          success: true,
          id: existingTransactionDoc.id,
          message: 'Duplicate order prevented (transaction ID already exists).'
        };
      }
    }

    const uniqueOrderNo = await generateUniqueOrderNo({
      branchCode,
      orderDate,
      orderMode
    });

    const payloadWithGeneratedOrderNo = {
      ...completeOrderObject,
      branchCode,
      orderDate,
      orderMode,
      orderNo: uniqueOrderNo,
      orderDetails: {
        ...(completeOrderObject.orderDetails || {}),
        orderDate,
        orderMode,
        orderNo: uniqueOrderNo
      }
    };

    const normalizedPayload = normalizeCompleteOrderPayload(payloadWithGeneratedOrderNo);

    normalizedPayload.dedupeKey = dedupeKey;

    const orderDocId = [
      'DEDUPE',
      sanitizeForDocId(branchCode),
      sanitizeForDocId(orderDate),
      sanitizeForDocId(dedupeKey)
    ].join('_');
    const orderDocRef = doc(firestore, 'CYNQ_POS_ORDER_DETAILS', orderDocId);

    let wasCreated = false;
    await runTransaction(firestore, async (transaction) => {
      const existing = await transaction.get(orderDocRef);
      if (existing.exists()) {
        return;
      }

      transaction.set(orderDocRef, normalizedPayload);
      wasCreated = true;
    });

    if (!wasCreated) {
      return {
        success: true,
        id: orderDocRef.id,
        message: 'Duplicate order prevented (already processed).'
      };
    }

    return {
      success: true,
      id: orderDocRef.id,
      message: 'Order completed successfully.'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to complete order.'
    };
  }
};

export default completeOrder;
