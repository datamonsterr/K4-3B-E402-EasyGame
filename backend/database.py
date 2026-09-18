from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wgitdkpmkaohpkdjxlhz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

_client: Optional[Any] = None


def get_supabase_client() -> Any:
    """Singleton getter for Supabase Client with graceful fallback."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing in environment variables.")
        try:
            from supabase import create_client
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            raise RuntimeError(f"Could not connect to Supabase: {e}")
    return _client


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def update_sla_tiers(client: Optional[Any] = None) -> int:
    """
    Calls Postgres RPC function update_sla_tiers() defined in schema.sql.
    Falls back to querying and updating via PostgREST if RPC fails.
    """
    try:
        sb = client or get_supabase_client()
    except Exception:
        return 0

    try:
        res = sb.rpc("update_sla_tiers", {}).execute()
        return res.data if res.data is not None else 0
    except Exception:
        # Fallback manual calculation if RPC is not deployed
        try:
            now_dt = datetime.now(timezone.utc)
            res = sb.table("questions_tracker").select("id, asked_at, sla_tier").eq("status", "OPEN").execute()
            rows = res.data or []
            updated = 0
            for r in rows:
                row_id = r["id"]
                asked_str = r.get("asked_at")
                current_tier = r.get("sla_tier")
                try:
                    dt = datetime.fromisoformat(asked_str.replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    hours = max(0.0, (now_dt - dt).total_seconds() / 3600.0)
                except Exception:
                    hours = 0.0

                new_tier = "URGENT_4H" if hours >= 4.0 else "SOFT_2H" if hours >= 2.0 else None
                if new_tier != current_tier:
                    sb.table("questions_tracker").update({"sla_tier": new_tier}).eq("id", row_id).execute()
                    updated += 1
            return updated
        except Exception:
            return 0


def resolve_question(client: Optional[Any] = None, p_msg_id: str = "", p_resolver: str = "TA") -> bool:
    """
    Calls Postgres RPC resolve_question() or updates questions_tracker status to RESOLVED.
    """
    try:
        sb = client or get_supabase_client()
    except Exception:
        return False

    try:
        sb.rpc("resolve_question", {"p_msg_id": p_msg_id, "p_resolver": p_resolver}).execute()
        return True
    except Exception:
        try:
            res = sb.table("questions_tracker").update({
                "status": "RESOLVED",
                "resolved_at": now_iso()
            }).eq("msg_id", p_msg_id).neq("status", "RESOLVED").execute()
            return len(res.data or []) > 0
        except Exception:
            return False
