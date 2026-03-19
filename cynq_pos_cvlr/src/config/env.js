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
