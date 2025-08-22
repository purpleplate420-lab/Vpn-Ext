# SecureVPN Backend

Minimal Node/Express API with Google OAuth and per-user server lists.

## Environment
Create `.env` in project root:
```
PORT=4000
BASE_URL=http://localhost:4000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=change-me
```

In Google Cloud Console (OAuth credentials):
- Authorized redirect URI: `${BASE_URL}/auth/google/callback`

## Run
```
npm install
npm start
```

## API
- GET `/health`
- GET `/servers` (Bearer JWT)
- PUT `/servers` (Bearer JWT) { servers: [...] }
- GET `/auth/google/start?redirect_uri=<EXT_REDIRECT>` → Google consent → `/auth/google/callback` → redirects to `<EXT_REDIRECT>#token=...&email=...`