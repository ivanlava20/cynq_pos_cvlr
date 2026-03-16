const SINGLE_ALLOWED_CATEGORIES = new Set(['TEA', 'HCD', 'NCB', 'CBB', 'COL', 'FOD', 'PST', 'AFC', 'AFF', 'FLL', 'PRC']);
const FOOD_CATEGORIES = new Set(['FOD', 'PST']);
const DRINK_CATEGORIES = new Set(['TEA', 'HCD', 'NCB', 'CBB', 'COL', 'AFC', 'AFF', 'FLL', 'PRC']);

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const getMultiplier = (discountAmount) => toNumber(discountAmount) / 100;

/**
 * Process special discount (SPEC) based on order item categories.
 *
 * Input shape:
 * {
 *   orderItems: [...],
 *   discountDetails: {
 *     discountAmount,
 *     discountCd,
 *     discountDesc,
 *     discountType
 *   }
 * }
 *
 * @returns {number} computed discount amount
 */
export const processSpecialDiscount = ({ orderItems = [], discountDetails = {} } = {}) => {
	if (!Array.isArray(orderItems) || !orderItems.length) return 0;
	if (String(discountDetails?.discountType ?? '').trim() !== 'SPEC') return 0;

	const multiplier = getMultiplier(discountDetails.discountAmount);
	if (multiplier <= 0) return 0;

	if (orderItems.length === 1) {
		const item = orderItems[0] || {};
		const category = String(item.itemCategory ?? '').trim();
		if (!SINGLE_ALLOWED_CATEGORIES.has(category)) return 0;
		return multiplier * toNumber(item.itemTotalAmount);
	}

	const foodGroup = orderItems.filter((item) => FOOD_CATEGORIES.has(String(item?.itemCategory ?? '').trim()));
	const drinksGroup = orderItems.filter((item) => DRINK_CATEGORIES.has(String(item?.itemCategory ?? '').trim()));

	const highestFoodAmount = foodGroup.reduce((max, item) => Math.max(max, toNumber(item?.itemTotalAmount)), 0);
	const highestDrinkAmount = drinksGroup.reduce((max, item) => Math.max(max, toNumber(item?.itemTotalAmount)), 0);

	const foodDiscount = multiplier * highestFoodAmount;
	const drinkDiscount = multiplier * highestDrinkAmount;

	return foodDiscount + drinkDiscount;
};

export default processSpecialDiscount;
