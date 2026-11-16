(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var views = { home: $('view-home'), tool: $('view-tool'), card: $('view-card') };
  var cfg = null; // valuation.json

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].classList.toggle('hidden', k !== name); });
    window.scrollTo(0, 0);
  }

  /* ---------- 骨架层：站点信息与工具矩阵全部来自配置 ---------- */
  function renderHome(toolsCfg) {
    $('site-name').textContent = toolsCfg.site.name;
    $('site-name-en').textContent = toolsCfg.site.nameEn;
    $('site-slogan').textContent = toolsCfg.site.slogan;
    $('site-trust').textContent = toolsCfg.site.trustLine;
    var grid = $('tool-grid');
    grid.innerHTML = '';
    toolsCfg.tools.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'tool-card' + (t.status === 'live' ? '' : ' off');
      var tag = t.status === 'live' ? '<span class="tool-tag live">立即测</span>'
        : '<span class="tool-tag">' + t.batch + '</span>';
      b.innerHTML =
        '<span class="tool-no-badge">' + t.no + '</span>' +
        '<span class="tool-main"><span class="tool-name">' + t.name + '</span>' +
        '<span class="tool-desc" style="display:block">' + t.desc + '</span></span>' + tag;
      if (t.status === 'live') {
        b.addEventListener('click', function () { openTool(t); });
        applyToolHeader(t);
      }
      grid.appendChild(b);
    });
  }

  /* 工具页文案全部来自 tools.json，换工具只换配置 */
  function applyToolHeader(t) {
    $('tool-no').textContent = '工具 ' + t.no + ' · ' + t.batch;
    $('tool-title').textContent = t.name;
    $('tool-desc').textContent = t.desc + '。';
    $('tool-cta').textContent = t.cta || '开始';
    $('tool-trust').textContent = t.trustLine || '';
    $('tool-fineprint').textContent = t.fineprint || '';
    $('handle-input').placeholder = t.inputPlaceholder || '输入用户名';
  }
  function openTool(t) {
    if (t && t.id) { try { history.replaceState(null, '', '#' + t.id); } catch (e) {} }
    show('tool');
    $('handle-input').focus();
  }

  /* ---------- 估值：纯前端虚构公式，同名恒定 ---------- */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
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

  function evaluate(handle) {
    var rand = mulberry32(fnv1a(handle.toLowerCase()));
    /* 对数分布＋幂次整形：高/中/低三档大致各占三分之一 */
    var value = Math.floor(cfg.min * Math.pow(cfg.max / cfg.min, Math.pow(rand(), cfg.exponent)));
    var tier = cfg.tiers[cfg.tiers.length - 1];
    for (var i = 0; i < cfg.tiers.length; i++) {
      if (value >= cfg.tiers[i].min) { tier = cfg.tiers[i]; break; }
    }
    var pool = cfg.copies[tier.id];
    var copy = pool[Math.floor(rand() * pool.length)];
    return {
      value: value,
      tierLabel: tier.label,
      copy: copy,
      equiv: Math.round(value / cfg.milkTeaPrice)
    };
  }

  /* ---------- 卡片填充与自适应 ---------- */
  function fitCard() {
    var wrap = document.querySelector('.card-scale-wrap');
    var card = $('card');
    var scale = wrap.clientWidth / 540;
    card.style.transform = 'scale(' + scale + ')';
    wrap.style.height = (960 * scale) + 'px';
  }
  function fitValue() {
    var el = $('card-value');
    var size = 128;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > 444 && size > 44) { size -= 6; el.style.fontSize = size + 'px'; }
  }
  function fillCard(handle, r) {
    $('card-handle').textContent = '@' + handle;
    $('card-value').textContent = cfg.currency + commas(r.value);
    $('card-equiv').textContent = '≈ ' + commas(r.equiv) + ' ' + cfg.equivUnit;
    $('card-tier').textContent = r.tierLabel;
    $('card-copy').textContent = r.copy;
    var url = window.location.origin + window.location.pathname;
    $('card-link').textContent = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    var qrBox = $('card-qr');
    qrBox.innerHTML = '';
    /* global QRCode */
    new QRCode(qrBox, { text: url, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
  }

  /* ---------- 流程：输入 → 假分析 → 卡片 ---------- */
  var currentHandle = '';
  $('value-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var raw = $('handle-input').value.replace(/[@\s]/g, '');
    if (!raw) { $('form-error').classList.remove('hidden'); return; }
    $('form-error').classList.add('hidden');
    currentHandle = raw;
    var overlay = $('analysis');
    var textEl = $('analysis-text');
    var texts = cfg.analysisTexts;
    var idx = 0;
    textEl.textContent = texts[0];
    overlay.classList.remove('hidden');
    var timer = setInterval(function () {
      idx = (idx + 1) % texts.length;
      textEl.textContent = texts[idx];
    }, 480);
    setTimeout(function () {
      clearInterval(timer);
      overlay.classList.add('hidden');
      fillCard(currentHandle, evaluate(currentHandle));
      show('card');
      fitCard();
      fitValue();
    }, cfg.analysisMs);
  });

  $('btn-back-home').addEventListener('click', function () {
    try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
    show('home');
  });
  $('btn-again').addEventListener('click', function () {
    $('handle-input').value = '';
    show('tool');
    $('handle-input').focus();
  });
  $('btn-save-close').addEventListener('click', function () {
    $('save-overlay').classList.add('hidden');
  });

  /* ---------- 保存图片：离屏克隆渲染 1080×1920，页面不闪烁；移动端出浮层长按保存 ---------- */
  $('btn-save').addEventListener('click', function () {
    var btn = $('btn-save');
    btn.textContent = '正在生成…';
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:540px;height:960px;overflow:hidden';
    var clone = $('card').cloneNode(true);
    clone.removeAttribute('id');
    clone.style.transform = 'none';
    holder.appendChild(clone);
    document.body.appendChild(holder);
    /* global html2canvas */
    html2canvas(clone, { scale: 2, backgroundColor: '#101014', logging: false }).then(function (canvas) {
      holder.remove();
      btn.textContent = '保存图片';
      canvas.toBlob(function (blob) {
        if (!blob) { btn.textContent = '生成失败，再点一次'; return; }
        var url = URL.createObjectURL(blob);
        var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (!isIOS) {
          var a = document.createElement('a');
          a.href = url;
          a.download = 'x-value-' + currentHandle + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        $('save-img').src = url;
        $('save-hint').textContent = isIOS ? '长按图片，保存到相册' : '图片已生成 · 长按或右键也可保存';
        $('save-overlay').classList.remove('hidden');
      }, 'image/png');
    }).catch(function () {
      holder.remove();
      btn.textContent = '生成失败，再点一次';
    });
  });

  window.addEventListener('resize', function () {
    if (!views.card.classList.contains('hidden')) fitCard();
  });

  /* ---------- 启动：先拉配置，再渲染骨架（拉不到就用内置默认配置，页面永远能跑） ---------- */
  var FALLBACK = {
    tools: {"site":{"name":"卡片工场","en":"CARDLAB","slogan":"只生产值得截图发群的卡片","trustLine":"不登录 · 不授权 · 不存你的信息","footer":"一个输入框 · 一个结果 · 一张卡片，够了。"},"tools":[{"id":"x-value","no":"01","name":"X 价值计算器","desc":"输入一个用户名，3 秒算出它值多少杯奶茶","status":"live","batch":"首发","cta":"开始估值","inputPlaceholder":"输入用户名","trustLine":"不登录 · 不授权 · 不存你的用户名","fineprint":"估值公式纯属虚构，图一乐。"}]},
    valuation: {"tool":"x-value","min":800,"max":9800000,"exponent":0.7,"milkTeaPrice":18,"currency":"¥","equivUnit":"杯奶茶","analysisMs":1500,"analysisTexts":["正在假装连线 X 数据库…","正在翻看你的黑历史推文…","正在计算围观群众数量…","正在生成你的身价…"],"tiers":[{"id":"high","label":"赛博顶流大户","min":1000000},{"id":"mid","label":"群里的气氛担当","min":60000},{"id":"low","label":"赛博纯路人","min":0}],"copies":{"high":["发条推文的功夫，把普通人半年的社保都赚出来了。","平时在群里潜水装死，原来是在闷声干大事。","建议直接截图甩给甲方，问他们懂不懂行情。","这身价，路过的品牌方看你一眼都觉得高攀了。"],"mid":["赚了点小钱但不敢告诉亲戚，最尴尬的身价区间。","群里发言终于有人接茬了，这就是排面。","离财富自由还差点意思，但奶茶已经敢加三份料了。","这身价，发红包都得手抖一下。"],"low":["账号里最值钱的，是你那点所剩无几的幽默感。","属于在赛博世界做慈善，天天免费给平台贡献活跃度。","就这三瓜两枣的身价，天天还操心世界局势。","连赛博难民都算不上，充其量是个路过的吃瓜群众。"]}}
  };
  function fetchJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }
  Promise.all([
    fetchJson('tools.json').catch(function () { return FALLBACK.tools; }),
    fetchJson('valuation.json').catch(function () { return FALLBACK.valuation; })
  ]).then(function (res) {
    renderHome(res[0]);
    cfg = res[1];
    /* 深链：#x-value 直达工具页，打开即能输入 */
    var hash = window.location.hash.replace('#', '').replace('/', '');
    var live = null;
    res[0].tools.forEach(function (t) { if (t.status === 'live') live = t; });
    if (live && hash === live.id) { openTool(live); } else { show('home'); }
  }).catch(function () {
    document.body.innerHTML = '<p style="padding:40px 0;color:#9b978c">配置加载失败，请刷新重试。</p>';
  });
})();
