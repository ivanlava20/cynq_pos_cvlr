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
	const normalizedBranchCode = String(branchCode ?? '').trim();
	const normalizedOrderDate = String(orderDate ?? '').trim();
	const normalizedOrderNo = String(orderNo ?? '').trim();

	const snapshot = await getDocs(
		query(
			collection(firestore, 'CYNQ_POS_ORDER_DETAILS'),
			where('branchCode', '==', normalizedBranchCode),
			where('orderDate', '==', normalizedOrderDate)
		)
	);

	return snapshot.docs
		.map((docSnap) => ({
			id: docSnap.id,
			...docSnap.data()
		}))
		.filter((row) => {
			const resolvedOrderNo = String(row?.orderDetails?.orderNo ?? row?.orderNo ?? '').trim();
			return resolvedOrderNo === normalizedOrderNo;
		});
};

export default fetchOrderPerCustomer;
