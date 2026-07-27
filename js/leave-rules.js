/******************************************************
 * LEAVE RULES ENGINE
 * ----------------------------------------------------
 * The single place that answers "is this request legal?".
 *
 * Balance is DERIVED, not stored:
 *
 *     balance = leave_types.default_days
 *             - sum(days of that employee's APPROVED requests
 *                   of that type, this calendar year)
 *
 * Deriving it means the number can never drift out of sync
 * with the request history, and it needs no extra column.
 * The trade-off is one extra query per check, which at this
 * scale costs nothing.
 ******************************************************/

const LeaveRules = (() => {

    let holidayCache = null;


    /* ================================================
       PUBLIC HOLIDAYS
       Optional table — if it hasn't been created the
       engine just falls back to weekends-only.
    ================================================ */
    async function holidays() {

        if (holidayCache) return holidayCache;

        try {
            const { data, error } = await window.sb
                .from("public_holidays")
                .select("holiday_date");

            if (error) throw error;

            holidayCache = (data || []).map(h => h.holiday_date);

        } catch (err) {
            console.warn("public_holidays table not found — counting weekends only");
            holidayCache = [];
        }

        return holidayCache;
    }


    /**
     * Chargeable days for a date range: working days only.
     */
    async function chargeableDays(startDate, endDate) {
        return window.countWorkingDays(startDate, endDate, await holidays());
    }


    /* ================================================
       ENTITLEMENT
    ================================================ */
    async function entitlement(leaveTypeId) {

        const { data, error } = await window.sb
            .from("leave_types")
            .select("name, default_days")
            .eq("id", leaveTypeId)
            .single();

        if (error || !data) return { name: "Leave", days: 0 };

        return { name: data.name, days: data.default_days || 0 };
    }


    /* ================================================
       DAYS ALREADY USED (this calendar year)
    ================================================ */
    async function used(profileId, leaveTypeId) {

        const year = new Date().getFullYear();

        const { data, error } = await window.sb
            .from("leave_requests")
            .select("days")
            .eq("requester_profile_id", profileId)
            .eq("leave_type_id", leaveTypeId)
            .eq("status", "approved")
            .gte("start_date", `${year}-01-01`)
            .lte("start_date", `${year}-12-31`);

        if (error) {
            console.error("Could not total used leave:", error);
            return 0;
        }

        return (data || []).reduce((sum, r) => sum + (r.days || 0), 0);
    }


    /* ================================================
       REMAINING BALANCE
    ================================================ */
    async function balance(profileId, leaveTypeId) {

        const [ent, spent] = await Promise.all([
            entitlement(leaveTypeId),
            used(profileId, leaveTypeId)
        ]);

        return {
            type: ent.name,
            entitled: ent.days,
            used: spent,
            remaining: Math.max(0, ent.days - spent)
        };
    }


    /**
     * Every leave type with its balance — for the dashboard card.
     */
    async function allBalances(profileId) {

        const { data: types } = await window.sb
            .from("leave_types")
            .select("id, name, default_days")
            .order("name");

        return Promise.all((types || []).map(async t => {

            const spent = await used(profileId, t.id);

            return {
                id: t.id,
                type: t.name,
                entitled: t.default_days || 0,
                used: spent,
                remaining: Math.max(0, (t.default_days || 0) - spent)
            };
        }));
    }


    /* ================================================
       FULL VALIDATION
       Returns { ok, days, balance, reason }
    ================================================ */
    async function validate({ profileId, leaveTypeId, startDate, endDate, ignoreRequestId }) {

        if (!profileId || !leaveTypeId || !startDate || !endDate) {
            return { ok: false, reason: "Please fill in every field." };
        }

        if (new Date(endDate) < new Date(startDate)) {
            return { ok: false, reason: "The end date cannot be before the start date." };
        }

        const days = await chargeableDays(startDate, endDate);

        if (days === 0) {
            return {
                ok: false,
                reason: "That range contains no working days — it's all weekend or public holiday."
            };
        }

        // 1. overlapping request?
        const clash = await overlaps(profileId, startDate, endDate, ignoreRequestId);

        if (clash) {
            return {
                ok: false,
                days,
                reason: `This overlaps an existing ${clash.status} request `
                      + `(${clash.start_date} → ${clash.end_date}).`
            };
        }

        // 2. enough balance?
        const bal = await balance(profileId, leaveTypeId);

        if (days > bal.remaining) {
            return {
                ok: false,
                days,
                balance: bal,
                reason: `Only ${bal.remaining} day(s) of ${bal.type} left `
                      + `(${bal.entitled} entitled, ${bal.used} used) — this request needs ${days}.`
            };
        }

        return { ok: true, days, balance: bal };
    }


    /* ================================================
       OVERLAP CHECK
       Two ranges overlap when A.start <= B.end
                          and A.end   >= B.start
    ================================================ */
    async function overlaps(profileId, startDate, endDate, ignoreRequestId) {

        let query = window.sb
            .from("leave_requests")
            .select("id, start_date, end_date, status")
            .eq("requester_profile_id", profileId)
            .in("status", ["pending", "approved"])
            .lte("start_date", endDate)
            .gte("end_date", startDate);

        if (ignoreRequestId) query = query.neq("id", ignoreRequestId);

        const { data, error } = await query;

        if (error) {
            console.error("Overlap check failed:", error);
            return null;
        }

        return (data || [])[0] || null;
    }


    return {
        holidays,
        chargeableDays,
        entitlement,
        used,
        balance,
        allBalances,
        validate,
        overlaps
    };
})();

window.LeaveRules = LeaveRules;
