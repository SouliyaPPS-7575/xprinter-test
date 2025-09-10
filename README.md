## Vite + React + TypeScript + TanStack Router + JSPrintManager

This starter includes:
- Vite + React 18 + TypeScript
- TanStack Router v1 (manual route tree)
- TypeScript configured for `@types/jsprintmanager`
- Example print page that sends a simple text bill to the default printer via JSPrintManager

### Prerequisites
- Node.js 18+
- JSPrintManager Client app installed and running (required to actually print). Download from Neodynamic.

### Setup
```
npm install
npm run dev
```

Visit http://localhost:5173 and open the Print page.

If TypeScript cannot find jsprintmanager types, ensure `@types/jsprintmanager` is installed (it is listed in devDependencies) and `src/env.d.ts` includes `/// <reference types="jsprintmanager" />`.

### Notes
- The sample bill uses `ClientPrintJob` + `PrintFileTXT` to send text to the default printer.
- For thermal/ESC/POS or PDF printing, adapt `src/utils/jspm.ts` (e.g., use `PrintFilePDF` or raw ESC/POS commands).

