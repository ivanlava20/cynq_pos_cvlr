import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all menu categories from CYNQ_POS_ITEM_CATEGORY
 *
 * @returns {Promise<Array<{itemCategoryCode: string, itemCategoryDesc: string, hasSize: string}>>}
 */
export const fetchMenuCategory = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_ITEM_CATEGORY'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				itemCategoryCode: String(row.itemCategoryCode ?? '').trim(),
				itemCategoryDesc: String(row.itemCategoryDesc ?? '').trim(),
				hasSize: String(row.hasSize ?? '').trim()
			};
		})
		.filter((row) => row.itemCategoryCode && row.itemCategoryDesc)
		.sort((a, b) =>
			a.itemCategoryDesc.localeCompare(b.itemCategoryDesc, undefined, { sensitivity: 'base' })
		);
};

export default fetchMenuCategory;
