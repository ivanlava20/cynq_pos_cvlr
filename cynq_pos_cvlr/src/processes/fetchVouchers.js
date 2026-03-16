import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase.js';

/**
 * Fetch all vouchers from CYNQ_POS_CONSUME_METHODS
 *
 * @returns {Promise<Array<{voucherAmount: number, voucherCd: string, voucherDesc: string, voucherType: string}>>}
 */
export const fetchVouchers = async () => {
	const snapshot = await getDocs(collection(firestore, 'CYNQ_POS_VOUCHER_CODES'));

	return snapshot.docs
		.map((docSnap) => {
			const row = docSnap.data() || {};
			return {
				voucherAmount: Number(row.voucherAmount ?? 0),
				voucherCd: String(row.voucherCd ?? '').trim(),
				voucherDesc: String(row.voucherDesc ?? '').trim(),
				voucherType: String(row.voucherType ?? '').trim()
			};
		})
		.filter((row) => row.voucherCd && row.voucherDesc);
};

export default fetchVouchers;
