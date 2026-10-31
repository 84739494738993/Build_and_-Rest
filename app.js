// =====================================================================
//  BrickLift — everything on the page except the 3D hero (scene.js).
//  Projects come from projects.js (edit them with build-site/editor.html),
//  card drawings from cards.js.
// =====================================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover)").matches;

// ---------- headline: a hammer nails in the next word ----------
(() => {
  const word = $("#typed"), hammer = $("#hammer"), dust = $("#dust"), line = $("#nailed");
  if (!word || !hammer || reduceMotion) return;
  const words = ["family homes", "cottages", "townhouses", "skyscrapers", "real homes"];
  let i = 0;
  function puff() {
    for (let k = 0; k < 12; k++) {
      const bit = document.createElement("i");
      const spark = k < 5;
      const angle = Math.PI * (1.05 + Math.random() * .9);      // up and to the sides
      const dist = spark ? 30 + Math.random() * 40 : 14 + Math.random() * 26;
      bit.className = spark ? "spark" : "cloud";
      bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      bit.style.setProperty("--dy", Math.sin(angle) * dist * .8 + "px");
      dust.append(bit);
      setTimeout(() => bit.remove(), 800);
    }
  }
  function swing() {
    if (document.hidden) { setTimeout(swing, 1000); return; }
    hammer.classList.add("up");
    setTimeout(() => {
      hammer.classList.remove("up");
      hammer.classList.add("hit");
      setTimeout(strike, 120);
    }, 380);
  }
  function strike() {
    i = (i + 1) % words.length;
    word.textContent = words[i];
    for (const [el, cls] of [[word, "thunk"], [line, "shake"]]) {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    }
    puff();
    setTimeout(() => hammer.classList.remove("hit"), 110);
    setTimeout(swing, 2300);
  }
  setTimeout(swing, 1600);
})();

// ---------- reveal on scroll + count-up numbers ----------
function countUp(el) {
  const end = +el.dataset.count;
  if (reduceMotion) { el.textContent = end; return; }
  const t0 = performance.now();
  (function step(now) {
    const k = Math.min(1, (now - t0) / 1600);
    el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
const revealer = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    if (e.target.dataset.count) countUp(e.target);
    revealer.unobserve(e.target);
  }
}, {threshold: .15});
function watchReveal(root = document) {
  $$(".reveal, .drawn, [data-count]", root).forEach(el => revealer.observe(el));
}

// ---------- tape measure progress + CAD cursor ----------
(() => {
  const read = $("#tapeRead");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    document.documentElement.style.setProperty("--p", p.toFixed(4));
    if (read) read.textContent = (p * 12).toFixed(2) + " m";
  };
  addEventListener("scroll", onScroll, {passive: true});
  addEventListener("resize", onScroll);
  onScroll();

  const hero = $(".hero"), cad = $("#cad"), xy = $("#cadXY");
  if (!hero || !cad || !matchMedia("(pointer: fine)").matches) return;
  hero.classList.add("cad-on");
  hero.addEventListener("pointermove", e => {
    if (e.target.closest(".hero-inner a, .hud")) { cad.classList.remove("on"); return; }
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    cad.style.setProperty("--cx", x + "px");
    cad.style.setProperty("--cy", y + "px");
    xy.textContent = `X ${(x * 12).toLocaleString("en-US")} · Y ${((r.height - y) * 12).toLocaleString("en-US")} mm`;
    cad.classList.add("on");
  });
  hero.addEventListener("pointerleave", () => cad.classList.remove("on"));
})();

// card spotlight follows the cursor
document.addEventListener("pointermove", e => {
  const card = e.target.closest && e.target.closest(".card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", e.clientX - r.left + "px");
  card.style.setProperty("--my", e.clientY - r.top + "px");
});

// ---------- services: blueprint icons that turn real on hover ----------
const SERVICES = [
  {art: "house", title: "Family houses", text: "Brick, timber or concrete homes, planned around the way you live.", fact: "90 – 400 m²"},
  {art: "cottage", title: "Cottages & cabins", text: "Weekend places with big windows, a terrace and a fireplace.", fact: "ready in one season"},
  {art: "tower", title: "Apartments & offices", text: "Residential blocks and offices, with our own cranes and crew.", fact: "up to 12 floors"},
  {art: "plan", title: "Design & permits", text: "Architect, structural engineer and every permit. You get approved drawings.", fact: "drawings + permits"},
];
(() => {
  const grid = $("#servicesGrid");
  if (!grid) return;
  grid.innerHTML = SERVICES.map(s => `
    <article class="card service drawn">
      <div class="service-art"><svg viewBox="0 0 240 150" aria-hidden="true">${ART[s.art]}</svg></div>
      <h3>${s.title}</h3>
      <p>${s.text}</p>
      <span class="fact">${s.fact}</span>
    </article>`).join("");
  // touch screens have no hover: tap to see the finished building
  if (!canHover) $$(".drawn", grid).forEach(card => card.addEventListener("click", () => card.classList.toggle("live")));
})();

// ---------- blueprint ↔ reality slider ----------
// One list of shapes, drawn twice: as a colored picture and as a blueprint.
const FACADE = [
  ["circle", {cx: 1330, cy: 150, r: 54}, "#ffd27a", "sun"],
  ["rect", {x: 0, y: 600, width: 1600, height: 100}, "#24452f", "ground"],
  ["path", {d: "M640 600h80l50 100H590Z"}, "#9aa3b5", "path"],
  ["rect", {x: 222, y: 500, width: 18, height: 100}, "#6b4a32", "trunk"],
  ["circle", {cx: 231, cy: 450, r: 92}, "#3fa34d", "tree"],
  ["rect", {x: 1392, y: 480, width: 20, height: 120}, "#6b4a32", "trunk"],
  ["circle", {cx: 1402, cy: 410, r: 112}, "#2f8f4e", "tree"],
  ["rect", {x: 800, y: 160, width: 44, height: 100}, "#9a4a35", "chimney"],
  ["rect", {x: 420, y: 300, width: 520, height: 300}, "#efe4d2", "wall"],
  ["path", {d: "M388 308 680 136 972 308Z"}, "#b4513a", "roof"],
  ["rect", {x: 940, y: 410, width: 300, height: 190}, "#d9dde6", "garage"],
  ["rect", {x: 926, y: 392, width: 328, height: 22}, "#4a5163", "garage roof"],
  ["rect", {x: 985, y: 455, width: 210, height: 145}, "#3a4152", "garage door"],
  ["rect", {x: 640, y: 462, width: 80, height: 138}, "#6b3f2a", "door"],
  ["rect", {x: 470, y: 345, width: 110, height: 80}, "#ffd27a", "window"],
  ["rect", {x: 780, y: 345, width: 110, height: 80}, "#ffd27a", "window"],
  ["rect", {x: 470, y: 480, width: 110, height: 80}, "#ffd27a", "window"],
  ["rect", {x: 780, y: 480, width: 110, height: 80}, "#ffd27a", "window"],
  ["circle", {cx: 680, cy: 236, r: 34}, "#ffd27a", "window"],
];
function shapeTag([tag, attrs, fill], extra) {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
  return `<${tag} ${a} ${extra(fill)}/>`;
}
(() => {
  const real = $("#compareReal"), plan = $("#comparePlan"), box = $("#compare"), range = $("#compareRange");
  if (!real || !plan) return;
  real.innerHTML = `<svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5c"/><stop offset=".7" stop-color="#6a5a8e"/><stop offset="1" stop-color="#f0a46a"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <rect width="1600" height="700" fill="url(#sky)"/>
    ${FACADE.map(s => shapeTag(s, f => `fill="${f}"`)).join("")}
    ${FACADE.filter(s => s[3] === "window").map(s => shapeTag(s, () => `fill="#ffb627" opacity=".55" filter="url(#glow)"`)).join("")}
    <path d="M470 385h110M535 345v80M780 385h110M845 345v80M470 520h110M535 480v80M780 520h110M845 480v80" stroke="#efe4d2" stroke-width="6"/>
    <path d="M985 490h210M985 525h210M985 560h210" stroke="#2c3140" stroke-width="4"/>
  </svg>`;
  const ink = `fill="none" stroke="#eaf7ff" stroke-width="3"`;
  plan.innerHTML = `<svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="g1" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,.08)"/></pattern>
      <pattern id="g2" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="rgba(255,255,255,.16)"/></pattern>
    </defs>
    <rect width="1600" height="700" fill="#0f3d93"/>
    <rect width="1600" height="700" fill="url(#g1)"/><rect width="1600" height="700" fill="url(#g2)"/>
    <g style="filter: drop-shadow(0 0 4px rgba(170,225,255,.8))">
      ${FACADE.filter(s => !["sun", "ground"].includes(s[3])).map(s => shapeTag(s, () => s[3] === "tree" ? `${ink} stroke-dasharray="14 10"` : ink)).join("")}
      <path d="M0 600H1600" ${ink} stroke-width="5"/>
      <path d="M420 650H1240M420 636V664M1240 636V664M940 640V660" ${ink} stroke-width="2"/>
      <path d="M360 600V136M346 600H374M346 136H374" ${ink} stroke-width="2"/>
      <path d="M680 136V600" ${ink} stroke-width="1.5" stroke-dasharray="20 8 4 8"/>
    </g>
    <g fill="#eaf7ff" font-family="JetBrains Mono, Consolas, monospace" font-weight="600">
      <text x="680" y="638" font-size="24" text-anchor="middle">12 400</text>
      <text x="1090" y="638" font-size="24" text-anchor="middle">6 000</text>
      <text x="340" y="370" font-size="24" text-anchor="middle" transform="rotate(-90 340 370)">8 600</text>
      <text x="40" y="60" font-size="28">FRONT ELEVATION · 1:50</text>
      <text x="40" y="96" font-size="20" fill="#ffd27a">BRICKLIFT · HOUSE “MAPLE”</text>
    </g>
  </svg>`;
  const set = v => box.style.setProperty("--pos", v + "%");
  range.addEventListener("input", () => set(range.value));
  // a little hint: the handle sweeps once when the slider comes into view
  if (!reduceMotion) {
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      let stopSweep = false;
      (function sweep(now) {
        const k = Math.min(1, (now - t0) / 2200);
        const v = 50 + Math.sin(k * Math.PI * 2) * 30 * (1 - k);
        set(v);
        range.value = v;
        if (k < 1 && !stopSweep) requestAnimationFrame(sweep);
      })(t0);
      range.addEventListener("pointerdown", () => { stopSweep = true; }, {once: true});
    }, {threshold: .5}).observe(box);
  }
})();

// ---------- finished projects (projects.js) ----------
(() => {
  const grid = $("#projectsGrid");
  if (!grid) return;
  const list = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  list.forEach(p => {
    const card = renderProjectCard(p);
    if (!canHover) card.addEventListener("click", () => card.classList.toggle("live"));
    grid.append(card);
  });
  $("#projectsEmpty").hidden = list.length > 0;
})();

// ---------- brick by brick: a wall that lays itself ----------
(() => {
  const wall = $("#wall");
  if (!wall) return;
  const trowel = $("#trowel"), countEl = $("#brickCount"), totalEl = $("#brickTotal");
  const ROWS = 9, ROW_H = 34, GAP = 5, BASE = 8, STEP = 26;
  let items = [], laid = 0, raf = 0, building = false, built = false, cols = 0;

  // the parts of [x0, x1] that are not inside any hole
  function cut(x0, x1, holes) {
    let pieces = [[x0, x1]];
    for (const [h0, h1] of holes) {
      pieces = pieces.flatMap(([a, b]) => b <= h0 || a >= h1 ? [[a, b]] : [[a, Math.min(b, h0)], [Math.max(a, h1), b]].filter(([c, d]) => d - c > .18));
    }
    return pieces;
  }

  function layout() {
    wall.querySelectorAll(".brick, .opening").forEach(el => el.remove());
    cols = Math.max(6, Math.round(wall.clientWidth / 74));
    const W = Math.min(2.2, Math.max(1.2, cols * .14)), D = Math.min(1.5, Math.max(1, cols * .1));
    const openings = [
      {kind: "win", x0: cols * .12, x1: cols * .12 + W, r0: 2, r1: 4},
      {kind: "door", x0: cols / 2 - D / 2, x1: cols / 2 + D / 2, r0: 0, r1: 4},
      {kind: "win", x0: cols * .88 - W, x1: cols * .88, r0: 2, r1: 4},
    ];
    const order = [];
    for (let r = 0; r < ROWS; r++) {
      const holes = openings.filter(o => r >= o.r0 && r <= o.r1).map(o => [o.x0, o.x1]);
      const lintels = openings.filter(o => r === o.r1 + 1).map(o => [o.x0 - .35, o.x1 + .35]);
      const row = [];
      for (let x = r % 2 ? -.5 : 0; x < cols; x++) {            // running bond: every other row shifted
        for (const [a, b] of cut(Math.max(0, x), Math.min(cols, x + 1), [...holes, ...lintels])) row.push({kind: "brick", x0: a, x1: b, r});
      }
      lintels.forEach(([a, b]) => row.push({kind: "lintel", x0: a, x1: b, r}));
      openings.filter(o => o.r0 === r).forEach(o => row.push({...o, r}));
      row.sort((p, q) => p.x0 - q.x0);
      if (r % 2) row.reverse();                                    // a mason goes back and forth
      order.push(...row);
    }
    items = order.map(it => {
      const el = document.createElement("span");
      const opening = it.kind === "win" || it.kind === "door";
      el.className = opening ? `opening ${it.kind}` : it.kind === "lintel" ? "brick lintel" : "brick";
      el.style.left = `calc(${it.x0 / cols * 100}% + ${GAP / 2}px)`;
      el.style.width = `calc(${(it.x1 - it.x0) / cols * 100}% - ${GAP}px)`;
      el.style.bottom = BASE + it.r * ROW_H + "px";
      if (opening) el.style.height = (it.r1 - it.r + 1) * ROW_H - GAP + "px";
      else {
        el.style.setProperty("--h", (8 + Math.random() * 12).toFixed(1));
        el.style.setProperty("--l", (40 + Math.random() * 12).toFixed(1) + "%");
        el.style.setProperty("--r", ((Math.random() - .5) * 30).toFixed(1) + "deg");
      }
      wall.append(el);
      return {el, counts: !opening};
    });
    totalEl.textContent = " / " + items.filter(i => i.counts).length;
    wall.style.setProperty("--ww", wall.clientWidth + "px");
  }

  function layAll() {
    wall.classList.add("instant");
    items.forEach(({el}) => el.classList.add("laid"));
    laid = items.filter(i => i.counts).length;
    countEl.textContent = laid;
    void wall.offsetWidth;
    wall.classList.remove("instant");
    wall.classList.add("done");
    built = true;
  }

  function build() {
    cancelAnimationFrame(raf);
    wall.classList.remove("done");
    wall.classList.add("instant");
    items.forEach(({el}) => el.classList.remove("laid", "knocked"));
    void wall.offsetWidth;
    wall.classList.remove("instant");
    laid = 0;
    countEl.textContent = "0";
    if (reduceMotion) { layAll(); return; }
    building = true;
    trowel.classList.add("on");
    const t0 = performance.now();
    let next = 0;
    (function tick(now) {
      const due = Math.min(items.length, Math.floor((now - t0) / STEP) + 1);
      while (next < due) {
        const {el, counts} = items[next++];
        el.classList.add("laid");
        if (counts) countEl.textContent = ++laid;
      }
      const cur = items[next - 1].el;
      trowel.style.transform = `translate(${cur.offsetLeft + cur.offsetWidth - 14}px, ${cur.offsetTop - 30}px)`;
      if (next < items.length) { raf = requestAnimationFrame(tick); return; }
      building = false;
      built = true;
      setTimeout(() => { trowel.classList.remove("on"); wall.classList.add("done"); }, 600);
    })(t0);
  }

  // knock a brick out — it gets laid right back
  wall.addEventListener("click", e => {
    const el = e.target.closest(".brick.laid");
    if (!el || el.classList.contains("lintel") || building) return;
    el.style.setProperty("--kx", ((Math.random() - .5) * 160).toFixed(0) + "px");
    el.style.setProperty("--kr", ((Math.random() - .5) * 220).toFixed(0) + "deg");
    el.classList.add("knocked");
    countEl.textContent = --laid;
    setTimeout(() => {
      el.style.transition = "none";
      el.classList.remove("knocked", "laid");
      void el.offsetWidth;
      el.style.transition = "";
      el.classList.add("laid");
      countEl.textContent = ++laid;
    }, 1300);
  });

  $("#wallAgain").addEventListener("click", build);
  layout();
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    build();
  }, {threshold: .4}).observe(wall);

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      wall.style.setProperty("--ww", wall.clientWidth + "px");
      if (Math.max(6, Math.round(wall.clientWidth / 74)) === cols) return;
      layout();
      if (building) build();
      else if (built) layAll();
    }, 250);
  });
})();

// ---------- how we build: the house assembles while you scroll ----------
const STEPS = [
  {when: "Day 1", title: "Site survey", text: "We walk the land with you, test the soil and mark the corners with survey stakes."},
  {when: "Week 1", title: "Design & permits", text: "The architect draws the house, the engineer checks every beam, and we bring you the permit."},
  {when: "Week 3", title: "Foundation", text: "A concrete slab, waterproofed and insulated. The part nobody sees and everything stands on."},
  {when: "Month 2", title: "Walls & floors", text: "The house grows floor by floor. Every Friday you get photos and a short video from the site."},
  {when: "Month 4", title: "Roof", text: "Rafters, insulation and tiles — from now on the rain stays outside."},
  {when: "Month 5", title: "Windows & finishing", text: "Windows, facade, wiring, plumbing and the interior you picked in the showroom."},
  {when: "Month 7", title: "The keys", text: "We check everything together, sign the 10-year warranty — and the keys are yours."},
];
(() => {
  const svg = $("#build"), list = $("#steps"), day = $("#buildDay");
  if (!svg || !list) return;
  svg.innerHTML = `
    <defs>
      <pattern id="bricks" width="20" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 12H20M0 6H20M10 0V6M0 6V12M20 6V12" fill="none" stroke="rgba(150,80,60,.35)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect x="0" y="290" width="400" height="50" fill="#14301f"/>
    <path d="M0 290H400" stroke="#eaf7ff" stroke-width="2"/>
    <g class="st pop" data-s="0">
      <path d="M92 290V258M308 290V258" stroke="#ffb627" stroke-width="3"/>
      <path d="M92 258l14 5-14 5M308 258l14 5-14 5" fill="#ff7a1a"/>
      <path class="bl" d="M92 284H308"/>
      <path d="M40 290 50 250 60 290M50 250V244" stroke="#9fb2d6" stroke-width="2.5" fill="none"/>
      <rect x="42" y="236" width="18" height="10" rx="2" fill="#ffb627"/>
    </g>
    <g class="st" data-s="1">
      <path class="bl" d="M100 290V172H300V290M88 174 200 98 312 174"/>
      <path d="M100 312H300M100 306V318M300 306V318" stroke="#eaf7ff" stroke-width="1.2"/>
      <text x="200" y="330" fill="#eaf7ff" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle">12 000</text>
    </g>
    <rect class="st grow" data-s="2" x="90" y="280" width="220" height="12" fill="#8a909c"/>
    <g class="st grow" data-s="3">
      <rect x="100" y="172" width="200" height="108" fill="#efe4d2"/>
      <rect x="100" y="172" width="200" height="108" fill="url(#bricks)"/>
      <path d="M100 226H300" stroke="#c9b9a0" stroke-width="3"/>
    </g>
    <g class="st drop" data-s="4">
      <path d="M86 176 200 96 314 176Z" fill="#b4513a"/>
      <path d="M86 176 200 96 314 176" fill="none" stroke="#8c3a28" stroke-width="3"/>
      <rect x="250" y="106" width="18" height="40" fill="#9a4a35"/>
    </g>
    <g class="st pop" data-s="5">
      <rect class="lit" x="122" y="188" width="36" height="28" rx="2"/>
      <rect class="lit" x="242" y="188" width="36" height="28" rx="2"/>
      <rect class="lit" x="122" y="240" width="36" height="28" rx="2"/>
      <rect class="lit" x="242" y="240" width="36" height="28" rx="2"/>
      <rect x="182" y="234" width="36" height="46" fill="#6b3f2a"/>
      <circle cx="210" cy="258" r="2.5" fill="#ffd27a"/>
      <circle class="lit" cx="200" cy="140" r="11"/>
    </g>
    <g class="st pop" data-s="6">
      <rect x="44" y="250" width="8" height="40" fill="#6b4a32"/><circle cx="48" cy="236" r="26" fill="#3fa34d"/>
      <rect x="346" y="244" width="9" height="46" fill="#6b4a32"/><circle cx="350" cy="226" r="32" fill="#2f8f4e"/>
      <g><circle class="smoke" cx="259" cy="98" r="6"/><circle class="smoke" cx="259" cy="98" r="6"/><circle class="smoke" cx="259" cy="98" r="6"/></g>
      <g transform="translate(296 34)">
        <rect width="92" height="30" rx="15" fill="#ffb627"/>
        <circle cx="17" cy="15" r="7" fill="none" stroke="#1d1300" stroke-width="3"/>
        <path d="M24 15h12m-5 0v5m-4-5v4" stroke="#1d1300" stroke-width="3" fill="none"/>
        <text x="64" y="20" font-family="Unbounded, sans-serif" font-weight="800" font-size="11" fill="#1d1300" text-anchor="middle">HOME</text>
      </g>
    </g>`;
  list.innerHTML = STEPS.map((s, i) => `<li class="step" data-i="${i}"><span class="when">${s.when}</span><h3>${s.title}</h3><p>${s.text}</p></li>`).join("");
  const parts = $$(".st", svg), steps = $$(".step", list);
  let stage = -1;
  function show(i) {
    if (i === stage) return;
    stage = i;
    parts.forEach(p => p.classList.toggle("on", +p.dataset.s <= i));
    steps.forEach((s, k) => s.classList.toggle("on", k === i));
    if (day) day.textContent = i < 0 ? "Day 0" : STEPS[i].when;
  }
  // on phones the sticky drawing covers the top half, so read steps lower down
  const band = innerWidth > 860 ? "-45% 0px -50% 0px" : "-64% 0px -30% 0px";
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) show(+e.target.dataset.i);
  }, {rootMargin: band});
  steps.forEach(s => io.observe(s));
})();

// ---------- the business card: flip and tilt ----------
(() => {
  const card = $("#bizcard"), wrap = card && card.parentElement;
  if (!card) return;
  card.addEventListener("click", () => card.classList.toggle("flipped"));
  if (!canHover || reduceMotion) return;
  wrap.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    card.classList.add("tilting");
    card.style.setProperty("--ry", (x * 18).toFixed(2) + "deg");
    card.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
    card.style.setProperty("--shine", (x * 120).toFixed(0) + "%");
  });
  wrap.addEventListener("pointerleave", () => {
    card.classList.remove("tilting");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--shine", "-60%");
  });
})();

// ---------- what the crew does ----------
const SKILLS = [
  "Site survey", "Architecture", "Structural design", "Permits", "Foundations", "Brick & block",
  "Timber frame", "Concrete frames", "Steel & glass", "Roofing", "Facades", "Windows",
  "Plumbing & heating", "Electrics", "Interiors", "Smart home", "Solar roofs", "Landscaping", "Tower cranes",
];
const METERS = [
  ["Handed over on time", 98],
  ["Clients who come back", 64],
  ["Built with our own crew", 90],
];
(() => {
  const list = $("#skills"), meters = $("#meters");
  if (list) list.innerHTML = SKILLS.map((s, i) => `<li style="--i:${i}">${s}</li>`).join("");
  if (meters) meters.innerHTML = METERS.map(([name, v]) => `<div class="meter" style="--v:${v}"><span>${name}<b>${v}%</b></span><i></i></div>`).join("");
})();

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();
watchReveal();
