// ==============================================================================
// BI Data Agent v2.0 独立前端控制引擎（支持 6 大【人·货·场】分析场景，彻底无 R$）
// ==============================================================================
let currentScenarioIdx = 0;
let currentNodeIdx = 0;
let currentKbTab = "metrics";
let replayTimers = [];
let leftChartInst = null;
let rightChartInst = null;

window.addEventListener("DOMContentLoaded", () => {
  if (!window.DEMO_SNAPSHOTS) {
    showToast("❌ 未检测到 data/snapshots.js，请先在 Kaggle 导出并放入 docs/data/ 目录！");
    return;
  }
  const info = window.DEMO_SNAPSHOTS.project_info;
  document.getElementById("proj-title").textContent = info.title;
  document.getElementById("proj-subtitle").textContent = info.subtitle;
  document.getElementById("kb-count").textContent = info.kb_count;
  document.getElementById("bm-total").textContent = info.benchmark.total;
  document.getElementById("bm-overall").textContent = info.benchmark.overall;
  document.getElementById("bm-easy").textContent = info.benchmark.easy;
  document.getElementById("bm-medium").textContent = info.benchmark.medium;
  document.getElementById("bm-hard").textContent = info.benchmark.hard;

  leftChartInst = echarts.init(document.getElementById("left-chart"));
  rightChartInst = echarts.init(document.getElementById("right-chart"));
  window.addEventListener("resize", () => {
    leftChartInst && leftChartInst.resize();
    rightChartInst && rightChartInst.resize();
  });

  renderScenarioList();
  switchKbTab("metrics");
  selectScenario(0);
});

function renderScenarioList() {
  const container = document.getElementById("scenario-list");
  const scenarios = window.DEMO_SNAPSHOTS.scenarios;
  const tagColors = {
    indigo: "text-indigo-400", purple: "text-purple-400", emerald: "text-emerald-400",
    amber: "text-amber-400", rose: "text-rose-400", sky: "text-sky-400"
  };
  container.innerHTML = scenarios.map((sc, idx) => {
    const active = idx === currentScenarioIdx;
    return `
      <button onclick="selectScenario(${idx})"
        class="w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
          active
            ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-900/40"
            : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
        }">
        <div class="text-[10px] font-bold tracking-wider uppercase mb-0.5 ${tagColors[sc.tag_color] || 'text-indigo-400'}">${sc.tag}</div>
        <div class="text-xs font-medium text-slate-100 leading-snug">${sc.short_title}</div>
      </button>`;
  }).join("");
}

function switchKbTab(tab) {
  currentKbTab = tab;
  const btnM = document.getElementById("tab-metrics");
  const btnS = document.getElementById("tab-schemas");
  if (tab === "metrics") {
    btnM.className = "py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white transition";
    btnS.className = "py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-white transition";
  } else {
    btnS.className = "py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white transition";
    btnM.className = "py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-white transition";
  }
  const docs = tab === "metrics" ? window.DEMO_SNAPSHOTS.project_info.kb_metrics : window.DEMO_SNAPSHOTS.project_info.kb_schemas;
  document.getElementById("kb-list").innerHTML = docs.map(doc => {
    const splitIdx = doc.indexOf("】");
    const title = splitIdx > -1 ? doc.slice(1, splitIdx) : "语义规则";
    const body = splitIdx > -1 ? doc.slice(splitIdx + 1).trim() : doc;
    return `<div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
      <div class="text-xs font-semibold text-indigo-300 mb-1">${escapeHtml(title)}</div>
      <div class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(body)}</div>
    </div>`;
  }).join("");
}

function selectScenario(idx) {
  clearReplayTimers();
  currentScenarioIdx = idx;
  currentNodeIdx = 0;
  renderScenarioList();
  const sc = window.DEMO_SNAPSHOTS.scenarios[idx];
  document.getElementById("query-input").value = sc.question;
  document.getElementById("route-name").textContent = sc.route_name;
  document.getElementById("guard-badge").textContent = sc.guard_badge;
  document.getElementById("meta-stats").textContent = sc.meta_stats;
  renderNodes(sc.nodes, -1);
  selectNode(0);
  renderKpis(sc.kpis);
  renderCharts(sc.charts);

  // 渲染 Markdown 并自动美化全部表格（圆角滚动容器 + 纯数字列自动右对齐）
  const reportEl = document.getElementById("report-content");
  reportEl.innerHTML = marked.parse((sc.report_md || "").replace(/R\$/g, ""));
  reportEl.querySelectorAll("table").forEach(tbl => {
    const wrap = document.createElement("div");
    wrap.className = "md-table-wrap";
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);

    const rows = tbl.querySelectorAll("tbody tr");
    if (!rows.length) return;
    const colCount = rows[0].children.length;
    for (let c = 0; c < colCount; c++) {
      const cells = Array.from(rows).map(r => r.children[c]).filter(Boolean);
      const isNum = cells.every(td => /^[\+\-]?\d[\d,\.\s%pp天次人单]*$/.test(td.textContent.trim()));
      if (isNum) {
        const th = tbl.querySelectorAll("thead th")[c];
        if (th) th.style.textAlign = "right";
        cells.forEach(td => td.classList.add("num-cell"));
      }
    }
  });
}

function renderNodes(nodes, replayingIdx) {
  const badgeStyles = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200", teal: "bg-teal-50 text-teal-700 border-teal-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200", blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
    gray: "bg-slate-100 text-slate-500 border-slate-200"
  };
  document.getElementById("nodes-grid").innerHTML = nodes.map((n, idx) => {
    const isActive = idx === currentNodeIdx;
    const isReplaying = idx === replayingIdx;
    return `
      <div onclick="selectNode(${idx})"
        class="p-3.5 rounded-xl border cursor-pointer transition select-none ${
          isActive ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
        } ${isReplaying ? "node-replaying" : ""}">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <span class="text-xs font-bold text-slate-800 leading-tight">${escapeHtml(n.step)}</span>
          <span class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeStyles[n.badge_color] || badgeStyles.gray}">${escapeHtml(n.badge)}</span>
        </div>
        <p class="text-[11px] text-slate-500 leading-relaxed">${escapeHtml(n.desc)}</p>
      </div>`;
  }).join("");
}

function selectNode(idx) {
  currentNodeIdx = idx;
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  renderNodes(sc.nodes, -1);
  document.getElementById("node-terminal").textContent = sc.nodes[idx].log;
}

function renderKpis(kpis) {
  const valColors = { up: "text-emerald-600", down: "text-rose-600", neutral: "text-slate-900" };
  document.getElementById("kpi-grid").innerHTML = kpis.map(k => `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div class="text-xs text-slate-500 font-medium mb-1.5">${escapeHtml(k.label)}</div>
      <div class="text-lg font-extrabold tracking-tight truncate ${valColors[k.trend] || 'text-slate-900'}" title="${escapeHtml(k.value)}">${escapeHtml(k.value)}</div>
      <div class="text-[11px] text-slate-400 mt-1.5">${escapeHtml(k.sub)}</div>
    </div>`).join("");
}

function renderCharts(charts) {
  document.getElementById("left-chart-title").textContent = charts.left_title;
  document.getElementById("right-chart-title").textContent = charts.right_title;
  const lUnit = charts.left_unit || "";
  const rUnit = charts.right_unit || "";

  // --- 左图渲染（支持正负双向柱图与分组多柱图） ---
  if (charts.left_type === "bar_generic") {
    const list = charts.bar_data;
    const vals = list.map(i => i.value);
    const hasNeg = vals.some(v => v < 0);
    const maxAbs = Math.max(...vals.map(v => Math.abs(v)), 1);
    leftChartInst.setOption({
      tooltip: { trigger: "axis", formatter: p => `${p[0].name.replace(/\n/g, " ")}<br/><b>${p[0].value.toLocaleString()}${lUnit}</b>` },
      grid: { left: 56, right: 20, top: 34, bottom: 38 },
      xAxis: { type: "category", data: list.map(i => i.name), axisLabel: { color: "#475569", fontSize: 10.5, interval: 0 } },
      yAxis: {
        type: "value",
        min: hasNeg ? Math.floor(Math.min(...vals) * 1.25) : 0,
        max: Math.ceil(Math.max(...vals, 0) * 1.22),
        splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
        axisLabel: { color: "#64748B", fontSize: 10.5, formatter: v => (Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + "k" : v) + lUnit }
      },
      series: [{
        type: "bar", barWidth: "46%",
        data: list.map(i => {
          const isNeg = i.value < 0;
          const lbl = Math.abs(i.value) >= 10000 ? `${i.value > 0 && hasNeg ? "+" : ""}${(i.value / 1000).toFixed(1)}k` : `${i.value > 0 && hasNeg ? "+" : ""}${i.value}${lUnit}`;
          return {
            value: i.value,
            itemStyle: { color: i.color || (isNeg ? "#F43F5E" : "#4F46E5"), borderRadius: isNeg ? [0, 0, 6, 6] : [6, 6, 0, 0] },
            label: { show: true, position: isNeg ? "bottom" : "top", fontSize: 10.5, fontWeight: 600, color: "#334155", formatter: () => lbl }
          };
        })
      }]
    }, true);
  } else if (charts.left_type === "grouped_bar") {
    leftChartInst.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0, textStyle: { fontSize: 11, color: "#475569" } },
      grid: { left: 45, right: 18, top: 38, bottom: 42 },
      xAxis: { type: "category", data: charts.categories, axisLabel: { color: "#475569", fontSize: 10, interval: 0, rotate: charts.categories.some(c => c.length > 8) ? 18 : 0 } },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } }, axisLabel: { formatter: `{value}${lUnit}`, color: "#64748B", fontSize: 10.5 } },
      series: charts.series.map(s => ({
        name: s.name, type: "bar", barMaxWidth: 26,
        itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        label: { show: charts.series.length <= 2, position: "top", fontSize: 9.5, color: "#475569", formatter: `{c}${lUnit}` },
        data: s.data
      }))
    }, true);
  }

  // --- 右图渲染（支持正负双向横向条形图，零遮挡留白） ---
  if (charts.right_type === "hbar") {
    const list = charts.hbar_data;
    const vals = list.map(i => i.value);
    const maxV = Math.max(...vals, 0);
    const minV = Math.min(...vals, 0);
    const xMin = minV < 0 ? Math.floor(minV * 1.38) : 0;
    const xMax = maxV > 0 ? Math.ceil(maxV * 1.28) : 0;
    rightChartInst.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: p => `${p[0].name}<br/><b>${p[0].value.toLocaleString()}${rUnit}</b>` },
      grid: { left: 135, right: 56, top: 16, bottom: 24 },
      xAxis: {
        type: "value", min: xMin, max: xMax,
        splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
        axisLabel: { color: "#64748B", fontSize: 10.5, formatter: v => (Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + "k" : v) + rUnit }
      },
      yAxis: { type: "category", data: list.map(i => i.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#334155", fontWeight: 600, fontSize: 10.5 } },
      series: [{
        type: "bar", barWidth: "52%",
        data: list.map(i => {
          const isNeg = i.value < 0;
          const lbl = Math.abs(i.value) >= 10000 ? `${i.value > 0 && minV < 0 ? "+" : ""}${(i.value / 1000).toFixed(1)}k` : `${i.value > 0 && minV < 0 ? "+" : ""}${i.value}${rUnit}`;
          return {
            value: i.value,
            itemStyle: { color: i.color || (isNeg ? "#F43F5E" : "#4F46E5"), borderRadius: isNeg ? [5, 0, 0, 5] : [0, 5, 5, 0] },
            label: { show: true, position: isNeg ? "left" : "right", fontSize: 10.5, fontWeight: 600, color: "#334155", formatter: () => lbl }
          };
        })
      }]
    }, true);
  } else if (charts.right_type === "line") {
    const list = charts.line_data;
    rightChartInst.setOption({
      tooltip: { trigger: "axis", formatter: p => `${p[0].name}<br/><b>${p[0].value}${rUnit}</b>` },
      grid: { left: 46, right: 20, top: 28, bottom: 28 },
      xAxis: { type: "category", data: list.map(i => i.name), axisLabel: { color: "#64748B", fontSize: 10, interval: 1 } },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } }, axisLabel: { formatter: `{value}${rUnit}`, color: "#64748B", fontSize: 10.5 } },
      series: [{
        type: "line", smooth: true, symbolSize: 6,
        itemStyle: { color: "#4F46E5" }, lineStyle: { width: 2.5 },
        areaStyle: { color: "rgba(79, 70, 229, 0.12)" },
        data: list.map(i => i.value)
      }]
    }, true);
  }
}

function replayCurrentScenario() {
  clearReplayTimers();
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  showToast("▶ 正在按序重放 LangGraph 多 Agent 协作轨迹...");
  sc.nodes.forEach((_, idx) => {
    const timer = setTimeout(() => {
      currentNodeIdx = idx;
      renderNodes(sc.nodes, idx);
      document.getElementById("node-terminal").textContent = sc.nodes[idx].log;
      if (idx === sc.nodes.length - 1) setTimeout(() => renderNodes(sc.nodes, -1), 900);
    }, idx * 800);
    replayTimers.push(timer);
  });
}

function clearReplayTimers() { replayTimers.forEach(t => clearTimeout(t)); replayTimers = []; }

function handleRunClick() {
  const inputVal = document.getElementById("query-input").value.trim();
  const matchedIdx = window.DEMO_SNAPSHOTS.scenarios.findIndex(s => s.question === inputVal);
  if (matchedIdx !== -1) { selectScenario(matchedIdx); replayCurrentScenario(); }
  else { showToast("💡 当前为 GitHub Pages 零 API 演示模式，展示 6 大【人·货·场】真实运行快照。如需自由实时提问，请克隆仓库配置 API Key 运行 Notebook。"); }
}

function toggleTerminal() {
  const box = document.getElementById("terminal-wrapper");
  const btn = document.getElementById("toggle-log-btn");
  box.classList.toggle("hidden");
  btn.textContent = box.classList.contains("hidden") ? "展开详情" : "收起详情";
}

function copyReport() {
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  navigator.clipboard.writeText(sc.report_md || "").then(() => showToast("✅ 已复制完整 Markdown 专题诊断报告！"));
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("opacity-0", "pointer-events-none");
  setTimeout(() => t.classList.add("opacity-0", "pointer-events-none"), 3600);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}