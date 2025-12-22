// assets/app.js
/* eslint-disable no-console */
(function () {
  // =========================
  // CONFIG (edit-friendly)
  // =========================
  const CONFIG = {
    DEMO_MODE: true, // Set false when GAS API + Google Sign-In are ready
    API_BASE: "",    // Example: "https://script.google.com/macros/s/XXXX/exec"
    GOOGLE_CLIENT_ID: "", // Example: "YOUR_CLIENT_ID.apps.googleusercontent.com"
    ROUTE_DEFAULT: "#/dashboard",
    DUE_WINDOW_DAYS: 14,
    TOP_N_LPS_FOR_DELIV_READINESS: 999, // 999 = all
    CURRENCY_PREFIX: "USD ",
    STAGE_MIN_CALLABLE: 7, // used by stage rule when callable_ticket is missing
    USE_STAGE_RULE_FOR_CALLABLE: false, // default: sum callable_ticket; set true to infer from stage
    LABEL_EDITOR_ENABLED: true, // can disable quickly
    FEATURES: {
      PRINT_VIEW: true
    }
  };

  // =========================
  // DEFAULT LABELS (no hardcoded UI text)
  // =========================
  const DEFAULT_LABELS = {
    "app.title": "Deal Execution Tracker",

    "tabs.dashboard": "Dashboard",
    "tabs.lps": "LPs",
    "tabs.timeline": "Timeline",
    "tabs.requirements": "Requirements",
    "tabs.settings": "Settings",

    "kpi.totalRequired": "Total Required",
    "kpi.totalCommitted": "Total Committed",
    "kpi.totalCallable": "Total Callable",
    "kpi.gap": "Gap",
    "kpi.readiness": "2.7 Readiness",

    "labels.next14Days": "Next 14 Days",
    "labels.topRisks": "Top Risks",
    "labels.refresh": "Refresh",
    "labels.export": "Export",
    "labels.searchPlaceholder": "Search LPs",
    "labels.filters": "Filters",
    "labels.clear": "Clear",
    "labels.apply": "Apply",
    "labels.close": "Close",
    "labels.owner": "Owner",
    "labels.stage": "Stage",
    "labels.due": "Due",
    "labels.status": "Status",
    "labels.add": "Add",
    "labels.edit": "Edit",
    "labels.save": "Save",
    "labels.cancel": "Cancel",
    "labels.reason": "Reason",
    "labels.required": "Required",
    "labels.optional": "Optional",
    "labels.updated": "Updated",
    "labels.updatedBy": "Updated by",
    "labels.updatedAt": "Updated at",
    "labels.open": "Open",
    "labels.done": "Done",
    "labels.waived": "Waived",
    "labels.notes": "Notes",
    "labels.documents": "Documents",
    "labels.checklist": "Checklist",
    "labels.overview": "Overview",
    "labels.syncDeliverables": "Sync Deliverables",
    "labels.addDocument": "Add Document",
    "labels.addItem": "Add Item",
    "labels.switchVersion": "Switch Version",
    "labels.active": "Active",
    "labels.warning": "Warning",
    "labels.alignmentWarningTitle": "Funding Alignment Risk",
    "labels.alignmentWarningBody": "Callable funds are below required while near-term milestones remain open.",

    "labels.customize": "Customize",
    "labels.labelsEditor": "Labels",
    "labels.labelsEditorHint": "Edits apply instantly. Save to sync with the whole team.",
    "labels.reloadLatest": "Reload latest",
    "labels.conflict": "Conflict",
    "labels.conflictBody": "Labels changed by someone else. Reload and retry.",

    "lp.field.name": "Name",
    "lp.field.type": "Type",
    "lp.field.jurisdiction": "Jurisdiction",
    "lp.field.relationshipStage": "Relationship Stage",
    "lp.field.certaintyStage": "Certainty Stage",
    "lp.field.targetTicket": "Target Ticket",
    "lp.field.indicatedTicket": "Indicated Ticket",
    "lp.field.committedTicket": "Committed Ticket",
    "lp.field.callableTicket": "Callable Ticket",
    "lp.field.cfiusFlag": "CFIUS Flag",
    "lp.field.ragStatus": "RAG",
    "lp.field.nextAction": "Next Action",
    "lp.field.nextDueDate": "Next Due Date",
    "lp.field.contacts": "Contacts",

    "doc.field.category": "Category",
    "doc.field.title": "Title",
    "doc.field.version": "Version",
    "doc.field.url": "Drive URL",

    "req.field.item": "Item",
    "req.field.amount": "Amount",
    "req.field.evidence": "Evidence URL",

    "milestone.field.group": "Group",
    "milestone.field.name": "Milestone",
    "milestone.field.dueDate": "Due Date",
    "milestone.field.owner": "Owner",
    "milestone.field.status": "Status",
    "milestone.status.notStarted": "Not started",
    "milestone.status.inProgress": "In progress",
    "milestone.status.done": "Done",
    "milestone.status.blocked": "Blocked",

    "status.green": "Green",
    "status.amber": "Amber",
    "status.red": "Red",

    "stage.name.0": "Stage 0",
    "stage.name.1": "Stage 1",
    "stage.name.2": "Stage 2",
    "stage.name.3": "Stage 3",
    "stage.name.4": "Stage 4",
    "stage.name.5": "Stage 5",
    "stage.name.6": "Stage 6",
    "stage.name.7": "Stage 7",
    "stage.name.8": "Stage 8",

    "auth.signInTitle": "Sign in",
    "auth.signInBody": "Use your Google account to access this internal tool.",
    "auth.signOut": "Sign out",
    "auth.needClientId": "Missing Google Client ID in config.",
    "auth.needApiBase": "Missing API Base URL in config.",
    "auth.loading": "Loading",
    "auth.retry": "Retry"
  };

  // =========================
  // STATE
  // =========================
  const State = {
    route: CONFIG.ROUTE_DEFAULT,
    user: null,
    idToken: "",
    labels: {
      version: 0,
      map: { ...DEFAULT_LABELS }
    },
    data: {
      lps: [],
      deliverableTemplates: [],
      lpDeliverables: [],
      documents: [],
      requirements: { activeVersion: null, items: [], versions: [] },
      milestones: [],
      audit: { enabled: true }
    },
    ui: {
      lpSearch: "",
      lpFilters: {
        owner: "",
        rag: "",
        cfius: "",
        minCertaintyStage: "",
        dueWithinDays: ""
      }
    }
  };

  const Cache = {
    labelsSnapshotBeforeEdit: null
  };

  // =========================
  // UTIL
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeStr(v) { return (v === null || v === undefined) ? "" : String(v); }
  function nowISO() { return new Date().toISOString(); }

  function parseNum(v) {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    const n = Number(String(v).replace(/,/g, "").trim());
    return isFinite(n) ? n : 0;
  }

  function formatMoney(n) {
    const val = parseNum(n);
    const s = val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `${CONFIG.CURRENCY_PREFIX}${s}`;
  }

  function formatPct(n) {
    const v = Math.round(parseNum(n) * 100);
    return `${v}%`;
  }

  function parseDate(d) {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatDateShort(d) {
    const dt = parseDate(d);
    if (!dt) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function daysFromNow(d) {
    const dt = parseDate(d);
    if (!dt) return Infinity;
    const ms = dt.getTime() - Date.now();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function t(key) {
    const map = State.labels?.map || DEFAULT_LABELS;
    return safeStr(map[key] ?? DEFAULT_LABELS[key] ?? key);
  }

  function icon(name) {
    // Minimal stroke icons (no external deps)
    const paths = {
      gear: `<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a7.7 7.7 0 0 0 .1-6l-2 .3a6.9 6.9 0 0 0-1.4-1.4l.3-2a7.7 7.7 0 0 0-6-.1l.3 2a6.9 6.9 0 0 0-1.4 1.4l-2-.3a7.7 7.7 0 0 0-.1 6l2-.3a6.9 6.9 0 0 0 1.4 1.4l-.3 2a7.7 7.7 0 0 0 6 .1l-.3-2a6.9 6.9 0 0 0 1.4-1.4l2 .3Z"/>`,
      refresh: `<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v6h-6"/>`,
      search: `<path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/><path d="M16.5 16.5 21 21"/>`,
      filter: `<path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/>`,
      home: `<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z"/>`,
      users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
      clock: `<path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z"/><path d="M12 7v5l3 3"/>`,
      sum: `<path d="M6 5h12"/><path d="M6 19h12"/><path d="M8 19 16 12 8 5"/>`,
      chevron: `<path d="M9 18 15 12 9 6"/>`,
      x: `<path d="M18 6 6 18"/><path d="M6 6l12 12"/>`,
      plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
      signout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
      print: `<path d="M6 9V4h12v5"/><path d="M6 18h12v2H6v-2Z"/><path d="M6 14H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1"/><path d="M8 14h8"/>`
    };
    const body = paths[name] || "";
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  function ragToClass(v) {
    const s = safeStr(v).toLowerCase();
    if (s === "green" || s === "ok") return "ok";
    if (s === "amber" || s === "yellow" || s === "warn") return "warn";
    if (s === "red" || s === "danger") return "danger";
    return "";
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === null || v === undefined) return;
      else el.setAttribute(k, String(v));
    });
    (children || []).forEach(c => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  // =========================
  // TOASTS
  // =========================
  function ensureToasts() {
    let node = $(".toasts");
    if (!node) {
      node = createEl("div", { class: "toasts", "aria-live": "polite" });
      document.body.appendChild(node);
    }
    return node;
  }

  function toast(msg, ms = 2200) {
    const wrap = ensureToasts();
    const tnode = createEl("div", { class: "toast" }, [safeStr(msg)]);
    wrap.appendChild(tnode);
    setTimeout(() => {
      tnode.style.opacity = "0";
      tnode.style.transform = "translateY(4px)";
      tnode.style.transition = "opacity .2s ease, transform .2s ease";
      setTimeout(() => tnode.remove(), 240);
    }, ms);
  }

  // =========================
  // MODALS & SHEETS
  // =========================
  function openModal({ titleKey, bodyNode, actions }) {
    const backdrop = createEl("div", { class: "backdrop open", role: "dialog", "aria-modal": "true" });
    const modal = createEl("div", { class: "modal" });

    const head = createEl("div", { class: "modal-head" }, [
      createEl("div", { class: "modal-title" }, [t(titleKey)]),
      createEl("button", { class: "icon-btn", "aria-label": t("labels.close"), onClick: () => close() , html: icon("x") })
    ]);

    const body = createEl("div", { class: "modal-body" }, [bodyNode]);
    const foot = createEl("div", { class: "modal-foot" });

    (actions || []).forEach(a => {
      foot.appendChild(createEl("button", {
        class: `btn ${a.variant || ""}`.trim(),
        onClick: () => a.onClick?.(close)
      }, [t(a.labelKey)]));
    });

    modal.appendChild(head);
    modal.appendChild(body);
    modal.appendChild(foot);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function onEsc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onEsc);

    function close() {
      document.removeEventListener("keydown", onEsc);
      backdrop.classList.remove("open");
      setTimeout(() => backdrop.remove(), 120);
    }
    return close;
  }

  function openSheet({ titleKey, bodyNode, actions }) {
    const backdrop = createEl("div", { class: "backdrop open", role: "dialog", "aria-modal": "true" });
    const sheet = createEl("div", { class: "sheet open" });

    const head = createEl("div", { class: "sheet-head" }, [
      createEl("div", { class: "sheet-title" }, [t(titleKey)]),
      createEl("button", { class: "icon-btn", "aria-label": t("labels.close"), onClick: () => close(), html: icon("x") })
    ]);

    const hint = createEl("div", { class: "drag-hint" });
    const body = createEl("div", { class: "sheet-body" }, [bodyNode]);
    const foot = createEl("div", { class: "modal-foot" });

    (actions || []).forEach(a => {
      foot.appendChild(createEl("button", {
        class: `btn ${a.variant || ""}`.trim(),
        onClick: () => a.onClick?.(close)
      }, [t(a.labelKey)]));
    });

    sheet.appendChild(hint);
    sheet.appendChild(head);
    sheet.appendChild(body);
    sheet.appendChild(foot);
    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

    function onEsc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onEsc);

    function close() {
      document.removeEventListener("keydown", onEsc);
      sheet.classList.remove("open");
      setTimeout(() => backdrop.remove(), 160);
    }

    // click outside closes
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    return close;
  }

  function openAdaptiveDialog(opts) {
    // mobile: bottom sheet; desktop: modal
    if (window.matchMedia("(min-width: 900px)").matches) return openModal(opts);
    return openSheet(opts);
  }

  // =========================
  // SELECTORS & CALCS
  // =========================
  function getLPById(id) { return State.data.lps.find(x => safeStr(x.lp_id) === safeStr(id)) || null; }
  function getDeliverablesForLP(lpId) {
    return State.data.lpDeliverables
      .filter(d => safeStr(d.lp_id) === safeStr(lpId))
      .slice()
      .sort((a, b) => {
        const sa = parseNum(a.certainty_stage); const sb = parseNum(b.certainty_stage);
        if (sa !== sb) return sa - sb;
        return safeStr(a.deliverable_name).localeCompare(safeStr(b.deliverable_name));
      });
  }
  function getDocsForLP(lpId) {
    return State.data.documents
      .filter(d => safeStr(d.lp_id) === safeStr(lpId))
      .slice()
      .sort((a, b) => safeStr(b.uploaded_at).localeCompare(safeStr(a.uploaded_at)));
  }

  function totalRequired() {
    return (State.data.requirements?.items || []).reduce((sum, it) => sum + parseNum(it.amount), 0);
  }
  function totalCommitted() {
    return State.data.lps.reduce((sum, lp) => sum + parseNum(lp.committed_ticket), 0);
  }
  function totalCallable() {
    if (!CONFIG.USE_STAGE_RULE_FOR_CALLABLE) {
      return State.data.lps.reduce((sum, lp) => sum + parseNum(lp.callable_ticket), 0);
    }
    // stage rule: if callable_ticket missing, infer from committed_ticket for stage >= threshold
    return State.data.lps.reduce((sum, lp) => {
      const ct = parseNum(lp.callable_ticket);
      if (ct > 0) return sum + ct;
      const st = parseNum(lp.certainty_stage);
      if (st >= CONFIG.STAGE_MIN_CALLABLE) return sum + parseNum(lp.committed_ticket);
      return sum;
    }, 0);
  }
  function gap() { return Math.max(0, totalRequired() - totalCallable()); }

  function dueSoonDeliverables(days = CONFIG.DUE_WINDOW_DAYS) {
    const out = [];
    for (const d of State.data.lpDeliverables) {
      const status = safeStr(d.status).toLowerCase();
      if (status !== "open") continue;
      const dd = daysFromNow(d.due_date);
      if (dd <= days && dd >= -3650) {
        const lp = getLPById(d.lp_id);
        out.push({
          kind: "deliverable",
          due: d.due_date,
          title: safeStr(d.deliverable_name),
          sub: `${safeStr(lp?.lp_name || "")}`,
          lp_id: d.lp_id,
          id: d.lp_deliverable_id
        });
      }
    }
    return out.sort((a, b) => safeStr(a.due).localeCompare(safeStr(b.due)));
  }

  function dueSoonMilestones(days = CONFIG.DUE_WINDOW_DAYS) {
    const out = [];
    for (const m of State.data.milestones) {
      const status = safeStr(m.status).toLowerCase();
      if (status === "done") continue;
      const dd = daysFromNow(m.due_date);
      if (dd <= days && dd >= -3650) {
        out.push({
          kind: "milestone",
          due: m.due_date,
          title: safeStr(m.name),
          sub: `${safeStr(m.group || "")}`,
          milestone_id: m.milestone_id
        });
      }
    }
    return out.sort((a, b) => safeStr(a.due).localeCompare(safeStr(b.due)));
  }

  function requiredDeliverablesForLP(lp) {
    const stage = parseNum(lp.certainty_stage);
    const templates = State.data.deliverableTemplates || [];
    const required = templates
      .filter(tpl => parseNum(tpl.certainty_stage) <= stage && String(tpl.is_required).toUpperCase() === "Y")
      .map(tpl => safeStr(tpl.deliverable_code));
    return new Set(required);
  }

  function deliverableReadinessRatio() {
    const lps = State.data.lps.slice(0, CONFIG.TOP_N_LPS_FOR_DELIV_READINESS);
    let req = 0, done = 0;
    for (const lp of lps) {
      const requiredSet = requiredDeliverablesForLP(lp);
      if (requiredSet.size === 0) continue;
      const dlist = getDeliverablesForLP(lp.lp_id);
      for (const code of requiredSet) {
        req += 1;
        const inst = dlist.find(d => safeStr(d.deliverable_code) === code);
        if (inst && safeStr(inst.status).toLowerCase() === "done") done += 1;
      }
    }
    return req === 0 ? 1 : (done / req);
  }

  function milestoneReadinessRatio(days = CONFIG.DUE_WINDOW_DAYS) {
    const due = State.data.milestones.filter(m => daysFromNow(m.due_date) <= days);
    if (due.length === 0) return 1;
    const done = due.filter(m => safeStr(m.status).toLowerCase() === "done").length;
    return done / due.length;
  }

  function fundingReadinessRatio() {
    const req = totalRequired();
    if (req <= 0) return 0;
    return Math.min(1, totalCallable() / req);
  }

  function readinessScore() {
    const fr = fundingReadinessRatio();
    const mr = milestoneReadinessRatio();
    const dr = deliverableReadinessRatio();
    return Math.min(fr, mr, dr);
  }

  function isAdmin() { return safeStr(State.user?.role).toLowerCase() === "admin"; }
  function isEditor() {
    const r = safeStr(State.user?.role).toLowerCase();
    return r === "admin" || r === "editor";
  }

  // =========================
  // AUTH (GIS)
  // =========================
  function loadFromStorage() {
    try {
      const tok = localStorage.getItem("app.google_id_token") || "";
      const labelsCache = localStorage.getItem("app.labels_cache") || "";
      if (tok) State.idToken = tok;
      if (labelsCache) {
        const parsed = JSON.parse(labelsCache);
        if (parsed?.map) {
          State.labels.map = { ...DEFAULT_LABELS, ...parsed.map };
          State.labels.version = parseNum(parsed.version);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function saveTokenToStorage(tok) {
    State.idToken = tok || "";
    if (State.idToken) localStorage.setItem("app.google_id_token", State.idToken);
    else localStorage.removeItem("app.google_id_token");
  }

  function cacheLabelsToStorage() {
    try {
      localStorage.setItem("app.labels_cache", JSON.stringify({
        version: State.labels.version,
        map: State.labels.map,
        fetchedAt: nowISO()
      }));
    } catch (e) {
      console.warn(e);
    }
  }

  function ensureApiReady() {
    window.AppApi.init({ baseUrl: CONFIG.API_BASE, idToken: State.idToken });
  }

  function showLogin() {
    const app = $("#app");
    app.innerHTML = "";
    const body = createEl("div", { class: "main" }, [
      createEl("div", { class: "card", style: "padding:16px;" }, [
        createEl("div", { class: "hrow" }, [
          createEl("h1", { class: "h1" }, [t("auth.signInTitle")])
        ]),
        createEl("div", { class: "muted", style: "margin-top:8px; font-size: var(--fs-sm);" }, [t("auth.signInBody")]),
        createEl("div", { class: "hr" }),
        createEl("div", { class: "section" }, [
          createEl("div", { class: "small muted" }, [
            (!CONFIG.GOOGLE_CLIENT_ID ? t("auth.needClientId") : ""),
            (!CONFIG.API_BASE ? (CONFIG.GOOGLE_CLIENT_ID ? t("auth.needApiBase") : "") : "")
          ].filter(Boolean).join(" "))
        ]),
        createEl("div", { id: "googleSignInBtn", style: "margin-top:12px;" }),
        createEl("div", { class: "small muted", style: "margin-top:10px;" }, [
          `${t("auth.loading")}: ${safeStr(CONFIG.DEMO_MODE ? "DEMO" : "LIVE")}`
        ])
      ])
    ]);
    app.appendChild(body);

    if (!CONFIG.GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      toast(t("auth.needClientId"));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        const cred = resp?.credential || "";
        if (!cred) return toast(t("labels.warning"));
        saveTokenToStorage(cred);
        ensureApiReady();
        await bootstrapAndRender();
      }
    });

    window.google.accounts.id.renderButton($("#googleSignInBtn"), {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 280
    });
  }

  function signOut() {
    saveTokenToStorage("");
    State.user = null;
    State.data = {
      lps: [],
      deliverableTemplates: [],
      lpDeliverables: [],
      documents: [],
      requirements: { activeVersion: null, items: [], versions: [] },
      milestones: [],
      audit: { enabled: true }
    };
    render();
    showLogin();
  }

  // =========================
  // BOOTSTRAP
  // =========================
  function overlayLabels(serverLabels) {
    const map = serverLabels?.map || {};
    State.labels.map = { ...DEFAULT_LABELS, ...map };
    State.labels.version = parseNum(serverLabels?.version);
    cacheLabelsToStorage();
  }

  async function bootstrapLive() {
    ensureApiReady();
    const res = await window.AppApi.getBootstrap();
    if (!res.ok) {
      const status = res.status || 0;
      if (status === 401 || status === 403) {
        toast("Auth required");
        showLogin();
        return false;
      }
      toast((res.error && res.error.message) ? res.error.message : "Bootstrap failed");
      return false;
    }
    const data = res.data || {};
    State.user = data.user || null;

    overlayLabels(data.labels || { version: 0, map: {} });

    State.data.lps = Array.isArray(data.lps) ? data.lps : [];
    State.data.deliverableTemplates = Array.isArray(data.deliverableTemplates) ? data.deliverableTemplates : [];
    State.data.lpDeliverables = Array.isArray(data.lpDeliverables) ? data.lpDeliverables : [];
    State.data.documents = Array.isArray(data.documents) ? data.documents : [];
    State.data.requirements = data.requirements || { activeVersion: null, items: [], versions: [] };
    State.data.milestones = Array.isArray(data.milestones) ? data.milestones : [];
    State.data.audit = data.audit || { enabled: true };
    return true;
  }

  function bootstrapDemo() {
    const demo = demoData();
    State.user = demo.user;
    overlayLabels(demo.labels);
    State.data = demo.data;
    return true;
  }

  async function bootstrapAndRender() {
    const ok = CONFIG.DEMO_MODE ? bootstrapDemo() : await bootstrapLive();
    if (!ok) return;
    render();
  }

  // =========================
  // ROUTING
  // =========================
  function setRoute(hash) {
    State.route = hash || CONFIG.ROUTE_DEFAULT;
    if (!State.route.startsWith("#/")) State.route = CONFIG.ROUTE_DEFAULT;
    render();
  }

  function parseRoute() {
    const h = location.hash || CONFIG.ROUTE_DEFAULT;
    const parts = h.replace(/^#\//, "").split("/");
    const root = parts[0] || "dashboard";
    return { raw: h, root, parts };
  }

  // =========================
  // UI BUILDERS
  // =========================
  function navLink(href, iconName, labelKey, active) {
    return createEl("a", { href, class: active ? "active" : "" }, [
      createEl("span", { html: icon(iconName) }),
      createEl("span", { class: "nav-label" }, [t(labelKey)])
    ]);
  }

  function bottomTab(href, iconName, labelKey, active) {
    return createEl("a", { href, class: `tab ${active ? "active" : ""}`.trim(), "aria-label": t(labelKey) }, [
      createEl("span", { html: icon(iconName) }),
      createEl("span", {}, [t(labelKey)])
    ]);
  }

  function buildShell(contentNode) {
    const route = parseRoute();
    const active = (r) => route.root === r;

    const app = createEl("div", { class: `app ${window.matchMedia("(min-width: 900px)").matches ? "app-desktop" : ""}` });

    const topbar = createEl("div", { class: "topbar" }, [
      createEl("div", { class: "topbar-inner" }, [
        createEl("div", { class: "brand" }, [
          createEl("div", { class: "brand-mark", "aria-hidden": "true" }),
          createEl("div", { class: "brand-title" }, [t("app.title")])
        ]),
        createEl("div", { class: "top-actions" }, [
          (CONFIG.FEATURES.PRINT_VIEW ? createEl("button", {
            class: "icon-btn",
            "aria-label": t("labels.export"),
            onClick: () => exportPrintView()
          }, [createEl("span", { html: icon("print") })]) : null),
          createEl("button", {
            class: "icon-btn",
            "aria-label": t("labels.refresh"),
            onClick: async () => {
              toast(t("labels.refresh"));
              await bootstrapAndRender();
            }
          }, [createEl("span", { html: icon("refresh") })]),
          (CONFIG.LABEL_EDITOR_ENABLED && isAdmin() ? createEl("button", {
            class: "icon-btn",
            "aria-label": t("labels.customize"),
            onClick: () => openLabelEditor()
          }, [createEl("span", { html: icon("gear") })]) : null),
          (!CONFIG.DEMO_MODE && State.user ? createEl("button", {
            class: "icon-btn",
            "aria-label": t("auth.signOut"),
            onClick: () => signOut()
          }, [createEl("span", { html: icon("signout") })]) : null)
        ].filter(Boolean))
      ])
    ]);

    app.appendChild(topbar);

    // Desktop sidebar
    if (window.matchMedia("(min-width: 900px)").matches) {
      const sidebar = createEl("div", { class: "sidebar" }, [
        createEl("nav", { class: "nav" }, [
          navLink("#/dashboard", "home", "tabs.dashboard", active("dashboard")),
          navLink("#/lps", "users", "tabs.lps", active("lps") || active("lp")),
          navLink("#/timeline", "clock", "tabs.timeline", active("timeline")),
          navLink("#/requirements", "sum", "tabs.requirements", active("requirements"))
        ])
      ]);
      app.appendChild(sidebar);
    }

    const main = createEl("main", { class: "main" }, [contentNode]);
    app.appendChild(main);

    // Mobile bottom nav
    const bottom = createEl("div", { class: "bottom-nav" }, [
      createEl("div", { class: "bottom-nav-inner" }, [
        bottomTab("#/dashboard", "home", "tabs.dashboard", active("dashboard")),
        bottomTab("#/lps", "users", "tabs.lps", active("lps") || active("lp")),
        bottomTab("#/timeline", "clock", "tabs.timeline", active("timeline")),
        bottomTab("#/requirements", "sum", "tabs.requirements", active("requirements"))
      ])
    ]);
    app.appendChild(bottom);

    return app;
  }

  function buildKpiCard(labelKey, valueText, subText) {
    return createEl("div", { class: "card kpi" }, [
      createEl("div", { class: "kpi-label" }, [t(labelKey)]),
      createEl("div", { class: "kpi-value" }, [valueText]),
      createEl("div", { class: "kpi-sub" }, [subText || ""])
    ]);
  }

  function buildLPRow(lp) {
    const certainty = parseNum(lp.certainty_stage);
    const stageKey = `stage.name.${certainty}`;
    const stageLabel = t(stageKey);

    const ragCls = ragToClass(lp.rag_status);
    const cfiusCls = ragToClass(lp.cfius_flag);

    const due = formatDateShort(lp.next_due_date);
    const next = safeStr(lp.next_action);

    return createEl("div", {
      class: "lp-row",
      role: "button",
      tabindex: "0",
      onClick: () => setRoute(`#/lp/${encodeURIComponent(lp.lp_id)}`),
      onKeydown: (e) => { if (e.key === "Enter") setRoute(`#/lp/${encodeURIComponent(lp.lp_id)}`); }
    }, [
      createEl("div", { class: "lp-main" }, [
        createEl("div", { class: "lp-line1" }, [
          createEl("div", { class: "lp-name" }, [safeStr(lp.lp_name)]),
          createEl("div", { class: "lp-ticket" }, [formatMoney(lp.committed_ticket)])
        ]),
        createEl("div", { class: "lp-line2" }, [
          createEl("span", { class: "chip" }, [stageLabel]),
          createEl("div", { class: "lp-next" }, [`${next}${due ? " · " + due : ""}`])
        ])
      ]),
      createEl("div", { class: "lp-side" }, [
        createEl("span", { class: `dot ${ragCls}`.trim(), title: t(`status.${safeStr(lp.rag_status).toLowerCase()}`) }),
        createEl("span", { class: `chip ${cfiusCls}`.trim() }, [t(`status.${safeStr(lp.cfius_flag).toLowerCase()}`)])
      ])
    ]);
  }

  function buildListCard(titleKey, items) {
    const node = createEl("div", { class: "card" }, [
      createEl("div", { class: "list-item" }, [
        createEl("div", {}, [
          createEl("div", { class: "list-item-title" }, [t(titleKey)])
        ])
      ])
    ]);

    if (!items.length) {
      node.appendChild(createEl("div", { class: "list-item" }, [
        createEl("div", { class: "list-item-meta" }, ["—"])
      ]));
      return node;
    }

    items.slice(0, 12).forEach((it, idx) => {
      const row = createEl("div", { class: "list-item" }, [
        createEl("div", {}, [
          createEl("div", { class: "list-item-title" }, [safeStr(it.title)]),
          createEl("div", { class: "list-item-meta" }, [
            `${formatDateShort(it.due)} · ${safeStr(it.sub)}`
          ])
        ])
      ]);
      if (it.kind === "deliverable" && it.lp_id) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => setRoute(`#/lp/${encodeURIComponent(it.lp_id)}`));
      }
      node.appendChild(row);
      if (idx !== items.length - 1) node.appendChild(createEl("div", { class: "hr" }));
    });
    return node;
  }

  // =========================
  // PAGES
  // =========================
  function pageDashboard() {
    const req = totalRequired();
    const committed = totalCommitted();
    const callable = totalCallable();
    const g = gap();
    const readiness = readinessScore();

    const dueD = dueSoonDeliverables();
    const dueM = dueSoonMilestones();
    const mergedDue = [...dueD, ...dueM].sort((a, b) => safeStr(a.due).localeCompare(safeStr(b.due)));

    const topRisks = State.data.lps.filter(lp => {
      const cfius = safeStr(lp.cfius_flag).toLowerCase() === "red";
      const rag = safeStr(lp.rag_status).toLowerCase() === "red";
      const requiredSet = requiredDeliverablesForLP(lp);
      const dlist = getDeliverablesForLP(lp.lp_id);
      let missing = false;
      for (const code of requiredSet) {
        const inst = dlist.find(d => safeStr(d.deliverable_code) === code);
        if (!inst || safeStr(inst.status).toLowerCase() !== "done") { missing = true; break; }
      }
      return cfius || rag || missing;
    });

    const hasAlignmentRisk = (callable < req) && State.data.milestones.some(m => {
      const dd = daysFromNow(m.due_date);
      return dd <= CONFIG.DUE_WINDOW_DAYS && safeStr(m.status).toLowerCase() !== "done";
    });

    const node = createEl("div", { class: "section" }, [
      createEl("div", { class: "kpi-strip" }, [
        buildKpiCard("kpi.totalRequired", formatMoney(req), ""),
        buildKpiCard("kpi.totalCommitted", formatMoney(committed), ""),
        buildKpiCard("kpi.totalCallable", formatMoney(callable), ""),
        buildKpiCard("kpi.gap", formatMoney(g), ""),
        buildKpiCard("kpi.readiness", formatPct(readiness), "")
      ]),
      hasAlignmentRisk ? createEl("div", { class: "warn-banner" }, [
        createEl("div", { style: "display:flex; gap:10px; align-items:flex-start;" }, [
          createEl("div", { class: "dot warn", style: "margin-top:5px;" }),
          createEl("div", {}, [
            createEl("div", {}, [createEl("strong", {}, [t("labels.alignmentWarningTitle")])]),
            createEl("div", { class: "small muted", style: "margin-top:4px;" }, [t("labels.alignmentWarningBody")])
          ])
        ])
      ]) : null,
      buildListCard("labels.next14Days", mergedDue),
      createEl("div", { class: "card" }, [
        createEl("div", { class: "list-item" }, [
          createEl("div", {}, [
            createEl("div", { class: "list-item-title" }, [t("labels.topRisks")]),
            createEl("div", { class: "list-item-meta" }, [t("labels.required")])
          ])
        ]),
        createEl("div", { class: "hr" }),
        createEl("div", { class: "list" }, [
          ...topRisks.slice(0, 8).map(lp => {
            const ragCls = ragToClass(lp.rag_status);
            const cfiusCls = ragToClass(lp.cfius_flag);
            return createEl("div", { class: "lp-row", role:"button", tabindex:"0", onClick: () => setRoute(`#/lp/${encodeURIComponent(lp.lp_id)}`) }, [
              createEl("div", { class: "lp-main" }, [
                createEl("div", { class: "lp-line1" }, [
                  createEl("div", { class: "lp-name" }, [safeStr(lp.lp_name)]),
                  createEl("div", { class: "lp-ticket" }, [formatMoney(lp.committed_ticket)])
                ]),
                createEl("div", { class: "lp-line2" }, [
                  createEl("span", { class: "chip" }, [t(`stage.name.${parseNum(lp.certainty_stage)}`)]),
                  createEl("div", { class: "lp-next" }, [safeStr(lp.next_action)])
                ])
              ]),
              createEl("div", { class: "lp-side" }, [
                createEl("span", { class: `dot ${ragCls}`.trim() }),
                createEl("span", { class: `chip ${cfiusCls}`.trim() }, [t(`status.${safeStr(lp.cfius_flag).toLowerCase()}`)])
              ])
            ]);
          })
        ])
      ])
    ].filter(Boolean));

    return node;
  }

  function pageLPs() {
    const search = State.ui.lpSearch.trim().toLowerCase();
    const f = State.ui.lpFilters;

    let lps = State.data.lps.slice();

    if (search) {
      lps = lps.filter(lp => safeStr(lp.lp_name).toLowerCase().includes(search));
    }
    if (f.owner) lps = lps.filter(lp => safeStr(lp.owner).toLowerCase() === safeStr(f.owner).toLowerCase());
    if (f.rag) lps = lps.filter(lp => safeStr(lp.rag_status).toLowerCase() === safeStr(f.rag).toLowerCase());
    if (f.cfius) lps = lps.filter(lp => safeStr(lp.cfius_flag).toLowerCase() === safeStr(f.cfius).toLowerCase());
    if (f.minCertaintyStage !== "" && f.minCertaintyStage !== null && f.minCertaintyStage !== undefined) {
      lps = lps.filter(lp => parseNum(lp.certainty_stage) >= parseNum(f.minCertaintyStage));
    }
    if (f.dueWithinDays !== "" && f.dueWithinDays !== null && f.dueWithinDays !== undefined) {
      const w = parseNum(f.dueWithinDays);
      lps = lps.filter(lp => daysFromNow(lp.next_due_date) <= w);
    }

    lps.sort((a, b) => {
      // earlier due first, then bigger committed
      const da = parseDate(a.next_due_date)?.getTime() || Infinity;
      const db = parseDate(b.next_due_date)?.getTime() || Infinity;
      if (da !== db) return da - db;
      return parseNum(b.committed_ticket) - parseNum(a.committed_ticket);
    });

    const searchRow = createEl("div", { class: "card", style: "padding:12px;" }, [
      createEl("div", { class: "search" }, [
        createEl("div", { html: icon("search"), style: "color: var(--muted)" }),
        createEl("input", {
          value: State.ui.lpSearch,
          placeholder: t("labels.searchPlaceholder"),
          "aria-label": t("labels.searchPlaceholder"),
          onInput: (e) => { State.ui.lpSearch = e.target.value; render(); }
        }),
        createEl("button", { class: "btn", onClick: () => openLPFilters() }, [t("labels.filters")])
      ])
    ]);

    const list = createEl("div", { class: "card" }, [
      ...lps.map(buildLPRow)
    ]);

    return createEl("div", { class: "section" }, [
      createEl("div", { class: "hrow" }, [
        createEl("h1", { class: "h1" }, [t("tabs.lps")]),
        createEl("div", { class: "small muted" }, [`${lps.length}`])
      ]),
      searchRow,
      list
    ]);
  }

  function buildLPOverviewSection(lp) {
    const fields = [
      { key: "lp_name", labelKey: "lp.field.name", type: "text", readonly: true },
      { key: "owner", labelKey: "labels.owner", type: "text" },
      { key: "relationship_stage", labelKey: "lp.field.relationshipStage", type: "number" },
      { key: "certainty_stage", labelKey: "lp.field.certaintyStage", type: "number" },
      { key: "target_ticket", labelKey: "lp.field.targetTicket", type: "number" },
      { key: "indicated_ticket", labelKey: "lp.field.indicatedTicket", type: "number" },
      { key: "committed_ticket", labelKey: "lp.field.committedTicket", type: "number" },
      { key: "callable_ticket", labelKey: "lp.field.callableTicket", type: "number" },
      { key: "cfius_flag", labelKey: "lp.field.cfiusFlag", type: "select", options: ["Green", "Amber", "Red"] },
      { key: "rag_status", labelKey: "lp.field.ragStatus", type: "select", options: ["Green", "Amber", "Red"] },
      { key: "next_action", labelKey: "lp.field.nextAction", type: "text" },
      { key: "next_due_date", labelKey: "lp.field.nextDueDate", type: "date" },
      { key: "jurisdiction", labelKey: "lp.field.jurisdiction", type: "text" },
      { key: "lp_type", labelKey: "lp.field.type", type: "text" },
      { key: "contacts", labelKey: "lp.field.contacts", type: "textarea" },
      { key: "notes", labelKey: "labels.notes", type: "textarea" }
    ];

    const body = createEl("div", { class: "section" });

    body.appendChild(createEl("div", { class: "small muted" }, [
      `${t("labels.updatedBy")}: ${safeStr(lp.last_updated_by || "—")} · ${t("labels.updatedAt")}: ${formatDateShort(lp.last_updated_at || "") || "—"}`
    ]));

    body.appendChild(createEl("div", { class: "row" }, [
      createEl("div", { class: "card", style: "padding:12px;" }, [
        createEl("div", { class: "small muted" }, [t("lp.field.committedTicket")]),
        createEl("div", { style: "font-weight:760; font-size:18px; margin-top:6px;" }, [formatMoney(lp.committed_ticket)])
      ]),
      createEl("div", { class: "card", style: "padding:12px;" }, [
        createEl("div", { class: "small muted" }, [t("lp.field.callableTicket")]),
        createEl("div", { style: "font-weight:760; font-size:18px; margin-top:6px;" }, [formatMoney(lp.callable_ticket)])
      ])
    ]));

    body.appendChild(createEl("button", {
      class: `btn ${isEditor() ? "primary" : ""}`.trim(),
      disabled: !isEditor(),
      onClick: () => openLPEditModal(lp, fields)
    }, [t("labels.edit")]));

    return body;
  }

  function buildChecklistSection(lp) {
    const dlist = getDeliverablesForLP(lp.lp_id);
    const requiredSet = requiredDeliverablesForLP(lp);

    const requiredTotal = Array.from(requiredSet).length;
    const requiredDone = Array.from(requiredSet).filter(code => {
      const inst = dlist.find(d => safeStr(d.deliverable_code) === code);
      return inst && safeStr(inst.status).toLowerCase() === "done";
    }).length;

    const pct = requiredTotal === 0 ? 1 : (requiredDone / requiredTotal);

    const progress = createEl("div", { class: "section" }, [
      createEl("div", { class: "small muted" }, [
        `${t("labels.required")}: ${requiredDone}/${requiredTotal}`
      ]),
      createEl("div", { class: "progress" }, [
        createEl("div", { style: `width:${Math.round(pct * 100)}%` })
      ])
    ]);

    const list = createEl("div", { class: "checklist" });

    dlist.forEach(d => {
      const isReq = requiredSet.has(safeStr(d.deliverable_code));
      const status = safeStr(d.status).toLowerCase();
      const checked = status === "done";

      const item = createEl("div", { class: "check" }, [
        createEl("div", { class: "check-left" }, [
          createEl("input", {
            type: "checkbox",
            checked: checked ? "checked" : null,
            disabled: !isEditor(),
            "aria-label": safeStr(d.deliverable_name),
            onChange: async (e) => {
              const next = e.target.checked ? "Done" : "Open";
              await updateDeliverableStatus(lp, d, next);
            }
          }),
          createEl("div", { style: "min-width:0; flex:1;" }, [
            createEl("div", { class: "check-name" }, [safeStr(d.deliverable_name)]),
            createEl("div", { class: "check-meta" }, [
              createEl("span", { class: "badge" }, [t(`stage.name.${parseNum(d.certainty_stage)}`)]),
              createEl("span", { class: "badge" }, [isReq ? t("labels.required") : t("labels.optional")]),
              createEl("span", { class: "badge" }, [`${t("labels.due")}: ${formatDateShort(d.due_date) || "—"}`]),
              createEl("span", { class: "badge" }, [`${t("labels.owner")}: ${safeStr(d.owner || "—")}`])
            ])
          ])
        ]),
        createEl("div", {}, [
          createEl("span", { class: `chip ${status === "done" ? "ok" : ""}`.trim() }, [
            status === "done" ? t("labels.done") : t("labels.open")
          ])
        ])
      ]);

      list.appendChild(item);
    });

    const actions = createEl("div", { class: "row" }, [
      createEl("button", {
        class: "btn",
        disabled: !(isAdmin() && isEditor()),
        onClick: async () => {
          await syncDeliverablesForLP(lp);
        }
      }, [t("labels.syncDeliverables")])
    ]);

    return createEl("div", { class: "section" }, [progress, actions, list]);
  }

  function buildDocumentsSection(lp) {
    const docs = getDocsForLP(lp.lp_id);
    const list = createEl("div", { class: "section" });

    if (!docs.length) {
      list.appendChild(createEl("div", { class: "small muted" }, ["—"]));
    } else {
      docs.forEach(d => {
        const meta = [
          `${safeStr(d.category || "")}`,
          `${t("doc.field.version")}: ${safeStr(d.version || "")}`,
          `${t("labels.updated")}: ${formatDateShort(d.uploaded_at) || "—"}`
        ].filter(Boolean).join(" · ");

        list.appendChild(createEl("div", { class: "doc-card" }, [
          createEl("div", { style: "min-width:0; flex:1;" }, [
            createEl("div", { class: "doc-title" }, [safeStr(d.title || "")]),
            createEl("div", { class: "doc-meta" }, [meta])
          ]),
          createEl("div", { class: "doc-actions" }, [
            createEl("a", {
              class: "btn",
              href: safeStr(d.drive_url || "#"),
              target: "_blank",
              rel: "noopener noreferrer",
              "aria-label": safeStr(d.title || "")
            }, [t("labels.open")])
          ])
        ]));
      });
    }

    const addBtn = createEl("button", {
      class: `btn ${isEditor() ? "primary" : ""}`.trim(),
      disabled: !isEditor(),
      onClick: () => openAddDocModal(lp)
    }, [t("labels.addDocument")]);

    return createEl("div", { class: "section" }, [addBtn, list]);
  }

  function buildNotesSection(lp) {
    const body = createEl("div", { class: "section" }, [
      createEl("div", { class: "field" }, [
        createEl("label", {}, [t("labels.notes")]),
        createEl("textarea", {
          value: safeStr(lp.notes || ""),
          disabled: !isEditor(),
          onInput: (e) => { lp.notes = e.target.value; },
        })
      ]),
      createEl("button", {
        class: `btn ${isEditor() ? "primary" : ""}`.trim(),
        disabled: !isEditor(),
        onClick: async () => {
          const reason = await promptReason();
          if (!reason) return;
          await updateLP(lp, { notes: safeStr(lp.notes || ""), reason });
        }
      }, [t("labels.save")])
    ]);
    return body;
  }

  function buildLPTimelineSection(lp) {
    const dlist = getDeliverablesForLP(lp.lp_id);
    const events = [];

    for (const d of dlist) {
      const when = d.updated_at || d.due_date;
      if (!when) continue;
      events.push({
        when,
        title: safeStr(d.deliverable_name),
        meta: `${t("labels.status")}: ${safeStr(d.status)} · ${t("labels.due")}: ${formatDateShort(d.due_date) || "—"}`
      });
    }

    events.sort((a, b) => safeStr(b.when).localeCompare(safeStr(a.when)));

    const list = createEl("div", { class: "timeline" }, [
      ...events.slice(0, 10).map(ev => createEl("div", { class: "titem" }, [
        createEl("div", { class: "tdate" }, [formatDateShort(ev.when)]),
        createEl("div", { class: "tbody" }, [
          createEl("div", { class: "tname" }, [ev.title]),
          createEl("div", { class: "tmeta" }, [ev.meta])
        ])
      ]))
    ]);

    return list;
  }

  function pageLPDetail(lpId) {
    const lp = getLPById(lpId);
    if (!lp) {
      return createEl("div", { class: "card", style: "padding:16px;" }, [
        createEl("div", { class: "muted" }, ["—"])
      ]);
    }

    const acc = createEl("div", { class: "acc" }, [
      accordionItem("labels.overview", buildLPOverviewSection(lp), true),
      accordionItem("labels.checklist", buildChecklistSection(lp), false),
      accordionItem("labels.documents", buildDocumentsSection(lp), false),
      accordionItem("labels.notes", buildNotesSection(lp), false),
      accordionItem("tabs.timeline", buildLPTimelineSection(lp), false)
    ]);

    return createEl("div", { class: "section" }, [
      createEl("div", { class: "hrow" }, [
        createEl("h1", { class: "h1" }, [safeStr(lp.lp_name)]),
        createEl("span", { class: "chip" }, [t(`stage.name.${parseNum(lp.certainty_stage)}`)])
      ]),
      acc
    ]);
  }

  function accordionItem(titleKey, bodyNode, openByDefault) {
    const body = createEl("div", { class: `acc-body ${openByDefault ? "open" : ""}`.trim() }, [bodyNode]);
    const head = createEl("button", {
      class: "acc-head",
      type: "button",
      "aria-expanded": openByDefault ? "true" : "false",
      onClick: (e) => {
        const isOpen = body.classList.toggle("open");
        e.currentTarget.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    }, [
      createEl("div", { class: "acc-title" }, [t(titleKey)]),
      createEl("span", { html: icon("chevron") })
    ]);

    return createEl("div", { class: "acc-item" }, [head, body]);
  }

  function pageRequirements() {
    const req = State.data.requirements || { activeVersion: null, items: [], versions: [] };
    const active = req.activeVersion;
    const items = req.items || [];
    const versions = req.versions || [];

    const header = createEl("div", { class: "hrow" }, [
      createEl("h1", { class: "h1" }, [t("tabs.requirements")]),
      createEl("div", { class: "small muted" }, [formatMoney(totalRequired())])
    ]);

    const versionRow = createEl("div", { class: "card", style: "padding:12px;" }, [
      createEl("div", { class: "hrow" }, [
        createEl("div", {}, [
          createEl("div", { class: "small muted" }, [t("labels.active")]),
          createEl("div", { style: "font-weight:720; margin-top:4px;" }, [safeStr(active?.version_name || "—")])
        ]),
        createEl("div", {}, [
          isAdmin() && versions.length ? createEl("button", {
            class: "btn",
            onClick: () => openSwitchReqVersionModal(versions, active)
          }, [t("labels.switchVersion")]) : null
        ])
      ])
    ]);

    const list = createEl("div", { class: "card" }, []);

    items.forEach(it => {
      list.appendChild(createEl("div", { class: "list-item" }, [
        createEl("div", { style: "flex:1; min-width:0;" }, [
          createEl("div", { class: "list-item-title" }, [safeStr(it.item_name)]),
          createEl("div", { class: "list-item-meta" }, [safeStr(it.notes || "")])
        ]),
        createEl("div", { style: "text-align:right; display:flex; gap:8px; align-items:center;" }, [
          createEl("div", { style: "font-weight:720; white-space:nowrap;" }, [formatMoney(it.amount)]),
          createEl("button", {
            class: "btn",
            disabled: !isEditor(),
            onClick: () => openReqItemModal(it, active)
          }, [t("labels.edit")])
        ])
      ]));
      list.appendChild(createEl("div", { class: "hr" }));
    });

    const add = createEl("button", {
      class: `btn ${isEditor() ? "primary" : ""}`.trim(),
      disabled: !isEditor(),
      onClick: () => openReqItemModal(null, active)
    }, [t("labels.addItem")]);

    const gapCard = createEl("div", { class: "card", style: "padding:12px;" }, [
      createEl("div", { class: "row" }, [
        createEl("div", {}, [
          createEl("div", { class: "small muted" }, [t("kpi.totalCallable")]),
          createEl("div", { style: "font-weight:760; font-size:18px; margin-top:6px;" }, [formatMoney(totalCallable())])
        ]),
        createEl("div", {}, [
          createEl("div", { class: "small muted" }, [t("kpi.gap")]),
          createEl("div", { style: "font-weight:760; font-size:18px; margin-top:6px;" }, [formatMoney(gap())])
        ])
      ])
    ]);

    return createEl("div", { class: "section" }, [
      header,
      versionRow,
      gapCard,
      add,
      list
    ]);
  }

  function pageTimeline() {
    const groups = {};
    for (const m of State.data.milestones) {
      const g = safeStr(m.group || "—");
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }

    const groupKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    const req = totalRequired();
    const callable = totalCallable();
    const alignmentRisk = (callable < req) && State.data.milestones.some(m => {
      const dd = daysFromNow(m.due_date);
      return dd <= CONFIG.DUE_WINDOW_DAYS && safeStr(m.status).toLowerCase() !== "done";
    });

    const header = createEl("div", { class: "hrow" }, [
      createEl("h1", { class: "h1" }, [t("tabs.timeline")]),
      createEl("div", { class: "small muted" }, [formatPct(readinessScore())])
    ]);

    const warning = alignmentRisk ? createEl("div", { class: "warn-banner" }, [
      createEl("div", { style: "display:flex; gap:10px; align-items:flex-start;" }, [
        createEl("div", { class: "dot warn", style: "margin-top:5px;" }),
        createEl("div", {}, [
          createEl("div", {}, [createEl("strong", {}, [t("labels.alignmentWarningTitle")])]),
          createEl("div", { class: "small muted", style: "margin-top:4px;" }, [t("labels.alignmentWarningBody")])
        ])
      ])
    ]) : null;

    const card = createEl("div", { class: "card timeline" }, [
      ...groupKeys.map(g => createEl("div", { class: "tgroup" }, [
        createEl("div", { class: "tgroup-title" }, [g]),
        ...groups[g].sort((a, b) => safeStr(a.due_date).localeCompare(safeStr(b.due_date))).map(m => {
          const status = safeStr(m.status);
          const statusOptions = [
            { v: "Not started", k: "milestone.status.notStarted" },
            { v: "In progress", k: "milestone.status.inProgress" },
            { v: "Done", k: "milestone.status.done" },
            { v: "Blocked", k: "milestone.status.blocked" }
          ];

          const statusSel = createEl("select", {
            class: "select",
            disabled: !isEditor(),
            "aria-label": t("milestone.field.status"),
            onChange: async (e) => {
              const newStatus = e.target.value;
              const reason = await promptReason();
              if (!reason) { e.target.value = status; return; }
              await updateMilestone(m, { status: newStatus, reason });
            }
          }, statusOptions.map(o => createEl("option", { value: o.v, selected: o.v === status ? "selected" : null }, [t(o.k)])));

          return createEl("div", { class: "titem" }, [
            createEl("div", { class: "tdate" }, [formatDateShort(m.due_date)]),
            createEl("div", { class: "tbody" }, [
              createEl("div", { class: "tname" }, [safeStr(m.name)]),
              createEl("div", { class: "tmeta" }, [
                `${t("labels.owner")}: ${safeStr(m.owner || "—")}`,
                `${t("labels.status")}: ${safeStr(status)}`
              ])
            ]),
            statusSel
          ]);
        })
      ]))
    ]);

    return createEl("div", { class: "section" }, [header, warning, card].filter(Boolean));
  }

  // =========================
  // FILTER SHEET
  // =========================
  function openLPFilters() {
    const owners = Array.from(new Set(State.data.lps.map(lp => safeStr(lp.owner)).filter(Boolean))).sort();
    const body = createEl("div", { class: "section" }, [
      fieldSelect("labels.owner", State.ui.lpFilters.owner, ["", ...owners], (v) => State.ui.lpFilters.owner = v),
      fieldSelect("lp.field.certaintyStage", State.ui.lpFilters.minCertaintyStage, ["", "0", "1", "2", "3", "4", "5", "6", "7", "8"], (v) => State.ui.lpFilters.minCertaintyStage = v),
      fieldSelect("lp.field.ragStatus", State.ui.lpFilters.rag, ["", "Green", "Amber", "Red"], (v) => State.ui.lpFilters.rag = v),
      fieldSelect("lp.field.cfiusFlag", State.ui.lpFilters.cfius, ["", "Green", "Amber", "Red"], (v) => State.ui.lpFilters.cfius = v),
      fieldSelect("labels.due", State.ui.lpFilters.dueWithinDays, ["", "7", "14", "30"], (v) => State.ui.lpFilters.dueWithinDays = v)
    ]);

    openSheet({
      titleKey: "labels.filters",
      bodyNode: body,
      actions: [
        { labelKey: "labels.clear", variant: "", onClick: (close) => { State.ui.lpFilters = { owner:"", rag:"", cfius:"", minCertaintyStage:"", dueWithinDays:"" }; close(); render(); } },
        { labelKey: "labels.apply", variant: "primary", onClick: (close) => { close(); render(); } }
      ]
    });
  }

  function fieldSelect(labelKey, value, options, onSet) {
    const sel = createEl("select", {
      class: "select",
      onChange: (e) => onSet(e.target.value)
    }, options.map(o => createEl("option", { value: o, selected: safeStr(o) === safeStr(value) ? "selected" : null }, [o ? o : "—"])));
    return createEl("div", { class: "field" }, [
      createEl("label", {}, [t(labelKey)]),
      sel
    ]);
  }

  // =========================
  // EDITORS
  // =========================
  async function promptReason() {
    return new Promise((resolve) => {
      const input = createEl("input", { value: "", placeholder: t("labels.reason"), "aria-label": t("labels.reason") });
      const body = createEl("div", { class: "section" }, [
        createEl("div", { class: "small muted" }, [t("labels.reason")]),
        input
      ]);

      openAdaptiveDialog({
        titleKey: "labels.reason",
        bodyNode: body,
        actions: [
          { labelKey: "labels.cancel", onClick: (close) => { close(); resolve(""); } },
          { labelKey: "labels.save", variant: "primary", onClick: (close) => { const v = safeStr(input.value).trim(); close(); resolve(v); } }
        ]
      });
    });
  }

  function openLPEditModal(lp, fields) {
    const isSensitiveKey = (k) => ["committed_ticket", "callable_ticket", "certainty_stage", "cfius_flag"].includes(k);

    const draft = { ...lp };
    const form = createEl("div", { class: "section" });

    fields.forEach(f => {
      if (f.readonly) return;
      const label = t(f.labelKey);

      let input;
      if (f.type === "textarea") {
        input = createEl("textarea", { value: safeStr(draft[f.key] || ""), onInput: (e) => { draft[f.key] = e.target.value; } });
      } else if (f.type === "select") {
        input = createEl("select", { class: "select", onChange: (e) => { draft[f.key] = e.target.value; } },
          (f.options || []).map(o => createEl("option", { value: o, selected: safeStr(o) === safeStr(draft[f.key]) ? "selected" : null }, [o]))
        );
      } else {
        input = createEl("input", {
          type: f.type === "date" ? "date" : (f.type === "number" ? "number" : "text"),
          value: f.type === "date" ? (formatDateShort(draft[f.key]) || "") : safeStr(draft[f.key] || ""),
          onInput: (e) => { draft[f.key] = e.target.value; }
        });
      }

      form.appendChild(createEl("div", { class: "field" }, [
        createEl("label", {}, [label]),
        input
      ]));
    });

    openAdaptiveDialog({
      titleKey: "labels.edit",
      bodyNode: form,
      actions: [
        { labelKey: "labels.cancel", onClick: (close) => close() },
        {
          labelKey: "labels.save",
          variant: "primary",
          onClick: async (close) => {
            // compute changes
            const changes = {};
            for (const f of fields) {
              if (f.readonly) continue;
              const before = safeStr(lp[f.key] ?? "");
              const after = safeStr(draft[f.key] ?? "");
              if (before !== after) changes[f.key] = draft[f.key];
            }
            if (!Object.keys(changes).length) { close(); return; }

            const needsReason = Object.keys(changes).some(isSensitiveKey);
            let reason = "";
            if (needsReason) {
              reason = await promptReason();
              if (!reason) return;
            }
            changes.reason = reason || "Edit";

            await updateLP(lp, changes);
            close();
          }
        }
      ]
    });
  }

  function openAddDocModal(lp) {
    const draft = { category: "", title: "", version: "", drive_url: "" };
    const form = createEl("div", { class: "section" }, [
      fieldText("doc.field.category", draft.category, (v) => draft.category = v),
      fieldText("doc.field.title", draft.title, (v) => draft.title = v),
      fieldText("doc.field.version", draft.version, (v) => draft.version = v),
      fieldText("doc.field.url", draft.drive_url, (v) => draft.drive_url = v)
    ]);

    openAdaptiveDialog({
      titleKey: "labels.addDocument",
      bodyNode: form,
      actions: [
        { labelKey: "labels.cancel", onClick: (close) => close() },
        {
          labelKey: "labels.save",
          variant: "primary",
          onClick: async (close) => {
            const reason = await promptReason();
            if (!reason) return;

            const payload = {
              lp_id: lp.lp_id,
              category: draft.category,
              title: draft.title,
              version: draft.version,
              drive_url: draft.drive_url,
              reason
            };

            // optimistic add
            const tempId = `tmp_${Math.random().toString(16).slice(2)}`;
            State.data.documents.unshift({
              doc_id: tempId,
              lp_id: lp.lp_id,
              category: draft.category,
              title: draft.title,
              version: draft.version,
              drive_url: draft.drive_url,
              status: "Active",
              uploaded_at: nowISO(),
              uploaded_by: State.user?.email || "demo"
            });
            render();

            if (!CONFIG.DEMO_MODE) {
              const res = await window.AppApi.addDocument(payload);
              if (!res.ok) {
                toast(res.error?.message || "Save failed");
                // rollback optimistic
                State.data.documents = State.data.documents.filter(d => d.doc_id !== tempId);
                render();
                return;
              }
              toast(t("labels.save"));
              await bootstrapAndRender();
            } else {
              toast(t("labels.save"));
            }
            close();
          }
        }
      ]
    });
  }

  function fieldText(labelKey, value, onSet) {
    const input = createEl("input", { value: safeStr(value || ""), onInput: (e) => onSet(e.target.value) });
    return createEl("div", { class: "field" }, [
      createEl("label", {}, [t(labelKey)]),
      input
    ]);
  }

  function openReqItemModal(item, activeVersion) {
    const isNew = !item;
    const draft = item ? { ...item } : {
      req_item_id: "",
      req_version_id: activeVersion?.req_version_id || "",
      item_name: "",
      amount: 0,
      notes: "",
      evidence_url: ""
    };

    const form = createEl("div", { class: "section" }, [
      fieldText("req.field.item", draft.item_name, (v) => draft.item_name = v),
      createEl("div", { class: "field" }, [
        createEl("label", {}, [t("req.field.amount")]),
        createEl("input", { type: "number", value: String(parseNum(draft.amount)), onInput: (e) => draft.amount = e.target.value })
      ]),
      createEl("div", { class: "field" }, [
        createEl("label", {}, [t("labels.notes")]),
        createEl("textarea", { value: safeStr(draft.notes || ""), onInput: (e) => draft.notes = e.target.value })
      ]),
      fieldText("req.field.evidence", draft.evidence_url, (v) => draft.evidence_url = v)
    ]);

    openAdaptiveDialog({
      titleKey: isNew ? "labels.addItem" : "labels.edit",
      bodyNode: form,
      actions: [
        { labelKey: "labels.cancel", onClick: (close) => close() },
        {
          labelKey: "labels.save",
          variant: "primary",
          onClick: async (close) => {
            const reason = await promptReason();
            if (!reason) return;

            // optimistic upsert
            if (isNew) {
              const tmp = `tmp_${Math.random().toString(16).slice(2)}`;
              State.data.requirements.items.push({
                req_item_id: tmp,
                req_version_id: draft.req_version_id,
                item_name: draft.item_name,
                amount: parseNum(draft.amount),
                notes: draft.notes,
                evidence_url: draft.evidence_url
              });
            } else {
              Object.assign(item, {
                item_name: draft.item_name,
                amount: parseNum(draft.amount),
                notes: draft.notes,
                evidence_url: draft.evidence_url
              });
            }
            render();

            if (!CONFIG.DEMO_MODE) {
              const res = await window.AppApi.upsertRequirementItem({
                req_item_id: isNew ? "" : draft.req_item_id,
                req_version_id: draft.req_version_id,
                item_name: draft.item_name,
                amount: parseNum(draft.amount),
                notes: draft.notes,
                evidence_url: draft.evidence_url,
                reason
              });
              if (!res.ok) {
                toast(res.error?.message || "Save failed");
                await bootstrapAndRender();
                return;
              }
              toast(t("labels.save"));
              await bootstrapAndRender();
            } else {
              toast(t("labels.save"));
            }
            close();
          }
        }
      ]
    });
  }

  function openSwitchReqVersionModal(versions, active) {
    const select = createEl("select", { class: "select" },
      versions.map(v => createEl("option", {
        value: v.req_version_id,
        selected: v.req_version_id === active?.req_version_id ? "selected" : null
      }, [safeStr(v.version_name)]))
    );

    const body = createEl("div", { class: "section" }, [
      createEl("div", { class: "field" }, [
        createEl("label", {}, [t("labels.switchVersion")]),
        select
      ])
    ]);

    openAdaptiveDialog({
      titleKey: "labels.switchVersion",
      bodyNode: body,
      actions: [
        { labelKey: "labels.cancel", onClick: (close) => close() },
        {
          labelKey: "labels.save",
          variant: "primary",
          onClick: async (close) => {
            const reason = await promptReason();
            if (!reason) return;

            const newId = select.value;
            if (!newId || newId === active?.req_version_id) { close(); return; }

            if (!CONFIG.DEMO_MODE) {
              const res = await window.AppApi.setActiveRequirementVersion({ req_version_id: newId, reason });
              if (!res.ok) {
                toast(res.error?.message || "Save failed");
                return;
              }
              toast(t("labels.save"));
              await bootstrapAndRender();
            } else {
              // demo: swap locally
              State.data.requirements.activeVersion = versions.find(v => v.req_version_id === newId) || active;
              toast(t("labels.save"));
              render();
            }
            close();
          }
        }
      ]
    });
  }

  // =========================
  // LABEL EDITOR (TEAM-SYNCED)
  // =========================
  function openLabelEditor() {
    if (!isAdmin()) return;

    Cache.labelsSnapshotBeforeEdit = {
      version: State.labels.version,
      map: { ...State.labels.map }
    };

    const groups = [
      {
        title: "app.title",
        keys: ["app.title", "tabs.dashboard", "tabs.lps", "tabs.timeline", "tabs.requirements"]
      },
      {
        title: "kpi.totalRequired",
        keys: ["kpi.totalRequired", "kpi.totalCommitted", "kpi.totalCallable", "kpi.gap", "kpi.readiness"]
      },
      {
        title: "labels.save",
        keys: ["labels.save", "labels.cancel", "labels.edit", "labels.add", "labels.refresh", "labels.export", "labels.filters", "labels.apply", "labels.clear"]
      },
      {
        title: "lp.field.certaintyStage",
        keys: ["stage.name.0","stage.name.1","stage.name.2","stage.name.3","stage.name.4","stage.name.5","stage.name.6","stage.name.7","stage.name.8"]
      },
      {
        title: "labels.status",
        keys: ["status.green","status.amber","status.red"]
      }
    ];

    const container = createEl("div", { class: "section" }, [
      createEl("div", { class: "small muted" }, [t("labels.labelsEditorHint")])
    ]);

    groups.forEach(g => {
      const body = createEl("div", { class: "section" });
      g.keys.forEach(k => {
        const inp = createEl("input", {
          value: safeStr(State.labels.map[k] ?? DEFAULT_LABELS[k] ?? ""),
          onInput: (e) => {
            State.labels.map[k] = e.target.value;
            render(); // live preview
          }
        });
        body.appendChild(createEl("div", { class: "field" }, [
          createEl("label", {}, [`${k}`]),
          inp,
          createEl("div", { class: "small muted" }, [
            createEl("button", {
              class: "btn",
              type: "button",
              onClick: () => {
                State.labels.map[k] = safeStr(DEFAULT_LABELS[k] ?? "");
                inp.value = State.labels.map[k];
                render();
              }
            }, [t("labels.clear")])
          ])
        ]));
      });

      container.appendChild(accordionItem(g.title, body, false));
    });

    openAdaptiveDialog({
      titleKey: "labels.labelsEditor",
      bodyNode: container,
      actions: [
        {
          labelKey: "labels.cancel",
          onClick: (close) => {
            // rollback
            if (Cache.labelsSnapshotBeforeEdit) {
              State.labels.version = Cache.labelsSnapshotBeforeEdit.version;
              State.labels.map = { ...Cache.labelsSnapshotBeforeEdit.map };
              cacheLabelsToStorage();
              render();
            }
            close();
          }
        },
        {
          labelKey: "labels.save",
          variant: "primary",
          onClick: async (close) => {
            const baseVersion = Cache.labelsSnapshotBeforeEdit ? Cache.labelsSnapshotBeforeEdit.version : State.labels.version;
            const beforeMap = Cache.labelsSnapshotBeforeEdit ? Cache.labelsSnapshotBeforeEdit.map : { ...DEFAULT_LABELS };
            const updates = [];

            // Collect keys that changed versus snapshot
            Object.keys(State.labels.map).forEach(k => {
              const before = safeStr(beforeMap[k] ?? DEFAULT_LABELS[k] ?? "");
              const after = safeStr(State.labels.map[k] ?? "");
              if (before !== after) updates.push({ key: k, value: after });
            });

            if (!updates.length) { close(); return; }
            const reason = await promptReason();
            if (!reason) return;

            if (!CONFIG.DEMO_MODE) {
              const res = await window.AppApi.updateLabels({ baseVersion, updates, reason });
              if (!res.ok) {
                if (res.status === 409) {
                  toast(t("labels.conflictBody"));
                  return;
                }
                toast(res.error?.message || "Save failed");
                return;
              }
              toast(`${t("labels.save")}`);
              await bootstrapAndRender();
              close();
              return;
            }

            // DEMO: bump version locally
            State.labels.version = baseVersion + 1;
            cacheLabelsToStorage();
            toast(`${t("labels.save")}`);
            close();
          }
        }
      ]
    });
  }

  // =========================
  // DATA MUTATIONS (optimistic)
  // =========================
  async function updateDeliverableStatus(lp, d, nextStatus) {
    const prev = d.status;
    d.status = nextStatus;
    d.updated_at = nowISO();
    render();

    const reason = await promptReason();
    if (!reason) {
      d.status = prev;
      render();
      return;
    }

    if (CONFIG.DEMO_MODE) {
      toast(t("labels.save"));
      return;
    }

    const res = await window.AppApi.updateDeliverable({
      lp_deliverable_id: d.lp_deliverable_id || "",
      lp_id: d.lp_id,
      deliverable_code: d.deliverable_code,
      status: nextStatus,
      reason
    });

    if (!res.ok) {
      if (res.status === 409) {
        toast("Data outdated—refreshing");
        await bootstrapAndRender();
        return;
      }
      d.status = prev;
      render();
      toast(res.error?.message || "Save failed");
      return;
    }

    toast(t("labels.save"));
    await bootstrapAndRender();
  }

  async function updateLP(lp, changes) {
    const prev = { ...lp };
    Object.assign(lp, changes);
    lp.last_updated_at = nowISO();
    lp.last_updated_by = State.user?.email || "demo";
    render();

    if (CONFIG.DEMO_MODE) { toast(t("labels.save")); return; }

    const res = await window.AppApi.updateLP({ lp_id: lp.lp_id, ...changes });
    if (!res.ok) {
      if (res.status === 409) {
        toast("Data outdated—refreshing");
        await bootstrapAndRender();
        return;
      }
      Object.assign(lp, prev);
      render();
      toast(res.error?.message || "Save failed");
      return;
    }
    toast(t("labels.save"));
    await bootstrapAndRender();
  }

  async function updateMilestone(m, changes) {
    const prev = { ...m };
    Object.assign(m, changes);
    render();

    if (CONFIG.DEMO_MODE) { toast(t("labels.save")); return; }

    const res = await window.AppApi.updateMilestone({ milestone_id: m.milestone_id, ...changes });
    if (!res.ok) {
      if (res.status === 409) {
        toast("Data outdated—refreshing");
        await bootstrapAndRender();
        return;
      }
      Object.assign(m, prev);
      render();
      toast(res.error?.message || "Save failed");
      return;
    }
    toast(t("labels.save"));
    await bootstrapAndRender();
  }

  async function syncDeliverablesForLP(lp) {
    if (!isAdmin()) return;

    const stage = parseNum(lp.certainty_stage);
    const templates = State.data.deliverableTemplates.filter(tpl => parseNum(tpl.certainty_stage) <= stage);

    const existing = new Set(getDeliverablesForLP(lp.lp_id).map(d => safeStr(d.deliverable_code)));
    const toAdd = templates.filter(tpl => !existing.has(safeStr(tpl.deliverable_code)));

    if (!toAdd.length) {
      toast(t("labels.done"));
      return;
    }

    const reason = await promptReason();
    if (!reason) return;

    // optimistic add
    const created = [];
    toAdd.forEach(tpl => {
      const tmpId = `tmp_${Math.random().toString(16).slice(2)}`;
      const due = new Date();
      due.setDate(due.getDate() + parseNum(tpl.default_due_offset_days || 0));

      const row = {
        lp_deliverable_id: tmpId,
        lp_id: lp.lp_id,
        deliverable_code: tpl.deliverable_code,
        deliverable_name: tpl.deliverable_name,
        certainty_stage: tpl.certainty_stage,
        status: "Open",
        owner: State.user?.email || "admin",
        due_date: due.toISOString(),
        evidence_doc_ids: "",
        notes: "",
        updated_at: nowISO(),
        updated_by: State.user?.email || "admin"
      };
      State.data.lpDeliverables.push(row);
      created.push(tmpId);
    });
    render();

    if (CONFIG.DEMO_MODE) {
      toast(t("labels.save"));
      return;
    }

    // backend upserts; send one-by-one for simplicity
    for (const tpl of toAdd) {
      const due = new Date();
      due.setDate(due.getDate() + parseNum(tpl.default_due_offset_days || 0));
      const res = await window.AppApi.updateDeliverable({
        lp_deliverable_id: "",
        lp_id: lp.lp_id,
        deliverable_code: tpl.deliverable_code,
        deliverable_name: tpl.deliverable_name,
        certainty_stage: tpl.certainty_stage,
        status: "Open",
        due_date: due.toISOString(),
        owner: State.user?.email || "",
        reason
      });
      if (!res.ok) {
        toast(res.error?.message || "Save failed");
        await bootstrapAndRender();
        return;
      }
    }

    toast(t("labels.save"));
    await bootstrapAndRender();
  }

  // =========================
  // PRINT VIEW
  // =========================
  function exportPrintView() {
    if (!CONFIG.FEATURES.PRINT_VIEW) return;

    const req = totalRequired();
    const callable = totalCallable();
    const committed = totalCommitted();
    const g = gap();
    const readiness = readinessScore();

    const due = [...dueSoonDeliverables(), ...dueSoonMilestones()].sort((a, b) => safeStr(a.due).localeCompare(safeStr(b.due)));
    const top = State.data.lps
      .slice()
      .sort((a, b) => parseNum(b.committed_ticket) - parseNum(a.committed_ticket))
      .slice(0, 10);

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) { toast(t("labels.warning")); return; }

    const esc = (s) => safeStr(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    const rowsTop = top.map(lp => `
      <tr>
        <td>${esc(lp.lp_name)}</td>
        <td>${esc(t(`stage.name.${parseNum(lp.certainty_stage)}`))}</td>
        <td style="text-align:right;">${esc(formatMoney(lp.committed_ticket))}</td>
        <td style="text-align:right;">${esc(formatMoney(lp.callable_ticket))}</td>
        <td>${esc(safeStr(lp.cfius_flag))}</td>
        <td>${esc(safeStr(lp.rag_status))}</td>
      </tr>
    `).join("");

    const rowsDue = due.slice(0, 14).map(it => `
      <tr>
        <td>${esc(formatDateShort(it.due))}</td>
        <td>${esc(it.kind)}</td>
        <td>${esc(it.title)}</td>
        <td>${esc(it.sub)}</td>
      </tr>
    `).join("");

    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${esc(t("app.title"))}</title>
      <style>
        body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin:24px; color:#111827; }
        h1{ font-size:18px; margin:0 0 8px 0; }
        .meta{ color:#6b7280; font-size:12px; margin-bottom:16px; }
        .kpis{ display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
        .kpi{ border:1px solid #e6e8ee; border-radius:14px; padding:10px 12px; min-width:160px; }
        .kpi .l{ font-size:12px; color:#6b7280; }
        .kpi .v{ font-size:18px; font-weight:750; margin-top:6px; }
        table{ width:100%; border-collapse:collapse; margin-top:8px; }
        th,td{ border-bottom:1px solid #e6e8ee; padding:8px 6px; font-size:12px; vertical-align:top; }
        th{ text-align:left; color:#6b7280; font-weight:700; }
        .section{ margin-top:18px; }
        @media print { .noprint{ display:none; } }
      </style>
      </head><body>
        <div class="noprint" style="margin-bottom:10px;">
          <button onclick="window.print()">Print</button>
        </div>
        <h1>${esc(t("app.title"))}</h1>
        <div class="meta">${esc(formatDateShort(new Date().toISOString()))}</div>

        <div class="kpis">
          <div class="kpi"><div class="l">${esc(t("kpi.totalRequired"))}</div><div class="v">${esc(formatMoney(req))}</div></div>
          <div class="kpi"><div class="l">${esc(t("kpi.totalCommitted"))}</div><div class="v">${esc(formatMoney(committed))}</div></div>
          <div class="kpi"><div class="l">${esc(t("kpi.totalCallable"))}</div><div class="v">${esc(formatMoney(callable))}</div></div>
          <div class="kpi"><div class="l">${esc(t("kpi.gap"))}</div><div class="v">${esc(formatMoney(g))}</div></div>
          <div class="kpi"><div class="l">${esc(t("kpi.readiness"))}</div><div class="v">${esc(formatPct(readiness))}</div></div>
        </div>

        <div class="section">
          <h1>${esc(t("labels.next14Days"))}</h1>
          <table>
            <thead><tr><th>Due</th><th>Kind</th><th>Item</th><th>Context</th></tr></thead>
            <tbody>${rowsDue || "<tr><td colspan='4'>—</td></tr>"}</tbody>
          </table>
        </div>

        <div class="section">
          <h1>${esc(t("tabs.lps"))} (Top 10)</h1>
          <table>
            <thead><tr><th>Name</th><th>Stage</th><th style="text-align:right;">Committed</th><th style="text-align:right;">Callable</th><th>CFIUS</th><th>RAG</th></tr></thead>
            <tbody>${rowsTop || "<tr><td colspan='6'>—</td></tr>"}</tbody>
          </table>
        </div>

      </body></html>`);
    win.document.close();
  }

  // =========================
  // RENDER
  // =========================
  function render() {
    const app = $("#app");
    if (!app) return;

    if (!CONFIG.DEMO_MODE && !State.idToken) {
      showLogin();
      return;
    }

    const route = parseRoute();
    let content;

    if (route.root === "dashboard") content = pageDashboard();
    else if (route.root === "lps") content = pageLPs();
    else if (route.root === "lp") content = pageLPDetail(route.parts[1] || "");
    else if (route.root === "timeline") content = pageTimeline();
    else if (route.root === "requirements") content = pageRequirements();
    else content = pageDashboard();

    app.innerHTML = "";
    app.appendChild(buildShell(content));

    // update <title> from label system
    document.title = t("app.title");
  }

  // =========================
  // DEMO DATA
  // =========================
  function demoData() {
    const user = { email: "admin@demo.local", role: "admin" };

    const labels = {
      version: 13,
      map: {
        "app.title": "Cornucopia Fund Tracker",
        "kpi.gap": "Funding Gap",
        "labels.topRisks": "Critical Risks"
      }
    };

    const lps = [
      {
        lp_id: "LP001",
        lp_name: "Atlas Strategic Partners",
        lp_type: "Strategic",
        jurisdiction: "US",
        owner: "PENG",
        relationship_stage: 3,
        certainty_stage: 6,
        target_ticket: 40000000,
        indicated_ticket: 30000000,
        committed_ticket: 25000000,
        callable_ticket: 0,
        rag_status: "Amber",
        cfius_flag: "Amber",
        next_action: "Finalize reps letter terms",
        next_due_date: new Date(Date.now() + 6 * 86400000).toISOString(),
        contacts: "CIO / Legal",
        notes: "",
        last_updated_at: nowISO(),
        last_updated_by: "admin@demo.local"
      },
      {
        lp_id: "LP002",
        lp_name: "Boreal Capital (FO)",
        lp_type: "Family Office",
        jurisdiction: "SG",
        owner: "GP-A",
        relationship_stage: 2,
        certainty_stage: 4,
        target_ticket: 15000000,
        indicated_ticket: 12000000,
        committed_ticket: 8000000,
        callable_ticket: 0,
        rag_status: "Green",
        cfius_flag: "Green",
        next_action: "NDA pending",
        next_due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        contacts: "Principal",
        notes: "",
        last_updated_at: nowISO(),
        last_updated_by: "admin@demo.local"
      },
      {
        lp_id: "LP003",
        lp_name: "Crestview Institutional",
        lp_type: "Institution",
        jurisdiction: "UK",
        owner: "GP-B",
        relationship_stage: 4,
        certainty_stage: 7,
        target_ticket: 60000000,
        indicated_ticket: 60000000,
        committed_ticket: 50000000,
        callable_ticket: 50000000,
        rag_status: "Green",
        cfius_flag: "Green",
        next_action: "Escrow wiring readiness",
        next_due_date: new Date(Date.now() + 9 * 86400000).toISOString(),
        contacts: "Partner / Counsel",
        notes: "",
        last_updated_at: nowISO(),
        last_updated_by: "admin@demo.local"
      },
      {
        lp_id: "LP004",
        lp_name: "Dune Sovereign Mandate",
        lp_type: "Sovereign",
        jurisdiction: "ME",
        owner: "GP-C",
        relationship_stage: 3,
        certainty_stage: 5,
        target_ticket: 80000000,
        indicated_ticket: 50000000,
        committed_ticket: 20000000,
        callable_ticket: 0,
        rag_status: "Red",
        cfius_flag: "Red",
        next_action: "CFIUS screening call with counsel",
        next_due_date: new Date(Date.now() + 4 * 86400000).toISOString(),
        contacts: "Investment Director",
        notes: "",
        last_updated_at: nowISO(),
        last_updated_by: "admin@demo.local"
      },
      {
        lp_id: "LP005",
        lp_name: "Echelon Growth Fund",
        lp_type: "PE",
        jurisdiction: "US",
        owner: "GP-A",
        relationship_stage: 4,
        certainty_stage: 8,
        target_ticket: 30000000,
        indicated_ticket: 30000000,
        committed_ticket: 30000000,
        callable_ticket: 30000000,
        rag_status: "Green",
        cfius_flag: "Amber",
        next_action: "Final KYC confirmation",
        next_due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
        contacts: "Ops / Legal",
        notes: "",
        last_updated_at: nowISO(),
        last_updated_by: "admin@demo.local"
      }
    ];

    const deliverableTemplates = [
      { template_id: "T01", certainty_stage: 2, deliverable_code: "NDA", deliverable_name: "NDA executed", required_doc_categories: "NDA", default_owner_role: "GP", default_due_offset_days: 3, is_required: "Y" },
      { template_id: "T02", certainty_stage: 3, deliverable_code: "DDQ_SENT", deliverable_name: "DDQ sent", required_doc_categories: "DDQ", default_owner_role: "GP", default_due_offset_days: 5, is_required: "Y" },
      { template_id: "T03", certainty_stage: 4, deliverable_code: "LOI", deliverable_name: "Indicative commitment (LOI)", required_doc_categories: "LOI", default_owner_role: "GP", default_due_offset_days: 7, is_required: "Y" },
      { template_id: "T04", certainty_stage: 5, deliverable_code: "IC_APPROVAL", deliverable_name: "IC approval evidence", required_doc_categories: "IC", default_owner_role: "GP", default_due_offset_days: 9, is_required: "Y" },
      { template_id: "T05", certainty_stage: 6, deliverable_code: "DOCS_NEAR_FINAL", deliverable_name: "Docs substantially agreed", required_doc_categories: "LPA,SideLetter", default_owner_role: "Legal", default_due_offset_days: 12, is_required: "Y" },
      { template_id: "T06", certainty_stage: 6, deliverable_code: "REP_LETTER", deliverable_name: "Representation letter", required_doc_categories: "Reps", default_owner_role: "Legal", default_due_offset_days: 12, is_required: "Y" },
      { template_id: "T07", certainty_stage: 7, deliverable_code: "KYC", deliverable_name: "KYC/AML complete", required_doc_categories: "KYC", default_owner_role: "Ops", default_due_offset_days: 14, is_required: "Y" },
      { template_id: "T08", certainty_stage: 7, deliverable_code: "ESCROW_READY", deliverable_name: "Escrow/bank readiness", required_doc_categories: "Bank", default_owner_role: "Ops", default_due_offset_days: 14, is_required: "Y" },
      { template_id: "T09", certainty_stage: 8, deliverable_code: "EXECUTED", deliverable_name: "Executed & callable", required_doc_categories: "Executed", default_owner_role: "GP", default_due_offset_days: 16, is_required: "Y" },
      { template_id: "T10", certainty_stage: 4, deliverable_code: "PIPELINE_CALL", deliverable_name: "Follow-up call completed", required_doc_categories: "", default_owner_role: "GP", default_due_offset_days: 6, is_required: "N" },
      { template_id: "T11", certainty_stage: 5, deliverable_code: "SIDELETTER_DRAFT", deliverable_name: "Side letter draft", required_doc_categories: "SideLetter", default_owner_role: "Legal", default_due_offset_days: 10, is_required: "N" },
      { template_id: "T12", certainty_stage: 5, deliverable_code: "CFIUS_SCREEN", deliverable_name: "CFIUS screening note", required_doc_categories: "CFIUS", default_owner_role: "Counsel", default_due_offset_days: 8, is_required: "Y" }
    ];

    function mkDel(lp_id, code, name, stage, status, offsetDays, owner) {
      return {
        lp_deliverable_id: `${lp_id}_${code}`,
        lp_id,
        deliverable_code: code,
        deliverable_name: name,
        certainty_stage: stage,
        status,
        owner,
        due_date: new Date(Date.now() + offsetDays * 86400000).toISOString(),
        updated_at: nowISO(),
        updated_by: "admin@demo.local",
        evidence_doc_ids: "",
        notes: ""
      };
    }

    const lpDeliverables = [
      mkDel("LP001","NDA","NDA executed",2,"Done",-20,"PENG"),
      mkDel("LP001","DDQ_SENT","DDQ sent",3,"Done",-10,"PENG"),
      mkDel("LP001","LOI","Indicative commitment (LOI)",4,"Done",-6,"PENG"),
      mkDel("LP001","IC_APPROVAL","IC approval evidence",5,"Open",5,"PENG"),
      mkDel("LP001","REP_LETTER","Representation letter",6,"Open",6,"Legal"),

      mkDel("LP002","NDA","NDA executed",2,"Open",3,"GP-A"),
      mkDel("LP002","DDQ_SENT","DDQ sent",3,"Open",8,"GP-A"),

      mkDel("LP003","NDA","NDA executed",2,"Done",-30,"GP-B"),
      mkDel("LP003","LOI","Indicative commitment (LOI)",4,"Done",-12,"GP-B"),
      mkDel("LP003","IC_APPROVAL","IC approval evidence",5,"Done",-9,"GP-B"),
      mkDel("LP003","KYC","KYC/AML complete",7,"Done",-1,"Ops"),
      mkDel("LP003","ESCROW_READY","Escrow/bank readiness",7,"Open",9,"Ops"),

      mkDel("LP004","CFIUS_SCREEN","CFIUS screening note",5,"Open",4,"Counsel"),
      mkDel("LP004","LOI","Indicative commitment (LOI)",4,"Open",10,"GP-C"),

      mkDel("LP005","EXECUTED","Executed & callable",8,"Done",-2,"GP-A")
    ];

    const documents = [
      { doc_id:"D1", lp_id:"LP001", category:"NDA", title:"NDA - Atlas", version:"v1", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" },
      { doc_id:"D2", lp_id:"LP001", category:"LOI", title:"LOI - Atlas", version:"v2", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" },
      { doc_id:"D3", lp_id:"LP003", category:"KYC", title:"KYC Pack - Crestview", version:"v1", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" },
      { doc_id:"D4", lp_id:"LP004", category:"CFIUS", title:"CFIUS Screen Note - Dune", version:"v1", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" },
      { doc_id:"D5", lp_id:"LP005", category:"Executed", title:"Executed Subscription - Echelon", version:"v1", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" },
      { doc_id:"D6", lp_id:"LP003", category:"Bank", title:"Escrow Readiness - Crestview", version:"v1", drive_url:"https://drive.google.com/", status:"Active", uploaded_at: nowISO(), uploaded_by:"admin@demo.local" }
    ];

    const requirements = {
      versions: [
        { req_version_id:"R1", version_name:"Base Case", is_active:"Y", created_at: nowISO(), created_by:"admin@demo.local", notes:"" },
        { req_version_id:"R2", version_name:"Upside Buffer", is_active:"N", created_at: nowISO(), created_by:"admin@demo.local", notes:"" }
      ],
      activeVersion: { req_version_id:"R1", version_name:"Base Case", is_active:"Y" },
      items: [
        { req_item_id:"RI1", req_version_id:"R1", item_name:"Equity Purchase Price", amount: 170000000, notes:"Offer price scenario", evidence_url:"" },
        { req_item_id:"RI2", req_version_id:"R1", item_name:"Transaction Costs", amount: 7000000, notes:"Legal/FA/Panel", evidence_url:"" },
        { req_item_id:"RI3", req_version_id:"R1", item_name:"Change-of-control payoff", amount: 28000000, notes:"Facilities payoff estimate", evidence_url:"" },
        { req_item_id:"RI4", req_version_id:"R1", item_name:"Working Capital Buffer", amount: 12000000, notes:"90-day buffer", evidence_url:"" },
        { req_item_id:"RI5", req_version_id:"R1", item_name:"Contingency", amount: 6000000, notes:"Execution risk buffer", evidence_url:"" },
        { req_item_id:"RI6", req_version_id:"R1", item_name:"Regulatory & Counsel", amount: 2500000, notes:"CFIUS/FDI/antitrust", evidence_url:"" }
      ]
    };

    const milestones = [
      { milestone_id:"M1", name:"Confirm 28-day timetable and data room access", group:"Week 1", due_date:new Date(Date.now()+2*86400000).toISOString(), owner:"PMO", status:"In progress", notes:"", linked_doc_ids:"" },
      { milestone_id:"M2", name:"LP confirmatory diligence kickoff", group:"Week 1", due_date:new Date(Date.now()+4*86400000).toISOString(), owner:"FinCom", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M3", name:"Counsel-to-counsel regulatory alignment call", group:"Week 2", due_date:new Date(Date.now()+8*86400000).toISOString(), owner:"Counsel", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M4", name:"Draft 2.7 announcement package readiness", group:"Week 2", due_date:new Date(Date.now()+10*86400000).toISOString(), owner:"UK FA", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M5", name:"Representation letters agreed", group:"Week 3", due_date:new Date(Date.now()+15*86400000).toISOString(), owner:"Legal", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M6", name:"UK bank escrow mechanics confirmed", group:"Week 3", due_date:new Date(Date.now()+16*86400000).toISOString(), owner:"Ops", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M7", name:"Funding confirmation complete", group:"Week 4", due_date:new Date(Date.now()+21*86400000).toISOString(), owner:"FinCom", status:"Not started", notes:"", linked_doc_ids:"" },
      { milestone_id:"M8", name:"Rule 2.7 announcement decision gate", group:"Week 4", due_date:new Date(Date.now()+24*86400000).toISOString(), owner:"CEO", status:"Not started", notes:"", linked_doc_ids:"" }
    ];

    return {
      user,
      labels,
      data: {
        lps,
        deliverableTemplates,
        lpDeliverables,
        documents,
        requirements,
        milestones,
        audit: { enabled: true }
      }
    };
  }

  // =========================
  // INIT
  // =========================
  function init() {
    loadFromStorage();

    window.addEventListener("hashchange", () => setRoute(location.hash || CONFIG.ROUTE_DEFAULT));
    window.addEventListener("resize", () => render());

    if (!location.hash) location.hash = CONFIG.ROUTE_DEFAULT;

    if (CONFIG.DEMO_MODE) {
      bootstrapAndRender();
      return;
    }

    if (!CONFIG.API_BASE) {
      toast(t("auth.needApiBase"));
      showLogin();
      return;
    }

    if (!State.idToken) {
      showLogin();
      return;
    }

    bootstrapAndRender();
  }

  init();
})();
