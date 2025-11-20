# LinkedIn Auto Liker Chrome Extension

This Chrome extension automatically clicks Like buttons on LinkedIn feeds using the provided automation script. It scans for visible Like buttons, paces clicks, and scrolls periodically to surface more posts.

## Files
- `manifest.json` — Extension manifest (MV3) that injects the content script on LinkedIn pages.
- `content.js` — The automation logic that finds and clicks Like buttons with throttling and fallbacks.

## How to use
1. Open **chrome://extensions** in Chrome.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select the repository folder.
4. Navigate to LinkedIn and open your feed; the script runs automatically on matching pages.
5. To stop the automation early, run `window.__STOP_LI_CLICKER__ = true;` in the browser console.

## Configuration
You can adjust the top-of-file constants in `content.js` to change maximum clicks, pacing, scrolling cadence, or add fallback XPaths for specific buttons.
