import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all add-ons from CYNQ_POS_ITEM_ADDONS
 *
 * @returns {Promise<Array<{addOnCode: string, addOnDesc: string, addOnPrice: number}>>}
 */
export const fetchAddOns = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_ITEM_ADDONS'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				addOnCode: String(row.addOnCode ?? '').trim(),
				addOnDesc: String(row.addOnDesc ?? '').trim(),
				addOnPrice: Number(row.addOnPrice ?? 0)
			};
		})
		.filter((row) => row.addOnCode && row.addOnDesc);
};

export default fetchAddOns;
