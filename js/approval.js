/******************************************************
 * LEAVE APPROVAL MODULE
 ******************************************************/

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.sb) {
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

    const loading = document.getElementById("approval-loading");
    if (loading) loading.style.display = "none";

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

        // 6. Who is looking at this page?
        const me = await window.Guard.currentUser();

        // 7. Balance for each requester/type pair on screen
        const balances = {};

        await Promise.all(requests.map(async r => {
            const key = r.requester_profile_id + "|" + r.leave_type_id;
            if (balances[key]) return;
            balances[key] = await window.LeaveRules.balance(
                r.requester_profile_id, r.leave_type_id
            );
        }));

        renderTable(requests, profileMap, typeMap, balances, me);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red;">${escapeHtml(err.message)}</p>`;
    }
}


/******************************************************
 * RENDER TABLE
 ******************************************************/
function renderTable(requests, profileMap, typeMap, balances, me) {

    const container = document.getElementById("approval-table");

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Working days</th>
                    <th>Balance</th>
                    <th>Reason</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    requests.forEach(req => {

        const profile = profileMap[req.requester_profile_id] || {};
        const type = typeMap[req.leave_type_id] || {};
        const bal = balances[req.requester_profile_id + "|" + req.leave_type_id];

        // an approver must never sign off their own leave
        const isOwn = me && req.requester_profile_id === me.id;

        // flag requests that no longer fit the remaining balance
        const overBalance = bal && (req.days || 0) > bal.remaining;

        const actions = isOwn
            ? `<em class="muted-cell">Your own request</em>`
            : `<button onclick="approveLeave('${escapeHtml(req.id)}', this)"
                       ${overBalance ? "disabled title='Insufficient balance'" : ""}>
                   Approve
               </button>
               <button onclick="rejectLeave('${escapeHtml(req.id)}', this)">Reject</button>`;

        html += `
            <tr id="row-${escapeHtml(req.id)}">
                <td>${escapeHtml(profile.full_name || "Unknown")}</td>
                <td>${escapeHtml(profile.department || "-")}</td>
                <td>${escapeHtml(type.name || "-")}</td>
                <td>${escapeHtml(req.start_date)} → ${escapeHtml(req.end_date)}</td>
                <td>${escapeHtml(String(req.days ?? "-"))}</td>
                <td class="${overBalance ? "balance-short" : ""}">
                    ${bal ? `${bal.remaining} / ${bal.entitled}` : "-"}
                </td>
                <td>${escapeHtml(req.reason || "-")}</td>
                <td>${actions}</td>
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

    // Notify.decide() enforces the rules AND notifies the employee
    const { error } = await window.Notify.decide(id, "approved");

    if (error) {
        window.Notify.toast(error.message, "error");
        btn.disabled = false;
        return;
    }

    window.Notify.toast("Leave approved. The employee has been notified.", "success");

    await loadApprovals();
}


/******************************************************
 * REJECT
 ******************************************************/
async function rejectLeave(id, btn) {

    const reason = prompt("Enter rejection reason:");

    if (!reason || !reason.trim()) return;

    btn.disabled = true;

    const { error } = await window.Notify.decide(id, "rejected", reason.trim());

    if (error) {
        window.Notify.toast(error.message, "error");
        btn.disabled = false;
        return;
    }

    window.Notify.toast("Leave rejected. The employee has been notified.", "info");

    await loadApprovals();
}
