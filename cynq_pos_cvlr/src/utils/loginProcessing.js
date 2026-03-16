import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { getStoredItem, removeStoredItem, setStoredItem } from './storage';

const getPhilippinesDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
};

const getDaysDifference = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const normalizeEmploymentStatus = (status) => {
  return String(status || '').trim().toUpperCase();
};

const isEmploymentActive = (status) => {
  const normalized = normalizeEmploymentStatus(status);
  return normalized === 'ACTIVE' || normalized === 'ACT' || normalized === 'A';
};

const normalizeEmployeeIdInput = (value) => {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const canonicalEmployeeId = (value) => {
  const normalized = normalizeEmployeeIdInput(value);
  const match = normalized.match(/^EMP([A-Z])(\d+)$/);

  if (!match) return normalized;

  const role = match[1];
  const numericPart = String(parseInt(match[2], 10));
  return `EMP${role}${numericPart === 'NaN' ? match[2] : numericPart}`;
};

const getEmployeeIdFromData = (data) => {
  return data?.employeeId || data?.employeeID || data?.employee_id || '';
};

export const processLogin = async (employeeId) => {
  try {
    const normalizedInput = normalizeEmployeeIdInput(employeeId);

    if (!normalizedInput || normalizedInput.length < 7) {
      return {
        success: false,
        status: 'FAIL',
        message: 'Invalid Employee ID format'
      };
    }

    if (!firestore) {
      return {
        success: false,
        status: 'FAIL',
        message: 'Database connection error. Please try again.'
      };
    }

    const employeeRef = collection(firestore, 'EMPLOYEE_INFORMATION');
    let employeeDoc = null;
    let lookupError = null;

    try {
      const q = query(employeeRef, where('employeeId', '==', normalizedInput));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        employeeDoc = querySnapshot.docs.find((doc) => isEmploymentActive(doc.data()?.employmentStatus)) || null;
      }
    } catch (error) {
      lookupError = error;
    }

    // Pre-refactor compatibility:
    // many records use document ID as the employee identifier (e.g., EMPM0001).
    if (!employeeDoc) {
      try {
        const byDocIdRef = doc(firestore, 'EMPLOYEE_INFORMATION', normalizedInput);
        const byDocIdSnap = await getDoc(byDocIdRef);

        if (byDocIdSnap.exists() && isEmploymentActive(byDocIdSnap.data()?.employmentStatus)) {
          employeeDoc = byDocIdSnap;
        }
      } catch (error) {
        lookupError = error;
      }
    }

    // Backward-compatibility fallback:
    // support IDs with different zero-padding and legacy field names.
    if (!employeeDoc) {
      try {
        const allEmployeesSnapshot = await getDocs(employeeRef);
        const inputCanonical = canonicalEmployeeId(normalizedInput);

        employeeDoc =
          allEmployeesSnapshot.docs.find((doc) => {
            const data = doc.data();
            const dbEmployeeId = getEmployeeIdFromData(data);
            return (
              isEmploymentActive(data?.employmentStatus) &&
              canonicalEmployeeId(dbEmployeeId) === inputCanonical
            );
          }) || null;
      } catch (error) {
        lookupError = error;
      }
    }

    if (!employeeDoc) {
      const errorCode = String(lookupError?.code || '').toLowerCase();
      if (errorCode.includes('permission-denied')) {
        return {
          success: false,
          status: 'FAIL',
          message: 'Unable to access employee records. Please check Firestore permissions.'
        };
      }

      return {
        success: false,
        status: 'FAIL',
        message: 'Employee ID not found. Please contact HR.'
      };
    }

    const employeeData = employeeDoc.data();
    const { name, hireDate } = employeeData;
    const resolvedEmployeeId = normalizeEmployeeIdInput(getEmployeeIdFromData(employeeData)) || normalizedInput;
    const roleChar = resolvedEmployeeId.charAt(3).toUpperCase();

    if (roleChar === 'M' || roleChar === 'F') {
      const result = {
        success: true,
        employeeId: resolvedEmployeeId,
        name,
        needsManagerAccess: 'N',
        status: 'OK',
        message: 'N/A'
      };

      await setStoredItem('currentEmployee', JSON.stringify(result));
      await setStoredItem('isAuthenticated', 'true');

      return result;
    }

    if (roleChar === 'K' || roleChar === 'H' || roleChar === 'A') {
      return {
        success: false,
        status: 'FAIL',
        message: 'Employee has no access to the POS. Please contact the administrator to request one.'
      };
    }

    if (roleChar === 'O') {
      const currentDate = getPhilippinesDate();

      let hireDateObj;
      if (hireDate && hireDate.toDate) {
        hireDateObj = hireDate.toDate();
      } else if (typeof hireDate === 'string') {
        hireDateObj = new Date(hireDate);
      } else {
        return {
          success: false,
          status: 'FAIL',
          message: 'Invalid hire date format. Please contact HR.'
        };
      }

      const daysSinceHire = getDaysDifference(hireDateObj, currentDate);

      if (daysSinceHire < 30) {
        const result = {
          success: true,
          employeeId: resolvedEmployeeId,
          name,
          needsManagerAccess: 'Y',
          status: 'OK',
          message:
            'This employee needs manager access, please input the Employee Id of a manager or tenure employee and your CVLR Portal Password to grant the access of the employee'
        };

        await setStoredItem('pendingEmployee', JSON.stringify(result));
        return result;
      }

      const result = {
        success: true,
        employeeId: resolvedEmployeeId,
        name,
        needsManagerAccess: 'N',
        status: 'OK',
        message: 'N/A'
      };

      await setStoredItem('currentEmployee', JSON.stringify(result));
      await setStoredItem('isAuthenticated', 'true');
      return result;
    }

    return {
      success: false,
      status: 'FAIL',
      message: 'Invalid employee role. Please contact the administrator.'
    };
  } catch (error) {
    const errorCode = String(error?.code || '').toLowerCase();
    const errorMessage = String(error?.message || '');

    if (errorCode.includes('permission-denied')) {
      return {
        success: false,
        status: 'FAIL',
        message: 'Unable to access employee records. Please check Firestore permissions.'
      };
    }

    if (errorMessage.toLowerCase().includes('network')) {
      return {
        success: false,
        status: 'FAIL',
        message: 'Network error while logging in. Please check your connection and try again.'
      };
    }

    return {
      success: false,
      status: 'FAIL',
      message: 'An error occurred during login. Please try again.'
    };
  }
};

export const verifyManagerAccess = async (managerEmployeeId, portalPassword) => {
  try {
    if (!firestore) {
      return {
        success: false,
        message: 'Database connection error. Please try again.'
      };
    }

    const employeeRef = collection(firestore, 'EMPLOYEE_INFORMATION');
    const q = query(
      employeeRef,
      where('employeeId', '==', managerEmployeeId),
      where('employmentStatus', '==', 'ACTIVE')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        message: 'Manager not found or inactive.'
      };
    }

    const managerData = querySnapshot.docs[0].data();
    const roleChar = managerEmployeeId.charAt(3).toUpperCase();

    if (roleChar !== 'M' && roleChar !== 'F') {
      return {
        success: false,
        message: 'This employee does not have manager privileges.'
      };
    }

    const pendingEmployee = await getStoredItem('pendingEmployee');
    if (pendingEmployee) {
      await setStoredItem('currentEmployee', pendingEmployee);
      await setStoredItem('isAuthenticated', 'true');
      await removeStoredItem('pendingEmployee');
    }

    return {
      success: true,
      message: `Access granted successfully by ${managerData.name || 'Manager'}.`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Verification failed. Please try again.'
    };
  }
};

export const processLogout = async () => {
  await removeStoredItem('currentEmployee');
  await removeStoredItem('pendingEmployee');
  await removeStoredItem('isAuthenticated');
};

export const getCurrentEmployee = async () => {
  const employeeData = await getStoredItem('currentEmployee');
  return employeeData ? JSON.parse(employeeData) : null;
};

export const getPendingEmployee = async () => {
  const employeeData = await getStoredItem('pendingEmployee');
  return employeeData ? JSON.parse(employeeData) : null;
};

export const isAuthenticated = async () => {
  return (await getStoredItem('isAuthenticated')) === 'true';
};
