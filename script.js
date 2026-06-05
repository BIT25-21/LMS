// Simple Leave Management System
// Minimal JavaScript focused on data storage and basic operations
//
// This script is intentionally organized around page features:
// - data persistence via localStorage
// - employee and leave request management
// - task tracking with filters and timeline
// - shared navigation rendering and badges
// - page initialization for each HTML page

// Initialize data from localStorage or use defaults
function getData(key, defaultValue) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
}

// Save JSON-serializable data in localStorage for later reload
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Get or initialize employees
let employees = getData('employees', [
    { id: 1, name: 'John Doe', email: 'john@example.com', department: 'Engineering', leaveBalance: 20 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', department: 'HR', leaveBalance: 18 },
    { id: 3, name: 'Alice Johnson', email: 'alice@example.com', department: 'Sales', leaveBalance: 15 },
    { id: 4, name: 'Bob Wilson', email: 'bob@example.com', department: 'Engineering', leaveBalance: 22 }
]);

// Get or initialize leave requests
let leaveRequests = getData('leaveRequests', []);

// Show a temporary notification toast for user feedback.
function notify(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ===== DASHBOARD =====
// Count and display the key metrics on the dashboard page.
function updateDashboard() {
    const totalEmployees = employees.length;
    const approvedLeaves = leaveRequests.filter(r => r.status === 'approved').length;
    const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;
    
    const today = new Date();
    const onLeaveToday = leaveRequests.filter(r => {
        if (r.status !== 'approved') return false;
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return today >= start && today <= end;
    }).length;
    
    document.getElementById('total-employees').textContent = totalEmployees;
    document.getElementById('on-leave').textContent = onLeaveToday;
    document.getElementById('pending-requests').textContent = pendingRequests;
    document.getElementById('approved-leaves').textContent = approvedLeaves;
}

// ===== EMPLOYEE MANAGEMENT =====
// Employee CRUD helpers and UI refresh functions for the employee page.
function addEmployee(event) {
    event.preventDefault();
    
    const name = document.getElementById('emp-name').value.trim();
    const email = document.getElementById('emp-email').value.trim();
    const dept = document.getElementById('emp-dept').value.trim();
    
    if (!name || !email || !dept) {
        notify('Please fill all fields', 'error');
        return;
    }
    
    const newEmployee = {
        id: Date.now(),
        name: name,
        email: email,
        department: dept,
        leaveBalance: 20
    };
    
    employees.push(newEmployee);
    saveData('employees', employees);
    
    event.target.reset();
    refreshEmployeeTable();
    refreshEmployeeDropdown();
    notify(`${name} added successfully`, 'success');
}

function deleteEmployee(id) {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;
    
    if (confirm(`Delete ${employee.name}?`)) {
        employees = employees.filter(e => e.id !== id);
        saveData('employees', employees);
        refreshEmployeeTable();
        refreshEmployeeDropdown();
        notify(`${employee.name} removed`, 'success');
    }
}

function refreshEmployeeTable() {
    const table = document.getElementById('employees-table');
    if (!table) return;
    
    let html = '<table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Leave Balance</th><th>Action</th></tr></thead><tbody>';
    
    employees.forEach(emp => {
        html += `
            <tr>
                <td>${emp.name}</td>
                <td>${emp.email}</td>
                <td>${emp.department}</td>
                <td><strong>${emp.leaveBalance}</strong> days</td>
                <td><button class="btn-small danger" onclick="deleteEmployee(${emp.id})">Delete</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    table.innerHTML = html;
}

function refreshEmployeeDropdown() {
    const dropdown = document.getElementById('leave-emp');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Select employee</option>';
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} (${emp.leaveBalance} days)`;
        dropdown.appendChild(option);
    });
}

// Populate employee selects used outside leave form (e.g., tasks page)
function populateEmployeeSelects() {
    const selects = document.querySelectorAll('select#task-emp');
    selects.forEach(sel => {
        sel.innerHTML = '<option value="">Select employee</option>';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = `${emp.name} (${emp.leaveBalance} days)`;
            sel.appendChild(opt);
        });
    });
}

// Task filters and sorting state
let taskFilterEmployee = '';
let taskSortMode = 'due-asc';

function setTaskFilterEmployee(empId) {
    taskFilterEmployee = empId || '';
    // also populate the edit page select if present
    refreshTaskList();
    refreshTaskTimeline();
}

function setTaskSortMode(mode) {
    taskSortMode = mode || 'due-asc';
    refreshTaskList();
    refreshTaskTimeline();
}

function populateFilterEmployeeSelect() {
    const sel = document.getElementById('timeline-filter-emp');
    if (!sel) return;
    sel.innerHTML = '<option value="">All employees</option>';
    employees.forEach(emp => {
        const o = document.createElement('option');
        o.value = emp.id;
        o.textContent = emp.name;
        sel.appendChild(o);
    });
}

// ----- Task edit workflow -----
function startEditTask(taskId) {
    const tasks = getTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    document.getElementById('edit-task-id').value = t.id;
    document.getElementById('edit-task-title').value = t.title || '';
    document.getElementById('edit-task-desc').value = t.description || '';
    document.getElementById('edit-task-due').value = t.dueDate || '';
    document.getElementById('edit-task-status').value = t.status || 'pending';
    document.getElementById('task-edit').style.display = 'block';
}

function cancelEditTask() {
    document.getElementById('task-edit').style.display = 'none';
}

function saveEditedTask() {
    const id = Number(document.getElementById('edit-task-id').value);
    const title = document.getElementById('edit-task-title').value.trim();
    const desc = document.getElementById('edit-task-desc').value.trim();
    const due = document.getElementById('edit-task-due').value || null;
    const status = document.getElementById('edit-task-status').value || 'pending';
    const tasks = getTasks();
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.title = title;
    t.description = desc;
    t.dueDate = due;
    t.status = status;
    saveTasks(tasks);
    cancelEditTask();
    refreshTaskList();
    refreshTaskTimeline();
    updateNavBadges();
}

// ===== LEAVE REQUEST =====
// Validate leave requests, enforce business rules, and save pending leave submissions.
function submitLeave(event) {
    event.preventDefault();
    
    const empId = parseInt(document.getElementById('leave-emp').value);
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const leaveType = document.getElementById('leave-type').value;
    const reason = document.getElementById('leave-reason').value.trim();
    
    if (!empId || !startDate || !endDate || !leaveType || !reason) {
        notify('Please fill all fields', 'error');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
        notify('End date must be after start date', 'error');
        return;
    }
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const employee = employees.find(e => e.id === empId);
    
    if (!employee) {
        notify('Employee not found', 'error');
        return;
    }
    
    if (days > employee.leaveBalance) {
        notify(`Insufficient balance. Available: ${employee.leaveBalance} days`, 'error');
        return;
    }

    // Business rule: employee cannot take leave if they have incomplete tasks
    if (hasIncompleteTasks(empId)) {
        notify('Cannot take leave: employee has incomplete tasks', 'error');
        return;
    }

    // Business rule: maximum 14 days in any rolling 6-month period
    const usedDays = leaveDaysInLastSixMonths(empId);
    if (usedDays + days > 14) {
        notify(`Leave denied. Employee already used ${usedDays} days in the past 6 months. Max 14 days allowed.`, 'error');
        return;
    }
    
    const request = {
        id: Date.now(),
        employeeId: empId,
        employeeName: employee.name,
        startDate: startDate,
        endDate: endDate,
        days: days,
        leaveType: leaveType,
        reason: reason,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };
    
    leaveRequests.push(request);
    saveData('leaveRequests', leaveRequests);
    
    event.target.reset();
    notify('Leave request submitted', 'success');
    // Push a lightweight notification so approvers see new requests on the approval page
    pushNotification(`New leave request from ${employee.name}`, 'info');
    refreshApprovalNotifications();
    updateNavBadges();
    updateDashboard();
}

// ===== Notifications (simple localStorage-based) =====
function getNotifications() {
    return getData('notifications', []);
}

function saveNotifications(list) {
    saveData('notifications', list);
}

function pushNotification(message, type = 'info') {
    const list = getNotifications();
    list.unshift({ id: Date.now(), message: message, type: type, createdAt: new Date().toISOString(), read: false });
    // keep recent 50
    saveNotifications(list.slice(0,50));
}

function clearNotifications() {
    saveNotifications([]);
    refreshApprovalNotifications();
}

function refreshApprovalNotifications() {
    const el = document.getElementById('approval-notifs');
    if (!el) return;
    const nots = getNotifications();
    if (nots.length === 0) {
        el.innerHTML = '<p class="muted">No notifications</p>';
        return;
    }
    let html = '<div class="notifs-header"><strong>Notifications</strong> <button class="btn-small" onclick="clearNotifications()">Clear</button></div><ul class="approval-notifs">';
    nots.forEach(n => {
        html += `<li class="notif-${n.type}"><small>${new Date(n.createdAt).toLocaleString()}</small> — ${escapeHtml(n.message)}</li>`;
    });
    html += '</ul>';
    el.innerHTML = html;
}

// Try to resolve currently logged-in user to an employee and pre-select on the application form
function getCurrentEmployeeFromAccount() {
    const userName = (localStorage.getItem('userName') || '').toLowerCase();
    if (!userName) return null;
    // match by email prefix or by name fragments
    let emp = employees.find(e => e.email && e.email.toLowerCase().startsWith(userName));
    if (emp) return emp;
    emp = employees.find(e => e.name && e.name.toLowerCase().includes(userName));
    return emp || null;
}

function populateLeaveFormForCurrentUser() {
    const sel = document.getElementById('leave-emp');
    if (!sel) return;
    const emp = getCurrentEmployeeFromAccount();
    if (!emp) return;
    // Set selection and disable to prevent choosing another employee by mistake
    sel.value = emp.id;
    sel.disabled = true;
    // Optionally show a small hint
    let hint = document.getElementById('leave-emp-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'leave-emp-hint';
        hint.style.fontSize = '13px';
        hint.style.marginBottom = '8px';
        sel.parentNode.insertBefore(hint, sel.nextSibling);
    }
    hint.textContent = `Applying as ${emp.name}`;
}

// ===== TASKS =====
function getTasks() {
    return getData('tasks', []);
}

function saveTasks(tasks) {
    saveData('tasks', tasks);
}

function addTaskForEmployee(employeeId, title, description, dueDate, status) {
    const tasks = getTasks();
    const task = {
        id: Date.now(),
        employeeId: Number(employeeId),
        title: title || 'Untitled Task',
        description: description || '',
        status: status || 'pending', // pending, in-progress, finished
        dueDate: dueDate || null,
        createdAt: new Date().toISOString()
    };
    tasks.push(task);
    saveTasks(tasks);
    notify('Task added', 'success');
    refreshTaskList();
    refreshTaskTimeline();
    updateNavBadges();
}

function setTaskStatus(taskId, newStatus) {
    const tasks = getTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    t.status = newStatus;
    saveTasks(tasks);
    refreshTaskList();
    refreshTaskTimeline();
    updateNavBadges();
}

function refreshTaskList() {
    const container = document.getElementById('tasks-table');
    if (!container) return;
    const tasks = getTasks();

    // Apply employee filter
    let list = tasks.slice();
    if (taskFilterEmployee) list = list.filter(t => String(t.employeeId) === String(taskFilterEmployee));

    // Apply sort
    if (taskSortMode === 'due-asc') {
        list.sort((a,b) => (a.dueDate || '') > (b.dueDate || '') ? 1 : -1);
    } else if (taskSortMode === 'due-desc') {
        list.sort((a,b) => (a.dueDate || '') < (b.dueDate || '') ? 1 : -1);
    } else if (taskSortMode === 'created-desc') {
        list.sort((a,b) => b.id - a.id);
    }

    let html = '<table><thead><tr><th>Employee</th><th>Title</th><th>Description</th><th>Status</th><th>Action</th></tr></thead><tbody>';
    if (list.length === 0) {
        html += '<tr><td colspan="5" style="text-align:center">No tasks</td></tr>';
    } else {
        list.forEach(t => {
            const emp = employees.find(e => e.id === t.employeeId);
            // compute effective status (auto-mark delayed)
            let effective = t.status || 'pending';
            if (effective !== 'finished' && t.dueDate) {
                const due = new Date(t.dueDate + 'T23:59:59');
                const now = new Date();
                if (due < now && effective !== 'finished') effective = 'delayed';
            }
            const actions = [];
            if (effective !== 'in-progress' && effective !== 'finished') actions.push(`<button class="btn-small" onclick="setTaskStatus(${t.id}, 'in-progress')">Start</button>`);
            if (effective !== 'finished') actions.push(`<button class="btn-small success" onclick="setTaskStatus(${t.id}, 'finished')">Complete</button>`);
            if (effective === 'finished') actions.push(`<button class="btn-small" onclick="setTaskStatus(${t.id}, 'pending')">Reopen</button>`);

            html += `<tr>
                <td>${emp ? emp.name : 'Unknown'}</td>
                <td>${escapeHtml(t.title)}</td>
                <td>${escapeHtml(t.description)}${t.dueDate ? ' <br><small>Due: ' + t.dueDate + '</small>' : ''}</td>
                <td>${effective}</td>
                <td>${actions.join(' ')} <button class="btn-small" onclick="startEditTask(${t.id})">Edit</button></td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function hasIncompleteTasks(employeeId) {
    const tasks = getTasks();
    return tasks.some(t => Number(t.employeeId) === Number(employeeId) && (t.status === 'pending' || t.status === 'in-progress' || (!t.status && !t.completed)));
}

function refreshTaskTimeline() {
    const tasks = getTasks();
    const pending = [];
    const inProgress = [];
    const delayed = [];
    const finished = [];
    const now = new Date();
    tasks.forEach(t => {
        let s = t.status || 'pending';
        if (s !== 'finished' && t.dueDate) {
            const due = new Date(t.dueDate + 'T23:59:59');
            if (due < now) s = 'delayed';
        }
        if (s === 'pending') pending.push(t);
        else if (s === 'in-progress') inProgress.push(t);
        else if (s === 'delayed') delayed.push(t);
        else if (s === 'finished') finished.push(t);
    });

    function renderList(elId, list) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (list.length === 0) { el.innerHTML = `<p><em>No tasks</em></p>`; return; }
        let html = '<ul class="task-timeline">';
        list.forEach(t => {
            const emp = employees.find(e => e.id === t.employeeId);
            html += `<li><strong>${escapeHtml(t.title)}</strong> — ${emp ? emp.name : 'Unknown'}<br><small>${escapeHtml(t.description || '')}${t.dueDate ? ' • due ' + t.dueDate : ''}</small><br>
                <div style="margin-top:6px">${t.status !== 'in-progress' ? `<button class="btn-small" onclick="setTaskStatus(${t.id}, 'in-progress')">Start</button>` : ''} ${t.status !== 'finished' ? `<button class="btn-small success" onclick="setTaskStatus(${t.id}, 'finished')">Complete</button>` : ''}</div>
            </li>`;
        });
        html += '</ul>';
        el.innerHTML = html;
    }

    renderList('timeline-pending', pending);
    renderList('timeline-in-progress', inProgress);
    renderList('timeline-delayed', delayed);
    renderList('timeline-finished', finished);
}

function leaveDaysInLastSixMonths(employeeId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const approved = leaveRequests.filter(r => r.status === 'approved' && Number(r.employeeId) === Number(employeeId));
    let used = 0;
    approved.forEach(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        // Only count days that fall within the last six months
        const s = start < sixMonthsAgo ? new Date(sixMonthsAgo) : start;
        const e = end;
        if (e < sixMonthsAgo) return; // entirely before window
        const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
        used += days;
    });
    return used;
}

// ===== APPROVALS =====
// Leave approval workflow shown on the approval page.
function approveLeave(requestId) {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    request.status = 'approved';
    const employee = employees.find(e => e.id === request.employeeId);
    if (employee) {
        employee.leaveBalance -= request.days;
    }
    
    saveData('leaveRequests', leaveRequests);
    saveData('employees', employees);
    
    refreshApprovalTable();
    updateDashboard();
    notify(`Leave approved for ${request.employeeName}`, 'success');
    updateNavBadges();
}

function rejectLeave(requestId) {
    const request = leaveRequests.find(r => r.id === requestId);
    if (!request) return;
    
    request.status = 'rejected';
    saveData('leaveRequests', leaveRequests);
    
    refreshApprovalTable();
    updateDashboard();
    notify(`Leave rejected for ${request.employeeName}`, 'info');
    updateNavBadges();
}

function refreshApprovalTable() {
    const container = document.getElementById('approval-table');
    if (!container) return;

    const pending = leaveRequests.filter(r => r.status === 'pending');
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="approval-empty">
                <p>No pending leave requests at the moment.</p>
                <div class="approval-card demo-card">
                    <div class="approval-card-header">
                        <div>
                            <strong>Jane Smith</strong> <span class="status pending">Pending</span>
                        </div>
                        <span class="approval-type">Annual Leave</span>
                    </div>
                    <div class="approval-card-body">
                        <p><strong>Dates:</strong> 2026-07-01 — 2026-07-07</p>
                        <p><strong>Days:</strong> 7</p>
                        <p><strong>Reason:</strong> Family trip and planning.</p>
                    </div>
                    <div class="approval-card-footer">
                        <small>This demo card shows how leave requests appear in the approval queue.</small>
                    </div>
                </div>
            </div>`;
        return;
    }

    let html = '<div class="approval-cards">';
    pending.forEach(req => {
        html += `
            <div class="approval-card">
                <div class="approval-card-header">
                    <div>
                        <strong>${escapeHtml(req.employeeName)}</strong>
                        <span class="status pending">Pending</span>
                    </div>
                    <span class="approval-type">${escapeHtml(req.leaveType)} Leave</span>
                </div>
                <div class="approval-card-body">
                    <p><strong>Dates:</strong> ${req.startDate} — ${req.endDate}</p>
                    <p><strong>Days:</strong> ${req.days}</p>
                    <p><strong>Reason:</strong> ${escapeHtml(req.reason)}</p>
                    <p class="muted"><small>Submitted: ${new Date(req.submittedAt).toLocaleString()}</small></p>
                </div>
                <div class="approval-card-footer">
                    <button class="btn-small success" onclick="approveLeave(${req.id})">Approve</button>
                    <button class="btn-small danger" onclick="rejectLeave(${req.id})">Reject</button>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== LEAVE SCHEDULE =====
function refreshLeaveSchedule() {
    const table = document.getElementById('leave-schedule');
    if (!table) return;
    
    const approved = leaveRequests.filter(r => r.status === 'approved');
    const dateMap = {};
    
    approved.forEach(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!dateMap[dateStr]) dateMap[dateStr] = [];
            dateMap[dateStr].push(req.employeeName);
        }
    });
    
    let html = '<table><thead><tr><th>Date</th><th>Employees on Leave</th></tr></thead><tbody>';
    
    const sortedDates = Object.keys(dateMap).sort();
    if (sortedDates.length === 0) {
        html += '<tr><td colspan="2" style="text-align: center;">No approved leaves</td></tr>';
    } else {
        sortedDates.forEach(date => {
            const displayDate = new Date(date).toLocaleDateString();
            html += `<tr><td>${displayDate}</td><td>${dateMap[date].join(', ')}</td></tr>`;
        });
    }
    
    html += '</tbody></table>';
    table.innerHTML = html;
}

// Initialize on page load
// The app loads the shared nav first, then initializes page-specific UI.
function loadNav() {
    const placeholder = document.getElementById('app-nav');
    if (!placeholder) return Promise.resolve();

    // Insert the static nav immediately
    placeholder.innerHTML = getStaticNav();

    // Add a small visible debug badge so we can confirm nav injection on every page
    try {
        const navEl = placeholder.querySelector('nav');
        if (navEl) {
            // Remove existing debug badge if present
            const existing = navEl.querySelector('#nav-debug');
            if (existing) existing.remove();

            const dbg = document.createElement('div');
            dbg.id = 'nav-debug';
            dbg.style.fontSize = '12px';
            dbg.style.opacity = '0.8';
            dbg.style.color = '#fff';
            dbg.style.marginTop = '8px';
            dbg.textContent = 'nav injected: ' + (window.location.pathname.split('/').pop() || 'index');
            navEl.appendChild(dbg);
        }
    } catch (e) {
        console && console.error && console.error('nav debug error', e);
    }

    // Ensure profile and active highlighting are applied right after injection
    renderNavProfile();
    highlightActiveNav();

    return Promise.resolve();
}

function getStaticNav() {
    return `
    <nav>
        <div class="nav-items">
            <a class="nav-link" href="dashboard.html"><span class="nav-icon">
            ${getSvgIcon('dashboard')}
            </span>Dashboard<span class="nav-badge" data-for="dashboard">
            </span></a>
            
            <a class="nav-link" href="employee.html"><span class="nav-icon">
            ${getSvgIcon('users')}</span>Employee Management<span class="nav-badge" data-for="employees"></span></a>
            <a class="nav-link" href="application.html"><span class="nav-icon">${getSvgIcon('apply')}</span>Leave Application<span class="nav-badge" data-for="application"></span></a>
            <a class="nav-link" href="approval.html"><span class="nav-icon">${getSvgIcon('approval')}</span>Leave Approval<span class="nav-badge" data-for="approval"></span></a>
            <a class="nav-link" href="schedule.html"><span class="nav-icon">${getSvgIcon('calendar')}</span>Leave Schedule<span class="nav-badge" data-for="schedule"></span></a>
            <a class="nav-link" href="tasks.html"><span class="nav-icon">${getSvgIcon('tasks')}</span>Tasks<span class="nav-badge" data-for="tasks"></span></a>
        </div>
        <div id="nav-profile"></div>
    </nav>`;
}

// Return a small inline SVG icon for each nav link.
// Keeping icons in JavaScript avoids extra asset requests and keeps the nav self-contained.
function getSvgIcon(name) {
    const icons = {
        dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="5" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="10" width="8" height="11" rx="2" fill="currentColor" opacity="0.7"/></svg>`,
        users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11z" fill="currentColor"/><path d="M2 20c0-2.761 4.03-5 9-5s9 2.239 9 5v1H2v-1z" fill="currentColor" opacity="0.85"/></svg>`,
        apply: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3 6h6l-4.8 3.5L20 20l-8-5-8 5 1.8-8.5L1 8h6L12 2z" fill="currentColor"/></svg>`,
        approval: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 11l3 3 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9"/></svg>`,
        calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        tasks: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 11l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/></svg>`
    };
    return icons[name] || '';
}

function updateNavBadges() {
    try {
        // Calculate notification counts for the nav badges.
        // Only the approval and tasks links currently show badge counts.
        const pending = (leaveRequests || []).filter(r => r.status === 'pending').length;
        const tasks = getTasks();
        const incompleteTasks = tasks.filter(t => t.status !== 'finished').length;

        const map = { approval: pending, tasks: incompleteTasks };
        Object.keys(map).forEach(key => {
            const el = document.querySelector(`#app-nav .nav-badge[data-for="${key}"]`);
            if (!el) return;
            const n = map[key];
            el.textContent = n > 0 ? (n > 99 ? '99+' : n) : '';
            el.style.display = n > 0 ? 'inline-block' : 'none';
        });
    } catch (e) { console && console.error && console.error('updateNavBadges error', e); }
}

function highlightActiveNav() {
    const currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
    const links = document.querySelectorAll('#app-nav .nav-link');
    links.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === currentFile);
    });
}

function initApp() {
    updateDashboard();
    refreshEmployeeTable();
    refreshEmployeeDropdown();
    populateEmployeeSelects();
    refreshApprovalTable();
    refreshLeaveSchedule();
    refreshTaskList();
    refreshTaskTimeline();
    populateFilterEmployeeSelect();
    renderNavProfile();
    highlightActiveNav();
    // Page-specific extras
    try {
        const current = (window.location.pathname.split('/').pop() || 'index');
        if (current === 'application.html') populateLeaveFormForCurrentUser();
        if (current === 'approval.html') refreshApprovalNotifications();
    } catch (e) { /* ignore */ }
    // update badges after everything is initialized
    updateNavBadges();
}


document.addEventListener('DOMContentLoaded', () => {
    loadNav().then(initApp);
});

// Simple login handler for demo flow
function handleLogin(event) {
    event.preventDefault();
    // In this demo any credentials are accepted
    const email = (document.getElementById('login-username') || {}).value || 'Demo User';
    localStorage.setItem('authenticated', '1');
    localStorage.setItem('userName', email.split('@')[0]);
    // Redirect to dashboard where the sidebar/navigation is shown
    window.location.href = 'dashboard.html';
}

// Render the right-hand profile/logout section in the sidebar nav.
// Shows login link when not authenticated, or a greeting with logout when signed in.
function renderNavProfile() {
    const container = document.getElementById('nav-profile');
    if (!container) return;
    const auth = localStorage.getItem('authenticated');
    const name = localStorage.getItem('userName') || 'User';
    if (auth) {
        container.innerHTML = `
            <div class="nav-user">
                <span>Hello "${escapeHtml(name)}"</span>
                <button class="secondary" onclick="handleLogout()">Logout</button>
            </div>`;
    } else {
        container.innerHTML = `<a href="login.html" class="secondary">Login</a>`;
    }
}

function handleLogout() {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('userName');
    // Update nav immediately then redirect to login
    renderNavProfile();
    window.location.href = 'login.html';
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"]+/g, function(s) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]);
    });
}
