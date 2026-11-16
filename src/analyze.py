"""News + market data ko Claude se analyse karwa kar structured report banata hai."""

from __future__ import annotations

import json

import anthropic

MODEL = "claude-opus-5-5"

_STOCK_NEWS = {
    "type": "object",
    "properties": {
        "company": {"type": "string"},
        "symbol": {"type": "string", "description": "NSE symbol, e.g. RELIANCE"},
        "headline": {"type": "string"},
        "detail": {"type": "string", "description": "Kya hua aur share par kya asar ho sakta hai (Hinglish, 1-2 line)"},
        "impact": {"type": "string", "enum": ["high", "medium", "low"]},
        "source": {"type": "string"},
    },
    "required": ["company", "symbol", "headline", "detail", "impact", "source"],
    "additionalProperties": False,
}

_PICK = {
    "type": "object",
    "properties": {
        "symbol": {"type": "string"},
        "company": {"type": "string"},
        "action": {"type": "string", "enum": ["BUY", "SELL", "WATCH"]},
        "entry": {"type": "string", "description": "Entry level/range, e.g. '1450-1460'"},
        "target": {"type": "string"},
        "stop_loss": {"type": "string"},
        "reason": {"type": "string"},
        "risk": {"type": "string", "enum": ["low", "medium", "high"]},
    },
    "required": ["symbol", "company", "action", "entry", "target", "stop_loss", "reason", "risk"],
    "additionalProperties": False,
}

REPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string", "description": "Aaj ke market ka ek line ka summary"},
        "market_mood": {
            "type": "object",
            "properties": {
                "sentiment": {"type": "string", "enum": ["bullish", "mildly_bullish", "neutral", "mildly_bearish", "bearish"]},
                "expected_open": {"type": "string", "description": "Gap-up / flat / gap-down aur GIFT Nifty ka indication"},
                "summary": {"type": "string"},
                "nifty_support": {"type": "string"},
                "nifty_resistance": {"type": "string"},
                "banknifty_support": {"type": "string"},
                "banknifty_resistance": {"type": "string"},
                "fii_dii": {"type": "string", "description": "Pichhle din ka FII/DII cash data agar mila"},
            },
            "required": ["sentiment", "expected_open", "summary", "nifty_support", "nifty_resistance",
                         "banknifty_support", "banknifty_resistance", "fii_dii"],
            "additionalProperties": False,
        },
        "global_cues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "status": {"type": "string"},
                    "impact": {"type": "string", "enum": ["positive", "negative", "neutral"]},
                },
                "required": ["name", "status", "impact"],
                "additionalProperties": False,
            },
        },
        "positive_news": {"type": "array", "items": _STOCK_NEWS},
        "negative_news": {"type": "array", "items": _STOCK_NEWS},
        "events_today": {
            "type": "array",
            "description": "Aaj/agle kuch din ke announcements: govt, RBI, SEBI, results, board meetings, global data",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "category": {"type": "string", "enum": ["government", "rbi", "sebi", "results", "corporate", "global", "other"]},
                    "when": {"type": "string"},
                    "detail": {"type": "string"},
                    "affected": {"type": "string", "description": "Kaun se stocks/sectors par asar"},
                },
                "required": ["title", "category", "when", "detail", "affected"],
                "additionalProperties": False,
            },
        },
        "avoid_today": {
            "type": "array",
            "description": "Aaj jin shares me trade lena theek nahi (event risk, high volatility, unclear news)",
            "items": {
                "type": "object",
                "properties": {"symbol": {"type": "string"}, "reason": {"type": "string"}},
                "required": ["symbol", "reason"],
                "additionalProperties": False,
            },
        },
        "sectors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sector": {"type": "string"},
                    "view": {"type": "string", "enum": ["positive", "negative", "neutral"]},
                    "reason": {"type": "string"},
                },
                "required": ["sector", "view", "reason"],
                "additionalProperties": False,
            },
        },
        "intraday_ideas": {"type": "array", "items": _PICK},
        "short_term_ideas": {
            "type": "array",
            "description": "1-4 hafte ke liye",
            "items": _PICK,
        },
        "intraday_strategy": {"type": "string", "description": "Aaj intraday kaise khelna chahiye"},
        "short_term_view": {"type": "string", "description": "Agle 1-4 hafte ka market view"},
        "key_risks": {"type": "array", "items": {"type": "string"}},
        "sources": {"type": "array", "items": {"type": "string"}, "description": "Use kiye gaye URLs"},
    },
    "required": ["headline", "market_mood", "global_cues", "positive_news", "negative_news", "events_today",
                 "avoid_today", "sectors", "intraday_ideas", "short_term_ideas", "intraday_strategy",
                 "short_term_view", "key_risks", "sources"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """Tum ek experienced Indian stock market analyst ho jo har subah 8 baje (IST), market khulne se pehle, retail traders ke liye pre-market brief banata hai.

Tumhe di jaayengi: pichhle ~20 ghante ki news headlines (Indian + global), indices/commodities ka latest close data, aur aaj subah ke web research notes (GIFT Nifty, FII/DII data, aaj ke results/events, govt/RBI/SEBI announcements, badi khabron ki confirmation).

Report kaise likhni hai:
- Bhasha: simple Hinglish (Roman script Hindi + English market terms), jaise ek trader dost ko samjha rahe ho.
- Har company ki news ke saath NSE symbol do. Sirf wahi news daalo jiska share price par asar ho sakta hai; generic ya purani news chhod do.
- positive_news / negative_news: order wins, results, upgrades/downgrades, block deals, regulatory action, promoter activity, management change, etc. Jitni relevant ho utni (aam taur par 5-12 har side).
- events_today: aaj ya agle 1-3 din me hone wale government/RBI/SEBI announcements, results, global data (US CPI, Fed, etc.). Agar koi bada event aane wala hai to batao ki us din kin shares/sectors me trade lena risky hai, aur unhe avoid_today me bhi daalo.
- intraday_ideas: 3-6 ideas, sirf liquid F&O/large/mid-cap stocks se, news-driven catalyst ke saath. Har idea me entry, target aur stop-loss practical levels pe do (latest price ke aas paas, jo news/search me mila ho). Agar price confidently nahi pata to entry me "opening ke 15 min ke high ke upar" jaisa rule-based level do, number mat banao.
- short_term_ideas: 2-5 ideas, 1-4 hafte ke horizon ke liye.
- Market mood ko data se justify karo (global cues, GIFT Nifty, VIX, FII flow, crude, rupee).
- Imaandari: jo pata nahi hai use "data nahi mila" likho. Koi number, news ya event mat gadho. Agar market ke liye din risky/unclear hai to saaf bolo ki aaj kam trade karna ya cash me rehna behtar hai.
- sources me un articles/pages ke URL do jinka tumne use kiya (headlines ke links aur research notes ke URLs se).

Ye educational analysis hai, SEBI-registered advice nahi; yeh disclaimer website khud dikhati hai, report me baar-baar likhne ki zaroorat nahi."""


def _build_user_message(news: list[dict], market: list[dict], today: str) -> str:
    market_lines = "\n".join(
        f"- {m['name']}: {m['close']} ({m['change_pct']:+.2f}% 1D, {m['change_5d_pct']:+.2f}% 5D, as of {m['date']})"
        for m in market
    ) or "- Market data fetch nahi ho paya, web search se lo."
    news_lines = "\n".join(
        f"[{i}] ({n['source']}, {n['published'] or 'time n/a'}) {n['title']}"
        + (f" — {n['summary']}" if n["summary"] and n["summary"] != n["title"] else "")
        + f" <{n['link']}>"
        for i, n in enumerate(news, 1)
    )
    return f"""Aaj ki date: {today} (IST). Pre-market report banao.

## Market data (latest close)
{market_lines}

## News headlines (latest pehle)
{news_lines}"""


RESEARCH_PROMPT = """Tum Indian stock market ke research assistant ho. Pre-market report ke liye web search karke ye cheezein dhoondo aur saaf bullet notes do (har point ke saath source URL):
1. GIFT Nifty ka abhi ka level aur indicated opening (gap-up/down kitna).
2. Pichhle trading din ka FII/DII cash data (crore me).
3. Aaj ke quarterly results / board meetings / dividend-split record dates (bade naam).
4. Aaj ya agle 1-3 din ke government, RBI, SEBI, GST council announcements ya policy events.
5. Aaj ke global data/events (US CPI, Fed, jobs data, etc.) jo Indian market hila sakte hain.
6. Di gayi headlines me se 4-6 sabse badi stock-specific khabron ki confirmation aur stock ka latest price (agar mile).
Jo na mile use "nahi mila" likho. Kuch bhi gadho mat. Sirf notes do, report nahi."""

_FALLBACK = dict(betas=["server-side-fallback-2026-07-01"], fallbacks="default")


def _check(response, step: str) -> None:
    u = response.usage
    print(f"[claude:{step}] stop={response.stop_reason} model={response.model} in={u.input_tokens} out={u.output_tokens}")
    if response.stop_reason == "refusal":
        raise RuntimeError(f"[{step}] Claude ne request decline ki: {response.stop_details}")
    if response.stop_reason == "max_tokens":
        raise RuntimeError(f"[{step}] Response max_tokens par kat gaya")


def _research(client: anthropic.Anthropic, context: str) -> str:
    """Step 1: web search se GIFT Nifty, FII/DII, aaj ke events, etc. (free text notes)."""
    messages: list = [{"role": "user", "content": context + "\n\n" + RESEARCH_PROMPT}]
    for _ in range(5):
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=32000,
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
            tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 12,
                    "user_location": {"type": "approximate", "country": "IN", "timezone": "Asia/Kolkata"}}],
            messages=messages,
            **_FALLBACK,
        ) as stream:
            response = stream.get_final_message()
        # Web search lamba chale to "pause_turn" aata hai; same turn continue karwate hain.
        if response.stop_reason != "pause_turn":
            break
        messages.append({"role": "assistant", "content": response.content})
    _check(response, "research")
    notes = "\n".join(b.text for b in response.content if b.type == "text").strip()
    return notes or "Web research se kuch nahi mila."


def analyze(news: list[dict], market: list[dict], today: str) -> dict:
    """Step 1 research (web search) -> Step 2 structured JSON report.

    Do alag calls isliye: web search ke results citations ke saath aate hain, aur
    citations structured output (output_config.format) ke saath allowed nahi hain.
    """
    client = anthropic.Anthropic()
    context = _build_user_message(news, market, today)

    try:
        notes = _research(client, context)
    except anthropic.APIError as exc:  # research fail ho to bhi report bane
        print(f"[claude:research] failed, continuing without web notes: {exc}")
        notes = "Web research is baar fail ho gaya; sirf headlines aur market data par analysis karo."

    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=64000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": REPORT_SCHEMA}},
        messages=[{"role": "user", "content": f"{context}\n\n## Web research notes (aaj subah ki)\n{notes}\n\nAb poori report schema ke hisaab se do."}],
        **_FALLBACK,
    ) as stream:
        response = stream.get_final_message()
    _check(response, "report")

    texts = [b.text for b in response.content if b.type == "text"]
    if not texts:
        raise RuntimeError("Response me text nahi mila")
    report = json.loads(texts[-1])
    report["research_notes"] = notes
    return report
