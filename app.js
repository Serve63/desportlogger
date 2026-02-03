(() => {
  const APP_VERSION = "2026-01-29-3";

  // ── Shared day mapping (single source of truth) ──
  const PAGE_DAY_MAP = {
    maandag:   { number: 1, name: "Maandag" },
    dinsdag:   { number: 2, name: "Dinsdag" },
    woensdag:  { number: 3, name: "Woensdag" },
    donderdag: { number: 4, name: "Donderdag" },
    vrijdag:   { number: 5, name: "Vrijdag" },
    zaterdag:  { number: 6, name: "Zaterdag" },
    zondag:    { number: 0, name: "Zondag" },
  };
  const DAY_NAMES = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

  const getPageDayInfo = () => {
    const path = window.location.pathname;
    if (path.includes("vandaag")) {
      const todayNumber = new Date().getDay();
      return { number: todayNumber, name: DAY_NAMES[todayNumber] };
    }
    for (const [key, info] of Object.entries(PAGE_DAY_MAP)) {
      if (path.includes(key)) return info;
    }
    return { number: 1, name: "Maandag" };
  };

  const PAGE_DAY = getPageDayInfo();

  // ── Redirect logic ──
  const todayNum = new Date().getDay();
  const dayPages = {
    0: "/zondag/",
    1: "/maandag/",
    2: "/dinsdag/",
    3: "/woensdag/",
    4: "/donderdag/",
    5: "/vrijdag/",
    6: "/zaterdag/",
  };
  const todayPage = "/vandaag/";

  const currentUrl = new URL(window.location.href);
  const storage = (() => { try { return window.sessionStorage; } catch { return null; } })();
  const manualParam = currentUrl.searchParams.get("manual") === "1";
  const manualSession = storage ? storage.getItem("manualView") === "1" : false;
  const manualView = manualParam || manualSession;

  if (manualParam && storage) {
    storage.setItem("manualView", "1");
  }

  const legacyMap = {
    "/index.html": "/maandag/",
    "/dinsdag.html": "/dinsdag/",
    "/woensdag.html": "/woensdag/",
    "/donderdag.html": "/donderdag/",
    "/vrijdag.html": "/vrijdag/",
    "/zaterdag.html": "/zaterdag/",
    "/zondag.html": "/zondag/",
  };

  const path = window.location.pathname;

  if (legacyMap[path]) {
    window.location.replace(`${legacyMap[path]}${currentUrl.search}${currentUrl.hash}`);
    return;
  }

  if (path !== "/index.html" && path.endsWith("/index.html")) {
    const cleanPath = path.slice(0, -10);
    window.location.replace(`${cleanPath}${currentUrl.search}${currentUrl.hash}`);
    return;
  }

  if (path === "/" || path === "") {
    window.location.replace(todayPage);
    return;
  }

  if (!path.endsWith("/") && !path.includes(".")) {
    window.location.replace(`${path}/${currentUrl.search}${currentUrl.hash}`);
    return;
  }

  const todayDayPage = dayPages[todayNum];
  const currentPage = path.endsWith("/") ? path : `${path}/`;

  if (currentPage === todayPage && manualSession && storage) {
    storage.removeItem("manualView");
  }

  if (currentPage === todayDayPage && currentPage !== todayPage) {
    window.location.replace(todayPage);
    return;
  }

  if (currentPage !== todayPage && !manualView) {
    window.location.replace(todayPage);
    return;
  }

  // ── Today detection & body class ──
  const isToday = todayNum === PAGE_DAY.number;
  const sessionCompleteKey = `session_complete_${new Date().toISOString().slice(0, 10)}`;
  document.body.classList.toggle("not-today", !isToday);

  // ── Save status indicator ──
  const saveStatus = (() => {
    const el = document.createElement("div");
    el.className = "save-status";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
    let hideTimer = null;

    return {
      saving() {
        if (hideTimer) clearTimeout(hideTimer);
        el.textContent = "Opslaan…";
        el.className = "save-status is-saving";
      },
      saved() {
        el.textContent = "Opgeslagen";
        el.className = "save-status is-saved";
        hideTimer = setTimeout(() => { el.className = "save-status"; }, 1500);
      },
      error() {
        el.textContent = "Fout bij opslaan";
        el.className = "save-status is-error";
        hideTimer = setTimeout(() => { el.className = "save-status"; }, 3000);
      },
      offline() {
        el.textContent = "Offline opgeslagen";
        el.className = "save-status is-offline";
        hideTimer = setTimeout(() => { el.className = "save-status"; }, 2500);
      },
    };
  })();

  // ── Day modal ──
  const dayTrigger = document.querySelector(".day-trigger");
  const dayModal = document.getElementById("dayModal");
  const dayClose = document.querySelector(".day-modal__close");
  let previousFocusDayModal = null;
  let dayModalFocusTrapCleanup = null;

  if (dayTrigger && dayModal && dayClose) {
    const openDayModal = () => {
      previousFocusDayModal = document.activeElement;
      dayModal.classList.add("is-open");
      dayModal.setAttribute("aria-hidden", "false");
      dayModalFocusTrapCleanup = trapFocus(dayModal.querySelector(".day-modal__content") || dayModal);
    };
    const closeDayModal = () => {
      dayModal.classList.remove("is-open");
      dayModal.setAttribute("aria-hidden", "true");
      if (dayModalFocusTrapCleanup) { dayModalFocusTrapCleanup(); dayModalFocusTrapCleanup = null; }
      if (previousFocusDayModal) { previousFocusDayModal.focus(); previousFocusDayModal = null; }
    };

    dayTrigger.addEventListener("click", () => {
      if (dayModal.classList.contains("is-open")) closeDayModal();
      else openDayModal();
    });
    dayClose.addEventListener("click", closeDayModal);
    dayModal.addEventListener("click", (e) => { if (e.target === dayModal) closeDayModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dayModal.classList.contains("is-open")) closeDayModal(); });
  }

  // ── Year modal ──
  const yearModal = document.getElementById("yearModal");
  const yearClose = document.querySelector(".year-modal__close");
  let previousFocusYearModal = null;
  let yearModalFocusTrapCleanup = null;

  const openYearModal = () => {
    if (!yearModal) return;
    previousFocusYearModal = document.activeElement;
    yearModal.classList.add("is-open");
    yearModal.setAttribute("aria-hidden", "false");
    yearModalFocusTrapCleanup = trapFocus(yearModal.querySelector(".year-modal__content") || yearModal);
  };
  const closeYearModal = () => {
    if (!yearModal) return;
    yearModal.classList.remove("is-open");
    yearModal.setAttribute("aria-hidden", "true");
    if (yearModalFocusTrapCleanup) { yearModalFocusTrapCleanup(); yearModalFocusTrapCleanup = null; }
    if (previousFocusYearModal) { previousFocusYearModal.focus(); previousFocusYearModal = null; }
  };

  // Event delegation for year trigger (survives innerHTML updates)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".year-trigger")) {
      if (yearModal && yearModal.classList.contains("is-open")) closeYearModal();
      else openYearModal();
    }
  });

  if (yearClose) {
    yearClose.addEventListener("click", closeYearModal);
  }
  if (yearModal) {
    yearModal.addEventListener("click", (e) => { if (e.target === yearModal) closeYearModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && yearModal.classList.contains("is-open")) closeYearModal(); });
  }

  // ── Focus trap utility ──
  function trapFocus(container) {
    if (!container) return () => {};
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handler = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    container.addEventListener("keydown", handler);
    first.focus();
    return () => container.removeEventListener("keydown", handler);
  }

  // ── Day trigger text ──
  const updateDayTriggerText = () => {
    const dt = document.querySelector(".day-trigger");
    if (!dt) return;
    const isTodayPage = todayNum === PAGE_DAY.number;
    dt.textContent = isTodayPage ? "Vandaag" : PAGE_DAY.name;
    document.title = `Logboek - ${isTodayPage ? "Vandaag" : PAGE_DAY.name}`;
  };
  updateDayTriggerText();

  // ── Day modal links ──
  const updateDayModalLinks = () => {
    const links = document.querySelectorAll(".day-modal__grid a");
    if (!links.length) return;

    const dayMapping = {
      "/maandag/": 1,
      "/dinsdag/": 2,
      "/woensdag/": 3,
      "/donderdag/": 4,
      "/vrijdag/": 5,
      "/zaterdag/": 6,
      "/zondag/": 0,
    };

    links.forEach((link) => {
      const rawHref = link.getAttribute("href") || "";
      const baseHref = rawHref.split("?")[0];
      const dayNumber = dayMapping[baseHref];

      const isTodayLink = dayNumber !== undefined && dayNumber === todayNum;

      if (baseHref) {
        link.setAttribute("href", isTodayLink ? "/vandaag/" : baseHref);
      }

      if (isTodayLink) {
        if (!link.dataset.originalText) link.dataset.originalText = link.textContent;
        link.textContent = "Vandaag";
        link.classList.add("is-today");
      } else {
        if (link.dataset.originalText) {
          link.textContent = link.dataset.originalText;
          link.dataset.originalText = "";
        }
        link.classList.remove("is-today");
      }
    });
  };
  updateDayModalLinks();

  document.addEventListener("click", (event) => {
    const link = event.target.closest(".day-modal__grid a");
    if (!link || !storage) return;
    storage.setItem("manualView", "1");
  });

  // ── Input clamping ──
  const clampInput = (input) => {
    const max = Number(input.dataset.max || 999);
    input.addEventListener("input", () => {
      let value = input.value.replace(/\D+/g, "");
      if (value === "") { input.value = ""; return; }
      const num = Number(value);
      input.value = String(Math.min(num, max));
    });
  };
  document.querySelectorAll("input[data-max]").forEach(clampInput);

  // ── Confetti ──
  const launchConfetti = () => {
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    document.documentElement.appendChild(layer);

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const colors = ['#2ea043', '#58d68d', '#f39c12', '#e74c3c', '#3498db', '#9b59b6', '#1abc9c', '#f1c40f'];
    const shapes = ['rect', 'square', 'circle'];

    const createPiece = () => {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.left = (Math.random() * viewportWidth) + "px";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];

      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseSize = 6 + Math.random() * 8;

      if (shape === 'rect') {
        piece.style.width = baseSize + "px";
        piece.style.height = (baseSize * 1.5) + "px";
        piece.style.borderRadius = "2px";
      } else if (shape === 'square') {
        piece.style.width = baseSize + "px";
        piece.style.height = baseSize + "px";
        piece.style.borderRadius = "2px";
      } else {
        piece.style.width = baseSize + "px";
        piece.style.height = baseSize + "px";
        piece.style.borderRadius = "50%";
      }

      piece.style.setProperty('--fall-duration', (2.5 + Math.random() * 2.5) + 's');
      piece.style.setProperty('--fall-delay', (Math.random() * 0.8) + 's');
      piece.style.setProperty('--sway', ((Math.random() - 0.5) * 160) + 'px');
      piece.style.setProperty('--spin-x', (360 + Math.random() * 720) + 'deg');
      piece.style.setProperty('--spin-y', (360 + Math.random() * 540) + 'deg');
      piece.style.setProperty('--spin-z', (180 + Math.random() * 540) + 'deg');

      return piece;
    };

    const batch = (count) => { for (let i = 0; i < count; i++) layer.appendChild(createPiece()); };
    batch(80);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 200;
      batch(15);
      if (elapsed >= 4000) {
        clearInterval(interval);
        setTimeout(() => layer.remove(), 6000);
      }
    }, 200);
  };

  // ── Supabase ──
  if (!window.supabase) {
    console.error("Supabase library niet geladen!");
    return;
  }

  const supabase = window.supabase.createClient(
    "https://lqgcitosiyahgwqluwtb.supabase.co",
    "sb_publishable_dGMK5ruFsyWkF3ne43AS1A_lHURUBhI"
  );

  const getSessionCount = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const baselineCount = currentYear === 2026 ? 22 : 0;
      const { data, error } = await supabase
        .from("session_counts")
        .select("count")
        .eq("year", currentYear)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { data: newData, error: insertError } = await supabase
            .from("session_counts")
            .insert({ year: currentYear, count: baselineCount })
            .select()
            .single();
          if (insertError) { console.error("Error creating session count:", insertError); return baselineCount; }
          return newData?.count ?? baselineCount;
        }
        console.error("Error getting session count:", error);
        return baselineCount;
      }
      return data?.count ?? baselineCount;
    } catch (err) {
      console.error("Error in getSessionCount:", err);
      return new Date().getFullYear() === 2026 ? 21 : 0;
    }
  };

  const reconcileSessionCount = async (count) => {
    const currentYear = new Date().getFullYear();
    let target = count;
    if (currentYear === 2026 && target < 22) target = 22;
    if (target !== count) {
      const { error } = await supabase
        .from("session_counts")
        .upsert({ year: currentYear, count: target }, { onConflict: 'year' });
      if (error) { console.error("Error correcting session count:", error); return count; }
    }
    return target;
  };

  const updateSessionCount = async (increment = true) => {
    try {
      const currentYear = new Date().getFullYear();
      const currentCount = await getSessionCount();
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);

      const { error } = await supabase
        .from("session_counts")
        .upsert({ year: currentYear, count: newCount }, { onConflict: 'year' });

      if (error) {
        console.error("Error updating session count:", error);
        return;
      }
      updateSessionCountDisplay(newCount);
    } catch (err) {
      console.error("Error in updateSessionCount:", err);
    }
  };

  const incrementSessionCount = () => updateSessionCount(true);
  const decrementSessionCount = () => updateSessionCount(false);

  // Fixed: update text node instead of innerHTML to preserve year-trigger event listeners
  const updateSessionCountDisplay = (count) => {
    const trainingCountEl = document.querySelector(".training-count");
    if (!trainingCountEl) return;

    const yearButton = trainingCountEl.querySelector(".year-trigger");
    if (yearButton) {
      const textNode = yearButton.nextSibling;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ` ${count} sessies`;
      } else {
        const newText = document.createTextNode(` ${count} sessies`);
        if (textNode) trainingCountEl.replaceChild(newText, textNode);
        else trainingCountEl.appendChild(newText);
      }
    }

    const yearItem = document.getElementById("yearCount2026");
    if (yearItem) {
      yearItem.innerHTML = `<strong>2026 (tot heden):</strong> ${count}`;
    }
  };

  const initializeSessionCounts = async () => {
    const yearCounts = { 2024: 22, 2025: 301 };
    for (const [year, count] of Object.entries(yearCounts)) {
      const { data, error } = await supabase
        .from("session_counts")
        .select("count")
        .eq("year", parseInt(year))
        .single();

      if (error && (error.code === 'PGRST116' || error.message?.includes('No rows'))) {
        await supabase.from("session_counts").insert({ year: parseInt(year), count }).select().single();
      }
    }
  };

  // Load session counts
  (async () => {
    await initializeSessionCounts();
    const count = await getSessionCount();
    const finalCount = await reconcileSessionCount(count);
    updateSessionCountDisplay(finalCount);
  })();

  // ── Footer toggle ──
  const setupFooter = () => {
    const footerCheck = document.querySelector(".footer-check");
    const footerToggle = document.querySelector(".footer-toggle");

    if (!footerToggle) return;
    if (!isToday) return;

    const preventScroll = (event) => { if (event.cancelable) event.preventDefault(); };
    footerToggle.addEventListener("touchmove", preventScroll, { passive: false });

    if (!footerCheck) return;

    // Restore completion state for today
    if (localStorage.getItem(sessionCompleteKey) === "1") {
      footerCheck.classList.add("is-on");
    }

    let lastToggleAt = 0;
    footerCheck.addEventListener("click", (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastToggleAt < 700) return;
      lastToggleAt = now;
      const wasOn = footerCheck.classList.contains("is-on");
      const isOn = footerCheck.classList.toggle("is-on");

      if (isOn && !wasOn) {
        localStorage.setItem(sessionCompleteKey, "1");
        incrementSessionCount();
        launchConfetti();
      } else if (!isOn && wasOn) {
        localStorage.removeItem(sessionCompleteKey);
        decrementSessionCount();
      }
    });
  };

  setupFooter();

  // ── Workout data ──
  const day = PAGE_DAY.name;
  const getCurrentRows = () => Array.from(document.querySelectorAll(".row"));
  if (!day || getCurrentRows().length === 0) return;

  const cacheKey = `workout_cache_${day}`;
  const cacheDirtyKey = `workout_cache_dirty_${day}`;
  const isCacheDirty = () => {
    try {
      return localStorage.getItem(cacheDirtyKey) === "1";
    } catch (error) {
      return false;
    }
  };
  const setCacheDirty = (dirty) => {
    try {
      if (dirty) localStorage.setItem(cacheDirtyKey, "1");
      else localStorage.removeItem(cacheDirtyKey);
    } catch (error) {
      // Ignore storage errors
    }
  };
  const getRowIndex = (row) => getCurrentRows().indexOf(row);

  const getRowData = (row, index) => {
    const nameInput = row.querySelector(".exercise-name");
    const noteInput = row.querySelector(".exercise-note");
    const setsInput = row.querySelector('input[name^="sets-"]');
    const repsInput = row.querySelector('input[name^="reps-"]');
    const weightInput = row.querySelector('input[name^="gewicht-"]');

    const toInt = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    return {
      day,
      exercise_index: index + 1,
      exercise_name: nameInput?.value?.trim() || null,
      note: noteInput?.value?.trim() || null,
      sets: toInt(setsInput?.value),
      reps: toInt(repsInput?.value),
      weight: toInt(weightInput?.value),
    };
  };

  const readCache = () => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.data) ? parsed.data : null;
    } catch (error) {
      return null;
    }
  };

  const writeCache = (data) => {
    try {
      const payload = {
        version: APP_VERSION,
        savedAt: new Date().toISOString(),
        data,
      };
      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (error) {
      // Ignore cache errors
    }
  };

  const updateCacheFromDOM = () => {
    const rows = getCurrentRows();
    if (!rows.length) return;
    const data = rows.map((row, index) => getRowData(row, index));
    writeCache(data);
  };

  const upsertRow = async (row, index) => {
    if (index == null || index < 0) return;
    if (!navigator.onLine) {
      updateCacheFromDOM();
      setCacheDirty(true);
      saveStatus.offline();
      return;
    }
    const payload = getRowData(row, index);
    saveStatus.saving();
    const { error } = await supabase
      .from("workout_entries")
      .upsert(payload, { onConflict: "day,exercise_index" })
      .select();
    if (error) {
      console.error("Supabase save failed:", error);
      saveStatus.error();
      setCacheDirty(true);
    } else {
      saveStatus.saved();
    }
    updateCacheFromDOM();
  };

  const getColumnForInput = (input) => {
    if (input.classList.contains("exercise-name")) return "exercise_name";
    if (input.classList.contains("exercise-note")) return "note";
    const name = input.getAttribute("name") || "";
    if (name.startsWith("sets-")) return "sets";
    if (name.startsWith("reps-")) return "reps";
    if (name.startsWith("gewicht-")) return "weight";
    return null;
  };

  const clearField = async (row, input) => {
    const column = getColumnForInput(input);
    if (!column) return;
    const index = getRowIndex(row);
    if (index < 0) return;
    if (!navigator.onLine) {
      updateCacheFromDOM();
      setCacheDirty(true);
      saveStatus.offline();
      return;
    }
    const { error } = await supabase
      .from("workout_entries")
      .update({ [column]: null })
      .match({ day, exercise_index: index + 1 });
    if (error) {
      console.warn("Supabase clear failed", error);
      setCacheDirty(true);
    }
    updateCacheFromDOM();
  };

  const timers = new WeakMap();
  const scheduleSave = (row, immediate = false) => {
    if (!row) return;
    const existingTimer = timers.get(row);
    if (existingTimer) clearTimeout(existingTimer);
    const delay = immediate ? 0 : 500;
    const timer = setTimeout(() => {
      const index = getRowIndex(row);
      if (index < 0) return;
      upsertRow(row, index);
    }, delay);
    timers.set(row, timer);
  };

  let reindexLock = false;
  const reindexAndSaveAllRows = async () => {
    if (reindexLock) return;
    reindexLock = true;
    try {
      if (!navigator.onLine) {
        updateCacheFromDOM();
        setCacheDirty(true);
        saveStatus.offline();
        updateDynamicLayout();
        return;
      }
      const allRows = Array.from(document.querySelectorAll(".row"));
      const payloads = allRows.map((row, i) => getRowData(row, i));

      saveStatus.saving();

      const { error: upsertError } = await supabase
        .from("workout_entries")
        .upsert(payloads, { onConflict: "day,exercise_index" });

      if (upsertError) {
        console.error("Batch upsert failed:", upsertError);
        saveStatus.error();
        setCacheDirty(true);
        updateCacheFromDOM();
        updateDynamicLayout();
        return;
      }

      const { error: deleteError } = await supabase
        .from("workout_entries")
        .delete()
        .eq("day", day)
        .gt("exercise_index", allRows.length);

      if (deleteError) {
        console.error("Cleanup delete failed:", deleteError);
        saveStatus.error();
        setCacheDirty(true);
        updateCacheFromDOM();
        updateDynamicLayout();
        return;
      }

      setCacheDirty(false);
      saveStatus.saved();
      updateDynamicLayout();
      updateCacheFromDOM();
    } finally {
      reindexLock = false;
    }
  };

  const attachRowEventListeners = (row) => {
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const value = input.value ?? "";
        if (value === "") {
          clearField(row, input);
          scheduleSave(row, true);
          return;
        }
        scheduleSave(row, false);
      });
      input.addEventListener("blur", () => {
        scheduleSave(row, true);
      });
    });
  };

  const buildRow = (displayIndex) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="exercise-cell">
        <button class="drag-handle" type="button" aria-label="Verplaats oefening"></button>
        <input spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" class="exercise-name" type="text" name="oefening-${displayIndex}" aria-label="Naam oefening" placeholder="Geef je oefening een naam" />
        <input spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" type="text" class="exercise-note" name="note-${displayIndex}" aria-label="Notitie" />
      </div>
      <div class="mini-wrap" data-label="Sets">
        <input type="text" class="mini-field" name="sets-${displayIndex}" data-max="9" inputmode="numeric" pattern="[0-9]*" maxlength="1" value="3" aria-label="Sets" />
      </div>
      <div class="mini-wrap" data-label="Reps">
        <input type="text" class="mini-field" name="reps-${displayIndex}" data-max="30" inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="Reps" />
      </div>
      <div class="mini-wrap" data-label="Gewicht">
        <input type="text" class="mini-field" name="gewicht-${displayIndex}" data-max="999" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Gewicht in kg" />
      </div>
    `;
    return row;
  };

  const ensureRowsForData = (data) => {
    const maxIndex = data.reduce((max, item) => Math.max(max, Number(item.exercise_index) || 0), 0);
    const currentRows = getCurrentRows();
    if (maxIndex > currentRows.length) {
      for (let i = currentRows.length; i < maxIndex; i++) {
        const newRow = buildRow(i + 1);
        insertRowAtEnd(newRow);
        initRow(newRow);
      }
    }
  };

  const applyDataToRows = (data) => {
    if (!Array.isArray(data) || data.length === 0) return;
    ensureRowsForData(data);
    const maxIndex = data.reduce((max, item) => Math.max(max, Number(item.exercise_index) || 0), 0);
    const currentRows = getCurrentRows();
    if (maxIndex < currentRows.length) {
      currentRows.slice(maxIndex).forEach((row) => row.remove());
    }
    data.forEach((item) => {
      const row = getCurrentRows()[item.exercise_index - 1];
      if (!row) return;
      const nameInput = row.querySelector(".exercise-name");
      const noteInput = row.querySelector(".exercise-note");
      const setsInput = row.querySelector('input[name^="sets-"]');
      const repsInput = row.querySelector('input[name^="reps-"]');
      const weightInput = row.querySelector('input[name^="gewicht-"]');

      if (nameInput && item.exercise_name != null) nameInput.value = item.exercise_name;
      if (noteInput && item.note != null) noteInput.value = item.note;
      if (setsInput && item.sets != null) setsInput.value = item.sets;
      if (repsInput && item.reps != null) repsInput.value = item.reps;
      if (weightInput && item.weight != null) weightInput.value = item.weight;
    });
  };

  const insertRowAtEnd = (row) => {
    const grid = document.querySelector(".grid");
    if (!grid || !row) return;
    const rows = getCurrentRows();
    if (rows.length > 0) { rows[rows.length - 1].after(row); return; }
    const headerRow = document.querySelector(".header-row");
    if (headerRow) headerRow.after(row);
    else grid.appendChild(row);
  };

  const insertRowBeforeLast = (row) => {
    const grid = document.querySelector(".grid");
    if (!grid || !row) return;
    const rows = getCurrentRows();
    if (rows.length === 0) {
      const headerRow = document.querySelector(".header-row");
      if (headerRow) headerRow.after(row);
      else grid.appendChild(row);
      return;
    }
    rows[rows.length - 1].before(row);
  };

  const insertRowBeforeSelected = (row, selectedRow) => {
    if (!row) return false;
    if (selectedRow && selectedRow.parentNode) { selectedRow.before(row); return true; }
    return false;
  };

  const ensureRowHandle = (row) => {
    const cell = row.querySelector(".exercise-cell");
    if (!cell) return;
    if (cell.querySelector(".drag-handle")) return;
    const handle = document.createElement("button");
    handle.className = "drag-handle";
    handle.type = "button";
    handle.setAttribute("aria-label", "Verplaats oefening");
    cell.prepend(handle);
  };

  let attachTouchListeners = null;

  const initRow = (row) => {
    if (!row) return;
    ensureRowHandle(row);
    row.querySelectorAll("input[data-max]").forEach(clampInput);
    attachRowEventListeners(row);
    if (typeof attachTouchListeners === "function") {
      attachTouchListeners(row);
    }
  };

  const updateDynamicLayout = () => {
    const rows = getCurrentRows();
    const count = rows.length;
    const isNarrow = window.matchMedia("(max-width: 720px)").matches;
    const baseSizes = isNarrow
      ? { exercise: 16, note: 14, mini: 16 }
      : { exercise: 11.5, note: 10.5, mini: 12 };
    const scale = count > 6 ? Math.max(0.75, 1 - (count - 6) * 0.04) : 1;

    const setVar = (name, value) => {
      document.documentElement.style.setProperty(name, `${value.toFixed(2)}px`);
    };
    setVar("--exercise-font", baseSizes.exercise * scale);
    setVar("--note-font", baseSizes.note * scale);
    setVar("--mini-font", baseSizes.mini * scale);

    const footerToggle = document.querySelector(".footer-toggle");
    if (footerToggle && rows.length && !document.body.classList.contains("not-today")) {
      const lastRow = rows[rows.length - 1];
      const footerRect = footerToggle.getBoundingClientRect();
      const buttonHeight = footerRect.height || 36;
      const viewportHeight = window.innerHeight;
      const lastRect = lastRow.getBoundingClientRect();
      const gap = 16;
      const minTop = 12;
      const maxTop = viewportHeight - buttonHeight - 12;
      const desiredTop = Math.min(lastRect.bottom + gap, maxTop);
      const finalTop = Math.max(minTop, desiredTop);
      footerToggle.style.top = `${finalTop}px`;
      footerToggle.style.bottom = "auto";
    }
  };

  getCurrentRows().forEach((row) => {
    attachRowEventListeners(row);
    ensureRowHandle(row);
  });
  updateDynamicLayout();

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateDynamicLayout, 100);
  });

  if ("visualViewport" in window) {
    window.visualViewport.addEventListener("resize", () => {
      const focused = document.activeElement;
      if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")) {
        setTimeout(() => {
          focused.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 100);
      }
    });
  }

  const setupExerciseContextMenu = () => {
    const exerciseModal = document.getElementById("exerciseModal");
    const addExerciseBtn = document.querySelector(".add-exercise");
    const deleteExerciseBtn = document.querySelector(".delete-exercise");
    let selectedRow = null;
    let previousFocusExerciseModal = null;
    let exerciseModalFocusTrapCleanup = null;

    if (!exerciseModal || !addExerciseBtn || !deleteExerciseBtn) return;

    const openModal = (row) => {
      previousFocusExerciseModal = document.activeElement;
      selectedRow = row;
      exerciseModal.classList.add("is-open");
      exerciseModal.setAttribute("aria-hidden", "false");
      exerciseModalFocusTrapCleanup = trapFocus(exerciseModal.querySelector(".exercise-modal__content") || exerciseModal);
    };

    const closeModal = () => {
      exerciseModal.classList.remove("is-open");
      exerciseModal.setAttribute("aria-hidden", "true");
      selectedRow = null;
      if (exerciseModalFocusTrapCleanup) { exerciseModalFocusTrapCleanup(); exerciseModalFocusTrapCleanup = null; }
      if (previousFocusExerciseModal) { previousFocusExerciseModal.focus(); previousFocusExerciseModal = null; }
    };

    exerciseModal.addEventListener("click", (e) => { if (e.target === exerciseModal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && exerciseModal.classList.contains("is-open")) closeModal();
    });

    let touchTimer = null;
    const LONG_PRESS_DURATION = 500;

    const handleTouchStart = (e, row) => {
      if (e.target && e.target.closest && e.target.closest(".drag-handle")) return;
      row.classList.add("is-long-pressing");
      touchTimer = setTimeout(() => {
        row.classList.remove("is-long-pressing");
        openModal(row);
        if (navigator.vibrate) navigator.vibrate(10);
      }, LONG_PRESS_DURATION);
    };

    const handleTouchEnd = () => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      document.querySelectorAll(".is-long-pressing").forEach((r) => r.classList.remove("is-long-pressing"));
    };

    const handleTouchMove = () => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      document.querySelectorAll(".is-long-pressing").forEach((r) => r.classList.remove("is-long-pressing"));
    };

    attachTouchListeners = (row) => {
      row.addEventListener("touchstart", (e) => handleTouchStart(e, row), { passive: false });
      row.addEventListener("touchend", handleTouchEnd);
      row.addEventListener("touchmove", handleTouchMove);
      row.addEventListener("touchcancel", handleTouchEnd);
    };

    document.querySelectorAll(".row").forEach((row) => { attachTouchListeners(row); });

    deleteExerciseBtn.addEventListener("click", async () => {
      if (!selectedRow) return;
      const rowToDelete = selectedRow;
      closeModal();
      rowToDelete.classList.add("is-deleting");
      await new Promise((r) => setTimeout(r, 250));
      rowToDelete.remove();
      await reindexAndSaveAllRows();
    });

    addExerciseBtn.addEventListener("click", async () => {
      const grid = document.querySelector(".grid");
      if (!grid) return;

      const existingRows = getCurrentRows();
      const nextIndex = Math.max(1, existingRows.length);
      const newRow = buildRow(nextIndex);

      const inserted = insertRowBeforeSelected(newRow, selectedRow);
      if (!inserted) insertRowBeforeLast(newRow);

      initRow(newRow);
      await reindexAndSaveAllRows();

      const nameInput = newRow.querySelector(".exercise-name");
      if (nameInput) setTimeout(() => nameInput.focus(), 100);

      closeModal();
    });
  };

  setupExerciseContextMenu();

  const setupRowReorder = () => {
    const grid = document.querySelector(".grid");
    if (!grid) return;

    let draggingRow = null;
    let rafId = null;
    let lastEvent = null;

    const getClientY = (event) => {
      if (event.touches && event.touches[0]) return event.touches[0].clientY;
      return event.clientY;
    };

    const onPointerDown = (event) => {
      const handle = event.target.closest(".drag-handle");
      if (!handle) return;
      const row = handle.closest(".row");
      if (!row) return;
      event.preventDefault();
      draggingRow = row;
      draggingRow.classList.add("is-dragging");
      document.body.classList.add("is-dragging-active");
    };

    const processMove = () => {
      rafId = null;
      if (!draggingRow || !lastEvent) return;
      const y = getClientY(lastEvent);
      const rows = getCurrentRows().filter((row) => row !== draggingRow);
      let inserted = false;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (y < midpoint) {
          row.before(draggingRow);
          inserted = true;
          break;
        }
      }
      if (!inserted && rows.length) {
        rows[rows.length - 1].after(draggingRow);
      }
      updateDynamicLayout();
    };

    const onPointerMove = (event) => {
      if (!draggingRow) return;
      if (event.cancelable) event.preventDefault();
      lastEvent = event;
      if (!rafId) rafId = requestAnimationFrame(processMove);
    };

    const onPointerUp = async () => {
      if (!draggingRow) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      draggingRow.classList.remove("is-dragging");
      document.body.classList.remove("is-dragging-active");
      draggingRow = null;
      lastEvent = null;
      await reindexAndSaveAllRows();
    };

    grid.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  setupRowReorder();

  const syncCacheToSupabase = async () => {
    if (!navigator.onLine) return false;
    if (!isCacheDirty()) return true;
    const cached = readCache();
    if (cached == null) return false;

    if (cached.length > 0) {
      const { error: upsertError } = await supabase
        .from("workout_entries")
        .upsert(cached, { onConflict: "day,exercise_index" });
      if (upsertError) {
        console.error("Cache sync failed:", upsertError);
        saveStatus.error();
        setCacheDirty(true);
        return false;
      }
    }

    const { error: deleteError } = await supabase
      .from("workout_entries")
      .delete()
      .eq("day", day)
      .gt("exercise_index", cached.length);
    if (deleteError) {
      console.error("Cache cleanup failed:", deleteError);
      saveStatus.error();
      setCacheDirty(true);
      return false;
    }

    setCacheDirty(false);
    saveStatus.saved();
    return true;
  };

  window.addEventListener("online", () => {
    if (isCacheDirty()) syncCacheToSupabase();
  });

  // ── Load data from Supabase ──
  (async () => {
    const cached = readCache();
    const hasCachedPayload = Array.isArray(cached);
    const hasCachedData = hasCachedPayload && cached.length > 0;
    const wasCacheDirty = isCacheDirty();

    if (wasCacheDirty && !hasCachedPayload) {
      setCacheDirty(false);
    }

    if (hasCachedData) {
      applyDataToRows(cached);
      updateDynamicLayout();
      const grid = document.querySelector(".grid");
      if (grid) grid.classList.add("is-loaded");
    }

    let syncOk = true;
    if (wasCacheDirty && hasCachedPayload) {
      syncOk = await syncCacheToSupabase();
    }

    const { data, error } = await supabase
      .from("workout_entries")
      .select("*")
      .eq("day", day)
      .order("exercise_index");

    if (error) {
      console.error("Supabase load failed:", error);
      const grid = document.querySelector(".grid");
      if (grid) grid.classList.add("is-loaded");
      return;
    }

    if ((!wasCacheDirty || syncOk || !hasCachedPayload) && data && data.length) {
      applyDataToRows(data);
      writeCache(data);
    }

    updateDynamicLayout();

    const grid = document.querySelector(".grid");
    if (grid) grid.classList.add("is-loaded");

    if (isCacheDirty()) {
      syncCacheToSupabase();
    }
  })();
})();
