/******************************************************
 * EMPLOYEE MODULE (FIXED + CLEAN)
 ******************************************************/

// -----------------------------
// INIT
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    loadEmployees();

    const form = document.getElementById("add-employee-form");

    if (form) {
        form.addEventListener("submit", addEmployee);
    }
});


// -----------------------------
// LOAD EMPLOYEES
// -----------------------------
async function loadEmployees() {
    const container = document.getElementById("employees-table");

    if (!container) return;

    const { data, error } = await window.sb
        .from("profiles")
        .select("id, full_name, email, department, leave_balance, is_active")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load error:", error);
        container.innerHTML = `<p style="color:red;">${error.message}</p>`;
        return;
    }

    renderEmployees(data || []);
}


// -----------------------------
// RENDER TABLE
// -----------------------------
function renderEmployees(employees) {
    const container = document.getElementById("employees-table");

    if (!container) return;

    if (!employees.length) {
        container.innerHTML = "<p>No employees found.</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Leave Balance</th>
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
                <td>${emp.leave_balance}</td>
                <td>${emp.is_active ? "Active" : "Inactive"}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    container.innerHTML = html;
}


// -----------------------------
// ADD EMPLOYEE (FRONTEND CALL)
// -----------------------------

async function addEmployee(event) {
    event.preventDefault();

    const full_name = document.getElementById("emp-name").value;
    const email = document.getElementById("emp-email").value;
    const department = document.getElementById("emp-dept").value;

    const { data, error } = await window.sb
        .from("profiles")
        .insert([
            {
                full_name,
                email,
                department
            }
        ])
        .select();

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    alert("Employee added successfully!");
    loadEmployees();
}


