const fs = require("fs/promises");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outputPath = path.join(dataDir, "growth-data.json");
const jsOutputPath = path.join(dataDir, "growth-data.js");

const now = new Date();
const targetYear = Number(process.env.TARGET_YEAR || now.getUTCFullYear());
const targetMonth = Number(process.env.TARGET_MONTH || now.getUTCMonth() + 1);
const offline = process.env.OFFLINE === "1";

const countries = [
  { code: "US", name: "美国", worldBank: "USA", regionCode: "US" },
  { code: "GB", name: "英国", worldBank: "GBR", regionCode: "GB" },
  { code: "DE", name: "德国", worldBank: "DEU", regionCode: "DE" },
  { code: "FR", name: "法国", worldBank: "FRA", regionCode: "FR" },
  { code: "JP", name: "日本", worldBank: "JPN", regionCode: "JP" },
  { code: "CA", name: "加拿大", worldBank: "CAN", regionCode: "CA" },
  { code: "AU", name: "澳大利亚", worldBank: "AUS", regionCode: "AU" },
  { code: "BR", name: "巴西", worldBank: "BRA", regionCode: "BR" },
  { code: "MX", name: "墨西哥", worldBank: "MEX", regionCode: "MX" },
  { code: "KR", name: "韩国", worldBank: "KOR", regionCode: "KR" },
  { code: "PL", name: "波兰", worldBank: "POL", regionCode: "PL" }
];

const sources = [
  {
    id: "src-nager-holidays",
    name: "Nager.Date Public Holidays API",
    category: "节日节点",
    method: "public-api",
    url: "https://date.nager.at/",
    autoUpdate: true,
    requiresKey: false,
    updateFrequency: "weekly",
    status: "ready",
    note: "第一版用于公开节假日自动更新；可在后续补充 Google Calendar 公开日历。"
  },
  {
    id: "src-world-bank",
    name: "World Bank Indicators API",
    category: "宏观市场",
    method: "public-api",
    url: "https://api.worldbank.org/v2/",
    autoUpdate: true,
    requiresKey: false,
    updateFrequency: "monthly",
    status: "ready",
    note: "用于人口、GDP、互联网使用率等公开宏观信号。"
  },
  {
    id: "src-seed-public-events",
    name: "Public Event Seed List",
    category: "平台活动/行业节点",
    method: "curated-public-seed",
    url: "",
    autoUpdate: false,
    requiresKey: false,
    updateFrequency: "manual-review",
    status: "review-needed",
    note: "第一版先保留公开节点种子，后续逐个替换为平台官网、会议官网或体育赛程来源。"
  }
];

const configOptions = {
  audiences: [
    { id: "growth-team", label: "全球增长团队" },
    { id: "amazon-sellers", label: "Amazon 卖家" },
    { id: "regional-platform-sellers", label: "区域平台卖家" },
    { id: "brand-global", label: "品牌出海团队" },
    { id: "platform-service", label: "平台服务商 / 代运营" },
    { id: "logistics-payment", label: "物流 / 海外仓 / 支付服务商" },
    { id: "sales-team", label: "销售团队" },
    { id: "fashion-sellers", label: "服装卖家" },
    { id: "general-goods", label: "泛品 / 白牌卖家" }
  ],
  regions: [
    { code: "GLOBAL", label: "GLOBAL 全球" },
    { code: "US", label: "US 美国" },
    { code: "EU", label: "EU 欧洲" },
    { code: "DE", label: "DE 德国" },
    { code: "SEA", label: "SEA 东南亚" },
    { code: "LATAM", label: "LATAM 拉美" },
    { code: "GCC", label: "GCC 中东/GCC" },
    { code: "JP", label: "JP 日本" },
    { code: "KR", label: "KR 韩国" },
    { code: "RU", label: "RU 俄罗斯" },
    { code: "AMZ", label: "AMZ Amazon" },
    { code: "PLAT", label: "PLAT 平台通用" }
  ],
  months: [
    { id: "current", label: "本月" },
    { id: "next", label: "下月" },
    { id: "2026-06", label: "2026 年 6 月" },
    { id: "2026-07", label: "2026 年 7 月" }
  ],
  channels: [
    { id: "wechat-moments", label: "企微朋友圈 / 微信朋友圈" },
    { id: "wechat-article", label: "公众号" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "x-twitter", label: "X / Twitter" },
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "email", label: "邮件" },
    { id: "blog-seo", label: "博客 / SEO 内容" },
    { id: "multi-platform", label: "多平台矩阵" }
  ],
  eventTypes: [
    { id: "festival", label: "当地节日" },
    { id: "sports", label: "体育赛事" },
    { id: "summit", label: "行业峰会 / 展会" },
    { id: "shop", label: "购物节点 / 大促" },
    { id: "platform", label: "平台活动" },
    { id: "seasonal", label: "季节消费节点" },
    { id: "social", label: "社媒热点" },
    { id: "all", label: "全部" }
  ],
  goals: [
    { id: "brand-awareness", label: "品牌曝光" },
    { id: "lead-conversion", label: "获客转化" },
    { id: "campaign-warmup", label: "活动预热" },
    { id: "holiday-moment", label: "节日借势" },
    { id: "platform-education", label: "平台教育" },
    { id: "product-update", label: "产品功能宣发" },
    { id: "industry-insight", label: "行业洞察" },
    { id: "sales-nurture", label: "销售线索培育" }
  ],
  outputFormats: [
    { id: "monthly-calendar", label: "月历" },
    { id: "weekly-plan", label: "周计划" },
    { id: "daily-social-topics", label: "每日社媒选题" },
    { id: "poster-brief", label: "海报主题清单" },
    { id: "short-video-directions", label: "短视频脚本方向" },
    { id: "wechat-article-topics", label: "公众号选题" },
    { id: "content-matrix", label: "多平台内容矩阵" }
  ]
};

const marketLibrary = [
  { priority: 1, country: "美国", code: "US", tier: "第一梯队", regionType: "北美", first: "Amazon", second: "eBay", third: "Walmart", status: "高价值", aovUsd: "US$80-160", rmb: "约 RMB 580-1,150", profit: "高", risk: "广告费、退货、仓储和合规成本高", audienceTags: ["Amazon 卖家", "品牌货 / 精品 / 高客单卖家", "平台服务商"], contentAngles: ["Prime Day", "黑五网一", "客服和退货高峰", "广告投放清单"] },
  { priority: 2, country: "东南亚", code: "SEA", tier: "第一梯队", regionType: "亚洲", first: "Shopee", second: "TikTok Shop", third: "Lazada", status: "增长", aovUsd: "US$10-35", rmb: "约 RMB 70-250", profit: "中低到中", risk: "客单低、价格敏感、履约分散", audienceTags: ["Shopee / TikTok Shop 内容电商卖家", "泛品 / 白牌卖家"], contentAngles: ["双数大促", "直播短视频", "低价走量", "夏季轻小件"] },
  { priority: 3, country: "印度", code: "IN", tier: "第一梯队", regionType: "亚洲", first: "Flipkart", second: "Amazon India", third: "Meesho", status: "高增长", aovUsd: "US$8-30", rmb: "约 RMB 60-215", profit: "中低", risk: "价格敏感、平台竞争强、支付和退货复杂", audienceTags: ["泛品 / 白牌卖家", "服装卖家"], contentAngles: ["低价白牌", "服饰美妆", "下沉市场"] },
  { priority: 4, country: "日本", code: "JP", tier: "第一梯队", regionType: "亚洲", first: "Amazon Japan", second: "Rakuten", third: "Yahoo! Shopping", status: "高客单", aovUsd: "US$50-110", rmb: "约 RMB 360-790", profit: "高", risk: "品质和本地化要求高", audienceTags: ["Amazon 卖家", "品牌出海团队"], contentAngles: ["本地化", "品质型商品", "评价管理"] },
  { priority: 5, country: "巴西", code: "BR", tier: "第一梯队", regionType: "拉美", first: "Mercado Livre", second: "Amazon Brazil", third: "Shopee", status: "拉美核心", aovUsd: "US$30-75", rmb: "约 RMB 215-540", profit: "中到中高", risk: "税费、清关、物流时效", audienceTags: ["多平台铺货卖家", "物流 / 海外仓 / 支付服务商"], contentAngles: ["拉美平台增长", "本地仓", "清关物流"] },
  { priority: 6, country: "德国", code: "DE", tier: "第二梯队", regionType: "欧洲", first: "Amazon Germany", second: "eBay", third: "OTTO", status: "高客单", aovUsd: "US$70-150", rmb: "约 RMB 500-1,080", profit: "高", risk: "VAT、EPR、包装法和退货要求高", audienceTags: ["品牌出海团队", "平台服务商"], contentAngles: ["欧洲合规", "高客单商品", "VAT/EPR 清单"] },
  { priority: 7, country: "韩国", code: "KR", tier: "第二梯队", regionType: "亚洲", first: "Coupang", second: "Naver", third: "Gmarket", status: "本地强势", aovUsd: "US$45-95", rmb: "约 RMB 325-685", profit: "中高", risk: "本地平台生态强，本地化要求高", audienceTags: ["品牌出海团队", "平台服务商"], contentAngles: ["Coupang 履约", "本地化客服", "评价管理"] },
  { priority: 8, country: "中东/GCC", code: "GCC", tier: "第三梯队", regionType: "中东/GCC", first: "Amazon.ae / Amazon.sa", second: "Noon", third: "SHEIN", status: "高客单", aovUsd: "US$60-170", rmb: "约 RMB 430-1,225", profit: "高", risk: "文化、本地支付、清关和履约", audienceTags: ["品牌货 / 精品 / 高客单卖家", "物流 / 海外仓 / 支付服务商"], contentAngles: ["高客单消费品", "香氛美妆", "本地化表达"] },
  { priority: 9, country: "俄罗斯", code: "RU", tier: "特殊市场", regionType: "欧洲", first: "Ozon", second: "Wildberries", third: "Yandex Market", status: "高风险", aovUsd: "需复核", rmb: "需复核", profit: "中但风险高", risk: "支付、合规、物流和品牌表达边界", audienceTags: ["增长 / 市场 / 销售团队"], contentAngles: ["仅做示范模板", "发布前复核"] }
];

const audienceProfiles = [
  { audience: "泛品 / 白牌 / 低价货卖家", platforms: "Shopee / TikTok Shop / Meesho / Temu", regions: "SEA / IN / LATAM", painPoints: "低价竞争、上新速度、履约成本", themes: "低价走量、轻小件、内容电商", formats: "短视频脚本 / 朋友圈 / 清单", calendarReady: true },
  { audience: "品牌货 / 精品 / 高客单卖家", platforms: "Amazon / Rakuten / Noon / OTTO", regions: "US / JP / DE / GCC", painPoints: "品牌信任、广告成本、售后体验", themes: "高客单选品、评价管理、本地化", formats: "公众号 / LinkedIn / 案例", calendarReady: true },
  { audience: "Amazon 卖家", platforms: "Amazon", regions: "US / JP / DE / UK / CA / AU", painPoints: "大促准备、库存、客服和退货", themes: "Prime Day、黑五网一、广告清单", formats: "Checklist / 邮件 / LinkedIn", calendarReady: true },
  { audience: "Shopee / TikTok Shop 内容电商卖家", platforms: "Shopee / TikTok Shop", regions: "SEA / US", painPoints: "内容转化、直播节奏、达人合作", themes: "双数大促、直播短视频、夏季选品", formats: "短视频脚本 / 社媒帖 / 海报", calendarReady: true },
  { audience: "平台服务商 / 代运营", platforms: "Amazon / Shopee / TikTok Shop / Mercado Libre", regions: "GLOBAL", painPoints: "获客、教育、客户案例", themes: "平台规则、运营能力、服务场景", formats: "白皮书 / 销售话术 / 客户案例", calendarReady: true },
  { audience: "物流 / 海外仓 / 支付服务商", platforms: "多平台", regions: "US / EU / LATAM / GCC", painPoints: "履约时效、清关、资金回流", themes: "旺季履约、退货、支付风控", formats: "行业洞察 / Checklist / 销售跟进", calendarReady: true }
];

const productTrends = [
  { period: "2026-06", region: "SEA", platform: "Shopee / TikTok Shop", type: "夏季轻小件", reason: "季节消费和内容电商转化", audience: "内容电商卖家", angle: "低客单夏季商品短视频卖点", confidence: "中", sourceIds: ["src-seed-public-events"], reviewRequired: false },
  { period: "2026-06", region: "US", platform: "Amazon", type: "Prime Day 备货品", reason: "平台大促准备窗口", audience: "Amazon 卖家", angle: "库存、客服、退货预案", confidence: "中", sourceIds: ["src-seed-public-events"], reviewRequired: true },
  { period: "2026-06", region: "EU", platform: "Amazon / OTTO", type: "户外与家居", reason: "欧洲夏季消费", audience: "品牌出海团队", angle: "高客单夏季场景和合规提醒", confidence: "中", sourceIds: ["src-seed-public-events"], reviewRequired: false }
];

const fashionTrends = [
  { period: "2026-06", region: "GLOBAL", platform: "Instagram / TikTok", style: "度假风 / 泳装", season: "夏季", elements: "轻薄、亮色、场景化搭配", audience: "服装卖家", angle: "夏季服装内容矩阵", confidence: "低", sourceIds: ["src-seed-public-events"], reviewRequired: true },
  { period: "2026-06", region: "JP / KR", platform: "Rakuten / Coupang", style: "通勤与功能面料", season: "梅雨季和夏季通勤", elements: "防晒、速干、简洁剪裁", audience: "品牌出海团队", angle: "日韩本地化服装卖点", confidence: "低", sourceIds: ["src-seed-public-events"], reviewRequired: true }
];

const calendarTemplates = [
  { name: "俄罗斯 6 月社媒月历", scope: "RU", country: "俄罗斯", channels: ["wechat-moments", "linkedin"], output: "monthly-calendar", status: "示范", note: "单一国家模板示例，不代表工具只支持俄罗斯。" },
  { name: "欧洲夏季节点月历", scope: "EU", country: "欧洲", channels: ["linkedin", "blog-seo"], output: "monthly-calendar", status: "可生成", note: "区域模板示例，适合合规、高客单和行业洞察。" },
  { name: "Prime Day 内容月历", scope: "AMZ", country: "Amazon", channels: ["wechat-article", "email", "linkedin"], output: "weekly-plan", status: "可生成", note: "平台活动模板示例，正式发布前需复核当年日期。" },
  { name: "全球社媒热点月历", scope: "GLOBAL", country: "全球", channels: ["wechat-moments", "linkedin", "instagram"], output: "daily-social-topics", status: "预览", note: "全球型热点模板示例。" }
];

const seedEvents = [
  event("2026-06-05", "social", "GLOBAL", "全球", "世界环境日", "社媒热点", "全球型社媒热点，适合做可持续包装、环保选品和品牌价值内容。", "可安排环保包装趋势、绿色物流、可持续选品清单和 LinkedIn 品牌观点帖。", false),
  event("2026-06-08", "shop", "AMZ", "Amazon", "Prime Day 准备窗口", "平台大促", "平台型准备节点，用于提前安排库存、客服、广告素材和促销页面检查。", "正式发布前应复核 Amazon 当年 Prime Day 公告日期。", true),
  event("2026-06-10", "summit", "EU", "欧洲", "行业峰会窗口", "行业峰会", "区域型 B2B 内容窗口，适合承载欧洲市场趋势观察和会前线索培育。", "后续接入具体峰会官网日程后替换为真实会议名称。", true),
  event("2026-06-14", "sports", "GLOBAL", "全球", "体育赛事节点", "体育赛事", "体育热点内容节点，适合运动户外、观赛场景、家居和派对消费主题。", "正式发布前需复核赛事名称、赛程和版权表达边界。", true),
  event("2026-06-18", "platform", "PLAT", "平台通用", "平台内容周", "平台内容", "平台规则、店铺运营和卖家教育内容档期。", "可安排平台规则解读、店铺运营 checklist、卖家案例和短视频脚本。", false),
  event("2026-06-21", "social", "SEA", "东南亚", "夏季选品", "选品趋势", "区域型消费趋势节点，适合东南亚轻小件、内容电商和季节性商品。", "可安排 Shopee/TikTok Shop 夏季轻小件选品和短视频卖点脚本。", false),
  event("2026-06-24", "summit", "XBD", "跨境泛话题", "跨境线上论坛", "行业内容", "适合承载行业观察、客户教育和销售线索培育。", "可安排线上论坛预热、嘉宾观点拆条、会后公众号复盘和销售跟进素材。", true),
  event("2026-06-28", "shop", "DE", "德国", "月末促销", "国家/地区促销", "德国单一市场节点示范，适合连接高客单、高合规和欧洲本地化主题。", "可安排德国市场促销提醒、VAT/EPR 合规清单和高客单商品内容角度。", false)
];

function event(date, cls, code, region, title, type, description, suggestion, reviewRequired) {
  return {
    id: `seed-${date}-${code.toLowerCase()}-${title.replace(/\s+/g, "-")}`,
    date,
    day: Number(date.slice(8, 10)),
    cls,
    code,
    region,
    title,
    type,
    description,
    suggestion,
    contentAngle: suggestion,
    recommendedFormats: defaultFormatsFor(cls),
    associatedPlatforms: defaultPlatformsFor(code),
    associatedAudiences: defaultAudiencesFor(code, cls),
    impactCategories: defaultCategoriesFor(cls),
    contentGoals: defaultGoalsFor(cls),
    channels: defaultChannelsFor(cls),
    sourceIds: ["src-seed-public-events"],
    reviewRequired
  };
}

function defaultFormatsFor(cls) {
  const map = {
    festival: ["朋友圈内容", "海报", "社媒帖"],
    sports: ["社媒帖", "海报主题清单", "短视频脚本方向"],
    summit: ["LinkedIn 观点帖", "销售跟进内容", "公众号选题"],
    shop: ["清单 / Checklist", "公众号选题", "邮件主题"],
    platform: ["平台教育帖", "Checklist", "短视频脚本方向"],
    social: ["朋友圈内容", "LinkedIn 观点帖", "海报"]
  };
  return map[cls] || ["社媒帖"];
}

function defaultPlatformsFor(code) {
  const map = {
    AMZ: ["Amazon"],
    SHP: ["Shopee"],
    TT: ["TikTok Shop"],
    SEA: ["Shopee", "TikTok Shop", "Lazada"],
    LATAM: ["Mercado Libre", "Amazon"],
    EU: ["Amazon", "eBay", "OTTO"],
    DE: ["Amazon Germany", "OTTO", "eBay"],
    KR: ["Coupang", "Naver"],
    JP: ["Amazon Japan", "Rakuten"],
    PLAT: ["多平台"],
    GLOBAL: ["多平台"]
  };
  return map[code] || ["多平台"];
}

function defaultAudiencesFor(code, cls) {
  if (code === "AMZ") return ["Amazon 卖家", "平台服务商 / 代运营"];
  if (code === "SEA") return ["Shopee / TikTok Shop 内容电商卖家", "泛品 / 白牌 / 低价货卖家"];
  if (["EU", "DE"].includes(code)) return ["品牌货 / 精品 / 高客单卖家", "平台服务商 / 代运营"];
  if (cls === "summit") return ["平台服务商 / 代运营", "销售团队", "增长 / 市场 / 销售团队"];
  return ["全球增长团队", "品牌出海团队"];
}

function defaultCategoriesFor(cls) {
  const map = {
    festival: ["礼品", "亲子", "本地化内容"],
    sports: ["运动户外", "观赛场景", "服饰"],
    summit: ["B2B 服务", "行业洞察", "销售线索"],
    shop: ["大促备货", "客服", "广告投放"],
    platform: ["平台规则", "运营能力", "卖家教育"],
    social: ["品牌价值", "社媒热点", "可持续内容"]
  };
  return map[cls] || ["内容机会"];
}

function defaultGoalsFor(cls) {
  const map = {
    festival: ["holiday-moment", "brand-awareness"],
    sports: ["brand-awareness", "holiday-moment"],
    summit: ["industry-insight", "sales-nurture"],
    shop: ["campaign-warmup", "lead-conversion"],
    platform: ["platform-education", "lead-conversion"],
    social: ["brand-awareness", "industry-insight"]
  };
  return map[cls] || ["brand-awareness"];
}

function defaultChannelsFor(cls) {
  const map = {
    festival: ["wechat-moments", "instagram", "facebook"],
    sports: ["wechat-moments", "instagram", "tiktok"],
    summit: ["linkedin", "blog-seo", "email"],
    shop: ["wechat-article", "email", "linkedin"],
    platform: ["wechat-article", "linkedin", "tiktok"],
    social: ["wechat-moments", "linkedin", "instagram"]
  };
  return map[cls] || ["wechat-moments", "linkedin"];
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "global-growth-decision-center/1.0" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1200));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function classifyHoliday(item) {
  const text = `${item.name || ""} ${item.localName || ""}`.toLowerCase();
  if (text.includes("christmas") || text.includes("new year") || text.includes("easter")) return "festival";
  if (text.includes("independence") || text.includes("national") || text.includes("constitution")) return "festival";
  return "festival";
}

async function fetchHolidays(failures) {
  if (offline) return [];

  const results = [];
  for (const country of countries) {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${targetYear}/${country.code}`;
    try {
      const items = await fetchJson(url);
      for (const item of items) {
        const [year, month, day] = item.date.split("-").map(Number);
        if (year !== targetYear || month !== targetMonth) continue;
        results.push({
          id: `holiday-${country.code.toLowerCase()}-${item.date}-${slug(item.name || item.localName)}`,
          date: item.date,
          day,
          cls: classifyHoliday(item),
          code: country.regionCode,
          region: country.name,
          title: item.localName || item.name,
          type: "公开节假日",
          description: `${country.name}公开节假日：${item.name || item.localName}。`,
          suggestion: "可用于本地化内容、节日前预热、社媒提醒和区域营销日历。",
          contentAngle: "本地化内容、节日前预热、区域营销提醒。",
          recommendedFormats: defaultFormatsFor("festival"),
          associatedPlatforms: defaultPlatformsFor(country.regionCode),
          associatedAudiences: defaultAudiencesFor(country.regionCode, "festival"),
          impactCategories: defaultCategoriesFor("festival"),
          contentGoals: defaultGoalsFor("festival"),
          channels: defaultChannelsFor("festival"),
          sourceIds: ["src-nager-holidays"],
          reviewRequired: false
        });
      }
    } catch (error) {
      failures.push({
        sourceId: "src-nager-holidays",
        target: country.code,
        message: error.message
      });
    }
  }
  return results;
}

async function fetchWorldBankSignals(failures) {
  if (offline) return [];

  const countryCodes = countries.map(country => country.worldBank).join(";");
  const indicators = [
    { id: "SP.POP.TOTL", label: "人口" },
    { id: "NY.GDP.MKTP.CD", label: "GDP current US$" },
    { id: "IT.NET.USER.ZS", label: "互联网使用率" }
  ];
  const signals = [];

  for (const indicator of indicators) {
    const url = `https://api.worldbank.org/v2/country/${countryCodes}/indicator/${indicator.id}?format=json&per_page=20000`;
    try {
      const payload = await fetchJson(url);
      const rows = Array.isArray(payload) ? payload[1] || [] : [];
      const latestByCountry = new Map();
      for (const row of rows) {
        if (row.value === null || latestByCountry.has(row.countryiso3code)) continue;
        latestByCountry.set(row.countryiso3code, row);
      }
      for (const [iso3, row] of latestByCountry.entries()) {
        const country = countries.find(item => item.worldBank === iso3);
        signals.push({
          id: `wb-${indicator.id}-${iso3}`,
          country: country ? country.name : row.country.value,
          code: country ? country.regionCode : iso3,
          indicator: indicator.label,
          value: row.value,
          year: row.date,
          sourceIds: ["src-world-bank"],
          reviewRequired: false
        });
      }
    } catch (error) {
      failures.push({
        sourceId: "src-world-bank",
        target: indicator.id,
        message: error.message
      });
    }
  }

  return signals;
}

function slug(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sameMonth(eventItem) {
  const [year, month] = eventItem.date.split("-").map(Number);
  return year === targetYear && month === targetMonth;
}

function uniqueEvents(events) {
  const seen = new Set();
  return events.filter(item => {
    const key = `${item.date}|${item.code}|${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

async function readPreviousData() {
  try {
    return JSON.parse(await fs.readFile(outputPath, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  await fs.mkdir(dataDir, { recursive: true });
  const previous = await readPreviousData();
  const failures = [];
  const checkedAt = new Date().toISOString();
  const holidayEvents = await fetchHolidays(failures);
  const marketSignals = await fetchWorldBankSignals(failures);
  const seedMonthEvents = seedEvents.filter(sameMonth);
  const events = uniqueEvents([...holidayEvents, ...seedMonthEvents]);
  const reviewRequired = events.filter(item => item.reviewRequired).length;

  const output = {
    version: 1,
    generatedAt: checkedAt,
    targetYear,
    targetMonth,
    dataMode: offline ? "offline-fallback" : "public-online-refresh",
    configOptions,
    marketLibrary,
    audienceProfiles,
    productTrends,
    fashionTrends,
    calendarTemplates,
    calendar: {
      year: targetYear,
      month: targetMonth,
      label: `${new Date(Date.UTC(targetYear, targetMonth - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${targetYear} Calendar`,
      events: events.length ? events : previous.calendar?.events || seedMonthEvents
    },
    marketSignals: marketSignals.length ? marketSignals : previous.marketSignals || [],
    topics: buildTopics(previous.topics || []),
    sources: sources.map(source => ({
      ...source,
      lastCheckedAt: checkedAt,
      status: failures.some(item => item.sourceId === source.id) ? "warning" : source.status
    })),
    updateStatus: {
      lastUpdatedAt: checkedAt,
      nextUpdateHint: "GitHub Actions 每天运行一次",
      counts: {
        sources: sources.length,
        events: events.length || previous.calendar?.events?.length || seedMonthEvents.length,
        reviewRequired,
        failures: failures.length
      },
      failures
    }
  };

  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await fs.writeFile(
    jsOutputPath,
    `window.GROWTH_DECISION_DATA = ${JSON.stringify(output, null, 2)};\n`,
    "utf8"
  );
  console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);
  console.log(`Updated ${path.relative(process.cwd(), jsOutputPath)}`);
  console.log(`Events: ${output.updateStatus.counts.events}, failures: ${failures.length}`);
}

function buildTopics() {
  return [
    {
      id: "topic-prime-day-readiness",
      title: "Prime Day 前客服和退货预案清单",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "AMZ",
      platform: "Amazon",
      audience: "Amazon 卖家",
      node: "Prime Day 准备窗口",
      trend: "大促备货",
      angle: "客服准备、广告预算、库存和退货预案",
      format: "Checklist",
      priority: "High",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: true,
      sentToCalendar: true,
      note: "正式排期前复核 Amazon 当年公告日期。"
    },
    {
      id: "topic-sea-short-video",
      title: "东南亚夏季轻小件短视频卖点脚本",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "SEA",
      platform: "Shopee / TikTok Shop",
      audience: "Shopee / TikTok Shop 内容电商卖家",
      node: "夏季选品",
      trend: "夏季轻小件",
      angle: "低客单夏季商品短视频卖点",
      format: "Short video",
      priority: "Medium",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: false,
      sentToCalendar: true,
      note: "适合朋友圈和 TikTok 短视频脚本方向。"
    },
    {
      id: "topic-eu-compliance",
      title: "德国月末促销前 VAT/EPR 合规提醒",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "DE",
      platform: "Amazon Germany / OTTO",
      audience: "品牌出海团队",
      node: "月末促销",
      trend: "欧洲高客单促销",
      angle: "促销前合规清单和风险提醒",
      format: "LinkedIn / Checklist",
      priority: "Medium",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: false,
      sentToCalendar: true,
      note: "可进入欧洲夏季节点月历。"
    },
    {
      id: "topic-jp-localization",
      title: "日本品质型商品评价管理内容包",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "JP",
      platform: "Amazon Japan / Rakuten",
      audience: "品牌出海团队",
      node: "本地化运营窗口",
      trend: "品质型商品",
      angle: "评价管理、售后体验和本地化表达",
      format: "公众号 / 客户案例",
      priority: "Medium",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: false,
      sentToCalendar: false,
      note: "适合从市场简评发送到日历。"
    },
    {
      id: "topic-br-logistics",
      title: "巴西 Mercado Livre 本地仓和清关内容",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "BR",
      platform: "Mercado Livre",
      audience: "物流 / 海外仓 / 支付服务商",
      node: "拉美平台增长",
      trend: "本地仓和物流",
      angle: "清关、物流时效和回款风险",
      format: "行业洞察 / 销售话术",
      priority: "Medium",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: false,
      sentToCalendar: false,
      note: "适合销售线索培育。"
    },
    {
      id: "topic-gcc-premium",
      title: "中东/GCC 高客单消费品本地化表达",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "GCC",
      platform: "Amazon.ae / Noon",
      audience: "品牌货 / 精品 / 高客单卖家",
      node: "高客单市场内容窗口",
      trend: "香氛 / 美妆 / 家居",
      angle: "文化表达、支付和清关提醒",
      format: "LinkedIn / 海报主题清单",
      priority: "Medium",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: true,
      sentToCalendar: false,
      note: "发布前需复核文化表达边界。"
    },
    {
      id: "topic-platform-service",
      title: "平台服务商多平台运营能力案例",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "GLOBAL",
      platform: "多平台",
      audience: "平台服务商 / 代运营",
      node: "平台内容周",
      trend: "卖家教育",
      angle: "平台规则、运营能力和服务场景",
      format: "客户案例 / 白皮书",
      priority: "High",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: false,
      sentToCalendar: true,
      note: "适合平台内容周。"
    },
    {
      id: "topic-fashion-summer",
      title: "全球夏季服装趋势社媒内容矩阵",
      month: `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      region: "GLOBAL",
      platform: "Instagram / TikTok",
      audience: "服装卖家",
      node: "夏季消费",
      trend: "度假风 / 泳装",
      angle: "夏季服装内容矩阵和社媒选题",
      format: "社媒帖 / 短视频脚本",
      priority: "Low",
      sourceIds: ["src-seed-public-events"],
      reviewRequired: true,
      sentToCalendar: false,
      note: "趋势可信度较低，需要复核搜索和社媒趋势。"
    }
  ];
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
