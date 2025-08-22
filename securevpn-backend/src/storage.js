const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');
const serversPath = path.join(dataDir, 'servers.json');

function ensureDataFiles() {
	if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
	if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, JSON.stringify({ users: [] }, null, 2));
	if (!fs.existsSync(serversPath)) fs.writeFileSync(serversPath, JSON.stringify({ byUserId: {} }, null, 2));
}

function readJson(filePath) {
	ensureDataFiles();
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
	ensureDataFiles();
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function findUserByEmail(email) {
	const db = readJson(usersPath);
	return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function createUser({ email, passwordHash, passwordSalt }) {
	const db = readJson(usersPath);
	if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
		throw new Error('User already exists');
	}
	const user = { id: uuidv4(), email, passwordHash, passwordSalt, createdAt: new Date().toISOString() };
	db.users.push(user);
	writeJson(usersPath, db);
	return user;
}

function getUserById(userId) {
	const db = readJson(usersPath);
	return db.users.find(u => u.id === userId) || null;
}

function getServersForUser(userId) {
	const db = readJson(serversPath);
	return db.byUserId[userId] || [];
}

function setServersForUser(userId, servers) {
	const db = readJson(serversPath);
	db.byUserId[userId] = servers;
	writeJson(serversPath, db);
	return servers;
}

module.exports = {
	findUserByEmail,
	createUser,
	getUserById,
	getServersForUser,
	setServersForUser,
};