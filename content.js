(() => {
  'use strict';

  if (window.__LI_AUTO_LIKER_RUNNING__) {
    console.log('[LI Auto Liker] Already running.');
    return;
  }
  window.__LI_AUTO_LIKER_RUNNING__ = true;

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

  /*** ===== Utilities ===== ***/
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
    // require "like" as a word and avoid "unlike"
    return /\blike\b/.test(t) && !/\bunlike\b/.test(t);
  };

  const isLikeButton = (btn) => {
    if (!btn || btn.tagName !== 'BUTTON') return false;
    if (btn.disabled) return false;

    // avoid toggling off: only act on aria-pressed !== "true"
    const pressed = norm(btn.getAttribute('aria-pressed'));
    if (pressed === 'true') return false;

    // 1) ARIA label is the most reliable on LinkedIn
    const aria = btn.getAttribute('aria-label');
    if (likeTextMatch(aria)) return true;

    // 2) Inner text in common LinkedIn containers
    const labelSpan = btn.querySelector(
      '.social-action-button__text, .react-button__text, .artdeco-button__text'
    );
    if (likeTextMatch(labelSpan?.textContent)) return true;

    // 3) Any descendant text as a fallback
    if (likeTextMatch(btn.textContent)) return true;

    // 4) Icon-only variant
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
      // If the XPath points to a descendant (e.g., <span>), climb to its button
      const btn = node.closest?.('button');
      return btn && btn.tagName === 'BUTTON' ? btn : node.tagName === 'BUTTON' ? node : null;
    } catch {
      return null;
    }
  };

  const trace = (...args) => console.log('[LI Auto Liker]', ...args);

  /*** ===== Candidate collection ===== ***/
  const collectButtons = () => {
    // Prefer LinkedIn’s reaction triggers, but also allow aria-label based matches
    const primary = Array.from(
      document.querySelectorAll(
        'button.react-button__trigger.social-actions-button,' + // posts
          'button.react-button__trigger,' + // fallback (comments or variants)
          'button[aria-label*="like" i]' // aria-label contains Like
      )
    );

    // Second pass: conservative expansion to other buttons that *look* like Like
    const extras = Array.from(document.querySelectorAll('button')).filter(
      (b) =>
        !primary.includes(b) &&
        b.getAttribute('aria-pressed') !== 'true' &&
        (hasThumbsUpIcon(b) || likeTextMatch(b.textContent) || likeTextMatch(b.getAttribute('aria-label')))
    );

    // Merge & de-dupe
    return Array.from(new Set([...primary, ...extras])).filter(isLikeButton);
  };

  /*** ===== Runner ===== ***/
  (async () => {
    const clickedSet = new WeakSet(); // buttons we've clicked
    const seenSet = new WeakSet(); // buttons we've queued
    let queue = [];
    let done = 0;
    let lastFullScan = 0;

    const refillQueue = (forceFull = false) => {
      const now = Date.now();
      const shouldFullScan = forceFull || now - lastFullScan >= FULL_SCAN_INTERVAL_MS;
      const candidates = shouldFullScan ? collectButtons() : getVisibleButtonsNearViewport();
      if (shouldFullScan) lastFullScan = now;

      const fresh = candidates.filter(
        (b) => !clickedSet.has(b) && !seenSet.has(b) && isVisibleEnough(b)
      );
      fresh.forEach((b) => seenSet.add(b));
      queue.push(...fresh);
    };

    const getVisibleButtonsNearViewport = () => {
      const buttons = collectButtons();
      const margin = window.innerHeight * 2; // include a buffer below the fold
      return buttons.filter((btn) => {
        const rect = btn.getBoundingClientRect();
        return rect.top <= margin && rect.bottom >= -200 && isVisibleEnough(btn);
      });
    };

    const observer = new MutationObserver(() => refillQueue());

    const stopObserver = () => {
      try {
        observer.disconnect();
      } catch (e) {
        console.error('[LI Auto Liker] Failed to disconnect observer', e);
      }
    };

    const primeQueue = () => {
      refillQueue(true);
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

    const startObserver = () => {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    };

    primeQueue();
    startObserver();

    while (done < MAX_CLICKS) {
      if (window.__STOP_LI_CLICKER__) {
        trace(`Stopped by user at ${done}/${MAX_CLICKS}.`);
        stopObserver();
        return;
      }

      let btn = queue.shift();

      if (!btn) {
        await scrollChunk();
        refillQueue(true);
        if (!queue.length) {
          for (const xp of FALLBACK_XPATHS) {
            const b = findByXPath(xp);
            if (b && !clickedSet.has(b) && isLikeButton(b) && isVisibleEnough(b)) {
              queue.push(b);
              seenSet.add(b);
            }
          }
          if (!queue.length) {
            trace('No more Like buttons found. Finishing.');
            break;
          }
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
    trace(`Finished. Sent ${done} like click(s).`);
  })();
})();
