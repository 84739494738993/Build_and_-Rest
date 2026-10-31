// =====================================================================
//  BrickLift — hero scene.
//  A tower crane hooks a blueprint, lifts it, and the drawing grows
//  into a real building. Four sheets in a row, then the city resets.
//  Three.js is loaded from the CDN, so the page also works from disk.
// =====================================================================
(async () => {
  const canvas = document.getElementById("scene");
  if (!canvas) return;

  let THREE;
  try {
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
  } catch (err) {
    console.warn("3D scene is unavailable:", err);
    return;
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const elastic = t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
  const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

  // ---------- renderer, camera, lights ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: "high-performance"});
  } catch (err) {
    console.warn("WebGL is unavailable:", err);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050c22, 70, 140);

  const camera = new THREE.PerspectiveCamera(34, 1, .5, 400);
  const target = V(-5.1, 10.5, -1.8);

  scene.add(new THREE.HemisphereLight(0x9cc4ff, 0x0b1532, 1.1));
  const sun = new THREE.DirectionalLight(0xffe0bd, 2.4);
  sun.position.set(-26, 38, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 110});
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .04;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x5cc8ff, 1.1);
  rim.position.set(30, 14, -30);
  scene.add(rim);

  // ---------- ground: dark blueprint table that fades into the page ----------
  function radialTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(.55, "#bbb");
    grad.addColorStop(1, "#000");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(62, 72),
    new THREE.MeshStandardMaterial({color: 0x0f2150, roughness: .96, transparent: true, alphaMap: radialTexture()})
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(110, 55, 0x3d7bff, 0x1c3b7d);
  grid.material.transparent = true;
  grid.material.opacity = .32;
  grid.material.depthWrite = false;
  grid.position.y = .015;
  scene.add(grid);

  // ---------- tower crane ----------
  const CRANE = V(-2, 0, -4);
  const MAST = 24;          // height of the slewing ring
  const JIB = 21;           // jib length
  const TRAVEL = 22.6;      // hook height while the crane moves

  const steel = new THREE.MeshStandardMaterial({color: 0xffb627, roughness: .5, metalness: .35, emissive: 0x2a1700});
  const darkSteel = new THREE.MeshStandardMaterial({color: 0x2b3245, roughness: .6, metalness: .4});
  const concrete = new THREE.MeshStandardMaterial({color: 0x8d94a3, roughness: .9});
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  // many thin bars in one draw call: [from, to, thickness]
  function lattice(bars, material) {
    const mesh = new THREE.InstancedMesh(unitBox, material, bars.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0);
    const dir = V(0, 0, 0), mid = V(0, 0, 0), size = V(0, 0, 0);
    bars.forEach(([a, b, t], i) => {
      dir.subVectors(b, a);
      size.set(t, dir.length(), t);
      q.setFromUnitVectors(up, dir.normalize());
      mid.addVectors(a, b).multiplyScalar(.5);
      mesh.setMatrixAt(i, m.compose(mid, q, size));
    });
    mesh.castShadow = true;
    return mesh;
  }

  function box(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const crane = new THREE.Group();
  crane.position.copy(CRANE);
  scene.add(crane);

  // base + ballast
  crane.add(box(4.2, .8, 4.2, concrete, 0, .4, 0));
  [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([x, z]) => crane.add(box(1.5, .7, 1.5, darkSteel, x, 1.15, z)));

  // mast: square lattice section
  {
    const w = .7, step = 1.5, bars = [];
    const corners = [[-w, -w], [w, -w], [w, w], [-w, w]];
    corners.forEach(([x, z]) => bars.push([V(x, .8, z), V(x, MAST, z), .17]));
    let level = 0;
    for (let y = .8; y < MAST - .1; y += step, level++) {
      const y2 = Math.min(MAST, y + step);
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = corners[i], [x2, z2] = corners[(i + 1) % 4];
        bars.push([V(x1, y2, z1), V(x2, y2, z2), .08]);
        bars.push((level + i) % 2 ? [V(x1, y, z1), V(x2, y2, z2), .065] : [V(x2, y, z2), V(x1, y2, z1), .065]);
      }
    }
    crane.add(lattice(bars, steel));
  }

  // slewing part: jib, counter-jib, apex, cab
  const slew = new THREE.Group();
  slew.position.y = MAST;
  crane.add(slew);
  slew.add(box(1.8, .5, 1.8, darkSteel, 0, .25, 0));
  {
    const bars = [], s = .6, top = 1.35, step = 1.5;
    // jib: triangular section, bottom chords at z = ±s, top chord in the middle
    bars.push([V(0, .5, -s), V(JIB, .5, -s), .14], [V(0, .5, s), V(JIB, .5, s), .14], [V(0, .5 + top, 0), V(JIB - .8, .5 + top, 0), .12]);
    for (let x = 0, i = 0; x < JIB - .1; x += step, i++) {
      const x2 = Math.min(JIB, x + step);
      bars.push([V(x2, .5, -s), V(x2, .5, s), .06]);
      bars.push([V(x, .5, -s), V(x2, .5 + top, 0), .055], [V(x, .5, s), V(x2, .5 + top, 0), .055]);
      if (i % 2) bars.push([V(x, .5, -s), V(x2, .5, s), .05]);
    }
    bars.push([V(JIB, .5, -s), V(JIB - .8, .5 + top, 0), .08], [V(JIB, .5, s), V(JIB - .8, .5 + top, 0), .08]);
    // counter-jib (flat) with a walkway
    bars.push([V(0, .5, -s), V(-8.5, .5, -s), .15], [V(0, .5, s), V(-8.5, .5, s), .15]);
    for (let x = 0; x > -8.4; x -= 1.4) bars.push([V(x, .5, -s), V(x - 1.4, .5, s), .06], [V(x - 1.4, .5, -s), V(x - 1.4, .5, s), .06]);
    // apex
    const apex = V(0, 6.2, 0);
    [[-s, -s], [s, -s], [s, s], [-s, s]].forEach(([x, z]) => bars.push([V(x, .5, z), apex, .13]));
    // tie rods
    bars.push([apex, V(11, .5 + top, 0), .05], [apex, V(JIB - .8, .5 + top, 0), .05], [apex, V(-8.2, .5, -s), .05], [apex, V(-8.2, .5, s), .05]);
    slew.add(lattice(bars, steel));
  }
  // counterweights + machinery + cab
  slew.add(box(2.2, 2.4, 1.6, concrete, -7.4, -.5, 0));
  slew.add(box(2.2, 1, 1.4, darkSteel, -5, 1, 0));
  const cabGlass = new THREE.MeshStandardMaterial({color: 0x9be3ff, emissive: 0x5cc8ff, emissiveIntensity: .8, roughness: .2});
  slew.add(box(1.5, 1.6, 1.4, steel, 1.1, -.4, 1.45));
  slew.add(box(.08, 1, 1.1, cabGlass, 1.88, -.3, 1.45));

  // red warning lights
  const warnMat = new THREE.MeshBasicMaterial({color: 0xff3b30});
  const warn = [V(0, 6.4, 0), V(JIB, .9, 0), V(-8.5, 1, 0)].map(p => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), warnMat);
    light.position.copy(p);
    slew.add(light);
    return light;
  });

  // trolley, cable, hook
  const trolley = box(1, .45, 1.5, darkSteel, 10, .1, 0);
  slew.add(trolley);
  const cableMat = new THREE.MeshStandardMaterial({color: 0x1a1f2b, roughness: .4, metalness: .8});
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 6), cableMat);
  const cable2 = cable.clone();
  slew.add(cable, cable2);
  const hook = new THREE.Group();
  slew.add(hook);
  {
    const stripe = new THREE.MeshStandardMaterial({color: 0x161a24, roughness: .5});
    hook.add(box(.8, .7, .45, steel, 0, .2, 0));
    hook.add(box(.82, .14, .47, stripe, 0, .35, 0), box(.82, .14, .47, stripe, 0, .05, 0));
    const hk = new THREE.Mesh(new THREE.TorusGeometry(.26, .07, 8, 20, Math.PI * 1.45), darkSteel);
    hk.rotation.z = Math.PI * .8;
    hk.position.y = -.42;
    hk.castShadow = true;
    hook.add(hk);
  }
  const craneState = {angle: 0, radius: 10, hookY: TRAVEL};

  function placeCrane() {
    slew.rotation.y = craneState.angle;
    trolley.position.x = craneState.radius;
    const top = .1, y = craneState.hookY - MAST;      // hook position in slew space
    hook.position.set(craneState.radius, y, 0);
    const len = Math.max(.05, top - (y + .55));
    cable.scale.y = cable2.scale.y = len;
    cable.position.set(craneState.radius, top - len / 2, -.18);
    cable2.position.set(craneState.radius, top - len / 2, .18);
  }
  function aimAt(x, z) {
    const vx = x - CRANE.x, vz = z - CRANE.z;
    return {angle: Math.atan2(-vz, vx), radius: Math.min(JIB - 1, Math.max(3, Math.hypot(vx, vz)))};
  }
  function hookWorld(out) {
    return out.set(CRANE.x + Math.cos(craneState.angle) * craneState.radius, craneState.hookY - .45, CRANE.z - Math.sin(craneState.angle) * craneState.radius);
  }

  // =====================================================================
  //  Buildings: each part exists twice — as a glowing blueprint (above
  //  the scan line) and as the real thing (below it).
  // =====================================================================
  const prismCache = new Map();
  function gableGeometry(w, d, h) {
    const key = `${w}|${d}|${h}`;
    if (!prismCache.has(key)) {
      const shape = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
      const geo = new THREE.ExtrudeGeometry(shape, {depth: w, bevelEnabled: false});
      geo.rotateY(Math.PI / 2);
      geo.translate(-w / 2, 0, 0);
      prismCache.set(key, geo);
    }
    return prismCache.get(key);
  }

  const edgeCache = new Map();
  function makeBuilding(spec) {
    const plot = new THREE.Group();
    plot.position.set(spec.pos[0], 0, spec.pos[1]);
    plot.rotation.y = spec.rot || 0;
    scene.add(plot);

    const body = new THREE.Group();          // this one grows with the hook
    plot.add(body);

    const realPlane = new THREE.Plane(V(0, -1, 0), -.01);   // keeps y <= s
    const bpPlane = new THREE.Plane(V(0, 1, 0), .01);       // keeps y >= s
    const clipReal = {clippingPlanes: [realPlane], clipShadows: true};
    const real = {};
    for (const [name, opts] of Object.entries(spec.materials)) {
      real[name] = new THREE.MeshStandardMaterial({roughness: .75, ...opts, ...clipReal});
    }
    real.lit = new THREE.MeshStandardMaterial({color: 0xffe2a8, emissive: 0xffb347, emissiveIntensity: 0, roughness: .4, ...clipReal});
    real.glass = new THREE.MeshStandardMaterial({color: 0x1b2d52, roughness: .15, metalness: .7, ...clipReal});

    const bpFill = new THREE.MeshBasicMaterial({color: 0x2f7bff, transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [bpPlane]});
    const bpLine = new THREE.LineBasicMaterial({color: 0xbfe9ff, transparent: true, opacity: .95, clippingPlanes: [bpPlane]});
    const bpWin = new THREE.MeshBasicMaterial({color: 0x9be3ff, transparent: true, opacity: .55, depthWrite: false, clippingPlanes: [bpPlane]});

    function addPart(geo, mat, matrix) {
      const mesh = new THREE.Mesh(geo, real[mat]);
      mesh.castShadow = mesh.receiveShadow = true;
      const ghost = new THREE.Mesh(geo, bpFill);
      if (!edgeCache.has(geo)) edgeCache.set(geo, new THREE.EdgesGeometry(geo, 25));
      const edges = new THREE.LineSegments(edgeCache.get(geo), bpLine);
      for (const o of [mesh, ghost, edges]) {
        o.matrixAutoUpdate = false;
        o.matrix.copy(matrix);
        body.add(o);
      }
    }
    const m4 = new THREE.Matrix4();
    const b = {
      box(x, y, z, w, h, d, mat) {           // y = bottom of the box
        addPart(unitBox, mat, m4.compose(V(x, y + h / 2, z), new THREE.Quaternion(), V(w, h, d)).clone());
      },
      gable(x, y, z, w, d, h, mat, turn = 0) {   // ridge along x (or along z with turn)
        addPart(gableGeometry(w, d, h), mat, new THREE.Matrix4().makeRotationY(turn).setPosition(x, y, z));
      },
      windows: [],
      // a row of windows on a wall facing +z/-z ("z") or +x/-x ("x")
      row(axis, at, from, to, n, y, w, h) {
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? .5 : i / (n - 1);
          const c = from + (to - from) * t;
          this.windows.push(axis === "z" ? [c, y, at, w, h, .14] : [at, y, c, .14, h, w]);
        }
      },
    };
    spec.build(b);

    // windows: lit and dark ones, instanced
    const rand = mulberry(spec.seed || 7);
    const lit = [], dark = [];
    b.windows.forEach(wd => (rand() < (spec.litShare ?? .7) ? lit : dark).push(wd));
    function instanced(list, realMat) {
      if (!list.length) return;
      const mk = (mat) => {
        const mesh = new THREE.InstancedMesh(unitBox, mat, list.length);
        list.forEach(([x, y, z, w, h, d], i) => mesh.setMatrixAt(i, m4.compose(V(x, y + h / 2, z), new THREE.Quaternion(), V(w, h, d))));
        body.add(mesh);
        return mesh;
      };
      mk(realMat).castShadow = false;
      mk(bpWin);
    }
    instanced(lit, real.lit);
    instanced(dark, real.glass);

    // blueprint sheet on the ground
    const sheet = makeSheet(spec);
    plot.add(sheet.mesh);

    // scan ring for the "materialize" sweep
    const [fw, fd] = spec.foot;
    const ringGeo = new THREE.BufferGeometry().setFromPoints([V(-fw / 2, 0, -fd / 2), V(fw / 2, 0, -fd / 2), V(fw / 2, 0, fd / 2), V(-fw / 2, 0, fd / 2)]);
    const ring = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({color: 0xbfffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending}));
    const slice = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshBasicMaterial({color: 0x5cc8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
    slice.rotation.x = -Math.PI / 2;
    ring.add(slice);
    if (spec.offset) ring.position.set(spec.offset[0], 0, spec.offset[1]);
    plot.add(ring);

    // trees
    const trees = (spec.trees || []).map(([x, z, s]) => {
      const t = makeTree(s);
      t.position.set(x, 0, z);
      t.scale.setScalar(0);
      plot.add(t);
      return t;
    });

    body.scale.y = .001;
    body.visible = false;
    return {spec, plot, body, sheet, ring, slice, trees, real, bpLine, bpFill, realPlane, bpPlane, s: 0};
  }

  function setScan(bld, s) {
    bld.s = s;
    bld.realPlane.constant = s;
    bld.bpPlane.constant = -s;
  }

  // tiny seeded random, so lit windows are the same every loop
  function mulberry(a) {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const trunkMat = new THREE.MeshStandardMaterial({color: 0x6b4a32, roughness: .9});
  const leafMats = [0x3fa34d, 0x2f8f4e, 0x5bb14a].map(c => new THREE.MeshStandardMaterial({color: c, roughness: .8, flatShading: true}));
  const trunkGeo = new THREE.CylinderGeometry(.12, .16, 1.2, 6);
  const crownGeo = new THREE.IcosahedronGeometry(.9, 0);
  let treeN = 0;
  function makeTree(s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = .6;
    const crown = new THREE.Mesh(crownGeo, leafMats[treeN++ % 3]);
    crown.position.y = 1.7;
    crown.scale.set(1, 1.25, 1);
    trunk.castShadow = crown.castShadow = true;
    g.add(trunk, crown);
    g.userData.size = s;
    return g;
  }

  // =====================================================================
  //  Blueprint sheet: a canvas texture drawn stroke by stroke,
  //  like a plotter pen. The plan is in the same units as the building,
  //  so the walls later rise exactly from the drawn lines.
  // =====================================================================
  function makeSheet(spec) {
    const [W, D] = spec.sheet;
    const cw = 1024, ch = Math.round(1024 * D / W), ppu = cw / W;
    const cnv = document.createElement("canvas");
    cnv.width = cw;
    cnv.height = ch;
    const g = cnv.getContext("2d");
    const X = x => (x + W / 2) * ppu, Y = z => (z + D / 2) * ppu;
    const PAPER = "#1249a6", INK = "#eaf7ff";

    // static paper: gradient, grid, frame
    const paper = document.createElement("canvas");
    paper.width = cw;
    paper.height = ch;
    {
      const p = paper.getContext("2d");
      const grad = p.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, "#1756c0");
      grad.addColorStop(1, "#0d3a8e");
      p.fillStyle = grad;
      p.fillRect(0, 0, cw, ch);
      for (let v = 0; v <= W; v += .5) {
        p.fillStyle = Math.abs(v / 2.5 - Math.round(v / 2.5)) < .01 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)";
        p.fillRect(Math.round(v * ppu), 0, 1, ch);
      }
      for (let v = 0; v <= D; v += .5) {
        p.fillStyle = Math.abs(v / 2.5 - Math.round(v / 2.5)) < .01 ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.07)";
        p.fillRect(0, Math.round(v * ppu), cw, 1);
      }
      p.strokeStyle = "rgba(234,247,255,.75)";
      p.lineWidth = 3;
      p.strokeRect(.35 * ppu, .35 * ppu, cw - .7 * ppu, ch - .7 * ppu);
      p.lineWidth = 1;
      p.strokeRect(.5 * ppu, .5 * ppu, cw - ppu, ch - ppu);
    }

    // ---- strokes ----
    const strokes = [];
    const lenOf = pts => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    let tip = null;
    function partialPath(pts, t) {
      const total = lenOf(pts);
      let left = total * t;
      g.beginPath();
      g.moveTo(X(pts[0][0]), Y(pts[0][1]));
      tip = pts[0];
      for (let i = 1; i < pts.length && left > 0; i++) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
        const seg = Math.hypot(bx - ax, bz - az);
        const k = Math.min(1, left / seg);
        tip = [ax + (bx - ax) * k, az + (bz - az) * k];
        g.lineTo(X(tip[0]), Y(tip[1]));
        left -= seg;
      }
    }
    function line(pts, width, color = INK, glow = 6) {
      strokes.push({w: lenOf(pts), draw(t) {
        g.save();
        g.strokeStyle = color;
        g.lineWidth = width;
        g.lineCap = "square";
        g.lineJoin = "miter";
        g.shadowColor = "rgba(170,225,255,.9)";
        g.shadowBlur = glow;
        partialPath(pts, t);
        g.stroke();
        g.restore();
      }});
    }
    function hollow(pts, thick) {             // a wall: two parallel lines
      const w = lenOf(pts);
      strokes.push({w, draw(t) {
        g.save();
        g.lineJoin = "miter";
        g.lineCap = "square";
        g.shadowColor = "rgba(170,225,255,.9)";
        g.shadowBlur = 8;
        g.strokeStyle = INK;
        g.lineWidth = thick * ppu;
        partialPath(pts, t);
        g.stroke();
        g.shadowBlur = 0;
        g.strokeStyle = PAPER;
        g.lineWidth = thick * ppu - 5;
        partialPath(pts, t);
        g.stroke();
        g.restore();
      }});
    }
    const close = pts => [...pts, pts[0]];
    const p = {
      walls(pts) { hollow(close(pts), .34); },
      wall(a, b) { hollow([a, b], .2); },
      win(a, b) {                              // opening in a wall with glass lines
        const w = Math.hypot(b[0] - a[0], b[1] - a[1]);
        strokes.push({w: w * .8, draw(t) {
          const k = clamp01(t * 1.2);
          const nx = -(b[1] - a[1]) / w, nz = (b[0] - a[0]) / w;
          const e = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
          g.save();
          g.strokeStyle = PAPER;
          g.lineWidth = .3 * ppu;
          g.beginPath(); g.moveTo(X(a[0]), Y(a[1])); g.lineTo(X(e[0]), Y(e[1])); g.stroke();
          g.strokeStyle = INK;
          g.lineWidth = 2;
          g.shadowColor = "rgba(170,225,255,.9)";
          g.shadowBlur = 5;
          for (const o of [-.12, 0, .12]) {
            g.beginPath();
            g.moveTo(X(a[0] + nx * o), Y(a[1] + nz * o));
            g.lineTo(X(e[0] + nx * o), Y(e[1] + nz * o));
            g.stroke();
          }
          g.restore();
          tip = e;
        }});
      },
      door(hx, hz, r, a0, a1) {                // hinge, radius, swing angles
        strokes.push({w: r * 1.6, draw(t) {
          const a = a0 + (a1 - a0) * t;
          g.save();
          g.strokeStyle = PAPER;
          g.lineWidth = .3 * ppu;
          g.beginPath();
          g.moveTo(X(hx), Y(hz));
          g.lineTo(X(hx + Math.cos(a0) * r), Y(hz + Math.sin(a0) * r));
          g.stroke();
          g.strokeStyle = INK;
          g.lineWidth = 2;
          g.shadowColor = "rgba(170,225,255,.9)";
          g.shadowBlur = 5;
          g.setLineDash([6, 5]);
          g.beginPath();
          g.arc(X(hx), Y(hz), r * ppu, Math.min(a0, a), Math.max(a0, a));
          g.stroke();
          g.setLineDash([]);
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(X(hx), Y(hz));
          tip = [hx + Math.cos(a) * r, hz + Math.sin(a) * r];
          g.lineTo(X(tip[0]), Y(tip[1]));
          g.stroke();
          g.restore();
        }});
      },
      label(x, z, text, size = .42, color = INK) {
        strokes.push({w: text.length * .22, draw(t) {
          const n = Math.ceil(text.length * t);
          g.save();
          g.font = `600 ${size * ppu}px "JetBrains Mono", Consolas, monospace`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillStyle = color;
          g.shadowColor = "rgba(170,225,255,.8)";
          g.shadowBlur = 4;
          const full = g.measureText(text).width;
          g.textAlign = "left";
          g.fillText(text.slice(0, n), X(x) - full / 2, Y(z));
          tip = [x - full / ppu / 2 + g.measureText(text.slice(0, n)).width / ppu, z];
          g.restore();
        }});
      },
      dim(a, b, off, text) {                   // dimension line with ticks
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const nx = -(b[1] - a[1]) / len * off, nz = (b[0] - a[0]) / len * off;
        const A = [a[0] + nx, a[1] + nz], B = [b[0] + nx, b[1] + nz];
        line([[a[0] + nx * .2, a[1] + nz * .2], [a[0] + nx * 1.25, a[1] + nz * 1.25]], 1.2, "rgba(234,247,255,.7)", 0);
        line([[b[0] + nx * .2, b[1] + nz * .2], [b[0] + nx * 1.25, b[1] + nz * 1.25]], 1.2, "rgba(234,247,255,.7)", 0);
        line([A, B], 1.5, "rgba(234,247,255,.85)", 3);
        for (const P of [A, B]) {
          const d = .22;
          line([[P[0] - d, P[1] + d], [P[0] + d, P[1] - d]], 2, INK, 2);
        }
        const mx = (A[0] + B[0]) / 2 + nx * .45, mz = (A[1] + B[1]) / 2 + nz * .45;
        p.label(mx, mz, text, .36);
      },
      stairs(x, z, w, d, n) {
        for (let i = 0; i <= n; i++) line([[x, z + d * i / n], [x + w, z + d * i / n]], 1.5, INK, 3);
        line([[x + w / 2, z + d], [x + w / 2, z + d * .1]], 1.5, INK, 3);
      },
      dash(pts) { line(close(pts), 2, "rgba(234,247,255,.6)", 0); strokes[strokes.length - 1].dash = true; },
      column(x, z) { line([[x - .18, z - .18], [x + .18, z - .18], [x + .18, z + .18], [x - .18, z + .18], [x - .18, z - .18]], 3, INK, 4); },
    };
    spec.plan(p);

    // title block, typed in at the end
    {
      const bw = Math.min(W * .46, 7.2), bh = 1.5, x1 = W / 2 - .6, z1 = D / 2 - .6, x0 = x1 - bw, z0 = z1 - bh;
      line([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], 2, INK, 3);
      line([[x0 + bw * .62, z0], [x0 + bw * .62, z1]], 1.5, INK, 2);
      p.label(x0 + bw * .31, z0 + .5, "BRICKLIFT", .44, "#ffd27a");
      p.label(x0 + bw * .31, z0 + 1.05, spec.code, .3);
      p.label(x0 + bw * .81, z0 + .5, "1 : 100", .34);
      p.label(x0 + bw * .81, z0 + 1.05, "A-10" + spec.n, .3);
    }

    const totalW = strokes.reduce((s, k) => s + k.w, 0);
    const texture = new THREE.CanvasTexture(cnv);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshBasicMaterial({map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false})
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = .04;
    mesh.renderOrder = 1;
    if (spec.sheetOffset) mesh.position.set(spec.sheetOffset[0], .04, spec.sheetOffset[1]);

    let lastKey = "";
    function draw(progress, stamp = 0) {
      const key = progress.toFixed(3) + "|" + stamp.toFixed(2);
      if (key === lastKey) return;
      lastKey = key;
      g.drawImage(paper, 0, 0);
      let budget = progress * totalW;
      tip = null;
      for (const s of strokes) {
        if (budget <= 0) break;
        const t = Math.min(1, budget / s.w);
        if (s.dash) g.setLineDash([10, 8]);
        s.draw(t);
        g.setLineDash([]);
        budget -= s.w;
      }
      // glowing pen tip
      if (tip && progress < 1) {
        const r = g.createRadialGradient(X(tip[0]), Y(tip[1]), 0, X(tip[0]), Y(tip[1]), 26);
        r.addColorStop(0, "rgba(255,255,255,1)");
        r.addColorStop(.25, "rgba(180,235,255,.8)");
        r.addColorStop(1, "rgba(92,200,255,0)");
        g.fillStyle = r;
        g.fillRect(X(tip[0]) - 26, Y(tip[1]) - 26, 52, 52);
      }
      // APPROVED stamp
      if (stamp > 0) {
        const s = 1 + 1.4 * (1 - easeOut(clamp01(stamp * 1.6)));
        g.save();
        g.globalAlpha = clamp01(stamp * 2) * .92;
        g.translate(X(-W / 2 + 3.2), Y(-D / 2 + 1.9));
        g.rotate(-.2);
        g.scale(s, s);
        g.strokeStyle = g.fillStyle = "#ff8a3d";
        g.shadowColor = "rgba(255,138,61,.8)";
        g.shadowBlur = 10;
        g.lineWidth = 5;
        const sw = 2.6 * ppu, sh = .95 * ppu;
        g.strokeRect(-sw / 2, -sh / 2, sw, sh);
        g.lineWidth = 2;
        g.strokeRect(-sw / 2 + 7, -sh / 2 + 7, sw - 14, sh - 14);
        g.font = `800 ${.5 * ppu}px "Unbounded", "JetBrains Mono", sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("APPROVED", 0, 2);
        g.restore();
      }
      texture.needsUpdate = true;
    }
    draw(0);
    return {mesh, draw};
  }

  // =====================================================================
  //  The four projects. Plan coordinates = building coordinates (meters).
  // =====================================================================
  const PI = Math.PI;
  const SPECS = [
    {
      n: 1, code: "HOUSE · OAK", name: "Family house “Oak”", meta: "186 m² · 2 floors · 7 months",
      pos: [-15.2, 10.3], rot: .5, seed: 3, sheet: [15, 13], stamp: [-4.3, 5], foot: [9.6, 7.6],
      height: 8.33, sling: 2, lift: [[-4.9, 0], [4.9, 0]],
      trees: [[-6.4, 4.6, 1], [6.4, -4.6, 1.2], [6.6, 4.4, .9], [-6.6, -4.2, 1.1]],
      materials: {base: {color: 0x8a909c}, wall: {color: 0xefe4d2}, roof: {color: 0xb4513a, roughness: .6}, trim: {color: 0xffffff}, door: {color: 0x6b3f2a}, brick: {color: 0x9a4a35}},
      build(b) {
        b.box(0, 0, 0, 9.6, .3, 7.6, "base");
        b.box(0, .3, 0, 9, 5.2, 7, "wall");
        b.box(0, 5.5, 0, 9.3, .18, 7.3, "trim");
        b.gable(0, 5.68, 0, 9.9, 7.9, 2.65, "roof");
        b.box(2.6, 6.2, -1.3, .8, 2.4, .8, "brick");
        b.box(0, 3, 4.05, 3.4, .18, 1.3, "trim");
        b.box(-1.5, .3, 4.5, .16, 2.7, .16, "trim");
        b.box(1.5, .3, 4.5, .16, 2.7, .16, "trim");
        b.box(0, .3, 3.52, 1.2, 2.3, .1, "door");
        b.row("z", 3.52, -3, 3, 2, 1.3, 1.5, 1.4);
        b.row("z", 3.52, -3, 3, 3, 3.9, 1.3, 1.25);
        b.row("z", -3.52, -3, 3, 3, 1.3, 1.4, 1.4);
        b.row("z", -3.52, -3, 3, 3, 3.9, 1.3, 1.25);
        b.row("x", 4.52, -1.6, 1.6, 2, 1.3, 1.3, 1.4);
        b.row("x", 4.52, -1.6, 1.6, 2, 3.9, 1.3, 1.25);
        b.row("x", -4.52, -1.6, 1.6, 2, 1.3, 1.3, 1.4);
        b.row("x", -4.52, 0, 0, 1, 3.9, 1.3, 1.25);
      },
      plan(p) {
        p.walls([[-4.5, -3.5], [4.5, -3.5], [4.5, 3.5], [-4.5, 3.5]]);
        p.wall([-1.2, -3.5], [-1.2, 3.5]);
        p.wall([-4.5, .4], [-1.2, .4]);
        p.wall([1.8, -3.5], [1.8, -.8]);
        p.win([-3.75, 3.5], [-2.25, 3.5]);
        p.win([2.25, 3.5], [3.75, 3.5]);
        p.win([-3.7, -3.5], [-2.3, -3.5]);
        p.win([-.7, -3.5], [.7, -3.5]);
        p.win([2.3, -3.5], [3.7, -3.5]);
        p.win([4.5, -2.25], [4.5, -.95]);
        p.win([4.5, .95], [4.5, 2.25]);
        p.win([-4.5, -2.25], [-4.5, -.95]);
        p.win([-4.5, .95], [-4.5, 2.25]);
        p.door(-.6, 3.5, 1.2, 0, -PI / 2);
        p.door(-1.2, 1.4, .9, PI / 2, PI);
        p.stairs(2.1, -3.2, 2.1, 2.2, 8);
        p.label(1.6, 1.4, "LIVING 31 m²");
        p.label(-2.85, -1.6, "KITCHEN 14 m²", .36);
        p.label(-2.85, 2.1, "HALL");
        p.label(3.15, -.4, "STAIRS", .3);
        p.dim([-4.5, -3.5], [4.5, -3.5], -1.1, "9 000");
        p.dim([4.5, -3.5], [4.5, 3.5], -1.1, "7 000");
      },
    },
    {
      n: 2, code: "COTTAGE · PINE", name: "Cottage “Pine”", meta: "124 m² · 1 floor + attic · 5 months",
      pos: [-2.5, 7.4], rot: .62, seed: 11, sheet: [17, 13], stamp: [5.2, -3.6], foot: [12.4, 6.4],
      height: 6.6, sling: 2, lift: [[-6.3, 0], [2.3, 0]],
      trees: [[-7.6, -4, 1.2], [7.4, -3.6, 1], [-7.8, 3.8, .9], [7.6, 4.6, 1.1]],
      materials: {base: {color: 0x8a909c}, wall: {color: 0xd9a46c}, roof: {color: 0x353b48, roughness: .55}, trim: {color: 0xf4efe6}, door: {color: 0x2c3140}, deck: {color: 0x9b6a43}},
      build(b) {
        b.box(-2, 0, 0, 8.4, .3, 6.4, "base");
        b.box(4, 0, 1, 4.2, .3, 4.2, "base");
        b.box(-2, .3, 0, 8, 3.3, 6, "wall");
        b.gable(-2, 3.6, 0, 8.8, 6.9, 3, "roof");
        b.box(4, .3, 1, 4, 2.7, 4, "trim");
        b.box(4, 3, 1, 4.4, .25, 4.4, "roof");
        b.box(4, .3, 3.03, 3, 2.1, .1, "door");
        b.box(-2.4, .3, 3.9, 6.8, .14, 1.8, "deck");
        b.box(1, .3, 3.02, 1.1, 2.3, .1, "door");
        b.row("z", 3.03, -4.2, -1.4, 2, .9, 2.2, 2.2);
        b.row("z", -3.03, -4.5, .5, 3, 1.1, 1.3, 1.4);
        b.row("x", -6.03, -1.5, 1.5, 2, 1.1, 1.2, 1.4);
        b.row("x", -6.03, 0, 0, 1, 4, 1, 1);
        b.row("x", 2.43, 0, 0, 1, 4, 1, 1);
        b.row("x", 6.03, 1, 1, 1, 1.2, 1.4, .8);
      },
      plan(p) {
        p.walls([[-6, -3], [2, -3], [2, -1], [6, -1], [6, 3], [-6, 3]]);
        p.wall([2, -1], [2, 3]);
        p.wall([-2.5, -3], [-2.5, .6]);
        p.wall([-6, .6], [-2.5, .6]);
        p.win([-5.3, 3], [-3.1, 3]);
        p.win([-2.5, 3], [-.3, 3]);
        p.win([2.5, 3], [5.5, 3]);
        p.win([-5.15, -3], [-3.85, -3]);
        p.win([-2.65, -3], [-1.35, -3]);
        p.win([-.15, -3], [1.15, -3]);
        p.win([-6, -2.1], [-6, -.9]);
        p.win([-6, .9], [-6, 2.1]);
        p.door(.45, 3, 1.1, 0, -PI / 2);
        p.door(2, .2, .9, PI / 2, PI);
        p.dash([[-5.8, 3.15], [1, 3.15], [1, 4.8], [-5.8, 4.8]]);
        p.label(-.2, -.8, "GREAT ROOM 34 m²", .36);
        p.label(-4.25, -1.2, "BED 12 m²", .36);
        p.label(-4.25, 1.8, "BATH", .36);
        p.label(4, 1.2, "GARAGE");
        p.label(-2.4, 3.98, "TERRACE", .34);
        p.dim([-6, -3], [2, -3], -1.1, "8 000");
        p.dim([-6, -3], [-6, 3], 1.1, "6 000");
      },
    },
    {
      n: 3, code: "RESIDENCE · HARBOR", name: "Residence “Harbor”", meta: "16 flats · 4 floors · 11 months",
      pos: [8.5, -6.6], rot: .7, seed: 5, sheet: [17, 12], stamp: [-4.6, 4.5], foot: [12.4, 6.4],
      height: 13.15, sling: 2, lift: [[-5.8, -2.8], [5.8, -2.8], [5.8, 2.8], [-5.8, 2.8]], litShare: .62,
      trees: [[-7.6, 4.4, 1], [7.7, 4.2, 1.2], [-7.8, -3.4, 1.1], [7.8, -4, .9]],
      materials: {base: {color: 0x8a909c}, wall: {color: 0xe3e6ee}, accent: {color: 0xc0623f}, trim: {color: 0x9aa3b5}, door: {color: 0x2c3140}, roof: {color: 0x4a5163}},
      build(b) {
        b.box(0, 0, 0, 12.6, .3, 6.6, "base");
        b.box(0, .3, 0, 12, 12, 6, "wall");
        b.box(-5.75, .3, 3.05, .5, 12, .14, "accent");
        b.box(5.75, .3, 3.05, .5, 12, .14, "accent");
        b.box(0, 12.3, 0, 12.3, .25, 6.3, "trim");
        b.box(0, 12.55, 3, 12.3, .6, .25, "trim");
        b.box(0, 12.55, -3, 12.3, .6, .25, "trim");
        b.box(6.03, 12.55, 0, .25, .6, 6.3, "trim");
        b.box(-6.03, 12.55, 0, .25, .6, 6.3, "trim");
        b.box(-3.2, 12.55, 0, 2.4, 1.8, 2.4, "roof");
        for (let f = 1; f <= 3; f++) {
          for (const x of [-3.9, 0, 3.9]) {
            b.box(x, .3 + 3 * f - .18, 3.5, 2.3, .18, 1, "trim");
            b.box(x, .3 + 3 * f, 3.96, 2.3, .8, .06, "accent");
          }
        }
        b.box(0, 2.9, 3.6, 3, .2, 1.2, "accent");
        b.box(0, .3, 3.03, 1.6, 2.4, .1, "door");
        b.row("z", 3.03, -5, -3, 2, 1.2, 1.2, 1.6);
        b.row("z", 3.03, 3, 5, 2, 1.2, 1.2, 1.6);
        for (let f = 0; f < 4; f++) {
          const y = .3 + 3 * f + 1;
          if (f) b.row("z", 3.03, -5, 5, 6, y, 1.2, 1.6);
          b.row("z", -3.03, -5, 5, 6, y, 1.2, 1.6);
          b.row("x", 6.03, -1.5, 1.5, 2, y, 1.2, 1.6);
          b.row("x", -6.03, -1.5, 1.5, 2, y, 1.2, 1.6);
        }
      },
      plan(p) {
        p.walls([[-6, -3], [6, -3], [6, 3], [-6, 3]]);
        p.wall([-2, -3], [-2, 3]);
        p.wall([2, -3], [2, 3]);
        p.wall([-6, -.7], [-2, -.7]);
        p.wall([2, -.7], [6, -.7]);
        p.wall([-6, .7], [-2, .7]);
        p.wall([2, .7], [6, .7]);
        for (const x of [-5, -3, 3, 5]) p.win([x - .6, 3], [x + .6, 3]);
        for (const x of [-5, -3, -1, 1, 3, 5]) p.win([x - .6, -3], [x + .6, -3]);
        for (const z of [-1.5, 1.5]) { p.win([6, z - .6], [6, z + .6]); p.win([-6, z - .6], [-6, z + .6]); }
        p.door(-.8, 3, .8, 0, -PI / 2);
        p.door(.8, 3, .8, PI, PI * 1.5);
        p.stairs(-1.6, -2.6, 1.4, 2, 7);
        p.dash([[.3, -2.6], [1.6, -2.6], [1.6, -1.2], [.3, -1.2]]);
        p.label(.95, -1.9, "LIFT", .28);
        p.label(-4, -1.85, "APT 1 · 52 m²", .34);
        p.label(4, -1.85, "APT 2 · 48 m²", .34);
        p.label(-4, 1.85, "APT 3 · 52 m²", .34);
        p.label(4, 1.85, "APT 4 · 48 m²", .34);
        p.label(0, 1.6, "HALL", .34);
        p.dim([-6, -3], [6, -3], -1.1, "12 000");
        p.dim([6, -3], [6, 3], -1.1, "6 000");
      },
    },
    {
      n: 4, code: "TOWER · SKYLINE", name: "Tower “Skyline”", meta: "6 floors · glass & steel · 14 months",
      pos: [-13.4, -4.5], rot: .62, seed: 21, sheet: [15, 15], stamp: [-4, 5.6], foot: [9.6, 9.6],
      height: 20.5, sling: 1.5, lift: [[-2.1, -2.1], [2.1, -2.1], [2.1, 2.1], [-2.1, 2.1]], litShare: .66,
      trees: [[-6, 6, 1.1], [6.2, 6, 1], [6.3, -6, 1.2], [-6.2, -6, .9]],
      materials: {base: {color: 0x8a909c}, wall: {color: 0x2a4a7a, roughness: .25, metalness: .6}, trim: {color: 0xdfe5ee}, door: {color: 0x1d2433}, accent: {color: 0xffb627, roughness: .4}},
      build(b) {
        b.box(0, 0, 0, 9.6, .3, 9.6, "base");
        b.box(0, .3, 0, 9, 3.4, 9, "glass");
        b.box(0, 3.7, 0, 9.2, .3, 9.2, "trim");
        b.box(0, 4, 0, 6.4, 14.7, 6.4, "wall");
        for (let f = 1; f <= 4; f++) b.box(0, 4 + 3 * f - .12, 0, 6.6, .24, 6.6, "trim");
        for (const [x, z] of [[-3.2, -3.2], [3.2, -3.2], [3.2, 3.2], [-3.2, 3.2]]) b.box(x, 4, z, .32, 14.7, .32, "trim");
        b.box(0, 18.7, 0, 6.8, .3, 6.8, "trim");
        b.box(0, 19, 0, 4.6, 1.5, 4.6, "accent");
        b.box(0, 20.5, 0, .16, 1.2, .16, "trim");
        b.box(0, .3, 4.53, 2, 2.6, .1, "door");
        for (let f = 0; f < 5; f++) {
          const y = 4 + 3 * f + .45;
          b.row("z", 3.23, -2.25, 2.25, 4, y, 1.15, 2.1);
          b.row("z", -3.23, -2.25, 2.25, 4, y, 1.15, 2.1);
          b.row("x", 3.23, -2.25, 2.25, 4, y, 1.15, 2.1);
          b.row("x", -3.23, -2.25, 2.25, 4, y, 1.15, 2.1);
        }
        b.row("z", 4.53, -3.4, -1.8, 2, .6, 1.4, 2.6);
        b.row("z", 4.53, 1.8, 3.4, 2, .6, 1.4, 2.6);
        b.row("z", -4.53, -3.4, 3.4, 4, .6, 1.4, 2.6);
        b.row("x", 4.53, -3.4, 3.4, 4, .6, 1.4, 2.6);
        b.row("x", -4.53, -3.4, 3.4, 4, .6, 1.4, 2.6);
      },
      plan(p) {
        p.walls([[-4.5, -4.5], [4.5, -4.5], [4.5, 4.5], [-4.5, 4.5]]);
        p.dash([[-3.2, -3.2], [3.2, -3.2], [3.2, 3.2], [-3.2, 3.2]]);
        p.walls([[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]]);
        for (const [x, z] of [[-3.2, -3.2], [0, -3.2], [3.2, -3.2], [3.2, 0], [3.2, 3.2], [0, 3.2], [-3.2, 3.2], [-3.2, 0]]) p.column(x, z);
        p.win([-4.1, 4.5], [-1.2, 4.5]);
        p.win([1.2, 4.5], [4.1, 4.5]);
        p.win([-4.1, -4.5], [4.1, -4.5]);
        p.win([4.5, -4.1], [4.5, 4.1]);
        p.win([-4.5, -4.1], [-4.5, 4.1]);
        p.door(-1, 4.5, 1, 0, -PI / 2);
        p.door(1, 4.5, 1, PI, PI * 1.5);
        p.label(0, 0, "CORE", .34);
        p.label(0, 2.3, "LOBBY 64 m²", .36);
        p.label(0, -2.3, "CAFE 28 m²", .36);
        p.dim([-4.5, -4.5], [4.5, -4.5], -1.1, "9 000");
        p.dim([4.5, -4.5], [4.5, 4.5], -1.1, "9 000");
      },
    },
  ];

  const builds = SPECS.map(makeBuilding);

  // ---------- slings (hook → building) and sparkles ----------
  const slingMat = new THREE.LineBasicMaterial({color: 0xffd27a, transparent: true, opacity: 0});
  const slings = [0, 1, 2, 3].map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]), slingMat);
    line.frustumCulled = false;
    scene.add(line);
    return line;
  });
  const eye = V(0, 0, 0), tmp = V(0, 0, 0);
  function updateSlings(bld, top, alpha) {
    slingMat.opacity = alpha;
    hookWorld(eye);
    slings.forEach((line, i) => {
      const pt = bld && bld.spec.lift[i];
      line.visible = !!pt && alpha > .01;
      if (!line.visible) return;
      bld.plot.localToWorld(tmp.set(pt[0], top, pt[1]));
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, eye.x, eye.y, eye.z);
      pos.setXYZ(1, tmp.x, tmp.y, tmp.z);
      pos.needsUpdate = true;
    });
  }

  const SPARKS = 120;
  const sparkPos = new Float32Array(SPARKS * 3), sparkVel = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({color: 0xffd27a, size: .32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkAge = 9;
  function burst(bld) {
    const [fw, fd] = bld.spec.foot, h = bld.spec.height;
    for (let i = 0; i < SPARKS; i++) {
      tmp.set((Math.random() - .5) * fw, Math.random() * h, (Math.random() - .5) * fd);
      bld.plot.localToWorld(tmp);
      sparkPos.set([tmp.x, tmp.y, tmp.z], i * 3);
      sparkVel.set([(Math.random() - .5) * 2, 1 + Math.random() * 3, (Math.random() - .5) * 2], i * 3);
    }
    sparkAge = 0;
  }
  function updateSparks(dt) {
    if (sparkAge > 2) { sparkMat.opacity = 0; return; }
    sparkAge += dt;
    for (let i = 0; i < SPARKS * 3; i++) sparkPos[i] += sparkVel[i] * dt;
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = Math.max(0, 1 - sparkAge / 1.6);
  }

  // ---------- HUD ----------
  const $ = id => document.getElementById(id);
  const hud = {num: $("hudNum"), title: $("hudTitle"), meta: $("hudMeta"), steps: $("hudSteps") ? [...$("hudSteps").children] : [], bar: $("hudBar")};
  let hudKey = "";
  function setHud(i, step, frac) {
    const spec = SPECS[i];
    const key = i + "|" + step;
    if (key !== hudKey) {
      hudKey = key;
      if (hud.num) hud.num.textContent = step === 9 ? "DONE" : `0${spec.n} / 0${SPECS.length}`;
      if (hud.title) hud.title.textContent = step === 9 ? "The block is ready" : spec.name;
      if (hud.meta) hud.meta.textContent = step === 9 ? "4 projects · 1 crane · 0 delays" : spec.meta;
      hud.steps.forEach((li, k) => {
        li.classList.toggle("done", step === 9 || k < step);
        li.classList.toggle("on", k === step);
      });
    }
    if (hud.bar) hud.bar.style.width = (step === 9 ? 100 : frac * 100).toFixed(1) + "%";
  }

  // ---------- the director ----------
  const PH = {draw: 4.8, hook: 1, lift: 3.6, build: 2.6, release: .9, hold: 5, teardown: 2.8};
  const PER_BUILD = PH.draw + PH.hook + PH.lift + PH.build + PH.release;
  const REST = aimAt(5.9, -17);          // jib to the side, so it shows in profile
  let cur = 0, phase = "draw", pt = 0, from = null, to = null, buildStart = 0;
  craneState.angle = REST.angle;
  craneState.radius = REST.radius;

  function enter(name) {
    phase = name;
    pt = 0;
    from = {...craneState};
    if (name === "draw") {
      const b = builds[cur];
      tmp.set(0, 0, 0);
      b.plot.localToWorld(tmp);
      to = aimAt(tmp.x, tmp.z);
      b.sheet.draw(0);
      b.body.visible = false;
      setScan(b, -.01);
    }
    if (name === "hold") to = REST;
  }
  const angleDelta = (a, b) => ((b - a + PI * 3) % (PI * 2)) - PI;
  const top0 = .05;
  const hookFor = (b, top) => top + b.spec.sling + .45;

  function lightUp(b, v, flicker) {
    b.real.lit.emissiveIntensity = 1.7 * v * (flicker && Math.random() < .25 ? .25 : 1);
  }

  function update(dt, time) {
    pt += dt;
    const b = builds[cur];
    const d = PH[phase];
    const t = Math.min(pt, d);

    if (phase === "draw") {
      const k = smooth(0, .5, t);
      b.sheet.mesh.material.opacity = k;
      b.sheet.mesh.scale.x = .2 + .8 * easeOut(k);
      b.sheet.draw(ease(clamp01((t - .3) / 3.9)), clamp01((t - 4.2) / .6));
      const s = ease(clamp01((t - .2) / 3));
      craneState.angle = from.angle + angleDelta(from.angle, to.angle) * s;
      craneState.radius = from.radius + (to.radius - from.radius) * s;
      const up = Math.max(from.hookY, TRAVEL);
      craneState.hookY = t < 3.2 ? from.hookY + (up - from.hookY) * ease(clamp01(t / .8)) : up + (hookFor(b, top0) - up) * ease(clamp01((t - 3.2) / 1.6));
      setHud(cur, 0, (pt) / PER_BUILD);
    } else if (phase === "hook") {
      updateSlings(b, top0, smooth(0, .5, t));
      craneState.hookY = hookFor(b, top0) - Math.sin(clamp01(t / .8) * PI) * .35;
      setHud(cur, 1, (PH.draw + t) / PER_BUILD);
    } else if (phase === "lift") {
      const u = ease(t / d);
      const top = top0 + (b.spec.height - top0) * u;
      b.body.visible = true;
      b.body.scale.y = Math.max(.001, top / b.spec.height);
      b.sheet.mesh.material.opacity = 1 - smooth(0, .45, u);
      craneState.hookY = hookFor(b, top);
      updateSlings(b, top, 1);
      setHud(cur, 2, (PH.draw + PH.hook + t) / PER_BUILD);
    } else if (phase === "build") {
      const H = b.spec.height;
      if (pt - dt <= 0) burst(b);
      const s = (H + .6) * ease(clamp01(t / 1.7));
      setScan(b, s);
      b.ring.position.y = s;
      const glow = t < 1.7 ? 1 : 1 - smooth(1.7, 2.1, t);
      b.ring.material.opacity = glow;
      b.slice.material.opacity = .22 * glow;
      lightUp(b, smooth(1.3, 2.3, t), t < 2.2);
      b.trees.forEach((tr, i) => tr.scale.setScalar(tr.userData.size * elastic(clamp01((t - 1.1 - i * .15) / 1.1))));
      b.sheet.mesh.material.opacity = 0;
      updateSlings(b, H, 1);
      setHud(cur, 3, (PH.draw + PH.hook + PH.lift + t) / PER_BUILD);
    } else if (phase === "release") {
      updateSlings(b, b.spec.height, 1 - smooth(0, .4, t));
      craneState.hookY = from.hookY + (TRAVEL - from.hookY) * ease(t / d);
      setHud(cur, 3, (PER_BUILD - d + t) / PER_BUILD);
    } else if (phase === "hold") {
      const s = ease(clamp01(t / 3));
      craneState.angle = from.angle + angleDelta(from.angle, to.angle) * s;
      craneState.radius = from.radius + (to.radius - from.radius) * s;
      setHud(SPECS.length - 1, 9, 1);
    } else if (phase === "teardown") {
      // the block folds back into blueprints and sinks into the ground
      for (const bb of builds) {
        const H = bb.spec.height;
        setScan(bb, (H + .6) * (1 - ease(clamp01(t / 1.3))));
        bb.body.scale.y = Math.max(.001, 1 - ease(clamp01((t - 1.3) / 1.3)));
        lightUp(bb, 1 - smooth(0, .8, t), false);
        bb.trees.forEach(tr => tr.scale.setScalar(tr.userData.size * (1 - smooth(.2, 1.2, t))));
      }
    }

    if (pt >= d) {
      if (phase === "draw") enter("hook");
      else if (phase === "hook") enter("lift");
      else if (phase === "lift") enter("build");
      else if (phase === "build") enter("release");
      else if (phase === "release") {
        updateSlings(null, 0, 0);
        if (cur < builds.length - 1) { cur++; enter("draw"); }
        else enter("hold");
      } else if (phase === "hold") enter("teardown");
      else if (phase === "teardown") {
        builds.forEach(bb => { bb.body.visible = false; bb.ring.material.opacity = 0; });
        cur = 0;
        enter("draw");
      }
    }

    placeCrane();
    updateSparks(dt);
    const blink = (time % 1.4) < .7;
    warn.forEach(l => { l.visible = blink; });
  }

  // finished state for people who prefer less motion
  function finishAll() {
    for (const b of builds) {
      b.body.visible = true;
      b.body.scale.y = 1;
      setScan(b, b.spec.height + 1);
      lightUp(b, 1, false);
      b.trees.forEach(tr => tr.scale.setScalar(tr.userData.size));
    }
    Object.assign(craneState, REST, {hookY: TRAVEL});
    placeCrane();
    setHud(SPECS.length - 1, 9, 1);
  }

  // ---------- camera: framing, slow drift, mouse parallax ----------
  const mouse = {x: 0, y: 0, sx: 0, sy: 0};
  const hero = canvas.parentElement;
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * 2 - 1;
    mouse.y = (e.clientY - r.top) / r.height * 2 - 1;
  });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = 0; });

  let dist = 80, wide = true;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w > 860;
    // wide screens: the text is on the left, so push the scene to the right;
    // phones: the canvas is its own block under the text, the HUD covers its bottom
    const R = wide ? 26 : 22;
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect * (wide ? .6 : 1));
    dist = R / Math.sin(Math.min(halfV, halfH));
    if (wide) camera.setViewOffset(w, h, -w * .2, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * .1, w, h);
    camera.updateProjectionMatrix();
  }
  function placeCamera(time) {
    mouse.sx += (mouse.x - mouse.sx) * .04;
    mouse.sy += (mouse.y - mouse.sy) * .04;
    const az = .62 + Math.sin(time * .06) * .1 + mouse.sx * .12;
    const el = .46 - mouse.sy * .05;
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist
    );
    camera.lookAt(target);
  }

  // ---------- loop ----------
  const SPEED = Math.min(8, +new URLSearchParams(location.search).get("speed") || 1);   // ?speed=4 for testing
  let visible = true, last = performance.now(), clock = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  addEventListener("resize", resize);
  resize();

  if (reduceMotion) {
    finishAll();
    placeCamera(0);
    renderer.render(scene, camera);
    canvas.classList.add("ready");
    addEventListener("resize", () => { placeCamera(0); renderer.render(scene, camera); });
    return;
  }

  enter("draw");
  placeCrane();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000) * SPEED;
    last = now;
    if (!visible || document.hidden) return;
    clock += dt;
    update(dt, clock);
    placeCamera(clock);
    renderer.render(scene, camera);
    if (!canvas.classList.contains("ready")) canvas.classList.add("ready");
  }
  requestAnimationFrame(frame);
})();
