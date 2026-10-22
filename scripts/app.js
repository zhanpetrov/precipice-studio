// PRECIPICE — Workshop #1 & AI Actors Production Hub Controller
(function () {
  const DATA = window.PRECIPICE_HUB_DATA;
  const BRIDGE_BASE = "http://127.0.0.1:8788";

  let activeVideoIdx = 0;
  let activeChapterIdx = 0;
  let activeCastGroup = "ALL";
  let bridgeOnline = false;
  let bringChromeToFront = false;

  function init() {
    renderRulesStrip();
    renderVideoTabs();
    renderScreeningStage();
    renderTier1Actors();
    renderCastFilters();
    renderTier2Cast();
    renderVideoSuggestions();
    checkBridgeStatus();
    setInterval(checkBridgeStatus, 5000);

    const frontToggle = document.getElementById("toggle-bring-front");
    if (frontToggle) {
      frontToggle.addEventListener("change", (e) => {
        bringChromeToFront = e.target.checked;
      });
    }
  }

  async function checkBridgeStatus() {
    const pill = document.getElementById("bridge-status-pill");
    const text = document.getElementById("bridge-status-text");
    try {
      const res = await fetch(`${BRIDGE_BASE}/api/status`, { method: "GET" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      bridgeOnline = true;
      if (pill) pill.classList.remove("offline");
      const tabInfo = data.chromeFlowTab
        ? `Chrome Tab ${data.chromeFlowTab.windowId}:${data.chromeFlowTab.tabIndex}`
        : "Chrome Ready";
      if (text) {
        text.textContent = `FLOW BRIDGE ONLINE · ${tabInfo} · ${data.generatedFiles ? data.generatedFiles.length : 0} MP4s`;
      }
    } catch (err) {
      bridgeOnline = false;
      if (pill) pill.classList.add("offline");
      if (text) {
        text.textContent = "FLOW BRIDGE: REMOTE / CLIPBOARD MODE (Run flow_bridge_server.py for live Chrome control)";
      }
    }
  }

  window.triggerFlowGeneration = async function (payload) {
    const drawer = document.getElementById("flow-toast-drawer");
    const drawerTitle = document.getElementById("toast-title");
    const drawerMsg = document.getElementById("toast-msg");
    const drawerPrompt = document.getElementById("toast-prompt");

    if (drawer) {
      drawer.classList.add("visible");
      drawerTitle.textContent = `⚡ Dispatching: ${payload.title || payload.id}`;
      drawerMsg.textContent = "Connecting to local Google Flow Chrome Automation Bridge (127.0.0.1:8788)...";
      drawerPrompt.textContent = payload.prompt;
    }

    // Always copy prompt to clipboard as convenient backup
    if (navigator.clipboard && payload.prompt) {
      navigator.clipboard.writeText(payload.prompt).catch(() => {});
    }

    try {
      const res = await fetch(`${BRIDGE_BASE}/api/flow-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          bringToFront: bringChromeToFront
        })
      });
      const data = await res.json();
      if (data && data.ok && data.job) {
        drawerTitle.textContent = `✅ Google Flow Active: ${data.job.status}`;
        drawerMsg.textContent = `${data.job.message} (Insert: ${data.job.insertResult || "OK"} · Submit: ${data.job.submitResult || "OK"})`;
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      drawerTitle.textContent = "📋 Prompt Locked to Clipboard (Remote Mode)";
      drawerMsg.textContent =
        "Prompt copied! Start local bridge (`python3 scripts/flow_bridge_server.py`) for automatic Chrome injection, or click 'Open Google Flow' below to paste.";
    }
  };

  function renderRulesStrip() {
    const container = document.getElementById("rules-strip");
    if (!container) return;
    container.innerHTML = DATA.projectMeta.rules
      .map(
        (r) => `
      <div class="rule-card">
        <div class="rule-code">RULE ${r.code}</div>
        <div class="rule-title">${r.name}</div>
        <div class="rule-desc">${r.desc}</div>
      </div>
    `
      )
      .join("");
  }

  function renderVideoTabs() {
    const wrap = document.getElementById("video-switch-tabs");
    if (!wrap) return;
    wrap.innerHTML = DATA.workshopVideos
      .map(
        (v, idx) => `
      <button class="video-tab-btn ${idx === activeVideoIdx ? "active" : ""}" onclick="window.selectWorkshopVideo(${idx})">
        <div>PART ${idx + 1}: ${v.title}</div>
        <small>YouTube (${v.youtubeId}) · Duration ${v.duration} · ${v.chapters.length} Indexed Beats · ${v.masterFile}</small>
      </button>
    `
      )
      .join("");
  }

  window.selectWorkshopVideo = function (idx) {
    activeVideoIdx = idx;
    activeChapterIdx = 0;
    renderVideoTabs();
    renderScreeningStage();
  };

  window.selectWorkshopChapter = function (cIdx) {
    activeChapterIdx = cIdx;
    const video = DATA.workshopVideos[activeVideoIdx];
    const chap = video.chapters[cIdx];
    const iframe = document.getElementById("workshop-yt-iframe");
    if (iframe && chap) {
      iframe.src = `https://www.youtube.com/embed/${video.youtubeId}?start=${chap.seconds}&autoplay=1&rel=0`;
    }
    updateChapterInspector();
    highlightActiveChapterItem();
  };

  function highlightActiveChapterItem() {
    const items = document.querySelectorAll(".chapter-item");
    items.forEach((el, i) => {
      if (i === activeChapterIdx) el.classList.add("active");
      else el.classList.remove("active");
    });
  }

  function renderScreeningStage() {
    const video = DATA.workshopVideos[activeVideoIdx];
    const chap = video.chapters[activeChapterIdx];
    const iframe = document.getElementById("workshop-yt-iframe");
    if (iframe) {
      iframe.src = `https://www.youtube.com/embed/${video.youtubeId}?start=${chap.seconds}&rel=0`;
    }

    const summaryEl = document.getElementById("active-video-summary");
    if (summaryEl) {
      summaryEl.textContent = video.summary;
    }

    const listEl = document.getElementById("chapter-list-scroll");
    if (listEl) {
      listEl.innerHTML = video.chapters
        .map(
          (c, i) => `
        <div class="chapter-item ${i === activeChapterIdx ? "active" : ""}" onclick="window.selectWorkshopChapter(${i})">
          <img class="chapter-thumb" src="${c.frame}" alt="${c.title}" loading="lazy" />
          <div>
            <div class="chapter-meta-time">${c.time} · CHAPTER ${c.idx}</div>
            <div class="chapter-meta-title">${c.title}</div>
            <div class="chapter-meta-actors">${c.actors.join(" · ")}</div>
          </div>
        </div>
      `
        )
        .join("");
    }

    updateChapterInspector();
  }

  function updateChapterInspector() {
    const video = DATA.workshopVideos[activeVideoIdx];
    const chap = video.chapters[activeChapterIdx];
    const box = document.getElementById("active-beat-inspector");
    if (!box || !chap) return;

    box.innerHTML = `
      <div class="inspector-top">
        <div>
          <img class="inspector-frame-img" src="${chap.frame}" alt="${chap.title}" onclick="window.openLightbox('${chap.frame}')" title="Click to enlarge 1080p tone-mapped frame" />
          <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);margin-top:0.3rem;">
            📷 1080p HDR→BT.709 Master Frame (Click to zoom)
          </div>
        </div>
        <div>
          <span class="inspector-time-badge">${video.youtubeId} @ ${chap.time} (${chap.seconds}s)</span>
          <h3 style="font-family:var(--font-display);font-size:1.18rem;color:#fff;margin-bottom:0.35rem;">${chap.title}</h3>
          <p style="font-size:0.86rem;color:var(--text-main);margin-bottom:0.5rem;">${chap.beat}</p>
          <div style="font-family:var(--font-mono);font-size:0.74rem;color:var(--amber-bright);">
            Active Performers: ${chap.actors.join(", ")}
          </div>
        </div>
      </div>
      <div class="inspector-prompt-box">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--amber);">
            🎬 AI SCENE PRE-VIZ SUGGESTION (GOOGLE FLOW VEO 3.1 PROMPT):
          </span>
          <a href="${video.youtubeUrl}&t=${chap.seconds}s" target="_blank" style="font-family:var(--font-mono);font-size:0.72rem;">
            Open Timestamp on YouTube ↗
          </a>
        </div>
        <textarea id="chapter-flow-prompt-input">${chap.aiSuggestion}</textarea>
        <div class="flow-action-row">
          <span style="font-family:var(--font-mono);font-size:0.71rem;color:var(--text-muted);">
            Prompt Lock: 35mm Handheld Cinéma-Vérité · Kodak Vision3 500T · 3/4 Profile
          </span>
          <button class="btn-flow-primary" onclick="window.generateFromChapterInspector('${video.id}_ch${chap.idx}', '${chap.title.replace(/'/g, "\\'")}')">
            ⚡ Start to Generate This Beat in Google Flow
          </button>
        </div>
      </div>
    `;
  }

  window.generateFromChapterInspector = function (id, title) {
    const ta = document.getElementById("chapter-flow-prompt-input");
    const prompt = ta ? ta.value : "";
    window.triggerFlowGeneration({
      id: id,
      title: `Chapter Beat: ${title}`,
      prompt: prompt,
      mode: "video"
    });
  };

  function renderTier1Actors() {
    const grid = document.getElementById("tier1-actors-grid");
    if (!grid) return;

    grid.innerHTML = DATA.tier1Actors
      .map((actor, aIdx) => {
        const thumbsHtml = actor.gallery
          .map(
            (g, gIdx) => `
          <img src="${g.src}" alt="${g.label}" title="${g.label}" class="${gIdx === 0 ? "active" : ""}"
               onclick="window.switchActorHeroMedia('${actor.id}', 'image', '${g.src}', '${g.label.replace(/'/g, "\\'")}', this)" />
        `
          )
          .join("");

        const presetsHtml = actor.presets
          .map(
            (p) => `
          <button class="preset-chip" onclick="window.setActorPresetPrompt('${actor.id}', '${p.prompt.replace(/'/g, "\\'")}')">
            ${p.label}
          </button>
        `
          )
          .join("");

        return `
        <article class="actor-dossier-card" id="card-${actor.id}">
          <div class="actor-card-header">
            <div>
              <span class="actor-id-tag">${actor.id} · ${actor.group}</span>
              <h3 class="actor-name">${actor.name}</h3>
              <div class="actor-role">${actor.roleTitle}</div>
            </div>
            <div style="text-align:right;">
              <div class="actor-id-tag" style="background:rgba(16,185,129,0.14);border-color:rgba(16,185,129,0.4);color:#6ee7b7;">
                ${actor.ruleBadge}
              </div>
              <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);margin-top:0.25rem;">
                ${actor.status}
              </div>
            </div>
          </div>

          <div class="actor-visual-showcase">
            <div>
              <div class="hero-frame-box" id="hero-box-${actor.id}">
                <img src="${actor.heroStill}" alt="${actor.name}" onclick="window.openLightbox('${actor.heroStill}')" style="cursor:pointer;" />
                <div class="frame-caption-overlay" id="hero-cap-${actor.id}">
                  Workshop #1 Master Vérité Reference — Click image to zoom
                </div>
              </div>
              <div class="media-mode-pills">
                <button class="media-pill active" onclick="window.switchActorHeroMedia('${actor.id}', 'image', '${actor.heroStill}', 'Workshop #1 Master Vérité Reference')">
                  📷 Workshop Still
                </button>
                <button class="media-pill" onclick="window.switchActorHeroMedia('${actor.id}', 'image', '${actor.quadSheet}', '${actor.name} — 4-Panel Character Sheet')">
                  ⊞ 4-Angle Sheet
                </button>
                <button class="media-pill" onclick="window.switchActorHeroMedia('${actor.id}', 'image', '${actor.aiStill}', '${actor.name} — Google Flow AI Generated Still')">
                  ✨ AI Generated Still
                </button>
                <button class="media-pill" onclick="window.switchActorHeroMedia('${actor.id}', 'video', '${actor.aiVideo}', '${actor.name} — Google Flow Veo 3.1 AI Video')">
                  ▶ Flow AI Video
                </button>
              </div>
            </div>

            <div>
              <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--amber);margin-bottom:0.35rem;">
                D010 MULTI-ANGLE STILLS (${actor.gallery.length} EXTRACTED FRAMES):
              </div>
              <div class="thumb-strip">
                ${thumbsHtml}
              </div>
              <div style="margin-top:0.65rem;font-size:0.76rem;color:var(--text-muted);background:rgba(7,11,18,0.55);padding:0.55rem;border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
                <strong style="color:#fff;font-family:var(--font-mono);font-size:0.69rem;">PHYSICAL & WARDROBE LOCK:</strong><br/>
                ${actor.physicalProfile.hairFacial}. ${actor.physicalProfile.wardrobeProps}
              </div>
            </div>
          </div>

          <div class="voice-stem-bar">
            <div>
              <div class="voice-stem-label">🎙️ D010 VOICE CLONE REFERENCE STEM</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${actor.voiceLabel}</div>
            </div>
            <audio controls preload="none" src="${actor.voiceSample}"></audio>
          </div>

          <div class="psych-grid">
            <div class="psych-cell"><strong>NEED (INNER CORE)</strong>${actor.psychology.need}</div>
            <div class="psych-cell"><strong>WANT (SCENE OBJECTIVE)</strong>${actor.psychology.want}</div>
            <div class="psych-cell"><strong>HATE (CONFLICT TRIGGER)</strong>${actor.psychology.hate}</div>
            <div class="psych-cell"><strong>LOVE (ANCHOR)</strong>${actor.psychology.love}</div>
          </div>

          <div class="actor-flow-console">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
              <span style="font-family:var(--font-mono);font-size:0.74rem;color:var(--amber);font-weight:700;">
                ⚡ GOOGLE FLOW VEO 3.1 AI ACTOR GENERATOR (${actor.name.toUpperCase()})
              </span>
              <label style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);display:flex;align-items:center;gap:0.35rem;cursor:pointer;">
                <input type="checkbox" id="avatar-chk-${actor.id}" ${actor.attachAvatarDefault ? "checked" : ""} />
                Attach Flow Character Ingredient Chip
              </label>
            </div>
            <div class="preset-chips">
              ${presetsHtml}
            </div>
            <textarea class="flow-prompt-textarea" id="prompt-${actor.id}">${actor.defaultFlowPrompt}</textarea>
            <div class="flow-action-row">
              <button class="btn-secondary" onclick="window.openLightbox('${actor.quadSheet}')">
                🔍 Inspect 4-Angle Character Sheet
              </button>
              <button class="btn-flow-primary" onclick="window.generateActorInFlow('${actor.id}', '${actor.name.replace(/'/g, "\\'")}')">
                ⚡ Start to Generate ${actor.name.split(" ")[0]} in Google Flow
              </button>
            </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  window.switchActorHeroMedia = function (actorId, mode, src, caption, thumbEl) {
    const box = document.getElementById(`hero-box-${actorId}`);
    if (!box) return;
    if (mode === "video") {
      box.innerHTML = `
        <video src="${src}" controls autoplay loop muted playsinline></video>
        <div class="frame-caption-overlay">${caption}</div>
      `;
    } else {
      box.innerHTML = `
        <img src="${src}" alt="${caption}" onclick="window.openLightbox('${src}')" style="cursor:pointer;" />
        <div class="frame-caption-overlay">${caption}</div>
      `;
    }
    if (thumbEl && thumbEl.parentElement) {
      Array.from(thumbEl.parentElement.querySelectorAll("img")).forEach((im) => im.classList.remove("active"));
      thumbEl.classList.add("active");
    }
  };

  window.setActorPresetPrompt = function (actorId, promptText) {
    const ta = document.getElementById(`prompt-${actorId}`);
    if (ta) ta.value = promptText;
  };

  window.generateActorInFlow = function (actorId, actorName) {
    const ta = document.getElementById(`prompt-${actorId}`);
    const chk = document.getElementById(`avatar-chk-${actorId}`);
    const prompt = ta ? ta.value : "";
    const attachAvatar = chk ? chk.checked : false;
    window.triggerFlowGeneration({
      id: `${actorId.toLowerCase()}_${Date.now()}`,
      title: `AI Actor: ${actorName}`,
      characterName: actorName,
      prompt: prompt,
      mode: "video",
      attachAvatar: attachAvatar,
      ingredientQuery: actorId === "CHAR-04" ? "avatar" : actorName.split(" ")[0].toLowerCase()
    });
  };

  function renderCastFilters() {
    const bar = document.getElementById("cast-filter-bar");
    if (!bar) return;
    const groups = ["ALL", "Bar Core", "Bartenders & Patrons", "Pool Table", "Silicon Valley Tech", "Women Academics", "Downstairs ICE Unit"];
    bar.innerHTML = groups
      .map(
        (g) => `
      <button class="nav-pill ${g === activeCastGroup ? "active" : ""}" onclick="window.filterCastGroup('${g}')">
        ${g === "ALL" ? "All 28 Cast Members" : g}
      </button>
    `
      )
      .join("");
  }

  window.filterCastGroup = function (group) {
    activeCastGroup = group;
    renderCastFilters();
    renderTier2Cast();
  };

  function renderTier2Cast() {
    const grid = document.getElementById("tier2-cast-grid");
    if (!grid) return;
    const items =
      activeCastGroup === "ALL"
        ? DATA.tier2CastRoster
        : DATA.tier2CastRoster.filter((c) => c.group === activeCastGroup);

    grid.innerHTML = items
      .map((c) => {
        const isComplete = c.d010Status.includes("COMPLETE");
        return `
        <div class="cast-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">
              <span class="cast-group-tag">${c.id} · ${c.group}</span>
              <span class="d010-badge ${isComplete ? "complete" : ""}">${c.d010Status}</span>
            </div>
            <h4 style="font-family:var(--font-display);font-size:1.05rem;color:#fff;">${c.name}</h4>
            <p style="font-size:0.8rem;color:var(--amber-bright);margin:0.2rem 0 0.45rem;">${c.role}</p>
            <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);margin-bottom:0.5rem;">
              Contact Telemetry: ${c.contact} · D010 Protocol: 6-Angle Photos + 2m Voice
            </div>
            <textarea class="flow-prompt-textarea" id="cast-prompt-${c.id}" style="min-height:64px;font-size:0.72rem;">${c.flowPrompt}</textarea>
          </div>
          <button class="btn-flow-primary" style="width:100%;justify-content:center;" onclick="window.generateCastMember('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
            ⚡ Start to Generate ${c.name.split(" ")[0]} in Google Flow
          </button>
        </div>
      `;
      })
      .join("");
  }

  window.generateCastMember = function (castId, castName) {
    const ta = document.getElementById(`cast-prompt-${castId}`);
    const prompt = ta ? ta.value : "";
    window.triggerFlowGeneration({
      id: `${castId.toLowerCase()}_${Date.now()}`,
      title: `Cast Pre-Viz: ${castName}`,
      characterName: castName,
      prompt: prompt,
      mode: "video"
    });
  };

  function renderVideoSuggestions() {
    const grid = document.getElementById("video-suggestions-grid");
    if (!grid) return;
    grid.innerHTML = DATA.videoSuggestions
      .map(
        (s) => `
      <div class="suggestion-card">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
            <span class="actor-id-tag">${s.id} · ${s.geography}</span>
            <span style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);">${s.sourceRef}</span>
          </div>
          <h3 style="font-family:var(--font-display);font-size:1.15rem;color:#fff;margin-bottom:0.35rem;">${s.title}</h3>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem;">${s.purpose}</p>
          <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--amber-bright);margin-bottom:0.4rem;">
            Characters: ${s.characters.join(" · ")}
          </div>
          <textarea class="flow-prompt-textarea" id="sug-prompt-${s.id}">${s.prompt}</textarea>
        </div>
        <button class="btn-flow-primary" style="width:100%;justify-content:center;" onclick="window.generateSuggestion('${s.id}', '${s.title.replace(/'/g, "\\'")}')">
          ⚡ Start to Generate Scene (${s.id}) in Google Flow
        </button>
      </div>
    `
      )
      .join("");
  }

  window.generateSuggestion = function (sugId, title) {
    const ta = document.getElementById(`sug-prompt-${sugId}`);
    const prompt = ta ? ta.value : "";
    window.triggerFlowGeneration({
      id: `${sugId.toLowerCase()}_${Date.now()}`,
      title: title,
      prompt: prompt,
      mode: "video"
    });
  };

  window.openLightbox = function (src) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    if (modal && img) {
      img.src = src;
      modal.classList.add("open");
    }
  };

  window.closeLightbox = function () {
    const modal = document.getElementById("lightbox-modal");
    if (modal) modal.classList.remove("open");
  };

  document.addEventListener("DOMContentLoaded", init);
})();
