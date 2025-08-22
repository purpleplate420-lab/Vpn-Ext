const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/', routes);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`SecureVPN backend listening on :${PORT}`);
	});
}

module.exports = app;