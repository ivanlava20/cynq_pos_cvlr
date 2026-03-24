import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { collectionList, store } from '../config/env';
import { fetchEmployeeStaffing } from '../utils/fetchEmployeeStaffing';

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
		checklistDone: (() => {
			const normalizedDone = String(row.checklistDone ?? '').trim().toUpperCase();
			if (normalizedDone === 'YES') return 'YES';
			if (normalizedDone === 'NO') return 'NO';
			return '';
		})(),
		dateUpdated: String(row.dateUpdated ?? '').trim(),
		branchCode: String(row.branchCode ?? '').trim()
	}));
};

export const fetchChecklistItems = async (checklistCategory, branchCode = store.branchCode) => {
	const normalizedCategory = String(checklistCategory || '').trim().toUpperCase();
	const normalizedBranchCode = String(branchCode || store.branchCode || '').trim();

	if (!normalizedCategory) {
		return {
			checklistType: 'checkBox',
			checklistItems: []
		};
	}

	const checklistType = resolveChecklistType(normalizedCategory);
	const todayPhDate = getCurrentPhilippineDate();

	if (normalizedCategory === 'EMPL') {
		const masterItemsQuery = query(
			collection(firestore, collectionList.checklistItems),
			where('checklistitemCategory', '==', normalizedCategory)
		);

		const [staffingResult, masterItemsSnapshot] = await Promise.all([
			fetchEmployeeStaffing(normalizedBranchCode, todayPhDate),
			getDocs(masterItemsQuery)
		]);

		const staffingRows = Array.isArray(staffingResult?.data) ? staffingResult.data : [];
		const employeeDetails = staffingRows
			.map((row) => ({
				employeeId: String(row.employeeId || '').trim(),
				employee: String(row.employee || '').trim()
			}))
			.filter((row) => row.employeeId)
			.filter((row, index, array) => array.findIndex((candidate) => candidate.employeeId === row.employeeId) === index);

		const masterRows = masterItemsSnapshot.docs.map((docSnap) => docSnap.data() || {});
		const masterByItemId = new Map(
			masterRows.map((row) => {
				const checklistItemId = String(row.checklistItemId ?? row.checklistitemId ?? '').trim();
				const checklistItemDescription = String(
					row.checklistItem ?? row.checklistitem ?? row.checklistItemDescription ?? row.checklistitemDescription ?? ''
				).trim();

				return [checklistItemId, { checklistItemId, checklistItemDescription }];
			})
		);

		const checklistItemsByEmployee = await Promise.all(
			employeeDetails.map(async ({ employeeId }) => {
				const dailyQuery = query(
					collection(firestore, collectionList.checklistDailyEntry),
					where('employeeEvaluated', '==', employeeId),
					where('branchCode', '==', normalizedBranchCode),
					where('checklistitemCategory', '==', normalizedCategory),
					where('dateUpdated', '==', todayPhDate)
				);

				const dailySnapshot = await getDocs(dailyQuery);
				const dailyRows = normalizeChecklistItems(dailySnapshot.docs.map((docSnap) => docSnap.data() || {}));

				const dailyByItemId = new Map();
				dailyRows.forEach((row) => {
					const checklistItemId = String(row.checklistItemId || '').trim();
					if (!checklistItemId) return;
					dailyByItemId.set(checklistItemId, row);
				});

				if (dailyByItemId.size > 0) {
					const mergedRows = Array.from(masterByItemId.values()).map((masterRow) => {
						const daily = dailyByItemId.get(masterRow.checklistItemId);
						return {
							branchCode: normalizedBranchCode,
							checklistDone: String(daily?.checklistDone || '').trim().toUpperCase() === 'YES'
								? 'YES'
								: String(daily?.checklistDone || '').trim().toUpperCase() === 'NO'
								? 'NO'
								: '',
							checklistItemId: masterRow.checklistItemId,
							checklistItemDescription: masterRow.checklistItemDescription,
							checklistitemCategory: normalizedCategory,
							dateUpdated: todayPhDate,
							employeeAdded: String(daily?.employeeAdded || '').trim(),
							employeeEvaluated: employeeId
						};
					});

					const extraDailyRows = dailyRows
						.filter((row) => !masterByItemId.has(String(row.checklistItemId || '').trim()))
						.map((row) => ({
							branchCode: normalizedBranchCode,
							checklistDone: row.checklistDone || '',
							checklistItemId: String(row.checklistItemId || '').trim(),
							checklistItemDescription: row.checklistItemDescription || row.checklistItem || String(row.checklistItemId || '').trim(),
							checklistitemCategory: normalizedCategory,
							dateUpdated: todayPhDate,
							employeeAdded: String(row.employeeAdded || '').trim(),
							employeeEvaluated: employeeId
						}));

					return [...mergedRows, ...extraDailyRows];
				}

				return Array.from(masterByItemId.values()).map((masterRow) => ({
					branchCode: normalizedBranchCode,
					checklistDone: '',
					checklistItemId: masterRow.checklistItemId,
					checklistItemDescription: masterRow.checklistItemDescription,
					checklistitemCategory: normalizedCategory,
					dateUpdated: todayPhDate,
					employeeAdded: '',
					employeeEvaluated: employeeId
				}));
			})
		);

		return {
			checklistType,
			employeeDetails,
			checklistItems: checklistItemsByEmployee.flat()
		};
	}

	const dailyQuery = query(
		collection(firestore, collectionList.checklistDailyEntry),
		where('checklistitemCategory', '==', normalizedCategory),
		where('dateUpdated', '==', todayPhDate),
		where('branchCode', '==', normalizedBranchCode)
	);

	const masterItemsQuery = query(
		collection(firestore, collectionList.checklistItems),
		where('checklistitemCategory', '==', normalizedCategory)
	);

	const [dailySnapshot, masterItemsSnapshot] = await Promise.all([
		getDocs(dailyQuery),
		getDocs(masterItemsQuery)
	]);

	const dailyRows = normalizeChecklistItems(dailySnapshot.docs.map((docSnap) => docSnap.data() || {}));
	const masterRows = masterItemsSnapshot.docs.map((docSnap) => docSnap.data() || {});

	const dailyByItemId = new Map();
	dailyRows.forEach((row) => {
		const itemId = String(row.checklistItemId || '').trim();
		if (!itemId) return;
		dailyByItemId.set(itemId, row);
	});

	const hasAnyDailyEntry = dailyByItemId.size > 0;

	const checklistItems = masterRows.map((row) => {
		const checklistItemId = String(row.checklistItemId ?? row.checklistitemId ?? '').trim();
		const checklistItemDescription = String(
			row.checklistItem ?? row.checklistitem ?? row.checklistItemDescription ?? row.checklistitemDescription ?? ''
		).trim();
		const daily = dailyByItemId.get(checklistItemId);

		const baseItem = {
			checklistitemCategory: normalizedCategory,
			checklistItemId,
			checklistItemDescription,
			checklistItem: checklistItemDescription,
			dateUpdated: String(daily?.dateUpdated || todayPhDate).trim(),
			branchCode: String(daily?.branchCode || normalizedBranchCode || '').trim()
		};

		if (normalizedCategory === 'EQUI' && !hasAnyDailyEntry) {
			return {
				checklistItemId: baseItem.checklistItemId,
				checklistItemDescription: baseItem.checklistItemDescription
			};
		}

		return {
			...baseItem,
			checklistDone: String(daily?.checklistDone || '').trim().toUpperCase() === 'YES'
				? 'YES'
				: String(daily?.checklistDone || '').trim().toUpperCase() === 'NO'
				? 'NO'
				: ''
		};
	});

	dailyRows
		.filter((row) => !checklistItems.some((item) => String(item.checklistItemId || '') === String(row.checklistItemId || '')))
		.forEach((row) => {
			checklistItems.push({
				...row,
				checklistItemDescription: row.checklistItemDescription || row.checklistItem || row.checklistItemId || '-'
			});
		});

	return {
		checklistType,
		checklistItems
	};
};

export default fetchChecklistItems;
