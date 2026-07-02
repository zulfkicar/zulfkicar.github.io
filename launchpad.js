/* The launch pad: one small door per visit, a different one each time.
   Each gate is a tiny self-portrait — honesty, the dismantler thing, chaos→order.
   Rules: always skippable, never twice per session (sessionStorage), never for
   reduced-motion visitors (the inline head script decides all that before paint).
   ?door=<id> forces a gate for testing; ?door alone forces a random one. */
(function () {
  var doc = document.documentElement;
  doc.setAttribute('data-lp-ready', '1'); // cancels the inline no-JS failsafe
  if (!doc.classList.contains('gated')) return;

  var mono = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  var css = function (name) { return getComputedStyle(doc).getPropertyValue(name).trim(); };

  /* ---------- framework ---------- */

  var overlay, stage, finished = false;

  function reveal(skipped) {
    if (finished) return; finished = true;
    try { sessionStorage.setItem('lp', 'done'); } catch (e) {}
    // Drop the gate class first so the board's staged entrance plays *behind*
    // the overlay fade — the reveal and the ripple-in overlap by design.
    doc.classList.remove('gated');
    overlay.classList.add('lp-out');
    setTimeout(function () { overlay.remove(); }, 600);
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lp';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'a small door. skippable.');
    overlay.innerHTML =
      '<button class="lp-skip mono" type="button">skip &#8594;</button>' +
      '<div class="lp-stage"></div>' +
      '<div class="lp-hint mono">&#8635; refresh for another door</div>';
    document.body.appendChild(overlay);
    stage = overlay.querySelector('.lp-stage');
    overlay.querySelector('.lp-skip').addEventListener('click', function () { reveal(true); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') reveal(true); });
  }

  /* ---------- gates ---------- */

  var gates = {};

  // honesty: a loading bar with nothing to load
  gates['honest-loader'] = function () {
    stage.innerHTML =
      '<div class="lp-panel">' +
      '<p class="lp-line mono" id="lpt">loading&#8230;</p>' +
      '<div class="lp-bar"><div class="lp-fill" id="lpf"></div></div>' +
      '<p class="lp-sub mono" id="lps">click to skip the theatre</p></div>';
    var t = document.getElementById('lpt'), f = document.getElementById('lpf');
    var steps = [
      [12, 'loading…'],
      [34, 'assembling cards… (they are static html)'],
      [58, 'warming up the models… (there are no models)'],
      [81, 'fetching your data… (no. none of that here.)'],
      [100, 'done. it was already here.']
    ];
    var i = 0, timer;
    function step() {
      if (finished) return;
      var s = steps[i]; f.style.width = s[0] + '%'; t.textContent = s[1];
      if (++i < steps.length) timer = setTimeout(step, 520 + Math.random() * 380);
      else setTimeout(function () { reveal(); }, 650);
    }
    step();
    overlay.addEventListener('pointerdown', function () {
      clearTimeout(timer); i = steps.length - 1; step();
    });
  };

  // honesty, the competitive streak: find the lie
  gates['two-truths'] = function () {
    var items = [
      { s: 'I rewrote my team’s PR-preview tool because two clicks was one too many.', lie: false, r: 'that one’s true, embarrassingly.' },
      { s: 'I taught 18,000 particles to follow my cursor.', lie: false, r: 'true. it’s on this board.' },
      { s: 'I’ve beaten Stockfish.', lie: true, r: 'yep. nobody beats Stockfish.' }
    ];
    // fisher-yates, else the lie always sits at the bottom
    for (var k = items.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = items[k]; items[k] = items[j]; items[j] = tmp; }
    var html = '<div class="lp-panel"><p class="lp-line mono">two truths and a lie. click the lie.</p><div class="lp-choices">';
    items.forEach(function (it, n) { html += '<button class="lp-choice" type="button" data-n="' + n + '">' + it.s + '</button>'; });
    stage.innerHTML = html + '</div><p class="lp-sub hand" id="lpr">&nbsp;</p></div>';
    var r = document.getElementById('lpr');
    stage.querySelectorAll('.lp-choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var it = items[+btn.dataset.n];
        r.textContent = it.r;
        if (it.lie) { btn.classList.add('lp-right'); setTimeout(function () { reveal(); }, 1100); }
        else { btn.classList.add('lp-true'); btn.disabled = true; }
      });
    });
  };

  // the system underneath: an honest boot log
  gates['boot'] = function () {
    stage.innerHTML = '<div class="lp-panel"><pre class="lp-boot mono" id="lpb"></pre></div>';
    var pre = document.getElementById('lpb');
    var lines = [
      'zulfkicar boot v2.6',
      'probing obsessions ..... 7 found',
      'mount /flow ............ ok',
      'mount /markets ......... ok',
      'mount /chess ........... engine missing (planned)',
      'honesty module ......... ok (can’t be disabled)',
      '',
      'boot complete — press any key'
    ];
    var li = 0, ci = 0, doneTyping = false, fast = false;
    function tick() {
      if (finished) return;
      if (li >= lines.length) { doneTyping = true; return; }
      var line = lines[li];
      if (ci <= line.length) { ci += fast ? 6 : 1;
        pre.textContent = lines.slice(0, li).join('\n') + (li ? '\n' : '') + line.slice(0, ci);
        setTimeout(tick, fast ? 4 : (10 + Math.random() * 18));
      } else { li++; ci = 0; setTimeout(tick, fast ? 20 : (line === '' ? 60 : 170)); }
    }
    tick();
    function finish() { if (doneTyping) reveal(); else fast = true; }
    overlay.addEventListener('pointerdown', finish);
    addEventListener('keydown', function (e) { if (e.key !== 'Escape') finish(); });
  };

  // chaos -> order: hold anywhere and the noise becomes a grid
  gates['chaos-order'] = function () {
    stage.innerHTML = '<canvas class="lp-canvas" id="lpc"></canvas><p class="lp-cap mono">hold anywhere. make it make sense.</p>';
    var c = document.getElementById('lpc'), ctx = c.getContext('2d');
    var DPR = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * DPR; c.height = innerHeight * DPR;
    var ink = css('--muted') || '#66665f', accent = css('--info') || '#1f5fa6';
    var COLS = 14, ROWS = 8, N = COLS * ROWS, dots = [], held = false, lockBeat = 0;
    var mx = (c.width - 120 * DPR) / (COLS - 1), my = (c.height - 160 * DPR) / (ROWS - 1);
    for (var i = 0; i < N; i++) {
      dots.push({
        x: Math.random() * c.width, y: Math.random() * c.height,
        vx: (Math.random() - .5) * .6 * DPR, vy: (Math.random() - .5) * .6 * DPR,
        hx: 60 * DPR + (i % COLS) * mx, hy: 80 * DPR + Math.floor(i / COLS) * my, t: 0
      });
    }
    function down(e) { held = true; e.preventDefault(); }
    function up() { held = false; }
    overlay.addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    addEventListener('keydown', function (e) { if (e.key === ' ') held = true; });
    addEventListener('keyup', function (e) { if (e.key === ' ') held = false; });
    (function frame() {
      if (finished) return;
      ctx.clearRect(0, 0, c.width, c.height);
      var settled = 0;
      for (var i = 0; i < N; i++) {
        var d = dots[i];
        // t is each dot's private progress toward its slot; holding raises it,
        // letting go decays it — so order is something you have to insist on.
        d.t += held ? 0.016 : -0.02; d.t = Math.max(0, Math.min(1, d.t));
        if (d.t <= 0) { d.x += d.vx; d.y += d.vy;
          if (d.x < 0 || d.x > c.width) d.vx *= -1;
          if (d.y < 0 || d.y > c.height) d.vy *= -1;
        } else {
          var e2 = d.t * d.t * (3 - 2 * d.t); // smoothstep, so the pull eases in
          d.x += (d.hx - d.x) * e2 * .14; d.y += (d.hy - d.y) * e2 * .14;
        }
        if (d.t >= 1 && Math.hypot(d.hx - d.x, d.hy - d.y) < 2 * DPR) settled++;
        ctx.fillStyle = d.t > .85 ? accent : ink;
        ctx.globalAlpha = .5 + d.t * .5;
        ctx.beginPath(); ctx.arc(d.x, d.y, (2 + d.t * 1.5) * DPR, 0, 6.284); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (settled > N * .92) { if (++lockBeat > 24) { reveal(); return; } } else lockBeat = 0;
      requestAnimationFrame(frame);
    })();
  };

  // the dismantler: everything is held on by four screws
  gates['unscrew'] = function () {
    stage.innerHTML =
      '<div class="lp-plate" id="lpp">' +
      '<button class="lp-screw" style="top:10px;left:10px" aria-label="screw"></button>' +
      '<button class="lp-screw" style="top:10px;right:10px" aria-label="screw"></button>' +
      '<button class="lp-screw" style="bottom:10px;left:10px" aria-label="screw"></button>' +
      '<button class="lp-screw" style="bottom:10px;right:10px" aria-label="screw"></button>' +
      '<p class="lp-line mono">// access panel</p>' +
      '<p class="lp-sub hand">it’s held on by four screws. it always is.</p>' +
      '</div>';
    var left = 4, plate = document.getElementById('lpp');
    stage.querySelectorAll('.lp-screw').forEach(function (s) {
      s.addEventListener('click', function () {
        if (s.classList.contains('out')) return;
        s.classList.add('out');
        if (--left === 0) { plate.classList.add('lp-fall'); setTimeout(function () { reveal(); }, 750); }
      });
    });
  };

  /* ---------- pick a door ---------- */

  var ids = Object.keys(gates);
  var m = location.search.match(/[?&]door=([a-z-]*)/);
  var id = m && gates[m[1]] ? m[1] : null;
  if (!id) {
    var last = null;
    try { last = localStorage.getItem('lp-last'); } catch (e) {}
    var pool = ids.filter(function (g) { return g !== last; });
    id = pool[Math.floor(Math.random() * pool.length)];
  }
  try { localStorage.setItem('lp-last', id); } catch (e) {}

  build();
  gates[id]();
})();
