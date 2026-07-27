/******************************************************
 * LEAVE MANAGEMENT SYSTEM - EMPLOYEE MODULE
 * CLEAN + FIXED VERSION
 ******************************************************/

console.log("Employee module loaded");

/* ====================================================
   1. INIT
==================================================== */
document.addEventListener("DOMContentLoaded", async () => {

    console.log("Initializing employee module...");

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    // 1. Check session first
    const ok = await checkSession();
    if (!ok) return;

    // 2. Load employees
    await loadEmployees();

    // 3. Attach form handlers
    attachEventListeners();
});


/* ====================================================
   2. SESSION CHECK
==================================================== */
async function checkSession() {

    try {
        // Employees sign in through the profiles fallback and have no
        // Supabase Auth session, so ask the guard (which understands
        // both login paths) rather than sb.auth.getUser() directly.
        const user = await window.Guard.currentUser();

        if (!user) {
            redirectToLogin();
            return false;
        }

        console.log("Session OK:", user.email, `(${user.role})`);
        return true;

    } catch (err) {
        console.error("Session error:", err);
        redirectToLogin();
        return false;
    }
}


/* ====================================================
   3. REDIRECT
==================================================== */
function redirectToLogin() {
    window.location.href = "/index.html";
}


/* ====================================================
   4. LOAD EMPLOYEES
==================================================== */
async function loadEmployees() {

    const container = document.getElementById("employees-table");
    if (!container) return;

    try {
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

    } catch (err) {
        console.error("Load employees failed:", err);
    }
}


/* ====================================================
   5. RENDER TABLE
==================================================== */
function renderEmployees(employees) {

    const container = document.getElementById("employees-table");
    if (!container) return;

    if (!employees.length) {
        container.innerHTML = "<p>No employees found</p>";
        return;
    }

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
                <td>${escapeHtml(emp.full_name)}</td>
                <td>${escapeHtml(emp.email)}</td>
                <td>${escapeHtml(emp.department)}</td>
                <td>${escapeHtml(emp.role)}</td>
                <td>${emp.is_active ? "Active" : "Inactive"}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    container.innerHTML = html;
}


/* ====================================================
   6. ADD EMPLOYEE
==================================================== */
async function addEmployee(event) {

    event.preventDefault();

    const full_name = getValue("emp-name");
    const email = getValue("emp-email");
    const department = getValue("emp-dept");
    const role = getValue("emp-role");
    const password = getValue("emp-password");

    if (!full_name || !email || !department || !role || !password) {
        alert("All fields are required");
        return;
    }

    try {
        const user = await window.Guard.currentUser();

        if (!user) {
            alert("Session expired");
            redirectToLogin();
            return;
        }

        if (!window.Guard.isApprover(user)) {
            alert("You do not have permission to create employees.");
            return;
        }

        // NOTE: In real systems password should NOT be hashed manually here
        const password_hash = await hashPassword(password);

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

        alert("Employee created successfully");

        event.target.reset();
        loadEmployees();

    } catch (err) {
        console.error("Add employee error:", err);
    }
}


/* ====================================================
   7. RESET PASSWORD 
==================================================== */
async function resetPassword() {

    const email = document.getElementById("reset-email").value.trim();
    const newPassword = document.getElementById("new-password").value;

    if (!email || !newPassword) {
        alert("Email and new password are required");
        return;
    }

    try {
        // 1. Find employee
        const { data: user, error } = await window.sb
            .from("profiles")
            .select("id, email")
            .eq("email", email)
            .single();

        if (error || !user) {
            console.error(error);
            alert("Employee not found");
            return;
        }

        // 2. Hash password
        const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(newPassword)
        );

        const password_hash = [...new Uint8Array(hashBuffer)]
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        // 3. Update password
        const { error: updateError } = await window.sb
            .from("profiles")
            .update({ password_hash })
            .eq("email", email);

        if (updateError) {
            console.error(updateError);
            alert("Failed to update password");
            return;
        }

        alert("Password reset successfully!");

        document.getElementById("reset-email").value = "";
        document.getElementById("new-password").value = "";

    } catch (err) {
        console.error("Reset error:", err);
        alert("Unexpected error occurred");
    }
}




/* ====================================================
   8. EVENT LISTENERS
==================================================== */
function attachEventListeners() {

    // Add employee form
    const form = document.getElementById("add-employee-form");
    if (form) {
        form.addEventListener("submit", addEmployee);
    }

    // Reset password button
    const resetBtn = document.getElementById("reset-password-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", resetPassword);
    }
}


/* ====================================================
   9. HELPERS
==================================================== */
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}


/* ====================================================
   10. PASSWORD HASH (ONLY FOR STORAGE FIELDS, NOT AUTH)
==================================================== */
async function hashPassword(password) {

    const enc = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}