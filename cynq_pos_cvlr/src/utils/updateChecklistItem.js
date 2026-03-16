import { addDoc, collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

const CATEGORY_MAP = {
  CAFE: 'CAFE',
  EQUI: 'EQUI',
  CLEA: 'CLEA',
  EMPL: 'EMPL',
  cafe: 'CAFE',
  equipment: 'EQUI',
  cleaning: 'CLEA',
  employee: 'EMPL'
};

const getCurrentPhilippineDate = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
};

const normalizeCategory = (category) => {
  if (!category) return null;
  const cleaned = String(category).trim();
  if (!cleaned) return null;

  return CATEGORY_MAP[cleaned] || CATEGORY_MAP[cleaned.toUpperCase()] || null;
};

export const updateChecklistItem = async (payload) => {
  try {
    const {
      category,
      submittedBy,
      dateUpdated,
      branchCode,
      checklistItems,
      employeeEvaluated: defaultEmployeeEvaluated
    } = payload || {};

    const normalizedCategory = normalizeCategory(category);
    const normalizedDate = dateUpdated || getCurrentPhilippineDate();

    if (!normalizedCategory) {
      return {
        success: false,
        statusCode: 400,
        description: 'Invalid category. Allowed values are CAFE, EQUI, CLEA, or EMPL.'
      };
    }

    if (!submittedBy || !branchCode || !normalizedDate) {
      return {
        success: false,
        statusCode: 400,
        description: 'submittedBy, dateUpdated, and branchCode are required.'
      };
    }

    if (!Array.isArray(checklistItems) || checklistItems.length === 0) {
      return {
        success: false,
        statusCode: 400,
        description: 'checklistItems must be a non-empty array.'
      };
    }

    const dailyDataRef = collection(firestore, 'CHECKLIST_DAILY_DATA');
    let createdCount = 0;
    let updatedCount = 0;
    const itemResults = [];

    for (const item of checklistItems) {
      const checklistItemId = item?.checklistItemId;
      const checklistDone = item?.checklistDone;

      if (!checklistItemId || typeof checklistDone === 'undefined') {
        itemResults.push({
          checklistItemId: checklistItemId || null,
          status: 'SKIPPED',
          reason: 'checklistItemId and checklistDone are required per checklist item.'
        });
        continue;
      }

      const dailyQuery = query(
        dailyDataRef,
        where('checklistItemId', '==', checklistItemId),
        where('dateUpdated', '==', normalizedDate),
        where('branchCode', '==', branchCode)
      );

      const existingSnapshot = await getDocs(dailyQuery);

      const basePayload = {
        checklistItemId,
        checklistitemCategory: normalizedCategory,
        employeeAdded: submittedBy,
        dateUpdated: normalizedDate,
        branchCode,
        checklistDone
      };

      if (normalizedCategory === 'EMPL') {
        const resolvedEmployeeEvaluated = item.employeeEvaluated || defaultEmployeeEvaluated || submittedBy;
        basePayload.employeeEvaluated = resolvedEmployeeEvaluated;
      }

      if (existingSnapshot.empty) {
        await addDoc(dailyDataRef, basePayload);
        createdCount += 1;
        itemResults.push({ checklistItemId, status: 'CREATED' });
      } else {
        const updatePayload = {
          checklistDone: basePayload.checklistDone,
          employeeAdded: basePayload.employeeAdded,
          checklistitemCategory: basePayload.checklistitemCategory,
          dateUpdated: basePayload.dateUpdated,
          branchCode: basePayload.branchCode
        };

        if (normalizedCategory === 'EMPL') {
          updatePayload.employeeEvaluated = basePayload.employeeEvaluated;
        }

        await Promise.all(existingSnapshot.docs.map((docSnap) => updateDoc(docSnap.ref, updatePayload)));
        updatedCount += existingSnapshot.size;
        itemResults.push({
          checklistItemId,
          status: 'UPDATED',
          affectedRows: existingSnapshot.size
        });
      }
    }

    return {
      success: true,
      statusCode: 200,
      description: 'Checklist items processed successfully.',
      summary: {
        category: normalizedCategory,
        submittedBy,
        dateUpdated: normalizedDate,
        branchCode,
        totalItems: checklistItems.length,
        createdCount,
        updatedCount,
        itemResults
      }
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      description: error.message || 'Failed to update checklist items.'
    };
  }
};

export default updateChecklistItem;
