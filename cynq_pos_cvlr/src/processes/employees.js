import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { DEFAULT_EMPLOYEES } from '../utils/constants';

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

export const loadEmployeeList = async (branchCode) => {
	try {
		const employeeRef = collection(firestore, 'EMPLOYEE_INFORMATION');
		const snapshot = await getDocs(query(employeeRef, where('employmentStatus', '==', 'ACTIVE')));

		const rows = snapshot.docs
			.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
			.filter((row) => {
				const status = normalizeStatus(row.employmentStatus);
				if (!(status === 'ACTIVE' || status === 'A' || status === 'ACT')) return false;

				if (!branchCode) return true;
				const employeeBranch = String(row.branchCode || row.assignedBranch || 'ALL').toUpperCase();
				return employeeBranch === 'ALL' || employeeBranch === String(branchCode).toUpperCase();
			})
			.map((row) => ({
				employeeId: String(row.employeeId || row.employeeID || row.id || '').trim(),
				employeeName: String(row.name || `${row.firstName || ''} ${row.lastName || ''}` || '').trim()
			}))
			.filter((row) => row.employeeId && row.employeeName)
			.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

		return {
			success: true,
			data: rows.length ? rows : DEFAULT_EMPLOYEES,
			message: 'Employee list loaded successfully.'
		};
	} catch (error) {
		return {
			success: false,
			data: DEFAULT_EMPLOYEES,
			message: error.message || 'Failed to load employee list.'
		};
	}
};

export default {
	loadEmployeeList
};
