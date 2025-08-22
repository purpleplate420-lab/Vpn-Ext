/* Options page script for SecureVPN */

const STORAGE_KEYS = {
	servers: "servers"
};

function sendMessage(message) {
	return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function getServers() {
	const res = await sendMessage({ type: 'getState' });
	if (!res?.ok) throw new Error(res?.error || 'Failed to load state');
	return res.state.servers || [];
}

async function saveServers(servers) {
	const res = await sendMessage({ type: 'saveServers', servers });
	if (!res?.ok) throw new Error(res?.error || 'Failed to save servers');
}

function renderTable(servers) {
	const tbody = document.querySelector('#serverTable tbody');
	tbody.innerHTML = '';
	for (const s of servers) {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${s.name}</td>
			<td>${s.type.toUpperCase()}</td>
			<td>${s.host}</td>
			<td>${s.port}</td>
			<td><button class="danger" data-id="${s.id}">Delete</button></td>
		`;
		tbody.appendChild(tr);
	}

	tbody.querySelectorAll('button[data-id]').forEach((btn) => {
		btn.addEventListener('click', async (e) => {
			const id = e.currentTarget.getAttribute('data-id');
			const next = servers.filter((s) => s.id !== id);
			await saveServers(next);
			renderTable(next);
		});
	});
}

function generateId(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
}

async function init() {
	let servers = await getServers();
	renderTable(servers);

	document.getElementById('addForm').addEventListener('submit', async (e) => {
		e.preventDefault();
		const name = document.getElementById('name').value.trim();
		const type = document.getElementById('type').value;
		const host = document.getElementById('host').value.trim();
		const port = Number(document.getElementById('port').value);
		if (!name || !host || !port) return;
		const newServer = { id: generateId(name), name, type, host, port };
		servers = [...servers, newServer];
		await saveServers(servers);
		renderTable(servers);
		(e.target).reset();
	});
}

document.addEventListener('DOMContentLoaded', init);