(function () {
  "use strict";

  const STORAGE = {
    theme: "anomaly-atlas-theme-v1",
    userPapers: "anomaly-atlas-user-papers-v1",
    overrides: "anomaly-atlas-overrides-v1",
    hidden: "anomaly-atlas-hidden-v1",
    starred: "anomaly-atlas-starred-v1",
    notes: "anomaly-atlas-notes-v1",
    savedGaps: "anomaly-atlas-gaps-v1"
  };

  const TOPIC_LAYOUT = {
    foundations: { x: 190, y: 145, align: "left" },
    deep: { x: 625, y: 150, align: "right" },
    temporal: { x: 665, y: 390, align: "right" },
    graph: { x: 165, y: 405, align: "left" },
    vision: { x: 410, y: 82, align: "center" },
    trust: { x: 410, y: 478, align: "center" }
  };

  const ERAS = [
    { key: "classic", start: 2000, end: 2015 },
    { key: "growth", start: 2016, end: 2020 },
    { key: "transformer", start: 2021, end: 2023 },
    { key: "frontier", start: 2024, end: 2026 }
  ];

  const els = {
    themeToggle: document.getElementById("theme-toggle"),
    statPapers: document.getElementById("stat-papers"),
    statYears: document.getElementById("stat-years"),
    statRecent: document.getElementById("stat-recent"),
    lastUpdated: document.getElementById("last-updated"),
    topicMap: document.getElementById("topic-map"),
    topicMapWrap: document.getElementById("topic-map-wrap"),
    mapTooltip: document.getElementById("map-tooltip"),
    mapCountLabel: document.getElementById("map-count-label"),
    topicInspector: document.getElementById("topic-inspector"),
    clearTopic: document.getElementById("clear-topic"),
    timelineSvg: document.getElementById("timeline-svg"),
    timelineTooltip: document.getElementById("timeline-tooltip"),
    timelineSummary: document.getElementById("timeline-summary"),
    eraStrip: document.getElementById("era-strip"),
    topicFilterRow: document.getElementById("topic-filter-row"),
    librarySearch: document.getElementById("library-search"),
    eraFilter: document.getElementById("era-filter"),
    typeFilter: document.getElementById("type-filter"),
    sortFilter: document.getElementById("sort-filter"),
    starredFilter: document.getElementById("starred-filter"),
    libraryCount: document.getElementById("library-count"),
    activeFilterNote: document.getElementById("active-filter-note"),
    resetFilters: document.getElementById("reset-filters"),
    paperGrid: document.getElementById("paper-grid"),
    loadMore: document.getElementById("load-more"),
    gapGrid: document.getElementById("gap-grid"),
    importInput: document.getElementById("import-input"),
    dialog: document.getElementById("paper-dialog"),
    form: document.getElementById("paper-form"),
    formError: document.getElementById("paper-form-error"),
    paperId: document.getElementById("paper-id"),
    paperTitle: document.getElementById("paper-title"),
    paperTitleZh: document.getElementById("paper-title-zh"),
    paperAuthors: document.getElementById("paper-authors"),
    paperYear: document.getElementById("paper-year"),
    paperType: document.getElementById("paper-type"),
    paperVenue: document.getElementById("paper-venue"),
    paperTopic: document.getElementById("paper-topic"),
    paperTags: document.getElementById("paper-tags"),
    paperGap: document.getElementById("paper-gap"),
    paperDoi: document.getElementById("paper-doi"),
    paperUrl: document.getElementById("paper-url"),
    paperSummary: document.getElementById("paper-summary"),
    paperNote: document.getElementById("paper-note"),
    dialogKicker: document.getElementById("paper-dialog-kicker"),
    dialogTitle: document.getElementById("paper-dialog-title"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawer: document.getElementById("paper-drawer"),
    drawerContent: document.getElementById("drawer-content"),
    closeDrawer: document.getElementById("close-drawer"),
    toast: document.getElementById("toast"),
    backToTop: document.getElementById("back-to-top")
  };

  const ui = {
    search: "",
    topic: "all",
    era: "all",
    type: "all",
    sort: "curated",
    starredOnly: false,
    exactYear: null,
    visible: 12,
    selectedTopic: null,
    timelineTopic: "all",
    gapHorizon: "all",
    currentEditId: null,
    currentDrawerId: null
  };

  let allPapers = [];
  let searchTimer = null;
  let toastTimer = null;
  let storageWarningShown = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return deepCopy(fallback);
      return JSON.parse(raw);
    } catch (error) {
      return deepCopy(fallback);
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("浏览器阻止了本地保存；本次操作仍可在当前页面使用，请及时导出备份。", 5600);
      }
      return false;
    }
  }

  const store = {
    userPapers: readStorage(STORAGE.userPapers, []),
    overrides: readStorage(STORAGE.overrides, {}),
    hidden: readStorage(STORAGE.hidden, []),
    starred: readStorage(STORAGE.starred, []),
    notes: readStorage(STORAGE.notes, {}),
    savedGaps: readStorage(STORAGE.savedGaps, [])
  };

  ["userPapers", "hidden", "starred", "savedGaps"].forEach(function (key) {
    if (!Array.isArray(store[key])) store[key] = [];
  });
  if (!store.overrides || Array.isArray(store.overrides) || typeof store.overrides !== "object") store.overrides = {};
  if (!store.notes || Array.isArray(store.notes) || typeof store.notes !== "object") store.notes = {};

  function splitList(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item).trim(); }).filter(Boolean);
    }
    return String(value || "").split(/[;；,，]/).map(function (item) {
      return item.trim();
    }).filter(Boolean);
  }

  function normalizePaper(raw, index) {
    const year = Number(raw.year);
    const topic = TOPICS[raw.topic] ? raw.topic : "foundations";
    const types = ["方法", "综述", "基准", "数据集"];
    const generatedId = "imported-" + String(year || "unknown") + "-" + String(Date.now()) + "-" + String(index || 0);
    const paper = {
      id: String(raw.id || generatedId).replace(/[^\w.-]/g, "-"),
      title: String(raw.title || "Untitled paper").trim(),
      titleZh: String(raw.titleZh || raw.title_zh || "").trim(),
      authors: splitList(raw.authors || raw.author || []),
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      venue: String(raw.venue || raw.journal || "").trim(),
      type: types.includes(raw.type) ? raw.type : "方法",
      topic: topic,
      level: String(raw.level || "个人新增"),
      tags: splitList(raw.tags),
      gaps: splitList(raw.gaps),
      summary: String(raw.summary || raw.insight || "").trim(),
      lens: String(raw.lens || raw.question || "").trim(),
      url: String(raw.url || "").trim(),
      doi: String(raw.doi || "").trim(),
      source: raw.source || "user",
      _order: Number.isFinite(raw._order) ? raw._order : 10000 + Number(index || 0)
    };
    if (!paper.authors.length) paper.authors = ["作者信息待补充"];
    if (!paper.url && paper.doi) paper.url = "https://doi.org/" + paper.doi.replace(/^https?:\/\/doi\.org\//i, "");
    return paper;
  }

  function cleanPaperForStorage(paper) {
    const clean = deepCopy(paper);
    delete clean.source;
    delete clean._order;
    return clean;
  }

  function rebuildPapers() {
    const hidden = new Set(store.hidden);
    const overrides = store.overrides || {};
    const seed = PAPER_SEED.map(function (paper, index) {
      const merged = Object.assign({}, paper, overrides[paper.id] || {});
      return normalizePaper(Object.assign({}, merged, {
        id: paper.id,
        source: "seed",
        _order: index
      }), index);
    });
    const user = (Array.isArray(store.userPapers) ? store.userPapers : []).map(function (paper, index) {
      return normalizePaper(Object.assign({}, paper, {
        id: paper.id || "user-" + Date.now() + "-" + index,
        source: "user",
        _order: index
      }), index);
    });
    allPapers = user.concat(seed).filter(function (paper) {
      return !hidden.has(paper.id);
    });
  }

  function getPaper(id) {
    return allPapers.find(function (paper) { return paper.id === id; });
  }

  function topicInfo(key) {
    return TOPICS[key] || TOPICS.foundations;
  }

  function eraForYear(year) {
    if (year <= 2015) return "classic";
    if (year <= 2020) return "growth";
    if (year <= 2023) return "transformer";
    return "frontier";
  }

  function authorsLabel(paper, max) {
    const limit = max || 14;
    const names = paper.authors.map(function (author) {
      if (typeof author === "string") return author;
      if (author && typeof author === "object") return author.name || author.display_name || "";
      return "";
    }).filter(Boolean);
    const shortened = names.length > 3 && limit < 100
      ? names.slice(0, 3).join("; ") + " 等"
      : names.join("; ");
    return shortened || "作者信息待补充";
  }

  function formatDate(date) {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(date).replace(/\//g, "-");
  }

  function showToast(message, duration) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("visible");
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("visible");
    }, duration || 3000);
  }

  function updateStats() {
    const years = allPapers.map(function (paper) { return paper.year; }).filter(Number.isFinite);
    const minYear = years.length ? Math.min.apply(null, years) : 0;
    const maxYear = years.length ? Math.max.apply(null, years) : 0;
    els.statPapers.textContent = String(allPapers.length).padStart(2, "0");
    els.statYears.textContent = years.length ? String(maxYear - minYear + 1) : "0";
    els.statRecent.textContent = String(allPapers.filter(function (paper) {
      return paper.year >= 2023;
    }).length).padStart(2, "0");
    els.lastUpdated.textContent = SEED_VERSION.slice(0, 7).replace("-", ".");
  }

  function renderTopicFilters() {
    const entries = Object.entries(TOPICS);
    const allButton = [
      '<button class="chip ' + (ui.topic === "all" ? "active" : "") + '"',
      ' type="button" data-topic-filter="all">全部文献 · ' + allPapers.length + "</button>"
    ].join("");
    els.topicFilterRow.innerHTML = allButton + entries.map(function (entry) {
      const key = entry[0];
      const topic = entry[1];
      const count = allPapers.filter(function (paper) { return paper.topic === key; }).length;
      return [
        '<button class="chip ' + (ui.topic === key ? "active" : "") + '"',
        ' type="button" data-topic-filter="' + key + '"',
        ' style="--topic-color:' + topic.css + '">',
        escapeHtml(topic.name) + " · " + count,
        "</button>"
      ].join("");
    }).join("");
  }

  function mapLabelPosition(position, isVision, isTrust) {
    if (isVision) return { x: position.x, y: position.y - 34, anchor: "middle" };
    if (isTrust) return { x: position.x, y: position.y + 38, anchor: "middle" };
    if (position.align === "left") return { x: position.x - 33, y: position.y + 3, anchor: "end" };
    return { x: position.x + 33, y: position.y + 3, anchor: "start" };
  }

  function renderTopicMap() {
    const topics = Object.entries(TOPICS);
    const centerX = 410;
    const centerY = 280;
    const pieces = [
      "<title>异常检测六条研究路径的主题星图</title>",
      "<desc>中心为正常性建模问题，六个主题节点围绕中心分布，论文以可交互圆点展示；可用键盘或鼠标打开详情。</desc>",
      '<circle class="map-center-ring" cx="410" cy="280" r="120"></circle>',
      '<circle class="map-center-ring" cx="410" cy="280" r="205"></circle>'
    ];

    topics.forEach(function (entry) {
      const position = TOPIC_LAYOUT[entry[0]];
      pieces.push([
        '<path class="map-spoke" d="M', centerX, " ", centerY,
        " L", position.x, " ", position.y, '"></path>'
      ].join(""));
    });

    topics.forEach(function (entry) {
      const key = entry[0];
      const topic = entry[1];
      const position = TOPIC_LAYOUT[key];
      const papers = allPapers.filter(function (paper) { return paper.topic === key; });
      const selected = ui.topic === key;
      const dimmed = ui.topic !== "all" && !selected;
      const label = mapLabelPosition(position, key === "vision", key === "trust");
      const classes = "map-group map-topic-group" + (selected ? " selected" : "") + (dimmed ? " dimmed" : "");
      pieces.push([
        '<g class="' + classes + '" data-map-topic="' + key + '"',
        ' role="button" tabindex="0" style="--topic-color:' + topic.css + '"',
        ' aria-label="' + escapeHtml(topic.name + "，共 " + papers.length + " 篇文献") + '"',
        ' data-tooltip-title="' + escapeHtml(topic.name) + '"',
        ' data-tooltip-sub="' + escapeHtml(papers.length + " 篇论文 · 点击筛选") + '">'
      ].join(""));
      pieces.push('<circle class="map-topic-halo" cx="' + position.x + '" cy="' + position.y + '" r="37"></circle>');
      pieces.push('<circle class="map-topic-dot" cx="' + position.x + '" cy="' + position.y + '" r="18"></circle>');
      pieces.push('<text class="map-topic-count" x="' + position.x + '" y="' + (position.y + 2.5) + '" text-anchor="middle">' + papers.length + "</text>");
      pieces.push('<text class="map-topic-name" x="' + label.x + '" y="' + label.y + '" text-anchor="' + label.anchor + '">' + escapeHtml(topic.name) + "</text>");
      pieces.push('<text class="map-topic-en" x="' + label.x + '" y="' + (label.y + 11) + '" text-anchor="' + label.anchor + '">' + escapeHtml(topic.en) + "</text>");

      papers.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (paper, index) {
        const ring = index < 6 ? 52 : 67;
        const withinRing = index < 6 ? index : index - 6;
        const ringCount = index < 6 ? Math.min(6, papers.length) : Math.max(1, papers.length - 6);
        const angle = -Math.PI / 2 + (withinRing / ringCount) * Math.PI * 2;
        const x = position.x + Math.cos(angle) * ring;
        const y = position.y + Math.sin(angle) * ring;
        const radius = paper.year >= 2024 ? 4.4 : 3.6;
        const paperClass = "map-paper" + (paper.year >= 2024 ? " is-frontier" : "");
        pieces.push([
          '<circle class="map-paper-hit" cx="', x.toFixed(1), '" cy="', y.toFixed(1),
          '" r="10.5" data-map-paper="', paper.id, '"',
          ' role="button" tabindex="0"',
          ' aria-label="', escapeHtml(paper.title + "，" + paper.year), '"',
          ' data-tooltip-title="', escapeHtml(paper.title), '"',
          ' data-tooltip-sub="', escapeHtml(paper.year + " · " + paper.venue + " · 点击查看"), '"></circle>'
        ].join(""));
        pieces.push([
          '<circle class="' + paperClass + '" cx="', x.toFixed(1), '" cy="', y.toFixed(1),
          '" r="', radius, '" aria-hidden="true" style="pointer-events:none"></circle>'
        ].join(""));
      });
      pieces.push("</g>");
    });

    pieces.push('<circle class="map-center" cx="410" cy="280" r="32"></circle>');
    pieces.push('<text class="map-center-title" x="410" y="278" text-anchor="middle">异常检测</text>');
    pieces.push('<text class="map-center-sub" x="410" y="291" text-anchor="middle">NORMALITY MODELING</text>');
    els.topicMap.innerHTML = pieces.join("");
    els.mapCountLabel.textContent = ui.topic === "all"
      ? allPapers.length + " 篇文献"
      : topicInfo(ui.topic).name + " · " + allPapers.filter(function (paper) {
        return paper.topic === ui.topic;
      }).length + " 篇";
  }

  function renderTopicInspector() {
    const selected = ui.topic !== "all" ? TOPICS[ui.topic] : null;
    els.clearTopic.hidden = !selected;
    if (!selected) {
      const years = allPapers.map(function (paper) { return paper.year; });
      const recent = allPapers.filter(function (paper) { return paper.year >= 2023; }).length;
      const starterIds = ["chandola2009", "bergmann2019", "zhong2026future"];
      const starters = starterIds.map(getPaper).filter(Boolean);
      els.topicInspector.innerHTML = [
        '<p class="inspector-kicker">HOW TO READ</p>',
        '<h3 class="inspector-title">先看边界，<br>再看它如何被学习。</h3>',
        '<p class="inspector-copy">地图把方法放在知识位置上，而不是按年份排队。点击任一分支，查看代表论文并筛出该类文献。</p>',
        '<div class="inspector-counts">',
        '<div><strong>' + allPapers.length + '</strong><span>当前文献</span></div>',
        '<div><strong>' + (years.length ? Math.max.apply(null, years) - Math.min.apply(null, years) + 1 : 0) + '</strong><span>年跨度</span></div>',
        '<div><strong>06</strong><span>研究路径</span></div>',
        '<div><strong>' + recent + '</strong><span>2023 年后</span></div>',
        "</div>",
        '<p class="inspector-kicker">START HERE</p>',
        '<ul class="inspector-picks">' + starters.map(function (paper) {
          return [
            "<li><button type=\"button\" data-open-paper=\"", paper.id, "\">",
            "<em>", paper.year, "</em>",
            "<strong>", escapeHtml(paper.title), "</strong>",
            "</button></li>"
          ].join("");
        }).join("") + "</ul>"
      ].join("");
      return;
    }

    const papers = allPapers.filter(function (paper) { return paper.topic === ui.topic; });
    const recent = papers.filter(function (paper) { return paper.year >= 2023; }).length;
    const picks = papers.slice().sort(function (a, b) {
      const priority = { "经典": 0, "关键方法": 1, "近期": 2, "前沿": 3, "个人新增": 4 };
      const levelDiff = (priority[a.level] == null ? 5 : priority[a.level]) - (priority[b.level] == null ? 5 : priority[b.level]);
      return levelDiff || b.year - a.year;
    }).slice(0, 3);
    els.topicInspector.innerHTML = [
      '<p class="inspector-kicker">' + escapeHtml(selected.en) + "</p>",
      '<h3 class="inspector-title">' + escapeHtml(selected.name) + "</h3>",
      '<p class="inspector-copy">' + escapeHtml(selected.description) + "</p>",
      '<div class="inspector-counts">',
      '<div><strong>' + papers.length + '</strong><span>相关论文</span></div>',
      '<div><strong>' + recent + '</strong><span>近期研究</span></div>',
      "</div>",
      '<p class="inspector-kicker">REPRESENTATIVE</p>',
      '<ul class="inspector-picks">' + picks.map(function (paper) {
        return [
          "<li><button type=\"button\" data-open-paper=\"", paper.id, "\">",
          "<em>", paper.year, "</em>",
          "<strong>", escapeHtml(paper.title), "</strong>",
          "</button></li>"
        ].join("");
      }).join("") + "</ul>",
      '<button class="button button-primary inspector-action" type="button" data-filter-selected-topic>',
      "在文献库查看 " + papers.length + " 篇",
      "</button>"
    ].join("");
  }

  function renderEraStrip() {
    els.eraStrip.innerHTML = ERAS.map(function (era) {
      const note = ERA_NOTES[era.key];
      return [
        '<article class="era-card" style="--era-color:', note.color, '">',
        "<span>", escapeHtml(note.years), "</span>",
        "<h3>", escapeHtml(note.title), "</h3>",
        "<p>", escapeHtml(note.text), "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderTimeline() {
    const width = 1200;
    const height = 390;
    const xMin = 190;
    const xMax = 1160;
    const minYear = 2000;
    const maxYear = 2026;
    const laneStart = 112;
    const laneGap = 43;
    const topicEntries = Object.entries(TOPICS);
    const xScale = function (year) {
      return xMin + ((year - minYear) / (maxYear - minYear)) * (xMax - xMin);
    };
    const pieces = [
      "<title>异常检测研究文献时间线</title>",
      "<desc>按六条研究路径排列 2000 至 2026 年的核心论文。每个点代表一篇论文。</desc>"
    ];

    ERAS.forEach(function (era, index) {
      const startX = xScale(era.start);
      const endX = xScale(era.end);
      pieces.push('<rect class="' + (index % 2 ? "timeline-band-alt" : "timeline-band") + '" x="' + startX + '" y="52" width="' + (endX - startX) + '" height="300" rx="4"></rect>');
      pieces.push('<text class="timeline-era-label" x="' + (startX + 8) + '" y="68">' + escapeHtml(ERA_NOTES[era.key].years) + "</text>");
    });

    [2000, 2005, 2010, 2015, 2020, 2026].forEach(function (year) {
      const x = xScale(year);
      pieces.push('<line class="timeline-grid-line" x1="' + x + '" y1="86" x2="' + x + '" y2="350"></line>');
      pieces.push('<text class="timeline-tick" x="' + x + '" y="374" text-anchor="middle">' + year + "</text>");
          pieces.push([
            '<rect class="timeline-year-hit" data-timeline-year="', year, '"',
            ' x="', (x - 16), '" y="84" width="32" height="270" style="pointer-events:all"',
            ' role="button" tabindex="0" aria-label="查看 ', year, ' 年文献"',
            ' data-tooltip-title="', year, ' 年"',
            ' data-tooltip-sub="点击查看当年全部文献"></rect>'
          ].join(""));
    });
    pieces.push('<line class="timeline-axis" x1="' + xMin + '" y1="86" x2="' + xMax + '" y2="86"></line>');

    topicEntries.forEach(function (entry, topicIndex) {
      const key = entry[0];
      const topic = entry[1];
      const y = laneStart + topicIndex * laneGap;
      const dimmed = ui.timelineTopic !== "all" && ui.timelineTopic !== key;
      const papers = allPapers.filter(function (paper) { return paper.topic === key; }).sort(function (a, b) {
        return a.year - b.year || a.title.localeCompare(b.title);
      });
      pieces.push('<g class="timeline-svg-group' + (dimmed ? " dimmed" : "") + '" style="--topic-color:' + topic.css + '">');
      pieces.push('<line class="timeline-lane-line" x1="' + xMin + '" y1="' + y + '" x2="' + xMax + '" y2="' + y + '"></line>');
      pieces.push('<text class="timeline-lane-label" x="20" y="' + (y - 2) + '">' + escapeHtml(topic.name) + "</text>");
      pieces.push('<text class="timeline-lane-sub" x="20" y="' + (y + 8) + '">' + escapeHtml(topic.en) + "</text>");

      const byYear = {};
      papers.forEach(function (paper) {
        byYear[paper.year] = byYear[paper.year] || [];
        byYear[paper.year].push(paper);
      });
      Object.keys(byYear).forEach(function (yearKey) {
        const yearPapers = byYear[yearKey];
        yearPapers.forEach(function (paper, index) {
          const x = xScale(paper.year);
          const stack = yearPapers.length;
          const row = index;
          const yOffset = stack === 1 ? 0 : (row - (stack - 1) / 2) * Math.min(7, 24 / Math.max(1, stack - 1));
          const pointClass = "timeline-point" + (paper.year >= 2024 ? " is-frontier" : "");
          pieces.push([
            '<circle class="timeline-hit" data-timeline-paper="', paper.id, '"',
            ' cx="', x, '" cy="', (y + yOffset), '" r="10"',
            ' role="button" tabindex="0" aria-label="', escapeHtml(paper.title + "，查看详情"), '"',
            ' data-tooltip-title="', escapeHtml(paper.title), '"',
            ' data-tooltip-sub="', escapeHtml(paper.year + " · " + topic.name + " · 点击查看"), '"></circle>'
          ].join(""));
          pieces.push([
            '<circle class="' + pointClass + '" cx="', x, '" cy="', (y + yOffset), '" r="3.5"',
            ' aria-hidden="true" style="pointer-events:none"></circle>'
          ].join(""));
        });
      });
      pieces.push("</g>");
    });

    els.timelineSvg.setAttribute("viewBox", "0 0 " + width + " " + height);
    els.timelineSvg.innerHTML = pieces.join("");
    els.timelineSummary.textContent = "2000—2026 · " + allPapers.length + " 篇 · 6 条路径";
  }

  function filteredPapers() {
    const query = ui.search.trim().toLowerCase();
    let result = allPapers.filter(function (paper) {
      if (ui.topic !== "all" && paper.topic !== ui.topic) return false;
      if (ui.era !== "all" && eraForYear(paper.year) !== ui.era) return false;
      if (ui.exactYear != null && paper.year !== ui.exactYear) return false;
      if (ui.type !== "all" && paper.type !== ui.type) return false;
      if (ui.starredOnly && !store.starred.includes(paper.id)) return false;
      if (!query) return true;
      const searchable = [
        paper.title,
        paper.titleZh,
        paper.venue,
        paper.summary,
        paper.lens,
        paper.tags.join(" "),
        paper.authors.join(" "),
        store.notes[paper.id] || ""
      ].join(" ").toLowerCase();
      return searchable.includes(query);
    });

    if (ui.sort === "newest") {
      result.sort(function (a, b) { return b.year - a.year || a.title.localeCompare(b.title); });
    } else if (ui.sort === "oldest") {
      result.sort(function (a, b) { return a.year - b.year || a.title.localeCompare(b.title); });
    } else if (ui.sort === "title") {
      result.sort(function (a, b) { return a.title.localeCompare(b.title, "en"); });
    } else {
      result.sort(function (a, b) { return a._order - b._order; });
    }
    return result;
  }

  function levelClass(level) {
    if (level === "经典") return "classic";
    if (level === "前沿") return "frontier";
    return "key";
  }

  function renderPaperCard(paper) {
    const topic = topicInfo(paper.topic);
    const starred = store.starred.includes(paper.id);
    const note = store.notes[paper.id] || "";
    const authors = authorsLabel(paper, 10);
    const fullAuthors = authorsLabel(paper, 999);
    return [
      '<article class="paper-card" data-topic="', paper.topic, '">',
      '<div class="card-topline">',
      '<div class="card-tags">',
      '<span class="meta-pill">', paper.year, "</span>",
      '<span class="meta-pill">', escapeHtml(paper.type), "</span>",
      '<span class="meta-pill level-', levelClass(paper.level), '">', escapeHtml(paper.level || "论文"), "</span>",
      "</div>",
      '<button class="star-button', starred ? " is-starred" : "", '" type="button" data-star-paper="', paper.id, '" aria-pressed="', starred ? "true" : "false", '" aria-label="', starred ? "取消收藏" : "收藏论文", '">',
      starred ? "★" : "☆",
      "</button>",
      "</div>",
      "<h3><button class=\"title-button\" type=\"button\" data-open-paper=\"", paper.id, "\">", escapeHtml(paper.title), "</button></h3>",
      paper.titleZh ? '<p class="paper-title-zh">' + escapeHtml(paper.titleZh) + "</p>" : "",
      '<p class="paper-authors" title="', escapeHtml(fullAuthors), '">', escapeHtml(authors), "</p>",
      '<p class="paper-venue">', escapeHtml(paper.venue || "Venue not listed"), "</p>",
      '<p class="paper-summary">', escapeHtml(paper.summary || "尚未添加导读。打开详情记录这篇论文的关键洞见。"), "</p>",
      '<div class="paper-card-footer">',
      '<span class="topic-label">', escapeHtml(topic.name), "</span>",
      "<div>",
      note ? '<span class="note-mark">有批注</span>' : "",
      '<button class="card-open" type="button" data-open-paper="', paper.id, '">查看详情 ↗</button>',
      "</div></div></article>"
    ].join("");
  }

  function activeFilterDescription() {
    const bits = [];
    if (ui.topic !== "all") bits.push("主题：" + topicInfo(ui.topic).name);
    if (ui.era !== "all") bits.push("年代：" + document.querySelector('#era-filter option[value="' + ui.era + '"]').textContent);
    if (ui.exactYear != null) bits.push("年份：" + ui.exactYear);
    if (ui.type !== "all") bits.push("类型：" + ui.type);
    if (ui.starredOnly) bits.push("仅收藏");
    if (ui.search.trim()) bits.push("搜索：“" + ui.search.trim() + "”");
    return bits.join(" · ");
  }

  function renderLibrary() {
    const filtered = filteredPapers();
    const shown = filtered.slice(0, ui.visible);
    els.libraryCount.innerHTML = "找到 <strong>" + filtered.length + "</strong> 篇文献，当前显示 " + shown.length + " 篇";
    els.activeFilterNote.textContent = activeFilterDescription();
    els.loadMore.hidden = shown.length >= filtered.length;
    if (!filtered.length) {
      els.paperGrid.innerHTML = [
        '<div class="empty-state">',
        "<strong>没有匹配的文献</strong>",
        "<p>尝试清除筛选，或把新的阅读加入这座图谱。</p>",
        '<button class="button button-primary" type="button" data-action="add-paper">添加文献</button>',
        "</div>"
      ].join("");
      return;
    }
    els.paperGrid.innerHTML = shown.map(renderPaperCard).join("");
  }

  function renderGaps() {
    const visibleGaps = RESEARCH_GAPS.filter(function (gap) {
      return ui.gapHorizon === "all" || gap.horizon === ui.gapHorizon;
    });
    const horizonLabels = {
      near: "NEAR-TERM · 近期可做",
      mid: "MID-TERM · 中期突破",
      long: "LONG-TERM · 长期方向"
    };
    els.gapGrid.innerHTML = visibleGaps.map(function (gap, index) {
      const addedEvidence = allPapers.filter(function (paper) {
        return Array.isArray(paper.gaps) && paper.gaps.includes(gap.id);
      });
      const evidenceIds = Array.from(new Set(gap.evidence.concat(addedEvidence.map(function (paper) { return paper.id; }))));
      const evidence = evidenceIds.map(getPaper).filter(Boolean);
      const saved = store.savedGaps.includes(gap.id);
      return [
        '<article class="gap-card" data-index="', String(index + 1).padStart(2, "0"), '" id="gap-', gap.id, '">',
        '<div class="gap-topline">',
        '<span class="gap-horizon ', gap.horizon, '">', escapeHtml(horizonLabels[gap.horizon]), "</span>",
        '<span class="gap-evidence-count">', evidence.length, " 条关联证据</span>",
        "</div>",
        "<h3>", escapeHtml(gap.title), "</h3>",
        '<p class="gap-thesis">', escapeHtml(gap.thesis), "</p>",
        '<p class="gap-question"><span>QUESTION</span>', escapeHtml(gap.question), "</p>",
        '<div class="gap-evidence">', evidence.map(function (paper) {
          return '<button class="evidence-link" type="button" data-open-paper="' + paper.id + '" title="' + escapeHtml(paper.title) + '">' + escapeHtml(paper.year + " · " + paper.title) + "</button>";
        }).join(""), "</div>",
        '<details class="gap-details" id="gap-details-', gap.id, '">',
        "<summary>查看可执行实验</summary>",
        '<div class="gap-experiment"><strong>第一个实验</strong><p>', escapeHtml(gap.experiment), "</p></div>",
        '<div class="gap-experiment"><strong>风险</strong><p>', escapeHtml(gap.risk), "</p></div>",
        "</details>",
        '<div class="gap-footer">',
        '<span class="gap-metric">', escapeHtml(gap.metrics), "</span>",
        '<button class="gap-bookmark', saved ? " is-saved" : "", '" type="button" data-gap-bookmark="', gap.id, '" aria-pressed="', saved ? "true" : "false", '">',
        saved ? "已加入选题" : "加入选题",
        "</button></div></article>"
      ].join("");
    }).join("");
  }

  function renderAll() {
    updateStats();
    renderTopicFilters();
    renderTopicMap();
    renderTopicInspector();
    renderTimeline();
    renderLibrary();
    renderGaps();
  }

  function setTopic(topic, options) {
    const settings = options || {};
    ui.topic = topic === "all" || TOPICS[topic] ? topic : "all";
    ui.selectedTopic = ui.topic === "all" ? null : ui.topic;
    ui.visible = 12;
    renderTopicFilters();
    renderTopicMap();
    renderTopicInspector();
    renderLibrary();
    if (settings.scroll) {
      document.getElementById("library").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setYearFilter(year) {
    ui.exactYear = Number(year);
    ui.visible = 12;
    renderLibrary();
    document.getElementById("library").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("已筛选 " + year + " 年文献");
  }

  function resetFilters() {
    ui.search = "";
    ui.topic = "all";
    ui.era = "all";
    ui.type = "all";
    ui.sort = "curated";
    ui.starredOnly = false;
    ui.exactYear = null;
    ui.visible = 12;
    ui.selectedTopic = null;
    els.librarySearch.value = "";
    els.eraFilter.value = "all";
    els.typeFilter.value = "all";
    els.sortFilter.value = "curated";
    els.starredFilter.checked = false;
    renderTopicFilters();
    renderTopicMap();
    renderTopicInspector();
    renderLibrary();
  }

  function ensureFormOptions() {
    els.paperTopic.innerHTML = Object.entries(TOPICS).map(function (entry) {
      return '<option value="' + entry[0] + '">' + escapeHtml(entry[1].name) + "</option>";
    }).join("");
    const existing = Array.from(els.paperGap.options).map(function (option) { return option.value; });
    RESEARCH_GAPS.forEach(function (gap) {
      if (existing.includes(gap.id)) return;
      const option = document.createElement("option");
      option.value = gap.id;
      option.textContent = gap.title;
      els.paperGap.appendChild(option);
    });
  }

  function openPaperDialog(paper) {
    ui.currentEditId = paper ? paper.id : null;
    els.form.reset();
    els.formError.hidden = true;
    els.paperId.value = paper ? paper.id : "";
    els.dialogKicker.textContent = paper ? "EDIT PAPER" : "ADD PAPER";
    els.dialogTitle.textContent = paper ? "编辑文献信息" : "添加新文献";
    if (paper) {
      els.paperTitle.value = paper.title;
      els.paperTitleZh.value = paper.titleZh || "";
      els.paperAuthors.value = paper.authors.join("; ");
      els.paperYear.value = paper.year;
      els.paperType.value = paper.type;
      els.paperVenue.value = paper.venue || "";
      els.paperTopic.value = paper.topic;
      els.paperTags.value = paper.tags.join("; ");
      els.paperGap.value = Array.isArray(paper.gaps) && paper.gaps.length ? paper.gaps[0] : "";
      els.paperDoi.value = paper.doi || "";
      els.paperUrl.value = paper.url || "";
      els.paperSummary.value = paper.summary || "";
      els.paperNote.value = store.notes[paper.id] || "";
    } else {
      els.paperYear.value = new Date().getFullYear();
      els.paperTopic.value = ui.topic !== "all" ? ui.topic : "temporal";
    }
    document.body.classList.add("dialog-open");
    if (typeof els.dialog.showModal === "function") {
      els.dialog.showModal();
    } else {
      els.dialog.setAttribute("open", "");
    }
    window.setTimeout(function () { els.paperTitle.focus(); }, 60);
  }

  function closePaperDialog() {
    if (typeof els.dialog.close === "function") {
      els.dialog.close();
    } else {
      els.dialog.removeAttribute("open");
    }
    document.body.classList.remove("dialog-open");
  }

  function parseAuthors(value) {
    return String(value || "").split(/[;；]/).map(function (author) {
      return author.trim();
    }).filter(Boolean);
  }

  function savePaperForm(event) {
    event.preventDefault();
    els.formError.hidden = true;
    const title = els.paperTitle.value.trim();
    const authors = parseAuthors(els.paperAuthors.value);
    const year = Number(els.paperYear.value);
    const topic = els.paperTopic.value;
    const doi = els.paperDoi.value.trim().replace(/^https?:\/\/doi\.org\//i, "");
    let url = els.paperUrl.value.trim();

    if (!title || !authors.length || !Number.isInteger(year) || year < 1950 || year > 2030 || !TOPICS[topic]) {
      els.formError.textContent = "请填写题名、作者与有效年份，并选择一个研究主题。";
      els.formError.hidden = false;
      return;
    }
    if (!url && doi) url = "https://doi.org/" + doi;
    if (url) {
      try {
        new URL(url);
      } catch (error) {
        els.formError.textContent = "公开链接格式不正确，请使用完整的 https:// 地址。";
        els.formError.hidden = false;
        return;
      }
    }

    const existing = ui.currentEditId ? getPaper(ui.currentEditId) : null;
    const id = existing ? existing.id : "user-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const payload = {
      id: id,
      title: title,
      titleZh: els.paperTitleZh.value.trim(),
      authors: authors,
      year: year,
      venue: els.paperVenue.value.trim(),
      type: els.paperType.value,
      topic: topic,
      level: existing ? existing.level : "个人新增",
      tags: splitList(els.paperTags.value),
      gaps: els.paperGap.value ? [els.paperGap.value] : [],
      summary: els.paperSummary.value.trim(),
      lens: existing ? existing.lens : "",
      url: url,
      doi: doi
    };

    if (existing && existing.source === "seed") {
      store.overrides[id] = Object.assign(cleanPaperForStorage(existing), payload);
      writeStorage(STORAGE.overrides, store.overrides);
    } else {
      const index = store.userPapers.findIndex(function (paper) { return paper.id === id; });
      if (index >= 0) {
        store.userPapers[index] = payload;
      } else {
        store.userPapers.unshift(payload);
      }
      writeStorage(STORAGE.userPapers, store.userPapers);
    }

    const note = els.paperNote.value.trim();
    if (note) {
      store.notes[id] = note;
    } else {
      delete store.notes[id];
    }
    writeStorage(STORAGE.notes, store.notes);
    rebuildPapers();
    closePaperDialog();
    renderAll();
    showToast(existing ? "文献信息已更新" : "新文献已加入图谱");
  }

  function deletePaper(id) {
    const paper = getPaper(id);
    if (!paper) return;
    const action = paper.source === "seed" ? "从图谱中隐藏" : "永久删除";
    if (!window.confirm("确定要" + action + "《" + paper.title + "》吗？\n\n内置文献会保留在数据源中，可通过重新导入备份或清理浏览器数据恢复。")) return;

    if (paper.source === "seed") {
      if (!store.hidden.includes(id)) store.hidden.push(id);
      writeStorage(STORAGE.hidden, store.hidden);
    } else {
      store.userPapers = store.userPapers.filter(function (entry) { return entry.id !== id; });
      writeStorage(STORAGE.userPapers, store.userPapers);
    }
    store.starred = store.starred.filter(function (starredId) { return starredId !== id; });
    delete store.notes[id];
    writeStorage(STORAGE.starred, store.starred);
    writeStorage(STORAGE.notes, store.notes);
    closeDrawer();
    rebuildPapers();
    renderAll();
    showToast(paper.source === "seed" ? "内置文献已从当前图谱隐藏" : "文献已删除");
  }

  function toggleStar(id) {
    const index = store.starred.indexOf(id);
    if (index >= 0) {
      store.starred.splice(index, 1);
    } else {
      store.starred.push(id);
    }
    writeStorage(STORAGE.starred, store.starred);
    const isStarred = store.starred.includes(id);
    document.querySelectorAll("[data-star-paper]").forEach(function (button) {
      if (button.dataset.starPaper === id) {
        button.classList.toggle("is-starred", isStarred);
        button.setAttribute("aria-pressed", String(isStarred));
        button.setAttribute("aria-label", isStarred ? "取消收藏" : "收藏论文");
        button.textContent = isStarred ? "★" : "☆";
      }
    });
    if (ui.starredOnly) renderLibrary();
    showToast(isStarred ? "已加入收藏" : "已取消收藏");
  }

  function toggleGapBookmark(id) {
    const index = store.savedGaps.indexOf(id);
    if (index >= 0) {
      store.savedGaps.splice(index, 1);
    } else {
      store.savedGaps.push(id);
    }
    writeStorage(STORAGE.savedGaps, store.savedGaps);
    renderGaps();
    showToast(index >= 0 ? "已移出选题备忘" : "已加入选题备忘");
  }

  function saveDrawerNote() {
    if (!ui.currentDrawerId) return;
    const input = document.getElementById("drawer-note-input");
    if (!input) return;
    const value = input.value.trim();
    if (value) {
      store.notes[ui.currentDrawerId] = value;
    } else {
      delete store.notes[ui.currentDrawerId];
    }
    writeStorage(STORAGE.notes, store.notes);
    renderLibrary();
    showToast("研究批注已保存");
  }

  function buildBibtex(paper) {
    const authors = paper.authors.join(" and ");
    const firstFamily = (paper.authors[0] || "paper").split(/\s+/).slice(-1)[0].replace(/[^\w]/g, "");
    const key = (firstFamily || "paper") + paper.year + paper.title.split(/\s+/).slice(0, 2).join("").replace(/[^\w]/g, "");
    const fields = [
      "  title = {" + paper.title + "}",
      "  author = {" + authors + "}",
      "  year = {" + paper.year + "}"
    ];
    if (paper.venue) fields.push("  howpublished = {" + paper.venue + "}");
    if (paper.doi) fields.push("  doi = {" + paper.doi + "}");
    if (paper.url) fields.push("  url = {" + paper.url + "}");
    return "@misc{" + key + ",\n" + fields.join(",\n") + "\n}";
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("引用已复制");
    } catch (error) {
      showToast("复制失败，请在详情中手动选择引用信息");
    }
    textarea.remove();
  }

  function copyCitation(id) {
    const paper = getPaper(id);
    if (!paper) return;
    const bibtex = buildBibtex(paper);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(bibtex).then(function () {
        showToast("BibTeX 引用已复制");
      }).catch(function () {
        fallbackCopy(bibtex);
      });
    } else {
      fallbackCopy(bibtex);
    }
  }

  function relatedGaps(paper) {
    return RESEARCH_GAPS.filter(function (gap) {
      return gap.evidence.includes(paper.id) || (Array.isArray(paper.gaps) && paper.gaps.includes(gap.id));
    });
  }

  function renderDrawer(paper) {
    const topic = topicInfo(paper.topic);
    const starred = store.starred.includes(paper.id);
    const gaps = relatedGaps(paper);
    const sourceLabel = paper.doi || paper.url || "未提供";
    els.drawerContent.innerHTML = [
      '<div class="drawer-chips">',
      '<span class="meta-pill">', paper.year, "</span>",
      '<span class="meta-pill">', escapeHtml(paper.type), "</span>",
      '<span class="meta-pill level-', levelClass(paper.level), '">', escapeHtml(paper.level), "</span>",
      '<span class="meta-pill">', escapeHtml(topic.name), "</span>",
      "</div>",
      '<h2 id="drawer-title">', escapeHtml(paper.title), "</h2>",
      paper.titleZh ? '<p class="drawer-title-zh">' + escapeHtml(paper.titleZh) + "</p>" : "",
      '<dl class="drawer-meta">',
      "<dt>作者</dt><dd>", escapeHtml(authorsLabel(paper, 999)), "</dd>",
      "<dt>发表</dt><dd>", escapeHtml(paper.venue || "未注明"), "</dd>",
      "<dt>来源</dt><dd>", escapeHtml(sourceLabel), "</dd>",
      "</dl>",
      '<section class="drawer-section"><h3>导读</h3><p>', escapeHtml(paper.summary || "尚未添加中文导读。"), "</p></section>",
      paper.lens ? '<section class="drawer-section"><h3>研究启发</h3><p>' + escapeHtml(paper.lens) + "</p></section>" : "",
      gaps.length ? '<section class="drawer-section"><h3>相关研究空白</h3><p>' + gaps.map(function (gap) {
        return '<button class="text-button" type="button" data-gap-jump="' + gap.id + '">' + escapeHtml(gap.title) + "</button>";
      }).join("<br>") + "</p></section>" : "",
      '<div class="drawer-actions">',
      paper.url ? '<a class="button button-primary" href="' + escapeHtml(paper.url) + '" target="_blank" rel="noopener noreferrer">打开原文 ↗</a>' : "",
      '<button class="button button-secondary" type="button" data-edit-paper="', paper.id, '">编辑信息</button>',
      '<button class="button button-secondary" type="button" data-copy-citation="', paper.id, '">复制 BibTeX</button>',
      '<button class="button button-ghost" type="button" data-star-paper="', paper.id, '" aria-pressed="', starred ? "true" : "false", '">', starred ? "★ 已收藏" : "☆ 收藏", "</button>",
      '<button class="button button-ghost" type="button" data-delete-paper="', paper.id, '">', paper.source === "seed" ? "隐藏" : "删除", "</button>",
      "</div>",
      '<div class="drawer-note">',
      '<label for="drawer-note-input">我的研究批注</label>',
      '<textarea id="drawer-note-input" placeholder="记录局限、复现实验、可延伸的问题…">', escapeHtml(store.notes[paper.id] || ""), "</textarea>",
      '<div class="note-actions"><span>保存在当前浏览器，也可随 JSON 一起导出</span><button class="button button-primary" type="button" data-save-note>保存批注</button></div>',
      "</div>"
    ].join("");
  }

  function openDrawer(id) {
    const paper = getPaper(id);
    if (!paper) return;
    ui.currentDrawerId = id;
    renderDrawer(paper);
    els.drawerBackdrop.hidden = false;
    document.body.classList.add("drawer-open");
    window.setTimeout(function () { els.closeDrawer.focus(); }, 30);
  }

  function closeDrawer() {
    ui.currentDrawerId = null;
    els.drawerBackdrop.hidden = true;
    document.body.classList.remove("drawer-open");
  }

  function exportBackup() {
    const snapshot = {
      format: "anomaly-research-atlas",
      version: 1,
      seedVersion: SEED_VERSION,
      exportedAt: new Date().toISOString(),
      userPapers: store.userPapers,
      overrides: store.overrides,
      hidden: store.hidden,
      starred: store.starred,
      notes: store.notes,
      savedGaps: store.savedGaps
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anomaly-research-atlas-" + formatDate(new Date()) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("资料库备份已导出");
  }

  function mergeUnique(target, values) {
    const merged = new Set(target.concat(Array.isArray(values) ? values : []));
    return Array.from(merged);
  }

  function importSnapshot(raw) {
    let snapshot = raw;
    let importedPapers = [];
    if (Array.isArray(raw)) {
      importedPapers = raw;
      snapshot = {};
    } else if (!raw || typeof raw !== "object") {
      throw new Error("JSON 内容不是有效对象或文献数组。");
    } else if (raw.format && raw.format !== "anomaly-research-atlas") {
      throw new Error("无法识别该 JSON 的文件格式。");
    } else if (raw.title && raw.year) {
      importedPapers = [raw];
      snapshot = {};
    }

    if (snapshot.format === "anomaly-research-atlas" && Array.isArray(snapshot.userPapers)) {
      importedPapers = snapshot.userPapers;
    }

    const paperMap = new Map(store.userPapers.map(function (paper) { return [paper.id, paper]; }));
    importedPapers.forEach(function (paper, index) {
      const normalized = normalizePaper(Object.assign({}, paper, {
        source: "user",
        _order: index
      }), index);
      paperMap.set(normalized.id, cleanPaperForStorage(normalized));
    });
    store.userPapers = Array.from(paperMap.values());

    if (snapshot.overrides && typeof snapshot.overrides === "object") {
      store.overrides = Object.assign({}, store.overrides, snapshot.overrides);
    }
    store.hidden = mergeUnique(store.hidden, snapshot.hidden);
    store.starred = mergeUnique(store.starred, snapshot.starred);
    store.savedGaps = mergeUnique(store.savedGaps, snapshot.savedGaps);
    if (snapshot.notes && typeof snapshot.notes === "object") {
      store.notes = Object.assign({}, store.notes, snapshot.notes);
    }

    Object.keys(STORAGE).forEach(function (key) {
      if (key === "theme") return;
      writeStorage(STORAGE[key], store[key]);
    });
    rebuildPapers();
    renderAll();
    showToast("已导入 " + importedPapers.length + " 条个人文献，并合并本地状态");
  }

  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        importSnapshot(parsed);
      } catch (error) {
        window.alert("导入失败：" + error.message);
      }
      els.importInput.value = "";
    };
    reader.onerror = function () {
      window.alert("无法读取该文件。");
      els.importInput.value = "";
    };
    reader.readAsText(file, "utf-8");
  }

  function activateMapTarget(target) {
    if (!target) return;
    const paperId = target.dataset.mapPaper;
    const topic = target.dataset.mapTopic;
    if (paperId) openDrawer(paperId);
    else if (topic) setTopic(topic);
  }

  function activateTimelineTarget(target) {
    if (!target) return;
    const paperId = target.dataset.timelinePaper || target.dataset.paperId;
    const year = target.dataset.timelineYear;
    if (paperId) openDrawer(paperId);
    else if (year) setYearFilter(year);
  }

  function positionTooltip(tooltip, container, event, title, subtitle) {
    const rect = container.getBoundingClientRect();
    let clientX = event && Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2;
    let clientY = event && Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;
    const left = Math.max(80, Math.min(rect.width - 80, clientX - rect.left));
    const top = Math.max(40, clientY - rect.top - 6);
    tooltip.innerHTML = "<strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(subtitle) + "</span>";
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
    tooltip.classList.add("visible");
  }

  function bindSvgTooltips(svg, tooltip, container) {
    function targetFromEvent(event) {
      return event.target.closest("[data-tooltip-title]");
    }
    svg.addEventListener("pointermove", function (event) {
      const target = targetFromEvent(event);
      if (!target) return;
      positionTooltip(tooltip, container, event, target.dataset.tooltipTitle, target.dataset.tooltipSub);
    });
    svg.addEventListener("pointerover", function (event) {
      const target = targetFromEvent(event);
      if (!target) return;
      positionTooltip(tooltip, container, event, target.dataset.tooltipTitle, target.dataset.tooltipSub);
    });
    svg.addEventListener("pointerleave", function () {
      tooltip.classList.remove("visible");
    });
    svg.addEventListener("focusin", function (event) {
      const target = targetFromEvent(event);
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      positionTooltip(tooltip, container, {
        clientX: targetRect.left + targetRect.width / 2,
        clientY: targetRect.top
      }, target.dataset.tooltipTitle, target.dataset.tooltipSub);
    });
    svg.addEventListener("focusout", function () {
      tooltip.classList.remove("visible");
    });
  }

  function setupSectionObserver() {
    if (!("IntersectionObserver" in window)) return;
    const sectionIds = ["overview", "map", "timeline", "library", "gaps"];
    const links = Array.from(document.querySelectorAll('.primary-nav a, .section-tabs a'));
    const observer = new IntersectionObserver(function (entries) {
      const visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (!visible.length) return;
      visible.sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
      const id = visible[0].target.id;
      links.forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + id);
      });
    }, {
      rootMargin: "-28% 0px -58% 0px",
      threshold: [0, .12, .3, .6]
    });
    sectionIds.forEach(function (id) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function applyTheme(theme) {
    const finalTheme = theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", finalTheme);
    els.themeToggle.setAttribute("aria-pressed", String(finalTheme === "dark"));
    els.themeToggle.setAttribute("aria-label", finalTheme === "dark" ? "切换浅色模式" : "切换深色模式");
  }

  function setupEvents() {
    document.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.action === "add-paper") {
        openPaperDialog(null);
      } else if (button.dataset.action === "close-paper-dialog") {
        closePaperDialog();
      } else if (button.dataset.action === "export") {
        exportBackup();
      } else if (button.dataset.action === "import") {
        els.importInput.click();
      } else if (button.dataset.openPaper) {
        openDrawer(button.dataset.openPaper);
      } else if (button.dataset.starPaper) {
        toggleStar(button.dataset.starPaper);
      } else if (button.dataset.editPaper) {
        const paper = getPaper(button.dataset.editPaper);
        if (paper) openPaperDialog(paper);
      } else if (button.dataset.deletePaper) {
        deletePaper(button.dataset.deletePaper);
      } else if (button.dataset.copyCitation) {
        copyCitation(button.dataset.copyCitation);
      } else if (button.hasAttribute("data-save-note")) {
        saveDrawerNote();
      } else if (button.dataset.topicFilter) {
        setTopic(button.dataset.topicFilter);
      } else if (button.hasAttribute("data-filter-selected-topic")) {
        setTopic(ui.topic, { scroll: true });
      } else if (button.dataset.gapBookmark) {
        toggleGapBookmark(button.dataset.gapBookmark);
      } else if (button.dataset.gapJump) {
        ui.gapHorizon = "all";
        document.querySelectorAll("[data-gap-horizon]").forEach(function (chip) {
          chip.classList.toggle("active", chip.dataset.gapHorizon === "all");
        });
        renderGaps();
        const card = document.getElementById("gap-" + button.dataset.gapJump);
        const details = document.getElementById("gap-details-" + button.dataset.gapJump);
        if (details) details.open = true;
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        closeDrawer();
      }
    });

    els.themeToggle.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      writeStorage(STORAGE.theme, next);
    });

    els.librarySearch.addEventListener("input", function () {
      window.clearTimeout(searchTimer);
      ui.search = els.librarySearch.value;
      ui.visible = 12;
      searchTimer = window.setTimeout(renderLibrary, 110);
    });

    els.eraFilter.addEventListener("change", function () {
      ui.era = els.eraFilter.value;
      ui.exactYear = null;
      ui.visible = 12;
      renderLibrary();
    });
    els.typeFilter.addEventListener("change", function () {
      ui.type = els.typeFilter.value;
      ui.visible = 12;
      renderLibrary();
    });
    els.sortFilter.addEventListener("change", function () {
      ui.sort = els.sortFilter.value;
      ui.visible = 12;
      renderLibrary();
    });
    els.starredFilter.addEventListener("change", function () {
      ui.starredOnly = els.starredFilter.checked;
      ui.visible = 12;
      renderLibrary();
    });
    els.loadMore.addEventListener("click", function () {
      ui.visible += 12;
      renderLibrary();
    });
    els.resetFilters.addEventListener("click", resetFilters);

    els.clearTopic.addEventListener("click", function () {
      setTopic("all");
    });

    document.querySelectorAll("[data-timeline-topic]").forEach(function (button) {
      button.addEventListener("click", function () {
        ui.timelineTopic = button.dataset.timelineTopic;
        document.querySelectorAll("[data-timeline-topic]").forEach(function (chip) {
          chip.classList.toggle("active", chip.dataset.timelineTopic === ui.timelineTopic);
        });
        renderTimeline();
      });
    });

    document.querySelectorAll("[data-gap-horizon]").forEach(function (button) {
      button.addEventListener("click", function () {
        ui.gapHorizon = button.dataset.gapHorizon;
        document.querySelectorAll("[data-gap-horizon]").forEach(function (chip) {
          chip.classList.toggle("active", chip.dataset.gapHorizon === ui.gapHorizon);
        });
        renderGaps();
      });
    });

    els.topicMap.addEventListener("click", function (event) {
      const paper = event.target.closest("[data-map-paper]");
      const topic = event.target.closest("[data-map-topic]");
      activateMapTarget(paper || topic);
    });
    els.topicMap.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-map-paper], [data-map-topic]");
      if (!target) return;
      event.preventDefault();
      activateMapTarget(target);
    });

    els.timelineSvg.addEventListener("click", function (event) {
      const paper = event.target.closest("[data-timeline-paper]");
      const year = event.target.closest("[data-timeline-year]");
      activateTimelineTarget(paper || year);
    });
    els.timelineSvg.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-timeline-paper], [data-timeline-year]");
      if (!target) return;
      event.preventDefault();
      activateTimelineTarget(target);
    });

    bindSvgTooltips(els.topicMap, els.mapTooltip, els.topicMapWrap);
    bindSvgTooltips(els.timelineSvg, els.timelineTooltip, document.querySelector(".timeline-shell"));

    els.form.addEventListener("submit", savePaperForm);
    els.dialog.addEventListener("close", function () {
      document.body.classList.remove("dialog-open");
    });
    els.dialog.addEventListener("click", function (event) {
      const rect = els.dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) closePaperDialog();
    });

    els.importInput.addEventListener("change", handleImportFile);
    els.closeDrawer.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", function (event) {
      if (event.target === els.drawerBackdrop) closeDrawer();
    });

    document.addEventListener("keydown", function (event) {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      const typing = ["input", "textarea", "select"].includes(tag) || (document.activeElement && document.activeElement.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        els.librarySearch.focus();
        document.getElementById("library").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (event.key === "Escape" && !els.drawerBackdrop.hidden) {
        closeDrawer();
      }
    });

    els.backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function init() {
    const storedTheme = readStorage(STORAGE.theme, null);
    const requestedTheme = new URLSearchParams(window.location.search).get("theme");
    const initialTheme = requestedTheme === "light" || requestedTheme === "dark" ? requestedTheme : storedTheme;
    applyTheme(initialTheme);
    ensureFormOptions();
    rebuildPapers();
    setupEvents();
    renderAll();
    renderEraStrip();
    setupSectionObserver();
    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function () {
          // The site remains fully usable without offline caching.
        });
      });
    }
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    if (requestedSection && document.getElementById(requestedSection)) {
      window.setTimeout(function () {
        document.getElementById(requestedSection).scrollIntoView({ block: "start" });
      }, 80);
    }
    if (store.savedGaps.length) {
      showToast("已恢复 " + store.savedGaps.length + " 个选题备忘", 2200);
    }
  }

  init();
})();
