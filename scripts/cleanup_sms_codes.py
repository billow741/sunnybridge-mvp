#!/usr/bin/env python3
"""Cleanup expired sms_codes from Supabase.

Designed to run as a cron job. Deletes records where:
- expires_at < now() (expired more than 24h ago, grace period for debugging)

Uses Supabase Management API (same as Supabase CLI) since
supabase-py REST API doesn't support complex date filters.
"""

import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime

# --- Config ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ACCESS_TOKEN_FILE = PROJECT_ROOT / ".supabase-access-token"
REF = "aywqyxalytizdhaahqfw"
# Grace period: only delete records expired > 24h ago (allows recent debugging)
GRACE_HOURS = 24


def main():
    # Read access token
    if not ACCESS_TOKEN_FILE.exists():
        print("ERROR: .supabase-access-token not found", file=sys.stderr)
        sys.exit(1)

    token = ACCESS_TOKEN_FILE.read_text().strip()
    url = f"https://api.supabase.com/v1/projects/{REF}/database/query"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Supabase-CLI",
    }

    # Count before
    count_q = "SELECT count(*) as cnt FROM sms_codes WHERE expires_at < now() - interval '%d hours'" % GRACE_HOURS
    r = requests.post(url, headers=headers, json={"query": count_q})
    if r.status_code != 200 and r.status_code != 201:
        print(f"ERROR: count query failed: {r.status_code} {r.text}", file=sys.stderr)
        sys.exit(1)
    
    count_data = r.json()
    count_before = count_data[0]["cnt"] if count_data else 0
    
    if count_before == 0:
        # Nothing to clean — silent exit (cron-friendly)
        sys.exit(0)

    # Delete expired records (beyond grace period)
    delete_q = "DELETE FROM sms_codes WHERE expires_at < now() - interval '%d hours'" % GRACE_HOURS
    r2 = requests.post(url, headers=headers, json={"query": delete_q})
    if r2.status_code != 200 and r2.status_code != 201:
        print(f"ERROR: delete failed: {r2.status_code} {r2.text}", file=sys.stderr)
        sys.exit(1)

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    print(f"[{now}] sms_codes cleanup: deleted {count_before} expired records (grace={GRACE_HOURS}h)")


if __name__ == "__main__":
    main()
