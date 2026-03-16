import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all order modes from CYNQ_POS_ORDER_MODES
 *
 * @returns {Promise<Array<{orderModeCode: string, orderModeDesc: string}>>}
 */
export const fetchOrderMode = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_ORDER_MODES'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				orderModeCode: String(row.orderModeCode ?? '').trim(),
				orderModeDesc: String(row.orderModeDesc ?? '').trim()
			};
		})
		.filter((row) => row.orderModeCode && row.orderModeDesc);
};

export default fetchOrderMode;
