// ==============================================================================
// BI Data Agent 独立前端控制引擎（零 API 消耗，纯 Snapshot 驱动）
// ==============================================================================
let currentScenarioIdx = 0;
let currentNodeIdx = 0;
let currentKbTab = "metrics";
let replayTimers = [];
let leftChartInst = null;
let rightChartInst = null;

// 初始化页面
window.addEventListener("DOMContentLoaded", () => {
  if (!window.DEMO_SNAPSHOTS) {
    showToast("❌ 未检测到 data/snapshots.js，请先在 Kaggle 运行导出脚本并放入 docs/data/ 目录！");
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

// 渲染左侧预设场景列表
function renderScenarioList() {
  const container = document.getElementById("scenario-list");
  const scenarios = window.DEMO_SNAPSHOTS.scenarios;
  const tagColors = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400"
  };

  container.innerHTML = scenarios.map((sc, idx) => {
    const active = idx === currentScenarioIdx;
    return `
      <button onclick="selectScenario(${idx})"
        class="w-full text-left p-3 rounded-xl border transition cursor-pointer ${
          active
            ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-900/40"
            : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
        }">
        <div class="text-[10px] font-bold tracking-wider uppercase mb-1 ${tagColors[sc.tag_color] || 'text-indigo-400'}">${sc.tag}</div>
        <div class="text-xs font-medium text-slate-100 leading-snug">${sc.short_title}</div>
      </button>
    `;
  }).join("");
}

// 切换左侧语义知识库 Tab
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

  const docs = tab === "metrics"
    ? window.DEMO_SNAPSHOTS.project_info.kb_metrics
    : window.DEMO_SNAPSHOTS.project_info.kb_schemas;

  document.getElementById("kb-list").innerHTML = docs.map(doc => {
    const splitIdx = doc.indexOf("】");
    const title = splitIdx > -1 ? doc.slice(1, splitIdx) : "语义规则";
    const body = splitIdx > -1 ? doc.slice(splitIdx + 1).trim() : doc;
    return `
      <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
        <div class="text-xs font-semibold text-indigo-300 mb-1">${escapeHtml(title)}</div>
        <div class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(body)}</div>
      </div>
    `;
  }).join("");
}

// 切换并加载完整场景
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
  document.getElementById("report-content").innerHTML = marked.parse(sc.report_md || "");
}

// 渲染 4 个 LangGraph 节点卡片
function renderNodes(nodes, replayingIdx) {
  const badgeStyles = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
    gray: "bg-slate-100 text-slate-500 border-slate-200"
  };

  document.getElementById("nodes-grid").innerHTML = nodes.map((n, idx) => {
    const isActive = idx === currentNodeIdx;
    const isReplaying = idx === replayingIdx;
    return `
      <div onclick="selectNode(${idx})"
        class="p-3.5 rounded-xl border cursor-pointer transition select-none ${
          isActive
            ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
        } ${isReplaying ? "node-replaying" : ""}">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <span class="text-xs font-bold text-slate-800 leading-tight">${escapeHtml(n.step)}</span>
          <span class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeStyles[n.badge_color] || badgeStyles.gray}">
            ${escapeHtml(n.badge)}
          </span>
        </div>
        <p class="text-[11px] text-slate-500 leading-relaxed">${escapeHtml(n.desc)}</p>
      </div>
    `;
  }).join("");
}

function selectNode(idx) {
  currentNodeIdx = idx;
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  renderNodes(sc.nodes, -1);
  document.getElementById("node-terminal").textContent = sc.nodes[idx].log;
}

// 渲染 KPI 卡片
function renderKpis(kpis) {
  const valColors = { up: "text-emerald-600", down: "text-rose-600", neutral: "text-slate-900" };
  document.getElementById("kpi-grid").innerHTML = kpis.map(k => `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div class="text-xs text-slate-500 font-medium mb-1.5">${escapeHtml(k.label)}</div>
      <div class="text-xl font-extrabold tracking-tight ${valColors[k.trend] || 'text-slate-900'}">${escapeHtml(k.value)}</div>
      <div class="text-[11px] text-slate-400 mt-1.5">${escapeHtml(k.sub)}</div>
    </div>
  `).join("");
}

// 渲染 ECharts 双图（彻底解决标签重叠）
function renderCharts(charts) {
  document.getElementById("left-chart-title").textContent = charts.left_title;
  document.getElementById("right-chart-title").textContent = charts.right_title;

  // --- 左图渲染 ---
  if (charts.left_type === "waterfall") {
    const w = charts.waterfall_data;
    const v0 = w.base_val, d1 = w.order_delta, d2 = w.aov_delta, v1 = w.end_val;
    const midAfter1 = v0 + d1;

    // 精确计算瀑布图透明底座与柱体高度（兼容任意正负号组合）
    const baseArr = [
      0,
      d1 >= 0 ? v0 : midAfter1,
      d2 >= 0 ? midAfter1 : v1,
      0
    ];
    const barArr = [
      { value: v0, realVal: v0, itemStyle: { color: "#64748B", borderRadius: [6, 6, 0, 0] } },
      { value: Math.abs(d1), realVal: d1, itemStyle: { color: d1 >= 0 ? "#10B981" : "#F43F5E", borderRadius: 4 } },
      { value: Math.abs(d2), realVal: d2, itemStyle: { color: d2 >= 0 ? "#10B981" : "#F43F5E", borderRadius: 4 } },
      { value: v1, realVal: v1, itemStyle: { color: "#4F46E5", borderRadius: [6, 6, 0, 0] } }
    ];

    const minAnchor = Math.min(v0, v1, midAfter1);
    const spread = Math.max(Math.abs(d1), Math.abs(d2), Math.abs(v1 - v0), v0 * 0.05);
    const yMin = Math.max(0, Math.floor((minAnchor - spread * 0.9) / 10000) * 10000);

    leftChartInst.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params) => {
          const item = params[1];
          const rv = item.data.realVal;
          const sign = (item.dataIndex === 1 || item.dataIndex === 2) && rv >= 0 ? "+" : "";
          return `${item.name}<br/>金额: <b>${sign}R$ ${rv.toLocaleString()}</b>`;
        }
      },
      grid: { left: 60, right: 20, top: 32, bottom: 28 },
      xAxis: { type: "category", data: [w.base_label, w.order_label, w.aov_label, w.end_label], axisLine: { lineStyle: { color: "#CBD5E1" } } },
      yAxis: { type: "value", min: yMin, splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } }, axisLabel: { formatter: v => (v / 1000).toFixed(0) + "k", color: "#64748B" } },
      series: [
        { name: "底座", type: "bar", stack: "wf", silent: true, itemStyle: { borderColor: "transparent", color: "transparent" }, data: baseArr },
        {
          name: "金额", type: "bar", stack: "wf", barWidth: "42%",
          label: {
            show: true, position: "top", fontWeight: "bold", fontSize: 11, color: "#334155",
            formatter: (p) => {
              const rv = p.data.realVal;
              const prefix = (p.dataIndex === 1 || p.dataIndex === 2) && rv >= 0 ? "+" : "";
              return `${prefix}${(rv / 1000).toFixed(1)}k`;
            }
          },
          data: barArr
        }
      ]
    }, true);
  } else if (charts.left_type === "bar_simple" || charts.left_type === "bar_compare") {
    const list = charts.left_type === "bar_simple" ? charts.bar_data : charts.compare_data;
    leftChartInst.setOption({
      tooltip: { trigger: "axis", formatter: p => `${p[0].name}<br/><b>R$ ${p[0].value.toLocaleString()}</b>` },
      grid: { left: 60, right: 20, top: 30, bottom: 28 },
      xAxis: { type: "category", data: list.map(i => i.name), axisLabel: { color: "#64748B", fontSize: 11 } },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } }, axisLabel: { formatter: v => (v / 1000).toFixed(0) + "k", color: "#64748B" } },
      series: [{
        type: "bar", barWidth: "45%",
        label: { show: true, position: "top", fontSize: 11, color: "#334155", formatter: p => (p.value / 1000).toFixed(1) + "k" },
        data: list.map(i => ({ value: i.value, itemStyle: { color: i.color || "#4F46E5", borderRadius: [6, 6, 0, 0] } }))
      }]
    }, true);
  }

  // --- 右图渲染 ---
  if (charts.right_type === "hbar") {
    const list = charts.hbar_data;
    const vals = list.map(i => i.value);
    const maxV = Math.max(...vals, 0);
    const minV = Math.min(...vals, 0);
    // 为正负两端数值标签留出 35% 安全留白，彻底杜绝数字与左侧Y轴文字重叠！
    const xMin = minV < 0 ? Math.floor(minV * 1.38) : 0;
    const xMax = maxV > 0 ? Math.ceil(maxV * 1.32) : 0;

    rightChartInst.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 95, right: 30, top: 15, bottom: 25 },
      xAxis: {
        type: "value", min: xMin, max: xMax,
        splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } },
        axisLabel: { color: "#64748B", fontSize: 11, formatter: v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v }
      },
      yAxis: {
        type: "category", data: list.map(i => i.name),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: "#334155", fontWeight: 600, fontSize: 11 }
      },
      series: [{
        type: "bar", barWidth: "52%",
        data: list.map(i => {
          const isNeg = i.value < 0;
          return {
            value: i.value,
            itemStyle: { color: isNeg ? "#F43F5E" : "#10B981", borderRadius: isNeg ? [4, 0, 0, 4] : [0, 4, 4, 0] },
            label: {
              show: true,
              position: isNeg ? "left" : "right",
              color: isNeg ? "#E11D48" : "#059669",
              fontWeight: 600, fontSize: 11,
              formatter: (p) => {
                const v = p.value;
                const sign = v > 0 ? "+" : "";
                return Math.abs(v) >= 1000 ? `${sign}${(v / 1000).toFixed(1)}k` : `${sign}${v}`;
              }
            }
          };
        })
      }]
    }, true);
  } else if (charts.right_type === "line") {
    const list = charts.line_data;
    rightChartInst.setOption({
      tooltip: { trigger: "axis", formatter: p => `${p[0].name}<br/>取消率: <b>${p[0].value}%</b>` },
      grid: { left: 50, right: 25, top: 30, bottom: 28 },
      xAxis: { type: "category", data: list.map(i => i.name), axisLabel: { color: "#64748B", fontSize: 11 } },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#E2E8F0" } }, axisLabel: { formatter: "{value}%", color: "#64748B" } },
      series: [{
        type: "line", smooth: true, symbolSize: 8,
        itemStyle: { color: "#F43F5E" }, lineStyle: { width: 3 },
        areaStyle: { color: "rgba(244, 63, 94, 0.12)" },
        label: { show: true, position: "top", formatter: "{c}%", fontSize: 11, color: "#E11D48" },
        data: list.map(i => i.value)
      }]
    }, true);
  }
}

// 步进重放链路动效
function replayCurrentScenario() {
  clearReplayTimers();
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  showToast("▶ 正在按序重放 LangGraph 多 Agent 协作轨迹...");

  sc.nodes.forEach((_, idx) => {
    const timer = setTimeout(() => {
      currentNodeIdx = idx;
      renderNodes(sc.nodes, idx);
      document.getElementById("node-terminal").textContent = sc.nodes[idx].log;
      if (idx === sc.nodes.length - 1) {
        setTimeout(() => renderNodes(sc.nodes, -1), 900);
      }
    }, idx * 850);
    replayTimers.push(timer);
  });
}

function clearReplayTimers() {
  replayTimers.forEach(t => clearTimeout(t));
  replayTimers = [];
}

// 顶部运行按钮交互（保护性引导）
function handleRunClick() {
  const inputVal = document.getElementById("query-input").value.trim();
  const matchedIdx = window.DEMO_SNAPSHOTS.scenarios.findIndex(s => s.question === inputVal);
  if (matchedIdx !== -1) {
    selectScenario(matchedIdx);
    replayCurrentScenario();
  } else {
    showToast("💡 当前为 GitHub Pages 零 API 演示模式，仅支持回放左侧 3 个真实运行快照。如需实时提问，请克隆仓库并在 Notebook 配置个人 LLM_API_KEY 运行。");
  }
}

function toggleTerminal() {
  const box = document.getElementById("terminal-wrapper");
  const btn = document.getElementById("toggle-log-btn");
  if (box.classList.contains("hidden")) {
    box.classList.remove("hidden");
    btn.textContent = "收起详情";
  } else {
    box.classList.add("hidden");
    btn.textContent = "展开详情";
  }
}

function copyReport() {
  const sc = window.DEMO_SNAPSHOTS.scenarios[currentScenarioIdx];
  navigator.clipboard.writeText(sc.report_md || "").then(() => {
    showToast("✅ 已复制完整 Markdown 诊断报告文本！");
  });
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
