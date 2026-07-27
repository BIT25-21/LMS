/******************************************************
 * LEAVE MANAGEMENT SYSTEM - EMPLOYEE MODULE
 * ----------------------------------------------------
 * Handles:
 *  - Sidebar navigation highlighting
 *  - Employee data loading
 *  - Employee rendering
 *  - Employee creation (Edge Function)
 *  - Logout functionality
 ******************************************************/


/******************************************************
 * 1. INITIALIZATION (RUN ON PAGE LOAD)
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {

    // Ensure Supabase is available globally
    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    console.log("Employee module initialized");

    // Highlight active navigation link
    highlightActiveNav();

    // Load employees only if table exists
    if (document.getElementById("employees-table")) {
        loadEmployees();
    }

});


/******************************************************
 * 2. SIDEBAR ACTIVE LINK HIGHLIGHTING
 ******************************************************/
function highlightActiveNav() {

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
}


/******************************************************
 * 3. LOAD EMPLOYEES FROM SUPABASE
 ******************************************************/
async function loadEmployees() {

    if (!window.sb) {
        console.error("Supabase not available");
        return;
    }

    const { data, error } = await window.sb
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load employees:", error);
        return;
    }

    renderEmployeeTable(data);
}


/******************************************************
 * 4. RENDER EMPLOYEE TABLE
 ******************************************************/
function renderEmployeeTable(employees) {

    const container = document.getElementById("employees-table");

    if (!container) {
        console.error("Employee table container not found");
        return;
    }

    if (!employees || employees.length === 0) {
        container.innerHTML = "<p>No employees found.</p>";
        return;
    }

    let html = `
        <table border="1" cellpadding="10" style="width:100%">
            <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
            </tr>
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

    html += `</table>`;

    container.innerHTML = html;
}


/******************************************************
 * 5. CREATE EMPLOYEE (EDGE FUNCTION)
 ******************************************************/
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
            console.error("Create employee error:", result);
            alert(result.error || "Failed to create employee");
            return;
        }

        alert("Employee created successfully");

        document.getElementById("add-employee-form").reset();

        loadEmployees();

    } catch (err) {
        console.error("Unexpected error:", err);
        alert("Something went wrong");
    }
}


