const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const defaultState = {
  selectedId: "",
  party: { players: 4, window: 180, mainId: "", sideIds: [] },
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
  partySlots: document.querySelector("#partySlots"),
  partyReminders: document.querySelector("#partyReminders"),
  mainCandidates: document.querySelector("#mainCandidates"),
  sideCandidates: document.querySelector("#sideCandidates"),
  partyNotice: document.querySelector("#partyNotice")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const merged = { ...structuredClone(defaultState), ...JSON.parse(saved) };
    const defaultParty = structuredClone(defaultState.party);
    const savedParty = typeof merged.party === "object" && merged.party ? merged.party : {};
    merged.party = {
      players: Number(savedParty.players) > 0 ? Number(savedParty.players) : defaultParty.players,
      window: Number(savedParty.window) > 0 ? Number(savedParty.window) : defaultParty.window,
      mainId: typeof savedParty.mainId === "string" ? savedParty.mainId : "",
      sideIds: Array.isArray(savedParty.sideIds) ? savedParty.sideIds.filter((id) => typeof id === "string") : []
    };
    const gameIds = new Set(merged.games.map((game) => game.id));
    if (!gameIds.has(merged.party.mainId)) merged.party.mainId = "";
    merged.party.sideIds = merged.party.sideIds.filter((id) => id !== merged.party.mainId && gameIds.has(id));
    return merged;
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

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
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

function sortByStale(games) {
  return [...games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

// ========== 聚会试玩清单 ==========
let partyNotice = null;

function getById(id) {
  return state.games.find((game) => game.id === id);
}

function coversPlayers(game, players) {
  return players >= game.minPlayers && players <= game.maxPlayers;
}

function findDuplicate(ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

// 统一复核：主游戏必须存在且覆盖人数；三款合计时长不超窗口；副游戏最多两款、不与主游戏或彼此重复
function validateParty(party) {
  if (!party.mainId) return { ok: true };
  const main = getById(party.mainId);
  if (!main) return { ok: false, reason: "主游戏不在收藏中。" };
  if (!coversPlayers(main, party.players)) {
    return { ok: false, reason: `主游戏《${main.name}》不支持 ${party.players} 人（${main.minPlayers}-${main.maxPlayers}人）。` };
  }
  if (party.sideIds.length > 2) return { ok: false, reason: "副游戏最多只能选两款。" };
  const duplicate = findDuplicate([party.mainId, ...party.sideIds]);
  if (duplicate) {
    const dup = getById(duplicate);
    return { ok: false, reason: `《${dup ? dup.name : "该游戏"}》在清单中重复。` };
  }
  const sides = party.sideIds.map(getById);
  if (sides.some((game) => !game)) return { ok: false, reason: "副游戏不在收藏中。" };
  const total = main.duration + sides.reduce((sum, game) => sum + game.duration, 0);
  if (total > party.window) {
    return { ok: false, reason: `合计时长 ${total} 分钟，超过今晚窗口 ${party.window} 分钟。` };
  }
  return { ok: true, main, sides, total };
}

// 任一条件不满足就整次拒绝：临时副本校验失败时不写入 state，清单与收藏均保持不变
function commitParty(nextParty) {
  const result = validateParty(nextParty);
  if (!result.ok) {
    partyNotice = { type: "error", text: `已拒绝：${result.reason}` };
    renderParty();
    return false;
  }
  state.party = nextParty;
  if (result.total !== undefined) {
    partyNotice = { type: "success", text: `清单已更新：合计 ${result.total} / ${nextParty.window} 分钟。` };
  } else if (!nextParty.mainId) {
    partyNotice = { type: "success", text: "清单已清空，收藏保持不变。" };
  }
  renderAll();
  return true;
}

function renderPartyGame(game, role) {
  return `
    <div class="slot-name">
      <strong>${escapeHtml(game.name)}</strong>
      <span class="slot-role">${role}</span>
    </div>
    <div class="game-meta">
      <span class="pill ${coversPlayers(game, state.party.players) ? "" : "bad"}">
        ${game.minPlayers}-${game.maxPlayers}人
      </span>
      <span class="pill">${game.duration}分钟</span>
      <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
    </div>
  `;
}

function renderPartySlots() {
  const { mainId, sideIds, window: windowMin } = state.party;
  const main = getById(mainId);
  const sides = sideIds.map(getById).filter(Boolean);
  const total = main ? main.duration + sides.reduce((sum, game) => sum + game.duration, 0) : 0;
  const over = total > windowMin;

  const mainSlot = main
    ? `
      <div class="slot slot-main">
        <div class="slot-head">
          <span class="slot-tag">主游戏</span>
          <button type="button" class="slot-clear" data-party-action="clearMain" title="清空清单">清空</button>
        </div>
        ${renderPartyGame(main, "必须覆盖今晚人数")}
      </div>
    `
    : `
      <div class="slot slot-empty">
        <div class="slot-head"><span class="slot-tag">主游戏</span></div>
        <p class="empty">尚未选择主游戏，请从下方最近未玩排序的候选中点一个。</p>
      </div>
    `;

  const sideSlots = [0, 1]
    .map((index) => {
      const side = sides[index];
      if (!side) {
        return `
          <div class="slot slot-empty">
            <div class="slot-head"><span class="slot-tag">副游戏 ${index + 1}</span></div>
            <p class="empty">空位（最多两款）</p>
          </div>
        `;
      }
      return `
        <div class="slot slot-side">
          <div class="slot-head">
            <span class="slot-tag">副游戏 ${index + 1}</span>
            <button type="button" class="slot-clear" data-party-action="removeSide" data-side-id="${side.id}">移除</button>
          </div>
          ${renderPartyGame(side, coversPlayers(side, state.party.players) ? "可选暖场" : "人数不足，见下方提醒")}
        </div>
      `;
    })
    .join("");

  els.partySlots.innerHTML = `
    <div class="slots-grid">
      ${mainSlot}
      ${sideSlots}
    </div>
    <p class="party-total ${over ? "bad" : ""}">
      三款合计 <strong>${total}</strong> / ${windowMin} 分钟${over ? "（超出窗口）" : ""}
    </p>
  `;
}

function renderMainCandidates() {
  const { players, mainId } = state.party;
  els.mainCandidates.innerHTML = sortByStale(state.games)
    .map((game) => {
      const cover = coversPlayers(game, players);
      return `
        <button type="button" class="candidate ${mainId === game.id ? "picked" : ""}" data-main-id="${game.id}">
          <span class="candidate-name">${escapeHtml(game.name)}</span>
          <span class="game-meta">
            <span class="pill ${cover ? "" : "bad"}">${game.minPlayers}-${game.maxPlayers}人</span>
            <span class="pill">${game.duration}分钟</span>
            <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
          </span>
          ${mainId === game.id ? `<span class="pick-flag">当前主游戏</span>` : ""}
          ${!cover ? `<span class="pick-flag warn">不支持${players}人，点击将被拒绝</span>` : ""}
        </button>
      `;
    })
    .join("") || `<p class="empty">收藏为空，先在左侧添加桌游。</p>`;
}

function renderSideCandidates() {
  const { players, window: windowMin, mainId, sideIds } = state.party;
  const main = getById(mainId);
  if (!main) {
    els.sideCandidates.innerHTML = `<p class="empty">先确定主游戏，再挑选副游戏。</p>`;
    return;
  }
  const usedTotal = main.duration + sideIds.reduce((sum, id) => sum + (getById(id)?.duration || 0), 0);
  const candidates = sortByStale(state.games).filter((game) => game.id !== mainId);
  els.sideCandidates.innerHTML = candidates
    .map((game) => {
      const picked = sideIds.includes(game.id);
      const fitsTime = usedTotal + game.duration <= windowMin;
      const cover = coversPlayers(game, players);
      const disabledReason = !fitsTime
        ? "超出剩余时间，点击将被拒绝"
        : sideIds.length >= 2 && !picked
          ? "副游戏已满两款"
          : "";
      return `
        <button type="button" class="candidate ${picked ? "picked" : ""} ${disabledReason ? "invalid" : ""}" data-side-id="${game.id}">
          <span class="candidate-name">${escapeHtml(game.name)}</span>
          <span class="game-meta">
            <span class="pill ${cover ? "" : "bad"}">${game.minPlayers}-${game.maxPlayers}人</span>
            <span class="pill ${fitsTime ? "" : "bad"}">${game.duration}分钟</span>
            <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
          </span>
          ${picked ? `<span class="pick-flag">已在清单</span>` : ""}
          ${!picked && !cover ? `<span class="pick-flag warn">不支持${players}人，规则只要求主游戏覆盖人数</span>` : ""}
          ${disabledReason ? `<span class="pick-flag warn">${disabledReason}</span>` : ""}
        </button>
      `;
    })
    .join("") || `<p class="empty">收藏里除主游戏外没有其他桌游。</p>`;
}

// 缺失提醒：人数没有任何收藏可覆盖、时间窗放不下主游戏或副游戏等
function buildPartyReminders() {
  const { players, window: windowMin, mainId, sideIds } = state.party;
  const reminders = [];
  if (!state.games.length) {
    reminders.push({ type: "missing", text: "收藏为空，无法生成试玩清单。" });
    return reminders;
  }
  if (!mainId) {
    const playable = state.games.filter((game) => coversPlayers(game, players));
    if (!playable.length) {
      reminders.push({ type: "missing", text: `缺失：没有任何收藏支持 ${players} 人，请调整人数或添加新桌游。` });
    } else {
      reminders.push({ type: "warn", text: "还缺主游戏；下方候选已按最近未玩排序。" });
    }
    return reminders;
  }
  const main = getById(mainId);
  if (!main) return reminders;
  if (!coversPlayers(main, players)) {
    reminders.push({ type: "missing", text: `缺失：主游戏《${main.name}》不支持 ${players} 人，请换人或换主游戏。` });
  }
  const sides = sideIds.map(getById).filter(Boolean);
  const total = main.duration + sides.reduce((sum, game) => sum + game.duration, 0);
  if (total > windowMin) {
    reminders.push({ type: "missing", text: `缺失：合计 ${total} 分钟超出窗口 ${windowMin} 分钟，请移除副游戏或加时。` });
  } else {
    const remaining = windowMin - total;
    const filler = state.games.find(
      (game) =>
        game.id !== mainId &&
        !sideIds.includes(game.id) &&
        game.duration <= remaining
    );
    if (sideIds.length < 2 && remaining > 0 && !filler) {
      reminders.push({ type: "missing", text: `还剩 ${remaining} 分钟，但没有能放进该时段的副游戏。` });
    } else if (sideIds.length < 2 && filler) {
      reminders.push({ type: "info", text: `还可加 ${sideIds.length === 0 ? "一到两款" : "一款"}副游戏（剩余 ${remaining} 分钟）。` });
    }
  }
  sides.forEach((game) => {
    if (!coversPlayers(game, players)) {
      reminders.push({ type: "warn", text: `提醒：副游戏《${game.name}》只支持 ${game.minPlayers}-${game.maxPlayers} 人，规则未强制副游戏覆盖人数，请自行确认。` });
    }
  });
  return reminders;
}

function renderPartyReminders() {
  const reminders = buildPartyReminders();
  els.partyReminders.innerHTML = reminders.length
    ? reminders
        .map(
          (item) =>
            `<li class="reminder ${item.type}"><span>${escapeHtml(item.text)}</span></li>`
        )
        .join("")
    : `<li class="reminder ok"><span>清单完整：主游戏覆盖人数，合计时长在窗口内。</span></li>`;
}

function renderParty() {
  els.partyPlayers.value = state.party.players;
  els.partyWindow.value = state.party.window;
  renderPartySlots();
  renderMainCandidates();
  renderSideCandidates();
  renderPartyReminders();
  els.partyNotice.className = `party-notice ${partyNotice ? partyNotice.type : ""}`;
  els.partyNotice.textContent = partyNotice ? partyNotice.text : "";
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
  renderParty();
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
    state.selectedId = state.games[0]?.id || "";
    // 删除的桌游若在今晚清单中，同步移除，保持清单可复核
    if (state.party.mainId === game.id) state.party.mainId = "";
    state.party.sideIds = state.party.sideIds.filter((id) => id !== game.id);
    partyNotice = null;
    renderAll();
  }
});

// ========== 聚会清单交互 ==========
els.partyPlayers.addEventListener("change", () => {
  const players = Number(els.partyPlayers.value);
  if (!Number.isInteger(players) || players < 1) {
    partyNotice = { type: "error", text: "已拒绝：人数必须是不小于 1 的整数。" };
    renderParty();
    return;
  }
  commitParty({ ...state.party, players });
});

els.partyWindow.addEventListener("change", () => {
  const window = Number(els.partyWindow.value);
  if (!Number.isInteger(window) || window < 5) {
    partyNotice = { type: "error", text: "已拒绝：今晚时长至少为 5 分钟。" };
    renderParty();
    return;
  }
  commitParty({ ...state.party, window });
});

els.partySlots.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-party-action]");
  if (!actionEl) return;
  if (actionEl.dataset.partyAction === "clearMain") {
    commitParty({ ...state.party, mainId: "", sideIds: [] });
  }
  if (actionEl.dataset.partyAction === "removeSide") {
    const id = actionEl.dataset.sideId;
    commitParty({ ...state.party, sideIds: state.party.sideIds.filter((sideId) => sideId !== id) });
  }
});

els.mainCandidates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-main-id]");
  if (!button) return;
  const id = button.dataset.mainId;
  if (id === state.party.mainId) return;
  // 切换主游戏：先在临时副本上释放旧副游戏，再统一复核；失败则旧主游戏和旧副游戏都保留
  commitParty({ ...state.party, mainId: id, sideIds: [] });
});

els.sideCandidates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-side-id]");
  if (!button) return;
  const id = button.dataset.sideId;
  if (id === state.party.mainId || state.party.sideIds.includes(id)) return;
  // 统一复核：重复、超过两款或合计超时都会被整体拒绝
  commitParty({ ...state.party, sideIds: [...state.party.sideIds, id] });
});

setDefaultDate();
renderAll();
