import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const isStringOrNumberZero = (value) => value === 0 || value === '0';

/**
 * Fetch all menu items from CYNQ_POS_MENU_ITEMS.
 *
 * Output shape per item:
 * {
 *   productName,
 *   categoryCode,
 *   productId,
 *   sizes,
 *   fpSizes,
 *   grabSizes
 * }
 */
export const fetchMenuItems = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_MENU_ITEMS'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};

			const productName = String(row.productName ?? '').trim();
			const categoryCode = String(row.categoryCode ?? '').trim();
			const productId = String(row.productId ?? docSnap.id ?? '').trim();

			const amountSmall = toNumber(row.amountSmall);
			const amountMedium = toNumber(row.amountMedium);
			const amountLarge = toNumber(row.amountLarge);

			const fpAmountSmall = toNumber(row.fpAmountSmall);
			const fpAmountMedium = toNumber(row.fpAmountMedium);
			const fpAmountLarge = toNumber(row.fpAmountLarge);

			const grabAmountSmall = toNumber(row.grabAmountSmall);
			const grabAmountMedium = toNumber(row.grabAmountMedium);
			const grabAmountLarge = toNumber(row.grabAmountLarge);

			const allSizeAmountsAreZero =
				isStringOrNumberZero(row.amountSmall) &&
				isStringOrNumberZero(row.amountMedium) &&
				isStringOrNumberZero(row.amountLarge) &&
				isStringOrNumberZero(row.fpAmountSmall) &&
				isStringOrNumberZero(row.fpAmountMedium) &&
				isStringOrNumberZero(row.fpAmountLarge) &&
				isStringOrNumberZero(row.grabAmountSmall) &&
				isStringOrNumberZero(row.grabAmountMedium) &&
				isStringOrNumberZero(row.grabAmountLarge);

			if (!productName || !categoryCode || !productId) return null;

			if (allSizeAmountsAreZero) {
				return {
					productName,
					categoryCode,
					productId,
					sizes: [{ size: 'STD', price: toNumber(row.itemAmount) }],
					fpSizes: [{ size: 'STD', price: toNumber(row.itemAmountFp) }],
					grabSizes: [{ size: 'STD', price: toNumber(row.itemAmountGrab) }]
				};
			}

			return {
				productName,
				categoryCode,
				productId,
				sizes: [
					{ size: 'S', price: amountSmall },
					{ size: 'M', price: amountMedium },
					{ size: 'L', price: amountLarge }
				],
				fpSizes: [
					{ size: 'S', price: fpAmountSmall },
					{ size: 'M', price: fpAmountMedium },
					{ size: 'L', price: fpAmountLarge }
				],
				grabSizes: [
					{ size: 'S', price: grabAmountSmall },
					{ size: 'M', price: grabAmountMedium },
					{ size: 'L', price: grabAmountLarge }
				]
			};
		})
		.filter(Boolean)
		.sort((a, b) => a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' }));
};

export default fetchMenuItems;
