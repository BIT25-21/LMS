/******************************************************
 * AUTH MODULE (GLOBAL)
 * Handles:
 * - Logout
 * - Session utilities (optional expansion)
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("logoutBtn");

    if (btn) {
        btn.addEventListener("click", logout);
    }
});


/******************************************************
 * LOGOUT FUNCTION (GLOBAL SAFE)
 ******************************************************/
async function logout() {
    try {
        console.log("Logout triggered");

        // Employees sign in through the profiles fallback, which stores
        // the session here. Clearing it FIRST means an unreachable
        // network / failed signOut can never leave them logged in.
        sessionStorage.removeItem("user");

        const { error } = await window.sb.auth.signOut({
            scope: "global"
        });

        if (error) {
            // session is already gone locally — don't strand the user
            console.error("Signout error:", error);
        }

        console.log("Logout successful");

        // small delay ensures session clears fully
        setTimeout(() => {
            window.location.href = "/index.html";
        }, 200);

    } catch (err) {
        console.error("Logout failed:", err);
    }
}