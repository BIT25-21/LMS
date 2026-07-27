-- ============================================================
--  PUBLIC HOLIDAYS  (optional)
--  Run in the Supabase SQL Editor.
--
--  If you skip this file everything still works — the rules
--  engine falls back to excluding weekends only.
-- ============================================================

create table if not exists public.public_holidays (
    id            uuid primary key default gen_random_uuid(),
    holiday_date  date not null unique,
    name          text not null,
    created_at    timestamptz not null default now()
);

alter table public.public_holidays enable row level security;

drop policy if exists public_holidays_read on public.public_holidays;

create policy public_holidays_read
    on public.public_holidays
    for all
    using (true)
    with check (true);


-- ------------------------------------------------------------
--  Sample entries — replace with your own calendar.
--  Leave days falling on these dates are not charged.
-- ------------------------------------------------------------
insert into public.public_holidays (holiday_date, name) values
    ('2026-01-01', 'New Year''s Day'),
    ('2026-05-01', 'Labour Day'),
    ('2026-05-20', 'National Day'),
    ('2026-12-25', 'Christmas Day')
on conflict (holiday_date) do nothing;
