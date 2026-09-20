const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const defaultState = {
  selectedId: "",
  party: {
    players: 4,
    window: 180,
    mainId: "",
    sideIds: []
  },
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";
state.party = normalizeParty(state.party, state.games);

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  partyPlayers: document.querySelector("#partyPlayers"),
  partyWindow: document.querySelector("#partyWindow"),
  partyMain: document.querySelector("#partyMain"),
  partySide1: document.querySelector("#partySide1"),
  partySide2: document.querySelector("#partySide2"),
  partyClearBtn: document.querySelector("#partyClearBtn"),
  partyTotal: document.querySelector("#partyTotal"),
  partyAlert: document.querySelector("#partyAlert")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function getPartyRole(gameId) {
  if (state.party.mainId === gameId) return "主游戏";
  if (state.party.sideIds[0] === gameId) return "副游戏一";
  if (state.party.sideIds[1] === gameId) return "副游戏二";
  return "";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const role = getPartyRole(game.id);
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
              ${role ? `<span class="party-ribbon">${role}</span>` : ""}
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
          ${getPartyRole(game.id) ? `<span class="pill role">今晚${getPartyRole(game.id)}</span>` : ""}
        </div>
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderAll(partyAlerts = []) {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  renderParty(partyAlerts);
}

function normalizeParty(party, games) {
  const base = { ...structuredClone(defaultState.party) };
  party = { ...base, ...(party || {}) };
  const ids = new Set(games.map((game) => game.id));
  if (party.mainId && !ids.has(party.mainId)) party.mainId = "";
  const rawSides = Array.isArray(party.sideIds) ? party.sideIds : [];
  const seen = new Set();
  party.sideIds = [0, 1].map((index) => {
    const id = rawSides[index];
    if (!id || !ids.has(id) || id === party.mainId || seen.has(id)) return "";
    seen.add(id);
    return id;
  });
  return party;
}

function getGameById(id) {
  return state.games.find((game) => game.id === id) || null;
}

function supportsPlayers(game, players) {
  return players >= game.minPlayers && players <= game.maxPlayers;
}

function gamesByStaleness() {
  return [...state.games].sort(
    (a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed) || a.name.localeCompare(b.name, "zh-CN")
  );
}

// 统一复核：人数有效、主游戏覆盖人数、副游戏不与主游戏或彼此重复、三款合计不超过窗口
function validateParty() {
  const errors = [];
  const party = state.party;
  const players = Number(party.players);
  const windowMinutes = Number(party.window);

  if (!Number.isInteger(players) || players < 1) {
    errors.push("请输入有效的今晚人数（正整数）。");
  }
  if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
    errors.push("请输入有效的今晚时长（大于 0 的分钟数）。");
  }

  const main = party.mainId ? getGameById(party.mainId) : null;
  if (party.mainId && !main) {
    errors.push("主游戏已不在收藏中。");
  }
  if (main && Number.isInteger(players) && players >= 1 && !supportsPlayers(main, players)) {
    errors.push(
      `主游戏《${main.name}》只支持 ${main.minPlayers}-${main.maxPlayers} 人，覆盖不了今晚 ${players} 人。`
    );
  }

  const seenSides = new Set();
  const sideGames = party.sideIds.map((id, index) => {
    if (!id) return null;
    const game = getGameById(id);
    if (!game) {
      errors.push(`副游戏${index + 1}已不在收藏中。`);
      return null;
    }
    if (main && id === main.id) {
      errors.push(`副游戏《${game.name}》与主游戏重复。`);
    }
    if (seenSides.has(id)) {
      errors.push(`副游戏《${game.name}》被重复选择。`);
    }
    seenSides.add(id);
    return game;
  });

  if (main && Number.isFinite(windowMinutes) && windowMinutes > 0) {
    const total = main.duration + sideGames.reduce((sum, game) => sum + (game ? game.duration : 0), 0);
    if (total > windowMinutes) {
      errors.push(`三款合计 ${total} 分钟，超过今晚 ${windowMinutes} 分钟的时间窗口。`);
    }
  }

  return errors;
}

// 任何修改都先快照，复核失败就整次回滚，清单和收藏保持原样
function commitPartyChange(mutate) {
  const snapshot = structuredClone(state.party);
  mutate();
  const errors = validateParty();
  if (errors.length) {
    state.party = snapshot;
    renderAll(errors);
    return;
  }
  renderAll();
}

function gameOption(game) {
  return `${escapeHtml(game.name)}（${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟 · ${daysSince(game.lastPlayed)}天未玩）`;
}

function buildMissingReminders(players, windowMinutes, main, sideGames) {
  const notes = [];
  if (state.games.length === 0) {
    notes.push("收藏还是空的，先在左侧添加桌游。");
    return notes;
  }
  if (Number.isInteger(players) && players >= 1) {
    const covering = state.games.filter((game) => supportsPlayers(game, players));
    if (covering.length === 0) {
      notes.push(`收藏中没有支持 ${players} 人的游戏，主游戏无法覆盖今晚人数。`);
    }
  }
  if (!state.party.mainId) {
    notes.push("还没有选择主游戏：主游戏必须能覆盖今晚人数。");
  }
  if (main && Number.isFinite(windowMinutes) && windowMinutes > 0) {
    const used = main.duration + sideGames.reduce((sum, game) => sum + game.duration, 0);
    const remaining = windowMinutes - used;
    const openSlots = state.party.sideIds.filter((id) => !id).length;
    if (openSlots > 0) {
      const picked = new Set([main.id, ...sideGames.map((game) => game.id)]);
      const candidates = state.games.filter((game) => !picked.has(game.id));
      const shortest = Math.min(...candidates.map((game) => game.duration));
      if (remaining <= 0) {
        notes.push("时间窗口已经排满，副游戏位只能留空。");
      } else if (candidates.length === 0) {
        notes.push("收藏里已没有其他游戏可作为副游戏。");
      } else if (shortest > remaining) {
        notes.push(`仅剩 ${remaining} 分钟，但收藏中最短的候选游戏也要 ${shortest} 分钟，副游戏位只能留空。`);
      }
    }
  }
  return notes;
}

function renderParty(alerts = []) {
  const party = state.party;
  els.partyPlayers.value = party.players;
  els.partyWindow.value = party.window;

  const players = Number(party.players);
  const windowMinutes = Number(party.window);
  const staleGames = gamesByStaleness();

  els.partyMain.innerHTML =
    `<option value="">请选择主游戏</option>` +
    staleGames
      .map((game) => {
        const disabled =
          Number.isInteger(players) && players >= 1 && !supportsPlayers(game, players) ? "disabled" : "";
        const selected = game.id === party.mainId ? "selected" : "";
        return `<option value="${game.id}" ${selected} ${disabled}>${gameOption(game)}</option>`;
      })
      .join("");

  const main = party.mainId ? getGameById(party.mainId) : null;
  const sideGames = party.sideIds.map((id) => (id ? getGameById(id) : null));

  [els.partySide1, els.partySide2].forEach((select, slot) => {
    const currentId = party.sideIds[slot] || "";
    const otherId = party.sideIds[1 - slot] || "";
    const options = staleGames
      .filter((game) => game.id !== party.mainId && game.id !== otherId)
      .map((game) => {
        const selected = game.id === currentId ? "selected" : "";
        return `<option value="${game.id}" ${selected}>${gameOption(game)}</option>`;
      })
      .join("");
    select.innerHTML = `<option value="">不选</option>${options}`;
  });

  const used = (main ? main.duration : 0) + sideGames.reduce((sum, game) => sum + (game ? game.duration : 0), 0);
  const validWindow = Number.isFinite(windowMinutes) && windowMinutes > 0;
  els.partyTotal.textContent = `合计 ${used} / ${validWindow ? windowMinutes : "—"} 分钟`;
  els.partyTotal.classList.toggle("over", validWindow && used > windowMinutes);

  const notes = alerts.length ? [] : buildMissingReminders(players, windowMinutes, main, sideGames.filter(Boolean));
  const items = [
    ...alerts.map((text) => ({ type: "error", text })),
    ...notes.map((text) => ({ type: "notice", text }))
  ];
  els.partyAlert.hidden = items.length === 0;
  els.partyAlert.innerHTML = items
    .map(
      (item) =>
        `<li class="${item.type}">${item.type === "error" ? "已拒绝：" : "缺失提醒："}${escapeHtml(item.text)}</li>`
    )
    .join("");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.partyPlayers.addEventListener("change", () => {
  commitPartyChange(() => {
    state.party.players = Number(els.partyPlayers.value);
  });
});

els.partyWindow.addEventListener("change", () => {
  commitPartyChange(() => {
    state.party.window = Number(els.partyWindow.value);
  });
});

els.partyMain.addEventListener("change", () => {
  // 切换主游戏时先释放旧副游戏，再统一复核
  commitPartyChange(() => {
    state.party.mainId = els.partyMain.value;
    state.party.sideIds = ["", ""];
  });
});

els.partySide1.addEventListener("change", () => {
  commitPartyChange(() => {
    state.party.sideIds[0] = els.partySide1.value;
  });
});

els.partySide2.addEventListener("change", () => {
  commitPartyChange(() => {
    state.party.sideIds[1] = els.partySide2.value;
  });
});

els.partyClearBtn.addEventListener("click", () => {
  state.party.mainId = "";
  state.party.sideIds = ["", ""];
  renderAll();
});

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    if (state.party.mainId === game.id) state.party.mainId = "";
    state.party.sideIds = state.party.sideIds.map((id) => (id === game.id ? "" : id));
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
