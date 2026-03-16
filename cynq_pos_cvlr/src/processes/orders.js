import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import {
	DEFAULT_ADD_ONS,
	DEFAULT_CONSUME_METHODS,
	DEFAULT_DISCOUNTS,
	DEFAULT_MENU_CATEGORIES,
	DEFAULT_NOTES,
	DEFAULT_ORDER_MODES,
	DEFAULT_VOUCHERS
} from '../utils/constants';

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSizes = (value) => {
	if (!Array.isArray(value)) return [];

	return value
		.map((row) => {
			if (!row || typeof row !== 'object') return null;
			const size = String(row.size || row.sizeCode || row.itemSize || '').trim();
			const price = toNumber(row.price ?? row.itemPrice ?? row.amount);

			if (!size) return null;

			return { size, price };
		})
		.filter(Boolean);
};

const normalizeMenuItem = (data, fallbackId) => {
	if (!data || typeof data !== 'object') return null;

	const productName = String(data.productName || data.itemName || data.menuItemName || '').trim();
	const categoryCode = String(data.categoryCode || data.itemCategory || data.itemCategoryCode || '').trim();
	const productId = String(data.productId || data.itemId || data.menuItemId || fallbackId || '').trim();
	const image = data.image || data.imageUrl || '/path-to-image.jpg';

	let sizes = normalizeSizes(data.sizes);
	let fpSizes = normalizeSizes(data.fpSizes || data.foodpandaSizes);
	let grabSizes = normalizeSizes(data.grabSizes);

	if (!sizes.length) {
		const generatedSizes = [];
		if (data.smallPrice != null) generatedSizes.push({ size: 'S', price: toNumber(data.smallPrice) });
		if (data.mediumPrice != null) generatedSizes.push({ size: 'M', price: toNumber(data.mediumPrice) });
		if (data.largePrice != null) generatedSizes.push({ size: 'L', price: toNumber(data.largePrice) });
		if (data.price != null) generatedSizes.push({ size: 'STD', price: toNumber(data.price) });
		sizes = generatedSizes;
	}

	if (!productName || !categoryCode || !productId || !sizes.length) {
		return null;
	}

	if (!fpSizes.length && Array.isArray(data.fpPriceBySize)) {
		fpSizes = normalizeSizes(data.fpPriceBySize);
	}

	if (!grabSizes.length && Array.isArray(data.grabPriceBySize)) {
		grabSizes = normalizeSizes(data.grabPriceBySize);
	}

	return {
		productName,
		categoryCode,
		productId,
		image,
		sizes,
		...(fpSizes.length ? { fpSizes } : {}),
		...(grabSizes.length ? { grabSizes } : {})
	};
};

export const loadMenuItemsList = async (branchCode) => {
	try {
		const collectionCandidates = ['CYNQ_POS_MENU_ITEMS', 'MENU_ITEMS', 'CYNQ_POS_ITEMS'];

		for (const collectionName of collectionCandidates) {
			try {
				const snapshot = await getDocs(collection(firestore, collectionName));
				if (snapshot.empty) continue;

				const mapped = snapshot.docs
					.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
					.filter((row) => {
						const active = String(row.itemStatus || row.status || 'ACTIVE').toUpperCase();
						if (active !== 'ACTIVE') return false;

						if (!branchCode) return true;
						const itemBranch = String(row.branchCode || 'ALL').toUpperCase();
						return itemBranch === 'ALL' || itemBranch === String(branchCode).toUpperCase();
					})
					.map((row) => normalizeMenuItem(row, row.id))
					.filter(Boolean)
					.sort((a, b) => a.productName.localeCompare(b.productName));

				if (mapped.length) {
					return {
						success: true,
						data: mapped,
						source: collectionName,
						message: 'Menu items loaded successfully.'
					};
				}
			} catch (error) {
				// Try next collection candidate
			}
		}

		return {
			success: false,
			data: [],
			message: 'No menu items found in configured menu collections.'
		};
	} catch (error) {
		return {
			success: false,
			data: [],
			message: error.message || 'Failed to load menu items.'
		};
	}
};

const loadFromCandidates = async (candidates) => {
	for (const collectionName of candidates) {
		try {
			const snapshot = await getDocs(collection(firestore, collectionName));
			if (!snapshot.empty) {
				return {
					success: true,
					data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
					source: collectionName
				};
			}
		} catch (error) {
			// continue
		}
	}

	return {
		success: false,
		data: [],
		source: null
	};
};

export const loadDiscountsList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_DISCOUNTS', 'DISCOUNTS']);
	if (!result.success) return { success: true, data: DEFAULT_DISCOUNTS, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			discountAmount: String(row.discountAmount ?? row.amount ?? ''),
			discountCd: String(row.discountCd ?? row.discountCode ?? row.code ?? '').trim(),
			discountDesc: String(row.discountDesc ?? row.discountDescription ?? row.description ?? '').trim(),
			discountType: String(row.discountType ?? row.type ?? 'PERC').toUpperCase()
		}))
		.filter((row) => row.discountCd && row.discountAmount);

	return { success: true, data: mapped.length ? mapped : DEFAULT_DISCOUNTS, source: result.source };
};

export const loadVouchersList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_VOUCHERS', 'VOUCHERS']);
	if (!result.success) return { success: true, data: DEFAULT_VOUCHERS, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			voucherAmount: String(row.voucherAmount ?? row.amount ?? ''),
			voucherCd: String(row.voucherCd ?? row.voucherCode ?? row.code ?? '').trim(),
			voucherDesc: String(row.voucherDesc ?? row.voucherDescription ?? row.description ?? '').trim(),
			voucherType: String(row.voucherType ?? row.type ?? 'CASH').toUpperCase()
		}))
		.filter((row) => row.voucherCd && row.voucherAmount);

	return { success: true, data: mapped.length ? mapped : DEFAULT_VOUCHERS, source: result.source };
};

export const loadOrderModesList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_ORDER_MODES', 'ORDER_MODES']);
	if (!result.success) return { success: true, data: DEFAULT_ORDER_MODES, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			orderModeCode: String(row.orderModeCode ?? row.modeCode ?? row.code ?? '').trim(),
			orderModeDesc: String(row.orderModeDesc ?? row.modeDesc ?? row.description ?? '').trim()
		}))
		.filter((row) => row.orderModeCode && row.orderModeDesc);

	return { success: true, data: mapped.length ? mapped : DEFAULT_ORDER_MODES, source: result.source };
};

export const loadMenuCategories = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_MENU_CATEGORIES', 'MENU_CATEGORIES']);
	if (!result.success) return { success: true, data: DEFAULT_MENU_CATEGORIES, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			itemCategoryCode: String(row.itemCategoryCode ?? row.categoryCode ?? row.code ?? '').trim(),
			itemCategoryDesc: String(row.itemCategoryDesc ?? row.categoryDesc ?? row.description ?? '').trim(),
			hasSize: String(row.hasSize ?? 'Y').toUpperCase() === 'N' ? 'N' : 'Y'
		}))
		.filter((row) => row.itemCategoryCode && row.itemCategoryDesc);

	return { success: true, data: mapped.length ? mapped : DEFAULT_MENU_CATEGORIES, source: result.source };
};

export const loadConsumeMethodsList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_CONSUME_METHODS', 'CONSUME_METHODS']);
	if (!result.success) return { success: true, data: DEFAULT_CONSUME_METHODS, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			consumeMethodCode: String(row.consumeMethodCode ?? row.methodCode ?? row.code ?? '').trim(),
			consumeMethodDesc: String(row.consumeMethodDesc ?? row.methodDesc ?? row.description ?? '').trim()
		}))
		.filter((row) => row.consumeMethodCode && row.consumeMethodDesc);

	return { success: true, data: mapped.length ? mapped : DEFAULT_CONSUME_METHODS, source: result.source };
};

export const loadAddOnsList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_ADD_ONS', 'ADD_ONS']);
	if (!result.success) return { success: true, data: DEFAULT_ADD_ONS, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row) => ({
			addOnCode: String(row.addOnCode ?? row.code ?? '').trim(),
			addOnDesc: String(row.addOnDesc ?? row.description ?? '').trim(),
			addOnPrice: toNumber(row.addOnPrice ?? row.price ?? 0)
		}))
		.filter((row) => row.addOnCode && row.addOnDesc);

	return { success: true, data: mapped.length ? mapped : DEFAULT_ADD_ONS, source: result.source };
};

export const loadNotesList = async () => {
	const result = await loadFromCandidates(['CYNQ_POS_ORDER_NOTES', 'ORDER_NOTES']);
	if (!result.success) return { success: true, data: DEFAULT_NOTES, source: 'DEFAULTS' };

	const mapped = result.data
		.map((row, index) => ({
			noteId: Number(row.noteId ?? row.id ?? index + 1),
			noteDesc: String(row.noteDesc ?? row.description ?? '').trim()
		}))
		.filter((row) => row.noteDesc);

	return { success: true, data: mapped.length ? mapped : DEFAULT_NOTES, source: result.source };
};

export const loadHomePageReferences = async (branchCode) => {
	const [
		discountsResult,
		vouchersResult,
		orderModesResult,
		menuCategoriesResult,
		consumeMethodsResult,
		addOnsResult,
		notesResult,
		menuItemsResult
	] = await Promise.all([
		loadDiscountsList(),
		loadVouchersList(),
		loadOrderModesList(),
		loadMenuCategories(),
		loadConsumeMethodsList(),
		loadAddOnsList(),
		loadNotesList(),
		loadMenuItemsList(branchCode)
	]);

	return {
		success: true,
		data: {
			discountsList: discountsResult.data,
			vouchersList: vouchersResult.data,
			orderModesList: orderModesResult.data,
			menuCategories: menuCategoriesResult.data,
			consumeMethodsList: consumeMethodsResult.data,
			addOnsList: addOnsResult.data,
			notesList: notesResult.data,
			menuItemsList: menuItemsResult.success && menuItemsResult.data.length ? menuItemsResult.data : []
		}
	};
};

export default {
	loadMenuItemsList,
	loadDiscountsList,
	loadVouchersList,
	loadOrderModesList,
	loadMenuCategories,
	loadConsumeMethodsList,
	loadAddOnsList,
	loadNotesList,
	loadHomePageReferences
};
