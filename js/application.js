/******************************************************
 * LEAVE APPLICATION MODULE (FIXED VERSION)
 ******************************************************/

/**
 * INIT
 */
document.addEventListener("DOMContentLoaded", () => {
    loadEmployeesDropdown();
    loadLeaveTypes();

    const form = document.getElementById("leave-request-form");
    form.addEventListener("submit", submitLeave);
});


/******************************************************
 * LOAD EMPLOYEES
 ******************************************************/
async function loadEmployeesDropdown() {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    const select = document.getElementById("leave-emp");
    select.innerHTML = `<option value="">Select employee</option>`; // FIX RESET

    const { data, error } = await window.sb
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

    if (error) {
        console.error("Employee load error:", error);
        return;
    }

    data.forEach(emp => {
        const option = document.createElement("option");
        option.value = emp.id;
        option.textContent = emp.full_name;
        select.appendChild(option);
    });
}


/******************************************************
 * LOAD LEAVE TYPES
 ******************************************************/
async function loadLeaveTypes() {

    const select = document.getElementById("leave-type");
    select.innerHTML = `<option value="">Select leave type</option>`; // FIX RESET

    const { data, error } = await window.sb
        .from("leave_types")
        .select("id, name")
        .order("name");

    if (error) {
        console.error("Leave type error:", error);
        return;
    }

    data.forEach(type => {
        const option = document.createElement("option");
        option.value = type.id; // INTEGER OK
        option.textContent = type.name;
        select.appendChild(option);
    });
}


/******************************************************
 * SUBMIT LEAVE REQUEST (FIXED)
 ******************************************************/
async function submitLeave(event) {
    event.preventDefault();

    if (!window.sb) {
        alert("Supabase not initialized");
        return;
    }

    const requester_profile_id = document.getElementById("leave-emp").value;
    const leave_type_id = parseInt(document.getElementById("leave-type").value); // FIXED
    const start_date = document.getElementById("start-date").value;
    const end_date = document.getElementById("end-date").value;
    const reason = document.getElementById("leave-reason").value;

    // VALIDATION
    if (!requester_profile_id || !leave_type_id) {
        alert("Please select employee and leave type");
        return;
    }

    // Calculate days safely
    const days =
        Math.floor((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;

    console.log("Submitting leave:", {
        requester_profile_id,
        leave_type_id,
        start_date,
        end_date,
        days,
        reason
    });

    const { data, error } = await window.sb
        .from("leave_requests")
        .insert([
            {
                requester_profile_id,
                leave_type_id,
                start_date,
                end_date,
                days,
                reason,
                status: "pending"
            }
        ])
        .select(); // IMPORTANT FIX

    if (error) {
        console.error("Insert error:", error);
        alert(error.message);
        return;
    }

    console.log("INSERT SUCCESS:", data);

    alert("Leave request submitted successfully!");

    document.getElementById("leave-request-form").reset();
}