let tried = 0;

export function trackNaverPageview() {

    const host = window.location.hostname;
    if (host !== "bustory.kr" && host !== "www.bustory.kr") {
        return;
    }

    if (!window.wcs) {
        if (tried < 10) {
            tried += 1;
            setTimeout(trackNaverPageview, 150);
        }
        return;
    }
    try {
        if (window.wcs_do) {
            window.wcs_do();
        }
    } catch (e) {
        console.warn("wcs_do() failed:", e);
    }
}