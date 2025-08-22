const express = require('express');
const { requireAuth } = require('./middleware');
const { start: googleStart, callback: googleCallback } = require('./auth');
const { getServersForUser, setServersForUser } = require('./storage');

const router = express.Router();

router.get('/auth/google/start', googleStart);
router.get('/auth/google/callback', googleCallback);

router.get('/servers', requireAuth, (req, res) => {
	const list = getServersForUser(req.user.id);
	res.json({ servers: list });
});

router.put('/servers', requireAuth, (req, res) => {
	const servers = Array.isArray(req.body.servers) ? req.body.servers : [];
	setServersForUser(req.user.id, servers);
	res.json({ ok: true });
});

module.exports = router;