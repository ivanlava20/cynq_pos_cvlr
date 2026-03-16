import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all discounts from CYNQ_POS_CONSUME_METHODS
 *
 * @returns {Promise<Array<{discountAmount: number, discountCd: string, discountDesc: string, discountType: string}>>}
 */
export const fetchDiscounts = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_PER_DISCOUNT'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				discountAmount: Number(row.discountAmount ?? 0),
				discountCd: String(row.discountCd ?? '').trim(),
				discountDesc: String(row.discountDesc ?? '').trim(),
				discountType: String(row.discountType ?? '').trim()
			};
		})
		.filter((row) => row.discountCd && row.discountDesc);
};

export default fetchDiscounts;
