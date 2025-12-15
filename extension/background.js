//WIKI REDIRECT --START
//////////////////////////////////////////////////////////////////////////////

let wikipediaTimeout = null;

//start relocate timer (5 seconds)
browser.webfuseSession.onMessage.addListener(data => {
    if (data.event_type === "session_started") {
        wikipediaTimeout = setTimeout(() => {
            console.log("Unable to load URL. Redirecting to wikipedia...");
            webfuseSession.relocate("https://wikipedia.org", null);
        }, 5000);
    }
});
//kill timer if content script loads
browser.runtime.onMessage.addListener(message => {
    if (message.action === "page_loaded") {
        console.log("Content.js loaded successfully. Redirect aborted.")
        if (wikipediaTimeout !== null) {
            clearTimeout(wikipediaTimeout);
            wikipediaTimout = null;
        }
    }
});

//WIKI REDIRECT --END
//////////////////////////////////////////////////////////////////////////////

//POPUP SIZING ON VIEWPORT CHANGE --START
//////////////////////////////////////////////////////////////////////////////

const popupWidthMobile = 140;
const popupHeightMobile = 120;
const popupWidthDesktop = 350;
const popupHeightDesktop = 400;
let isMobile = false; // Default state

//popup resize function
function resizePopup(isMobile) {

    browser.runtime.sendMessage({
        action: "update_popuphtml_variant",
        isMobile: isMobile
    });

    console.log(`Setting ${isMobile ? "mobile" : "desktop"} UI for popup`);

    // Shared behavior
    browser.browserAction.detachPopup();
    browser.browserAction.openPopup();
    browser.browserAction.resizePopup(
        isMobile ? popupWidthMobile : popupWidthDesktop,
        isMobile ? popupHeightMobile : popupHeightDesktop
    );

    browser.browserAction.setPopupStyles({
        backgroundColor: "#1c2c3e",
        borderRadius: isMobile ? "15px" : "20px",
        marginBottom: 0,
        paddingBottom: 0,
        overflow: "hidden",
        borderWidth: "4px",
        borderStyle: "solid",
        borderColor: "#1c2c3e",
    });

    browser.browserAction.setPopupPosition({ left: "20px", top: "20px" });
}


//Trigger resize when:
//1. Session is loaded (default mobile view)
//2. Viewport context is updated by CS

//1 - on session load
resizePopup(isMobile);
console.log("Popup sized to mobile view on session load. isMobile: ", isMobile);

//2 - after update from content
browser.runtime.onMessage.addListener(message => {
    if (message.action === "update_viewport_context") {
        console.log("New viewport context from content script. isMobile: ", message.isMobile);
        isMobile = message.isMobile;
        resizePopup(isMobile);
    }
});
//POPUP SIZING ON VIEWPORT CHANGE --END
//////////////////////////////////////////////////////////////////////////////