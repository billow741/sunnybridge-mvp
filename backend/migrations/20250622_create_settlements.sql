-- 教师结算表
create table if not exists public.settlements (
    id uuid default gen_random_uuid() primary key,
    teacher_id text not null,
    teacher_name text not null,
    start_date date not null,
    end_date date not null,
    total_hours numeric(10,2) not null default 0,
    hourly_rate numeric(10,2) not null default 0,
    amount numeric(10,2) not null default 0,
    status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
    paid_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 索引
create index if not exists idx_settlements_teacher_id on public.settlements(teacher_id);
create index if not exists idx_settlements_created_at on public.settlements(created_at desc);
create index if not idx_settlements_status on public.settlements(status);

-- 权限（如果不用 RLS 可以注释掉）
-- alter table public.settlements enable row level security;
