import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all consume methods from CYNQ_POS_CONSUME_METHODS
 *
 * @returns {Promise<Array<{consumeMethodCode: string, consumeMethodDesc: string}>>}
 */
export const fetchConsumeMethods = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_CONSUME_METHODS'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				consumeMethodCode: String(row.consumeMethodCode ?? '').trim(),
				consumeMethodDesc: String(row.consumeMethodDesc ?? '').trim()
			};
		})
		.filter((row) => row.consumeMethodCode && row.consumeMethodDesc);
};

export default fetchConsumeMethods;
