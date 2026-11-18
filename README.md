# BI Data Agent：基于多Agent协作的智能数据分析

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange.svg)](https://github.com/langchain-ai/langgraph)
[![ChromaDB](https://img.shields.io/badge/RAG-ChromaDB-green.svg)](https://www.trychroma.com/)
[![Version](https://img.shields.io/badge/Version-v1.0-brightgreen.svg)]()

> **项目定位**：针对传统BI取数链路长、常规Text-to-SQL在复杂数仓语义下准确率低且只能“查数”不能“归因”的痛点，结合商业分析实战经验，基于**LangGraph + BI语义RAG + SQL 自纠错沙盒** 构建端到端智能归因分析Agent，并在 **15道分层评测集（Easy / Medium / Hard）** 上完成量化评估。

---

## 一、 解决的核心业务痛点

市面上的通用Text-to-SQL方案只注入建表语句（DDL），在真实电商/交易分析中极易踩坑。本项目在Olist真实电商8张关联表数仓上，重点攻克了以下 **4 类高频业务陷阱**：

1. **指标口径不对齐**：如“有效 GMV”需剔除 `canceled` 等未送达订单且不含运费；“订单取消率”分母需包含全量状态订单。
2. **业务实体粒度错位**：区分单次订单会话级 `customer_id` 与自然人唯一标识 `customer_unique_id`，解决 UV、周期复购率、历史新老客归因算错问题。
3. **一对多关联扇出膨胀**：当按支付方式（`order_payments`）筛选统计商品明细（`order_items`）GMV 时，防止直接 Join 导致金额翻倍虚高。
4. **语法方言与静默空结果**：拦截 SQLite 函数不兼容报错以及因过滤条件失误导致的 `0行空表` / `全Null` 结果，触发大模型自我反思重写。

---

## 二、 V1.0 系统架构流程

> 本项目当前为 **V1.0 版本**，核心实现 **BI语义知识库**、**带自纠错的Text-to-SQL引擎** 与 **四角色LangGraph归因工作流**。

```mermaid
flowchart TD
    classDef userNode fill:#2B2D42,stroke:#8D99AE,stroke-width:2px,color:#FFFFFF,font-weight:bold;
    classDef ragNode fill:#D1E7DD,stroke:#198754,stroke-width:2px,color:#0F5132;
    classDef agentNode fill:#CFE2FF,stroke:#0D6EFD,stroke-width:2px,color:#084298,font-weight:bold;
    classDef guardNode fill:#F8D7DA,stroke:#DC3545,stroke-width:2px,color:#842029,font-weight:bold;

    User(["👤 业务方异动分析提问"]):::userNode --> Planner["🧠 1. Planner Agent<br/>(拆解大盘量价 / 区域 / 品类正交维度)"]:::agentNode
    
    subgraph SemanticRAG ["📚 BI语义知识库 (ChromaDB)"]
        KB1["🗂️ 8张表主外键 Schema"]:::ragNode
        KB2["📏 10大业务口径与防膨胀规范"]:::ragNode
        KB3["💎 Golden SQL 范式样本"]:::ragNode
    end

    Planner --> SQLExec["🔍 2. SQL Executor Agent"]:::agentNode
    SemanticRAG -. "动态检索上下文" .-> SQLExec
    
    SQLExec --> Sandbox["🗄️ SQLite 沙盒执行与断言校验"]:::agentNode
    Sandbox -- "❌ 语法报错 / 0行空表 / 全Null" --> SelfCorr["🔧 Self-Correction 自反思重写<br/>(最多重试 3 次)"]:::guardNode
    SelfCorr --> SQLExec
    
    Sandbox -- "✅ 提取真实多维数据表" --> Analyst["📐 3. Python Analyst Agent<br/>(计算环比MoM%与异动贡献度)"]:::agentNode
    Analyst --> Reporter["📝 4. Reporter Agent<br/>(生成结构化商业归因诊断报告)"]:::agentNode
    Reporter --> FinalOut(["📊 输出对比图表与高管诊断报告"]):::userNode
