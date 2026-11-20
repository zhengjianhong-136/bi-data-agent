# BI Data Agent：基于异构多 Agent 协作的智能数据分析与归因系统

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange.svg)](https://github.com/langchain-ai/langgraph)
[![ChromaDB](https://img.shields.io/badge/RAG-Hybrid_RRF-green.svg)](https://www.trychroma.com/)
[![Benchmark](https://img.shields.io/badge/15--Q_Benchmark-100.0%25_(Pass%401.13)-brightgreen.svg)]()
[![Release](https://img.shields.io/badge/Version-v1.5.0-blue.svg)]()

> 🚀 **[点击在线体验交互式工作台 Demo（零 API 消耗真实轨迹回放）](https://zhengjianhong-136.github.io/bi-data-agent/)**

> **项目定位**：针对传统 BI 取数链路长、常规 Text-to-SQL 在复杂业务语义下准确率低（公平基线仅 **33.3%**，Hard 题仅 **20.0%**）且缺乏严谨归因与幻觉治理的痛点，本项目基于 **LangGraph + 异构多模型路由 + 中文混合检索 RAG + 确定性 LMDI 沙盒 + 双模防幻觉审计（Hybrid Judge）** 构建企业级智能数据分析 Agent，并将 15 道分层业务评测集准确率从基线 **33.3%** 迭代提升至 **100.0%**。

---

##  一、 V1.0 → V1.5 量化迭代成果（15 题分层黄金评测集）

基于 Olist 真实电商 8 表数仓，构造涵盖 **Easy (L1) / Medium (L2) / Hard (L3)** 的 15 道高含金量业务口径评测题（覆盖有效 GMV、自然人 `customer_unique_id` 去重 UV、AOV/ASP 分母区分、履约延迟率、**一对多防扇出膨胀 Fan-out Trap**、周期复购率 CTE、历史首单老客归因、帕累托 Top3 集中度与跨月双门槛环比）：

| 难度等级 | 题目数 | 公平 Baseline<br>*(无口径RAG)* | V1.0<br>*(平权轮询 + 纯向量RAG)* | **V1.5 (Current)**<br>*(异构路由 + 中文混合RAG + Debugger)* | V1.5 平均执行次数 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Easy (L1)** | 5 | 40.0% | 100.0% | **100.0%** | 1.0 |
| **Medium (L2)** | 5 | 40.0% | 80.0% | **100.0%** | 1.4 |
| **Hard (L3)** | 5 | 20.0% | 80.0% | **100.0%** | **1.0** |
| **Overall (总计)** | **15** | **33.3%** | **86.7%** *(1.47次)* | **100.0%** | **1.13** |

### V1.0 → V1.5 核心 Bad Case 归因与工程破局
* **破局 1（解决 Hard 题漏表报错）**：诊断发现 ChromaDB 默认英文向量模型（`all-MiniLM-L6-v2`）对中文词“英文商品品类”检索失效，导致 `category_translation` 被挤出 Top-9。V1.5 采用 **Schema 物理隔离常驻 + 中文 2-gram 与向量 RRF 混合重排**，Hard 题平均执行次数直接降至 **1.0 次（Pass@1 = 100%）**。
* **破局 2（消除弱模型方差与 100s 超时黑洞）**：淘汰平权轮询（避免轻量 Flash 模型随机撞上中难 SQL），重构为**基于角色的异构多模型路由器**并引入短超时熔断与体检预冷却。
* **破局 3（引入独立异构 Debugger Agent）**：Agent A 报错后移交高阶推理模型，配备 `list_all_tables / search_columns / peek_values / scan_all_kb` 四大只读主动探查工具破案重跑，并通过**防投毒静态口径门控**沉淀新经验。

---

## 二、 V1.5 全闭环系统架构

```mermaid
flowchart TD
    classDef userNode fill:#2B2D42,stroke:#8D99AE,stroke-width:2px,color:#FFFFFF,font-weight:bold;
    classDef gatewayNode fill:#FFF3CD,stroke:#FFCA2C,stroke-width:2px,color:#664D03,font-weight:bold;
    classDef ragNode fill:#D1E7DD,stroke:#198754,stroke-width:2px,color:#0F5132;
    classDef agentNode fill:#CFE2FF,stroke:#0D6EFD,stroke-width:2px,color:#084298,font-weight:bold;
    classDef mathNode fill:#E2D9F3,stroke:#6F42C1,stroke-width:2px,color:#432874,font-weight:bold;
    classDef guardNode fill:#F8D7DA,stroke:#DC3545,stroke-width:2px,color:#842029,font-weight:bold;

    User(["👤 业务方自然语言提问"]):::userNode --> Router{"🚦 0. Gateway 快慢路由<br/>(Zhipu-GLM4-Flash)"}:::gatewayNode

    Router -- "时间/口径缺失" --> Clarify(["💬 CLARIFY 主动反问澄清<br/>(Human-in-the-Loop, 0 SQL)"]):::guardNode
    Router -- "单点明确查询" --> FastSQL["⚡ FAST_SQL 极速单步查数<br/>(节省 ~75% Token)"]:::agentNode
    Router -- "复杂异动诊断" --> Planner["🧠 1. Planner Agent<br/>(Qwen3.5-35B 拆解纯中文任务)"]:::agentNode

    subgraph SemanticRAG ["📚 企业级分层语义底座"]
        KB1["🗂️ 8表紧凑 Schema 常驻隔离<br/>(LEFT JOIN 防分母丢失铁律)"]:::ragNode
        KB2["📏 10大口径 + Golden SQL<br/>(中文 2-gram + 向量 RRF 混合检索)"]:::ragNode
    end

    Planner --> SQLExec["🔍 2. Agent A: SQL Generator<br/>(Qwen3.8-27B + 只读安全护栏)"]:::agentNode
    FastSQL --> SQLExec
    SemanticRAG -. "上下文注入" .-> SQLExec

    SQLExec --> Sandbox{"🗄️ SQLite 沙盒执行校验"}:::agentNode
    Sandbox -- "❌ 语法错 / 空表 / 全Null" --> Debugger["🕵️ Agent B: 独立 Debugger<br/>(Qwen3.5-35B + 4大主动查库工具)"]:::gatewayNode
    Debugger -- "修复重跑 + 防投毒沉淀" --> Sandbox

    Sandbox -- "✅ 提取真实多维数据" --> MathBox["📐 3. Python 确定性数学沙盒<br/>(LMDI 无残差分解=0.00 + <1%长尾降噪)"]:::mathNode
    MathBox --> Reporter["📝 4. Reporter Agent<br/>(Qwen3.8-27B 撰写商业报告)"]:::agentNode
    Reporter --> Judge{"⚖️ 5. Hybrid Judge 双模审计<br/>(Python正则溯源 + 异源Google Gemini)"}:::guardNode
    Judge -- "❌ 发现数值偏差/幻觉 (打回重写)" --> Reporter
    Judge -- "✅ 溯源100% · 忠实度5/5" --> FinalOut(["📊 高管归因报告与动态轨迹图"]):::userNode
```

---

## 三、 异构多模型 FinOps 角色分工

摒弃“单一模型包打天下”与“无差别平权轮询”，按子 Agent 能力诉求匹配多厂商模型，并实现**跨厂商异源审计（消除同源模型自夸偏见）**：

| Agent 角色 | 逻辑分组 | 首选模型通道 | 核心设计考量 |
| :--- | :---: | :--- | :--- |
| **Gateway 意图网关** | `fast` | `Zhipu-GLM4-Flash` | `<1s` 极速响应、零成本拦截模糊提问与快慢分流 |
| **SQL Generator (Agent A)** | `coder` | `ModelScope-Qwen3.8-27B` | 中文语义理解与 SQLite 指令遵循极稳，禁止弱模型写复杂 SQL |
| **Planner & Debugger (Agent B)** | `reasoner` / `debugger` | `ModelScope-Qwen3.5-35B` | 仅在复杂拆解与 SQL 报错时按需触发，配备 4 大探查工具破案 |
| **Reporter 报告撰写** | `writer` | `ModelScope-Qwen3.8-27B` | 中文商业分析语感自然，严格基于 Python 确定性真值包成文 |
| **Hybrid Judge 幻觉审计** | `judge` | `Google-Gemini-3.5-Flash` | **跨厂商异源裁判**（Google 审阿里 Qwen），配合正则硬溯源杜绝幻觉 |

---

## 四、 仓库目录结构

```text
bi-data-agent/
├── README.md                                 # 项目总览、架构图与量化迭代报告
├── requirements.txt                          # Python 环境依赖清单
├── notebooks/
│   ├── 01_bi_attribution_agent_v1.ipynb      # V1.0 初始版本（保留演进基线）
│   └── 02_bi_agent_v1.5_hardened.ipynb       # V1.5 完整闭环加固版（异构路由/LMDI/Hybrid Judge）
├── docs/                                     # 独立解耦的 GitHub Pages 静态交互工作台
│   ├── index.html                            # 零构建前端界面 (Tailwind + ECharts)
│   ├── app.js                                # 轨迹步进重放与图表引擎
│   └── data/snapshots.js                     # 从 Kaggle 真实数仓导出的 4 场景轨迹快照
└── assets/                                   # 架构与图表静态资源
```

---

## 五、 迭代路线图 (Roadmap)

- [x] **v1.0.0**：8 表本地数仓、10 大核心业务口径、SQL 自纠错、4-Agent 异动归因流与 15 题分层评测集（准确率 `86.7%`）。
- [x] **v1.5.0 (Current)**：异构多模型 FinOps 路由、Schema 隔离 + 中文 RRF 混合检索、独立 Debugger 主动查库 Agent、确定性 LMDI 无残差分解、Gateway 三路网关、Hybrid Judge 跨厂商审计打回闭环（15 题准确率 **`100.0%`**，报告正则溯源 **`100.0%`**，忠实度 **`5/5`**）。
- [ ] **v2.0.0 (Planned)**：向泛化商业分析系统（AI Data Analyst）演进——引入多分析范式 Playbook（客户复购留存、RFM 价值分层、非结构化评论 NLP 情感归因）与持久化经验库。
