/******************************************************
 * LEAVE APPROVAL MODULE (STABLE VERSION)
 * ----------------------------------------------------
 * FIXES:
 * - Supabase relationship errors (PGRST200)
 * - Broken joins on leave_requests
 * - Safe manual joins
 ******************************************************/

/**
 * INIT
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {

    const sb = window.sb;

    if (!sb) {
        console.error("❌ Supabase not initialized");
        return;
    }

    await loadApprovals();
});


/**
 * LOAD APPROVAL DATA
 ******************************************************/
async function loadApprovals() {

    const sb = window.sb;

    const container = document.getElementById("approval-table");

    if (!container) return;

    try {

        /**************************************************
         * STEP 1: FETCH LEAVE REQUESTS (NO JOINS)
         **************************************************/
        const { data: requests, error } = await sb
            .from("leave_requests")
            .select("*")
            .eq("status", "pending")
            .order("submitted_at", { ascending: false });

        if (error) {
            console.error("Load error:", error);
            container.innerHTML = `<p style="color:red;">${error.message}</p>`;
            return;
        }

        if (!requests || requests.length === 0) {
            container.innerHTML = "<p>No pending requests</p>";
            return;
        }


        /**************************************************
         * STEP 2: COLLECT IDS
         **************************************************/
        const profileIds = [...new Set(requests.map(r => r.requester_profile_id))];
        const typeIds = [...new Set(requests.map(r => r.leave_type_id))];


        /**************************************************
         * STEP 3: FETCH PROFILES
         **************************************************/
        const { data: profiles } = await sb
            .from("profiles")
            .select("id, full_name, department")
            .in("id", profileIds);


        /**************************************************
         * STEP 4: FETCH LEAVE TYPES
         **************************************************/
        const { data: leaveTypes } = await sb
            .from("leave_types")
            .select("id, name")
            .in("id", typeIds);


        /**************************************************
         * STEP 5: MAP DATA
         **************************************************/
        const profileMap = Object.fromEntries(
            (profiles || []).map(p => [p.id, p])
        );

        const typeMap = Object.fromEntries(
            (leaveTypes || []).map(t => [t.id, t])
        );


        /**************************************************
         * STEP 6: RENDER TABLE
         **************************************************/
        renderTable(requests, profileMap, typeMap);

    } catch (err) {
        console.error("Approval module error:", err);
    }
}


/**
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

        const profile = profileMap[req.requester_profile_id];
        const type = typeMap[req.leave_type_id];

        html += `
            <tr>
                <td>${profile?.full_name || "Unknown"}</td>
                <td>${profile?.department || "-"}</td>
                <td>${type?.name || "-"}</td>
                <td>${req.start_date} → ${req.end_date}</td>
                <td>${req.reason || "-"}</td>
                <td>
                    <button onclick="approveLeave('${req.id}')">Approve</button>
                    <button onclick="rejectLeave('${req.id}')">Reject</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}


/**
 * APPROVE LEAVE
 ******************************************************/
async function approveLeave(id) {

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
        return;
    }

    alert("Leave approved ✔");
    loadApprovals();
}


/**
 * REJECT LEAVE
 ******************************************************/
async function rejectLeave(id) {

    const sb = window.sb;

    const reason = prompt("Enter rejection reason:");

    if (!reason) return;

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
        return;
    }

    alert("Leave rejected ❌");
    loadApprovals();
}