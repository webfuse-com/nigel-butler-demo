//////////////////////////////////////////////////////////////////////////////
///////////////////////GLOBAL VARS///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
let isMobile = null;      // current state
let prevIsMobile = null;  // last sent state
let debounceTimer = null;
let meshEnabled = false; //mesh overlay state
const MOBILE_MAX = 899;
const DESKTOP_MIN = 900;
let nigelDeadImg;
//////////////////////////////////////////////////////////////////////////////
///////////////////////GLOBAL VARS END///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//Let background.js know the user entered url has loaded
// It will redirect to wikipedia if there is an issue
// If this message does not arrive within 5 seconds of session start
console.log("content.js loaded")
browser.runtime.sendMessage({
  action: "page_loaded"
});

//////////////////////////////////////////////////////////////////////////////
///////////////////////WIKI REDIRECR///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

browser.runtime.onMessage.addListener(message => {
  console.log("Code injection from popup: ", message);
  if (message.code && message.type === "code_injection") {
    executeInjectedCode(message.code);
  }
  else if (message.url && message.type === "nigel-failed") {
    nigelDeadImg = message.url;
    nigelFailed();
    disableMeshOverlay();
  }
});

//////////////////////////////////////////////////////////////////////////////
///////////////////////WIKI REDIRECT END///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////
///////////////////////MANAGE WEBFUSE-SET POPUP STYLES FOR MOBILE/////////////
//////////////////////////////////////////////////////////////////////////////
//Content > background > popup
// 1. Determine whether the viewport should be treated as "mobile" or "desktop"
function computeIsMobile() {
  // Look at visualViewport width if available, fallback to window width
  const width = window.visualViewport?.width || window.innerWidth;
  const height = window.visualViewport?.height || window.innerHeight;

  // Simple mobile / desktop classification based on breakpoints
  if (width <= MOBILE_MAX) return true;
  if (width >= DESKTOP_MIN) return false;

  // In between those breakpoints, reuse the previous value if we have one
  if (isMobile !== null) return isMobile;

  // Otherwise use a fallback heuristic based on small height or narrow width
  return (height < 500 || width < 900);
}

// 2. Check the viewport, and if mobile/desktop status has changed,
//    notify the background script so the popup can update itself.
function viewPortCheck() {
  isMobile = computeIsMobile();

  if (isMobile !== prevIsMobile) {
    prevIsMobile = isMobile;
    console.log(isMobile ? "Mobile viewport detected" : "Desktop viewport detected");
    updatePopupUI();
  }
}

// 3. Send the message to background whenever a change occurs
function updatePopupUI() {
  browser.runtime.sendMessage({
    action: "update_viewport_context",
    isMobile: isMobile
  });
  console.log("Message sent from content script. isMobile: ", isMobile);
}

// 4. Watch for viewport-related changes and debounce the checks
function onViewportChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(viewPortCheck, 120);
}

window.addEventListener("resize", onViewportChange, { passive: true });
window.addEventListener("orientationchange", onViewportChange, { passive: true });

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
  window.visualViewport.addEventListener("scroll", onViewportChange, { passive: true });
}

// 5. Run immediately so the popup gets context ASAP
viewPortCheck();
////////////////////////////////////////////////////////////////////////////////
///////////////////////MANAGE WEBFUSE-SET POPUP STYLES FOR MOBILE END//////////
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
///////////////////////NIGEL FAILED GRAPHIC ON PAGE//////////////////////////
//////////////////////////////////////////////////////////////////////////////
function nigelFailed() {
  // Preload the image first
  const loader = new Image();
  loader.onload = () => {
    // Remove old ghost if any
    const existing = document.getElementById("nigel-ghost-container");
    if (existing) existing.remove();
    const existingStyle = document.getElementById("nigel-ghost-styles");
    if (existingStyle) existingStyle.remove();

    // --- Create Animation Styles ---
    const style = document.createElement("style");
    style.id = "nigel-ghost-styles";
    style.textContent = `
      @keyframes nigelFloat {
        0%   { transform: translate(-50%, 110%); opacity: 0; }
        10%  { opacity: 1; }
        100% { transform: translate(-50%, -60%); opacity: 0; }
      }

      @keyframes nigelWave {
        0%   { transform: translateX(-10px); }
        50%  { transform: translateX(10px); }
        100% { transform: translateX(-10px); }
      }

      @keyframes nigelText {
        0%   { opacity: 0; transform: translateY(10px); }
        20%  { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    // --- Container ---
    const container = document.createElement("div");
    container.id = "nigel-ghost-container";
    container.style.position = "fixed";
    container.style.left = "50%";
    container.style.bottom = "0";
    container.style.transform = "translate(-50%, 110%)";
    container.style.zIndex = "999999";
    container.style.pointerEvents = "none";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.animation = "nigelFloat 8s ease-out forwards";

    // --- Nigel Image ---
    const img = document.createElement("img");
    img.src = loader.src;
    img.alt = "Nigel ghost";
    img.style.width = "160px";
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.filter =
      "drop-shadow(0 0 12px rgba(0,0,0,0.7)) drop-shadow(0 0 24px rgba(255,255,255,0.4))";
    img.style.animation = "nigelWave 4s ease-in-out infinite";

    // --- Caption (bigger text) ---
    const caption = document.createElement("div");
    caption.textContent = "Disconnected";
    caption.style.marginTop = "12px";
    caption.style.padding = "6px 14px";
    caption.style.fontFamily = "sans-serif";
    caption.style.fontWeight = "600";
    caption.style.textAlign = "center";
    caption.style.fontSize = "10px";
    caption.style.letterSpacing = "0.06em";
    caption.style.textTransform = "uppercase";
    caption.style.background = "rgba(255, 255, 255, 0.85)";
    caption.style.color = "#1c2c3e";
    caption.style.animation = "nigelText 9s ease-out forwards";

    // Append
    container.appendChild(caption);
    container.appendChild(img);
    document.body.appendChild(container);

    // Cleanup (a bit longer than animations)
    setTimeout(() => {
      const c = document.getElementById("nigel-ghost-container");
      if (c) c.remove();
      const s = document.getElementById("nigel-ghost-styles");
      if (s) s.remove();
    }, 10000);
  };

  loader.onerror = (e) => {
    console.error("[Nigel] Failed to load image:", nigelDeadImg, e);
  };

  // Start loading
  loader.src = nigelDeadImg;
}
//////////////////////////////////////////////////////////////////////////////
///////////////////////NIGEL FAILED GRAPHIC ON PAGE END///////////////////////
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
///////////////////////INJECT CODE FROM ELEVEN LABS AGENT/////////////////////
//////////////////////////////////////////////////////////////////////////////

// Initial check
function executeInjectedCode(code) {
  let attempts = 0;
  const MAX = 40; // ~2s @ 50ms
  (function tryRun() {
    try {
      new Function(code)();
    } catch (err) {
      console.error(`Failed running injected code (attempt ${attempts + 1}):`, err);
    }

    attempts++;
    if (attempts < MAX) {
      setTimeout(tryRun, 50);
    } else {
      console.log("Finished executing injected code attempts.");
    }
  })();
}

browser.runtime.onMessage.addListener(message => {
  console.log("Code injection from popup: ", message);
  if (message.code && message.type === "code_injection") {
    executeInjectedCode(message.code);
  }
  else if (message.url && message.type === "nigel-failed") {
    nigelDeadImg = message.url;
    nigelFailed();
    disableMeshOverlay();
  }
});
//////////////////////////////////////////////////////////////////////////////
///////////////////////INJECT CODE FROM ELEVEN LABS AGENT END//////////////////
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
///////////////////////INJECT MESH OVERLAY////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function enableMeshOverlay() {
  const ID = "__mesh_css_overlay_min";
  if (document.getElementById(ID)) return; // already enabled

  // Config
  const spacing = 16;
  const veil = 0.10;
  const baseAlpha = 0.10;
  const baseRGB = '170 200 230';
  const waveRGB = '64 180 255';
  const waveDur = '4.5s';

  const wrap = document.createElement('div');
  wrap.id = ID;
  Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '2147483646', pointerEvents: 'none' });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes sweepDiag {
      from { mask-position: 160% -60%; -webkit-mask-position: 160% -60%; }
      to   { mask-position: -60% 160%; -webkit-mask-position: -60% 160%; }
    }
    #${ID} { contain: layout size style; }
    #${ID} .veil { position: absolute; inset: 0; background: #fff; opacity: ${veil}; }
    #${ID} .meshBase, #${ID} .meshWave { position: absolute; inset: 0; display: block; }
    #${ID} .meshBase {
      background-image:
        repeating-linear-gradient(45deg,  rgb(${baseRGB} / ${baseAlpha}) 0 1px, transparent 1px ${spacing}px),
        repeating-linear-gradient(135deg, rgb(${baseRGB} / ${baseAlpha}) 0 1px, transparent 1px ${spacing}px);
    }
    #${ID} .meshWave {
      background-image:
        repeating-linear-gradient(45deg,  rgb(${waveRGB}) 0 1px, transparent 1px ${spacing}px),
        repeating-linear-gradient(135deg, rgb(${waveRGB}) 0 1px, transparent 1px ${spacing}px);
      mix-blend-mode: screen;
      mask-image: linear-gradient(45deg, transparent 35%, black 50%, transparent 65%);
      -webkit-mask-image: linear-gradient(45deg, transparent 35%, black 50%, transparent 65%);
      mask-size: 300% 300%;
      -webkit-mask-size: 300% 300%;
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
      animation: sweepDiag ${waveDur} linear infinite;
      will-change: mask-position, -webkit-mask-position;
    }
  `;

  const veilEl = document.createElement('div'); veilEl.className = 'veil';
  const base = document.createElement('div'); base.className = 'meshBase';
  const wave = document.createElement('div'); wave.className = 'meshWave';

  wrap.append(style, veilEl, base, wave);
  document.documentElement.appendChild(wrap);
}

function disableMeshOverlay() {
  const el = document.getElementById("__mesh_css_overlay_min");
  if (el) el.remove();
}

console.log("mesh ready");

window.mesh = {
  enableMeshOverlay,
  disableMeshOverlay
};
//////////////////////////////////////////////////////////////////////////////
///////////////////////END INJECT MESH OVERLAY///////////////////////////////
//////////////////////////////////////////////////////////////////////////////