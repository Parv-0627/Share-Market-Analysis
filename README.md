# Subah 8 Baje: Market Brief

Roz subah (Mon–Fri) market khulne se pehle ek website par Indian share market ka analysis:

- **Market mood**: expected opening (GIFT Nifty), Nifty/Bank Nifty support-resistance, FII/DII
- **Global cues**: US, Asia, crude, gold, rupee, dollar, bond yield
- **Positive / Negative news**: kis company ke saath kya hua, share par kya asar
- **Events & announcements**: govt / RBI / SEBI / results / global data, aaj ya agle 1-3 din
- **Aaj inme trade na lein**: event risk wale shares
- **Intraday ideas** (entry / target / stop-loss) + aaj ki strategy
- **Short-term ideas** (1-4 hafte) + overall view
- Sector view, risks, sources, aur purani reports ka archive

> ⚠️ Ye AI se bana educational analysis hai, SEBI-registered advice nahi.

## Kaise kaam karta hai

```
GitHub Actions (07:30 IST, Mon–Fri)
  ├─ src/news.py     → ET, Livemint, Google News RSS (pichhle 20 ghante)
  ├─ src/market.py   → Nifty, Sensex, Bank Nifty, VIX, US/Asia indices, crude, gold, USD/INR (yfinance)
  ├─ src/analyze.py  → Claude: (1) web search se GIFT Nifty, FII/DII, aaj ke events
  │                            (2) sab milakar structured JSON report
  ├─ site/data/latest.json + archive/YYYY-MM-DD.json  (repo me commit)
  └─ GitHub Pages par site/ deploy
```

## Setup (ek baar)

1. **Anthropic API key** banao: https://platform.claude.com → API Keys.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `ANTHROPIC_API_KEY`, Value: aapki key
3. GitHub repo → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**
4. **Actions** tab → "Daily Market Report" → **Run workflow** (pehli report turant banane ke liye).
5. Website: `https://<username>.github.io/Share-Market-Analysis/`

Iske baad har Mon–Fri subah 7:30 IST par apne aap chalega (GitHub kabhi-kabhi 10-20 min late chalata hai, isliye 8 baje se pehle start rakha hai).

## Local chalana

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python run.py                       # report banata hai → site/data/
python -m http.server -d site 8000  # http://localhost:8000
```

## Kharcha

Claude Opus 5.5 per report: ~50k input + ~15k output tokens + ~10 web searches ≈ **$0.5–0.8 (₹45–70)**, yaani mahine ka lagbhag ₹1,000–1,500 (sirf weekdays). GitHub Actions + Pages public repo ke liye free hain.

## Customize

- News sources: `src/news.py` → `FEEDS`
- Indices/commodities: `src/market.py` → `SYMBOLS`
- Analysis ka tareeka / bhasha: `src/analyze.py` → `SYSTEM_PROMPT`, `RESEARCH_PROMPT`
- Timing: `.github/workflows/daily-report.yml` → `cron`
