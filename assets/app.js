/* =====================================================================
   CardLab 前端骨架 v4（雇主二轮反馈：英文改默认＋收入块推荐人机制）
   v3（雇主反馈修订版：中英双语整套配置切换、
   饮品口径改咖啡、金额全站美元、首页新增被动收入说明区＋CRM 链接）
   架构分层（每层只管一件事，层与层之间只通过配置与数据对象通信）：
     1. Config   配置层：站点/工具矩阵来自 config/tools.json；每个工具的
                 玩法配置路径写在该工具自己的 "pack" 字段里，启动时按表
                 动态加载并按工具 id 登记。拉取失败回退内置默认配置。
     2. Router   路由层：三个视图切换 + hash 深链（#工具id 直达工具页）。
     3. Views    视图层：首页矩阵由配置渲染；工具页是单输入型工具的通用
                 壳（其他交互类型的新工具加自己的视图模块接入路由）。
     4. Engines  引擎层：每个工具一个纯函数引擎，按工具 id 注册；
                 输入 → 结果数据对象，不碰 DOM。
     5. Card     卡片层：卡片模板按工具 id 注册（CardTemplates），把结果
                 数据对象填进 9:16 卡片；卡面文案来自该工具的 pack 配置。
     6. Export   导出层：离屏克隆渲染 1080×1920 PNG（克隆内重绘二维码、
                 同步终值字号）；桌面自动下载，移动端出浮层长按保存。
   新增一个工具 = tools.json 加一条配置（含 pack 路径）+ 一份 pack 配置
   + 注册一个引擎 + 注册一张卡片模板；路由与导出主干不改。
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ================= 1. Config 配置层 ================= */
  var FALLBACK = {
    site: { "site": { "name": "卡片工场", "nameEn": "CARDLAB", "slogan": "只生产值得截图发群的卡片", "trustLine": "不登录 · 不授权 · 不存你的信息" }, "tools": [{ "id": "x-value", "no": "01", "name": "X 价值计算器", "desc": "输入一个用户名，3 秒算出它值多少杯咖啡", "status": "live", "batch": "首发", "cta": "开始估值", "inputPlaceholder": "输入用户名", "trustLine": "不登录 · 不授权 · 不存你的用户名", "fineprint": "估值公式纯属虚构，图一乐。", "pack": "config/valuation.json", "template": "x-value" }] },
    packs: { "x-value": { "tool": "x-value", "min": 800, "max": 9800000, "exponent": 0.7, "coffeePrice": 5, "currency": "$", "equivUnit": "杯咖啡", "analysisMs": 1500, "analysisTexts": ["正在假装连线 X 数据库…", "正在翻看你的黑历史推文…", "正在计算围观群众数量…", "正在生成你的身价…"], "tiers": [{ "id": "high", "label": "赛博顶流大户", "min": 1000000 }, { "id": "mid", "label": "群里的气氛担当", "min": 60000 }, { "id": "low", "label": "赛博纯路人", "min": 0 }], "copies": { "high": ["发条推文的功夫，把普通人半年的社保都赚出来了。", "平时在群里潜水装死，原来是在闷声干大事。", "建议直接截图甩给甲方，问他们懂不懂行情。", "这身价，路过的品牌方看你一眼都觉得高攀了。"], "mid": ["赚了点小钱但不敢告诉亲戚，最尴尬的身价区间。", "群里发言终于有人接茬了，这就是排面。", "离财富自由还差点意思，但咖啡已经敢点大杯加浓缩了。", "这身价，发红包都得手抖一下。"], "low": ["账号里最值钱的，是你那点所剩无几的幽默感。", "属于在赛博世界做慈善，天天免费给平台贡献活跃度。", "就这三瓜两枣的身价，天天还操心世界局势。", "连赛博难民都算不上，充其量是个路过的吃瓜群众。"] }, "card": { "label": "估值身价", "watermarkName": "卡片工场 CARDLAB", "note": "估值纯属虚构 · 娱乐而已" } } }
  };
  /* 英文兜底（与 FALLBACK 对位）：英文模式下配置拉取失败时也不能整站
     掉回中文——内容与 config/tools.en.json + valuation.en.json 保持一致 */
  var FALLBACK_EN = {
    site: { "site": { "name": "CardLab", "nameEn": "CARDLAB", "slogan": "We only make cards worth screenshotting and sharing", "trustLine": "No sign-up · No login · Nothing about you is stored" }, "tools": [{ "id": "x-value", "no": "01", "name": "X Value Calculator", "desc": "Type in a username — in 3 seconds, see what it's worth in cups of coffee", "status": "live", "batch": "Launch", "cta": "Calculate value", "inputPlaceholder": "Enter a username", "trustLine": "No sign-up · No login · Your username is never stored", "fineprint": "The valuation formula is completely made up. Just for fun.", "pack": "config/valuation.en.json", "template": "x-value" }, { "id": "career-test", "no": "02", "name": "Career Personality Roast", "desc": "10 either-or questions that reveal your work persona", "status": "soon", "batch": "Launch", "pack": null, "template": null }, { "id": "stance", "no": "03", "name": "Hot Take Machine", "desc": "When something trends, tap to pick a side and get your card", "status": "soon", "batch": "Launch", "pack": null, "template": null }, { "id": "group-vote", "no": "04", "name": "Group Chat Vote Ender", "desc": "Settle the argument your group chat can't — one vote decides", "status": "later", "batch": "Wave 2", "pack": null, "template": null }, { "id": "flower", "no": "05", "name": "Digital Bouquet", "desc": "Send flowers that never wilt — they unlock when opened", "status": "later", "batch": "Wave 2", "pack": null, "template": null }, { "id": "fake-ai", "no": "06", "name": "Human Pretending to Be AI", "desc": "Real humans, timed answers — see who can pass as a bot", "status": "later", "batch": "Review-gated", "pack": null, "template": null }] },
    packs: { "x-value": { "tool": "x-value", "min": 800, "max": 9800000, "exponent": 0.7, "coffeePrice": 5, "currency": "$", "equivUnit": "cups of coffee", "analysisMs": 1500, "analysisTexts": ["Pretending to connect to the X database…", "Digging through your old posts…", "Counting the lurkers…", "Calculating your worth…"], "tiers": [{ "id": "high", "label": "Cyber Whale", "min": 1000000 }, { "id": "mid", "label": "Group Chat MVP", "min": 60000 }, { "id": "low", "label": "Cyber Passerby", "min": 0 }], "copies": { "high": ["One post from you earns what takes most people half a year.", "All that lurking in group chats — turns out you were quietly building an empire.", "Screenshot this and send it to your clients. They'll get the picture.", "Brands walk past you and feel out of their league."], "mid": ["Decent money, but you wouldn't tell your family. The awkward middle.", "People actually reply to you in group chats now. That's clout.", "Not quite financial freedom, but a large coffee with an extra shot is no longer a big decision.", "This is the kind of net worth that makes your hand shake before sending a big gift."], "low": ["The most valuable thing on your account is what's left of your sense of humor.", "You're doing charity work for the platform — free engagement, every single day.", "Net worth: pocket change. Opinions on world affairs: priceless.", "Not even a cyber refugee — just a passerby with a front-row seat."] }, "card": { "label": "ESTIMATED WORTH", "watermarkName": "CardLab CARDLAB", "note": "Made-up numbers · Just for fun" } } }
  };
  function fallbackFor() { return lang === 'en' ? FALLBACK_EN : FALLBACK; }
  function fetchJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }
  /* 多语言（v3 新增，v4 改默认）：默认英文。整套文案按语言成套放在配置里——
     站点/工具：config/tools.json（中） / config/tools.en.json（英），
     玩法包路径写在各自 tools 文件的 pack 字段；界面杂项文案与
     被动收入区链接在 config/i18n.json。切换语言 = 整套重载 + 重渲染。
     v4 起不再读 localStorage 旧值：雇主在 v3 存过的中文偏好不能把
     默认英文顶掉；切换状态只在页面内保持（变量 lang + 整套重渲染）。 */
  var LANG_FILES = { zh: 'config/tools.json', en: 'config/tools.en.json' };
  var lang = 'en';
  /* URL 带 ?lang=zh / ?lang=en 时以 URL 为准（方便分享指定语言的链接） */
  try {
    var qLang = new URLSearchParams(window.location.search).get('lang');
    if (qLang && LANG_FILES[qLang]) lang = qLang;
  } catch (e) {}
  var FALLBACK_I18N = {
    income: { url: 'https://earnway.art', blogUrl: 'https://earnway.art/blog/generating-ad-revenue-google-trending-keywords-earnway-art', refBase: 'https://earnway.art', refPath: '/register.php?ref=', commissionNote: '' },
    ui: {
      zh: { pageTitle: '卡片工场 · X 价值计算器', homeFoot: '一个输入框 · 一个结果 · 一张卡片，够了。', liveTag: '立即测', toolNoTpl: '工具 {no} · {batch}', defaultCta: '开始', formErrorEmpty: '先填一个用户名，随便谁的都行', formErrorNoPack: '这个工具还在准备中，过几天再来', saveBtn: '保存图片', saveGenerating: '正在生成…', saveFailed: '生成失败，再点一次', againBtn: '‹ 再测一个', saveHintMobile: '长按图片，保存到相册', saveHintDesktop: '已下载 · 也可以长按或右键保存这张图', toggleLabel: 'EN', backLabel: '返回', cardAlt: '估值卡片', incomeTitle: '想赚奖励积分和被动收入？', incomeText: '本站的基础功能——做卡、估值、分享——都不用注册，打开就能玩。如果想赚 EW/ART 奖励积分，或者通过 earnway.art 的每日任务获得被动收入，需要先在平台注册；提现时要完成 KYC 身份验证。这个集成只是一个可选的增值项，不会干扰核心体验。', incomeBtn: '前往 earnway.art →', incomeBlog: '核心业务说明：靠趋势关键词赚广告收入', refLabel: '推荐人', refYes: '有推荐人', refNo: '没有推荐人', refPlaceholder: '输入推荐码，或粘贴推荐人链接', refNote: '分享这条链接。有人通过它注册并充值 EW，你就能自动获得佣金。', cardRefLabel: '通过我的链接加入：', soonTag: '即将上线', toolRefTitle: '有推荐人？填上推荐码，你生成的卡就会带上他的推荐链接' },
      en: { pageTitle: 'CardLab · X Value Calculator', homeFoot: "One input · One result · One card. That's it.", liveTag: 'Try it', toolNoTpl: 'Tool {no} · {batch}', defaultCta: 'Start', formErrorEmpty: "Enter a username first — anyone's will do", formErrorNoPack: 'This tool is still in the works. Check back soon.', saveBtn: 'Save image', saveGenerating: 'Generating…', saveFailed: 'Failed — tap to retry', againBtn: '‹ Test another', saveHintMobile: 'Long-press the image to save it', saveHintDesktop: 'Downloaded · you can also long-press or right-click to save', toggleLabel: '中文', backLabel: 'Back', cardAlt: 'Valuation card', incomeTitle: 'Want reward points and passive income?', incomeText: 'The basics here — creating, valuing, and sharing cards — are available without registration. If you wish to earn "EW/ART" reward points, or generate passive income through daily tasks on earnway.art, you must register on the platform; identity verification (KYC) is required for withdrawals. This integration is an optional value-add and does not interfere with the core experience.', incomeBtn: 'Go to earnway.art →', incomeBlog: 'Core business: generating ad revenue with trending keywords', refLabel: 'Referrer', refYes: 'I have a referrer', refNo: 'No referrer', refPlaceholder: "Referral code or referrer's link", refNote: 'Share this link. When someone registers and tops up EW, you earn automatically.', cardRefLabel: 'Join via my link:', soonTag: 'Coming soon', toolRefTitle: 'Have a referrer? Add their code — your card will carry their referral link' }
    }
  };
  var Config = {
    site: null,
    packs: {},
    i18n: null,
    loadI18n: function () {
      if (Config.i18n) return Promise.resolve(Config.i18n);
      return fetchJson('config/i18n.json').then(function (d) { Config.i18n = d; return d; })
        .catch(function () { Config.i18n = FALLBACK_I18N; return Config.i18n; });
    },
    load: function () {
      return Config.loadI18n().then(function () {
        return fetchJson(LANG_FILES[lang]).catch(function () { return null; });
      }).then(function (site) {
        if (!site) { var fbk = fallbackFor(); Config.site = fbk.site; Config.packs = fbk.packs; return Config; }
        Config.site = site;
        Config.packs = {};
        var jobs = site.tools.filter(function (t) { return t.pack; }).map(function (t) {
          return fetchJson(t.pack).then(function (pack) { Config.packs[t.id] = pack; })
            .catch(function () { var fbk2 = fallbackFor(); if (fbk2.packs[t.id]) Config.packs[t.id] = fbk2.packs[t.id]; });
        });
        return Promise.all(jobs).then(function () { return Config; });
      });
    }
  };
  function ui() {
    return (Config.i18n && Config.i18n.ui && Config.i18n.ui[lang]) || FALLBACK_I18N.ui[lang] || {};
  }
  /* 兜底文案也按当前语言取，避免英文模式露出中文 */
  function fb(zh, en) { return lang === 'en' ? en : zh; }
  /* 界面杂项文案（标题/页脚/按钮/被动收入区）统一从 i18n 配置刷一遍 */
  function applyChrome() {
    var u = ui();
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    if (u.pageTitle) document.title = u.pageTitle;
    $('home-foot').textContent = u.homeFoot || '';
    $('btn-save').textContent = u.saveBtn || fb('保存图片', 'Save image');
    $('btn-again').textContent = u.againBtn || '';
    $('lang-toggle').textContent = u.toggleLabel || 'EN';
    var inc = (Config.i18n && Config.i18n.income) || FALLBACK_I18N.income;
    $('income-title').textContent = u.incomeTitle || '';
    $('income-text').textContent = u.incomeText || '';
    var btn = $('income-btn');
    btn.textContent = u.incomeBtn || '';
    applyReferral();
    $('btn-back-home').setAttribute('aria-label', u.backLabel || fb('返回', 'Back'));
    $('save-img').alt = u.cardAlt || fb('估值卡片', 'Valuation card');
    var blog = $('income-blog');
    blog.textContent = u.incomeBlog || '';
    if (inc && inc.blogUrl) blog.href = inc.blogUrl;
    $('tool-ref-title').textContent = u.toolRefTitle || fb('有推荐人？填上推荐码，你生成的卡就会带上他的推荐链接', 'Have a referrer? Add their code — your card will carry their referral link');
  }

  /* ================= 推荐人机制（v4 新增） =================
     收入块内「有推荐人 / 没有推荐人」二选一（状态只存页面变量，
     语言切换整套重渲染后由 applyChrome 重新刷回，不丢）：
       · 没有推荐人 → 主按钮走 income.url 普通链接；
       · 有推荐人 → 展开输入框，用户填推荐码或粘贴整条推荐链接
         （粘链接时自动抽出 ref 参数值），主按钮链接按雇主确认的
         正式格式生成：income.refBase + income.refPath + 推荐码，
         即默认 https://earnway.art/register.php?ref=<推荐码>；
         基址与路径都在 i18n.json 里，换站/换路径只改配置。
         还没填码时主按钮先回普通链接。输入框不预填任何示例真码。
     佣金说明句来自 ui.refNote（定性口径，借雇主原站文案）；
     比例数字雇主明示不显示，income.commissionNote 保持空、
     不渲染任何比例。 */
  var referral = { has: false, code: '' };
  function extractRefCode(raw) {
    var v = String(raw || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) {
      try {
        var fromUrl = new URL(v).searchParams.get('ref');
        if (fromUrl) return fromUrl;
      } catch (e) {}
      var m = v.match(/[?&]ref=([^&#]+)/);
      if (m) { try { return decodeURIComponent(m[1]); } catch (e2) { return m[1]; } }
      return ''; /* 粘了链接但里面没有 ref 参数：不把整条链接当推荐码拼 */
    }
    /* 没带协议的链接（如 earnway.art/register.php?ref=XXX）：同样抽 ref 值，
       别把整条链接当成推荐码拼出坏链 */
    if (v.indexOf('/') !== -1) {
      var m2 = v.match(/ref=([^&#\s]+)/);
      if (m2) { try { return decodeURIComponent(m2[1]); } catch (e3) { return m2[1]; } }
    }
    return v.replace(/\s+/g, '');
  }
  function incomeUrl() {
    var inc = (Config.i18n && Config.i18n.income) || FALLBACK_I18N.income;
    var plain = (inc && inc.url) || 'https://earnway.art';
    if (!referral.has) return plain;
    var code = extractRefCode(referral.code);
    if (!code) return plain;
    var refBase = (inc && inc.refBase) || plain;
    var refPath = (inc && inc.refPath) || '/register.php?ref=';
    return refBase.replace(/\/$/, '') + refPath + encodeURIComponent(code);
  }
  /* 推荐人是否真正生效（选了「有推荐人」且填出了有效推荐码）：
     生效时返回拼好的推荐链接全文，否则返回空串。卡片层用它决定
     是否在卡面显示推荐链接、二维码是否改编推荐链接（雇主三轮反馈：
     卡片送出去要能推广，保存图片里必须带推荐链接）。 */
  function activeRefUrl() {
    if (!referral.has) return '';
    if (!extractRefCode(referral.code)) return '';
    return incomeUrl();
  }
  function applyReferral() {
    var u = ui();
    var inc = (Config.i18n && Config.i18n.income) || FALLBACK_I18N.income;
    $('ref-label').textContent = u.refLabel || fb('推荐人', 'Referrer');
    $('ref-yes').textContent = u.refYes || fb('有推荐人', 'I have a referrer');
    $('ref-no').textContent = u.refNo || fb('没有推荐人', 'No referrer');
    $('ref-yes').classList.toggle('active', referral.has);
    $('ref-no').classList.toggle('active', !referral.has);
    $('ref-yes').setAttribute('aria-pressed', referral.has ? 'true' : 'false');
    $('ref-no').setAttribute('aria-pressed', referral.has ? 'false' : 'true');
    $('ref-fields').classList.toggle('hidden', !referral.has);
    var input = $('ref-input');
    input.placeholder = u.refPlaceholder || '';
    if (input.value !== referral.code) input.value = referral.code;
    $('ref-note').textContent = u.refNote || '';
    var note = (inc && inc.commissionNote) || '';
    $('ref-commission').textContent = note;
    $('ref-commission').classList.toggle('hidden', !note);
    $('income-btn').href = incomeUrl();
    /* 工具页推荐人入口与收入块共用同一份 referral 状态：两处控件
       （开关、输入框）在每次 applyReferral 时一起按状态刷新，
       任一处修改另一处立即同步，不存在两套值 */
    $('tool-ref-yes').textContent = u.refYes || fb('有推荐人', 'I have a referrer');
    $('tool-ref-no').textContent = u.refNo || fb('没有推荐人', 'No referrer');
    $('tool-ref-yes').classList.toggle('active', referral.has);
    $('tool-ref-no').classList.toggle('active', !referral.has);
    $('tool-ref-yes').setAttribute('aria-pressed', referral.has ? 'true' : 'false');
    $('tool-ref-no').setAttribute('aria-pressed', referral.has ? 'false' : 'true');
    $('tool-ref-fields').classList.toggle('hidden', !referral.has);
    var tInput = $('tool-ref-input');
    tInput.placeholder = u.refPlaceholder || '';
    if (tInput.value !== referral.code) tInput.value = referral.code;
  }

  /* ================= 2. Router 路由层 ================= */
  var Router = {
    views: null,
    init: function () {
      Router.views = { home: $('view-home'), tool: $('view-tool'), card: $('view-card') };
    },
    show: function (name) {
      Object.keys(Router.views).forEach(function (k) {
        Router.views[k].classList.toggle('hidden', k !== name);
      });
      window.scrollTo(0, 0);
    },
    setHash: function (h) { try { history.replaceState(null, '', h); } catch (e) {} }
  };

  /* ================= 3. Views 视图层 ================= */
  var currentTool = null;
  function renderHome() {
    applyChrome();
    var s = Config.site;
    $('site-name').textContent = s.site.name;
    $('site-name-en').textContent = s.site.nameEn;
    $('site-slogan').textContent = s.site.slogan;
    $('site-trust').textContent = s.site.trustLine;
    var grid = $('tool-grid');
    grid.innerHTML = '';
    s.tools.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-card' + (t.status === 'live' ? ' live featured' : ' off');
      b.innerHTML =
        '<span class="tool-no-badge">' + t.no + '</span>' +
        '<span class="tool-main"><span class="tool-name">' + t.name + '</span>' +
        '<span class="tool-desc">' + t.desc + '</span></span>' +
        (t.status === 'live' ? '<span class="tool-tag live">' + (ui().liveTag || fb('立即测', 'Try it')) + '</span>'
                             : '<span class="tool-tag">' + (ui().soonTag || fb('即将上线', 'Coming soon')) + '</span>');
      if (t.status === 'live') {
        b.addEventListener('click', function () { openTool(t); });
      }
      grid.appendChild(b);
    });
  }
  function openTool(t) {
    currentTool = t;
    Router.setHash('#' + t.id);
    $('tool-no').textContent = (ui().toolNoTpl || fb('工具 {no} · {batch}', 'Tool {no} · {batch}')).replace('{no}', t.no).replace('{batch}', t.batch);
    $('tool-title').textContent = t.name;
    $('tool-desc').textContent = t.desc + (lang === 'en' ? '' : '。');
    $('tool-cta').textContent = t.cta || ui().defaultCta || fb('开始', 'Start');
    $('tool-trust').textContent = t.trustLine || '';
    $('tool-fineprint').textContent = t.fineprint || '';
    $('handle-input').placeholder = t.inputPlaceholder || '输入用户名';
    Router.show('tool');
    $('handle-input').focus();
  }

  /* ================= 4. Engines 引擎层（纯函数，不碰 DOM） ================= */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  var Engines = {
    /* 工具① X 价值计算器：同名恒定；对数分布＋幂次整形，三档大致各占三分之一 */
    'x-value': function (rawInput, pack) {
      var handle = String(rawInput).replace(/[@\s]/g, '');
      if (!handle) return null;
      var rand = mulberry32(fnv1a(handle.toLowerCase()));
      var value = Math.floor(pack.min * Math.pow(pack.max / pack.min, Math.pow(rand(), pack.exponent)));
      var tiers = pack.tiers.slice().sort(function (a, b) { return b.min - a.min; });
      var tier = tiers[tiers.length - 1];
      for (var i = 0; i < tiers.length; i++) {
        if (value >= tiers[i].min) { tier = tiers[i]; break; }
      }
      var pool = pack.copies[tier.id];
      return {
        handle: handle,
        value: value,
        valueText: pack.currency + commas(value),
        equivText: '≈ ' + commas(Math.round(value / (pack.coffeePrice || pack.milkTeaPrice || 18))) + ' ' + pack.equivUnit,
        tierLabel: tier.label,
        copy: pool[Math.floor(rand() * pool.length)]
      };
    }
  };

  /* ================= 5. Card 卡片层（模板按工具 id 注册） ================= */
  function fitCard() {
    var wrap = document.querySelector('.card-scale-wrap');
    var scaleW = Math.min(wrap.parentElement.clientWidth - 40, 430) / 540;
    /* 高度约束：卡片＋保存按钮＋再测链接必须同屏，移动端不滚动找按钮 */
    var scaleH = (window.innerHeight - 196) / 960;
    var scale = Math.max(Math.min(scaleW, scaleH), 0.2);
    wrap.style.width = (540 * scale) + 'px';
    wrap.style.height = (960 * scale) + 'px';
    $('card').style.transform = 'scale(' + scale + ')';
  }
  function fitValue() {
    var el = $('card-value');
    var size = 160;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > 452 && size > 46) { size -= 6; el.style.fontSize = size + 'px'; }
  }
  function countUp(el, target, currency) {
    var start = null, dur = 750;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = currency + commas(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function deepLink(tool) {
    return window.location.origin + window.location.pathname + '#' + tool.id;
  }
  /* 二维码生成兜底：内容过长时 qrcodejs 会直接抛错（实测 2737 字符的
     编码后链接让整卡生成中断、用户卡在工具页无任何提示）。先按 M 级
     生成，失败降 L 级（容量更大），再失败退回兜底文本——卡片永远出得来。 */
  function makeQR(el, text, fallbackText) {
    /* global QRCode */
    var levels = [QRCode.CorrectLevel.M, QRCode.CorrectLevel.L];
    for (var i = 0; i < levels.length; i++) {
      try {
        el.innerHTML = '';
        new QRCode(el, { text: text, width: 92, height: 92, correctLevel: levels[i] });
        return;
      } catch (e) {}
    }
    try {
      el.innerHTML = '';
      new QRCode(el, { text: fallbackText, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
    } catch (e2) {}
  }
  var lastResult = null, lastPack = null, lastTool = null;
  var CardTemplates = {
    'x-value': function (tool, r, pack) {
      var cardCfg = pack.card || {};
      $('card-tool-name').textContent = tool.name;
      $('card-brand').textContent = '▣ ' + Config.site.site.name;
      $('card-handle').textContent = '@' + r.handle;
      /* 超长用户名自动降字号，避免两行名字把卡面撑出界 */
      $('card-handle').style.fontSize = r.handle.length > 24 ? '22px' : (r.handle.length > 16 ? '26px' : '');
      $('card-label').textContent = cardCfg.label || '';
      $('card-equiv').textContent = r.equivText;
      $('card-tier').textContent = r.tierLabel;
      $('card-copy').textContent = r.copy;
      $('card-wm-name').textContent = cardCfg.watermarkName || '';
      $('card-wm-note').textContent = cardCfg.note || '';
      var base = window.location.origin + window.location.pathname;
      $('card-link').textContent = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
      /* 推荐人生效时：卡面页脚上方显示推荐链接全文，二维码改编这条
         链接（扫码直达带 ref 的注册页）；未生效时整行隐藏、二维码
         仍编本站深链，卡面与无推荐人时完全一致。 */
      var refUrl = activeRefUrl();
      $('card-ref-label').textContent = ui().cardRefLabel || fb('通过我的链接加入：', 'Join via my link:');
      var refUrlEl = $('card-ref-url');
      var rl = refUrl.length;
      /* 极端长链接（多为误粘的垃圾输入）在色带里中间省略显示，防撑破
         卡面；链接本体不受影响——主按钮与二维码编的仍是完整链接 */
      refUrlEl.textContent = rl > 200 ? (refUrl.slice(0, 90) + '…' + refUrl.slice(-40)) : refUrl;
      /* 推荐链接过长时自动降字号多行排，避免撑破卡面色带；色带默认 19px */
      refUrlEl.style.fontSize = rl > 200 ? '11px' : (rl > 120 ? '13px' : (rl > 64 ? '15.5px' : ''));
      refUrlEl.style.lineHeight = rl > 64 ? '1.3' : '';
      $('card-ref').classList.toggle('hidden', !refUrl);
      /* 色带占高：带推荐链接时整卡切换紧凑间距，卡脚/二维码不被挤出卡外 */
      $('card').classList.toggle('has-ref', !!refUrl);
      var qrBox = $('card-qr');
      makeQR(qrBox, refUrl || deepLink(tool), deepLink(tool));
    }
  };
  function fillCard(tool, r, pack) {
    lastResult = r; lastPack = pack; lastTool = tool;
    var tpl = CardTemplates[tool.template || tool.id] || CardTemplates['x-value'];
    tpl(tool, r, pack);
    Router.show('card');
    /* 先按终值定字号，再同步归零后启动滚动（防首帧闪出终值剧透） */
    $('card-value').textContent = r.valueText;
    fitCard();
    fitValue();
    $('card-value').textContent = pack.currency + '0';
    countUp($('card-value'), r.value, pack.currency);
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
  }

  /* ================= 流程：输入 → 假分析（带进度） → 卡片 ================= */
  function runAnalysis(pack, done) {
    var overlay = $('analysis'), textEl = $('analysis-text'), bar = $('progress-bar');
    var texts = pack.analysisTexts, idx = 0, t0 = Date.now();
    textEl.textContent = texts[0];
    bar.style.width = '0%';
    overlay.classList.remove('hidden');
    var timer = setInterval(function () {
      var elapsed = Date.now() - t0;
      bar.style.width = Math.min(elapsed / pack.analysisMs * 100, 100) + '%';
      var next = Math.min(Math.floor(elapsed / (pack.analysisMs / texts.length)), texts.length - 1);
      if (next !== idx) { idx = next; textEl.textContent = texts[idx]; }
      if (elapsed >= pack.analysisMs) {
        clearInterval(timer);
        overlay.classList.add('hidden');
        done();
      }
    }, 60);
  }
  $('value-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!currentTool) return;
    var pack = Config.packs[currentTool.id];
    var engine = Engines[currentTool.id];
    if (!pack || !engine) {
      $('form-error').textContent = ui().formErrorNoPack || fb('这个工具还在准备中，过几天再来', 'This tool is still in the works. Check back soon.');
      $('form-error').classList.remove('hidden');
      return;
    }
    var r = engine($('handle-input').value, pack);
    if (!r) {
      $('form-error').textContent = ui().formErrorEmpty || fb('先填一个用户名，随便谁的都行', "Enter a username first — anyone's will do");
      $('form-error').classList.remove('hidden');
      return;
    }
    $('form-error').classList.add('hidden');
    runAnalysis(pack, function () { fillCard(currentTool, r, pack); });
  });
  $('btn-back-home').addEventListener('click', function () {
    Router.setHash(window.location.pathname);
    Router.show('home');
  });
  $('btn-again').addEventListener('click', function () {
    $('handle-input').value = '';
    if (currentTool) openTool(currentTool);
  });
  $('btn-save-close').addEventListener('click', function () {
    $('save-overlay').classList.add('hidden');
  });
  window.addEventListener('resize', function () {
    if (Router.views && !Router.views.card.classList.contains('hidden')) fitCard();
  });

  /* ================= 6. Export 导出层 ================= */
  function isMobile() {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    if (/iphone|ipad|ipod|android/i.test(navigator.userAgent)) return true;
    return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1; // iPadOS 桌面 UA
  }
  $('btn-save').addEventListener('click', function () {
    var btn = $('btn-save');
    if (btn.dataset.busy) return; /* 生成中连点不重复导出 */
    btn.dataset.busy = '1';
    btn.textContent = ui().saveGenerating || fb('正在生成…', 'Generating…');
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;overflow:hidden';
    var clone = $('card').cloneNode(true);
    clone.removeAttribute('id');
    clone.style.transform = 'none';
    /* 克隆里重绘二维码：cloneNode 不复制 canvas 位图，空白二维码是最常见的导出坑 */
    var cloneQr = clone.querySelector('.card-qr');
    if (cloneQr && lastTool) {
      /* 与卡面一致：推荐人生效时导出图的二维码同样编推荐链接 */
      makeQR(cloneQr, activeRefUrl() || deepLink(lastTool), deepLink(lastTool));
    }
    /* 克隆里写终值并同步已算好的终值字号，避免导出到滚动动画中间帧或字号溢出 */
    var cloneValue = clone.querySelector('.card-value');
    if (cloneValue && lastResult) {
      cloneValue.textContent = lastResult.valueText;
      cloneValue.style.fontSize = $('card-value').style.fontSize;
    }
    holder.appendChild(clone);
    document.body.appendChild(holder);
    /* global html2canvas */
    html2canvas(clone, { scale: 2, backgroundColor: '#0a0a12', logging: false }).then(function (canvas) {
      holder.remove();
      btn.textContent = ui().saveBtn || fb('保存图片', 'Save image');
      canvas.toBlob(function (blob) {
        delete btn.dataset.busy;
        if (!blob) { btn.textContent = ui().saveFailed || fb('生成失败，再点一次', 'Failed — tap to retry'); return; }
        var url = URL.createObjectURL(blob);
        if (!isMobile()) {
          var a = document.createElement('a');
          a.href = url;
          a.download = 'x-value-' + (lastResult ? lastResult.handle : 'card') + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          $('save-hint').textContent = ui().saveHintDesktop || fb('已下载 · 也可以长按或右键保存这张图', 'Downloaded · you can also long-press or right-click to save');
        } else {
          /* 移动端（含安卓 WebView）一律浮层长按保存，不走假下载 */
          $('save-hint').textContent = ui().saveHintMobile || fb('长按图片，保存到相册', 'Long-press the image to save it');
        }
        $('save-img').src = url;
        $('save-overlay').classList.remove('hidden');
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
      }, 'image/png');
    }).catch(function () {
      holder.remove();
      delete btn.dataset.busy;
      btn.textContent = ui().saveFailed || fb('生成失败，再点一次', 'Failed — tap to retry');
    });
  });

  /* ================= 推荐人选择：点选即切换，输入即同步主按钮链接 ================= */
  $('ref-yes').addEventListener('click', function () {
    referral.has = true;
    applyReferral();
    $('ref-input').focus();
  });
  $('ref-no').addEventListener('click', function () {
    referral.has = false;
    applyReferral();
  });
  $('ref-input').addEventListener('input', function () {
    referral.code = $('ref-input').value;
    applyReferral(); /* 同步工具页入口的输入框与主按钮链接 */
  });
  /* 工具页推荐人入口：与收入块同一份状态，事件同样走 applyReferral */
  $('tool-ref-yes').addEventListener('click', function () {
    referral.has = true;
    applyReferral();
    $('tool-ref-input').focus();
  });
  $('tool-ref-no').addEventListener('click', function () {
    referral.has = false;
    applyReferral();
  });
  $('tool-ref-input').addEventListener('input', function () {
    referral.code = $('tool-ref-input').value;
    applyReferral();
  });

  /* ================= 语言切换：整套配置重载，当前视图原地重渲染 ================= */
  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'zh' ? 'en' : 'zh';
    var onCard = Router.views && !Router.views.card.classList.contains('hidden');
    var onTool = Router.views && !Router.views.tool.classList.contains('hidden');
    Config.load().then(function () {
      renderHome();
      if (onCard && lastResult && lastTool) {
        var t2 = null;
        Config.site.tools.forEach(function (t) { if (t.id === lastTool.id) t2 = t; });
        var pack2 = Config.packs[lastTool.id];
        var engine2 = Engines[lastTool.id];
        var r2 = (t2 && pack2 && engine2) ? engine2(lastResult.handle, pack2) : null;
        if (t2 && r2) { currentTool = t2; fillCard(t2, r2, pack2); return; }
        Router.show('home');
      } else if (onTool && currentTool) {
        var t3 = null;
        Config.site.tools.forEach(function (t) { if (t.id === currentTool.id) t3 = t; });
        if (t3) { openTool(t3); } else { Router.show('home'); }
      } else {
        Router.show('home');
      }
    });
  });

  /* ================= 启动 ================= */
  function routeFromHash() {
    if (!Config.site) return;
    var hash = window.location.hash.replace('#', '').replace('/', '');
    var target = null;
    Config.site.tools.forEach(function (t) { if (t.status === 'live' && t.id === hash) target = t; });
    if (target) { openTool(target); } else { Router.show('home'); }
  }
  window.addEventListener('hashchange', routeFromHash);
  Router.init();
  Config.load().then(function () {
    renderHome();
    routeFromHash();
  });
})();
