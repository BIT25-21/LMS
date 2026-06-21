/******************************************************
 * DASHBOARD MODULE
 * ----------------------------------------------------
 * Handles:
 * - Employee count
 * - Pending leave requests
 * - Employees currently on leave
 * - Total tasks
 * - Current leave list
 * - Recent leave activity
 ******************************************************/


/******************************************************
 * CHART INSTANCES
 ******************************************************/
let taskChart = null;
let leaveChart = null;

/******************************************************
 * MAIN LOADER
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});


async function loadDashboard() {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    await loadStats();
    await loadCurrentLeaveList();
    await loadRecentLeaveActivity();

}

/******************************************************
 * LOAD DASHBOARD STATS
 ******************************************************/
async function loadStats() {

    try {

        const today = new Date().toISOString().split("T")[0];

        /* ==========================================
           TOTAL EMPLOYEES
        ========================================== */
        const { count: employeeCount } = await window.sb
            .from("profiles")
            .select("*", { count: "exact", head: true });

        /* ==========================================
           PENDING REQUESTS
        ========================================== */
        const { count: pendingCount } = await window.sb
            .from("leave_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        /* ==========================================
           ON LEAVE TODAY
        ========================================== */
        const { count: onLeaveCount } = await window.sb
            .from("leave_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "approved")
            .lte("start_date", today)
            .gte("end_date", today);

        /* ==========================================
           TOTAL TASKS
        ========================================== */
        const { count: taskCount } = await window.sb
            .from("tasks")
            .select("*", { count: "exact", head: true });

        /* ==========================================
           UPDATE UI SAFELY
        ========================================== */
        const totalEmployees = document.getElementById("total-employees");
        const pendingRequests = document.getElementById("pending-requests");
        const onLeave = document.getElementById("on-leave");
        const totalTasks = document.getElementById("total-tasks");

        if (totalEmployees)
            totalEmployees.textContent = employeeCount || 0;

        if (pendingRequests)
            pendingRequests.textContent = pendingCount || 0;

        if (onLeave)
            onLeave.textContent = onLeaveCount || 0;

        if (totalTasks)
            totalTasks.textContent = taskCount || 0;

    } catch (err) {
        console.error("Dashboard stats error:", err);
    }
}

/******************************************************
 * CURRENTLY ON LEAVE LIST
 ******************************************************/
async function loadCurrentLeaveList() {

    const list = document.getElementById("on-leave-list");

    if (!list) return;

    list.innerHTML = "<li>Loading...</li>";

    try {

        const today = new Date().toISOString().split("T")[0];

        const { data: leaves, error } = await window.sb
            .from("leave_requests")
            .select("*")
            .eq("status", "approved")
            .lte("start_date", today)
            .gte("end_date", today);

        if (error) throw error;

        list.innerHTML = "";

        if (!leaves.length) {
            list.innerHTML = "<li>No employees currently on leave</li>";
            return;
        }

        for (const leave of leaves) {

            const { data: profile } = await window.sb
                .from("profiles")
                .select("full_name")
                .eq("id", leave.requester_profile_id)
                .single();

            const li = document.createElement("li");

            li.textContent =
                `${profile?.full_name || "Unknown Employee"} (${leave.start_date} → ${leave.end_date})`;

            list.appendChild(li);
        }

    } catch (err) {
        console.error("Current leave error:", err);
        list.innerHTML = "<li>Error loading data</li>";
    }
}

/******************************************************
 * RECENT LEAVE ACTIVITY
 ******************************************************/
async function loadRecentLeaveActivity() {

    const list = document.getElementById("recent-leave-list");

    if (!list) return;

    list.innerHTML = "<li>Loading...</li>";

    try {

        const { data: requests, error } = await window.sb
            .from("leave_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        list.innerHTML = "";

        if (!requests.length) {
            list.innerHTML = "<li>No leave activity found</li>";
            return;
        }

        for (const request of requests) {

            const { data: profile } = await window.sb
                .from("profiles")
                .select("full_name")
                .eq("id", request.requester_profile_id)
                .single();

            const li = document.createElement("li");

            li.textContent =
                `${profile?.full_name || "Unknown Employee"} - ${request.status}`;

            list.appendChild(li);
        }

    } catch (err) {
        console.error("Recent leave activity error:", err);
        list.innerHTML = "<li>Error loading activity</li>";
    }
}

/******************************************************
 * TASK STATUS PIE CHART
 ******************************************************/
async function loadTaskChart() {

    const canvas = document.getElementById("taskChart");

    if (!canvas) return;

    const { data, error } = await window.sb
        .from("tasks")
        .select("status");

    if (error) {
        console.error(error);
        return;
    }

    const pending =
        data.filter(t => t.status === "pending").length;

    const progress =
        data.filter(t => t.status === "in-progress").length;

    const finished =
        data.filter(t => t.status === "finished").length;

    if (taskChart) {
        taskChart.destroy();
    }

    taskChart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: [
                "Pending",
                "In Progress",
                "Finished"
            ],
            datasets: [{
                data: [
                    pending,
                    progress,
                    finished
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}