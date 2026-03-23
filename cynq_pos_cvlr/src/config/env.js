export const store = {
  name: process.env.REACT_APP_STORE_NAME,
  branch: process.env.REACT_APP_BRANCH_NAME,
  branchCode: process.env.REACT_APP_BRANCH_CODE
};

export const printer = {
  name: process.env.REACT_APP_PRINTER_NAME || 'VOZY P50',
  mac: process.env.REACT_APP_PRINTER_MAC || '5A:4A:48:1C:87:20'
};

export const firebase = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
};

export const collectionList = {
  branchDetails: 'BRANCH_DETAILS',
  checklistDailyEntry: 'CHECKLIST_DAILY_DATA',
  checklistCategories: 'CYNQ_CHECKLIST_CATEGORIES',
  checklistItems: 'CHECKLIST_ITEMS',
  loyaltyInfo: 'CYNQ_CVLR_LOYALTY_INFO',
  branchLocation: 'CYNQ_POS_BRANCH_LOCATION',
  consumeMethods: 'CYNQ_POS_CONSUME_METHODS',
  discountCodes: 'CYNQ_POS_DISCOUNT_CODES',
  addOns: 'CYNQ_POS_ITEM_ADDONS',
  itemCategory: 'CYNQ_POS_ITEM_CATEGORY',
  menuItems: 'CYNQ_POS_MENU_ITEMS',
  notesTemplates: 'CYNQ_POS_NOTE_TEMPLATES',
  occupancyStatus: 'CYNQ_POS_OCCUPANCY_STATUS',
  orderDetails: 'CYNQ_POS_ORDER_DETAILS',
  orderModes: 'CYNQ_POS_ORDER_MODES',
  orderStatus: 'CYNQ_POS_ORDER_STATUS',
  paymentMethods: 'CYNQ_POS_PAYMENT_METHODS',
  discountInformation: 'CYNQ_POS_PER_DISCOUNT',
  storeManagement: 'CYNQ_POS_STORE_MANAGEMENT',
  voucherInformation: 'CYNQ_POS_VOUCHER_CODES',
  employeeStaffing: 'TIME_IN_OUT',
  employeeInformation: 'EMPLOYEE_INFORMATION',
  expenseItems: 'EXPENSE_ITEM',
  deposits: 'DEPOSITS'
};