(() => {
  const app = document.getElementById("app");
  const select = document.getElementById("date-select");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : null);

  const MOOD = {
    bullish: ["Bullish", "up"],
    mildly_bullish: ["Thoda Bullish", "up"],
    neutral: ["Neutral / Sideways", "flat"],
    mildly_bearish: ["Thoda Bearish", "down"],
    bearish: ["Bearish", "down"],
  };
  const IMPACT = { positive: "up", negative: "down", neutral: "flat" };

  const card = (title, body, count) =>
    `<section class="card"><h2>${title}${count != null ? ` <span class="count">${count}</span>` : ""}</h2>${body}</section>`;
  const emptyMsg = (msg = "Aaj kuch khaas nahi.") => `<p class="empty">${msg}</p>`;

  function newsList(items, cls) {
    if (!items?.length) return emptyMsg();
    return `<ul class="list">${items
      .map(
        (n) => `<li class="item ${cls}">
          <div class="t"><span class="sym">${esc(n.symbol)}</span>${esc(n.company)}<span class="tag ${esc(n.impact)}">${esc(n.impact)}</span></div>
          <div>${esc(n.headline)}</div>
          <div class="d">${esc(n.detail)} <span class="small">· ${esc(n.source)}</span></div>
        </li>`
      )
      .join("")}</ul>`;
  }

  function ideasTable(items) {
    if (!items?.length) return emptyMsg("Aaj koi clear setup nahi. Cash me rehna bhi ek position hai.");
    return `<div class="table-wrap"><table>
      <thead><tr><th>Stock</th><th>Call</th><th>Entry</th><th>Target</th><th>Stop-loss</th><th>Risk</th></tr></thead>
      <tbody>${items
        .map(
          (p) => `<tr>
            <td><strong>${esc(p.symbol)}</strong><br><span class="small muted">${esc(p.company)}</span><span class="reason">${esc(p.reason)}</span></td>
            <td><span class="act ${esc(p.action)}">${esc(p.action)}</span></td>
            <td class="num">${esc(p.entry)}</td>
            <td class="num up-t">${esc(p.target)}</td>
            <td class="num down-t">${esc(p.stop_loss)}</td>
            <td><span class="tag ${p.risk === "high" ? "high" : p.risk === "medium" ? "medium" : "low"}">${esc(p.risk)}</span></td>
          </tr>`
        )
        .join("")}</tbody></table></div>`;
  }

  function render(r) {
    const m = r.market_mood || {};
    const [moodLabel, moodCls] = MOOD[m.sentiment] || [m.sentiment || "n/a", "flat"];
    const gen = r.generated_at ? new Date(r.generated_at) : null;
    const genStr = gen
      ? gen.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST"
      : r.date;

    const tiles = (r.market_data || [])
      .map((t) => {
        const cls = t.change_pct > 0 ? "up-t" : t.change_pct < 0 ? "down-t" : "";
        const sign = t.change_pct > 0 ? "+" : "";
        return `<div class="tile"><div class="n">${esc(t.name)}</div><div class="v">${Number(t.close).toLocaleString("en-IN")}</div>
          <div class="c ${cls}">${sign}${esc(t.change_pct)}% <span class="muted small">· 5D ${t.change_5d_pct > 0 ? "+" : ""}${esc(t.change_5d_pct)}%</span></div></div>`;
      })
      .join("");

    const cues = (r.global_cues || [])
      .map((c) => `<span class="badge ${IMPACT[c.impact] || ""}" title="${esc(c.status)}">${esc(c.name)}: ${esc(c.status)}</span>`)
      .join("");

    const events = r.events_today?.length
      ? `<ul class="list">${r.events_today
          .map(
            (e) => `<li class="item ev"><div class="t">${esc(e.title)}<span class="tag cat">${esc(e.category)}</span></div>
              <div class="d"><strong>Kab:</strong> ${esc(e.when)} · ${esc(e.detail)}</div>
              <div class="d"><strong>Asar:</strong> ${esc(e.affected)}</div></li>`
          )
          .join("")}</ul>`
      : emptyMsg();

    const avoid = r.avoid_today?.length
      ? `<ul class="list">${r.avoid_today
          .map((a) => `<li class="item av"><div class="t"><span class="sym">${esc(a.symbol)}</span></div><div class="d">${esc(a.reason)}</div></li>`)
          .join("")}</ul>`
      : emptyMsg("Koi khaas stock avoid list me nahi.");

    const sectors = r.sectors?.length
      ? `<div class="chips">${r.sectors
          .map(
            (s) => `<div class="chip"><div class="s">${esc(s.sector)} <span class="badge ${IMPACT[s.view] || ""}">${esc(s.view)}</span></div>
              <div class="small muted">${esc(s.reason)}</div></div>`
          )
          .join("")}</div>`
      : emptyMsg();

    const risks = r.key_risks?.length ? `<ul>${r.key_risks.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : emptyMsg();
    const sources = (r.sources || [])
      .map((u) => (safeUrl(u) ? `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>` : `<li>${esc(u)}</li>`))
      .join("");

    app.innerHTML = `
      <section class="card hero">
        <div class="meta">${esc(genStr)} · ${esc(r.news_count ?? "?")} news analyse ki gayi</div>
        <p class="headline">${esc(r.headline)}</p>
        <div class="badges">
          <span class="badge ${moodCls}">Mood: ${esc(moodLabel)}</span>
          <span class="badge">Opening: ${esc(m.expected_open)}</span>
        </div>
        <p>${esc(m.summary)}</p>
      </section>

      ${tiles ? card("Market Snapshot <span class=\"muted small\">(pichhla close)</span>", `<div class="tiles">${tiles}</div>`) : ""}

      ${card(
        "Key Levels &amp; Flows",
        `<div class="levels">
          <div class="level"><div class="k">Nifty Support</div><div class="v">${esc(m.nifty_support)}</div></div>
          <div class="level"><div class="k">Nifty Resistance</div><div class="v">${esc(m.nifty_resistance)}</div></div>
          <div class="level"><div class="k">Bank Nifty Support</div><div class="v">${esc(m.banknifty_support)}</div></div>
          <div class="level"><div class="k">Bank Nifty Resistance</div><div class="v">${esc(m.banknifty_resistance)}</div></div>
          <div class="level"><div class="k">FII / DII</div><div class="v">${esc(m.fii_dii)}</div></div>
        </div>
        ${cues ? `<h2 style="margin-top:16px">Global Cues</h2><div class="badges">${cues}</div>` : ""}`
      )}

      <div class="grid-2">
        ${card("🟢 Positive News", newsList(r.positive_news, "pos"), r.positive_news?.length ?? 0)}
        ${card("🔴 Negative News", newsList(r.negative_news, "neg"), r.negative_news?.length ?? 0)}
      </div>

      <div class="grid-2">
        ${card("📅 Aaj / Aane Wale Events &amp; Announcements", events, r.events_today?.length ?? 0)}
        ${card("⚠️ Aaj Inme Trade Na Lein", avoid, r.avoid_today?.length ?? 0)}
      </div>

      ${card("⚡ Intraday Ideas", ideasTable(r.intraday_ideas) + (r.intraday_strategy ? `<p class="strategy"><strong>Aaj ki strategy:</strong> ${esc(r.intraday_strategy)}</p>` : ""))}

      ${card("📈 Short-Term Ideas <span class=\"muted small\">(1-4 hafte)</span>", ideasTable(r.short_term_ideas) + (r.short_term_view ? `<p class="strategy"><strong>Overall view:</strong> ${esc(r.short_term_view)}</p>` : ""))}

      ${card("Sector View", sectors)}

      <div class="grid-2">
        ${card("Risks", risks)}
        ${card("Sources", sources ? `<details><summary>${(r.sources || []).length} sources dekhein</summary><ul class="sources">${sources}</ul></details>` : emptyMsg("—"))}
      </div>
    `;
  }

  async function getJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  async function load(date) {
    app.innerHTML = `<p class="loading">Report load ho raha hai…</p>`;
    try {
      const r = await getJSON(date ? `data/archive/${date}.json` : "data/latest.json");
      render(r);
      document.title = `Subah 8 Baje · ${r.date}`;
    } catch (e) {
      app.innerHTML = `<section class="card"><p class="empty">Abhi koi report nahi mili. Pehli report agle subah 8 baje (Mon–Fri) aayegi, ya GitHub Actions se "Run workflow" chalaayein.</p></section>`;
    }
  }

  async function init() {
    let dates = [];
    try { dates = await getJSON("data/index.json"); } catch {}
    const fromHash = decodeURIComponent(location.hash.slice(1));
    select.innerHTML = dates.length
      ? dates.map((d, i) => `<option value="${esc(d)}">${esc(d)}${i === 0 ? " (latest)" : ""}</option>`).join("")
      : `<option>No reports yet</option>`;
    select.disabled = !dates.length;
    const start = dates.includes(fromHash) ? fromHash : null;
    if (start) select.value = start;
    select.addEventListener("change", () => {
      location.hash = select.value === dates[0] ? "" : select.value;
      load(select.value === dates[0] ? null : select.value);
    });
    load(start);
  }

  init();
})();
