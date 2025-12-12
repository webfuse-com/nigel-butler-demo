//////////////////////////////////////////////////////////////////////////////
///////////////////////REPOSITION POPUP///////////////////////////////////////
(function () {
    const dragHandle = document.getElementById("drag");
    if (!dragHandle) return;

    let isDragging = false;
    let dragState = null;

    async function startDrag(screenX, screenY) {
        isDragging = true;

        const currentPosition = await browser.browserAction.getPopupPosition();
        const startLeft = parseInt(currentPosition.left) || 0;
        const startTop = parseInt(currentPosition.top) || 0;

        dragState = {
            startScreenX: screenX,
            startScreenY: screenY,
            startLeft,
            startTop,
        };
    }

    function moveDrag(screenX, screenY) {
        if (!isDragging || !dragState) return;

        const deltaX = screenX - dragState.startScreenX;
        const deltaY = screenY - dragState.startScreenY;

        const newLeft = Math.max(0, dragState.startLeft + deltaX);
        const newTop = Math.max(0, dragState.startTop + deltaY);

        browser.browserAction.setPopupPosition({
            left: `${newLeft}px`,
            top: `${newTop}px`
        });
    }

    function endDrag() {
        isDragging = false;
        dragState = null;
    }

    // MOUSE
    dragHandle.addEventListener('mousedown', async (e) => {
        await startDrag(e.screenX, e.screenY);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        moveDrag(e.screenX, e.screenY);
    });

    document.addEventListener('mouseup', () => {
        endDrag();
    });

    // TOUCH
    dragHandle.addEventListener('touchstart', async (e) => {
        const t = e.touches[0];
        if (!t) return;
        await startDrag(t.screenX, t.screenY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const t = e.touches[0];
        if (!t) return;
        moveDrag(t.screenX, t.screenY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);
})();

browser.browserAction.openPopup();

//////////////////////////////////////////////////////////////////////////////
///////////////////////REPOSITION POPUP END///////////////////////////////////
