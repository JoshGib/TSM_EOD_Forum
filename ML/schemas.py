"""
Minimal schemas for the ML / EOD report service.

Only the financial-summary schemas are needed here; everything else
(threads, users, comments, etc.) lives in the main forum backend's
schemas.py and is intentionally not duplicated.

If you ever change FinancialSummaryOut or SectorPerformanceOut in the
forum backend, mirror those changes here so the two services stay in sync.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SectorPerformanceOut(BaseModel):
    id: int
    sector_name: str
    performance_percentage: str
    is_positive: bool

    class Config:
        from_attributes = True


class FinancialSummaryOut(BaseModel):
    id: int
    report_date: str
    summary_text: str
    market_tone: str
    source_urls: Optional[str] = None
    created_at: datetime
    sectors: list[SectorPerformanceOut] = []

    class Config:
        from_attributes = True
