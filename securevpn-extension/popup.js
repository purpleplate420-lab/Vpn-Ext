/* Popup script for SecureVPN */

const STORAGE_KEYS = {
	servers: "servers",
	selectedServerId: "selectedServerId",
	isConnected: "isConnected"
};

function sendMessage(message) {
	return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function loadState() {
	const res = await sendMessage({ type: 'getState' });
	if (!res?.ok) throw new Error(res?.error || 'Failed to load state');
	return res.state;
}

function renderServers(servers, selectedId) {
	const select = document.getElementById('regionSelect');
	select.innerHTML = '';
	for (const s of servers) {
		const opt = document.createElement('option');
		opt.value = s.id;
		opt.textContent = s.name;
		if (s.id === selectedId) opt.selected = true;
		select.appendChild(opt);
	}
}

function renderConnectionState(isConnected) {
	const btn = document.getElementById('connectBtn');
	const statusText = document.getElementById('statusText');
	if (isConnected) {
		btn.textContent = 'Disconnect';
		btn.classList.add('disconnect');
		statusText.textContent = 'Connected';
	} else {
		btn.textContent = 'Connect';
		btn.classList.remove('disconnect');
		statusText.textContent = 'Disconnected';
	}
}

async function handleConnectClick() {
	const select = document.getElementById('regionSelect');
	const serverId = select.value;
	const state = await loadState();
	if (state.isConnected) {
		await sendMessage({ type: 'disconnect' });
	} else {
		await sendMessage({ type: 'connect', serverId });
	}
	const newState = await loadState();
	renderConnectionState(Boolean(newState.isConnected));
}

async function refreshFromStorage() {
	const state = await loadState();
	renderServers(state.servers || [], state.selectedServerId);
	renderConnectionState(Boolean(state.isConnected));
}

async function init() {
	await refreshFromStorage();

	document.getElementById('connectBtn').addEventListener('click', handleConnectClick);
	document.getElementById('regionSelect').addEventListener('change', async (e) => {
		await sendMessage({ type: 'connect', serverId: e.target.value });
		const updated = await loadState();
		renderConnectionState(Boolean(updated.isConnected));
	});

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== 'local') return;
		if (changes.servers || changes.selectedServerId || changes.isConnected) {
			refreshFromStorage();
		}
	});
}

document.addEventListener('DOMContentLoaded', init);