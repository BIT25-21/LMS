/******************************************************
 * ROLE GUARD (RBAC)
 * ----------------------------------------------------
 * Right now "RBAC" in this project is just two folders,
 * /admin and /employee, with different sidebar links.
 * Nothing stops an employee from typing /admin/approval.html
 * straight into the address bar.
 *
 * This module:
 *   1. resolves the signed-in user (auth session OR sessionStorage)
 *   2. bounces anyone with no session back to the login page
 *   3. bounces non-approvers out of /admin/*
 *   4. hides any element tagged  data-role="admin,hr"
 *      from users who don't hold one of those roles
 *
 * IMPORTANT: this is a *usability* guard, not a security
 * boundary. Anyone can disable JavaScript. Real enforcement
 * has to live in Supabase RLS — see the README notes.
 ******************************************************/

const Guard = (() => {

    const APPROVER_ROLES = ["admin", "hr", "manager"];
    const LOGIN_PAGE = "/index.html";

    let cached = null;


    /* ================================================
       RESOLVE THE CURRENT USER
    ================================================ */
    async function currentUser() {

        if (cached) return cached;

        // a) Supabase Auth (admin / hr / manager)
        try {
            const { data: { user } } = await window.sb.auth.getUser();

            if (user?.email) {
                const { data: profile } = await window.sb
                    .from("profiles")
                    .select("id, email, role, full_name")
                    .eq("email", user.email)
                    .single();

                if (profile) return (cached = profile);
            }
        } catch (err) {
            /* fall through to the local session */
        }

        // b) sessionStorage (employee)
        try {
            const stored = JSON.parse(sessionStorage.getItem("user") || "null");

            if (stored?.id) {
                return (cached = {
                    id: stored.id,
                    email: stored.email,
                    role: stored.role,
                    full_name: stored.name || stored.full_name
                });
            }
        } catch (err) {
            /* no session */
        }

        return null;
    }

    function isApprover(user) {
        return !!user && APPROVER_ROLES.includes(user.role);
    }


    /* ================================================
       HIDE ROLE-RESTRICTED MARKUP
       Usage:  <section data-role="admin,hr"> … </section>
    ================================================ */
    function applyRoleVisibility(user) {

        document.querySelectorAll("[data-role]").forEach(el => {

            const allowed = el.dataset.role
                .split(",")
                .map(r => r.trim());

            if (!allowed.includes(user.role)) el.remove();
        });
    }


    /* ================================================
       ENFORCE
    ================================================ */
    async function enforce() {

        if (!window.sb) {
            console.error("Guard: Supabase not initialized");
            return;
        }

        const user = await currentUser();

        if (!user) {
            window.location.replace(LOGIN_PAGE);
            return;
        }

        const inAdminArea = window.location.pathname.includes("/admin/");

        if (inAdminArea && !isApprover(user)) {
            console.warn(`Guard: role "${user.role}" cannot access /admin — redirecting`);
            window.location.replace("/employee/dashboard.html");
            return;
        }

        applyRoleVisibility(user);

        // let the rest of the app read the user without re-querying
        window.currentUserProfile = user;
        document.dispatchEvent(new CustomEvent("user:ready", { detail: user }));
    }

    document.addEventListener("DOMContentLoaded", enforce);


    return { currentUser, isApprover };
})();

window.Guard = Guard;
