/* Takt site behaviour: reading progress, running head, chapter rail, parallax, pop-in, count-up,
   15/90 seal, case carousel, pricing zone highlight, Calendly loader. Everything degrades to a
   fully readable static page without JS or with reduced motion. */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document.documentElement;

  /* ---------- 15/90 seal ----------
     The number is measured after the fonts load and scaled to sit inside the lime circle (r 62),
     so it never spills into the tick ring in any font, width or colour mode. */
  function fitSeal(svg){
    var t = svg.querySelector('.seal-t'), n = svg.querySelector('.seal-n');
    if (!t || !t.getBBox) return;
    var keep = n ? n.textContent : null; if (n) n.textContent = '15';
    t.setAttribute('font-size', '44'); t.setAttribute('y', '0');
    var b; try { b = t.getBBox(); } catch(e){ b = null; }
    if (b && b.width){
      var k = Math.min(1, 92 / b.width, 38 / b.height);
      t.setAttribute('font-size', (44 * k).toFixed(2));
      b = t.getBBox();
      t.setAttribute('y', (97 - (b.y + b.height / 2)).toFixed(2));
    } else { t.setAttribute('font-size', '30'); t.setAttribute('y', '107'); }
    if (n) n.textContent = keep;
  }
  function drawSeal(svg){
    var cx = 100, cy = 100, h = '';
    for (var i = 0; i < 90; i++){
      var a = (i / 90) * Math.PI * 2 - Math.PI / 2, lead = (i % 6 === 0);
      var r1 = lead ? 69 : 78, r2 = 90;
      h += '<line class="tick' + (lead ? ' lead' : '') + '" data-i="' + i + '" x1="' + (cx + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (cy + r1 * Math.sin(a)).toFixed(2) +
        '" x2="' + (cx + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (cy + r2 * Math.sin(a)).toFixed(2) + '" stroke="' + (lead ? 'var(--olive)' : 'var(--ink)') +
        '" stroke-width="' + (lead ? 4.4 : 1.6) + '" stroke-linecap="round"/>';
    }
    h += '<circle cx="100" cy="100" r="62" fill="var(--lime)"/>';
    h += '<text class="seal-t" x="100" y="107" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-stretch="125%" font-weight="800" font-size="30" fill="#15161B">' +
         '<tspan class="seal-n">15</tspan>/90</text>';
    h += '<text x="100" y="128" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600" font-size="9" letter-spacing="2.2" fill="#15161B">LEADS · DAYS</text>';
    svg.innerHTML = h;
    fitSeal(svg);
  }
  var seals = document.querySelectorAll('svg[data-seal]');
  seals.forEach(function(s){ drawSeal(s); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ seals.forEach(fitSeal); });
  addEventListener('load', function(){ seals.forEach(fitSeal); });

  /* animate the hero seal once: ticks sweep, lead count rises to 15 */
  var heroSeal = document.querySelector('svg[data-seal="hero"]');
  if (heroSeal && !reduce){
    var ticks = heroSeal.querySelectorAll('.tick'), n = heroSeal.querySelector('.seal-n');
    ticks.forEach(function(t){ t.style.opacity = '.12'; });
    var start = null, dur = 1800;
    function frame(ts){
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), k = Math.floor(p * 90), leads = 0;
      ticks.forEach(function(t, i){ if (i <= k){ t.style.opacity = '1'; if (t.classList.contains('lead')) leads++; } });
      if (n) n.textContent = String(leads);
      if (p < 1) requestAnimationFrame(frame); else if (n) n.textContent = '15';
    }
    setTimeout(function(){ requestAnimationFrame(frame); }, 250);
  }

  /* ---------- waffle charts ---------- */
  document.querySelectorAll('[data-waffle]').forEach(function(w){
    var parts = JSON.parse(w.getAttribute('data-waffle'));
    parts.forEach(function(p){ for (var i = 0; i < p[0]; i++){ var e = document.createElement('i'); e.className = p[1]; w.appendChild(e); } });
  });

  /* ---------- reading progress, running head, rail ---------- */
  var bar = document.querySelector('.progress');
  var runhead = document.querySelector('.runhead');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  function onScroll(){
    var max = doc.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    var cur = null;
    chapters.forEach(function(c){ if (c.getBoundingClientRect().top < innerHeight * 0.35) cur = c; });
    if (runhead){
      if (cur){ runhead.innerHTML = '<b>' + cur.getAttribute('data-num') + '</b> · ' + cur.getAttribute('data-chapter'); runhead.classList.add('on'); }
      else runhead.classList.remove('on');
    }
    railLinks.forEach(function(a){ a.classList.toggle('on', !!cur && a.getAttribute('href') === '#' + cur.id); });
  }

  /* ---------- parallax ---------- */
  var par = reduce ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  function parallax(){
    par.forEach(function(el){
      var r = el.parentElement.getBoundingClientRect();
      var mid = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = 'translate3d(0,' + (mid * parseFloat(el.getAttribute('data-speed'))).toFixed(1) + 'px,0)';
    });
  }
  var ticking = false;
  addEventListener('scroll', function(){
    if (!ticking){ ticking = true; requestAnimationFrame(function(){ onScroll(); parallax(); ticking = false; }); }
  }, { passive:true });
  addEventListener('resize', function(){ onScroll(); parallax(); });
  onScroll(); parallax();

  /* ---------- pop-in and count-up (only for elements below the fold at load) ---------- */
  function countUp(el){
    var target = parseFloat(el.getAttribute('data-count')), dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    var pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '';
    if (reduce){ el.textContent = pre + target.toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec }) + suf; return; }
    var t0 = null, d = 1200;
    function f(ts){
      if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / d), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (target * e).toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec }) + suf;
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('pop')){ el.classList.add('in'); }
        if (el.hasAttribute('data-count') && !el.dataset.done){ el.dataset.done = '1'; countUp(el); }
        io.unobserve(el);
      });
    }, { rootMargin:'0px 0px -4% 0px', threshold:0.01 });
    document.querySelectorAll('.pop').forEach(function(el, i){
      if (reduce) return;
      if (el.getBoundingClientRect().top > innerHeight * 0.92){
        el.classList.add('pre');
        var d = el.getAttribute('data-delay'); if (d) el.style.transitionDelay = d + 'ms';
        io.observe(el);
      }
    });
    document.querySelectorAll('[data-count]').forEach(function(el){
      if (el.getBoundingClientRect().top > innerHeight * 0.92) io.observe(el);
    });
  }

  /* ---------- carousels ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function(c){
    var track = c.querySelector('.car-track'), slides = track.children, dots = c.querySelector('.dots');
    var prev = c.querySelector('[data-prev]'), next = c.querySelector('[data-next]');
    for (var i = 0; i < slides.length; i++){
      (function(i){
        var b = document.createElement('button'); b.type = 'button';
        b.setAttribute('aria-label', 'Show case ' + (i + 1) + ': ' + (slides[i].getAttribute('data-name') || ''));
        b.addEventListener('click', function(){ go(i); }); dots.appendChild(b);
      })(i);
    }
    function idx(){ return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
    function go(i){ i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left:i * (slides[0].getBoundingClientRect().width + 18), behavior: reduce ? 'auto' : 'smooth' }); }
    function sync(){
      var i = idx();
      Array.prototype.forEach.call(dots.children, function(d, k){ d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      if (prev) prev.disabled = i <= 0; if (next) next.disabled = i >= slides.length - 1;
    }
    if (prev) prev.addEventListener('click', function(){ go(idx() - 1); });
    if (next) next.addEventListener('click', function(){ go(idx() + 1); });
    track.addEventListener('scroll', function(){ requestAnimationFrame(sync); }, { passive:true });
    c.addEventListener('keydown', function(e){ if (e.key === 'ArrowRight') go(idx() + 1); if (e.key === 'ArrowLeft') go(idx() - 1); });
    addEventListener('resize', sync); sync();
    if (location.hash){ var t = document.getElementById(location.hash.slice(1)); if (t && t.parentElement === track) setTimeout(function(){ go(Array.prototype.indexOf.call(slides, t)); }, 50); }
  });

  /* ---------- pricing zone highlight ---------- */
  var zone = document.querySelector('.zone');
  document.querySelectorAll('[data-tier]').forEach(function(t){
    t.addEventListener('mouseenter', function(){ if (zone) zone.setAttribute('data-hl', t.getAttribute('data-tier')); });
    t.addEventListener('mouseleave', function(){ if (zone) zone.removeAttribute('data-hl'); });
    t.addEventListener('focusin', function(){ if (zone) zone.setAttribute('data-hl', t.getAttribute('data-tier')); });
    t.addEventListener('focusout', function(){ if (zone) zone.removeAttribute('data-hl'); });
  });

  /* ---------- Calendly inline widget ---------- */
  var mount = document.getElementById('cal-embed');
  if (mount){
    var loader = document.getElementById('cal-load'), settled = false, URL = mount.getAttribute('data-url');
    var fallback = function(){ if (settled) return; settled = true;
      if (loader) loader.innerHTML = '<div style="font-size:.95rem;color:#43424E;text-align:center;padding:26px 16px;">The calendar is taking a moment. ' +
        '<a href="https://calendly.com/maxlezginov/free-marketing-consultation" target="_blank" rel="noopener" style="color:#4F5900;font-weight:700;">Book here instead</a>.</div>'; };
    var loaded = function(){ settled = true; if (loader && loader.parentNode) loader.parentNode.removeChild(loader); };
    if (window.self !== window.top){ fallback(); }
    else {
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://assets.calendly.com/assets/external/widget.css'; document.head.appendChild(css);
      var s = document.createElement('script'); s.src = 'https://assets.calendly.com/assets/external/widget.js'; s.async = true;
      s.onload = function(){
        if (!window.Calendly || typeof window.Calendly.initInlineWidget !== 'function'){ fallback(); return; }
        try { window.Calendly.initInlineWidget({ url:URL, parentElement:mount }); } catch(e){ fallback(); return; }
        var tries = 0, poll = setInterval(function(){ if (mount.querySelector('iframe')){ clearInterval(poll); loaded(); } else if (++tries > 40){ clearInterval(poll); fallback(); } }, 250);
      };
      s.onerror = fallback; document.head.appendChild(s);
      setTimeout(function(){ if (!settled) fallback(); }, 12000);
    }
  }

  /* ---------- outbound click events for GA4 via GTM ---------- */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || !window.dataLayer) return;
    var h = a.getAttribute('href');
    if (/calendly\.com/.test(h)) dataLayer.push({ event:'book_call_click', location:a.getAttribute('data-loc') || '' });
    else if (/^tel:/.test(h)) dataLayer.push({ event:'phone_click' });
    else if (/^mailto:/.test(h)) dataLayer.push({ event:'email_click' });
    else if (/linkedin\.com/.test(h)) dataLayer.push({ event:'linkedin_click' });
  });
})();
