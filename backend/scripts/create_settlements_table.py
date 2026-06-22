#!/usr/bin/env python3
"""自动在 Supabase 创建 settlements 表。"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import get_supabase


def main():
    sb = get_supabase()

    # 检查表是否存在
    try:
        sb.table("settlements").select("id").limit(0).execute()
        print("settlements 表已存在")
        return
    except Exception:
        print("settlements 表不存在，正在创建...")

    sql = """
    create table if not exists public.settlements (
        id uuid default gen_random_uuid() primary key,
        teacher_id text not null,
        teacher_name text not null,
        start_date date not null,
        end_date date not null,
        total_hours numeric(10,2) not null default 0,
        hourly_rate numeric(10,2) not null default 0,
        amount numeric(10,2) not null default 0,
        status text not null default 'pending'
            check (status in ('pending', 'paid', 'cancelled')),
        paid_at timestamp with time zone,
        created_at timestamp with time zone
            default timezone('utc'::text, now()) not null
    );

    create index if not exists idx_settlements_teacher_id
        on public.settlements(teacher_id);
    create index if not exists idx_settlements_created_at
        on public.settlements(created_at desc);
    create index if not exists idx_settlements_status
        on public.settlements(status);
    """

    try:
        sb.rpc("exec_sql", {"query": sql}).execute()
        print("✅ settlements 表创建成功")
    except Exception as e:
        print(f"RPC 方式失败: {e}")
        print("请手动在 Supabase SQL Editor 中执行 migrations/20250622_create_settlements.sql")


if __name__ == "__main__":
    main()
