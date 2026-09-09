-- CampusSync — Supabase / Postgres schema
-- Run this once in the Supabase SQL Editor before starting the backend.
-- Safe to re-run: every statement is idempotent.

create table if not exists users (
    id               bigserial primary key,
    username         text unique not null,
    -- VOLP session cookies, restored on each background sync.
    cookies          jsonb       not null default '{}'::jsonb,
    -- VOLP password, Fernet-encrypted with CAMPUSSYNC_SECRET_KEY (see crypto.py).
    -- Needed to re-login when a scheduled submission fires after the cookies
    -- have expired. NULL when the student has not saved their login.
    password_enc     text,
    fcm_token        text        not null default '',
    whatsapp_number  text        not null default '',
    whatsapp_enabled boolean     not null default true,
    push_enabled     boolean     not null default true,
    reminder_minutes integer     not null default 20,
    -- Full VOLP snapshot: courses, assignments, announcements, materials.
    sync_data        jsonb       not null default '{}'::jsonb,
    last_sync        text,
    -- Reminder keys already fired, so a deadline never alerts twice.
    sent_reminders   jsonb       not null default '[]'::jsonb,
    created_at       timestamptz not null default now()
);

-- Existing deployments: add the columns introduced after the first release.
alter table users add column if not exists password_enc     text;
alter table users add column if not exists whatsapp_enabled boolean not null default true;
alter table users add column if not exists push_enabled     boolean not null default true;
alter table users add column if not exists reminder_minutes integer not null default 20;
alter table users add column if not exists sent_reminders   jsonb   not null default '[]'::jsonb;

create table if not exists course_groups (
    id          bigserial primary key,
    crsid       bigint not null,
    colid       bigint not null,
    course_name text   not null default 'Unknown Course',
    invite_code text   unique not null,
    created_by  bigint references users(id) on delete set null,
    created_at  timestamptz not null default now()
);

create index if not exists course_groups_invite_code_idx on course_groups (invite_code);

create table if not exists group_members (
    group_id bigint not null references course_groups(id) on delete cascade,
    user_id  bigint not null references users(id)         on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (group_id, user_id)
);

create index if not exists group_members_user_id_idx on group_members (user_id);

-- The backend talks to Supabase with the service_role key, which bypasses RLS.
-- RLS is enabled anyway so that a leaked anon key cannot read these tables.
alter table users         enable row level security;
alter table course_groups enable row level security;
alter table group_members enable row level security;
