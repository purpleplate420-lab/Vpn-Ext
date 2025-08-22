/* SecureVPN Background Service Worker (Manifest V3) */

const DEFAULT_SERVERS = [
  {
    id: "us-west",
    name: "United States — West",
    type: "socks5",
    host: "replace-with-your-proxy.example.com",
    port: 1080
  },
  {
    id: "eu-central",
    name: "Europe — Central",
    type: "http",
    host: "replace-with-your-proxy.example.com",
    port: 8080
  }
];

const STORAGE_KEYS = {
  servers: "servers",
  selectedServerId: "selectedServerId",
  isConnected: "isConnected"
};

async function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

async function setStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  });
}

function setBadgeConnected(isConnected) {
  const text = isConnected ? "ON" : "OFF";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: isConnected ? "#10b981" : "#9ca3af" });
}

async function ensureDefaults() {
  const current = await getStorage([STORAGE_KEYS.servers, STORAGE_KEYS.selectedServerId, STORAGE_KEYS.isConnected]);
  const updates = {};

  if (!Array.isArray(current[STORAGE_KEYS.servers]) || current[STORAGE_KEYS.servers].length === 0) {
    updates[STORAGE_KEYS.servers] = DEFAULT_SERVERS;
  }
  if (typeof current[STORAGE_KEYS.selectedServerId] !== "string") {
    updates[STORAGE_KEYS.selectedServerId] = DEFAULT_SERVERS[0].id;
  }
  if (typeof current[STORAGE_KEYS.isConnected] !== "boolean") {
    updates[STORAGE_KEYS.isConnected] = false;
  }

  if (Object.keys(updates).length > 0) {
    await setStorage(updates);
  }

  const finalState = await getStorage([STORAGE_KEYS.isConnected]);
  setBadgeConnected(Boolean(finalState[STORAGE_KEYS.isConnected]));
}

function buildFixedServerRules(server) {
  const { type, host, port } = server;

  if (!host || !port || !type) {
    throw new Error("Invalid server configuration");
  }

  if (type === "socks5" || type === "socks") {
    return {
      mode: "fixed_servers",
      rules: {
        proxyForHttp: { scheme: "socks5", host, port },
        proxyForHttps: { scheme: "socks5", host, port },
        bypassList: ["<local>"]
      }
    };
  }

  // default to HTTP(S) proxy for both http and https
  return {
    mode: "fixed_servers",
    rules: {
      proxyForHttp: { scheme: "http", host, port },
      proxyForHttps: { scheme: "http", host, port },
      bypassList: ["<local>"]
    }
  };
}

async function applyProxyForServerId(serverId) {
  const { servers } = await getStorage([STORAGE_KEYS.servers]);
  const server = (servers || []).find((s) => s.id === serverId);
  if (!server) {
    throw new Error("Server not found");
  }

  const config = buildFixedServerRules(server);
  return new Promise((resolve) => {
    chrome.proxy.settings.set({ value: config, scope: "regular" }, resolve);
  });
}

async function clearProxy() {
  return new Promise((resolve) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" }, resolve);
    });
  });
}

function notify(title, message) {
  try {
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icon-128.png',
      title,
      message
    });
  } catch (e) {
    // notifications may not be available in all contexts; ignore errors
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'getState') {
        const state = await getStorage([STORAGE_KEYS.servers, STORAGE_KEYS.selectedServerId, STORAGE_KEYS.isConnected]);
        sendResponse({ ok: true, state });
        return;
      }

      if (message?.type === 'connect') {
        const { serverId } = message;
        if (!serverId) throw new Error('Missing serverId');

        await applyProxyForServerId(serverId);
        await setStorage({ [STORAGE_KEYS.isConnected]: true, [STORAGE_KEYS.selectedServerId]: serverId });
        setBadgeConnected(true);
        notify('SecureVPN', 'Connected');
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'disconnect') {
        await clearProxy();
        await setStorage({ [STORAGE_KEYS.isConnected]: false });
        setBadgeConnected(false);
        notify('SecureVPN', 'Disconnected');
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'saveServers') {
        const { servers } = message;
        if (!Array.isArray(servers)) throw new Error('Invalid servers');

        const current = await getStorage([STORAGE_KEYS.selectedServerId, STORAGE_KEYS.isConnected]);
        const currentSelectedId = current[STORAGE_KEYS.selectedServerId];
        const isConnected = Boolean(current[STORAGE_KEYS.isConnected]);

        await setStorage({ [STORAGE_KEYS.servers]: servers });

        let nextSelectedId = currentSelectedId;
        const hasSelected = servers.some((s) => s.id === currentSelectedId);
        if (!hasSelected) {
          nextSelectedId = servers.length > 0 ? servers[0].id : undefined;
        }

        if (nextSelectedId) {
          await setStorage({ [STORAGE_KEYS.selectedServerId]: nextSelectedId });
          if (isConnected) {
            await applyProxyForServerId(nextSelectedId);
          }
        } else {
          await setStorage({ [STORAGE_KEYS.isConnected]: false, [STORAGE_KEYS.selectedServerId]: undefined });
          await clearProxy();
          setBadgeConnected(false);
        }

        sendResponse({ ok: true, selectedServerId: nextSelectedId || null });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (error) {
      sendResponse({ ok: false, error: String(error?.message || error) });
    }
  })();
  return true; // keep message channel open for async
});