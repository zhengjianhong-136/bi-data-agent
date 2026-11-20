window.DEMO_SNAPSHOTS = {
  "project_info": {
    "title": "BI Data Agent v1.5",
    "subtitle": "异构多模型 · 混合RAG · Hybrid Judge",
    "benchmark": {
      "overall": "100.0%",
      "easy": "100%",
      "medium": "100%",
      "hard": "100%",
      "total": 15
    },
    "kb_count": 19,
    "kb_metrics": [
      "【口径1：有效订单与有效GMV (Net Valid GMV)】除非特别说明，所有‘有效订单’、‘有效GMV’、‘销售额’均要求过滤 orders.order_status = 'delivered'。有效GMV = SUM(order_items.price)，即仅统计商品售价总和，不含运费(freight_value)。",
      "【口径2：独立买家数 (UV)】统计买家人数、独立客户数或UV时，必须关联 customers 表并使用 COUNT(DISTINCT customers.customer_unique_id)，严禁使用 COUNT(DISTINCT customer_id)！",
      "【口径3：客单价 (AOV) 与 件单价 (ASP) 区分】有效客单价 (AOV) = SUM(order_items.price) / COUNT(DISTINCT orders.order_id)，分母必须是去重后的有效订单数；有效件单价 (ASP) = SUM(order_items.price) / COUNT(order_items.order_item_id)，分母是商品件数（明细行数）。",
      "【口径4：订单连带率 (UPT / Attach Rate)】指平均每笔有效订单包含的商品件数，计算公式为：COUNT(order_items.order_item_id) * 1.0 / COUNT(DISTINCT orders.order_id)（需限定 order_status = 'delivered'）。",
      "【口径5：订单取消率 (Order Cancellation Rate)】在指定下单时间范围内所有订单中，状态为 canceled 的订单占比，公式：SUM(CASE WHEN order_status = 'canceled' THEN 1.0 ELSE 0.0 END) * 100.0 / COUNT(DISTINCT order_id)。注意：算取消率时 WHERE 条件不能过滤 order_status = 'delivered'！",
      "【口径6：平均履约时长 (Avg Delivery Days) 与 履约延迟率 (Delay Rate)】均限定在 order_status = 'delivered' 且 order_delivered_customer_date IS NOT NULL 的订单中。平均履约时长(天) = AVG(julianday(order_delivered_customer_date) - julianday(order_purchase_timestamp))；履约延迟率(%) = AVG(CASE WHEN julianday(order_delivered_customer_date) > julianday(order_estimated_delivery_date) THEN 1.0 ELSE 0.0 END) * 100.0。",
      "【口径7：有效订单差评率 (Bad Review Rate)】在已送达(delivered)且关联到评价表(order_reviews)的订单中，评分 <= 2 分的去重订单数除以总参评去重有效订单数，公式：COUNT(DISTINCT CASE WHEN r.review_score <= 2 THEN o.order_id END) * 100.0 / COUNT(DISTINCT o.order_id)。必须用 INNER JOIN order_reviews r ON o.order_id = r.order_id。",
      "【口径8：防扇出膨胀规范（一对多关联防笛卡尔积 Fan-out Trap）】由于 order_items（一单多品）和 order_payments（一单多次支付）或 order_reviews 同属订单的下游一对多明细表，当需要按支付方式（如 credit_card）筛选并统计商品有效GMV（SUM(oi.price)）时，严禁直接将 order_items 与 order_payments 直接 JOIN 后求和！必须使用子查询过滤：WHERE o.order_id IN (SELECT DISTINCT order_id FROM order_payments WHERE payment_type = 'credit_card')。",
      "【口径9：周期用户复购率 (Repeat Purchase Rate)】在指定统计周期内产生过有效订单(delivered)的独立买家中，有效订单数 >= 2 笔的独立买家占比(%)。必须先用 CTE 按 customer_unique_id 聚合计算 order_cnt = COUNT(DISTINCT o.order_id)，再用 SUM(CASE WHEN order_cnt >= 2 THEN 1.0 ELSE 0.0 END) * 100.0 / COUNT(customer_unique_id)。",
      "【口径10：新老客界定口径 (New vs Returning Customer)】以真实用户 customer_unique_id 在全量历史有效订单(delivered)中的首次下单时间 min_purchase_time = MIN(order_purchase_timestamp) 为准。若某用户在全量历史中的首次有效下单时间早于目标统计周期的起始时间（例如分析2018-08时，其首次有效下单时间 < '2018-08-01'），则该用户在目标周期内属于【老客】；否则属于【新客】。",
      "【参考范式1：防扇出膨胀（统计特定支付方式下的有效GMV）】\n    SELECT ROUND(SUM(oi.price), 2) AS val\n    FROM orders o\n    JOIN order_items oi ON o.order_id = oi.order_id\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n      AND o.order_id IN (SELECT DISTINCT order_id FROM order_payments WHERE payment_type = 'credit_card');",
      "【参考范式2：使用 CTE 计算周期用户复购率(%)】\n    WITH user_orders AS (\n        SELECT c.customer_unique_id, COUNT(DISTINCT o.order_id) AS ord_cnt\n        FROM orders o\n        JOIN customers c ON o.customer_id = c.customer_id\n        WHERE o.order_status = 'delivered'\n          AND strftime('%Y', o.order_purchase_timestamp) = '2018'\n        GROUP BY c.customer_unique_id\n    )\n    SELECT ROUND(SUM(CASE WHEN ord_cnt >= 2 THEN 1.0 ELSE 0.0 END) * 100.0 / COUNT(customer_unique_id), 2) AS val\n    FROM user_orders;",
      "【参考范式3：使用 CTE 界定历史老客并统计其在目标月份贡献的有效GMV】\n    WITH user_first_order AS (\n        SELECT c.customer_unique_id, MIN(o.order_purchase_timestamp) AS first_order_time\n        FROM orders o\n        JOIN customers c ON o.customer_id = c.customer_id\n        WHERE o.order_status = 'delivered'\n        GROUP BY c.customer_unique_id\n    )\n    SELECT ROUND(SUM(oi.price), 2) AS val\n    FROM orders o\n    JOIN order_items oi ON o.order_id = oi.order_id\n    JOIN customers c ON o.customer_id = c.customer_id\n    JOIN user_first_order ufo ON c.customer_unique_id = ufo.customer_unique_id\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n      AND ufo.first_order_time < '2018-08-01';"
    ],
    "kb_schemas": [
      "【表结构：orders (订单主表)】主键: order_id | 关联键: customer_id | 字段: order_status(状态: delivered已送达, canceled已取消, shipped已发货等), order_purchase_timestamp(下单时间), order_approved_at(支付审批时间), order_delivered_customer_date(实际送达客户时间), order_estimated_delivery_date(预计送达时间)。",
      "【表结构：order_items (订单商品明细表)】联合主键: (order_id, order_item_id) | 字段: product_id(商品ID), seller_id(卖家ID), price(单件商品售价，不含运费), freight_value(单件商品运费)。注意：一笔订单买N件商品就会有N行记录！",
      "【表结构：order_payments (订单支付明细表)】联合主键: (order_id, payment_sequential) | 字段: payment_type(支付方式: credit_card, boleto, voucher, debit_card), payment_installments(分期数), payment_value(该笔支付金额)。注意：一笔订单可能有多次支付记录（多行）！",
      "【表结构：customers (客户表)】主键: customer_id(单笔订单绑定的临时客户ID) | 核心字段: customer_unique_id(客户真实唯一标识ID，同一个人在不同订单中 customer_unique_id 相同，但 customer_id 不同！), customer_city, customer_state(州缩写，如 'SP', 'RJ', 'MG')。",
      "【表结构：products & category_translation (商品与英文品类映射表)】products表主键: product_id，含葡萄牙语品类名 product_category_name；必须通过 LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name 获取英文品类名 product_category_name_english。",
      "【表结构：order_reviews (订单评价表)】字段: review_id, order_id, review_score(评分1到5分)。注意：同一个 order_id 可能存在多条评价记录。"
    ]
  },
  "scenarios": [
    {
      "id": "deep_attribution",
      "tag": "DEEP ATTRIBUTION",
      "tag_color": "indigo",
      "short_title": "2018年8月 vs 7月 大盘异动归因",
      "question": "对比 2018年7月（2018-07）与 2018年8月（2018-08），分析有效GMV变动的原因，并从量价漏斗、省份区域、英文商品品类维度计算异动贡献度。",
      "route_name": "SLOW_ATTRIBUTION（异构多Agent + LMDI + Hybrid Judge）",
      "guard_badge": "正则溯源 100.0% · Gemini 审计 5/5",
      "meta_stats": "SQL重试 0 次 · LMDI残差 0.0 · 报告生成 1 次",
      "kpis": [
        {
          "label": "8月有效 GMV",
          "value": "$ 838,576.64",
          "sub": "7月基期: $ 867,953.46",
          "trend": "neutral"
        },
        {
          "label": "环比增量 / MoM%",
          "value": "$ -29,376.82 (-3.38%)",
          "sub": "有效GMV环比变动",
          "trend": "down"
        },
        {
          "label": "LMDI 单量驱动",
          "value": "$ +26,190.82",
          "sub": "订单 6,159 → 6,351 (残差=0)",
          "trend": "up"
        },
        {
          "label": "LMDI 客单价驱动",
          "value": "$ -55,567.64",
          "sub": "AOV $ 140.92 → $ 132.04",
          "trend": "down"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway & Planner",
          "badge": "Qwen35B",
          "badge_color": "green",
          "desc": "Zhipu-Flash 分流 + Qwen35B 拆解 3 路纯中文任务",
          "log": "[Gateway | Role=fast] 路由决策: SLOW_ATTRIBUTION (用户明确指定了对比时间段（2018-07与2018-08），且核心诉求是分析有效GMV变动原因，要求从量价漏斗、省份区域、英文商品品类维度计算异动贡献度，属于典型的对比归因与多维拆解问题。)\n[Planner | Role=reasoner] 拆解结果 (纯中文任务，严禁越界写SQL):\n[\n  \"查询并对比 2018 年 7 月与 2018 年 8 月的有效 GMV、有效订单数、有效客单价、独立买家 UV 以及履约延迟率等大盘核心指标数据。\",\n  \"下钻分析 2018 年 7 月与 2018 年 8 月各省份区域维度下，头部客户所在州的有效 GMV 与有效订单数变动情况。\",\n  \"统计并对比 2018 年 7 月与 2018 年 8 月头部英文商品品类名称下的有效 GMV 贡献度变化。\"\n]"
        },
        {
          "step": "2. SQL Agent + Debugger",
          "badge": "重试0次",
          "badge_color": "teal",
          "desc": "中文 Hybrid RAG + 只读安全护栏 + 异构排障兜底",
          "log": "[SQL Executor | Role=coder -> Qwen3.8-27B] Debugger介入: False\n--- 子任务 1: 查询并对比 2018 年 7 月与 2018 年 8 月的有效 GMV、有效订单数、有效客单价、独立买家 UV 以及履约延迟率等大盘核心指标数据。\nSELECT\n  strftime('%Y-%m', o.order_purchase_timestamp) AS stat_month,\n  ROUND(SUM(oi.price), 2) AS valid_gmv,\n  COUNT(DISTINCT o.order_id) AS valid_order_cnt,\n  ROUND(\n    SUM(oi.price) * 1.0 / NULLIF(COUNT(DISTINCT o.order_id), 0),\n    2\n  ) AS valid_aov,\n  COUNT(DISTINCT c.customer_unique_id) AS uv,\n  ROUND(\n    COUNT(DISTINCT CASE\n      WHEN o.order_delivered_customer_date IS NOT NULL\n       AND o.order_estimated_delivery_date IS NOT NULL\n       AND julianday(o.order_delivered_customer_date) - julianday(o.order_estimated_delivery_date) > 0\n      THEN o.order_id\n    END) * 100.0 / NULLIF(COUNT(DISTINCT o.order_id), 0),\n    2\n  ) AS fulfillment_delay_rate\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_status = 'delivered'\n  AND strftime('%Y-%m', o.order_purchase_timestamp) IN ('2018-07', '2018-08')\nGROUP BY strftime('%Y-%m', o.order_purchase_timestamp)\nORDER BY stat_month;\n\n--- 子任务 2: 下钻分析 2018 年 7 月与 2018 年 8 月各省份区域维度下，头部客户所在州的有效 GMV 与有效订单数变动情况。\nWITH monthly_customer_gmv AS (\n    SELECT \n        strftime('%Y-%m', o.order_purchase_timestamp) AS month,\n        c.customer_state,\n        c.customer_unique_id,\n        SUM(oi.price) AS cust_gmv,\n        COUNT(DISTINCT o.order_id) AS cust_orders\n    FROM orders o\n    JOIN customers c ON o.customer_id = c.customer_id\n    JOIN order_items oi ON o.order_id = oi.order_id\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) IN ('2018-07', '2018-08')\n    GROUP BY strftime('%Y-%m', o.order_purchase_timestamp), c.customer_state, c.customer_unique_id\n),\nranked_customers AS (\n    SELECT \n        month,\n        customer_state,\n        customer_unique_id,\n        cust_gmv,\n        cust_orders,\n        ROW_NUMBER() OVER (PARTITION BY month, customer_state ORDER BY cust_gmv DESC) AS rnk\n    FROM monthly_customer_gmv\n)\nSELECT \n    rc.month,\n    rc.customer_state,\n    ROUND(SUM(rc.cust_gmv), 2) AS top_customer_valid_gmv,\n    SUM(rc.cust_orders) AS top_customer_valid_orders\nFROM ranked_customers rc\nWHERE rc.rnk <= 10\nGROUP BY rc.month, rc.customer_state\nORDER BY rc.month ASC, top_customer_valid_gmv DESC;\n\n--- 子任务 3: 统计并对比 2018 年 7 月与 2018 年 8 月头部英文商品品类名称下的有效 GMV 贡献度变化。\nWITH monthly_category_gmv AS (\n    SELECT \n        strftime('%Y-%m', o.order_purchase_timestamp) AS month_str,\n        COALESCE(t.product_category_name_english, 'unknown') AS category_english,\n        SUM(oi.price) AS category_gmv\n    FROM orders o\n    JOIN order_items oi ON o.order_id = oi.order_id\n    LEFT JOIN products p ON oi.product_id = p.product_id\n    LEFT JOIN category_translation t ON p.product_category_name = t.product_category_name\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) IN ('2018-07', '2018-08')\n    GROUP BY strftime('%Y-%m', o.order_purchase_timestamp), COALESCE(t.product_category_name_english, 'unknown')\n),\nmonthly_total_gmv AS (\n    SELECT \n        strftime('%Y-%m', o.order_purchase_timestamp) AS month_str,\n        SUM(oi.price) AS total_gmv\n    FROM orders o\n    JOIN order_items oi ON o.order_id = oi.order_id\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) IN ('2018-07', '2018-08')\n    GROUP BY strftime('%Y-%m', o.order_purchase_timestamp)\n),\nranked_categories AS (\n    SELECT \n        mcg.month_str,\n        mcg.category_english,\n        mcg.category_gmv,\n        mtg.total_gmv,\n        ROUND(mcg.category_gmv * 100.0 / mtg.total_gmv, 4) AS gmv_contribution_pct,\n        ROW_NUMBER() OVER (PARTITION BY mcg.month_str ORDER BY mcg.category_gmv DESC) as rk\n    FROM monthly_category_gmv mcg\n    JOIN monthly_total_gmv mtg ON mcg.month_str = mtg.month_str\n)\nSELECT \n    month_str,\n    category_english,\n    ROUND(category_gmv, 2) AS category_gmv,\n    ROUND(total_gmv, 2) AS total_gmv,\n    gmv_contribution_pct,\n    rk AS category_rank\nFROM ranked_categories\nWHERE rk <= 10\nORDER BY month_str, rk;"
        },
        {
          "step": "3. Python LMDI 沙盒",
          "badge": "残差=0.0",
          "badge_color": "purple",
          "desc": "确定性 LMDI 量价分解 + 基期<1%长尾噪音过滤",
          "log": "### 一、大盘原始指标表 (2018-07 vs 2018-08)\n| ym      |   valid_gmv |   valid_orders |   uv |   delay_rate |\n|:--------|------------:|---------------:|-----:|-------------:|\n| 2018-07 |      867953 |           6159 | 6100 |         4.37 |\n| 2018-08 |      838577 |           6351 | 6310 |        10.35 |\n\n### 二、LMDI 无残差量价分解 (Python 精确计算，残差=0.0)\n{\n  \"gmv_t0\": 867953.46,\n  \"gmv_t1\": 838576.64,\n  \"ord_t0\": 6159,\n  \"ord_t1\": 6351,\n  \"aov_t0\": 140.92,\n  \"aov_t1\": 132.04,\n  \"delta_gmv\": -29376.82,\n  \"mom_pct\": -3.38,\n  \"effect_orders\": 26190.82,\n  \"effect_aov\": -55567.64,\n  \"order_dir_contrib_pct\": 89.15,\n  \"aov_dir_contrib_pct\": -189.15,\n  \"residual\": 0.0\n}\n\n### 三、重点省份异动贡献度 Top 6 (已剔除基期<1%长尾，+为拉动大盘/-为拖累大盘)\n| 省份   |   2018-07GMV |   2018-08GMV |   变动额(Delta) |   环比(%) |   方向贡献度(%) |\n|:-------|-------------:|-------------:|----------------:|----------:|----------------:|\n| SP     |     321647   |    387734    |        66086.5  |     20.55 |          224.96 |\n| BA     |      41869   |     21113.8  |       -20755.2  |    -49.57 |          -70.65 |\n| ES     |      30001.4 |     16447    |       -13554.3  |    -45.18 |          -46.14 |\n| PE     |      24359   |     11648.2  |       -12710.8  |    -52.18 |          -43.27 |\n| PB     |      15188.7 |      7669.63 |        -7519.05 |    -49.5  |          -25.6  |\n| PR     |      45108.9 |     38500.4  |        -6608.55 |    -14.65 |          -22.5  |\n\n### 四、重点英文品类异动贡献度 Top 6 (已剔除基期<1%长尾，+为拉动大盘/-为拖累大盘)\n| 英文品类                        |   2018-07GMV |   2018-08GMV |   变动额(Delta) |   环比(%) |   方向贡献度(%) |\n|:--------------------------------|-------------:|-------------:|----------------:|----------:|----------------:|\n| watches_gifts                   |     95164.8  |     69767.1  |       -25397.7  |    -26.69 |          -86.46 |\n| health_beauty                   |    103524    |    119391    |        15866.8  |     15.33 |           54.01 |\n| telephony                       |     26492.7  |     36572.9  |        10080.2  |     38.05 |           34.31 |\n| garden_tools                    |     25639.9  |     16314.7  |        -9325.18 |    -36.37 |          -31.74 |\n| construction_tools_construction |     15237.5  |     22917.2  |         7679.69 |     50.4  |           26.14 |\n| fixed_telephony                 |      9319.39 |      2724.17 |        -6595.22 |    -70.77 |          -22.45 |"
        },
        {
          "step": "4. Reporter + Hybrid Judge",
          "badge": "5/5 通过",
          "badge_color": "blue",
          "desc": "Qwen写报告 + 正则硬溯源 + 异源Google Gemini审计",
          "log": "[Reporter | Role=writer] 生成次数: 1\n[Hybrid Judge | Python正则 + Google-Gemini-3.5-Flash 跨厂商审计]:\n{\n  \"faithfulness_score\": 5,\n  \"methodology_score\": 5,\n  \"actionability_score\": 5,\n  \"hallucination_detected\": false,\n  \"audit_comment\": \"报告数据与上游真值包完全一致，LMDI量价分解及各维度Top6归因准确无误，无幻觉或逻辑错误。\",\n  \"regex_grounding_pct\": 100.0,\n  \"ungrounded_nums\": []\n}"
        }
      ],
      "charts": {
        "left_title": "LMDI 无残差量价分解瀑布图 (BRL)",
        "left_type": "waterfall",
        "waterfall_data": {
          "base_label": "7月基期",
          "base_val": 867953.46,
          "order_label": "单量驱动",
          "order_delta": 26190.82,
          "aov_label": "客单价驱动",
          "aov_delta": -55567.64,
          "end_label": "8月当期",
          "end_val": 838576.64
        },
        "right_title": "核心省份 (State) 环比变动贡献 Top 6 (BRL, 已剔除<1%长尾)",
        "right_type": "hbar",
        "hbar_data": [
          {
            "name": "PR",
            "value": -6608.55
          },
          {
            "name": "PB",
            "value": -7519.05
          },
          {
            "name": "PE",
            "value": -12710.81
          },
          {
            "name": "ES",
            "value": -13554.32
          },
          {
            "name": "BA",
            "value": -20755.16
          },
          {
            "name": "SP",
            "value": 66086.46
          }
        ]
      },
      "report_md": "# 电商大盘异动归因诊断报告\n\n- **报告日期**：2026-11-20\n- **汇报对象**：业务 VP\n- **分析周期**：2018年7月（2018-07） vs 2018-08（2018-08）\n\n---\n\n## 一、 大盘核心指标总览\n\n2018年8月，大盘有效GMV出现环比回落。现将2018-07与2018-08的核心指标对比呈现如下：\n\n- **有效GMV (valid_gmv)**：由 2018-07 的 867953 下降至 2018-08 的 838577（精确计算：由 867953.46 变动至 838576.64，环比变动幅度为 -3.38%，总变动额 delta_gmv 为 -29376.82）。\n- **有效订单数 (valid_orders)**：由 6159 增长至 6351。\n- **访客数 (uv)**：由 6100 增长至 6310。\n- **延误率 (delay_rate)**：由 4.37% 显著上升至 10.35%。\n\n---\n\n## 二、 量价漏斗模型：LMDI 无残差分解结论\n\n为了准确剥离订单量与客单价对有效GMV变动的具体驱动效应，采用 LMDI 无残差分解法进行归因。分解残差严格为 0.0。具体数值如下：\n\n- **基期与报告期 GMV**：gmv_t0 为 867953.46，gmv_t1 为 838576.64。\n- **订单量与客单价基础数据**：\n  - 订单数：ord_t0 为 6159，ord_t1 为 6351。\n  - 客单价 (aov)：aov_t0 为 140.92，aov_t1 为 132.04。\n- **驱动效应拆解**：\n  - **单量驱动效应 (effect_orders)**：+26190.82，方向贡献度为 89.15%。单量增长对大盘起到了正向拉动作用。\n  - **客单价驱动效应 (effect_aov)**：-55567.64，方向贡献度为 -189.15%。客单价的大幅下滑是拖累大盘 GMV 增长的绝对主因。\n\n---\n\n## 三、 省份区域维度归因分析\n\n剔除基期占比小于 1% 的长尾省份后，重点省份异动贡献度 Top 6 表现如下（+为拉动大盘，-为拖累大盘）：\n\n1. **SP**：2018-07GMV 为 321647，2018-08GMV 为 387734，变动额(Delta)为 66086.5，环比增长 20.55%，方向贡献度为 224.96%（大盘最核心的正向拉动省份）。\n2. **BA**：2018-07GMV 为 41869，2018-08GMV 为 21113.8，变动额(Delta)为 -20755.2，环比下降 -49.57%，方向贡献度为 -70.65%（主要的负向拖累省份）。\n3. **ES**：2018-07GMV 为 30001.4，2018-08GMV 为 16447，变动额(Delta)为 -13554.3，环比下降 -45.18%，方向贡献度为 -46.14%。\n4. **PE**：2018-07GMV 为 24359，2018-08GMV 为 11648.2，变动额(Delta)为 -12710.8，环比下降 -52.18%，方向贡献度为 -43.27%。\n5. **PB**：2018-07GMV 为 15188.7，2018-08GMV 为 7669.63，变动额(Delta)为 -7519.05，环比下降 -49.50%，方向贡献度为 -25.60%。\n6. **PR**：2018-07GMV 为 45108.9，2018-08GMV 为 38500.4，变动额(Delta)为 -6608.55，环比下降 -14.65%，方向贡献度为 -22.50%。\n\n---\n\n## 四、 英文商品品类维度归因分析\n\n剔除基期占比小于 1% 的长尾品类后，重点英文品类异动贡献度 Top 6 表现如下（+为拉动大盘，-为拖累大盘）：\n\n1. **watches_gifts**：2018-07GMV 为 95164.8，2018-08GMV 为 69767.1，变动额(Delta)为 -25397.7，环比下降 -26.69%，方向贡献度为 -86.46%（主要品类拖累项）。\n2. **health_beauty**：2018-07GMV 为 103524，2018-08GMV 为 119391，变动额(Delta)为 15866.8，环比增长 15.33%，方向贡献度为 54.01%（核心正向拉动品类）。\n3. **telephony**：2018-07GMV 为 26492.7，2018-08GMV 为 36572.9，变动额(Delta)为 10080.2，环比增长 38.05%，方向贡献度为 34.31%。\n4. **garden_tools**：2018-07GMV 为 25639.9，2018-08GMV 为 16314.7，变动额(Delta)为 -9325.18，环比下降 -36.37%，方向贡献度为 -31.74%。\n5. **construction_tools_construction**：2018-07GMV 为 15237.5，2018-08GMV 为 22917.2，变动额(Delta)为 7679.69，环比增长 50.40%，方向贡献度为 26.14%。\n6. **fixed_telephony**：2018-07GMV 为 9319.39，2018-08GMV 为 2724.17，变动额(Delta)为 -6595.22，环比下降 -70.77%，方向贡献度为 -22.45%。"
    },
    {
      "id": "fast_path",
      "tag": "FAST PATH",
      "tag_color": "emerald",
      "short_title": "8月有效 GMV 与取消率极速查询",
      "question": "查询 2018年8月 有效GMV 和订单取消率分别是多少？",
      "route_name": "FAST_SQL（智谱Flash路由直通单步SQL，跳过重型归因）",
      "guard_badge": "双口径隔离校验通过",
      "meta_stats": "SQL重试 0 次 · 节省 ~75% Token 与延迟",
      "kpis": [
        {
          "label": "8月有效 GMV",
          "value": "$ 838,576.64",
          "sub": "仅统计 delivered 订单售价",
          "trend": "neutral"
        },
        {
          "label": "8月订单取消率",
          "value": "1.29%",
          "sub": "分母包含全状态下单总量",
          "trend": "down"
        },
        {
          "label": "路由策略",
          "value": "FAST_SQL",
          "sub": "直连 Coder 模型单步出数",
          "trend": "up"
        },
        {
          "label": "SQL 重试次数",
          "value": "0 次",
          "sub": "Hybrid RAG 一次命中",
          "trend": "up"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway 网关",
          "badge": "Zhipu-Flash",
          "badge_color": "green",
          "desc": "识别为明确单点查询，秒切快思考流",
          "log": "[Gateway | Role=fast] 路由决策: FAST_SQL\n理由: 用户提问时间范围明确（2018年8月），且指标明确（有效GMV、订单取消率），属于典型的具体数值查询（What型问题）。"
        },
        {
          "step": "2. SQL Executor",
          "badge": "Qwen27B",
          "badge_color": "teal",
          "desc": "自动隔离有效GMV(delivered)与取消率(全量分母)",
          "log": "[SQL Executor | Role=coder]\nSELECT \n    (SELECT ROUND(SUM(oi.price), 2) \n     FROM orders o \n     JOIN order_items oi ON o.order_id = oi.order_id \n     WHERE o.order_status = 'delivered' \n       AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08') AS effective_gmv,\n    (SELECT SUM(CASE WHEN order_status = 'canceled' THEN 1.0 ELSE 0.0 END) * 100.0 / COUNT(DISTINCT order_id) \n     FROM orders \n     WHERE strftime('%Y-%m', order_purchase_timestamp) = '2018-08') AS cancellation_rate;\n\n[返回结果]:\n|   effective_gmv |   cancellation_rate |\n|----------------:|--------------------:|\n|          838577 |             1.28993 |"
        },
        {
          "step": "3. Python LMDI 沙盒",
          "badge": "按需跳过",
          "badge_color": "gray",
          "desc": "快思考路径自动跳过复杂归因算子",
          "log": "[System] FAST_SQL 路径已跳过 Planner、LMDI 沙盒与重型审计，降低 75% 耗时。"
        },
        {
          "step": "4. Reporter 简报",
          "badge": "已交付",
          "badge_color": "blue",
          "desc": "输出精简指标回答与口径说明",
          "log": "[Reporter | Role=writer] 已输出单点指标简报。"
        }
      ],
      "charts": {
        "left_title": "2018年3月-8月 有效GMV 趋势 (BRL)",
        "left_type": "bar_simple",
        "bar_data": [
          {
            "name": "2018-03",
            "value": 953356.25
          },
          {
            "name": "2018-04",
            "value": 973534.09
          },
          {
            "name": "2018-05",
            "value": 977544.69
          },
          {
            "name": "2018-06",
            "value": 856077.86
          },
          {
            "name": "2018-07",
            "value": 867953.46
          },
          {
            "name": "2018-08",
            "value": 838576.64
          }
        ],
        "right_title": "2018年3月-8月 订单取消率走势 (%)",
        "right_type": "line",
        "line_data": [
          {
            "name": "2018-03",
            "value": 0.36
          },
          {
            "name": "2018-04",
            "value": 0.22
          },
          {
            "name": "2018-05",
            "value": 0.35
          },
          {
            "name": "2018-06",
            "value": 0.29
          },
          {
            "name": "2018-07",
            "value": 0.65
          },
          {
            "name": "2018-08",
            "value": 1.29
          }
        ]
      },
      "report_md": "2018年8月有效GMV为838,577。该口径按订单状态为delivered的订单，关联订单明细后汇总商品金额。订单取消率为1.28993%。该口径按2018年8月购买订单中状态为canceled的订单数占去重订单总数计算。"
    },
    {
      "id": "anti_fan_out",
      "tag": "ANTI-FAN-OUT",
      "tag_color": "amber",
      "short_title": "信用卡支付 GMV（防扇出膨胀）",
      "question": "统计 2018年8月 使用信用卡支付过的有效订单对应的商品有效 GMV 总和",
      "route_name": "Hard Semantic Guard（中文混合RAG命中防扇出规范）",
      "guard_badge": "IN 子查询粒度隔离通过",
      "meta_stats": "尝试 1 次 · 成功拦截直接JOIN虚高 +$ 4,710.68",
      "kpis": [
        {
          "label": "信用卡有效 GMV (正确)",
          "value": "$ 677,560.52",
          "sub": "IN 子查询粒度隔离",
          "trend": "up"
        },
        {
          "label": "直接 JOIN 膨胀值 (错误)",
          "value": "$ 682,271.20",
          "sub": "一单多笔支付导致重复求和",
          "trend": "down"
        },
        {
          "label": "成功拦截虚高误差",
          "value": "+$ 4,710.68",
          "sub": "相对虚高 +0.70%",
          "trend": "neutral"
        },
        {
          "label": "SQL 尝试次数",
          "value": "1 次",
          "sub": "Hard 题 Pass@1 命中",
          "trend": "up"
        }
      ],
      "nodes": [
        {
          "step": "1. Hybrid RAG 检索",
          "badge": "词法+向量",
          "badge_color": "green",
          "desc": "中文 2-gram 精准召回《口径8：防扇出膨胀规范》",
          "log": "[Hybrid RAG] 命中核心规范:\n• 口径8：严禁将 order_items 与 order_payments 直接 JOIN 后求和！必须使用 WHERE o.order_id IN (SELECT DISTINCT order_id FROM order_payments ...)"
        },
        {
          "step": "2. SQL Agent 执行",
          "badge": "尝试1次",
          "badge_color": "teal",
          "desc": "生成安全子查询 SQL 并通过只读校验",
          "log": "[SQL Executor | Role=coder]\nSELECT ROUND(SUM(oi.price), 2) AS val\nFROM orders o\nJOIN order_items oi ON o.order_id = oi.order_id\nWHERE o.order_status = 'delivered'\n  AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n  AND o.order_id IN (SELECT DISTINCT order_id FROM order_payments WHERE payment_type = 'credit_card');\n\n[返回结果]:\n|    val |\n|-------:|\n| 677561 |"
        },
        {
          "step": "3. 防扇出误差对照",
          "badge": "拦截+0.70%",
          "badge_color": "purple",
          "desc": "对比 Naive 直接 Join 产生的笛卡尔积膨胀",
          "log": "[对照验证]\n正确隔离值: $ 677,560.52\n直接JOIN值: $ 682,271.20\n拦截虚高额: +$ 4,710.68 (+0.70%)"
        },
        {
          "step": "4. 结论输出",
          "badge": "已溯源",
          "badge_color": "blue",
          "desc": "输出防扇出原理解析与支付结构分布",
          "log": "[Reporter] Hard 级防扇出测试验证通过。"
        }
      ],
      "charts": {
        "left_title": "防扇出隔离 vs 错误直接JOIN 金额对比 (BRL)",
        "left_type": "bar_compare",
        "compare_data": [
          {
            "name": "正确值 (IN子查询隔离)",
            "value": 677560.52,
            "color": "#10B981"
          },
          {
            "name": "错误值 (直接JOIN膨胀)",
            "value": 682271.2,
            "color": "#F43F5E"
          }
        ],
        "right_title": "2018年8月 有效订单各支付方式分布 (订单数)",
        "right_type": "hbar",
        "hbar_data": [
          {
            "name": "voucher",
            "value": 179
          },
          {
            "name": "debit_card",
            "value": 270
          },
          {
            "name": "boleto",
            "value": 1119
          },
          {
            "name": "credit_card",
            "value": 4883
          }
        ]
      },
      "report_md": "## 防扇出膨胀（Fan-out Trap）专项校验报告\n\n* **核心结论**：2018年8月使用信用卡支付过的有效订单，其对应商品有效 GMV 真实值为 **$ 677,560.52**。\n* **陷阱解析**：在 Olist 数仓中，`order_items`（一单多品）与 `order_payments`（一单分次支付）同属 `orders` 的下游 1:N 明细表。若像常规 Baseline 一样直接三表 `JOIN` 后 `SUM(price)`，会导致金额膨胀至 **$ 682,271.20**（虚高 **+$ 4,710.68 / +0.70%**）。\n* **工程解法**：通过中文 Hybrid RAG 召回《口径8：防扇出规范》，引导 Agent 使用 `WHERE o.order_id IN (SELECT DISTINCT order_id FROM order_payments WHERE payment_type = 'credit_card')` 实现粒度隔离，一次性精准通过。"
    },
    {
      "id": "clarify_guard",
      "tag": "CLARIFY · HITL",
      "tag_color": "indigo",
      "short_title": "模糊提问主动反问（防盲查）",
      "question": "帮我看一下最近大盘的销售额怎么样？",
      "route_name": "CLARIFY（前置网关拦截，Human-in-the-Loop 主动澄清）",
      "guard_badge": "0 SQL 浪费 · 拒绝口径瞎猜",
      "meta_stats": "由 Zhipu-Flash 毫秒级拦截 · 下游 SQL/LMDI 算力零消耗",
      "kpis": [
        {
          "label": "网关判定结果",
          "value": "CLARIFY",
          "sub": "检测到时间与口径双缺失",
          "trend": "neutral"
        },
        {
          "label": "拦截潜在口径差",
          "value": "$ 164,732",
          "sub": "有效GMV vs 全量含运费毛额",
          "trend": "down"
        },
        {
          "label": "路由执行模型",
          "value": "GLM4-Flash",
          "sub": "极速轻量通道，不耗强模型",
          "trend": "up"
        },
        {
          "label": "下游 SQL 触发",
          "value": "0 次",
          "sub": "澄清前拒绝盲目查库",
          "trend": "up"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway 意图体检",
          "badge": "命中拦截",
          "badge_color": "green",
          "desc": "识别到“最近”时间不明且“销售额”口径存在歧义",
          "log": "[Gateway | Role=fast -> Zhipu-GLM4-Flash]\n路由决策: CLARIFY\n判定理由: 用户提问中的“最近”时间范围模糊，且“销售额”未明确具体口径（如有效GMV、含运费总金额等）。"
        },
        {
          "step": "2. SQL Executor",
          "badge": "已熔断跳过",
          "badge_color": "gray",
          "desc": "在用户确认时间与口径前拒绝盲目生成 SQL",
          "log": "[System] CLARIFY 路径已直接短路，避免消耗 Qwen Coder 额度或产出错误口径数据。"
        },
        {
          "step": "3. Python LMDI 沙盒",
          "badge": "已跳过",
          "badge_color": "gray",
          "desc": "待用户澄清后按需唤醒",
          "log": "[System] 算子沙盒待命中。"
        },
        {
          "step": "4. 澄清话术输出",
          "badge": "HITL 交互",
          "badge_color": "blue",
          "desc": "向业务方礼貌追问明确周期与口径选项",
          "log": "💬 **需要您先确认分析口径与时间范围**：\n\n请问您想查看具体哪一个时间段的销售额呢？另外，销售额的统计口径（如有效GMV还是含运费总金额）是否有特定偏好？"
        }
      ],
      "charts": {
        "left_title": "为什么必须澄清？2018-08 两种口径金额相差 $ 15.8万！",
        "left_type": "bar_compare",
        "compare_data": [
          {
            "name": "有效GMV(仅送达/不含运费)",
            "value": 838576.64,
            "color": "#4F46E5"
          },
          {
            "name": "毛交易额(全状态/含运费)",
            "value": 1003308.47,
            "color": "#F59E0B"
          }
        ],
        "right_title": "数仓近期可用完整月份有效GMV参考 (BRL)",
        "right_type": "hbar",
        "hbar_data": [
          {
            "name": "2018-04",
            "value": 973534.09
          },
          {
            "name": "2018-05",
            "value": 977544.69
          },
          {
            "name": "2018-06",
            "value": 856077.86
          },
          {
            "name": "2018-07",
            "value": 867953.46
          },
          {
            "name": "2018-08",
            "value": 838576.64
          }
        ]
      },
      "report_md": "💬 **需要您先确认分析口径与时间范围**：\n\n请问您想查看具体哪一个时间段的销售额呢？另外，销售额的统计口径（如有效GMV还是含运费总金额）是否有特定偏好？\n\n---\n**💡 架构设计说明**：若不对模糊提问做前置澄清，直接盲查极易导致口径错位（仅 2018年8月单月，“有效 GMV”与“含运费毛交易额”就相差 **$ 164,731.83**）。V1.5 通过极速轻量模型 `Zhipu-GLM4-Flash` 充当 Gateway，在 1 秒内完成拦截反问，兼顾准确性与 FinOps 成本控制。"
    }
  ]
};