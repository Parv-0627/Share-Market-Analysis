# Subah 8 Baje: Market Brief

Website par **🔄 Refresh** dabao, 5-10 min me Indian share market ka taza analysis:

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
Website ka Refresh button → GitHub Actions (sirf button dabane par)
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
4. Website kholo: `https://<username>.github.io/Share-Market-Analysis/` → **🔄 Refresh**.
   Pehli baar ek GitHub token maangega (fine-grained, sirf is repo ke liye, permission **Actions: Read and write**).
   Token sirf aapke browser me save hota hai. Refresh ke bina koi report nahi banti, isliye API kharcha sirf tab hota hai.

Bina token ke: **Actions** tab → "Market Report" → **Run workflow** se bhi report ban jaati hai.

Roz automatic chalana ho to `.github/workflows/daily-report.yml` me `schedule: - cron: "0 2 * * 1-5"` (07:30 IST) wapas jod dein.

## Local chalana

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python run.py                       # report banata hai → site/data/
python -m http.server -d site 8000  # http://localhost:8000
```

## Kharcha

Har Refresh = ek report = Claude Opus 5.5 ka kharcha (asli figure pehle successful run ke baad yahan update hoga). Jitni baar Refresh, utni baar kharcha; 30 min ke andar dobara dabane par website confirm karti hai. GitHub Actions + Pages public repo ke liye free hain.

## Customize

- News sources: `src/news.py` → `FEEDS`
- Indices/commodities: `src/market.py` → `SYMBOLS`
- Analysis ka tareeka / bhasha: `src/analyze.py` → `SYSTEM_PROMPT`, `RESEARCH_PROMPT`
- Auto schedule: `.github/workflows/daily-report.yml` → `schedule`
