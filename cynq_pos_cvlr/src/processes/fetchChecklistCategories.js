import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList } from '../config/env';

const getCurrentPhilippineDate = () => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());

	const month = parts.find((part) => part.type === 'month')?.value || '01';
	const day = parts.find((part) => part.type === 'day')?.value || '01';
	const year = parts.find((part) => part.type === 'year')?.value || '1970';

	return `${year}-${month}-${day}`;
};

/**
 * Fetch all checklist category rows from configured collection.
 *
 * @returns {Promise<Array<Object>>}
 */
export const fetchChecklistCategories = async () => {
	const snapshot = await getDocs(collection(firestore, collectionList.checklistCategories));
	const todayPhDate = getCurrentPhilippineDate();

	const categories = snapshot.docs.map((docSnap) => {
		const row = docSnap.data() || {};
		return {
			checklistitemCategory: String(
				row.checklistitemCategory ?? row.checklistCategory ?? row.checklistItemCategory ?? ''
			).trim(),
			checklistitemDescription: String(
				row.checklistitemDescription ?? row.checklistCategoryDesc ?? row.checklistitemDesc ?? ''
			).trim()
		};
	});

	return Promise.all(
		categories.map(async (entry) => {
			const categoryCode = entry.checklistitemCategory;

			if (!categoryCode) {
				return {
					checklistitemCategory: '',
					checklistitemDescription: entry.checklistitemDescription,
					totalItems: 0,
					itemsDone: 0
				};
			}

			const totalItemsQuery = query(
				collection(firestore, collectionList.checklistItems),
				where('checklistitemCategory', '==', categoryCode)
			);

			const itemsDoneQuery = query(
				collection(firestore, collectionList.checklistDailyEntry),
				where('checklistitemCategory', '==', categoryCode),
				where('dateUpdated', '==', todayPhDate),
				where('checklistDone', '==', 'YES')
			);

			const [totalItemsSnapshot, itemsDoneSnapshot] = await Promise.all([
				getDocs(totalItemsQuery),
				getDocs(itemsDoneQuery)
			]);

			return {
				checklistitemCategory: categoryCode,
				checklistitemDescription: entry.checklistitemDescription,
				totalItems: totalItemsSnapshot.size,
				itemsDone: itemsDoneSnapshot.size
			};
		})
	);
};

export default fetchChecklistCategories;
