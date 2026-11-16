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
        <div class="meta">${esc(genStr)}${r.market_phase ? ` · ${esc(r.market_phase)}` : ""} · ${esc(r.news_count ?? "?")} news analyse ki gayi</div>
        <p class="headline">${esc(r.headline)}</p>
        <div class="badges">
          <span class="badge ${moodCls}">Mood: ${esc(moodLabel)}</span>
          <span class="badge">Opening: ${esc(m.expected_open)}</span>
        </div>
        <p>${esc(m.summary)}</p>
      </section>

      ${tiles ? card("Market Snapshot <span class=\"muted small\">(report ke waqt ka)</span>", `<div class="tiles">${tiles}</div>`) : ""}

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
    const res = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  }

  async function load(date) {
    app.innerHTML = `<p class="loading">Report load ho raha hai…</p>`;
    try {
      const r = await getJSON(date ? `data/archive/${date}.json` : "data/latest.json");
      render(r);
      document.title = `Market Brief · ${r.date}`;
      if (!date && r.generated_at) latestGeneratedAt = new Date(r.generated_at).getTime();
    } catch (e) {
      app.innerHTML = `<section class="card"><p class="empty">Abhi koi report nahi hai. Upar <strong>🔄 Refresh</strong> dabayein, 5-10 min me taza report aa jayegi.</p></section>`;
    }
  }

  // ---------- Refresh: button dabane par hi GitHub Action (aur Claude API) chalta hai ----------
  const OWNER = location.hostname.endsWith(".github.io") ? location.hostname.split(".")[0] : "Parv-0627";
  const REPO = location.pathname.split("/").filter(Boolean)[0] || "Share-Market-Analysis";
  const WORKFLOW = "daily-report.yml";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/actions`;
  const PW_KEY = "refresh_pw";
  const btn = document.getElementById("refresh-btn");
  const statusEl = document.getElementById("refresh-status");
  const dialog = document.getElementById("pw-dialog");
  const pwInput = document.getElementById("pw-input");
  const pwRemember = document.getElementById("pw-remember");
  const pwError = document.getElementById("pw-error");
  let latestGeneratedAt = null;

  const store = {
    get() { try { return localStorage.getItem(PW_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(PW_KEY, v); } catch {} },
    clear() { try { localStorage.removeItem(PW_KEY); } catch {} },
  };

  // site/refresh-key.json me GitHub token password se encrypted hai (set_password.py se bana).
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function decryptToken(password) {
    const k = await getJSON("refresh-key.json").catch(() => null);
    if (!k) throw new Error("nokey");
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: unb64(k.salt), iterations: k.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(k.iv) }, key, unb64(k.data));
      return new TextDecoder().decode(plain);
    } catch {
      throw new Error("badpw");
    }
  }

  function askPassword(errorMsg = "") {
    return new Promise((resolve) => {
      pwInput.value = "";
      pwError.textContent = errorMsg;
      pwError.hidden = !errorMsg;
      dialog.onclose = () => resolve(dialog.returnValue === "ok" ? { pw: pwInput.value, remember: pwRemember.checked } : null);
      dialog.returnValue = "";
      dialog.showModal();
      pwInput.focus();
    });
  }

  async function getToken() {
    let pw = store.get();
    let remember = true;
    let err = "";
    for (let i = 0; i < 5; i++) {
      if (!pw) {
        const ans = await askPassword(err);
        if (!ans || !ans.pw) return null;
        ({ pw, remember } = ans);
      }
      setStatus("🔐 Password check ho raha hai…");
      try {
        const token = await decryptToken(pw);
        if (remember) store.set(pw);
        return token;
      } catch (e) {
        if (e.message === "nokey") throw e;
        store.clear();
        pw = null;
        err = "❌ Galat password, dobara try karein.";
        setStatus("");
      }
    }
    return null;
  }

  function setStatus(msg, kind = "") {
    statusEl.hidden = !msg;
    statusEl.className = `wrap status ${kind}`;
    statusEl.innerHTML = msg || "";
  }

  async function gh(path, token, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      const err = new Error("auth");
      err.status = res.status;
      err.step = (opts.method || "GET") === "POST" ? "run start" : "run status";
      try { err.detail = (await res.json()).message || ""; } catch { err.detail = ""; }
      throw err;
    }
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async function activeRun(token) {
    const data = await gh(`/workflows/${WORKFLOW}/runs?per_page=5`, token);
    return (data.workflow_runs || []).find((r) => r.status !== "completed") || null;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForRun(token, runId, startedAt) {
    for (;;) {
      await sleep(15000);
      const run = await gh(`/runs/${runId}`, token);
      const mins = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
      if (run.status !== "completed") {
        setStatus(`⏳ Taza report ban rahi hai… (${mins} min, aam taur par 5-10 min lagte hain). Ye page khula rakhein.`);
        continue;
      }
      return run;
    }
  }

  async function refresh() {
    if (latestGeneratedAt && Date.now() - latestGeneratedAt < 30 * 60000) {
      const mins = Math.round((Date.now() - latestGeneratedAt) / 60000);
      if (!window.confirm(`Report sirf ${mins} min pehle bani thi. Phir bhi nayi banayein? (Claude API ka kharcha hoga)`)) return;
    }

    btn.disabled = true;
    try {
      const token = await getToken();
      if (!token) { setStatus(""); return; }
      let run = await activeRun(token);
      const startedAt = Date.now();
      if (run) {
        setStatus("⏳ Ek report pehle se ban rahi hai, usi ka intezaar kar rahe hain…");
      } else {
        setStatus("🚀 Refresh shuru kar rahe hain…");
        await gh(`/workflows/${WORKFLOW}/dispatches`, token, { method: "POST", body: JSON.stringify({ ref: "main" }) });
        for (let i = 0; i < 10 && !run; i++) { await sleep(3000); run = await activeRun(token); }
        if (!run) throw new Error("Run shuru nahi hua dikha");
      }
      setStatus("⏳ Taza report ban rahi hai… (5-10 min lagte hain). Ye page khula rakhein.");
      const done = await waitForRun(token, run.id, startedAt);
      if (done.conclusion !== "success") {
        setStatus(`❌ Report nahi ban payi (${esc(done.conclusion)}). <a href="${esc(done.html_url)}" target="_blank" rel="noopener">GitHub par error dekhein</a>`, "err");
        return;
      }
      setStatus("✅ Taza report aa gayi!", "ok");
      await sleep(5000); // Pages ko naya version serve karne do
      await init();
      setTimeout(() => setStatus(""), 8000);
    } catch (e) {
      if (e.message === "nokey") {
        setStatus("❌ Refresh password abhi set nahi hua. Codespace terminal me <code>python set_password.py</code> chalaayein aur push karein.", "err");
      } else if (e.message === "auth") {
        const why = e.status === 401
          ? "token galat ya expire ho gaya hai: <code>python set_password.py</code> se naya token set karein"
          : "token ko is repo par <strong>Actions: Read and write</strong> permission nahi hai: github.com/settings/personal-access-tokens par token edit karke ye permission dein (token wahi rahega)";
        setStatus(`❌ GitHub ne mana kiya (${e.status}, ${esc(e.step)}${e.detail ? ": " + esc(e.detail) : ""}). Wajah: ${why}.`, "err");
      } else {
        setStatus(`❌ Refresh fail: ${esc(e.message)}. <a href="https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}" target="_blank" rel="noopener">GitHub par khud chalayein</a>`, "err");
      }
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", refresh);
  document.getElementById("pw-cancel").addEventListener("click", () => dialog.close(""));
  document.getElementById("pw-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    dialog.close("ok");
  });

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
    select.onchange = () => {
      location.hash = select.value === dates[0] ? "" : select.value;
      load(select.value === dates[0] ? null : select.value);
    };
    await load(start);
  }

  init();
})();
