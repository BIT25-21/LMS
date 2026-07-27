/******************************************************
 * SHARED UTILITIES
 * ----------------------------------------------------
 * Loaded on every page. Keep this dependency-free —
 * it must not need Supabase or the DOM.
 ******************************************************/


/******************************************************
 * 1. HTML ESCAPING
 * ----------------------------------------------------
 * Every module in this app builds markup with innerHTML.
 * Anything that came from the database has to go through
 * here first, otherwise an employee named
 *   <img src=x onerror=alert(1)>
 * executes script in the approver's browser.
 ******************************************************/
function escapeHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}


/******************************************************
 * 2. WORKING DAY COUNTER
 * ----------------------------------------------------
 * A plain end-minus-start subtraction bills Saturday and
 * Sunday as leave. This counts Mon-Fri only, and skips
 * any date in the supplied holiday list.
 *
 * Dates are "YYYY-MM-DD" strings, which JS parses as UTC
 * midnight — so all the arithmetic below uses UTC to
 * avoid an off-by-one in negative timezones.
 ******************************************************/
function countWorkingDays(startDate, endDate, holidays = []) {

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || end < start) return 0;

    const skip = new Set(holidays);

    let days = 0;
    const cursor = new Date(start);

    while (cursor <= end) {

        const weekday = cursor.getUTCDay();          // 0 = Sun, 6 = Sat
        const iso = cursor.toISOString().split("T")[0];

        if (weekday !== 0 && weekday !== 6 && !skip.has(iso)) {
            days++;
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
}


/******************************************************
 * 3. CALENDAR DAYS (for display only)
 ******************************************************/
function countCalendarDays(startDate, endDate) {

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || end < start) return 0;

    return Math.round((end - start) / 86400000) + 1;
}


/******************************************************
 * 4. TODAY, AS AN ISO DATE STRING
 ******************************************************/
function todayISO() {
    return new Date().toISOString().split("T")[0];
}


window.escapeHtml = escapeHtml;
window.countWorkingDays = countWorkingDays;
window.countCalendarDays = countCalendarDays;
window.todayISO = todayISO;
