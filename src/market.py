"""Indian + global market ka pichhla close aur change (yfinance se)."""

from __future__ import annotations

import yfinance as yf

SYMBOLS = {
    # India
    "Nifty 50": "^NSEI",
    "Sensex": "^BSESN",
    "Bank Nifty": "^NSEBANK",
    "India VIX": "^INDIAVIX",
    "Nifty IT": "^CNXIT",
    # Global
    "Dow Jones": "^DJI",
    "S&P 500": "^GSPC",
    "Nasdaq": "^IXIC",
    "Nikkei 225": "^N225",
    "Hang Seng": "^HSI",
    # Commodities / currency / bonds
    "Brent Crude": "BZ=F",
    "Gold": "GC=F",
    "USD/INR": "INR=X",
    "Dollar Index": "DX-Y.NYB",
    "US 10Y Yield": "^TNX",
}


def fetch_market() -> list[dict]:
    """Har symbol ka last close, change % aur 5-din ka trend. Fail ho to skip."""
    rows: list[dict] = []
    try:
        data = yf.download(
            list(SYMBOLS.values()),
            period="10d",
            interval="1d",
            group_by="ticker",
            progress=False,
            auto_adjust=False,
            threads=True,
        )
    except Exception as exc:
        print(f"[market] download failed: {exc}")
        return rows

    for name, sym in SYMBOLS.items():
        try:
            closes = data[sym]["Close"].dropna()
            if len(closes) < 2:
                continue
            last, prev = float(closes.iloc[-1]), float(closes.iloc[-2])
            first5 = float(closes.iloc[-6]) if len(closes) >= 6 else float(closes.iloc[0])
            rows.append(
                {
                    "name": name,
                    "symbol": sym,
                    "close": round(last, 2),
                    "change_pct": round((last - prev) / prev * 100, 2),
                    "change_5d_pct": round((last - first5) / first5 * 100, 2),
                    "date": closes.index[-1].strftime("%Y-%m-%d"),
                }
            )
        except Exception as exc:
            print(f"[market] {name}: {exc}")
    print(f"[market] got {len(rows)}/{len(SYMBOLS)} symbols")
    return rows


if __name__ == "__main__":
    for r in fetch_market():
        print(r)
