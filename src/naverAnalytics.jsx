let tried = 0;

export function trackNaverPageview() {

    if (!window.wcs) {
        if (tried < 10) {
            tried += 1;
            setTimeout(trackNaverPageview, 150);
        }
        return;
    }
    try {
        window.wcs_do();
    } catch (e) {
        console.warn("wcs_do() failed:", e);
    }
}