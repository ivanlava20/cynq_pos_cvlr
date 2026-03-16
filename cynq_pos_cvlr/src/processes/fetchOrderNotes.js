import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all order note templates from CYNQ_POS_NOTE_TEMPLATES
 *
 * @returns {Promise<Array<{noteId: string, noteDesc: string}>>}
 */
export const fetchOrderNotes = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_NOTE_TEMPLATES'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				noteId: String(row.noteId ?? '').trim(),
				noteDesc: String(row.noteDesc ?? '').trim()
			};
		})
		.filter((row) => row.noteId && row.noteDesc);
};

export default fetchOrderNotes;
