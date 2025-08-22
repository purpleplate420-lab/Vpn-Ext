# SecureVPN (Chrome Extension, MV3)

SecureVPN is a lightweight proxy-based VPN-style browser extension. It lets you toggle a proxy, pick regions, and manage custom servers.

Important: Browsers cannot implement a full device-level VPN. This extension routes browser traffic through a configured HTTP or SOCKS5 proxy via `chrome.proxy`.

## Features
- One-click connect/disconnect
- Region selection (server picker)
- Custom servers in Options page
- Badge shows status (ON/OFF)
- Google sign-in to sync servers with your backend

## Install (Developer Mode)
1. Build assets (no build step needed): files are ready.
2. Open Chrome → More tools → Extensions.
3. Enable Developer mode (top-right).
4. Click "Load unpacked" and select this folder.

## Configuration
- Set your backend URL in `background.js` (`BACKEND_BASE_URL`). Use HTTPS in production.
- Update `manifest.json` `host_permissions` to include your backend domain, e.g.:
```
"host_permissions": [
  "https://api.yourdomain.com/*"
]
```
- Keep `permissions: ["identity"]` for Google login.
- Backend must set `BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and whitelist `BASE_URL/auth/google/callback` as redirect URI.

## Usage
- Click the SecureVPN toolbar icon.
- If signed out, use Continue with Google to sign in.
- Choose a region, then click Connect.
- Use Options to add custom servers (syncs when signed in).

## Configure Servers
Default servers use placeholder hosts. Replace with your proxy endpoints in `options` or edit `background.js` `DEFAULT_SERVERS`.

Each server object:
```json
{
  "id": "us-west",
  "name": "United States — West",
  "type": "http" | "socks5",
  "host": "host.example.com",
  "port": 8080
}
```

## Permissions
- `proxy`: configure Chrome proxy settings
- `storage`: persist extension state
- `notifications`: connection notifications
- `identity`: Google sign-in via `launchWebAuthFlow`

## Notes
- This affects only Chrome traffic.
- Ensure your proxy supports authentication if needed; auth prompts are not implemented. For authenticated proxies, consider a PAC script approach.