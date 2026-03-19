import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch order(s) per customer context using exact identifiers.
 *
 * @param {string} branchCode
 * @param {string} orderDate
 * @param {string} orderNo
 * @returns {Promise<Array<Object>>}
 */
export const fetchOrderPerCustomer = async (branchCode, orderDate, orderNo) => {
	const snapshot = await getDocs(
		query(
			collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
			where('branchCode', '==', String(branchCode ?? '').trim()),
			where('orderDate', '==', String(orderDate ?? '').trim()),
			where('orderNo', '==', String(orderNo ?? '').trim())
		)
	);

	return snapshot.docs.map((docSnap) => ({
		id: docSnap.id,
		...docSnap.data()
	}));
};

export default fetchOrderPerCustomer;
