/* Popup script for SecureVPN */

const STORAGE_KEYS = {
	servers: "servers",
	selectedServerId: "selectedServerId",
	isConnected: "isConnected",
	authToken: "authToken",
	userEmail: "userEmail"
};

function sendMessage(message) {
	return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function loadState() {
	const res = await sendMessage({ type: 'getState' });
	if (!res?.ok) throw new Error(res?.error || 'Failed to load state');
	return res.state;
}

async function getConfig() {
	const res = await sendMessage({ type: 'getConfig' });
	if (!res?.ok) throw new Error(res?.error || 'Failed to load config');
	return { backendBaseUrl: res.backendBaseUrl };
}

function setAuthError(msg) {
	const errEl = document.getElementById('authError');
	if (!errEl) return;
	errEl.textContent = msg || '';
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

function toggleViews(isAuthed, email) {
	const authView = document.getElementById('authView');
	const mainView = document.getElementById('mainView');
	const userInfo = document.getElementById('userInfo');
	const logoutBtn = document.getElementById('logoutBtn');
	if (isAuthed) {
		authView.hidden = true;
		mainView.hidden = false;
		logoutBtn.hidden = false;
		userInfo.textContent = email || '';
	} else {
		mainView.hidden = true;
		authView.hidden = false;
		logoutBtn.hidden = true;
		userInfo.textContent = '';
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
	const isAuthed = Boolean(state.authToken);
	toggleViews(isAuthed, state.userEmail);
	if (isAuthed) {
		renderServers(state.servers || [], state.selectedServerId);
		renderConnectionState(Boolean(state.isConnected));
	}
}

async function loginWithGoogle() {
	setAuthError('');
	const { backendBaseUrl } = await getConfig();
	const redirectUrl = chrome.identity.getRedirectURL('securevpn');
	const startUrl = `${backendBaseUrl.replace(/\/$/, '')}/auth/google/start?redirect_uri=${encodeURIComponent(redirectUrl)}`;
	try {
		const responseUrl = await new Promise((resolve, reject) => {
			chrome.identity.launchWebAuthFlow({ url: startUrl, interactive: true }, (redirectedTo) => {
				if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
				if (!redirectedTo) return reject(new Error('No response'));
				resolve(redirectedTo);
			});
		});
		const u = new URL(responseUrl);
		const params = new URLSearchParams(u.hash.replace(/^#/, ''));
		const token = params.get('token');
		const email = params.get('email');
		if (!token) throw new Error('No token received from backend');
		await chrome.storage.local.set({ [STORAGE_KEYS.authToken]: token, [STORAGE_KEYS.userEmail]: email });
		await sendMessage({ type: 'syncAfterLogin' });
		await refreshFromStorage();
	} catch (e) {
		console.error('Google login failed:', e);
		const msg = String(e?.message || e);
		setAuthError(msg.includes('The user did not approve') ? 'Sign-in cancelled.' : msg);
	}
}

async function logout() {
	await chrome.storage.local.set({ [STORAGE_KEYS.authToken]: undefined, [STORAGE_KEYS.userEmail]: undefined });
	setAuthError('');
	await refreshFromStorage();
}

async function init() {
	await refreshFromStorage();

	document.getElementById('connectBtn').addEventListener('click', handleConnectClick);
	document.getElementById('regionSelect').addEventListener('change', async (e) => {
		await sendMessage({ type: 'connect', serverId: e.target.value });
		const updated = await loadState();
		renderConnectionState(Boolean(updated.isConnected));
	});

	document.getElementById('googleLoginBtn').addEventListener('click', loginWithGoogle);
	document.getElementById('logoutBtn').addEventListener('click', logout);

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== 'local') return;
		if (changes.servers || changes.selectedServerId || changes.isConnected || changes.authToken || changes.userEmail) {
			refreshFromStorage();
		}
	});
}

document.addEventListener('DOMContentLoaded', init);