import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Get current date in Philippines timezone
 * @returns {Date}
 */
const getPhilippinesDate = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime;
};

/**
 * Calculate days difference between two dates
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
const getDaysDifference = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Verify manager or tenure employee credentials
 * @param {string} managerEmployeeId - Manager's employee ID (e.g., "EMPM0001")
 * @param {string} password - Manager's portal password
 * @returns {Promise<{status: string, message: string}>}
 */
export const checkManagerCredentials = async (managerEmployeeId, password) => {
  try {
    console.log('=== MANAGER CREDENTIALS CHECK ===');
    console.log('Manager ID:', managerEmployeeId);
    console.log('Password received:', password ? 'Yes' : 'No');
    console.log('=================================\n');

    // Validate inputs
    if (!managerEmployeeId || !password) {
      console.log('Validation failed: Missing employee ID or password');
      return {
        status: 'FAIL',
        message: 'Employee ID and password are required.'
      };
    }

    // Check if firestore is initialized
    if (!firestore) {
      console.error('Firestore is not initialized');
      return {
        status: 'FAIL',
        message: 'Database connection error. Please try again.'
      };
    }

    // STEP 1: Query EMPLOYEE_INFORMATION to get emailAddress
    console.log('Step 1: Querying EMPLOYEE_INFORMATION...');
    const employeeRef = collection(firestore, 'EMPLOYEE_INFORMATION');
    const employeeQuery = query(
      employeeRef,
      where('employeeId', '==', managerEmployeeId),
      where('employmentStatus', '==', 'ACTIVE')
    );
    
    const employeeSnapshot = await getDocs(employeeQuery);
    console.log('Employee query executed, docs found:', employeeSnapshot.size);

    // Check if employee exists
    if (employeeSnapshot.empty) {
      console.log('No employee found with ID:', managerEmployeeId);
      return {
        status: 'FAIL',
        message: 'Employee not found or inactive.'
      };
    }

    const employeeData = employeeSnapshot.docs[0].data();
    const emailAddress = employeeData.emailAddress;
    const hireDate = employeeData.hireDate;

    console.log('Employee data retrieved:', { 
      name: employeeData.name, 
      employeeId: employeeData.employeeId,
      emailAddress: emailAddress,
      hireDate: hireDate
    });

    // Validate emailAddress exists
    if (!emailAddress) {
      console.log('Email address not found for employee');
      return {
        status: 'FAIL',
        message: 'Employee email not found in system.'
      };
    }

    // STEP 2: Query USER_LOGIN to get password using emailAddress
    console.log('Step 2: Querying USER_LOGIN with email:', emailAddress);
    const userLoginRef = collection(firestore, 'USER_LOGIN');
    const userLoginQuery = query(
      userLoginRef,
      where('email', '==', emailAddress)
    );
    
    const userLoginSnapshot = await getDocs(userLoginQuery);
    console.log('User login query executed, docs found:', userLoginSnapshot.size);

    // Check if user login exists
    if (userLoginSnapshot.empty) {
      console.log('No login credentials found for email:', emailAddress);
      return {
        status: 'FAIL',
        message: 'Login credentials not found.'
      };
    }

    const userLoginData = userLoginSnapshot.docs[0].data();
    const storedPassword = userLoginData.password;

    console.log('User login data retrieved:', { 
      email: userLoginData.email,
      hasPassword: !!storedPassword
    });

    // Validate stored password exists
    if (!storedPassword) {
      console.log('Password not set for user');
      return {
        status: 'FAIL',
        message: 'Password not configured for this account.'
      };
    }

    // STEP 3: Compare passwords
    console.log('Step 3: Comparing passwords...');
    if (storedPassword === password) {
      console.log('Password matched!');
      
      // STEP 4: Check if Operations employee (fourth character is 'O')
      const roleChar = managerEmployeeId.charAt(3).toUpperCase();
      console.log('Step 4: Checking role character:', roleChar);

      if (roleChar === 'O') {
        console.log('Operations employee detected, checking tenure...');
        
        // Check if hireDate exists
        if (!hireDate) {
          console.log('Hire date not found for Operations employee');
          return {
            status: 'FAIL',
            message: 'Hire date not found in system.'
          };
        }

        // Convert hireDate from Firebase (could be Timestamp or string)
        let hireDateObj;
        if (hireDate && hireDate.toDate) {
          // Firebase Timestamp
          hireDateObj = hireDate.toDate();
        } else if (typeof hireDate === 'string') {
          // String date
          hireDateObj = new Date(hireDate);
        } else {
          console.log('Invalid hire date format');
          return {
            status: 'FAIL',
            message: 'Invalid hire date format.'
          };
        }

        // Get current date in Philippines timezone
        const currentDate = getPhilippinesDate();
        
        // Calculate days difference
        const daysSinceHire = getDaysDifference(hireDateObj, currentDate);
        
        console.log('Hire Date:', hireDateObj);
        console.log('Current Date (PH):', currentDate);
        console.log('Days Since Hire:', daysSinceHire);

        // Check if more than 30 days
        if (daysSinceHire > 30) {
          console.log('=== TENURE EMPLOYEE VERIFIED (30+ days) ===');
          console.log('Verified by:', employeeData.name);
          console.log('===========================================\n');

          return {
            status: 'OK',
            message: 'N/A'
          };
        } else {
          console.log('Operations employee is not tenure yet (less than 30 days)');
          return {
            status: 'FAIL',
            message: 'User input is not a manager. Will reject the login'
          };
        }
      } else {
        // Not Operations employee (M, F, or other) - grant access
        console.log('=== MANAGER/SUPERVISOR VERIFIED ===');
        console.log('Verified by:', employeeData.name);
        console.log('Role:', roleChar);
        console.log('====================================\n');

        return {
          status: 'OK',
          message: 'N/A'
        };
      }
    } else {
      console.log('Password mismatch');
      return {
        status: 'FAIL',
        message: 'Invalid password.'
      };
    }

  } catch (error) {
    console.error('Manager credentials check error:', error);
    console.error('Error stack:', error.stack);
    return {
      status: 'FAIL',
      message: 'Verification failed. Please try again.'
    };
  }
};