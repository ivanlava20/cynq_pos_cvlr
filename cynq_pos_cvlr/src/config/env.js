const normalizeEnvValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const hasSingleQuotes = raw.startsWith("'") && raw.endsWith("'");
  const hasDoubleQuotes = raw.startsWith('"') && raw.endsWith('"');
  if (hasSingleQuotes || hasDoubleQuotes) {
    return raw.slice(1, -1).trim();
  }

  return raw;
};

const envValues = {
  EXPO_PUBLIC_STORE_NAME: normalizeEnvValue(process.env.EXPO_PUBLIC_STORE_NAME),
  EXPO_PUBLIC_BRANCH_NAME: normalizeEnvValue(process.env.EXPO_PUBLIC_BRANCH_NAME),
  EXPO_PUBLIC_BRANCH_CODE: normalizeEnvValue(process.env.EXPO_PUBLIC_BRANCH_CODE),
  EXPO_PUBLIC_PRINTER_NAME: normalizeEnvValue(process.env.EXPO_PUBLIC_PRINTER_NAME),
  EXPO_PUBLIC_PRINTER_MAC: normalizeEnvValue(process.env.EXPO_PUBLIC_PRINTER_MAC),
  REACT_APP_STORE_NAME: normalizeEnvValue(process.env.REACT_APP_STORE_NAME),
  REACT_APP_BRANCH_NAME: normalizeEnvValue(process.env.REACT_APP_BRANCH_NAME),
  REACT_APP_BRANCH_CODE: normalizeEnvValue(process.env.REACT_APP_BRANCH_CODE),
  REACT_APP_PRINTER_NAME: normalizeEnvValue(process.env.REACT_APP_PRINTER_NAME),
  REACT_APP_PRINTER_MAC: normalizeEnvValue(process.env.REACT_APP_PRINTER_MAC)
};

const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = envValues[key] || '';
    if (value) return value;
  }
  return '';
};

export const store = {
  name: getEnvValue('EXPO_PUBLIC_STORE_NAME', 'REACT_APP_STORE_NAME'),
  branch: getEnvValue('EXPO_PUBLIC_BRANCH_NAME', 'REACT_APP_BRANCH_NAME'),
  branchCode: getEnvValue('EXPO_PUBLIC_BRANCH_CODE', 'REACT_APP_BRANCH_CODE')
};

export const printer = {
  name: getEnvValue('EXPO_PUBLIC_PRINTER_NAME', 'REACT_APP_PRINTER_NAME') || 'VOZY P50',
  mac: getEnvValue('EXPO_PUBLIC_PRINTER_MAC', 'REACT_APP_PRINTER_MAC') || '5A:4A:48:1C:87:20'
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