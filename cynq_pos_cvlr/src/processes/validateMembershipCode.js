import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Validate membership code from Firestore.
 * @param {string} membershipCode
 * @returns {Promise<{success:boolean, valid:boolean, data?:object, message:string}>}
 */
export const validateMembershipCode = async (membershipCode) => {
  try {
    if (!membershipCode || !String(membershipCode).trim()) {
      return {
        success: false,
        valid: false,
        message: 'Membership code is required.'
      };
    }

    const code = String(membershipCode).trim();

    const membershipQuery = query(
      collection(firestore, 'MEMBERSHIP_INFORMATION'),
      where('membershipId', '==', code)
    );

    const snapshot = await getDocs(membershipQuery);

    if (snapshot.empty) {
      return {
        success: true,
        valid: false,
        message: 'Membership not found.'
      };
    }

    const memberDoc = snapshot.docs[0];
    return {
      success: true,
      valid: true,
      data: { id: memberDoc.id, ...memberDoc.data() },
      message: 'Membership validated successfully.'
    };
  } catch (error) {
    return {
      success: false,
      valid: false,
      message: error.message || 'Failed to validate membership.'
    };
  }
};

export default validateMembershipCode;
