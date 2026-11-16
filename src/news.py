"""Indian market news ko RSS feeds se laata hai (pichhle ~20 ghante ki)."""

from __future__ import annotations

import calendar
import html
import re
import time
from datetime import datetime, timezone

import feedparser

FEEDS = {
    "ET Markets": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    "ET Stocks": "https://economictimes.indiatimes.com/markets/stocks/news/rssfeeds/2146842.cms",
    "ET Economy/Policy": "https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1106944246.cms",
    "Business Standard": "https://www.business-standard.com/rss/markets-106.rss",
    "Livemint": "https://www.livemint.com/rss/markets",
    "Google News (stocks)": "https://news.google.com/rss/search?q=NSE+BSE+stocks+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
    "Google News (results/orders)": "https://news.google.com/rss/search?q=quarterly+results+OR+order+win+OR+block+deal+India+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
    "Google News (govt/RBI/SEBI)": "https://news.google.com/rss/search?q=RBI+OR+SEBI+OR+%22finance+ministry%22+OR+GST+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
}

USER_AGENT = "Mozilla/5.0 (compatible; MarketBriefBot/1.0)"
_TAG = re.compile(r"<[^>]+>")


def _clean(text: str, limit: int = 300) -> str:
    text = html.unescape(_TAG.sub(" ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def fetch_news(max_age_hours: float = 20, per_feed: int = 40) -> list[dict]:
    """Saari feeds se taaza khabrein, duplicate headlines hata kar."""
    cutoff = time.time() - max_age_hours * 3600
    seen: set[str] = set()
    items: list[dict] = []

    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url, agent=USER_AGENT)
        except Exception as exc:  # network / parse errors -> skip that feed
            print(f"[news] {source}: failed ({exc})")
            continue

        count = 0
        for entry in feed.entries[:per_feed]:
            title = _clean(entry.get("title", ""), 220)
            if not title:
                continue
            key = re.sub(r"[^a-z0-9]", "", title.lower())[:80]
            if key in seen:
                continue

            published = entry.get("published_parsed") or entry.get("updated_parsed")
            ts = calendar.timegm(published) if published else None
            if ts and ts < cutoff:
                continue

            seen.add(key)
            count += 1
            items.append(
                {
                    "source": source,
                    "title": title,
                    "summary": _clean(entry.get("summary", "")),
                    "link": entry.get("link", ""),
                    "published": (
                        datetime.fromtimestamp(ts, timezone.utc).isoformat() if ts else None
                    ),
                }
            )
        print(f"[news] {source}: {count} items")

    items.sort(key=lambda x: x["published"] or "", reverse=True)
    return items


if __name__ == "__main__":
    news = fetch_news()
    print(f"total {len(news)}")
    for n in news[:10]:
        print("-", n["source"], "|", n["title"])
