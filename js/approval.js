/******************************************************
 * LEAVE APPROVAL MODULE (PRODUCTION CLEAN VERSION)
 ******************************************************/

document.addEventListener("DOMContentLoaded", async () => {

    const sb = window.sb;

    if (!sb) {
        console.error("Supabase not initialized");
        return;
    }

    await loadApprovals();
});


/******************************************************
 * LOAD APPROVALS
 ******************************************************/
async function loadApprovals() {

    const sb = window.sb;
    const container = document.getElementById("approval-table");

    if (!container) return;

    container.innerHTML = "<p>Loading approvals...</p>";

    try {

        // 1. Get pending requests
        const { data: requests, error } = await sb
            .from("leave_requests")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!requests || requests.length === 0) {
            container.innerHTML = "<p>No pending requests</p>";
            return;
        }

        // 2. Extract IDs
        const profileIds = [...new Set(requests.map(r => r.requester_profile_id))];
        const typeIds = [...new Set(requests.map(r => r.leave_type_id))];

        // 3. Fetch profiles
        const { data: profiles } = await sb
            .from("profiles")
            .select("id, full_name, department")
            .in("id", profileIds);

        // 4. Fetch leave types
        const { data: types } = await sb
            .from("leave_types")
            .select("id, name")
            .in("id", typeIds);

        // 5. Build maps
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        const typeMap = Object.fromEntries((types || []).map(t => [t.id, t]));

        // 6. Render
        renderTable(requests, profileMap, typeMap);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}


/******************************************************
 * RENDER TABLE
 ******************************************************/
function renderTable(requests, profileMap, typeMap) {

    const container = document.getElementById("approval-table");

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    requests.forEach(req => {

        const profile = profileMap[req.requester_profile_id] || {};
        const type = typeMap[req.leave_type_id] || {};

        html += `
            <tr id="row-${req.id}">
                <td>${profile.full_name || "Unknown"}</td>
                <td>${profile.department || "-"}</td>
                <td>${type.name || "-"}</td>
                <td>${req.start_date} → ${req.end_date}</td>
                <td>${req.reason || "-"}</td>
                <td>
                    <button onclick="approveLeave('${req.id}', this)">Approve</button>
                    <button onclick="rejectLeave('${req.id}', this)">Reject</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;

    container.innerHTML = html;
}


/******************************************************
 * APPROVE
 ******************************************************/
async function approveLeave(id, btn) {

    btn.disabled = true;

    const sb = window.sb;

    const { error } = await sb
        .from("leave_requests")
        .update({
            status: "approved",
            decision_at: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        alert("Approval failed: " + error.message);
        btn.disabled = false;
        return;
    }

    await loadApprovals();
}


/******************************************************
 * REJECT
 ******************************************************/
async function rejectLeave(id, btn) {

    const reason = prompt("Enter rejection reason:");

    if (!reason) return;

    btn.disabled = true;

    const sb = window.sb;

    const { error } = await sb
        .from("leave_requests")
        .update({
            status: "rejected",
            rejection_reason: reason,
            decision_at: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        alert("Rejection failed: " + error.message);
        btn.disabled = false;
        return;
    }

    await loadApprovals();
}