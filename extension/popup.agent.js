// ==========================================================
// CLIENT TOOLS (exactly as you specified; preserved verbatim)
// ==========================================================
const rootSelector = "body";
const CLIENT_TOOLS = {
  async take_dom_snapshot() {
    const fullSnapshot = await browser.webfuseSession
      .automation
      .take_dom_snapshot({
        rootSelector: rootSelector,
        modifier: {
          name: 'D2Snap',
          params: {
            hierarchyRatio: 0, textRatio: 0, attributeRatio: 0,
            options: {
              assignUniqueIDs: true,
              keepUnknownElements: true
            }

          }
        }
      });
    const finalSnapshot = ((fullSnapshot.length / 4) < 2 ** 13.97)
      ? fullSnapshot
      : browser.webfuseSession
        .automation
        .take_dom_snapshot({
          rootSelector: rootSelector,
          modifier: "downsample"
        });

    console.debug("Snapshot:", finalSnapshot);

    return finalSnapshot;
  },
async take_gui_snapshot() {
  // Step 1: get a valid ImageBitmap (non-zero size)
  let ib;
  for (let i = 0; i < 3; i++) {
    ib = await browser.webfuseSession.automation.take_gui_snapshot(); // alias of takeScreenshot()
    if (ib && ib.width > 0 && ib.height > 0) break;
    await new Promise(r => setTimeout(r, 200)); // brief retry if blank
  }
  if (!ib || ib.width === 0 || ib.height === 0) {
    throw new Error("take_gui_snapshot returned empty ImageBitmap (0×0)");
  }

  // Step 2: downscale if needed (keep payload <~64 KB)
  const MAX_SIDE = 640;
  const longest = Math.max(ib.width, ib.height);
  const scale = longest > MAX_SIDE ? (MAX_SIDE / longest) : 1;
  const w = Math.max(1, Math.floor(ib.width * scale));
  const h = Math.max(1, Math.floor(ib.height * scale));

  // Step 3: draw and encode
  const canvas = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });

  const ctx = canvas.getContext("2d");
  ctx.drawImage(ib, 0, 0, w, h);
  await new Promise(requestAnimationFrame); // ensure draw flushes

  const blob = await (canvas.convertToBlob
    ? canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 })
    : new Promise((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob null")), "image/jpeg", 0.7)));

  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  if (typeof ib.close === "function") ib.close();

  // Step 4: log summary for debugging
  console.debug("[GUI Snapshot]",
    `bitmap: ${ib.width}x${ib.height}, scaled: ${w}x${h}, size: ${blob.size} bytes`,
    base64.slice(0, 80) + "…"
  );

  // Step 5: return in correct shape for ElevenLabs assignment mapping
  return { gui_snapshot: base64 };
},

  async mouse_move({ x, y }) {
    console.debug("[mouse_move] CSS selector:", selector);

    return browser.webfuseSession
      .automation
      .mouse_move([x, y], true);
  },

  async scroll({ direction, amount, selector }) {
    console.debug("[scroll] CSS selector:", selector);

    return browser.webfuseSession
      .automation
      .scroll(direction, amount, selector, true);
  },

  async left_click({ selector }) {
    console.debug("[left_click] CSS selector:", selector);

    return browser.webfuseSession
      .automation
      .left_click(selector, true);
  },

  async right_click({ selector }) {
    console.debug("[right_click] CSS selector:", selector);

    return browser.webfuseSession
      .automation
      .right_click(selector, true);
  },

  async type({ text, selector }) {
    console.debug("[type] CSS selector:", selector);

    return browser.webfuseSession
      .automation
      .type(text, selector, true, true);
  },

  highlight({ selector }) {
    console.debug("[highlight] CSS selector:", selector);

    const highlightEl = document.querySelector(selector);

    highlightEl.style.backgroundColor = "yellow !important";
    highlightEl.style.transform = "scale(1.05) !important";
  },

  relocate({ url }) {
    browser.webfuseSession.relocate(url);
  },

  async get_current_location({ }) {
    return await browser.tabs.sendMessage(0, { type: "location" });
  },

  async code_injection({code}) {
    console.log("[code_injection] Code:", code);
     browser.tabs.sendMessage(null, {type: "code_injection", code: code});
  },

  async accessibility_code_injection({code}) {
    console.log("[accessibility_code_injection] Code:", code);
     browser.tabs.sendMessage(null, {type: "code_injection", code: code});
  },

  async mesh_overlay({code}) {
     browser.tabs.sendMessage(null, {type: "code_injection", code: code});
  },
};

// Make available to other files
window.CLIENT_TOOLS = CLIENT_TOOLS;

// Nothing else is instantiated here now — popup.elevenlabs.js handles
// the SDK wiring and UI state, and will read env + CLIENT_TOOLS.