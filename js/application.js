/******************************************************
 * LEAVE APPLICATION MODULE (PRODUCTION READY)
 ******************************************************/

console.log("Leave module loaded");

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {

    console.log("Application module loaded");

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    try {
        await loadEmployeesDropdown();
        await loadLeaveTypes();

        document
            .getElementById("leave-request-form")
            ?.addEventListener("submit", submitLeave);

    } catch (err) {
        console.error("Init error:", err);
    }
});


// =====================================================
// LOAD EMPLOYEES
// =====================================================
async function loadEmployeesDropdown() {

    const select = document.getElementById("leave-emp");

    const { data } = await window.sb
        .from("profiles")
        .select("id, full_name, role")
        .neq("role", "admin");

    select.innerHTML = `<option value="">Select employee</option>`;

    data.forEach(emp => {
        select.innerHTML += `
            <option value="${emp.id}">
                ${emp.full_name}
            </option>`;
    });
}


// =====================================================
// LOAD LEAVE TYPES
// =====================================================
async function loadLeaveTypes() {

    const select = document.getElementById("leave-type");

    const { data } = await window.sb
        .from("leave_types")
        .select("id, name, default_days");

    select.innerHTML = `<option value="">Select leave type</option>`;

    data.forEach(type => {
        select.innerHTML += `
            <option value="${type.id}">
                ${type.name} (${type.default_days} days)
            </option>`;
    });
}


// =====================================================
// CHECK TASKS (BUSINESS RULE)
// =====================================================
async function canApplyLeave(employeeId) {

    const { data, error } = await window.sb
        .from("tasks")
        .select("id")
        .eq("assignee_profile_id", employeeId)
        .neq("status", "finished");

    if (error) {
        console.error(error);
        return false;
    }

    return (data || []).length === 0;
}


// =====================================================
// SUBMIT LEAVE
// =====================================================
async function submitLeave(event) {

    event.preventDefault();

    const employeeId = document.getElementById("leave-emp").value;
    const leaveType = document.getElementById("leave-type").value;
    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;
    const reason = document.getElementById("leave-reason").value;

    if (!employeeId || !leaveType) {
        alert("Missing fields");
        return;
    }

    // 🔒 TASK CHECK (IMPORTANT RULE)
    const allowed = await canApplyLeave(employeeId);

    if (!allowed) {
        alert("This employee has pending tasks. Cannot apply for leave.");
        return;
    }

    const days =
        Math.floor((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await window.sb
        .from("leave_requests")
        .insert([{
            requester_profile_id: employeeId,
            leave_type_id: leaveType,
            start_date: start,
            end_date: end,
            days,
            reason,
            status: "pending"
        }]);

    if (error) {
        console.error(error);
        alert("Failed to submit leave");
        return;
    }

    alert("Leave submitted successfully");
    event.target.reset();
}