/**
 * PRECIPICE · 220 Studio
 * Built on the exact Search for Her 220 Studio design system (styles/apple.css).
 * Includes:
 * - Dual YouTube IFrame API player (Workshop #1 sokfqTz0Gfk + Dinner After zRTcxtOp6uQ)
 * - Live "This Moment" monitor card with AI video ideas + Source files + Start to Generate button
 * - Tier 1 AI Actors (Russ Murphy, Ken Newman, Rob Nilsson, Zhan Petrov) with 8-angle stills,
 *   4-angle turnaround sheets, Kodak 500T AI stills/videos, D010 voice stems & Start to Generate
 * - Tier 2 Full 28-Cast Character Bible grouped in expandable .ch accordions
 * - ⌘K Search Sheet across AI Actors, Moments, Cast, and AI Video Suggestions
 * - Live connection to local Google Flow Chrome Automation Bridge (http://127.0.0.1:8788)
 */
(function () {
  "use strict";

  const DATA = window.PRECIPICE_HUB_DATA;
  const VIDEOS = DATA.workshopVideos;
  const ACTORS = DATA.tier1Actors;
  const CAST = DATA.tier2CastRoster;
  const SUGGESTIONS = DATA.videoSuggestions;
  const BRIDGE_BASE = "http://127.0.0.1:8788";
  const STORE_KEY = "precipice-studio-choices";

  // Decisions (D001, D010 …) are owned by the Control Tower; read them live from there.
  const TOWER = "https://zhanpetrov.github.io/precipice/";
  let DECISIONS = {};

  const $ = (id) => document.getElementById(id);

  let player = null;
  let ready = false;
  let vidIdx = 0;
  let chapIdx = 0;
  let choices = loadChoices();
  let lastPayload = null;
  const openMore = { ideas: true, files: false };

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function dref(id) {
    const d = DECISIONS[id];
    const title = d ? `${id} · ${d.status}: ${d.title}` : "Open in Control Tower";
    return `<a class="dref${d ? " dref-" + esc(d.status) : ""}" data-dref="${esc(id)}" href="${TOWER}#dec-${esc(id)}" target="_blank" rel="noopener" title="${esc(title)}">${esc(id)}${d ? " · " + esc(d.status) : ""}</a>`;
  }

  function refreshDrefs() {
    document.querySelectorAll("[data-dref]").forEach((el) => { el.outerHTML = dref(el.dataset.dref); });
  }

  function loadDecisions() {
    fetch(TOWER + "data/production.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { (j.decisions || []).forEach((d) => { DECISIONS[d.id] = d; }); refreshDrefs(); })
      .catch(() => {});
  }

  // ---------- Views: each menu item shows its own sections ----------
  const VIEW_OF_HASH = { "": "workshop", top: "workshop", workshop: "workshop", "every-moment": "workshop",
    actors: "actors", suggestions: "video", cast: "cast", how: "how" };

  function showView(view, scrollTarget) {
    document.querySelectorAll("[data-view]").forEach((sec) => { sec.hidden = sec.dataset.view !== view; });
    document.querySelectorAll("[data-view-link]").forEach((a) => a.classList.toggle("on", a.dataset.viewLink === view));
    const on = document.querySelector(".bar-link.on");
    const nav = on && on.parentElement;
    if (nav && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2;
    if (scrollTarget) scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo(0, 0);
  }

  function routeFromHash() {
    const h = location.hash.slice(1);
    const view = h.startsWith("actor-card-") ? "actors" : VIEW_OF_HASH[h] || "workshop";
    showView(view, h && h !== view && h !== "workshop" && h !== "top" ? document.getElementById(h) : null);
  }

  function goTo(hash) {
    if (location.hash === "#" + hash) routeFromHash();
    else location.hash = hash;
  }

  function loadChoices() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }

  function saveChoices() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(choices)); } catch (e) {}
  }

  // ---------- Google Flow Local Bridge ----------
  async function checkBridgeStatus() {
    const dot = $("bridge-dot");
    const label = $("bridge-label");
    try {
      const res = await fetch(`${BRIDGE_BASE}/api/status`);
      if (!res.ok) throw new Error("offline");
      const info = await res.json();
      if (dot) dot.classList.remove("offline");
      const tabText = info.chromeFlowTab
        ? `Chrome ${info.chromeFlowTab.windowId}:${info.chromeFlowTab.tabIndex}`
        : "Chrome Ready";
      if (label) label.textContent = `Google Flow Bridge Ready · ${tabText}`;
    } catch (e) {
      if (dot) dot.classList.add("offline");
      if (label) label.textContent = "Flow bridge offline · Generate copies the prompt";
    }
  }

  async function triggerFlowGeneration(payload) {
    lastPayload = payload;
    const toast = $("flow-toast");
    const tTitle = $("toast-title");
    const tMsg = $("toast-msg");
    if (toast) {
      toast.hidden = false;
      tTitle.textContent = `Start to Generate · ${payload.title || payload.id}`;
      tMsg.textContent = "Sending prompt to Google Flow in Chrome…";
    }

    if (navigator.clipboard && payload.prompt) {
      navigator.clipboard.writeText(payload.prompt).catch(() => {});
    }

    try {
      const res = await fetch(`${BRIDGE_BASE}/api/flow-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.ok && data.job) {
        tTitle.textContent = `Generating in Google Flow (${data.job.status})`;
        tMsg.textContent = `${data.job.message} Prompt also copied to clipboard.`;
      } else {
        throw new Error("Bridge error");
      }
    } catch (err) {
      tTitle.textContent = "Prompt Copied for Google Flow";
      tMsg.textContent = "Prompt copied to clipboard. Open Google Flow below or run flow_bridge_server.py for automatic Chrome injection.";
    }
  }

  window.triggerFlowGeneration = triggerFlowGeneration;

  // ---------- YouTube Player ----------
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("yt-player", {
      videoId: VIDEOS[vidIdx].youtubeId,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          ready = true;
          updateTransportText(0);
        },
        onStateChange: (e) => {
          const playing = e.data === YT.PlayerState.PLAYING;
          const icon = $("icon-play");
          if (icon) {
            icon.innerHTML = playing
              ? '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>'
              : '<path d="M7 4l13 8-13 8z"/>';
          }
          const hint = $("monitor-hint");
          if (hint) {
            hint.textContent = playing
              ? "Follows the workshop as it plays. Press Start to Generate to send this moment to Google Flow."
              : `Paused at ${fmt(player.getCurrentTime ? player.getCurrentTime() : 0)}.`;
          }
        },
      },
    });
  };

  function chapterAt(vIdx, sec) {
    const chs = VIDEOS[vIdx].chapters;
    let best = 0;
    for (let i = 0; i < chs.length; i++) {
      if (chs[i].seconds <= sec + 0.5) best = i;
    }
    return best;
  }

  function selectVideo(nextVidIdx, startChapIdx = 0, autoPlay = false) {
    const changed = nextVidIdx !== vidIdx;
    vidIdx = nextVidIdx;
    chapIdx = startChapIdx;
    const v = VIDEOS[vidIdx];
    const c = v.chapters[chapIdx];

    document.querySelectorAll("#video-switch button").forEach((b) => {
      const on = Number(b.dataset.vid) === vidIdx;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on);
    });

    const noteEl = $("video-note");
    if (noteEl) {
      noteEl.innerHTML = `Camera-original 1080p HLG HDR master: <code>${esc(v.masterFile)}</code> · <a href="${esc(v.youtubeUrl)}" target="_blank" rel="noopener">Watch on YouTube</a> · <a href="${esc(DATA.projectMeta.flowProjectUrl)}" target="_blank" rel="noopener">Open Google Flow Project</a>`;
    }

    renderChaptersBar();
    setChapter(chapIdx);

    if (ready && player) {
      const opts = { videoId: v.youtubeId, startSeconds: c ? c.seconds : 0 };
      if (changed) {
        autoPlay ? player.loadVideoById(opts) : player.cueVideoById(opts);
      } else {
        player.seekTo(c ? c.seconds : 0, true);
        if (autoPlay) player.playVideo();
      }
    }
  }

  function seekToChapter(vIdx, cIdx, autoPlay = true) {
    if (vIdx !== vidIdx) {
      selectVideo(vIdx, cIdx, autoPlay);
    } else {
      setChapter(cIdx);
      const sec = VIDEOS[vidIdx].chapters[cIdx].seconds;
      if (ready && player && typeof player.seekTo === "function") {
        player.seekTo(sec, true);
        if (autoPlay) player.playVideo();
      }
    }
    const wrap = document.querySelector(".player-wrap");
    if (wrap && wrap.hidden) history.replaceState(null, "", "#workshop"), showView("workshop");
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderChaptersBar() {
    const v = VIDEOS[vidIdx];
    const bar = $("chapters");
    if (!bar) return;
    bar.innerHTML = v.chapters
      .map(
        (c, i) =>
          `<button type="button" class="chip ${i === chapIdx ? "on" : ""}" data-i="${i}"><b>${c.idx}</b>${esc(c.title)} <span class="chip-tc">${esc(c.time)}</span></button>`
      )
      .join("");
  }

  function setChapter(i) {
    chapIdx = i;
    const v = VIDEOS[vidIdx];
    const c = v.chapters[i];
    if (!c) return;

    const nowTitle = $("now-title");
    if (nowTitle) {
      nowTitle.textContent = `${v.id === "workshop_part1" ? "Workshop #1" : "Dinner"} · ${c.idx}. ${c.title}`;
    }

    document.querySelectorAll("#chapters .chip").forEach((chip) => {
      const on = Number(chip.dataset.i) === i;
      if (on && !chip.classList.contains("on")) {
        const row = $("chapters");
        if (row) {
          row.scrollTo({
            left: chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2,
            behavior: "smooth",
          });
        }
      }
      chip.classList.toggle("on", on);
    });

    renderMonitor();
    markMomentRow();
  }

  function updateTransportText(t) {
    const v = VIDEOS[vidIdx];
    const tcEl = $("now-tc");
    if (tcEl) tcEl.textContent = `${fmt(t)} / 00:${v.duration}`;
  }

  setInterval(() => {
    if (!ready || !player || typeof player.getCurrentTime !== "function") return;
    const state = player.getPlayerState ? player.getPlayerState() : -1;
    if (state !== YT.PlayerState.PLAYING) return;
    const t = player.getCurrentTime();
    updateTransportText(t);
    const i = chapterAt(vidIdx, t);
    if (i !== chapIdx) setChapter(i);
  }, 500);

  // ---------- This Moment Monitor Card ----------
  function buildMomentIdeas(c) {
    return [
      {
        code: "A",
        id: `${VIDEOS[vidIdx].id}_${c.idx}_A`,
        title: `Direct Action Handheld 35mm Pre-Viz — ${c.title}`,
        prompt: c.aiSuggestion,
      },
      {
        code: "B",
        id: `${VIDEOS[vidIdx].id}_${c.idx}_B`,
        title: `Lama Bar Kodak Vision3 500T Tungsten-Amber Close-Up (${c.actors[0] || "Lead"})`,
        prompt: `${c.aiSuggestion} Framed as an intimate tighter medium close-up inside Lama Bar under warm tungsten-amber practicals and deep slate-teal neon reflections.`,
      },
      {
        code: "C",
        id: `${VIDEOS[vidIdx].id}_${c.idx}_C`,
        title: `1418 5th St. High-Contrast B&W Vérité Study`,
        prompt: `${c.aiSuggestion} Rendered in gritty high-contrast 16mm black-and-white Direct Action monochrome with heavy organic silver halide grain.`,
      },
    ];
  }

  function renderMonitor() {
    const v = VIDEOS[vidIdx];
    const c = v.chapters[chapIdx];
    const card = $("shot-card");
    if (!card || !c) return;

    const key = `${v.id}_ch_${c.idx}`;
    const ideas = buildMomentIdeas(c);
    const chosen = ideas.find((o) => o.id === choices[key]) || ideas[0];

    const dirs = [
      ["Workshop Film", v.title, v.youtubeUrl + "&t=" + c.seconds + "s"],
      ["Camera Master", v.masterFile],
      ["Extracted 1080p Still", c.frame, c.frame],
      ["Zoom H6 24-bit Stem", "ZOOM0038_LR.WAV / ZOOM0039_LR.WAV", "assets/voices/voice_workshop_zoom0038.m4a"],
      ["Google Flow Project", "fc62d0fe-0303-4e5a-8864-0d8a9aee5bbe", DATA.projectMeta.flowProjectUrl],
    ];

    card.innerHTML = `
      <div class="meta">
        Chapter ${c.idx} of ${v.chapters.length} · <span class="tc">${esc(c.time)}</span> · ${esc(c.actors.join(", "))}
      </div>
      <h3>${esc(c.title)}</h3>
      <div class="actor-top-split" style="margin-bottom:12px;">
        <div>
          <div class="actor-stage">
            <img src="${esc(c.frame)}" alt="${esc(c.title)}" />
          </div>
        </div>
        <div>
          <p class="desc" style="font-size:17px;">${esc(c.beat)}</p>
          <div class="transcript">
            <b>Google Flow Veo 3.1 Prompt (${esc(chosen.code)})</b>
            <textarea class="prompt-textarea" id="monitor-prompt-box">${esc(chosen.prompt)}</textarea>
          </div>
        </div>
      </div>
      <p class="note">
        <b>Creative Rule ${dref("D001")} &amp; Prompt Lock</b>
        Candid observational handheld 35mm cinéma-vérité in three-quarter profile; never alter Russ Murphy’s recognizable appearance.
      </p>
      <div class="actions">
        <button type="button" class="pill-btn" data-generate-moment>
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Start to Generate
        </button>
        <button type="button" class="pill-btn ghost" data-replay>Replay moment</button>
        <a class="pill-btn ghost" href="${esc(v.youtubeUrl)}&t=${c.seconds}s" target="_blank" rel="noopener">Watch on YouTube</a>
      </div>
      <details class="more" data-more="ideas" ${openMore.ideas ? "open" : ""}>
        <summary>AI generation variations <span>Picked: ${esc(chosen.code)}</span></summary>
        <div class="ideas">
          ${ideas
            .map(
              (o) => `
            <button type="button" class="idea ${chosen.id === o.id ? "on" : ""}" data-opt="${esc(o.id)}">
              <span class="letter">${chosen.id === o.id ? "✓" : esc(o.code)}</span>
              <span>${esc(o.title)}</span>
            </button>`
            )
            .join("")}
        </div>
      </details>
      <details class="more" data-more="files" ${openMore.files ? "open" : ""}>
        <summary>Source files <span>1080p HLG Master &amp; Stills</span></summary>
        <div class="dirs">
          ${dirs
            .map(
              ([k, val, url]) =>
                `<div class="dir"><span>${esc(k)}</span>${
                  url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(val)}</a>` : `<span>${esc(val)}</span>`
                }</div>`
            )
            .join("")}
        </div>
      </details>
    `;
  }

  // ---------- Tier 1 AI Actors ----------
  function renderActors() {
    const stack = $("actors-stack");
    if (!stack) return;

    stack.innerHTML = ACTORS.map((a) => {
      const thumbs = a.gallery
        .map(
          (g, idx) => `
          <button type="button" class="${idx === 0 ? "on" : ""}" data-actor="${esc(a.id)}" data-src="${esc(g.src)}" data-label="${esc(g.label)}" title="${esc(g.label)}">
            <img src="${esc(g.src)}" alt="${esc(g.label)}" loading="lazy" />
          </button>`
        )
        .join("");

      const presets = (a.presets || [])
        .map(
          (p, idx) => {
            const code = String.fromCharCode(65 + idx);
            return `
            <button type="button" class="idea" data-actor-preset="${esc(a.id)}" data-prompt="${esc(p.prompt)}">
              <span class="letter">${code}</span>
              <span><b>${esc(p.label)}</b> — ${esc(p.prompt.slice(0, 120))}…</span>
            </button>`;
          }
        )
        .join("");

      return `
      <article class="shot-card" id="actor-card-${esc(a.id)}">
        <div class="meta">
          <span>${esc(a.id)}</span> ·
          <span>${esc(a.group)}</span>
        </div>
        <h3>${esc(a.name)} <span style="font-weight:400;color:var(--text-2);font-size:0.75em;">— ${esc(a.roleTitle)}</span></h3>
        <p class="actor-sub">${/^D\d{3}\b/.test(a.ruleBadge) ? dref(a.ruleBadge.slice(0, 4)) + " " + esc(a.ruleBadge.slice(5)) : esc(a.ruleBadge)} · ${esc(a.status)}</p>

        <div class="actor-top-split">
          <div>
            <div class="cut-switch" style="margin-bottom:8px;width:100%;display:flex;">
              <button type="button" class="on" style="flex:1;padding:6px 10px;font-size:13px;" data-media-mode="still" data-actor="${esc(a.id)}" data-src="${esc(a.heroStill)}">Still</button>
              <button type="button" style="flex:1;padding:6px 10px;font-size:13px;" data-media-mode="sheet" data-actor="${esc(a.id)}" data-src="${esc(a.quadSheet)}">4-Angle</button>
              <button type="button" style="flex:1;padding:6px 10px;font-size:13px;" data-media-mode="aistill" data-actor="${esc(a.id)}" data-src="${esc(a.aiStill)}">AI Still</button>
              <button type="button" style="flex:1;padding:6px 10px;font-size:13px;" data-media-mode="aivideo" data-actor="${esc(a.id)}" data-src="${esc(a.aiVideo)}">AI Video</button>
            </div>
            <div class="actor-stage" id="stage-${esc(a.id)}">
              <img src="${esc(a.heroStill)}" alt="${esc(a.name)}" />
            </div>
            <div class="actor-thumbs" id="thumbs-${esc(a.id)}">
              ${thumbs}
            </div>
            <div class="voice-row">
              <span><b>Voice stem</b> ${dref("D010")} · ${esc(a.voiceLabel)}</span>
              <audio controls preload="none" src="${esc(a.voiceSample)}"></audio>
            </div>
          </div>

          <div>
            <p class="desc" style="font-size:16px;">
              <b>Physical &amp; Wardrobe Lock:</b> ${esc(a.physicalProfile.hairFacial)}. ${esc(a.physicalProfile.wardrobeProps)}
            </p>
            <div class="transcript" style="margin-top:12px;">
              <b>Psychological Coordinate (Direct Action Spine)</b>
              <p><b>Need:</b> ${esc(a.psychology.need)}</p>
              <p><b>Want:</b> ${esc(a.psychology.want)}</p>
              <p><b>Hate:</b> ${esc(a.psychology.hate)}</p>
              <p><b>Love:</b> ${esc(a.psychology.love)}</p>
            </div>
            <div class="note" style="margin-top:14px;">
              <b>Google Flow Veo 3.1 AI Actor Prompt</b>
              <textarea class="prompt-textarea" id="actor-prompt-${esc(a.id)}">${esc(a.defaultFlowPrompt)}</textarea>
              <label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;color:var(--text-2);cursor:pointer;">
                <input type="checkbox" id="actor-chip-${esc(a.id)}" ${a.attachAvatarDefault ? "checked" : ""} />
                Attach Character Ingredient Chip in Google Flow
              </label>
            </div>
            <div class="actions">
              <button type="button" class="pill-btn" data-generate-actor="${esc(a.id)}" data-name="${esc(a.name)}">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Start to Generate ${esc(a.name.split(" ")[0])}
              </button>
              <a class="pill-btn ghost" href="${esc(a.quadSheet)}" target="_blank" rel="noopener">Open 4-Angle Sheet</a>
              <a class="pill-btn ghost" href="${esc(a.aiStill)}" target="_blank" rel="noopener">Open AI Still</a>
            </div>
          </div>
        </div>

        <details class="more">
          <summary>Scene generation presets for ${esc(a.name)} <span>${(a.presets || []).length} presets</span></summary>
          <div class="ideas">
            ${presets}
          </div>
        </details>
      </article>`;
    }).join("");
  }

  // ---------- Suggested AI Video Generations ----------
  function renderSuggestions() {
    const list = $("suggestions-list");
    if (!list) return;

    list.innerHTML = SUGGESTIONS.map((s, idx) => `
      <details class="ch" ${idx < 2 ? "open" : ""}>
        <summary>
          <span class="num">${idx + 1}</span>
          <span>
            <div class="ct">${esc(s.title)}</div>
            <div class="cs">${esc(s.geography)} · ${esc(s.characters.join(", "))} · ${esc(s.sourceRef)}</div>
          </span>
          <span class="count">Veo 3.1 Scene <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
        </summary>
        <div style="padding:16px 18px;">
          <p style="font-size:15px;color:var(--text-2);margin-bottom:8px;">${esc(s.purpose)}</p>
          <textarea class="prompt-textarea" id="sug-prompt-${esc(s.id)}">${esc(s.prompt)}</textarea>
          <div class="actions" style="margin-bottom:4px;">
            <button type="button" class="pill-btn" data-generate-sug="${esc(s.id)}" data-title="${esc(s.title)}">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Start to Generate
            </button>
          </div>
        </div>
      </details>
    `).join("");
  }

  // ---------- Tier 2 Full 28-Cast Character Bible ----------
  function renderCastBible() {
    const list = $("cast-list");
    if (!list) return;

    const groups = [
      "Bar Core",
      "Bartenders & Patrons",
      "Pool Table",
      "Silicon Valley Tech",
      "Women Academics",
      "Downstairs ICE Unit",
    ];

    list.innerHTML = groups.map((g, gIdx) => {
      const members = CAST.filter((c) => c.group === g);
      return `
        <details class="ch" ${gIdx === 0 ? "open" : ""}>
          <summary>
            <span class="num">${gIdx + 1}</span>
            <span>
              <div class="ct">${esc(g)}</div>
              <div class="cs">D010 Pre-Scene Protocol: 6-Angle Photos + 2-Minute Clean Voice Sample</div>
            </span>
            <span class="count">${members.length} cast <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
          </summary>
          ${members.map((m) => `
            <div class="row no-thumb">
              <span>
                <div class="rm"><span class="tc">${esc(m.id)}</span> · <b>${esc(m.name)}</b> · ${esc(m.d010Status)} · ${esc(m.contact)}</div>
                <div class="row-note"><b>Role</b>${esc(m.role)}</div>
                <div class="rq">Prompt: “${esc(m.flowPrompt)}”</div>
              </span>
              <button type="button" class="pill-btn" data-generate-cast="${esc(m.id)}" data-name="${esc(m.name)}" data-prompt="${esc(m.flowPrompt)}" style="white-space:nowrap;">
                Start to Generate
              </button>
            </div>
          `).join("")}
        </details>
      `;
    }).join("");
  }

  // ---------- Every Workshop Moment ----------
  function renderEveryMoment() {
    const list = $("moment-list");
    const totalEl = $("moment-total");
    const totalCount = VIDEOS.reduce((acc, v) => acc + v.chapters.length, 0);
    if (totalEl) totalEl.textContent = totalCount;
    if (!list) return;

    list.innerHTML = VIDEOS.map((v, vIdx) => `
      <details class="ch" ${vIdx === 0 ? "open" : ""}>
        <summary>
          <span class="num">${vIdx + 1}</span>
          <span>
            <div class="ct">${esc(v.title)}</div>
            <div class="cs">Recorded ${esc(v.recordedDate)} · Duration ${esc(v.duration)} · ${esc(v.masterFile)}</div>
          </span>
          <span class="count">${v.chapters.length} moments <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
        </summary>
        ${v.chapters.map((c, cIdx) => `
          <div class="row ${vIdx === vidIdx && cIdx === chapIdx ? "now-playing" : ""}" data-v="${vIdx}" data-c="${cIdx}">
            <img src="${esc(c.frame)}" alt="${esc(c.title)}" loading="lazy" style="cursor:pointer;" data-play-moment="1" />
            <span style="cursor:pointer;" data-play-moment="1">
              <div class="rm">Chapter ${c.idx} · <span class="tc">${esc(c.time)}</span> · ${esc(c.actors.join(", "))}</div>
              <div class="row-note"><b>${esc(c.title)}</b>${esc(c.beat)}</div>
              <div class="rq">AI Pre-Viz: “${esc(c.aiSuggestion)}”</div>
            </span>
            <button type="button" class="pill-btn ghost" data-gen-row="${vIdx}:${cIdx}" style="white-space:nowrap;">
              Start to Generate
            </button>
          </div>
        `).join("")}
      </details>
    `).join("");
  }

  function markMomentRow() {
    document.querySelectorAll("#moment-list .row").forEach((r) => {
      const match = Number(r.dataset.v) === vidIdx && Number(r.dataset.c) === chapIdx;
      r.classList.toggle("now-playing", match);
    });
  }

  // ---------- Event Delegation ----------
  document.addEventListener("click", (e) => {
    // Cut switch between Workshop #1 and Dinner
    const vidBtn = e.target.closest("#video-switch [data-vid]");
    if (vidBtn) {
      selectVideo(Number(vidBtn.dataset.vid), 0, false);
      return;
    }

    // Chapter chip click
    const chip = e.target.closest("#chapters .chip");
    if (chip) {
      seekToChapter(vidIdx, Number(chip.dataset.i), true);
      return;
    }

    // Replay current moment
    if (e.target.closest("[data-replay]")) {
      seekToChapter(vidIdx, chapIdx, true);
      return;
    }

    // Generate from This Moment monitor
    if (e.target.closest("[data-generate-moment]")) {
      const v = VIDEOS[vidIdx];
      const c = v.chapters[chapIdx];
      const ta = $("monitor-prompt-box");
      triggerFlowGeneration({
        id: `${v.id}_ch${c.idx}`,
        title: `${c.time} · ${c.title}`,
        prompt: ta ? ta.value : c.aiSuggestion,
        mode: "video",
      });
      return;
    }

    // Pick A/B/C idea in This Moment monitor
    const ideaBtn = e.target.closest("#shot-card .idea[data-opt]");
    if (ideaBtn) {
      const v = VIDEOS[vidIdx];
      const c = v.chapters[chapIdx];
      const key = `${v.id}_ch_${c.idx}`;
      choices[key] = ideaBtn.dataset.opt;
      saveChoices();
      renderMonitor();
      return;
    }

    // Actor thumbnail click
    const thumbBtn = e.target.closest(".actor-thumbs button[data-actor]");
    if (thumbBtn) {
      const actorId = thumbBtn.dataset.actor;
      const src = thumbBtn.dataset.src;
      const stage = $(`stage-${actorId}`);
      if (stage) stage.innerHTML = `<img src="${esc(src)}" alt="" />`;
      thumbBtn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === thumbBtn));
      return;
    }

    // Actor media mode switch (Still / 4-Angle / AI Still / AI Video)
    const modeBtn = e.target.closest("[data-media-mode]");
    if (modeBtn) {
      const actorId = modeBtn.dataset.actor;
      const mode = modeBtn.dataset.mediaMode;
      const src = modeBtn.dataset.src;
      const stage = $(`stage-${actorId}`);
      if (stage) {
        stage.innerHTML =
          mode === "aivideo"
            ? `<video src="${esc(src)}" controls autoplay loop muted playsinline></video>`
            : `<img src="${esc(src)}" alt="" />`;
      }
      modeBtn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === modeBtn));
      return;
    }

    // Actor scene preset click
    const presetBtn = e.target.closest("[data-actor-preset]");
    if (presetBtn) {
      const actorId = presetBtn.dataset.actorPreset;
      const ta = $(`actor-prompt-${actorId}`);
      if (ta) ta.value = presetBtn.dataset.prompt;
      return;
    }

    // Generate AI Actor button
    const genActorBtn = e.target.closest("[data-generate-actor]");
    if (genActorBtn) {
      const actorId = genActorBtn.dataset.generateActor;
      const name = genActorBtn.dataset.name;
      const ta = $(`actor-prompt-${actorId}`);
      const chk = $(`actor-chip-${actorId}`);
      triggerFlowGeneration({
        id: `${actorId.toLowerCase()}_${Date.now()}`,
        title: `AI Actor · ${name}`,
        characterName: name,
        prompt: ta ? ta.value : "",
        mode: "video",
        attachAvatar: chk ? chk.checked : false,
        ingredientQuery: actorId === "CHAR-04" ? "avatar" : name.split(" ")[0].toLowerCase(),
      });
      return;
    }

    // Generate AI Video Suggestion button
    const genSugBtn = e.target.closest("[data-generate-sug]");
    if (genSugBtn) {
      const sugId = genSugBtn.dataset.generateSug;
      const title = genSugBtn.dataset.title;
      const ta = $(`sug-prompt-${sugId}`);
      triggerFlowGeneration({
        id: `${sugId.toLowerCase()}_${Date.now()}`,
        title: title,
        prompt: ta ? ta.value : "",
        mode: "video",
      });
      return;
    }

    // Generate Cast Member button
    const genCastBtn = e.target.closest("[data-generate-cast]");
    if (genCastBtn) {
      triggerFlowGeneration({
        id: `${genCastBtn.dataset.generateCast.toLowerCase()}_${Date.now()}`,
        title: `Cast Pre-Viz · ${genCastBtn.dataset.name}`,
        characterName: genCastBtn.dataset.name,
        prompt: genCastBtn.dataset.prompt,
        mode: "video",
      });
      return;
    }

    // Generate from Every Moment row button
    const genRowBtn = e.target.closest("[data-gen-row]");
    if (genRowBtn) {
      const [vI, cI] = genRowBtn.dataset.genRow.split(":").map(Number);
      const c = VIDEOS[vI].chapters[cI];
      triggerFlowGeneration({
        id: `${VIDEOS[vI].id}_ch${c.idx}`,
        title: `${c.time} · ${c.title}`,
        prompt: c.aiSuggestion,
        mode: "video",
      });
      return;
    }

    // Play moment when clicking row image/text
    const playTarget = e.target.closest("[data-play-moment]");
    if (playTarget) {
      const row = playTarget.closest(".row[data-v]");
      if (row) seekToChapter(Number(row.dataset.v), Number(row.dataset.c), true);
    }
  });

  // Transport buttons
  $("btn-play").addEventListener("click", () => {
    if (!ready || !player) return;
    player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
  });
  $("btn-prev").addEventListener("click", () => {
    seekToChapter(vidIdx, Math.max(0, chapIdx - 1), true);
  });
  $("btn-next").addEventListener("click", () => {
    const maxIdx = VIDEOS[vidIdx].chapters.length - 1;
    seekToChapter(vidIdx, Math.min(maxIdx, chapIdx + 1), true);
  });

  $("close-toast").addEventListener("click", () => {
    $("flow-toast").hidden = true;
  });
  $("toast-focus-chrome").addEventListener("click", () => {
    if (lastPayload) {
      triggerFlowGeneration({ ...lastPayload, bringToFront: true });
    }
  });

  // ---------- Search Sheet (⌘K) ----------
  const sheet = $("search-sheet");
  const input = $("search-input");
  let scope = "all";
  let searchItems = [];
  let sel = 0;
  const TRY_TERMS = ["Russ Murphy", "Ken Newman", "French Drop", "Downstairs", "Billy Aguero", "Don Bajema", "Women Academics", "Jeff Kao"];

  function openSearch(q) {
    sheet.hidden = false;
    if (typeof q === "string") input.value = q;
    input.focus();
    input.select();
    renderSearchResults();
  }
  function closeSearch() {
    sheet.hidden = true;
  }

  $("open-search").addEventListener("click", () => openSearch());
  $("close-search").addEventListener("click", closeSearch);
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) closeSearch();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      sheet.hidden ? openSearch() : closeSearch();
    } else if (e.key === "/" && sheet.hidden && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    } else if (!sheet.hidden) {
      if (e.key === "Escape") closeSearch();
    }
  });

  $("scopes").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    scope = b.dataset.scope;
    document.querySelectorAll("#scopes button").forEach((x) => x.classList.toggle("on", x === b));
    renderSearchResults();
    input.focus();
  });
  input.addEventListener("input", renderSearchResults);

  function renderSearchResults() {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const match = (text) => !terms.length || terms.every((t) => String(text).toLowerCase().includes(t));
    const want = (s) => scope === "all" || scope === s;

    searchItems = [];
    let html = "";
    if (!q) {
      html += `<div class="res-group">Try</div><div class="suggest">${TRY_TERMS.map((t) => `<button type="button" data-suggest="${esc(t)}">${esc(t)}</button>`).join("")}</div>`;
    }

    if (want("actors")) {
      const rows = ACTORS.filter((a) => match(`${a.name} ${a.roleTitle} ${a.physicalProfile.wardrobeProps} ${a.defaultFlowPrompt}`));
      if (rows.length) {
        html += `<div class="res-group">AI Actors</div>`;
        rows.forEach((a) => {
          html += `<button type="button" class="res" data-res-idx="${searchItems.length}">
            <img src="${esc(a.heroStill)}" alt="" />
            <span><div class="rt">${esc(a.name)} · ${esc(a.id)}</div><div class="rs">${esc(a.roleTitle)}</div></span>
          </button>`;
          searchItems.push({ type: "actor", id: a.id });
        });
      }
    }

    if (want("moments")) {
      const mRows = [];
      VIDEOS.forEach((v, vI) => {
        v.chapters.forEach((c, cI) => {
          if (match(`${c.title} ${c.beat} ${c.actors.join(" ")} ${c.time}`)) {
            mRows.push({ vI, cI, c, v });
          }
        });
      });
      if (mRows.length) {
        html += `<div class="res-group">Workshop Moments</div>`;
        mRows.slice(0, 20).forEach(({ vI, cI, c, v }) => {
          html += `<button type="button" class="res" data-res-idx="${searchItems.length}">
            <img src="${esc(c.frame)}" alt="" />
            <span><div class="rt">${esc(c.time)} · ${esc(c.title)}</div><div class="rs">${esc(v.id === "workshop_part1" ? "Workshop #1" : "Dinner")} · ${esc(c.beat)}</div></span>
          </button>`;
          searchItems.push({ type: "moment", vI, cI });
        });
      }
    }

    if (want("cast")) {
      const cRows = CAST.filter((c) => match(`${c.name} ${c.group} ${c.role} ${c.flowPrompt}`));
      if (cRows.length) {
        html += `<div class="res-group">Cast Bible (28)</div>`;
        cRows.slice(0, 15).forEach((c) => {
          html += `<button type="button" class="res noimg" data-res-idx="${searchItems.length}">
            <span><div class="rt">${esc(c.name)} (${esc(c.group)})</div><div class="rs">${esc(c.role)}</div></span>
          </button>`;
          searchItems.push({ type: "cast", id: c.id });
        });
      }
    }

    if (want("suggestions")) {
      const sRows = SUGGESTIONS.filter((s) => match(`${s.title} ${s.geography} ${s.purpose} ${s.prompt}`));
      if (sRows.length) {
        html += `<div class="res-group">AI Video Suggestions</div>`;
        sRows.forEach((s) => {
          html += `<button type="button" class="res noimg" data-res-idx="${searchItems.length}">
            <span><div class="rt">${esc(s.id)} · ${esc(s.title)}</div><div class="rs">${esc(s.geography)} — ${esc(s.purpose)}</div></span>
          </button>`;
          searchItems.push({ type: "suggestions" });
        });
      }
    }

    if (q && !searchItems.length) {
      html += `<div class="empty">No results for “${esc(q)}”.</div>`;
    }
    $("results").innerHTML = html;
  }

  $("results").addEventListener("click", (e) => {
    const sug = e.target.closest("[data-suggest]");
    if (sug) {
      input.value = sug.dataset.suggest;
      renderSearchResults();
      input.focus();
      return;
    }
    const resBtn = e.target.closest("[data-res-idx]");
    if (!resBtn) return;
    const item = searchItems[Number(resBtn.dataset.resIdx)];
    closeSearch();
    if (!item) return;
    if (item.type === "moment") {
      seekToChapter(item.vI, item.cI, true);
    } else if (item.type === "actor") {
      goTo(`actor-card-${item.id}`);
    } else if (item.type === "cast") {
      goTo("cast");
    } else if (item.type === "suggestions") {
      goTo("suggestions");
    }
  });

  // ---------- Init ----------
  renderChaptersBar();
  setChapter(0);
  renderActors();
  renderSuggestions();
  renderCastBible();
  renderEveryMoment();
  checkBridgeStatus();
  loadDecisions();
  refreshDrefs();
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();
  setInterval(checkBridgeStatus, 5000);
})();
