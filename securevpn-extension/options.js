/* Options page script for SecureVPN */

const STORAGE_KEYS = {
	servers: "servers",
	selectedServerId: "selectedServerId",
	isConnected: "isConnected"
};

function sendMessage(message) {
	return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function getState() {
	const res = await sendMessage({ type: 'getState' });
	if (!res?.ok) throw new Error(res?.error || 'Failed to load state');
	return res.state;
}

async function getServers() {
	const state = await getState();
	return state.servers || [];
}

async function saveServers(servers) {
	const res = await sendMessage({ type: 'saveServers', servers });
	if (!res?.ok) throw new Error(res?.error || 'Failed to save servers');
	return res;
}

function showMsg(text, kind = 'success') {
	const el = document.getElementById('msg');
	el.textContent = text;
	el.className = `msg ${kind}`;
}

function clearMsg() {
	const el = document.getElementById('msg');
	el.textContent = '';
	el.className = 'msg';
}

function renderTable(servers, state) {
	const tbody = document.querySelector('#serverTable tbody');
	tbody.innerHTML = '';
	for (const s of servers) {
		const tr = document.createElement('tr');
		const disabled = state.isConnected && s.id === state.selectedServerId;
		tr.innerHTML = `
			<td>${s.name}</td>
			<td>${s.type.toUpperCase()}</td>
			<td>${s.host}</td>
			<td>${s.port}</td>
			<td><button class="danger" data-id="${s.id}" ${disabled ? 'disabled' : ''}>Delete</button></td>
		`;
		tbody.appendChild(tr);
	}

	tbody.querySelectorAll('button[data-id]').forEach((btn) => {
		btn.addEventListener('click', async (e) => {
			const id = e.currentTarget.getAttribute('data-id');
			const next = servers.filter((s) => s.id !== id);
			try {
				await saveServers(next);
				const newState = await getState();
				renderTable(next, newState);
				showMsg('Server deleted', 'success');
			} catch (err) {
				showMsg(String(err?.message || err), 'error');
			}
		});
	});
}

function generateId(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
}

function isValidHost(host) {
	// Simple validation: hostname or IPv4
	return /^(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/.test(host) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
}

async function init() {
	let state = await getState();
	let servers = state.servers || [];
	renderTable(servers, state);

	document.getElementById('addForm').addEventListener('submit', async (e) => {
		e.preventDefault();
		clearMsg();
		const name = document.getElementById('name').value.trim();
		const type = document.getElementById('type').value;
		const host = document.getElementById('host').value.trim();
		const portValue = document.getElementById('port').value;
		const port = Number(portValue);

		if (!name || !host || !portValue) {
			showMsg('All fields are required.', 'error');
			return;
		}
		if (!isValidHost(host)) {
			showMsg('Enter a valid host (domain or IPv4).', 'error');
			return;
		}
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			showMsg('Enter a valid port (1-65535).', 'error');
			return;
		}
		if (servers.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
			showMsg('A server with that name already exists.', 'error');
			return;
		}
		if (servers.some((s) => s.host === host && Number(s.port) === port && s.type === type)) {
			showMsg('This host:port already exists for that type.', 'error');
			return;
		}

		const newServer = { id: generateId(name), name, type, host, port };
		servers = [...servers, newServer];
		try {
			await saveServers(servers);
			state = await getState();
			renderTable(servers, state);
			(e.target).reset();
			showMsg('Server added successfully.', 'success');
		} catch (err) {
			showMsg(String(err?.message || err), 'error');
		}
	});

	chrome.storage.onChanged.addListener(async (changes, area) => {
		if (area !== 'local') return;
		if (changes.servers || changes.selectedServerId || changes.isConnected) {
			state = await getState();
			servers = state.servers || [];
			renderTable(servers, state);
		}
	});
}

document.addEventListener('DOMContentLoaded', init);