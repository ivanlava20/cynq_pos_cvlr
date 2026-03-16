import { checkStoreStatus } from '../utils/checkStoreStatus';
import { canCloseStore, canOpenStore, updateStoreStatus } from '../utils/updateStoreStatus';

export const loadStoreStatus = async (branchCode, branchName) => {
	return checkStoreStatus(branchCode, branchName);
};

export const openOrCloseStore = async (branchCode, employeeName, storeStatus) => {
	return updateStoreStatus(branchCode, employeeName, storeStatus);
};

export const checkCanOpenStore = async (branchCode) => {
	return canOpenStore(branchCode);
};

export const checkCanCloseStore = async (branchCode) => {
	return canCloseStore(branchCode);
};

export default {
	loadStoreStatus,
	openOrCloseStore,
	checkCanOpenStore,
	checkCanCloseStore
};
