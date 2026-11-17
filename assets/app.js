/* =====================================================================
   CardLab 前端骨架 v3（雇主反馈修订版：中英双语整套配置切换、
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
  function fetchJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }
  /* 多语言（v3 新增）：默认中文。整套文案按语言成套放在配置里——
     站点/工具：config/tools.json（中） / config/tools.en.json（英），
     玩法包路径写在各自 tools 文件的 pack 字段；界面杂项文案与
     被动收入区链接在 config/i18n.json。切换语言 = 整套重载 + 重渲染。 */
  var LANG_FILES = { zh: 'config/tools.json', en: 'config/tools.en.json' };
  var lang = 'zh';
  try { lang = localStorage.getItem('cardlab-lang') || 'zh'; } catch (e) {}
  if (!LANG_FILES[lang]) lang = 'zh';
  /* URL 带 ?lang=en / ?lang=zh 时以 URL 为准（方便分享指定语言的链接） */
  try {
    var qLang = new URLSearchParams(window.location.search).get('lang');
    if (qLang && LANG_FILES[qLang]) lang = qLang;
  } catch (e) {}
  var FALLBACK_I18N = {
    income: { url: 'https://earnway.art', blogUrl: 'https://earnway.art/blog/generating-ad-revenue-google-trending-keywords-earnway-art' },
    ui: {
      zh: { pageTitle: '卡片工场 · X 价值计算器', homeFoot: '一个输入框 · 一个结果 · 一张卡片，够了。', liveTag: '立即测', toolNoTpl: '工具 {no} · {batch}', defaultCta: '开始', formErrorEmpty: '先填一个用户名，随便谁的都行', formErrorNoPack: '这个工具还在准备中，过几天再来', saveBtn: '保存图片', saveGenerating: '正在生成…', saveFailed: '生成失败，再点一次', againBtn: '‹ 再测一个', saveHintMobile: '长按图片，保存到相册', saveHintDesktop: '已下载 · 也可以长按或右键保存这张图', toggleLabel: 'EN', backLabel: '返回', cardAlt: '估值卡片', incomeTitle: '想赚奖励积分和被动收入？', incomeText: '本站的基础功能——做卡、估值、分享——都不用注册，打开就能玩。如果想赚 EW/ART 奖励积分，或者通过 earnway.art 的每日任务获得被动收入，需要先在平台注册；提现时要完成 KYC 身份验证。这个集成只是一个可选的增值项，不会干扰核心体验。', incomeBtn: '前往 earnway.art →', incomeBlog: '核心业务说明：靠趋势关键词赚广告收入' },
      en: { pageTitle: 'CardLab · X Value Calculator', homeFoot: "One input · One result · One card. That's it.", liveTag: 'Try it', toolNoTpl: 'Tool {no} · {batch}', defaultCta: 'Start', formErrorEmpty: "Enter a username first — anyone's will do", formErrorNoPack: 'This tool is still in the works. Check back soon.', saveBtn: 'Save image', saveGenerating: 'Generating…', saveFailed: 'Failed — tap to retry', againBtn: '‹ Test another', saveHintMobile: 'Long-press the image to save it', saveHintDesktop: 'Downloaded · you can also long-press or right-click to save', toggleLabel: '中文', backLabel: 'Back', cardAlt: 'Valuation card', incomeTitle: 'Want reward points and passive income?', incomeText: 'The basics here — creating, valuing, and sharing cards — are available without registration. If you wish to earn "EW/ART" reward points, or generate passive income through daily tasks on earnway.art, you must register on the platform; identity verification (KYC) is required for withdrawals. This integration is an optional value-add and does not interfere with the core experience.', incomeBtn: 'Go to earnway.art →', incomeBlog: 'Core business: generating ad revenue with trending keywords' }
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
        if (!site) { Config.site = FALLBACK.site; Config.packs = FALLBACK.packs; return Config; }
        Config.site = site;
        Config.packs = {};
        var jobs = site.tools.filter(function (t) { return t.pack; }).map(function (t) {
          return fetchJson(t.pack).then(function (pack) { Config.packs[t.id] = pack; })
            .catch(function () { if (FALLBACK.packs[t.id]) Config.packs[t.id] = FALLBACK.packs[t.id]; });
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
    if (inc && inc.url) btn.href = inc.url;
    $('btn-back-home').setAttribute('aria-label', u.backLabel || fb('返回', 'Back'));
    $('save-img').alt = u.cardAlt || fb('估值卡片', 'Valuation card');
    var blog = $('income-blog');
    blog.textContent = u.incomeBlog || '';
    if (inc && inc.blogUrl) blog.href = inc.blogUrl;
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
                             : '<span class="tool-tag">' + t.batch + '</span>');
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
  var lastResult = null, lastPack = null, lastTool = null;
  var CardTemplates = {
    'x-value': function (tool, r, pack) {
      var cardCfg = pack.card || {};
      $('card-tool-name').textContent = tool.name;
      $('card-brand').textContent = '▣ ' + Config.site.site.name;
      $('card-handle').textContent = '@' + r.handle;
      $('card-label').textContent = cardCfg.label || '';
      $('card-equiv').textContent = r.equivText;
      $('card-tier').textContent = r.tierLabel;
      $('card-copy').textContent = r.copy;
      $('card-wm-name').textContent = cardCfg.watermarkName || '';
      $('card-wm-note').textContent = cardCfg.note || '';
      var base = window.location.origin + window.location.pathname;
      $('card-link').textContent = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
      var qrBox = $('card-qr');
      qrBox.innerHTML = '';
      /* global QRCode */
      new QRCode(qrBox, { text: deepLink(tool), width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
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
    btn.textContent = ui().saveGenerating || fb('正在生成…', 'Generating…');
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;overflow:hidden';
    var clone = $('card').cloneNode(true);
    clone.removeAttribute('id');
    clone.style.transform = 'none';
    /* 克隆里重绘二维码：cloneNode 不复制 canvas 位图，空白二维码是最常见的导出坑 */
    var cloneQr = clone.querySelector('.card-qr');
    if (cloneQr && lastTool) {
      cloneQr.innerHTML = '';
      /* global QRCode */
      new QRCode(cloneQr, { text: deepLink(lastTool), width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
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
      btn.textContent = ui().saveFailed || fb('生成失败，再点一次', 'Failed — tap to retry');
    });
  });

  /* ================= 语言切换：整套配置重载，当前视图原地重渲染 ================= */
  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('cardlab-lang', lang); } catch (e) {}
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
