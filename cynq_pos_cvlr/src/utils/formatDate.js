export const formatDate = (value, options = {}) => {
	if (!value) return '';

	const date = value?.toDate ? value.toDate() : new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const formatter = new Intl.DateTimeFormat('en-PH', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		...options
	});

	return formatter.format(date);
};

export const formatDateTime = (value, options = {}) => {
	return formatDate(value, {
		hour: '2-digit',
		minute: '2-digit',
		...options
	});
};

export default formatDate;
