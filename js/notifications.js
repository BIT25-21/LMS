/******************************************************
 * NOTIFICATIONS MODULE (GLOBAL)
 * ----------------------------------------------------
 * Drop this script into any page that has a .side-nav and
 * it self-installs:
 *
 *  - a bell + unread badge in the sidebar
 *  - a dropdown list of notifications
 *  - a detail modal with inline Approve / Reject
 *  - live updates via Supabase Realtime (+ polling fallback)
 *  - toast pop-ups for anything that arrives while you watch
 *
 * Flow:
 *  employee applies  -> every admin/hr/manager gets notified
 *  approver decides  -> the requester gets notified
 *
 * Public API (used by application.js / approval.js):
 *  Notify.currentUser()
 *  Notify.leaveRequested(requestId, requesterProfileId)
 *  Notify.decide(requestId, "approved" | "rejected", reason)
 *  Notify.toast(message, type)
 ******************************************************/

const Notify = (() => {

    const APPROVER_ROLES = ["admin", "hr", "manager"];
    const POLL_MS = 15000;

    let me = null;          // { id, email, role, full_name }
    let items = [];         // cached notification rows
    let panelOpen = false;
    let lastSeenId = null;  // used to decide what deserves a toast


    /* ================================================
       1. WHO AM I
       ------------------------------------------------
       This app has two login paths:
         - admin/hr/manager -> real Supabase Auth session
         - employee         -> sessionStorage fallback
       Resolve both into the same shape.
    ================================================ */
    async function currentUser() {

        if (me) return me;

        // a) Supabase Auth session (admin / hr / manager)
        try {
            const { data: { user } } = await window.sb.auth.getUser();

            if (user?.email) {
                const { data: profile } = await window.sb
                    .from("profiles")
                    .select("id, email, role, full_name")
                    .eq("email", user.email)
                    .single();

                if (profile) {
                    me = profile;
                    return me;
                }
            }
        } catch (err) {
            console.warn("No auth session, falling back to local session");
        }

        // b) sessionStorage session (employee)
        try {
            const stored = JSON.parse(sessionStorage.getItem("user") || "null");

            if (stored?.id) {
                me = {
                    id: stored.id,
                    email: stored.email,
                    role: stored.role,
                    full_name: stored.name || stored.full_name
                };
                return me;
            }
        } catch (err) {
            console.warn("Bad session payload");
        }

        return null;
    }

    function isApprover(user) {
        return !!user && APPROVER_ROLES.includes(user.role);
    }


    /* ================================================
       2. WRITING NOTIFICATIONS
    ================================================ */
    async function insert(rows) {

        if (!rows.length) return;

        const { error } = await window.sb
            .from("notifications")
            .insert(rows);

        if (error) console.error("Notification insert failed:", error);
    }


    /**
     * Fan a new leave request out to every approver.
     */
    async function leaveRequested(requestId, requesterProfileId) {

        const { data: requester } = await window.sb
            .from("profiles")
            .select("full_name, department")
            .eq("id", requesterProfileId)
            .single();

        const { data: approvers, error } = await window.sb
            .from("profiles")
            .select("id")
            .in("role", APPROVER_ROLES);

        if (error) {
            console.error("Could not load approvers:", error);
            return;
        }

        const name = requester?.full_name || "An employee";
        const dept = requester?.department ? ` (${requester.department})` : "";

        await insert((approvers || [])
            // don't notify yourself about your own request
            .filter(a => a.id !== requesterProfileId)
            .map(a => ({
                recipient_profile_id: a.id,
                actor_profile_id: requesterProfileId,
                type: "leave_requested",
                title: "New leave request",
                message: `${name}${dept} submitted a leave request for your approval.`,
                leave_request_id: requestId
            })));
    }


    /**
     * Approve or reject, then notify the requester.
     * Single source of truth — the approvals table and the
     * notification modal both call this.
     */
    async function decide(requestId, status, reason) {

        const user = await currentUser();

        if (!isApprover(user)) {
            return { error: { message: "You are not allowed to approve leave." } };
        }

        // Read the request BEFORE writing, so we can enforce the
        // rules that a raw UPDATE would happily skip.
        const { data: request, error: readError } = await window.sb
            .from("leave_requests")
            .select("id, requester_profile_id, leave_type_id, start_date, end_date, days, status")
            .eq("id", requestId)
            .single();

        if (readError || !request) {
            return { error: readError || { message: "Request not found." } };
        }

        // 1. nobody signs off their own leave
        if (request.requester_profile_id === user.id) {
            return {
                error: {
                    message: "You cannot approve your own leave request. "
                           + "Ask another approver to review it."
                }
            };
        }

        // 2. don't decide the same request twice
        if (request.status !== "pending") {
            return {
                error: { message: `This request was already ${request.status}.` }
            };
        }

        // 3. balance may have been consumed by another approval
        //    while this one sat in the queue
        if (status === "approved" && window.LeaveRules) {

            const bal = await window.LeaveRules.balance(
                request.requester_profile_id,
                request.leave_type_id
            );

            if ((request.days || 0) > bal.remaining) {
                return {
                    error: {
                        message: `Cannot approve — only ${bal.remaining} day(s) of `
                               + `${bal.type} remain and this request needs ${request.days}.`
                    }
                };
            }
        }

        const patch = {
            status,
            decision_at: new Date().toISOString()
        };

        if (status === "rejected" && reason) {
            patch.rejection_reason = reason;
        }

        const { data: updated, error } = await window.sb
            .from("leave_requests")
            .update(patch)
            .eq("id", requestId)
            .eq("status", "pending")          // lose the race rather than double-apply
            .select("id, requester_profile_id, start_date, end_date, days")
            .single();

        if (error) {
            console.error("Decision failed:", error);
            return { error };
        }

        const approved = status === "approved";

        await insert([{
            recipient_profile_id: updated.requester_profile_id,
            actor_profile_id: user?.id || null,
            type: approved ? "leave_approved" : "leave_rejected",
            title: approved ? "Leave approved" : "Leave rejected",
            message: approved
                ? `Your ${updated.days} working day(s) from ${updated.start_date} `
                    + `to ${updated.end_date} were approved`
                    + `${user?.full_name ? ` by ${user.full_name}` : ""}.`
                : `Your leave from ${updated.start_date} to ${updated.end_date} was rejected`
                    + `${reason ? `. Reason: ${reason}` : "."}`,
            leave_request_id: requestId
        }]);

        return { data: updated };
    }


    /* ================================================
       3. READING NOTIFICATIONS
    ================================================ */
    async function fetchMine() {

        const user = await currentUser();
        if (!user) return [];

        const { data, error } = await window.sb
            .from("notifications")
            .select("*")
            .eq("recipient_profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30);

        if (error) {
            console.error("Load notifications failed:", error);
            return items;
        }

        return data || [];
    }

    async function markRead(id) {

        const row = items.find(n => n.id === id);
        if (!row || row.is_read) return;

        row.is_read = true;
        render();

        await window.sb
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);
    }

    async function markAllRead() {

        const user = await currentUser();
        if (!user) return;

        items.forEach(n => n.is_read = true);
        render();

        await window.sb
            .from("notifications")
            .update({ is_read: true })
            .eq("recipient_profile_id", user.id)
            .eq("is_read", false);
    }


    /* ================================================
       4. UI — BELL + PANEL
    ================================================ */
    function buildUI() {

        const nav = document.querySelector(".side-nav");
        if (!nav || document.getElementById("notif-bell")) return;

        const wrap = document.createElement("div");
        wrap.className = "notif-wrap";
        wrap.innerHTML = `
            <button id="notif-bell" class="notif-bell" type="button" aria-label="Notifications">
                <span class="notif-bell-icon">🔔</span>
                <span>Notifications</span>
                <span id="notif-badge" class="notif-badge" hidden>0</span>
            </button>

            <div id="notif-panel" class="notif-panel" hidden>
                <div class="notif-panel-head">
                    <strong>Notifications</strong>
                    <button id="notif-mark-all" type="button">Mark all read</button>
                </div>
                <div id="notif-list" class="notif-list"></div>
            </div>
        `;

        // sit directly under the brand, above the nav links
        const brand = nav.querySelector(".brand");
        brand ? brand.after(wrap) : nav.prepend(wrap);

        document.getElementById("notif-bell")
            .addEventListener("click", togglePanel);

        document.getElementById("notif-mark-all")
            .addEventListener("click", markAllRead);

        // click-away closes the panel
        document.addEventListener("click", e => {
            if (panelOpen && !wrap.contains(e.target)) togglePanel(false);
        });

        // detail modal (shared)
        const modal = document.createElement("div");
        modal.id = "notif-modal";
        modal.className = "notif-modal";
        modal.hidden = true;
        modal.innerHTML = `<div class="notif-modal-card" id="notif-modal-card"></div>`;
        modal.addEventListener("click", e => {
            if (e.target === modal) closeModal();
        });
        document.body.appendChild(modal);

        // toast host
        const toasts = document.createElement("div");
        toasts.id = "notif-toasts";
        toasts.className = "notif-toasts";
        document.body.appendChild(toasts);
    }

    function togglePanel(force) {

        const panel = document.getElementById("notif-panel");
        if (!panel) return;

        panelOpen = typeof force === "boolean" ? force : !panelOpen;
        panel.hidden = !panelOpen;
    }

    function render() {

        const list = document.getElementById("notif-list");
        const badge = document.getElementById("notif-badge");
        if (!list || !badge) return;

        const unread = items.filter(n => !n.is_read).length;

        badge.textContent = unread > 9 ? "9+" : unread;
        badge.hidden = unread === 0;

        if (!items.length) {
            list.innerHTML = `<p class="notif-empty">You're all caught up.</p>`;
            return;
        }

        list.innerHTML = items.map(n => `
            <button class="notif-item ${n.is_read ? "" : "unread"}"
                    type="button"
                    data-id="${n.id}">
                <span class="notif-dot notif-${esc(n.type)}"></span>
                <span class="notif-item-body">
                    <strong>${esc(n.title)}</strong>
                    <span>${esc(n.message || "")}</span>
                    <em>${timeAgo(n.created_at)}</em>
                </span>
            </button>
        `).join("");

        list.querySelectorAll(".notif-item").forEach(el => {
            el.addEventListener("click", () => openNotification(el.dataset.id));
        });
    }


    /* ================================================
       5. UI — DETAIL MODAL (approve / reject inline)
    ================================================ */
    async function openNotification(id) {

        const notif = items.find(n => n.id === id);
        if (!notif) return;

        markRead(id);
        togglePanel(false);

        const card = document.getElementById("notif-modal-card");
        const modal = document.getElementById("notif-modal");

        card.innerHTML = `<p class="notif-empty">Loading request…</p>`;
        modal.hidden = false;

        if (!notif.leave_request_id) {
            card.innerHTML = detailShell(notif, `<p>${esc(notif.message || "")}</p>`);
            wireModalClose();
            return;
        }

        // pull the request + the people/type behind it
        const { data: req, error } = await window.sb
            .from("leave_requests")
            .select("*")
            .eq("id", notif.leave_request_id)
            .single();

        if (error || !req) {
            card.innerHTML = detailShell(notif, `<p>This request is no longer available.</p>`);
            wireModalClose();
            return;
        }

        const [{ data: profile }, { data: type }] = await Promise.all([
            window.sb.from("profiles")
                .select("full_name, department, email")
                .eq("id", req.requester_profile_id).single(),
            window.sb.from("leave_types")
                .select("name")
                .eq("id", req.leave_type_id).single()
        ]);

        const user = await currentUser();

        const isOwnRequest = req.requester_profile_id === user?.id;
        const canAct = isApprover(user) && req.status === "pending" && !isOwnRequest;

        // show the requester's standing so the approver decides with context
        let balanceRow = "";

        if (window.LeaveRules) {
            const bal = await window.LeaveRules.balance(
                req.requester_profile_id, req.leave_type_id
            );
            balanceRow = `
                <dt>Balance</dt>
                <dd>${bal.remaining} of ${bal.entitled} day(s) remaining</dd>`;
        }

        const body = `
            <dl class="notif-detail">
                <dt>Employee</dt><dd>${esc(profile?.full_name || "Unknown")}</dd>
                <dt>Department</dt><dd>${esc(profile?.department || "—")}</dd>
                <dt>Leave type</dt><dd>${esc(type?.name || "—")}</dd>
                <dt>Dates</dt><dd>${esc(req.start_date)} → ${esc(req.end_date)}</dd>
                <dt>Working days</dt><dd>${esc(String(req.days ?? "—"))}</dd>
                ${balanceRow}
                <dt>Reason</dt><dd>${esc(req.reason || "—")}</dd>
                <dt>Status</dt>
                <dd><span class="notif-status notif-status-${esc(req.status)}">${esc(req.status)}</span></dd>
                ${req.rejection_reason
                    ? `<dt>Rejection reason</dt><dd>${esc(req.rejection_reason)}</dd>`
                    : ""}
            </dl>

            ${canAct ? `
                <label class="notif-reason-label" for="notif-reason">
                    Reason (required to reject)
                </label>
                <input id="notif-reason" type="text" placeholder="e.g. peak season cover">

                <div class="notif-modal-actions">
                    <button type="button" id="notif-approve" class="btn-approve">Approve</button>
                    <button type="button" id="notif-reject" class="btn-reject">Reject</button>
                </div>
            ` : `
                <p class="notif-hint">
                    ${req.status !== "pending"
                        ? "This request has already been decided."
                        : isOwnRequest
                            ? "This is your own request — another approver must review it."
                            : "Waiting on an approver."}
                </p>
            `}
        `;

        card.innerHTML = detailShell(notif, body);
        wireModalClose();

        if (!canAct) return;

        document.getElementById("notif-approve")
            .addEventListener("click", () => act(req.id, "approved"));

        document.getElementById("notif-reject")
            .addEventListener("click", () => act(req.id, "rejected"));
    }

    async function act(requestId, status) {

        const input = document.getElementById("notif-reason");
        const reason = input ? input.value.trim() : "";

        if (status === "rejected" && !reason) {
            toast("Please give a reason before rejecting.", "error");
            input?.focus();
            return;
        }

        document.querySelectorAll(".notif-modal-actions button")
            .forEach(b => b.disabled = true);

        const { error } = await decide(requestId, status, reason);

        if (error) {
            toast("Could not save the decision: " + error.message, "error");
            document.querySelectorAll(".notif-modal-actions button")
                .forEach(b => b.disabled = false);
            return;
        }

        closeModal();
        toast(`Leave ${status}. The employee has been notified.`, "success");

        // if the approvals page is open behind the modal, refresh it
        if (typeof window.loadApprovals === "function") window.loadApprovals();
    }

    function detailShell(notif, inner) {
        return `
            <div class="notif-modal-head">
                <strong>${esc(notif.title)}</strong>
                <button type="button" id="notif-modal-close" aria-label="Close">&times;</button>
            </div>
            ${inner}
        `;
    }

    function wireModalClose() {
        document.getElementById("notif-modal-close")
            ?.addEventListener("click", closeModal);
    }

    function closeModal() {
        const modal = document.getElementById("notif-modal");
        if (modal) modal.hidden = true;
    }


    /* ================================================
       6. TOASTS
    ================================================ */
    function toast(message, type = "info") {

        const host = document.getElementById("notif-toasts");
        if (!host) return;

        const el = document.createElement("div");
        el.className = `notif-toast notif-toast-${type}`;
        el.textContent = message;

        host.appendChild(el);

        setTimeout(() => {
            el.classList.add("out");
            setTimeout(() => el.remove(), 300);
        }, 4000);
    }


    /* ================================================
       7. LIVE UPDATES
    ================================================ */
    async function refresh({ announce = false } = {}) {

        const fresh = await fetchMine();

        if (announce && fresh.length) {
            const newest = fresh[0];

            if (lastSeenId && newest.id !== lastSeenId && !newest.is_read) {
                toast(newest.title + " — " + (newest.message || ""), "info");
            }
        }

        if (fresh.length) lastSeenId = fresh[0].id;

        items = fresh;
        render();
    }

    async function subscribe() {

        const user = await currentUser();
        if (!user) return;

        window.sb
            .channel("notifications-" + user.id)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `recipient_profile_id=eq.${user.id}`
            }, payload => {
                items = [payload.new, ...items];

                // keep the poller in sync, otherwise the next poll
                // sees this as "new" and toasts it a second time
                lastSeenId = payload.new.id;

                render();
                toast(
                    payload.new.title + " — " + (payload.new.message || ""),
                    payload.new.type === "leave_rejected" ? "error" : "success"
                );
            })
            .subscribe();
    }


    /* ================================================
       8. HELPERS
    ================================================ */
    function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function timeAgo(iso) {

        const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

        return `${Math.floor(seconds / 86400)}d ago`;
    }


    /* ================================================
       9. BOOT
    ================================================ */
    async function init() {

        if (!window.sb) {
            console.error("Notifications: Supabase not initialized");
            return;
        }

        const user = await currentUser();
        if (!user) return;          // login page, or signed out

        buildUI();
        await refresh();
        subscribe();

        // Polling fallback — keeps the demo working even if
        // Realtime isn't enabled on the notifications table.
        setInterval(() => refresh({ announce: true }), POLL_MS);
    }

    document.addEventListener("DOMContentLoaded", init);


    return { currentUser, leaveRequested, decide, toast, refresh };
})();

window.Notify = Notify;
