const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { findUserByEmail, createUser } = require('./storage');

function getClient() {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
	if (!clientId || !clientSecret) {
		throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
	}
	return new OAuth2Client({
		clientId,
		clientSecret,
		redirectUri: `${baseUrl}/auth/google/callback`
	});
}

function buildState(redirectUri) {
	const data = { redirect_uri: redirectUri };
	return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function parseState(state) {
	try {
		const obj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
		return obj;
	} catch (e) {
		return {};
	}
}

async function start(req, res) {
	const { redirect_uri } = req.query;
	if (!redirect_uri) return res.status(400).send('Missing redirect_uri');
	const client = getClient();
	const url = client.generateAuthUrl({
		access_type: 'offline',
		scope: ['openid', 'email', 'profile'],
		prompt: 'consent',
		state: buildState(redirect_uri)
	});
	return res.redirect(url);
}

async function callback(req, res) {
	const { code, state } = req.query;
	if (!code || !state) return res.status(400).send('Missing code/state');
	const { redirect_uri } = parseState(state);
	if (!redirect_uri) return res.status(400).send('Invalid state');

	try {
		const client = getClient();
		const { tokens } = await client.getToken(code);
		const idToken = tokens.id_token;
		if (!idToken) throw new Error('No id_token from Google');
		const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
		const payload = ticket.getPayload();
		const email = payload.email;
		if (!email) throw new Error('Email not available');

		let user = findUserByEmail(email);
		if (!user) {
			user = createUser({ email, passwordHash: null, passwordSalt: null });
		}
		const jwtToken = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'insecure-dev-secret', { expiresIn: '30d' });
		const finalUrl = `${redirect_uri}#token=${encodeURIComponent(jwtToken)}&email=${encodeURIComponent(user.email)}`;
		return res.redirect(finalUrl);
	} catch (err) {
		return res.status(500).send(String(err.message || err));
	}
}

module.exports = { start, callback };