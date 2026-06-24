"""一次性迁移: 给 payments 表加 type + refund_of 列"""
from app.core.database import get_supabase

sb = get_supabase()

# 1. type 列: income(默认) / refund
try:
    sb.rpc("exec_sql", {"query": "ALTER TABLE payments ADD COLUMN IF NOT EXISTS type text DEFAULT 'income'"}).execute()
    print("OK: type column added")
except Exception as e:
    print(f"type: {e}")

# 2. refund_of 列: 關聯原收款 uuid
try:
    sb.rpc("exec_sql", {"query": "ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_of uuid"}).execute()
    print("OK: refund_of column added")
except Exception as e:
    print(f"refund_of: {e}")

# 3. 回填既存資料
try:
    sb.rpc("exec_sql", {"query": "UPDATE payments SET type = 'income' WHERE type IS NULL"}).execute()
    print("OK: backfilled existing rows to type=income")
except Exception as e:
    print(f"backfill: {e}")

# 4. 驗證
r = sb.table("payments").select("id, type, refund_of").limit(3).execute()
print(f"驗證: {len(r.data)} rows, sample: {r.data[:1]}")
