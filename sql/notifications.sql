-- ============================================================
--  NOTIFICATIONS  —  run this in the Supabase SQL Editor
--  (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

create table if not exists public.notifications (
    id                  uuid primary key default gen_random_uuid(),

    -- who should SEE this notification
    recipient_profile_id uuid not null
        references public.profiles(id) on delete cascade,

    -- who CAUSED it (the applicant, or the approver)
    actor_profile_id     uuid
        references public.profiles(id) on delete set null,

    -- 'leave_requested' | 'leave_approved' | 'leave_rejected'
    type                text not null,

    title               text not null,
    message             text,

    -- lets the notification open the actual request
    leave_request_id    uuid
        references public.leave_requests(id) on delete cascade,

    is_read             boolean not null default false,
    created_at          timestamptz not null default now()
);

-- fast "my unread notifications, newest first"
create index if not exists notifications_recipient_idx
    on public.notifications (recipient_profile_id, created_at desc);


-- ============================================================
--  REALTIME  — required for the bell to update instantly
-- ============================================================
alter publication supabase_realtime add table public.notifications;

-- makes the payload include the full row
alter table public.notifications replica identity full;


-- ============================================================
--  ROW LEVEL SECURITY
--  NOTE: this project currently talks to Supabase with the anon
--  key for BOTH admins and employees, so a strict per-user
--  policy would break the employee side. This permissive policy
--  matches the rest of the schema. See "Security" in the review.
-- ============================================================
alter table public.notifications enable row level security;

drop policy if exists notifications_demo_access on public.notifications;

create policy notifications_demo_access
    on public.notifications
    for all
    using (true)
    with check (true);
