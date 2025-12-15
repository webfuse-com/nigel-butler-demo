    let webfuseSession;
    (function (w, e, b, f, u, s) {
      w[f] = w[f] || {
        initSpace: function () {
          return new Promise(resolve => {
            w[f].q = arguments;
            w[f].resolve = resolve;
          });
        },
      };
      u = e.createElement(b);
      s = e.getElementsByTagName(b)[0];
      u.async = 1;
      u.src = 'https://webfu.se/surfly.js';
      s.parentNode.insertBefore(u, s);
    })(window, document, 'script', 'Webfuse');

    function loadNigel() {
      let defaultToWiki = null;
      const inputEl = document.querySelector('.input-box');
      let inputUrl = inputEl ? String(inputEl.value || '').trim() : '';

      // If empty, default to Wikipedia
      if (!inputUrl) {
        inputUrl = 'https://wikipedia.org';
      }

      // Ensure protocol is present
      if (inputUrl && !/^https?:\/\//i.test(inputUrl)) {
        inputUrl = `https://${inputUrl}`;
      }
      // Mobile/CTA visual feedback: switch to active styling + ring once
      const btn = document.querySelector('.start-btn');
      if (btn) {
        btn.classList.add('is-calling');
        const svg = btn.querySelector('.bell-icon svg');
        if (svg) {
          // restart animation reliably
          svg.classList.remove('ring-once');
          void svg.offsetWidth;
          svg.classList.add('ring-once');
          svg.addEventListener('animationend', () => svg.classList.remove('ring-once'), { once: true });
        }
      }
      webfuse.initSpace(
        '{{.WEBFUSE_WIDGET_KEY}}',
        '{{.WEBFUSE_SPACE_ID}}',
        {}
      )
        .then(async space => {
          console.log('Space loaded:', space);
          webfuseSession = space.session();

          webfuseSession.on("session_started", function (session, event) {
            webfuseSession.openTab(inputUrl);
            defaultToWiki = setTimeout(() => {
              console.log("URL appears to be invalid. Redirecting to Wikipedia...");
              webfuseSession.closeTab();
            }, 3000);
          });

          webfuseSession.on("relocate_start", function () {
            if (defaultToWiki) {
              clearTimeout(defaultToWiki);
              defaultToWiki = null;
            }
          });

          webfuseSession.on("tab_closed", function () {
            webfuseSession.openTab("https://wikipedia.org");
          });

          // Start the session
          const response = await webfuseSession.start();
        })
        .catch(error => {
          console.error('Failed:', error);
        });
    }


    document.addEventListener('DOMContentLoaded', function () {
      const buttons = document.querySelectorAll('.start-btn');
      const inputs = document.querySelectorAll('.input-box');

      // Pressing Enter in the input triggers the same flow as clicking the button
      inputs.forEach(function (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            loadNigel();
          }
        });
      });

      function enableStartButtons() {
        if (typeof window.loadNigel === 'function') {
          buttons.forEach(function (btn) {
            btn.classList.add('is-ready');
          });
          inputs.forEach(function (input) {
            input.classList.add('is-ready');
          });
          return true;
        }
        return false;
      }

      if (!enableStartButtons()) {
        const intervalId = setInterval(function () {
          if (enableStartButtons()) {
            clearInterval(intervalId);
          }
        }, 100);
      }
    });

    document.addEventListener('DOMContentLoaded', function () {
      const stackContainer = document.querySelector('.demo-stack');
      if (!stackContainer) return;

      const allCards = Array.from(stackContainer.querySelectorAll('.demo-stack__item'));
      if (allCards.length === 0) return;

      // Create overlay for enlarged image preview with quote
      const overlay = document.createElement('div');
      overlay.className = 'demo-overlay';


      const overlayContent = document.createElement('div');
      overlayContent.className = 'demo-overlay__content';

      const overlayImg = document.createElement('img');
      overlayImg.className = 'demo-overlay__img';

      const overlayQuote = document.createElement('p');
      overlayQuote.className = 'hero-quote demo-overlay__quote';

      const leftMark = document.createElement('span');
      leftMark.className = 'quote-mark';
      leftMark.textContent = '“';

      const quoteTextSpan = document.createElement('span');
      quoteTextSpan.className = 'quote-text';

      const rightMark = document.createElement('span');
      rightMark.className = 'quote-mark';
      rightMark.textContent = '”';

      overlayQuote.appendChild(leftMark);
      overlayQuote.appendChild(quoteTextSpan);
      overlayQuote.appendChild(rightMark);

      overlayContent.appendChild(overlayImg);
      overlayContent.appendChild(overlayQuote);
      overlay.appendChild(overlayContent);
      document.body.appendChild(overlay);

      const openPreview = (card, ev) => {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        const src = card.getAttribute('src');
        const quote = card.getAttribute('data-quote') || '';
        if (src) {
          overlayImg.setAttribute('src', src);
          quoteTextSpan.textContent = quote;
          overlay.classList.add('is-visible');
        }
      };

      // Prevent the "open" gesture from immediately triggering "close" on desktop.
      let ignoreCloseUntil = 0;

      // Wire up pointer + click behaviour so both tap and click open the preview
      allCards.forEach(card => {
        // Desktop: open on pointerup (a distinct click), not pointerdown
        card.addEventListener('pointerup', (ev) => {
          if (ev.pointerType !== 'touch') {
            openPreview(card, ev);
            ignoreCloseUntil = performance.now() + 250;
          }
        });

        // Fallback for browsers that only emit click reliably
        card.addEventListener('click', (ev) => {
          openPreview(card, ev);
          ignoreCloseUntil = performance.now() + 250;
        });

        // Mobile: open on touchstart for reliability on animated/transformed elements
        card.addEventListener('touchstart', (ev) => {
          openPreview(card, ev);
          ignoreCloseUntil = performance.now() + 350;
        }, { passive: false });
      });

      // Any tap/click in preview mode closes it
      const closeOverlay = (ev) => {
        // Ignore the release/click that immediately follows opening
        if (performance.now() < ignoreCloseUntil) return;
        ev.preventDefault();
        overlay.classList.remove('is-visible');
      };

      overlay.addEventListener('pointerup', closeOverlay);
      overlay.addEventListener('click', closeOverlay);
      overlay.addEventListener('touchstart', closeOverlay, { passive: false });

      // Preload all GIFs
      const preloadPromises = allCards.map(img => {
        if (img.complete) {
          return Promise.resolve();
        }
        return new Promise(resolve => {
          const done = () => {
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            resolve();
          };
          img.addEventListener('load', done);
          img.addEventListener('error', done);
        });
      });

      Promise.all(preloadPromises).then(() => {
        // All GIFs preloaded; no drop-in animation needed.
      });
    });