## Vite + React + TypeScript + TanStack Router + XPrinter API

This starter includes:
- Vite + React 18 + TypeScript
- TanStack Router v1 (manual route tree)
- TypeScript configured for `@types/jsprintmanager`
- Example print page that sends a simple text bill to the default printer via JSPrintManager

### Prerequisites
- Node.js 18+
- JSPrintManager Client app installed and running (required to actually print). Download from Neodynamic.

### Local Dev
```
npm install
npm run dev   # frontend on 5173 (proxies /api to 4000)
npm run server # backend on 4000 (serves /api and static build in prod)
```

Visit http://localhost:5173 and open the Print page.

If TypeScript cannot find jsprintmanager types, ensure `@types/jsprintmanager` is installed (it is listed in devDependencies) and `src/env.d.ts` includes `/// <reference types="jsprintmanager" />`.

### Notes
- The sample bill uses `ClientPrintJob` + `PrintFileTXT` to send text to the default printer.
- For thermal/ESC/POS printing, this repo includes a minimal Node API under `server/` that talks ESC/POS over TCP port 9100.

### Deploy to Railway (single container)
- This repo ships a Dockerfile that builds the React app and runs the Node API serving both the API and static frontend.
- Railway will detect the Dockerfile automatically; no Procfile needed.
- Steps:
  - Create a new Railway project, “Deploy from Repo”.
  - Set service type to Docker if prompted; otherwise Railway autodetects.
  - No special env vars are required. The server listens on `$PORT` provided by Railway.
  - Optional: set `CORS_ORIGIN` to your Railway domain to restrict CORS; otherwise `*` is used.

Runtime
- The container starts `node server/index.cjs`.
- The API is under `/api/*` and the SPA is served from `/` after build.
- Healthcheck: `/healthz` (used by container health check).
