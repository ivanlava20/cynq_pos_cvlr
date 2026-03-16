export const sendEmail = async ({ to, cc, templateId, parameter1, parameter2, parameter3, parameter4 }) => {
	try {
		const response = await fetch('https://cvlr-portal.web.app/api/common/sendEmail', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ to, cc, templateId, parameter1, parameter2, parameter3, parameter4 })
		});

		const result = await response.json();
		const ok = result.status === 'OK' || result.status === 'SUCCESS';

		return {
			success: ok,
			status: result.status || (ok ? 'OK' : 'ERROR'),
			message: result.description || result.message || (ok ? 'Email sent successfully' : 'Email failed')
		};
	} catch (error) {
		return {
			success: false,
			status: 'ERROR',
			message: error.message || 'Failed to send email'
		};
	}
};

export default sendEmail;
