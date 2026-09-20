const fs = require("fs");
const vm = require("vm");
const { webcrypto } = require("crypto");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

function makeElement() {
  const listeners = {};
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    files: [],
    classList: { toggle() {} },
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    reset() {},
    _fire(event) {
      listeners[event.type] && listeners[event.type](event);
    }
  };
}

function makeEnv() {
  const store = new Map();
  const elements = {};
  const document = {
    querySelector(sel) {
      const key = sel.replace("#", "");
      if (!elements[key]) elements[key] = makeElement();
      return elements[key];
    }
  };
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v)
  };
  const sandbox = {
    document,
    localStorage,
    crypto: webcrypto,
    structuredClone,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const getState = () => JSON.parse(store.get("zfl18-boardgame-rule-cards"));
  return { elements, getState };
}

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}`, extra || "");
  }
}

// 用例 1：初始加载，清单为空
{
  const { getState } = makeEnv();
  const s = getState();
  check("初始 party 字段存在", s.party && s.party.mainId === "" && Array.isArray(s.party.sideIds));
}

// 用例 2：选择覆盖人数的主游戏 -> 接受
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const main = s0.games[0];
  elements.partyPlayers.value = 4;
  elements.partyPlayers._fire({ type: "change" });
  elements.partyMain.value = main.id;
  elements.partyMain._fire({ type: "change" });
  const s = getState();
  check("主游戏可选择", s.party.mainId === main.id);
  check("初始无副游戏", JSON.stringify(s.party.sideIds) === JSON.stringify(["", ""]));
}

// 用例 3：主游戏不覆盖人数 -> 整次拒绝，原清单不变
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const main = s0.games[0]; // 2-4 人
  elements.partyMain.value = main.id;
  elements.partyMain._fire({ type: "change" });
  // 把人数改成 5（默认游戏最多 4 人）
  elements.partyPlayers.value = 5;
  elements.partyPlayers._fire({ type: "change" });
  const s = getState();
  check("人数改为 5 被拒绝，回滚为 4", s.party.players === 4, s.party.players);
  check("主游戏保持不变", s.party.mainId === main.id);
  check("显示错误告警", elements.partyAlert.innerHTML.includes("已拒绝") && elements.partyAlert.hidden === false);
}

// 用例 4：合计时长超过窗口 -> 拒绝，副游戏保持原样
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const [g1, g2, g3] = s0.games; // 90 / 150 / 45 分钟
  // 主游戏 45（花砖），窗口 180
  elements.partyWindow.value = 180;
  elements.partyWindow._fire({ type: "change" });
  elements.partyMain.value = g3.id;
  elements.partyMain._fire({ type: "change" });
  // 副一 90 => 135，接受
  elements.partySide1.value = g1.id;
  elements.partySide1._fire({ type: "change" });
  let s = getState();
  check("45+90=135 接受", s.party.sideIds[0] === g1.id);
  // 副二 150 => 285 > 180，拒绝
  elements.partySide2.value = g2.id;
  elements.partySide2._fire({ type: "change" });
  s = getState();
  check("超时副游戏被拒绝", s.party.sideIds[1] === "", s.party.sideIds);
  check("副一与主游戏保持不变", s.party.sideIds[0] === g1.id && s.party.mainId === g3.id);
}

// 用例 5：副游戏与主游戏重复（直接构造）-> validate 路径覆盖；UI 已过滤
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const g1 = s0.games[0];
  elements.partyMain.value = g1.id;
  elements.partyMain._fire({ type: "change" });
  // 模拟异常 DOM：副一强行选主游戏 id
  elements.partySide1.value = g1.id;
  elements.partySide1._fire({ type: "change" });
  const s = getState();
  check("副游戏与主游戏重复被拒绝", s.party.sideIds[0] === "", s.party.sideIds);
}

// 用例 6：切换主游戏时先释放旧副游戏，再复核
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const [g1, g2, g3] = s0.games;
  elements.partyWindow.value = 300;
  elements.partyWindow._fire({ type: "change" });
  elements.partyMain.value = g3.id; // 45
  elements.partyMain._fire({ type: "change" });
  elements.partySide1.value = g1.id; // +90
  elements.partySide1._fire({ type: "change" });
  elements.partySide2.value = g2.id; // +150 = 285
  elements.partySide2._fire({ type: "change" });
  let s = getState();
  check("切换前两款副游戏已选", s.party.sideIds[0] === g1.id && s.party.sideIds[1] === g2.id);
  // 切换主游戏
  elements.partyMain.value = g1.id;
  elements.partyMain._fire({ type: "change" });
  s = getState();
  check("切换主游戏后副游戏被释放", s.party.mainId === g1.id && JSON.stringify(s.party.sideIds) === JSON.stringify(["", ""]), s.party);
}

// 用例 7：删除主游戏 -> 清单同步清理
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const [g1, , g3] = s0.games;
  elements.partyMain.value = g1.id;
  elements.partyMain._fire({ type: "change" });
  elements.partySide1.value = g3.id;
  elements.partySide1._fire({ type: "change" });
  // 选中 g1 并在详情面板点删除
  elements.gameList.value = "";
  // 直接通过 detailView 的 click 监听，构造事件
  const ev = {
    target: {
      closest(sel) {
        if (sel === "#deleteGameBtn") return {};
        return null;
      }
    }
  };
  // selectedId 需要是 g1
  const before = getState();
  before; // selectedId 默认 games[0] 即 g1
  elements.detailView._fire({ type: "click", target: ev.target });
  const s = getState();
  check("删除后主游戏清空", s.party.mainId === "");
  check("删除主游戏不影响无关的副游戏", s.party.sideIds[0] === g3.id && s.party.sideIds[1] === "", JSON.stringify(s.party.sideIds));
  check("收藏中游戏被删除", s.games.every((g) => g.id !== g1.id));
}

// 用例 8：删除副游戏 -> 对应槽位同步清空
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const [g1, , g3] = s0.games;
  elements.partyMain.value = g1.id;
  elements.partyMain._fire({ type: "change" });
  elements.partySide2.value = g3.id;
  elements.partySide2._fire({ type: "change" });
  // 选中 g3 并删除
  elements.gameList._fire({ type: "click", target: { closest: () => ({ dataset: { gameId: g3.id } }) } });
  elements.detailView._fire({
    type: "click",
    target: { closest: (sel) => (sel === "#deleteGameBtn" ? {} : null) }
  });
  const s = getState();
  check("删除副游戏后主游戏保留", s.party.mainId === g1.id);
  check("删除副游戏后对应槽位清空", s.party.sideIds[1] === "", JSON.stringify(s.party.sideIds));
}

// 用例 9：持久化、刷新恢复与最近未玩排序
{
  const { elements, getState } = makeEnv();
  const s0 = getState();
  const [g1, , g3] = s0.games;
  elements.partyMain.value = g1.id;
  elements.partyMain._fire({ type: "change" });
  elements.partySide1.value = g3.id;
  elements.partySide1._fire({ type: "change" });
  const persisted = getState();
  check("清单已写入 localStorage", persisted.party.mainId === g1.id && persisted.party.sideIds[0] === g3.id);

  // 模拟刷新：用持久化数据构造全新沙盒
  const store2 = new Map([["zfl18-boardgame-rule-cards", JSON.stringify(persisted)]]);
  const elements2 = {};
  const sandbox2 = {
    document: {
      querySelector(sel) {
        const key = sel.replace("#", "");
        if (!elements2[key]) elements2[key] = makeElement();
        return elements2[key];
      }
    },
    localStorage: {
      getItem: (k) => (store2.has(k) ? store2.get(k) : null),
      setItem: (k, v) => store2.set(k, v)
    },
    crypto: webcrypto,
    structuredClone,
    console
  };
  vm.createContext(sandbox2);
  vm.runInContext(code, sandbox2);
  const restored = JSON.parse(store2.get("zfl18-boardgame-rule-cards"));
  check("刷新后主游戏恢复", restored.party.mainId === g1.id);
  check("刷新后副游戏恢复", restored.party.sideIds[0] === g3.id);

  // 下拉顺序：最久未玩（盖亚 2025-08-02）排第一
  const html = elements.partyMain.innerHTML;
  const ids = [...html.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  const gaia = s0.games.find((g) => g.name === "盖亚计划");
  check("主游戏下拉按最近未玩排序", ids[0] === gaia.id, ids[0]);
  // 选了主游戏后，副游戏下拉不含主游戏
  check("副游戏下拉不含主游戏", elements.partySide1.innerHTML.includes(`value="${g1.id}"`) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
