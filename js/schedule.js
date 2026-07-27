/******************************************************
 * LEAVE SCHEDULE MODULE
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    loadLeaveSchedule();
});


/******************************************************
 * LOAD ALL LEAVE REQUESTS
 ******************************************************/
async function loadLeaveSchedule() {

    const { data, error } = await window.sb
        .from("leave_requests")
        .select("*")
        .eq("status", "approved")
        .order("start_date", { ascending: true });

    if (error) {
        console.error("Error loading schedule:", error);
        return;
    }

    // leave_requests has no employee_name column — resolve the
    // names from profiles in one query instead of N.
    const ids = [...new Set((data || []).map(l => l.requester_profile_id))];

    const { data: profiles } = await window.sb
        .from("profiles")
        .select("id, full_name")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const names = Object.fromEntries(
        (profiles || []).map(p => [p.id, p.full_name])
    );

    (data || []).forEach(l => {
        l.employee_name = names[l.requester_profile_id] || "Unknown employee";
    });

    categorizeLeaves(data || []);
}


/******************************************************
 * CATEGORIZE LEAVES
 ******************************************************/
function categorizeLeaves(leaves) {

    const today = new Date();

    const current = [];
    const upcoming = [];
    const ended = [];

    leaves.forEach(leave => {

        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);

        // CURRENT (active today)
        if (start <= today && end >= today) {
            current.push(leave);
        }

        // UPCOMING (future)
        else if (start > today) {
            upcoming.push(leave);
        }

        // ENDED (past)
        else if (end < today) {
            ended.push(leave);
        }
    });

    renderLeaves("current-leave", current, "No active leave today");
    renderLeaves("upcoming-leave", upcoming, "No upcoming leave");
    renderLeaves("ended-leave", ended, "No completed leave");
}


/******************************************************
 * RENDER LIST
 ******************************************************/
function renderLeaves(containerId, items, emptyMessage) {

    const container = document.getElementById(containerId);

    if (!container) return;

    if (!items.length) {
        container.innerHTML = `<p>${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = items.map(leave => `
        <div class="schedule-item">
            <strong>${escapeHtml(leave.employee_name || "Employee")}</strong><br>
            <small>${escapeHtml(leave.start_date)} → ${escapeHtml(leave.end_date)}</small><br>
            <span>${escapeHtml(String(leave.days ?? "?"))} working day(s)</span>
        </div>
    `).join("");
}