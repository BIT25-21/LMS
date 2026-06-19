/******************************************************
 * LOGIN HANDLER - SUPABASE AUTH
 ******************************************************/

async function handleLogin(event) {
    event.preventDefault(); // stop page reload

    // Ensure Supabase client is loaded
    if (!window.sb) {
        console.error("Supabase client not initialized");
        return;
    }

    // Get form values
    const email = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    // Attempt login with Supabase Auth
    const { data, error } = await window.sb.auth.signInWithPassword({
        email,
        password
    });

    // Handle login errors
    if (error) {
        alert(error.message);
        return;
    }

    // Redirect after successful login
    window.location.href = "dashboard.html";
}

