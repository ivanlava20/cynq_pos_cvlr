export const DEFAULT_DISCOUNTS = [
	{ discountAmount: '20', discountCd: 'P20', discountDesc: '20%', discountType: 'PERC' }
];

export const DEFAULT_VOUCHERS = [
	{ voucherAmount: '50', voucherCd: 'V50', voucherDesc: '50 PESOS DISCOUNT', voucherType: 'CASH' },
	{ voucherAmount: '10', voucherCd: 'CVLRPRMOO', voucherDesc: 'CAFE VANLEROE PROMO CODE', voucherType: 'PERC' }
];

export const DEFAULT_ORDER_MODES = [
	{ orderModeCode: 'GB', orderModeDesc: 'Grab' },
	{ orderModeCode: 'OS', orderModeDesc: 'On-Site' },
	{ orderModeCode: 'FP', orderModeDesc: 'Foodpanda' },
	{ orderModeCode: 'KI', orderModeDesc: 'Kiosk' },
	{ orderModeCode: 'FD', orderModeDesc: 'Free Drink' },
	{ orderModeCode: 'FB', orderModeDesc: 'Facebook' }
];

export const DEFAULT_MENU_CATEGORIES = [
	{ itemCategoryCode: 'TEA', itemCategoryDesc: 'Tea', hasSize: 'Y' },
	{ itemCategoryCode: 'HCD', itemCategoryDesc: 'Hot and Cold Drinks', hasSize: 'Y' },
	{ itemCategoryCode: 'NCB', itemCategoryDesc: 'Non-Coffee Based Blended Beverage', hasSize: 'Y' },
	{ itemCategoryCode: 'CBB', itemCategoryDesc: 'Coffee Based Blended Beverage', hasSize: 'Y' },
	{ itemCategoryCode: 'COL', itemCategoryDesc: 'Coolers', hasSize: 'Y' },
	{ itemCategoryCode: 'FOD', itemCategoryDesc: 'Food', hasSize: 'N' },
	{ itemCategoryCode: 'PST', itemCategoryDesc: 'Pastries', hasSize: 'N' }
];

export const DEFAULT_CONSUME_METHODS = [
	{ consumeMethodCode: 'DINE', consumeMethodDesc: 'Dine In' },
	{ consumeMethodCode: 'TAKE', consumeMethodDesc: 'Take Out' },
	{ consumeMethodCode: 'DELI', consumeMethodDesc: 'Delivery' },
	{ consumeMethodCode: 'ONLN', consumeMethodDesc: 'Online Delivery Apps' },
	{ consumeMethodCode: 'PICK', consumeMethodDesc: 'Pick-Up' }
];

export const DEFAULT_ADD_ONS = [
	{ addOnCode: 'OAT', addOnDesc: 'Oat Milk', addOnPrice: 15 },
	{ addOnCode: 'COC', addOnDesc: 'Coco Powder', addOnPrice: 50 },
	{ addOnCode: 'VAN', addOnDesc: 'Vanilla', addOnPrice: 20 },
	{ addOnCode: 'SUG', addOnDesc: 'Sugar', addOnPrice: 35 }
];

export const DEFAULT_EMPLOYEES = [
	{ employeeId: 'EMPM001', employeeName: 'Ivan Lava' },
	{ employeeId: 'EMPM002', employeeName: 'Maria Clara' },
	{ employeeId: 'EMPO001', employeeName: 'John Doe' }
];

export const DEFAULT_NOTES = [
	{ noteId: 1, noteDesc: 'No Sugar' },
	{ noteId: 2, noteDesc: 'Less Sugar' },
	{ noteId: 3, noteDesc: 'No Ice' },
	{ noteId: 4, noteDesc: 'Less Ice' },
	{ noteId: 5, noteDesc: 'Hot' },
	{ noteId: 6, noteDesc: 'Cold' }
];

export default {
	DEFAULT_DISCOUNTS,
	DEFAULT_VOUCHERS,
	DEFAULT_ORDER_MODES,
	DEFAULT_MENU_CATEGORIES,
	DEFAULT_CONSUME_METHODS,
	DEFAULT_ADD_ONS,
	DEFAULT_EMPLOYEES,
	DEFAULT_NOTES
};
