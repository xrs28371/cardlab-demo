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
        b.addEventListener('click', function () { show('tool'); $('handle-input').focus(); });
      }
      grid.appendChild(b);
    });
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
    var value = Math.floor(cfg.base + Math.pow(rand(), cfg.skew) * cfg.spread);
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
    var size = 104;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > 444 && size > 40) { size -= 6; el.style.fontSize = size + 'px'; }
  }
  function fillCard(handle, r) {
    $('card-handle').textContent = '@' + handle;
    $('card-value').textContent = '¥' + commas(r.value);
    $('card-equiv').textContent = '≈ ' + commas(r.equiv) + ' 杯奶茶';
    $('card-tier').textContent = r.tierLabel;
    $('card-copy').textContent = r.copy;
    var url = window.location.origin + window.location.pathname;
    $('card-link').textContent = url.replace(/^https?:\/\//, '');
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

  $('btn-back-home').addEventListener('click', function () { show('home'); });

  /* ---------- 保存图片：540×960 以 scale 2 渲染为 1080×1920 PNG ---------- */
  $('btn-save').addEventListener('click', function () {
    var card = $('card');
    var btn = $('btn-save');
    var prevTransform = card.style.transform;
    btn.textContent = '正在生成…';
    card.style.transform = 'none';
    /* global html2canvas */
    html2canvas(card, { scale: 2, backgroundColor: '#101014', logging: false }).then(function (canvas) {
      card.style.transform = prevTransform;
      btn.textContent = '保存图片';
      canvas.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'x-value-' + currentHandle + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    }).catch(function () {
      card.style.transform = prevTransform;
      btn.textContent = '生成失败，再点一次';
    });
  });

  window.addEventListener('resize', function () {
    if (!views.card.classList.contains('hidden')) fitCard();
  });

  /* ---------- 启动：先拉配置，再渲染骨架 ---------- */
  Promise.all([
    fetch('tools.json').then(function (r) { return r.json(); }),
    fetch('valuation.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    renderHome(res[0]);
    cfg = res[1];
    show('home');
  }).catch(function () {
    document.body.innerHTML = '<p style="padding:40px 0;color:#9b978c">配置加载失败，请刷新重试。</p>';
  });
})();
