import { addDoc, collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList } from '../config/env';

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
      branchCode,
      checklistDone,
      checklistItemId,
      checklistitemCategory,
      dateUpdated,
      employeeAdded,
      employeeEvaluated,

      category,
      submittedBy,
      checklistItems
    } = payload || {};

    const normalizedDate = dateUpdated || getCurrentPhilippineDate();

    if (Array.isArray(checklistItems) && checklistItems.length > 0) {
      const normalizedCategory = normalizeCategory(category || checklistitemCategory);
      const normalizedBranchCode = String(branchCode || '').trim();
      const normalizedEmployeeAdded = String(employeeAdded || submittedBy || '').trim();

      const results = await Promise.all(
        checklistItems.map((item) => updateChecklistItem({
          branchCode: normalizedBranchCode,
          checklistDone: item?.checklistDone,
          checklistItemId: item?.checklistItemId,
          checklistitemCategory: normalizedCategory,
          dateUpdated: normalizedDate,
          employeeAdded: normalizedEmployeeAdded,
          employeeEvaluated: item?.employeeEvaluated || employeeEvaluated || normalizedEmployeeAdded
        }))
      );

      const successCount = results.filter((result) => result?.success).length;
      const failed = results.filter((result) => !result?.success);

      return {
        success: failed.length === 0,
        statusCode: failed.length === 0 ? 200 : 207,
        description: failed.length === 0 ? 'Checklist items processed successfully.' : 'Some checklist items failed to process.',
        summary: {
          totalItems: checklistItems.length,
          successCount,
          failedCount: failed.length
        },
        results
      };
    }

    const normalizedCategory = normalizeCategory(checklistitemCategory || category);
    const normalizedBranchCode = String(branchCode || '').trim();
    const normalizedChecklistItemId = String(checklistItemId || '').trim();
    const normalizedChecklistDone = String(checklistDone ?? '').trim().toUpperCase();
    const normalizedEmployeeAdded = String(employeeAdded || submittedBy || '').trim();

    if (!normalizedBranchCode || !normalizedChecklistItemId || !normalizedDate || !normalizedEmployeeAdded || !normalizedCategory) {
      return {
        success: false,
        statusCode: 400,
        description: 'branchCode, checklistItemId, checklistitemCategory, dateUpdated, and employeeAdded are required.'
      };
    }

    if (normalizedChecklistDone !== 'YES' && normalizedChecklistDone !== 'NO') {
      return {
        success: false,
        statusCode: 400,
        description: 'checklistDone must be YES or NO.'
      };
    }

    const dailyDataRef = collection(firestore, collectionList.checklistDailyEntry);
    const dailyQuery = query(
      dailyDataRef,
      where('branchCode', '==', normalizedBranchCode),
      where('checklistItemId', '==', normalizedChecklistItemId),
      where('dateUpdated', '==', normalizedDate)
    );

    const existingSnapshot = await getDocs(dailyQuery);

    const entryPayload = {
      branchCode: normalizedBranchCode,
      checklistDone: normalizedChecklistDone,
      checklistItemId: normalizedChecklistItemId,
      checklistitemCategory: normalizedCategory,
      dateUpdated: normalizedDate,
      employeeAdded: normalizedEmployeeAdded
    };

    if (normalizedCategory === 'EMPL') {
      entryPayload.employeeEvaluated = String(employeeEvaluated || normalizedEmployeeAdded).trim();
    }

    if (existingSnapshot.empty) {
      await addDoc(dailyDataRef, entryPayload);

      return {
        success: true,
        statusCode: 200,
        description: 'Checklist item created successfully.',
        action: 'CREATED',
        data: entryPayload
      };
    }

    await Promise.all(existingSnapshot.docs.map((docSnap) => updateDoc(docSnap.ref, entryPayload)));

    return {
      success: true,
      statusCode: 200,
      description: 'Checklist item updated successfully.',
      action: 'UPDATED',
      affectedRows: existingSnapshot.size,
      data: entryPayload
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
