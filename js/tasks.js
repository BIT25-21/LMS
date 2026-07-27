/******************************************************
 * TASKS MODULE (FIXED + SCHEMA MATCHED)
 ******************************************************/

console.log("Tasks module loaded");

initTasks();

// =====================================================
// INIT
// =====================================================
function initTasks() {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    loadEmployeesForTasks();
    loadTasks();

    const form = document.getElementById("add-task-form");
    if (form) {
        form.addEventListener("submit", handleAddTask);
    }
}


// =====================================================
// LOAD EMPLOYEES
// =====================================================
async function loadEmployeesForTasks() {

    const select = document.getElementById("task-emp");
    if (!select) return;

    const { data, error } = await window.sb
        .from("profiles")
        .select("id, full_name, role")
        .neq("role", "admin")
        .order("full_name");

    if (error) {
        console.error("Employee load error:", error);
        return;
    }

    select.innerHTML = `<option value="">Select employee</option>`;

    (data || []).forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.id;
        opt.textContent = `${emp.full_name} (${emp.role})`;
        select.appendChild(opt);
    });
}


// =====================================================
// CREATE TASK
// =====================================================
async function handleAddTask(event) {

    event.preventDefault();

    const assignee_profile_id = document.getElementById("task-emp").value;
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-desc").value.trim();
    const due_date = document.getElementById("task-due").value;
    const status = document.getElementById("task-status").value;

    if (!assignee_profile_id || !title) {
        alert("Employee and title are required");
        return;
    }

    const { error } = await window.sb
        .from("tasks")
        .insert([{
            assignee_profile_id,
            title,
            description,
            due_date: due_date || null,
            status: normalizeStatus(status)
        }]);

    if (error) {
        console.error("Task insert error:", error);
        alert(error.message);
        return;
    }

    event.target.reset();
    await loadTasks();
}


// =====================================================
// STATUS NORMALISER
// The <select> options use "in-progress"/"finished" but the
// tasks table stores "in_progress"/"done". Without this the
// task lands in a status no kanban column matches.
// =====================================================
function normalizeStatus(value) {

    if (value === "finished" || value === "done") return "done";
    if (value === "in-progress" || value === "in_progress") return "in_progress";

    return "pending";
}


// =====================================================
// LOAD TASKS
// =====================================================
async function loadTasks() {

    const { data, error } = await window.sb
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load tasks error:", error);
        return;
    }

    window.currentTasks = data || [];
    renderKanban(data || []);
}


// =====================================================
// KANBAN RENDER
// =====================================================
function renderKanban(tasks) {

    const cols = {
        pending: document.getElementById("col-pending"),
        in_progress: document.getElementById("col-in-progress"),
        done: document.getElementById("col-finished"),
        overdue: document.getElementById("col-overdue")
    };

    if (!cols.pending || !cols.in_progress || !cols.done || !cols.overdue) {
        console.error("Missing kanban columns");
        return;
    }

    Object.values(cols).forEach(c => c.innerHTML = "");

    const today = new Date();

    tasks.forEach(task => {

        const card = document.createElement("div");
        card.className = "task-card";

        const isOverdue =
            task.due_date &&
            new Date(task.due_date) < today &&
            task.status !== "done";

        card.innerHTML = `
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.description)}</p>
            <small>${escapeHtml(task.due_date || "No due date")}</small>
            ${isOverdue ? "<p style='color:red;'>Overdue</p>" : ""}
        `;

        card.onclick = () => cycleStatus(task);

        if (isOverdue) cols.overdue.appendChild(card);
        else if (task.status === "pending") cols.pending.appendChild(card);
        else if (task.status === "in_progress") cols.in_progress.appendChild(card);
        else if (task.status === "done") cols.done.appendChild(card);
    });
}


// =====================================================
// STATUS CYCLE
// =====================================================
async function cycleStatus(task) {

    let newStatus = "pending";

    if (task.status === "pending") newStatus = "in_progress";
    else if (task.status === "in_progress") newStatus = "done";

    const { error } = await window.sb
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

    if (error) {
        console.error(error);
        return;
    }

    await loadTasks();
}


// =====================================================
// EDIT TASK
// =====================================================
function openEditTask(event, taskId) {

    event.stopPropagation();

    const task = window.currentTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById("task-edit-panel").style.display = "block";

    document.getElementById("edit-task-id").value = task.id;
    document.getElementById("edit-task-title").value = task.title;
    document.getElementById("edit-task-desc").value = task.description || "";
    document.getElementById("edit-task-due").value = task.due_date || "";
    document.getElementById("edit-task-status").value = task.status;
}


// =====================================================
// SAVE EDIT
// =====================================================
async function saveTaskEdit() {

    const id = document.getElementById("edit-task-id").value;

    const { error } = await window.sb
        .from("tasks")
        .update({
            title: document.getElementById("edit-task-title").value,
            description: document.getElementById("edit-task-desc").value,
            due_date: document.getElementById("edit-task-due").value || null,
            status: normalizeStatus(document.getElementById("edit-task-status").value)
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    cancelTaskEdit();
    await loadTasks();
}


// =====================================================
// CANCEL EDIT
// =====================================================
function cancelTaskEdit() {
    document.getElementById("task-edit-panel").style.display = "none";
}