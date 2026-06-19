/******************************************************
 * LEAVE MANAGEMENT SYSTEM - EMPLOYEE MODULE
 ******************************************************/

/* ====================================================
   1. SUPABASE CONFIG
==================================================== */
const supabaseUrl = "https://dccbsfoshbyhvmmcuasz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY2JzZm9zaGJ5aHZtbWN1YXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDM2NzAsImV4cCI6MjA5NjY3OTY3MH0.ZCqh6stpOrkHD7rWtU_97gow5NpnZxUsxKGQFDLXFmo"; 

let sb = null;

/* ====================================================
   2. INITIALIZATION (SAFE + GUARDED)
==================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".side-nav .nav-item");

    const currentPage = window.location.pathname.split("/").pop();

    links.forEach(link => {
        const linkPage = link.getAttribute("href");

        if (linkPage === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
});




/* ====================================================
   3. LOGIN
==================================================== */
const isEmployeePage = document.getElementById("employees-table");
const isLoginPage = document.getElementById("login-form");

document.addEventListener("DOMContentLoaded", () => {

    if (!sb) return;

    if (isEmployeePage) {
        loadEmployees();
    }

    if (isLoginPage) {
        console.log("Login page detected");
    }
});



/* ====================================================
   3. CREATE EMPLOYEE (EDGE FUNCTION)
==================================================== */
async function addEmployee(event) {
    event.preventDefault();

    const full_name = document.getElementById("emp-name").value.trim();
    const email = document.getElementById("emp-email").value.trim();
    const department = document.getElementById("emp-dept").value.trim();

    try {
        const res = await fetch(
            `${supabaseUrl}/functions/v1/create-employee`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    full_name,
                    email,
                    department
                })
            }
        );

        const result = await res.json();

        if (!res.ok) {
            console.error(result);
            alert("Error: " + result.error);
            return;
        }

        alert("Employee created successfully!");

        document.getElementById("add-employee-form").reset();

        loadEmployees();

    } catch (err) {
        console.error("Add employee error:", err);
        alert("Unexpected error occurred");
    }
}


/* ====================================================
   4. LOAD EMPLOYEES
==================================================== */
async function loadEmployees() {

    if (!sb) {
        console.error("Supabase not initialized.");
        return;
    }

    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load error:", error);
        return;
    }

    renderEmployeeTable(data);
}


/* ====================================================
   5. RENDER TABLE
==================================================== */
function renderEmployeeTable(employees) {

    const container = document.getElementById("employees-table");

    if (!container) {
        console.error("Employees table container not found.");
        return;
    }

    if (!employees || employees.length === 0) {
        container.innerHTML = "<p>No employees found.</p>";
        return;
    }

    let html = `
        <table border="1" cellpadding="10" style="width:100%">
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Leave Balance</th>
                <th>Status</th>
            </tr>
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

    html += `</table>`;

    container.innerHTML = html;
}


