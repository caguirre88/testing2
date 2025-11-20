# LinkedIn Auto Liker Chrome Extension

This Chrome extension automatically clicks Like buttons on LinkedIn feeds using the bundled automation script. It continuously observes the page for new posts, queues visible Like buttons, scrolls periodically, and respects a configurable click limit.

## Files
- `manifest.json` — Extension manifest (MV3) that injects the content script on LinkedIn pages.
- `content.js` — The automation logic that finds and clicks Like buttons with throttling, fallbacks, and mutation-driven rescan.

## How to use
1. Open **chrome://extensions** in Chrome.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select the repository folder.
4. Navigate to LinkedIn and open your feed; the script runs automatically on matching pages.
5. To stop the automation early, run `window.__STOP_LI_CLICKER__ = true;` in the browser console.

## Configuration
You can adjust the top-of-file constants in `content.js` to change maximum clicks, pacing, scrolling cadence, full-scan frequency, or add fallback XPaths for specific buttons.

## Troubleshooting
- Ensure you are on a LinkedIn page that matches `https://www.linkedin.com/*`.
- If you already loaded the extension, click **Reload** on the extension card after edits.
- Open DevTools and check the console for messages prefixed with `[LI Auto Liker]` to confirm the script is running.
