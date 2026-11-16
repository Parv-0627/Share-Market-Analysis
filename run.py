"""Roz ka pre-market report: news + market data -> Claude analysis -> site/data/*.json

Chalane ke liye:  ANTHROPIC_API_KEY=... python run.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyze import MODEL, analyze  # noqa: E402
from market import fetch_market  # noqa: E402
from news import fetch_news  # noqa: E402

IST = ZoneInfo("Asia/Kolkata")
DATA_DIR = Path(__file__).parent / "site" / "data"


def main() -> None:
    now = datetime.now(IST)
    today = now.strftime("%Y-%m-%d")

    news = fetch_news()
    market = fetch_market()
    if not news:
        sys.exit("Koi news nahi mili, report nahi bana rahe.")

    report = analyze(news, market, today)
    report["date"] = today
    report["generated_at"] = now.isoformat(timespec="minutes")
    report["model"] = MODEL
    report["market_data"] = market
    report["news_count"] = len(news)

    archive = DATA_DIR / "archive"
    archive.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    (DATA_DIR / "latest.json").write_text(payload, encoding="utf-8")
    (archive / f"{today}.json").write_text(payload, encoding="utf-8")

    dates = sorted((p.stem for p in archive.glob("*.json")), reverse=True)
    (DATA_DIR / "index.json").write_text(json.dumps(dates), encoding="utf-8")
    print(f"Report saved for {today} ({len(dates)} reports in archive)")


if __name__ == "__main__":
    main()
