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

        const { error } = await window.sb.auth.signOut({
            scope: "global"
        });

        if (error) {
            console.error("Signout error:", error);
            alert(error.message);
            return;
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