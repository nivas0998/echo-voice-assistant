# Echo — Voice Assistant

A standalone React + TypeScript + Vite version of the uploaded Echo UI.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
1. Extract this ZIP.
2. Open a terminal in the extracted `echo-voice-assistant` folder.
3. Install packages:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Notes
- The original `main.tsx` depended on Manus-specific tRPC, authentication, and shared server modules that were not part of the uploaded files. This package uses a simple local React entry point instead.
- Voice input uses the browser Speech Recognition API where available. Use a recent Chrome or Edge browser and allow microphone access. Other browsers may show the built-in demo fallback.
- Weather, reminders, music playback, and assistant answers are UI demonstrations; no external AI, calendar, weather, or music service is connected.
- Routines are saved in the browser's localStorage. They are displayed and managed locally; this starter does not execute scheduled jobs in the background.
