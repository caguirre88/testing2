(() => {
  'use strict';

  /*** ===== Configuration ===== ***/
  const MAX_CLICKS = 400; // total reactions to send
  const CLICK_GAP_MS = 350; // delay between clicks
  const SCROLL_PAUSE_MS = 1100; // wait after each scroll to let content render
  const SCROLL_EVERY_N = 8; // scroll every N clicks to surface more posts

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
      el.querySelector('svg[data-test-icon*="thumbs-up"]') ||
      el.querySelector('use[href*="thumbs-up"]')
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

  /*** ===== Candidate collection ===== ***/
  // Prefer LinkedIn’s reaction triggers, but also allow aria-label based matches
  const getCandidates = () => {
    // First pass: the usual LinkedIn reaction buttons
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

    const refillQueue = () => {
      const fresh = getCandidates().filter(
        (b) => !clickedSet.has(b) && !seenSet.has(b) && isVisibleEnough(b)
      );
      fresh.forEach((b) => seenSet.add(b));
      // Put new items at the end of the queue
      queue.push(...fresh);
    };

    // Prime queue
    refillQueue();

    // If nothing matched yet, try explicit XPaths
    if (queue.length === 0) {
      for (const xp of FALLBACK_XPATHS) {
        const b = findByXPath(xp);
        if (b && !clickedSet.has(b) && isLikeButton(b)) {
          queue.push(b);
          seenSet.add(b);
        }
      }
    }

    while (done < MAX_CLICKS) {
      if (window.__STOP_LI_CLICKER__) {
        console.log(`Stopped by user at ${done}/${MAX_CLICKS}.`);
        return;
      }

      let btn = queue.shift();

      if (!btn) {
        // No queued candidates—scroll and rescan
        await scrollChunk();
        refillQueue();
        if (!queue.length) {
          // As a last resort, try XPaths again after scrolling
          for (const xp of FALLBACK_XPATHS) {
            const b = findByXPath(xp);
            if (b && !clickedSet.has(b) && isLikeButton(b) && isVisibleEnough(b)) {
              queue.push(b);
              seenSet.add(b);
            }
          }
          if (!queue.length) {
            console.log('No more Like buttons found. Finishing.');
            break;
          }
        }
        continue;
      }

      // Safety checks before clicking
      if (!isLikeButton(btn) || clickedSet.has(btn)) continue;

      // Bring into view and click
      btn.scrollIntoView({ block: 'center' });
      btn.click();
      clickedSet.add(btn);
      done++;
      console.log(`Liked ${done}/${MAX_CLICKS}`, btn);

      // Pace the clicks
      await sleep(CLICK_GAP_MS + Math.floor(Math.random() * 300));

      // Periodic scroll to load more
      if (done % SCROLL_EVERY_N === 0) {
        await scrollChunk();
        refillQueue();
      } else {
        // Light refresh to catch items that just rendered without scroll
        refillQueue();
      }
    }

    console.log(`Finished. Sent ${done} like click(s).`);
  })();
})();
