import {
	getCurrentEmployee,
	isAuthenticated,
	processLogin,
	processLogout,
	verifyManagerAccess
} from '../utils/loginProcessing';

export const login = async (employeeId) => processLogin(employeeId);

export const verifyManager = async (managerEmployeeId, portalPassword) => {
	return verifyManagerAccess(managerEmployeeId, portalPassword);
};

export const logout = async () => processLogout();

export const getSessionEmployee = async () => getCurrentEmployee();

export const checkAuthenticated = async () => isAuthenticated();

export default {
	login,
	verifyManager,
	logout,
	getSessionEmployee,
	checkAuthenticated
};
