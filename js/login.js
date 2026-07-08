console.log("🔵 Login module loaded");

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", handleLogin);
});


// =====================================================
// MAIN LOGIN HANDLER
// =====================================================
async function handleLogin(event) {
    event.preventDefault();

    const sb = window.sb;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    // =====================================================
    // 1. TRY SUPABASE AUTH (ADMIN / MANAGER / HR)
    // =====================================================
    const { data: authData, error: authError } =
        await sb.auth.signInWithPassword({
            email,
            password
        });

    if (!authError && authData?.user) {

        console.log("Auth login success");

        const { data: profile, error: profileError } = await sb
            .from("profiles")
            .select("role")
            .eq("email", email)
            .single();

        if (profileError || !profile) {
            alert("Profile not found");
            await sb.auth.signOut();
            return;
        }

        const role = profile.role;

        // route admins/management
        if (role === "admin" || role === "manager" || role === "hr") {
            window.location.href = "/admin/dashboard.html";
            return;
        }

        // if not allowed here → treat as employee fallback
        await sb.auth.signOut();
    }

    // =====================================================
    // 2. EMPLOYEE LOGIN (profiles table fallback)
    // =====================================================
    const { data: user, error } = await sb
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

    if (error || !user) {
        alert("Invalid credentials");
        return;
    }

    const hashedInput = await hashPassword(password);

    if (hashedInput !== user.password_hash) {
        alert("Invalid credentials");
        return;
    }

    console.log("Employee login success");

    // store session (simple local session)
    sessionStorage.setItem("user", JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name
    }));

    // =====================================================
    // 3. ROLE ROUTING (EMPLOYEES ONLY)
    // =====================================================
    window.location.href = "/employee/dashboard.html";
}


// =====================================================
// PASSWORD HASH (MUST MATCH employee.js)
// =====================================================
async function hashPassword(password) {

    const enc = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}