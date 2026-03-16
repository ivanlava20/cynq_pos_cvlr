export const formatCurrency = (amount, currency = 'PHP', locale = 'en-PH') => {
	const numeric = Number(amount);
	const safeValue = Number.isFinite(numeric) ? numeric : 0;

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(safeValue);
};

export default formatCurrency;
