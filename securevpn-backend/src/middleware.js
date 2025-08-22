const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
	const header = req.headers['authorization'] || '';
	const [scheme, token] = header.split(' ');
	if (scheme !== 'Bearer' || !token) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'insecure-dev-secret');
		req.user = { id: payload.sub, email: payload.email };
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = { requireAuth };