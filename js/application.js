/******************************************************
 * LEAVE APPLICATION MODULE
 ******************************************************/

console.log("Leave module loaded");

let applicant = null;   // the signed-in user


// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    try {
        applicant = await window.Guard.currentUser();

        await loadEmployeesDropdown();
        await loadLeaveTypes();

        attachLivePreview();

        document
            .getElementById("leave-request-form")
            ?.addEventListener("submit", submitLeave);

    } catch (err) {
        console.error("Init error:", err);
    }
});


// =====================================================
// LOAD EMPLOYEES
// -----------------------------------------------------
// An employee may only apply for themselves. Only HR /
// managers / admins get a real dropdown, because they
// legitimately file leave on someone's behalf.
// =====================================================
async function loadEmployeesDropdown() {

    const select = document.getElementById("leave-emp");
    if (!select) return;

    if (applicant && !window.Guard.isApprover(applicant)) {

        select.innerHTML = `
            <option value="${escapeHtml(applicant.id)}" selected>
                ${escapeHtml(applicant.full_name || applicant.email)}
            </option>`;

        // locked, but still submitted with the form
        select.disabled = true;
        select.dataset.lockedTo = applicant.id;

        const hint = document.createElement("small");
        hint.className = "form-hint";
        hint.textContent = "You can only apply for your own leave.";
        select.after(hint);

        return;
    }

    const { data } = await window.sb
        .from("profiles")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name");

    select.innerHTML = `<option value="">Select employee</option>`;

    (data || []).forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.id;
        opt.textContent = `${emp.full_name} (${emp.role})`;
        select.appendChild(opt);
    });
}


// =====================================================
// LOAD LEAVE TYPES
// =====================================================
async function loadLeaveTypes() {

    const select = document.getElementById("leave-type");
    if (!select) return;

    const { data } = await window.sb
        .from("leave_types")
        .select("id, name, default_days")
        .order("name");

    select.innerHTML = `<option value="">Select leave type</option>`;

    (data || []).forEach(type => {
        const opt = document.createElement("option");
        opt.value = type.id;
        opt.textContent = `${type.name} (${type.default_days} days/year)`;
        select.appendChild(opt);
    });
}


// =====================================================
// LIVE PREVIEW
// -----------------------------------------------------
// Shows chargeable working days and the remaining balance
// as the form is filled, so nobody submits a request that
// is going to be rejected on arithmetic.
// =====================================================
function attachLivePreview() {

    const form = document.getElementById("leave-request-form");
    if (!form) return;

    const box = document.createElement("div");
    box.id = "leave-preview";
    box.className = "leave-preview";
    box.hidden = true;

    form.querySelector("button[type=submit]")?.before(box);

    // no back-dated leave
    const start = document.getElementById("start-date");
    if (start) start.min = todayISO();

    ["leave-emp", "leave-type", "start-date", "end-date"].forEach(id => {
        document.getElementById(id)
            ?.addEventListener("change", updatePreview);
    });
}

async function updatePreview() {

    const box = document.getElementById("leave-preview");
    if (!box) return;

    const employeeId = selectedEmployeeId();
    const leaveTypeId = document.getElementById("leave-type").value;
    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;

    if (!employeeId || !leaveTypeId || !start || !end) {
        box.hidden = true;
        return;
    }

    box.hidden = false;
    box.className = "leave-preview";
    box.textContent = "Checking…";

    const result = await window.LeaveRules.validate({
        profileId: employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end
    });

    const calendar = countCalendarDays(start, end);

    if (!result.ok) {
        box.classList.add("leave-preview-error");
        box.innerHTML = `<strong>Cannot submit</strong><span>${escapeHtml(result.reason)}</span>`;
        return;
    }

    const skipped = calendar - result.days;

    box.classList.add("leave-preview-ok");
    box.innerHTML = `
        <strong>${result.days} working day(s) will be charged</strong>
        <span>
            ${calendar} calendar day(s)
            ${skipped > 0 ? `— ${skipped} weekend/holiday day(s) not counted` : ""}
        </span>
        <span>
            ${escapeHtml(result.balance.type)}:
            ${result.balance.remaining} of ${result.balance.entitled} day(s) remaining
            → ${result.balance.remaining - result.days} left after this request
        </span>
    `;
}


// =====================================================
// WHICH EMPLOYEE?
// A disabled <select> is not submitted, so read the lock.
// =====================================================
function selectedEmployeeId() {

    const select = document.getElementById("leave-emp");
    if (!select) return null;

    return select.dataset.lockedTo || select.value;
}


// =====================================================
// CHECK TASKS (BUSINESS RULE)
// tasks.status is pending | in_progress | done
// =====================================================
async function canApplyLeave(employeeId) {

    const { data, error } = await window.sb
        .from("tasks")
        .select("id, title")
        .eq("assignee_profile_id", employeeId)
        .in("status", ["pending", "in_progress"]);

    if (error) {
        console.error(error);
        return { ok: false, reason: "Could not verify outstanding tasks." };
    }

    if ((data || []).length) {
        return {
            ok: false,
            reason: `${data.length} unfinished task(s) must be closed first `
                  + `— e.g. "${data[0].title}".`
        };
    }

    return { ok: true };
}


// =====================================================
// SUBMIT LEAVE
// =====================================================
async function submitLeave(event) {

    event.preventDefault();

    const submitBtn = event.target.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = true;

    try {
        const employeeId = selectedEmployeeId();
        const leaveTypeId = document.getElementById("leave-type").value;
        const start = document.getElementById("start-date").value;
        const end = document.getElementById("end-date").value;
        const reason = document.getElementById("leave-reason").value.trim();

        // an employee cannot file on someone else's behalf, even
        // if the disabled <select> is re-enabled in devtools
        if (applicant
            && !window.Guard.isApprover(applicant)
            && employeeId !== applicant.id) {
            return fail("You can only apply for your own leave.");
        }

        // 1. dates, overlap and balance
        const check = await window.LeaveRules.validate({
            profileId: employeeId,
            leaveTypeId,
            startDate: start,
            endDate: end
        });

        if (!check.ok) return fail(check.reason);

        // 2. outstanding tasks
        const tasks = await canApplyLeave(employeeId);
        if (!tasks.ok) return fail(tasks.reason);

        // 3. save — days is WORKING days, not calendar days
        const { data: request, error } = await window.sb
            .from("leave_requests")
            .insert([{
                requester_profile_id: employeeId,
                leave_type_id: leaveTypeId,
                start_date: start,
                end_date: end,
                days: check.days,
                reason,
                status: "pending"
            }])
            .select("id")
            .single();

        if (error) {
            console.error(error);
            return fail("Failed to submit leave: " + error.message);
        }

        // 4. 🔔 notify every approver
        await window.Notify.leaveRequested(request.id, employeeId);

        window.Notify.toast(
            `Leave submitted — ${check.days} working day(s). Your approver has been notified.`,
            "success"
        );

        event.target.reset();

        const preview = document.getElementById("leave-preview");
        if (preview) preview.hidden = true;

    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}


function fail(message) {
    window.Notify
        ? window.Notify.toast(message, "error")
        : alert(message);
}
