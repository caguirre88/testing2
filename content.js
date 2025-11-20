(() => {
  'use strict';

  /*** ===== Configuration ===== ***/
  const MAX_CLICKS = 400; // total reactions to send
  const CLICK_GAP_MS = 350; // delay between clicks
  const SCROLL_PAUSE_MS = 1100; // wait after each scroll to let content render
  const SCROLL_EVERY_N = 8; // scroll every N clicks to surface more posts
  const FULL_SCAN_INTERVAL_MS = 4000; // periodic full scan for fresh buttons

  // Add any explicit XPaths you want as fallbacks (yours included):
  const FALLBACK_XPATHS = [
    '/html/body/div[6]/div[3]/div/div/div[2]/div/div/main/div[3]/div/div[1]/div[27]/div/div/div/div/div/div/div/div[1]/div[4]/div[2]/span[1]/button[1]'
  ];

  // You can stop early by running this in the console while it runs:
  window.__STOP_LI_CLICKER__ = false;

  const state = {
    running: false,
    stopRequested: false,
    lastFullScan: 0
  };

  /*** ===== Utilities ===== ***/
  const trace = (...args) => console.log('[LI Auto Liker]', ...args);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ') // NBSP -> space
      .trim();

  const hasThumbsUpIcon = (el) => {
    if (!el) return false;
    return !!(
      el.querySelector('svg[data-test-icon*="thumbs-up"], use[href*="thumbs-up"], svg[aria-label*="Like" i]')
    );
  };

  const isVisibleEnough = (el) => {
    if (!el || !(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  };

  const likeTextMatch = (s) => {
    const t = norm(s);
    return /\blike\b/.test(t) && !/\bunlike\b/.test(t);
  };

  const isLikeButton = (btn) => {
    if (!btn || btn.tagName !== 'BUTTON') return false;
    if (btn.disabled) return false;

    const pressed = norm(btn.getAttribute('aria-pressed'));
    if (pressed === 'true') return false;

    const aria = btn.getAttribute('aria-label');
    if (likeTextMatch(aria)) return true;

    const labelSpan = btn.querySelector(
      '.social-action-button__text, .react-button__text, .artdeco-button__text'
    );
    if (likeTextMatch(labelSpan?.textContent)) return true;

    if (likeTextMatch(btn.textContent)) return true;

    if (hasThumbsUpIcon(btn)) return true;

    return false;
  };

  const scrollChunk = async () => {
    window.scrollBy({
      top: Math.max(800, Math.round(window.innerHeight * 0.9)),
      left: 0,
      behavior: 'smooth'
    });
    await sleep(SCROLL_PAUSE_MS);
  };

  const findByXPath = (xp) => {
    try {
      const node = document
        .evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
      if (!node) return null;
      const btn = node.closest?.('button');
      return btn && btn.tagName === 'BUTTON' ? btn : node.tagName === 'BUTTON' ? node : null;
    } catch (err) {
      trace('XPath evaluation failed', err);
      return null;
    }
  };

  /*** ===== Candidate collection ===== ***/
  const collectButtons = () => {
    const primary = Array.from(
      document.querySelectorAll(
        'button.react-button__trigger.social-actions-button,' +
          'button.react-button__trigger,' +
          'button[aria-label*="like" i]'
      )
    );

    const extras = Array.from(document.querySelectorAll('button')).filter(
      (b) =>
        !primary.includes(b) &&
        b.getAttribute('aria-pressed') !== 'true' &&
        (hasThumbsUpIcon(b) || likeTextMatch(b.textContent) || likeTextMatch(b.getAttribute('aria-label')))
    );

    return Array.from(new Set([...primary, ...extras])).filter(isLikeButton);
  };

  const getVisibleButtonsNearViewport = () => {
    const buttons = collectButtons();
    const margin = window.innerHeight * 2;
    return buttons.filter((btn) => {
      const rect = btn.getBoundingClientRect();
      return rect.top <= margin && rect.bottom >= -200 && isVisibleEnough(btn);
    });
  };

  /*** ===== Control helpers ===== ***/
  const shouldStop = () => state.stopRequested || window.__STOP_LI_CLICKER__;

  const requestStop = () => {
    state.stopRequested = true;
    window.__STOP_LI_CLICKER__ = true;
  };

  const primeQueue = (clickedSet, seenSet, queue) => {
    const now = Date.now();
    const forceFull = now - state.lastFullScan >= FULL_SCAN_INTERVAL_MS;
    const candidates = forceFull ? collectButtons() : getVisibleButtonsNearViewport();
    if (forceFull) state.lastFullScan = now;

    const fresh = candidates.filter(
      (b) => !clickedSet.has(b) && !seenSet.has(b) && isVisibleEnough(b)
    );
    fresh.forEach((b) => seenSet.add(b));
    queue.push(...fresh);

    if (queue.length === 0) {
      for (const xp of FALLBACK_XPATHS) {
        const b = findByXPath(xp);
        if (b && !clickedSet.has(b) && isLikeButton(b) && isVisibleEnough(b)) {
          queue.push(b);
          seenSet.add(b);
        }
      }
    }
  };

  /*** ===== Runner ===== ***/
  const runAutoLiker = async () => {
    if (state.running) {
      trace('Already running.');
      return { status: 'already-running' };
    }

    state.running = true;
    state.stopRequested = false;
    window.__STOP_LI_CLICKER__ = false;

    const clickedSet = new WeakSet();
    const seenSet = new WeakSet();
    let queue = [];
    let done = 0;

    const refillQueue = (forceFull = false) => {
      if (forceFull) state.lastFullScan = 0;
      primeQueue(clickedSet, seenSet, queue);
    };

    const observer = new MutationObserver(() => primeQueue(clickedSet, seenSet, queue));
    const stopObserver = () => {
      try {
        observer.disconnect();
      } catch (e) {
        trace('Failed to disconnect observer', e);
      }
    };

    primeQueue(clickedSet, seenSet, queue);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    while (done < MAX_CLICKS) {
      if (shouldStop()) {
        trace(`Stopped by user at ${done}/${MAX_CLICKS}.`);
        stopObserver();
        state.running = false;
        return { status: 'stopped', done };
      }

      let btn = queue.shift();

      if (!btn) {
        await scrollChunk();
        refillQueue(true);
        if (!queue.length) {
          trace('No more Like buttons found. Finishing.');
          break;
        }
        continue;
      }

      if (!isLikeButton(btn) || clickedSet.has(btn)) continue;

      btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await sleep(50);
      btn.click();
      clickedSet.add(btn);
      done++;
      trace(`Liked ${done}/${MAX_CLICKS}`, btn);

      await sleep(CLICK_GAP_MS + Math.floor(Math.random() * 300));

      if (done % SCROLL_EVERY_N === 0) {
        await scrollChunk();
        refillQueue(true);
      } else {
        refillQueue();
      }
    }

    stopObserver();
    state.running = false;
    trace(`Finished. Sent ${done} like click(s).`);
    return { status: 'completed', done };
  };

  /*** ===== Message wiring ===== ***/
  const onMessage = (message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'li-auto-liker-start') {
      runAutoLiker();
      sendResponse?.({ status: 'starting' });
    }

    if (message.type === 'li-auto-liker-stop') {
      requestStop();
      sendResponse?.({ status: 'stopping' });
    }

    if (message.type === 'li-auto-liker-status') {
      sendResponse?.({ status: state.running ? 'running' : 'idle' });
    }
  };

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(onMessage);
  }

  // Automatically kick off once injected, but can be stopped/restarted via the popup.
  runAutoLiker().catch((err) => trace('Unexpected error', err));
})();
