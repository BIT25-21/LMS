/************************************* */
/* LOGOUT FUNCTION */
/************************************* */

async function logout() {

    if (!window.sb) {
        console.error("Supabase not initialized");
        return;
    }

    const { error } = await window.sb.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        alert("Logout failed");
        return;
    }

    // clear session and redirect
    window.location.href = "index.html";
}

// IMPORTANT: expose globally
window.logout = logout;