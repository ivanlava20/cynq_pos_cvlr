export const store = {
  name: process.env.REACT_APP_STORE_NAME,
  branch: process.env.REACT_APP_BRANCH_NAME,
  branchCode: process.env.REACT_APP_BRANCH_CODE
};

export const printer = {
  name: process.env.REACT_APP_PRINTER_NAME || 'BT_PRINTER_MAIN',
  mac: process.env.REACT_APP_PRINTER_MAC || '00:11:22:33:44:55'
};

export const firebase = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
};
