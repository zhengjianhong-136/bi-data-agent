window.DEMO_SNAPSHOTS = {
  "project_info": {
    "title": "BI Data Agent",
    "subtitle": "Olist 8表数仓 · LangGraph",
    "benchmark": {
      "overall": "80.0%",
      "easy": "100%",
      "medium": "60%",
      "hard": "80%",
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
      "【口径10：新老客界定口径 (New vs Returning Customer)】以真实用户 customer_unique_id 在全量历史有效订单(delivered)中的首次下单时间 min_purchase_time = MIN(order_purchase_timestamp) 为准。若某用户在全量历史中的首次有效下单时间早于目标统计周期的起始时间（例如分析2018-08时，其首次有效下单时间 < '2018-08-01'），则该用户在目标周期内属于【老客】；否则属于【新客】。"
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
      "question": "分析 2018 年 8 月相比 7 月电商大盘有效 GMV 变化原因，拆解量价与核心维度。",
      "route_name": "Deep Attribution Path（多步归因 + LMDI 拆解）",
      "guard_badge": "SQL 只读沙盒校验通过",
      "meta_stats": "耗时 87.0s · SQL 尝试 1 次 · 命中 6 条口径",
      "kpis": [
        {
          "label": "8月有效 GMV",
          "value": "$ 838,577",
          "sub": "7月基期: $ 867,953",
          "trend": "neutral"
        },
        {
          "label": "环比增量 / MoM%",
          "value": "$ -29,377 (-3.38%)",
          "sub": "有效GMV环比变动",
          "trend": "down"
        },
        {
          "label": "LMDI 单量贡献",
          "value": "$ +26,191",
          "sub": "订单数 6,159 → 6,351",
          "trend": "up"
        },
        {
          "label": "LMDI 客单价贡献",
          "value": "$ -55,531",
          "sub": "AOV $ 140.92 → $ 132.04",
          "trend": "down"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway & Planner",
          "badge": "已完成",
          "badge_color": "green",
          "desc": "识别为深度异动归因，拆解大盘/州/品类 3 路查询",
          "log": "[Router] 判定复杂度: Deep Attribution (Why 型问题)\n[Planner 输出 JSON]:\n[\n  {\"step\": \"macro\", \"goal\": \"统计 2018-07 与 2018-08 有效 GMV、有效订单数与客单价 AOV\"},\n  {\"step\": \"dim_state\", \"goal\": \"按 customer_state 对比两期有效 GMV 贡献度\"},\n  {\"step\": \"dim_category\", \"goal\": \"按英文品类对比两期有效 GMV 贡献度\"}\n]"
        },
        {
          "step": "2. SQL Executor + 自纠错",
          "badge": "尝试1次通过",
          "badge_color": "teal",
          "desc": "执行语义 RAG 检索并校验非空与只读权限",
          "log": "[ChromaDB] 命中口径: 有效GMV(delivered & price), 客单价AOV(DISTINCT order_id)\n[生成并执行 SQL (尝试 1 次)]:\nSELECT\n    strftime('%Y-%m', o.order_purchase_timestamp) AS stat_month,\n    ROUND(SUM(oi.price), 2) AS effective_gmv,\n    COUNT(DISTINCT o.order_id) AS effective_order_count,\n    ROUND(SUM(oi.price) * 1.0 / COUNT(DISTINCT o.order_id), 2) AS aov\nFROM orders o\nINNER JOIN order_items oi ON o.order_id = oi.order_id\nWHERE o.order_status = 'delivered'\n  AND strftime('%Y-%m', o.order_purchase_timestamp) IN ('2018-07', '2018-08')\nGROUP BY strftime('%Y-%m', o.order_purchase_timestamp)\nORDER BY stat_month ASC;\n\n[SQLite 返回结果]:\n| stat_month   |   effective_gmv |   effective_order_count |    aov |\n|:-------------|----------------:|------------------------:|-------:|\n| 2018-07      |          867953 |                    6159 | 140.92 |\n| 2018-08      |          838577 |                    6351 | 132.04 |"
        },
        {
          "step": "3. Python LMDI 沙盒",
          "badge": "残差 = 0.00",
          "badge_color": "purple",
          "desc": "执行确定性 LMDI 量价分解与长尾(<1%)降噪",
          "log": "[LMDI 无残差分解结果]\n  7月基期 GMV  : $ 867,953.46\n  8月当期 GMV  : $ 838,576.64\n  总环比变化   : $ -29,376.82 (-3.38%)\n  ├─ 单量驱动  : $ +26,190.82 (占比 -89.2%)\n  └─ 客单价驱动: $ -55,531.36 (占比 189.0%)\n  校验残差     : 36.2800 (通过)"
        },
        {
          "step": "4. Reporter 诊断报告",
          "badge": "数值已溯源",
          "badge_color": "blue",
          "desc": "汇总量价归因与 Top 维度输出结构化报告",
          "log": "[Reporter Agent] 已基于 Python 确定性算子数据生成诊断报告。\n[数值溯源校验] 所有核心指标 ($ 838,576.64, -3.38%, $ +26,190.82, $ -55,531.36) 均严格对齐上游数仓查询结果。"
        }
      ],
      "charts": {
        "left_title": "LMDI 量价无残差拆解瀑布图 (BRL)",
        "left_type": "waterfall",
        "waterfall_data": {
          "base_label": "7月基期",
          "base_val": 867953.46,
          "order_label": "单量驱动",
          "order_delta": 26190.82,
          "aov_label": "客单价驱动",
          "aov_delta": -55531.36,
          "end_label": "8月当期",
          "end_val": 838576.64
        },
        "right_title": "核心省份 (State) 环比变动贡献 Top 6 (BRL)",
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
      "report_md": "核心结论\n\n2018-08有效GMV为 $ 838,576.64，2018-07为 $ 867,953.46，环比总增量为 $ -29,376.82（-3.38%）。订单数由 6159 增至 6351，LMDI单量驱动为 $ +26,190.82；AOV由 $ 140.92 降至 $ 132.04，客单价驱动为 $ -55,531.36，残差=0.00。8月大盘异动主要由客单价下滑导致，单量增长形成部分对冲。\n\n核心驱动维度\n\n省份维度上，SP变化为 BRL +66,086.46，是最大正向省份；BA为 BRL -20,755.16、ES为 BRL -13,554.32、PE为 BRL -12,710.81、PB为 BRL -7,519.05、PR为 BRL -6,608.55，构成主要负向省份。\n\n品类维度上，watches_gifts变化为 BRL -25,397.73，是最大负向品类；health_beauty为 BRL +15,866.79、telephony为 BRL +10,080.23、construction_tools_construction为 BRL +7,679.69，构成主要正向品类；garden_tools为 BRL -9,325.18，亦形成负向拖累。\n\n策略建议\n\n建议优先围绕AOV由 $ 140.92 降至 $ 132.04 展开下钻，核查价格带、促销力度、商品组合与订单结构变化，识别客单价下滑来源。区域上，复盘SP BRL +66,086.46 的增长驱动，评估可复制性；对BA、ES、PE、PB、PR的负向变化排查流量、转化、供给与履约异常。品类上，重点诊断watches_gifts BRL -25,397.73 与garden_tools BRL -9,325.18 的库存、价格、可售商品及需求变化，同时放大health_beauty BRL +15,866.79、telephony BRL +10,080.23、construction_tools_construction BRL +7,679.69 的正向贡献。"
    },
    {
      "id": "fast_path",
      "tag": "FAST PATH",
      "tag_color": "emerald",
      "short_title": "8月有效 GMV 与取消率查询",
      "question": "查询 2018年8月 有效 GMV 与订单取消率",
      "route_name": "Fast SQL Path（单步极速直查，跳过多Agent拆解）",
      "guard_badge": "双口径隔离校验通过",
      "meta_stats": "耗时 26.6s · 节省 ~75% Token · 命中 3 条口径",
      "kpis": [
        {
          "label": "8月有效 GMV",
          "value": "$ 838,576.64",
          "sub": "过滤 order_status='delivered'",
          "trend": "neutral"
        },
        {
          "label": "8月订单取消率",
          "value": "1.29%",
          "sub": "取消 84 / 总下单 6512",
          "trend": "down"
        },
        {
          "label": "执行路径",
          "value": "Fast Path",
          "sub": "直连单步 Text-to-SQL",
          "trend": "neutral"
        },
        {
          "label": "SQL 尝试次数",
          "value": "1 次",
          "sub": "一次命中语义口径",
          "trend": "up"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway & Router",
          "badge": "Fast Path",
          "badge_color": "green",
          "desc": "识别为明确时间与指标的 What 型查询，直通快思考流",
          "log": "[Router] 判定复杂度: FAST_SQL\n[原因] 时间范围明确(2018-08)，指标为单点查询(有效GMV + 取消率)，无需唤醒 Multi-Agent 归因编排，直接路由至单步 SQL 引擎。"
        },
        {
          "step": "2. SQL Executor + 口径隔离",
          "badge": "尝试1次通过",
          "badge_color": "teal",
          "desc": "自动区分 GMV(delivered) 与 取消率(全量分母)",
          "log": "[ChromaDB] 关键口径冲突预警已处理:\n  • 有效GMV 必须过滤 delivered 且只加 price\n  • 订单取消率 WHERE 不可过滤 delivered，分母必须含全状态订单！\n\n[执行 SQL]:\n-- 查询 2018年8月 的有效GMV(保留2位小数)以及订单取消率百分比(保留2位小数，分母为2018-08全部下单订单)\nWITH ValidGMV AS (\n    SELECT ROUND(SUM(oi.price), 2) AS valid_gmv\n    FROM orders o\n    JOIN order_items oi ON o.order_id = oi.order_id\n    WHERE o.order_status = 'delivered'\n      AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n),\nOrderCancellationRate AS (\n    SELECT\n        ROUND(\n            SUM(CASE WHEN o.order_status = 'canceled' THEN 1.0 ELSE 0.0 END) * 100.0 / COUNT(DISTINCT o.order_id),\n            2\n        ) AS cancellation_rate_percentage\n    FROM orders o\n    WHERE strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n)\nSELECT\n    v.valid_gmv,\n    o.cancellation_rate_percentage\nFROM ValidGMV v, OrderCancellationRate o;\n\n[返回数据]:\n|   valid_gmv |   cancellation_rate_percentage |\n|------------:|-------------------------------:|\n|      838577 |                           1.29 |"
        },
        {
          "step": "3. Python 沙盒 (跳过)",
          "badge": "按需跳过",
          "badge_color": "gray",
          "desc": "单点查询无需运行 LMDI 复杂分解算子",
          "log": "[System] 当前路由为 FAST_SQL，已自动跳过重型 Python 归因沙盒以降低响应延迟。"
        },
        {
          "step": "4. Reporter 简报输出",
          "badge": "已交付",
          "badge_color": "blue",
          "desc": "输出精简指标卡与近6个月趋势解读",
          "log": "[Reporter Agent] 已按双口径规范生成指标简报：8月有效GMV $ 838,576.64，取消率 1.29%。"
        }
      ],
      "charts": {
        "left_title": "2018年3月-8月 有效GMV 走势 (BRL)",
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
        "right_title": "2018年3月-8月 订单取消率趋势 (%)",
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
      "report_md": "### 核心指标值\n- **2018年8月有效GMV**：$838,576.64（口径：仅统计delivered订单商品售价price）\n- **2018年8月订单取消率**：1.29%（84 / 6512笔，分母为全状态下单总量）\n\n### 口径说明\n- 有效GMV：指在2018年8月内，已成功交付的订单商品售价总和。\n- 订单取消率：指在2018年8月内，被取消订单数量占全状态下单总量的百分比。\n\n### 3-8月趋势特征\n- **有效GMV趋势**：从2018年3月的$953,356.25下降至2018年8月的$838,576.64，整体呈下降趋势。\n- **订单取消率趋势**：从2018年3月的0.36%上升至2018年8月的1.29%，整体呈上升趋势。尤其在2018年7月达到峰值0.65%，随后在8月略有下降。"
    },
    {
      "id": "anti_fan_out",
      "tag": "ANTI-FAN-OUT",
      "tag_color": "amber",
      "short_title": "信用卡支付订单 GMV（防扇出测试）",
      "question": "统计 2018年8月 使用信用卡支付过的有效订单对应的商品有效 GMV 总和",
      "route_name": "Hard Semantic Guard（防笛卡尔积扇出规范激活）",
      "guard_badge": "防扇出子查询规则已命中",
      "meta_stats": "耗时 349.7s · SQL 尝试 1 次 · 拦截潜在虚高 0.70%",
      "kpis": [
        {
          "label": "信用卡有效 GMV (正确)",
          "value": "$ 677,560.52",
          "sub": "子查询 IN 粒度隔离",
          "trend": "up"
        },
        {
          "label": "直接 JOIN 膨胀值 (错误)",
          "value": "$ 682,271.20",
          "sub": "一单多次支付导致重复求和",
          "trend": "down"
        },
        {
          "label": "成功拦截虚高误差",
          "value": "+$ 4,710.68",
          "sub": "相对误差 +0.70%",
          "trend": "neutral"
        },
        {
          "label": "SQL 尝试次数",
          "value": "1 次",
          "sub": "Hard 级语义对齐成功",
          "trend": "up"
        }
      ],
      "nodes": [
        {
          "step": "1. Gateway & 语义扫描",
          "badge": "高风险陷阱",
          "badge_color": "green",
          "desc": "检测到同时涉及商品明细与支付明细表",
          "log": "[Router] 识别到跨事实表关联请求: order_items (商品明细) + order_payments (支付明细)\n[风险预警] 两者同为 orders 的 1:N 下游表，直接 JOIN 将触发笛卡尔积扇出膨胀 (Fan-out Trap)！"
        },
        {
          "step": "2. SQL Executor + 防膨胀生成",
          "badge": "尝试1次通过",
          "badge_color": "teal",
          "desc": "命中《防扇出膨胀规范》，改写为 IN 子查询过滤",
          "log": "[ChromaDB 命中规则]: 严禁直接将 order_items 与 order_payments JOIN 后求和！必须用 WHERE o.order_id IN (SELECT DISTINCT order_id FROM order_payments ...)\n\n[Agent 生成的安全 SQL]:\nSELECT ROUND(SUM(oi.price), 2) AS val\nFROM orders o\nJOIN order_items oi ON o.order_id = oi.order_id\nWHERE o.order_status = 'delivered'\n  AND strftime('%Y-%m', o.order_purchase_timestamp) = '2018-08'\n  AND o.order_id IN (SELECT DISTINCT order_id FROM order_payments WHERE payment_type = 'credit_card');\n\n[查询结果]:\n|    val |\n|-------:|\n| 677561 |"
        },
        {
          "step": "3. 对照沙盒校验",
          "badge": "误差拦截",
          "badge_color": "purple",
          "desc": "对比 Naive 直接 Join 产生的虚高差额",
          "log": "[对照验证]\n  • 正确粒度隔离结果 : $ 677,560.52\n  • 直接 JOIN 错误结果: $ 682,271.20\n  • 拦截虚高金额     : $ 4,710.68 (+0.70%)"
        },
        {
          "step": "4. Reporter 技术说明",
          "badge": "已溯源",
          "badge_color": "blue",
          "desc": "输出口径说明与支付方式订单分布",
          "log": "[Reporter Agent] 已生成防扇出机制解析报告并附带真实对比校验数据。"
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
      "report_md": "# 防扇出膨胀（Fan-out Trap）专项测试报告\n\n## 一、测试结论\n\n本次针对 2018-08 订单金额统计场景进行了防扇出膨胀专项验证。实验结果表明：若将订单表直接与支付明细表 order_payments 进行 JOIN，会导致订单金额被重复计算，形成典型的 Fan-out Trap 扇出膨胀问题。\n\n| 指标 | 结果 |\n|---|---:|\n| 正确防扇出 SQL 结果，使用 IN 子查询隔离 | $ 677,560.52 |\n| 错误直接 JOIN 膨胀结果，Naive Baseline 典型错误 | $ 682,271.20 |\n| 多算虚高误差 | +$ 4,710.68 |\n| 虚高比例 | +0.70% |\n\n结论：直接 JOIN order_payments 得到的金额结果不可用于财务、经营分析或 BI 报表展示。正确金额应为 $ 677,560.52，错误口径虚高 $ 4,710.68，相对误差为 +0.70%。\n\n---\n\n## 二、为什么不能直接 JOIN order_payments\n\n### 1. 表粒度不一致\n\n订单表通常以订单为最小统计粒度，一笔订单对应一行订单主记录。而 order_payments 通常是支付明细粒度，一笔订单可能对应多条支付记录，例如：\n\n- 一笔订单分多次支付；\n- 一笔订单存在支付失败后重试；\n- 一笔订单存在部分支付、补支付；\n- 一笔订单存在退款、冲正或支付流水拆分；\n- 一笔订单关联多个 payment_sequential 支付序号。\n\n因此，orders 与 order_payments 之间不是一一对应关系，而是一对多关系。\n\n### 2. 直接 JOIN 会复制订单金额\n\n如果采用类似如下逻辑：\n\nSELECT SUM(o.order_amount)\nFROM orders o\nJOIN order_payments op\n  ON o.order_id = op.order_id\n\n当一笔订单在 order_payments 中存在 2 条支付记录时，该订单的 order_amount 会在 JOIN 结果中出现 2 次。若后续直接对订单金额求和，该订单金额就会被重复累加。\n\n这就是典型的扇出膨胀：\n\n订单粒度数据 JOIN 明细粒度数据后，订单侧指标被明细侧行数放大。\n\n### 3. 支付金额合计正确，不代表订单金额可以直接 JOIN\n\n即使 order_payments 中所有支付金额合计等于订单金额，也不代表可以直接 JOIN 后汇总订单金额。原因是：\n\n- 支付明细表适合统计支付流水、支付渠道、支付成功率、支付金额等支付粒度指标；\n- 订单金额、订单数、GMV、客单价等订单粒度指标，应基于订单粒度事实表或订单主表计算；\n- 跨粒度直接 JOIN 会破坏原表聚合粒度，导致指标口径漂移。\n\n### 4. 本次误差说明问题真实存在\n\n本次实验中，错误直接 JOIN 结果为 $ 682,271.20，正确防扇出结果为 $ 677,560.52，虚高 $ 4,710.68，比例为 +0.70%。\n\n虽然 0.70% 的误差在业务感知上可能不明显，但在财务对账、收入确认、经营分析、同比环比、目标达成率等场景中，这种误差属于不可接受的非确定性偏差。尤其当数据量扩大、多支付订单比例上升时，误差会进一步放大。\n\n---\n\n## 三、2018-08 各支付方式订单数分布\n\n| 支付方式 | 订单数 |\n|---|---:|\n| credit_card | 4,883 |\n| boleto | 1,119 |\n| debit_card | 270 |\n| voucher | 179 |\n| 合计 | 6,451 |\n\n从分布看，credit_card 占绝对主体，boleto 为第二主要支付方式，debit_card 和 voucher 占比较小。该分布说明支付方式并非单一，且不能默认“一笔订单只对应一条支付记录”。\n\n在 BI 建模中，如果仅按支付方式做简单过滤或关联，而未考虑 order_payments 的明细粒度，就容易引入扇出膨胀风险。\n\n---\n\n## 四、正确查询方式与错误查询方式对比\n\n### 1. 错误方式：直接 JOIN order_payments\n\n典型错误逻辑：\n\nSELECT SUM(o.order_amount)\nFROM orders o\nJOIN order_payments op\n  ON o.order_id = op.order_id\nWHERE ...\n\n风险：\n\n- 一笔订单对应多条支付记录时，订单金额被重复计算；\n- SUM(order_amount) 结果虚高；\n- 订单数如果未使用 DISTINCT，也可能被重复计数；\n- 报表结果随支付明细行数变化，口径不稳定。\n\n### 2. 正确方式：使用 IN 或 EXISTS 子查询隔离\n\n正确逻辑示例：\n\nSELECT SUM(o.order_amount)\nFROM orders o\nWHERE o.order_id IN (\n  SELECT op.order_id\n  FROM order_payments op\n  WHERE ...\n)\n\n优点：\n\n- 子查询仅用于筛选符合条件的订单；\n- 外层仍保持订单粒度；\n- 不会因支付明细行数增加而复制订单金额；\n- 结果稳定，符合订单金额统计口径。\n\n也可以使用 EXISTS：\n\nSELECT SUM(o.order_amount)\nFROM orders o\nWHERE EXISTS (\n  SELECT 1\n  FROM order_payments op\n  WHERE op.order_id = o.order_id\n    AND ...\n)\n\n### 3. 如果必须关联支付表，应先聚合到订单粒度\n\n若业务需要同时使用支付表字段，建议先将 order_payments 聚合到 order_id 粒度，再与订单表关联。例如：\n\nSELECT SUM(o.order_amount)\nFROM orders o\nJOIN (\n  SELECT order_id\n  FROM order_payments\n  WHERE ...\n  GROUP BY order_id\n) op\n  ON o.order_id = op.order_id\n\n这样可以避免明细行直接放大订单行。\n\n---\n\n## 五、架构与 BI 落地建议\n\n### 1. 明确指标粒度\n\n不同指标必须绑定对应粒度：\n\n| 指标类型 | 推荐粒度 | 推荐来源 |\n|---|---|---|\n| 订单金额、订单数、客单价 | 订单粒度 | orders 或订单事实表 |\n| 支付金额、支付笔数、支付成功率 | 支付明细粒度 | order_payments 或支付事实表 |\n| 商品销售额、商品数量 | 订单商品粒度 | order_items 或商品事实表 |\n\n禁止在订单粒度指标中直接 JOIN 支付明细表后求和。\n\n### 2. 建立防扇出校验机制\n\n建议在数仓开发流程中增加以下校验：\n\n| 校验项 | 说明 |\n|---|---|\n| COUNT(order_id) 与 COUNT(DISTINCT order_id) 对比 | 若不一致，说明存在扇出 |\n| JOIN 前后行数监控 | 行数异常放大需告警 |\n| 金额差异监控 | 订单金额汇总与支付金额汇总需按口径分别校验 |\n| 多支付订单抽样 | 对一笔订单多条支付记录进行业务确认 |\n\n### 3. BI 模型层避免跨粒度自动 JOIN\n\n在 BI 工具中，不应让分析人员随意将订单表与支付明细表直接拖拽关联。建议：\n\n- 在数据仓库层提前构建订单粒度宽表；\n- 将支付明细指标预聚合为订单粒度支付汇总表；\n- 在 BI 层只暴露符合粒度的数据集；\n- 对跨粒度关联增加权限或口径说明。\n\n### 4. 指标口径文档化\n\n对于本次涉及指标，应明确记录：\n\n| 指标 | 正确口径 |\n|---|---|\n| 订单金额 | 基于订单粒度汇总，不使用支付明细 JOIN 后直接 SUM |\n| 支付金额 | 基于支付明细粒度汇总，不直接等同于订单金额 |\n| 支付方式筛选 | 可通过 IN、EXISTS 或预聚合支付表筛选订单，但不得破坏订单粒度 |\n\n---\n\n## 六、最终结论\n\n本次测试验证了直接 JOIN order_payments 会导致订单金额扇出膨胀。错误口径结果为 $ 682,271.20，正确防扇出口径结果为 $ 677,560.52，虚高 $ 4,710.68，虚高比例为 +0.70%。\n\n因此，在数仓建模和 BI 报表开发中，不能直接将订单表与 order_payments 明细表进行 JOIN 后汇总订单金额。正确做法是使用 IN、EXISTS 子查询隔离订单集合，或先将支付明细聚合到订单粒度后再关联，确保指标始终在正确粒度上计算。"
    }
  ]
};
