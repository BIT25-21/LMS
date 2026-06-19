/******************************************************
 * SCHEDULE MODULE
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {
    loadLeaveSchedule();
});

/**
 * Load approved leave schedule (from Supabase VIEW)
 */
async function loadLeaveSchedule() {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    const container = document.getElementById("leave-schedule");
    if (!container) return;

    const { data, error } = await window.sb
        .from("leave_schedule")   // your SQL VIEW
        .select("*")
        .order("start_date", { ascending: true });

    if (error) {
        console.error("Schedule load error:", error);
        container.innerHTML = `<p style="color:red">${error.message}</p>`;
        return;
    }

    renderSchedule(data || []);
}

/**
 * Render schedule list
 */
function renderSchedule(items) {

    const container = document.getElementById("leave-schedule");
    if (!container) return;

    if (!items.length) {
        container.innerHTML = "<p>No approved leave scheduled.</p>";
        return;
    }

    let html = `
        <table border="1" cellpadding="8" width="100%">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Days</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        html += `
            <tr>
                <td>${item.requester_name}</td>
                <td>${item.department}</td>
                <td>${item.leave_type}</td>
                <td>${item.start_date}</td>
                <td>${item.end_date}</td>
                <td>${item.days}</td>
                <td>${item.status}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    container.innerHTML = html;
}
