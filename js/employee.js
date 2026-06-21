console.log("Employee module loaded");

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    const sessionOk = await checkSession();
    if (!sessionOk) return;

    await loadEmployees();

    const form = document.getElementById("add-employee-form");
    if (form) form.addEventListener("submit", addEmployee);
});


// =====================================================
// SESSION CHECK (SINGLE SOURCE OF TRUTH)
// =====================================================
async function checkSession() {

    const { data: { user } } = await window.sb.auth.getUser();

    if (!user) {
        redirectToLogin();
        return false;
    }

    console.log("Session OK:", user.email);
    return true;
}


// =====================================================
// REDIRECT
// =====================================================
function redirectToLogin() {
    window.location.href = "login.html";
}


// =====================================================
// LOAD EMPLOYEES
// =====================================================
async function loadEmployees() {

    const container = document.getElementById("employees-table");
    if (!container) return;

    const { data, error } = await window.sb
        .from("profiles")
        .select("id, full_name, email, department, role, is_active")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Error loading employees</p>";
        return;
    }

    renderEmployees(data || []);
}


// =====================================================
// RENDER TABLE
// =====================================================
function renderEmployees(employees) {

    const container = document.getElementById("employees-table");

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    employees.forEach(emp => {
        html += `
            <tr>
                <td>${emp.full_name}</td>
                <td>${emp.email}</td>
                <td>${emp.department}</td>
                <td>${emp.role}</td>
                <td>${emp.is_active ? "Active" : "Inactive"}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}


// =====================================================
// ADD EMPLOYEE
// =====================================================
async function addEmployee(event) {

    event.preventDefault();

    const { data: { user } } = await window.sb.auth.getUser();

    if (!user) {
        alert("Session expired");
        redirectToLogin();
        return;
    }

    const full_name = getValue("emp-name");
    const email = getValue("emp-email");
    const department = getValue("emp-dept");
    const role = getValue("emp-role");   // ✅ FIXED
    const password = getValue("emp-password");

    if (!full_name || !email || !department || !role || !password) {
        alert("All fields required");
        return;
    }

    const password_hash = await hashPassword(password);

    // =================================================
    // CREATE EMPLOYEE PROFILE
    // =================================================
    const { data: employee, error } = await window.sb
        .from("profiles")
        .insert([{

            full_name,
            email,
            department,
            role,
            password_hash,
            is_active: true
        }])
        .select()
        .single();

    if (error) {
        console.error(error);
        alert("Failed to create employee");
        return;
    }

    // =================================================
    // AUTO CREATE LEAVE ENTITLEMENTS
    // =================================================
    const { data: leaveTypes } = await window.sb
        .from("leave_types")
        .select("id, default_days");

    if (leaveTypes?.length) {

        const entitlements = leaveTypes.map(type => ({
            employee_id: employee.id,
            leave_type_id: type.id,
            allocated_days: type.default_days,
            used_days: 0
        }));

        const { error: entError } = await window.sb
            .from("leave_entitlements")
            .insert(entitlements);

        if (entError) {
            console.error("Entitlement error:", entError);
        }
    }

    alert("Employee created successfully");
    event.target.reset();
    loadEmployees();
}


// =====================================================
// HELPERS
// =====================================================
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}


// =====================================================
// HASH PASSWORD
// =====================================================
async function hashPassword(password) {

    const enc = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}