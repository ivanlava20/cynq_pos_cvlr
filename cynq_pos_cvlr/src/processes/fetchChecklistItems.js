import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList, store } from '../config/env';

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

const resolveChecklistType = (checklistCategory) => {
	const category = String(checklistCategory || '').trim().toUpperCase();

	if (category === 'CAFE' || category === 'CLEA') return 'checkBox';
	if (category === 'EQUI') return 'radio';
	if (category === 'EMPL') return 'special';

	return 'checkBox';
};

const normalizeChecklistItems = (rows = []) => {
	return rows.map((row) => ({
		checklistitemCategory: String(row.checklistitemCategory ?? row.checklistCategory ?? '').trim(),
		checklistItemId: String(row.checklistItemId ?? row.checklistitemId ?? '').trim(),
		checklistItemDescription: String(
			row.checklistItemDescription ?? row.checklistitemDescription ?? row.checklistItem ?? row.checklistitem ?? ''
		).trim(),
		checklistItem: String(row.checklistItem ?? row.checklistitem ?? '').trim(),
		checklistDone: String(row.checklistDone ?? '').trim().toUpperCase() === 'YES' ? 'YES' : 'NO',
		dateUpdated: String(row.dateUpdated ?? '').trim(),
		branchCode: String(row.branchCode ?? '').trim()
	}));
};

export const fetchChecklistItems = async (checklistCategory, branchCode = store.branchCode) => {
	const normalizedCategory = String(checklistCategory || '').trim().toUpperCase();

	if (!normalizedCategory) {
		return {
			checklistType: 'checkBox',
			checklistItems: []
		};
	}

	const checklistType = resolveChecklistType(normalizedCategory);
	const todayPhDate = getCurrentPhilippineDate();

	const dailyQuery = query(
		collection(firestore, collectionList.checklistDailyEntry),
		where('checklistitemCategory', '==', normalizedCategory),
		where('dateUpdated', '==', todayPhDate),
		where('branchCode', '==', String(branchCode || '').trim())
	);

	const dailySnapshot = await getDocs(dailyQuery);

	if (!dailySnapshot.empty) {
		const checklistItems = normalizeChecklistItems(dailySnapshot.docs.map((docSnap) => docSnap.data() || {}));

		return {
			checklistType,
			checklistItems
		};
	}

	const masterItemsQuery = query(
		collection(firestore, collectionList.checklistItems),
		where('checklistitemCategory', '==', normalizedCategory)
	);

	const masterItemsSnapshot = await getDocs(masterItemsQuery);
	const checklistItems = normalizeChecklistItems(masterItemsSnapshot.docs.map((docSnap) => docSnap.data() || {}));

	return {
		checklistType,
		checklistItems
	};
};

export default fetchChecklistItems;
