/******************************************************
 * TASKS MODULE 
 ******************************************************/

/**
 * INIT
 */
document.addEventListener("DOMContentLoaded", () => {
    loadEmployeesForTasks();
    loadTasks();
});

/******************************************************
 * LOAD EMPLOYEES
 ******************************************************/
async function loadEmployeesForTasks() {

    if (!window.sb) return;

    const { data, error } = await window.sb
        .from("profiles")
        .select("id, full_name");

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById("task-emp");
    select.innerHTML = `<option value="">Select employee</option>`;

    data.forEach(emp => {
        const opt = document.createElement("option");
        opt.value = emp.id;
        opt.textContent = emp.full_name;
        select.appendChild(opt);
    });
}

/******************************************************
 * ADD TASK
 ******************************************************/
async function handleAddTask(event) {
    event.preventDefault();

    const emp = document.getElementById("task-emp").value;
    const title = document.getElementById("task-title").value;
    const desc = document.getElementById("task-desc").value;
    const due = document.getElementById("task-due").value;
    const status = document.getElementById("task-status").value;

    const { error } = await window.sb
        .from("tasks")
        .insert([{
            assignee_profile_id: emp,
            title,
            description: desc,
            due_date: due,
            status
        }]);

    if (error) {
        console.error(error);
        alert("Failed to create task");
        return;
    }

    event.target.reset();
    loadTasks();
}

/******************************************************
 * LOAD TASKS
 ******************************************************/
async function loadTasks() {

    const { data, error } = await window.sb
        .from("tasks")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    // 🔥 STORE GLOBALLY for editing
    window.currentTasks = data;

    renderKanban(data || []);
}




/******************************************************
 * KANBAN RENDER
 ******************************************************/
function renderKanban(tasks) {

    const pending = document.getElementById("col-pending");
    const progress = document.getElementById("col-in-progress");
    const finished = document.getElementById("col-finished");
    const overdue = document.getElementById("col-overdue");

    pending.innerHTML = "";
    progress.innerHTML = "";
    finished.innerHTML = "";
    overdue.innerHTML = "";

    const today = new Date();

    tasks.forEach(task => {

        const card = document.createElement("div");
        card.className = "task-card";
        card.innerHTML = `
    <strong>${task.title}</strong>
    <p>${task.description || ""}</p>
    <small>${task.due_date || "No due date"}</small>

    <div style="margin-top:8px;">
        <button onclick="openEditTask(event, '${task.id}')">
            Edit
        </button>
    </div>
`;

        
        

        card.onclick = () => cycleStatus(task);

        const due = task.due_date ? new Date(task.due_date) : null;

        if (task.status === "pending") pending.appendChild(card);
        else if (task.status === "in-progress") progress.appendChild(card);
        else if (task.status === "finished") finished.appendChild(card);
        else if (due && due < today) overdue.appendChild(card);
    });
}

/******************************************************
 * STATUS CHANGE
 ******************************************************/
async function cycleStatus(task) {

    let newStatus = "pending";

    if (task.status === "pending") newStatus = "in-progress";
    else if (task.status === "in-progress") newStatus = "finished";

    const { error } = await window.sb
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

    if (error) {
        console.error(error);
        return;
    }

    loadTasks();
}

/******************************************************
 * OPEN EDIT PANEL
 ******************************************************/
function openEditTask(event, taskId) {

    event.stopPropagation(); // prevent status cycling

    const task = window.currentTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById("task-edit-panel").style.display = "block";

    document.getElementById("edit-task-id").value = task.id;
    document.getElementById("edit-task-title").value = task.title;
    document.getElementById("edit-task-desc").value = task.description || "";
    document.getElementById("edit-task-due").value = task.due_date || "";
    document.getElementById("edit-task-status").value = task.status;
}

/******************************************************
 * SAVE EDIT
 ******************************************************/
async function saveTaskEdit() {

    const id = document.getElementById("edit-task-id").value;

    const title = document.getElementById("edit-task-title").value;
    const description = document.getElementById("edit-task-desc").value;
    const due_date = document.getElementById("edit-task-due").value;
    const status = document.getElementById("edit-task-status").value;

    const { error } = await window.sb
        .from("tasks")
        .update({
            title,
            description,
            due_date,
            status
        })
        .eq("id", id);

    if (error) {
        console.error("Update failed:", error);
        alert("Update failed");
        return;
    }

    cancelTaskEdit();
    loadTasks();
}

/******************************************************
 * CANCEL EDIT
 ******************************************************/
function cancelTaskEdit() {
    document.getElementById("task-edit-panel").style.display = "none";
}