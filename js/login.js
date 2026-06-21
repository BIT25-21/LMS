/******************************************************
 * LOGIN MODULE (PRODUCTION READY - HYBRID MODEL)
 * ----------------------------------------------------
 * Admin → Supabase Auth
 * Staff → profiles table (email + password_hash)
 ******************************************************/

console.log("LOGIN MODULE LOADED");

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
        console.error("Login form not found");
        return;
    }

    form.addEventListener("submit", handleLogin);
});

// =====================================================
// MAIN LOGIN CONTROLLER
// =====================================================
async function handleLogin(event) {
    event.preventDefault();

    if (!window.sb) {
        alert("System not initialized");
        return;
    }

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    console.log("Login attempt:", email);

    // =====================================================
    // STEP 1: ADMIN LOGIN (SUPABASE AUTH)
    // =====================================================
    try {
        const { data: authData, error: authError } =
            await window.sb.auth.signInWithPassword({
                email,
                password
            });

        if (!authError && authData?.user) {

            console.log("Auth login success:", authData.user.id);

            // fetch profile for role check
            const { data: profile } = await window.sb
                .from("profiles")
                .select("role, is_active")
                .eq("email", email)
                .single();

            if (profile?.role === "admin" && profile.is_active) {

                saveSession({
                    id: authData.user.id,
                    email,
                    role: "admin"
                });

                routeUser("admin");
                return;
            }

            // not admin → logout auth session
            await window.sb.auth.signOut();
        }
    } catch (err) {
        console.warn("Auth login failed, fallback to profiles:", err.message);
    }

    // =====================================================
    // STEP 2: STAFF LOGIN (PROFILES TABLE)
    // =====================================================
    try {
        const password_hash = await hashPassword(password);

        const { data: user, error } = await window.sb
            .from("profiles")
            .select("*")
            .eq("email", email)
            .eq("password_hash", password_hash)
            .single();

        if (error || !user) {
            alert("Invalid email or password");
            return;
        }

        if (!user.is_active) {
            alert("Account is inactive");
            return;
        }

        console.log("Profile login success:", user);

        saveSession({
            id: user.id,
            email: user.email,
            role: user.role
        });

        routeUser(user.role);

    } catch (err) {
        console.error("Login error:", err);
        alert("Unexpected error occurred");
    }
}

// =====================================================
// ROUTING
// =====================================================
function routeUser(role) {

    const routes = {
        admin: "admin-dashboard.html",
        hr: "hr-dashboard.html",
        manager: "manager-dashboard.html",
        employee: "employee-dashboard.html"
    };

    window.location.href = routes[role] || "dashboard.html";
}

// =====================================================
// SESSION STORAGE
// =====================================================
function saveSession(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

// =====================================================
// PASSWORD HASH (SHA-256)
// =====================================================
async function hashPassword(password) {
    const encoder = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// =====================================================
// SESSION CHECK (FOR PROTECTED PAGES)
// =====================================================
function checkSession() {
    const raw = localStorage.getItem("user");

    if (!raw) {
        window.location.href = "login.html";
        return false;
    }

    try {
        const user = JSON.parse(raw);

        if (!user?.role) {
            throw new Error("Invalid session");
        }

        return true;

    } catch (err) {
        localStorage.removeItem("user");
        window.location.href = "login.html";
        return false;
    }
}