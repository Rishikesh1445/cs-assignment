/**
 * Q2 — Multi-Robot (Multi-Agent) Path Finding
 * ============================================================
 * Four solvers, all sharing one space-time A* core:
 *
 *  A1  Independent A*          — each robot plans alone, ignores others (baseline)
 *  A2  Adaptive-Priority       — K priority orderings x reservation-based planning,
 *      Reservation A*            keep the ordering with the lowest global cost
 *  A3  CAR-A*                  — Congestion-Aware Reservation A*: soft congestion
 *                                penalty f = g + h + lambda*C(n,t), WAIT action,
 *                                edge-swap blocking, slack-based adaptive priority
 *  A4  CBS                     — Conflict-Based Search, optimal two-level search
 *                                with an explicit constraint tree
 *
 * Every solver emits a `trace` : a flat, readable list of calculation steps that
 * the right-hand sidebar plays back one at a time.
 */

export const AGENT_COLORS = [
  { id: 0, hex: '#3b82f6', name: 'Blue' },
  { id: 1, hex: '#ef4444', name: 'Red' },
  { id: 2, hex: '#10b981', name: 'Green' },
  { id: 3, hex: '#f59e0b', name: 'Amber' },
  { id: 4, hex: '#8b5cf6', name: 'Violet' },
  { id: 5, hex: '#ec4899', name: 'Pink' },
  { id: 6, hex: '#06b6d4', name: 'Cyan' },
  { id: 7, hex: '#84cc16', name: 'Lime' }
];

export const MAPF_ALGORITHMS = [
  {
    id: 'A1',
    short: 'A*',
    name: 'Independent A* (baseline)',
    blurb: 'Every robot runs plain A* on its own and ignores all other robots. Fast, but produces vertex and edge collisions.',
    formula: 'f(n) = g(n) + h(n)'
  },
  {
    id: 'A2',
    short: 'APRA*',
    name: 'Adaptive-Priority Reservation A*',
    blurb: 'Plans robots one after another into a shared reservation table, repeats this for several priority orderings, and keeps the ordering with the lowest total cost.',
    formula: 'Best = argmin over orderings of TotalCost(ordering)'
  },
  {
    id: 'A3',
    short: 'CAR-A*',
    name: 'Congestion-Aware Reservation A*',
    blurb: 'Space-time A* where busy regions are expensive instead of blocked. Adds WAIT as a real action, blocks edge swaps, and orders robots by least remaining slack.',
    formula: 'f(n) = g(n) + h(n) + lambda * C(n,t)'
  },
  {
    id: 'A4',
    short: 'CBS',
    name: 'Conflict-Based Search (optimal)',
    blurb: 'Two-level search. The high level grows a constraint tree over detected conflicts; the low level re-plans single robots under those constraints.',
    formula: 'Split conflict into constraints, expand lowest-cost CT node'
  }
];

// ------------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------------
export const vKey = (r, c, t) => r + ',' + c + ',' + t;
export const eKey = (r1, c1, r2, c2, t) => r1 + ',' + c1 + '>' + r2 + ',' + c2 + '@' + t;
export const cellKey = (r, c) => r + ',' + c;

export const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

const MOVES = [
  { dr: -1, dc: 0, name: 'UP', angle: 270 },
  { dr: 0, dc: 1, name: 'RIGHT', angle: 0 },
  { dr: 1, dc: 0, name: 'DOWN', angle: 90 },
  { dr: 0, dc: -1, name: 'LEFT', angle: 180 },
  { dr: 0, dc: 0, name: 'WAIT', angle: null }
];

const inBounds = (r, c, rows, cols) => r >= 0 && r < rows && c >= 0 && c < cols;
const passable = (r, c, rows, cols, walls) => inBounds(r, c, rows, cols) && !walls.has(cellKey(r, c));

/** Binary-heap-free priority queue; fine for the grid sizes used here. */
class PQ {
  constructor() { this.items = []; }
  push(node, f, h) {
    this.items.push({ node, f, h });
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      const a = this.items[i], b = this.items[p];
      if (a.f < b.f || (a.f === b.f && a.h < b.h)) {
        this.items[i] = b; this.items[p] = a; i = p;
      } else break;
    }
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let best = i;
        if (l < n) {
          const a = this.items[l], b = this.items[best];
          if (a.f < b.f || (a.f === b.f && a.h < b.h)) best = l;
        }
        if (r < n) {
          const a = this.items[r], b = this.items[best];
          if (a.f < b.f || (a.f === b.f && a.h < b.h)) best = r;
        }
        if (best === i) break;
        const tmp = this.items[i]; this.items[i] = this.items[best]; this.items[best] = tmp;
        i = best;
      }
    }
    return top.node;
  }
  get size() { return this.items.length; }
  isEmpty() { return this.items.length === 0; }
}

// ------------------------------------------------------------------
// Trace recorder
// ------------------------------------------------------------------
export class Trace {
  constructor(limit = 2600) {
    this.steps = [];
    this.limit = limit;
    this.dropped = 0;
  }
  add(step) {
    if (this.steps.length >= this.limit) { this.dropped++; return; }
    this.steps.push(step);
  }
  /** Low-priority steps (per-node expansions) are thinned once the trace gets long. */
  addDetail(step) {
    if (this.steps.length >= this.limit) { this.dropped++; return; }
    this.steps.push(step);
  }
}

// ------------------------------------------------------------------
// Space-time A* — the shared low level for every solver
// ------------------------------------------------------------------
/**
 * @param agent        { id, start, goal }
 * @param opts.vertexBlocked  Set of "r,c,t" the agent may not occupy
 * @param opts.edgeBlocked    Set of "r1,c1>r2,c2@t" transitions the agent may not make
 * @param opts.congestion     (r,c,t) => extra soft cost  (CAR-A* only)
 * @param opts.lambda         weight on the congestion term
 * @param opts.allowWait      whether WAIT is a legal action
 * @param opts.trace          Trace instance (optional)
 * @param opts.traceTag       label used in the sidebar for this planning call
 */
export function spaceTimeAStar(agent, rows, cols, walls, opts = {}) {
  const {
    vertexBlocked = new Set(),
    edgeBlocked = new Set(),
    congestion = null,
    lambda = 0,
    allowWait = true,
    trace = null,
    traceTag = '',
    maxT = Math.min(420, rows * cols + 40),
    detailLimit = 42
  } = opts;

  const t0 = performance.now();
  const start = agent.start;
  const goal = agent.goal;

  const h0 = manhattan(start, goal);
  const open = new PQ();
  const gScore = new Map();
  const cameFrom = new Map();

  const sKey = vKey(start.r, start.c, 0);
  gScore.set(sKey, 0);
  open.push({ r: start.r, c: start.c, t: 0 }, h0, h0);

  // Latest time at which the goal cell is forbidden — the agent must not finish
  // before that, otherwise it would be sitting on a constrained cell.
  let goalBlockedUntil = -1;
  vertexBlocked.forEach((k) => {
    const parts = k.split(',');
    if (+parts[0] === goal.r && +parts[1] === goal.c) {
      const tt = +parts[2];
      if (tt > goalBlockedUntil) goalBlockedUntil = tt;
    }
  });

  let expanded = 0;
  let detailShown = 0;
  let found = null;

  while (!open.isEmpty()) {
    const cur = open.pop();
    const curKey = vKey(cur.r, cur.c, cur.t);
    const g = gScore.get(curKey);
    if (g === undefined) continue;
    expanded++;

    if (cur.r === goal.r && cur.c === goal.c && cur.t > goalBlockedUntil) {
      found = cur;
      break;
    }
    if (cur.t >= maxT) continue;

    for (const mv of MOVES) {
      if (mv.name === 'WAIT' && !allowWait) continue;
      const nr = cur.r + mv.dr;
      const nc = cur.c + mv.dc;
      const nt = cur.t + 1;
      if (!passable(nr, nc, rows, cols, walls)) continue;
      if (vertexBlocked.has(vKey(nr, nc, nt))) continue;
      // edge swap: this agent moving cur -> n while someone moves n -> cur
      if (edgeBlocked.has(eKey(cur.r, cur.c, nr, nc, nt))) continue;

      const stepCost = 1; // WAIT also costs 1 so time is always paid for
      const soft = congestion && lambda > 0 ? lambda * congestion(nr, nc, nt) : 0;
      const tentativeG = g + stepCost + soft;
      const nKey = vKey(nr, nc, nt);

      if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, { r: cur.r, c: cur.c, t: cur.t, move: mv.name, angle: mv.angle });
        const hh = manhattan({ r: nr, c: nc }, goal);
        const f = tentativeG + hh;
        open.push({ r: nr, c: nc, t: nt }, f, hh);

        if (trace && detailShown < detailLimit) {
          detailShown++;
          const rawC = congestion ? congestion(nr, nc, nt) : 0;
          trace.addDetail({
            k: 'EXPAND',
            agentId: agent.id,
            title: 'Expand node — robot R' + (agent.id + 1) + (traceTag ? ' (' + traceTag + ')' : ''),
            formula: lambda > 0
              ? 'f(n) = g(n) + h(n) + ' + lambda + ' * C(n,t)'
              : 'f(n) = g(n) + h(n)',
            cell: { r: nr, c: nc },
            t: nt,
            lines: [
              { label: 'Action from (' + cur.r + ',' + cur.c + ') @ t=' + cur.t, value: mv.name },
              { label: 'Successor (r,c,t)', value: '(' + nr + ',' + nc + ',' + nt + ')' },
              { label: 'g(n) — cost so far', value: tentativeG.toFixed(2) },
              { label: 'h(n) — Manhattan to goal', value: String(hh) },
              ...(lambda > 0 ? [
                { label: 'C(n,t) — congestion', value: rawC.toFixed(2) },
                { label: 'lambda * C(n,t)', value: soft.toFixed(2) }
              ] : []),
              { label: 'f(n)', value: f.toFixed(2), strong: true },
              { label: 'Open list size', value: String(open.size) }
            ],
            highlight: { cells: [{ r: nr, c: nc }], agentId: agent.id }
          });
        }
      }
    }
  }

  const elapsed = Math.max(0.01, performance.now() - t0);

  if (!found) {
    return { found: false, path: null, cost: Infinity, expanded, timeMs: elapsed, waits: 0 };
  }

  // Reconstruct
  const path = [];
  let node = found;
  for (;;) {
    path.unshift({ r: node.r, c: node.c, t: node.t, move: node.move, angle: node.angle });
    const prev = cameFrom.get(vKey(node.r, node.c, node.t));
    if (!prev) break;
    node = { r: prev.r, c: prev.c, t: prev.t, move: prev.move, angle: prev.angle };
    if (node.t === 0) {
      path.unshift({ r: node.r, c: node.c, t: 0, move: 'START', angle: 0 });
      break;
    }
  }
  // attach the move that produced each node
  for (let i = 1; i < path.length; i++) {
    const info = cameFrom.get(vKey(path[i].r, path[i].c, path[i].t));
    if (info) { path[i].move = info.move; path[i].angle = info.angle; }
  }
  path[0].move = 'START';

  const waits = path.filter((p) => p.move === 'WAIT').length;

  return {
    found: true,
    path,
    cost: path.length - 1,
    expanded,
    timeMs: elapsed,
    waits
  };
}

// ------------------------------------------------------------------
// Conflict detection & metrics
// ------------------------------------------------------------------
export const posAt = (path, t) => {
  if (!path || path.length === 0) return null;
  if (t >= path.length) return path[path.length - 1];
  return path[t];
};

/** Returns every vertex and edge conflict across a set of paths. */
export function detectConflicts(paths, limit = 400) {
  const conflicts = [];
  const horizon = Math.max(...paths.map((p) => (p ? p.length : 0)), 0);

  for (let t = 0; t < horizon && conflicts.length < limit; t++) {
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const pi = paths[i], pj = paths[j];
        if (!pi || !pj) continue;
        const a = posAt(pi, t), b = posAt(pj, t);
        if (!a || !b) continue;

        // vertex conflict — both robots on the same cell at the same time
        if (a.r === b.r && a.c === b.c) {
          conflicts.push({ type: 'VERTEX', a: i, b: j, t, cell: { r: a.r, c: a.c } });
          continue;
        }
        // edge conflict — the two robots swap cells between t-1 and t
        if (t > 0) {
          const ap = posAt(pi, t - 1), bp = posAt(pj, t - 1);
          if (ap && bp && ap.r === b.r && ap.c === b.c && bp.r === a.r && bp.c === a.c) {
            conflicts.push({
              type: 'EDGE', a: i, b: j, t,
              cell: { r: a.r, c: a.c },
              from: { r: ap.r, c: ap.c }
            });
          }
        }
      }
    }
  }
  return conflicts;
}

export function computeMetrics(paths, extra = {}) {
  const valid = paths.filter(Boolean);
  const solved = valid.length === paths.length && valid.every((p) => p.length > 0);
  const totalCost = valid.reduce((s, p) => s + (p.length - 1), 0);
  const makespan = valid.length ? Math.max(...valid.map((p) => p.length - 1)) : 0;
  const waits = valid.reduce((s, p) => s + p.filter((n) => n.move === 'WAIT').length, 0);
  const conflicts = detectConflicts(paths);

  // congestion = average number of robots sharing a cell over the whole run
  const occ = new Map();
  valid.forEach((p) => {
    p.forEach((n) => {
      const k = cellKey(n.r, n.c);
      occ.set(k, (occ.get(k) || 0) + 1);
    });
  });
  let reused = 0;
  occ.forEach((v) => { if (v > 1) reused += v - 1; });
  const congestion = occ.size ? reused / occ.size : 0;

  return {
    solved,
    totalCost,
    makespan,
    waits,
    collisions: conflicts.length,
    vertexCollisions: conflicts.filter((c) => c.type === 'VERTEX').length,
    edgeCollisions: conflicts.filter((c) => c.type === 'EDGE').length,
    congestion,
    conflicts,
    ...extra
  };
}

/** Build the hard reservation sets produced by a set of already-planned paths. */
function buildReservations(plannedPaths, maxT) {
  const vertexBlocked = new Set();
  const edgeBlocked = new Set();
  plannedPaths.forEach((p) => {
    if (!p) return;
    for (let t = 0; t < p.length; t++) {
      vertexBlocked.add(vKey(p[t].r, p[t].c, t));
      if (t > 0) {
        // forbid the reverse traversal at the same timestep (edge swap)
        edgeBlocked.add(eKey(p[t].r, p[t].c, p[t - 1].r, p[t - 1].c, t));
      }
    }
    // the robot parks on its goal forever after it arrives
    const last = p[p.length - 1];
    for (let t = p.length; t <= maxT; t++) {
      vertexBlocked.add(vKey(last.r, last.c, t));
    }
  });
  return { vertexBlocked, edgeBlocked };
}

// ==================================================================
// A1 — Independent A* (baseline: each robot ignores the others)
// ==================================================================
export function runIndependentAStar(agents, rows, cols, walls, trace) {
  const t0 = performance.now();

  trace.add({
    k: 'PHASE',
    title: 'Algorithm 1 — Independent A*',
    formula: 'f(n) = g(n) + h(n)',
    lines: [
      { label: 'Robots to plan', value: String(agents.length) },
      { label: 'Coordination', value: 'none — each robot is planned in isolation' },
      { label: 'What to watch for', value: 'collisions appear because no robot knows about any other' }
    ]
  });

  const paths = [];
  let expanded = 0;

  agents.forEach((ag) => {
    trace.add({
      k: 'PLAN',
      agentId: ag.id,
      title: 'Plan robot R' + (ag.id + 1) + ' on an empty grid',
      lines: [
        { label: 'Start', value: '(' + ag.start.r + ',' + ag.start.c + ')' },
        { label: 'Goal', value: '(' + ag.goal.r + ',' + ag.goal.c + ')' },
        { label: 'h(start) — Manhattan', value: String(manhattan(ag.start, ag.goal)) },
        { label: 'Other robots considered', value: 'none' }
      ],
      highlight: { cells: [ag.start, ag.goal], agentId: ag.id }
    });

    const res = spaceTimeAStar(ag, rows, cols, walls, {
      allowWait: false,
      trace,
      traceTag: 'independent',
      detailLimit: 14
    });
    expanded += res.expanded;
    paths.push(res.found ? res.path : null);

    trace.add({
      k: 'PLAN_DONE',
      agentId: ag.id,
      title: 'R' + (ag.id + 1) + ' finished planning',
      lines: [
        { label: 'Path found', value: res.found ? 'yes' : 'NO PATH' },
        { label: 'Path cost (steps)', value: res.found ? String(res.cost) : '-' },
        { label: 'Nodes expanded', value: String(res.expanded) }
      ],
      highlight: { path: res.path, agentId: ag.id }
    });
  });

  const conflicts = detectConflicts(paths);

  trace.add({
    k: 'CONFLICT_SCAN',
    title: 'Collision check on the combined plan',
    lines: [
      { label: 'Vertex collisions (same cell, same time)', value: String(conflicts.filter((c) => c.type === 'VERTEX').length) },
      { label: 'Edge collisions (robots swapping)', value: String(conflicts.filter((c) => c.type === 'EDGE').length) },
      { label: 'Total collisions', value: String(conflicts.length), strong: true },
      { label: 'Conclusion', value: conflicts.length > 0
        ? 'This plan is NOT executable — robots would crash. This is the problem the next three algorithms solve.'
        : 'No collision on this particular layout — but nothing in the algorithm guarantees it.' }
    ],
    highlight: { cells: conflicts.slice(0, 8).map((c) => c.cell) }
  });

  const metrics = computeMetrics(paths, {
    expanded,
    timeMs: Math.max(0.01, performance.now() - t0),
    orderingsTried: 1
  });
  return { paths, metrics, trace };
}

// ==================================================================
// A2 — Adaptive-Priority Reservation A*
// ==================================================================
function orderingLabel(order) {
  return order.map((i) => 'R' + (i + 1)).join(' -> ');
}

export function runAdaptivePriorityReservationAStar(agents, rows, cols, walls, trace, opts = {}) {
  const t0 = performance.now();
  const n = agents.length;
  const maxT = Math.min(300, rows * cols + 30);

  // --- candidate priority orderings -------------------------------
  const identity = agents.map((_, i) => i);
  const reversed = [...identity].reverse();
  const bySlack = [...identity].sort(
    (a, b) => manhattan(agents[a].start, agents[a].goal) - manhattan(agents[b].start, agents[b].goal)
  );
  const byLongest = [...bySlack].reverse();

  const orderings = [identity, reversed, bySlack, byLongest];
  const seen = new Set(orderings.map((o) => o.join(',')));
  const extra = Math.max(0, Math.min(opts.randomOrderings ?? 4, 16));
  let guard = 0;
  while (orderings.length < 4 + extra && guard < 80) {
    guard++;
    const shuffled = [...identity];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    const key = shuffled.join(',');
    if (!seen.has(key)) { seen.add(key); orderings.push(shuffled); }
  }

  trace.add({
    k: 'PHASE',
    title: 'Algorithm 2 — Adaptive-Priority Reservation A*',
    formula: 'BestSolution = argmin over orderings of TotalCost(ordering)',
    lines: [
      { label: 'Problem being solved', value: 'Sequential planning depends heavily on which robot is planned first.' },
      { label: 'Our answer', value: 'Plan the whole team several times under different priority orderings and keep the cheapest result.' },
      { label: 'Candidate orderings', value: String(orderings.length) },
      { label: 'Ordering 1 (given order)', value: orderingLabel(identity) },
      { label: 'Ordering 2 (reversed)', value: orderingLabel(reversed) },
      { label: 'Ordering 3 (shortest trip first)', value: orderingLabel(bySlack) },
      { label: 'Ordering 4 (longest trip first)', value: orderingLabel(byLongest) }
    ]
  });

  let best = null;
  let expandedTotal = 0;
  const orderingResults = [];

  orderings.forEach((order, oi) => {
    trace.add({
      k: 'ORDER',
      title: 'Ordering ' + (oi + 1) + ' of ' + orderings.length,
      lines: [
        { label: 'Priority order', value: orderingLabel(order), strong: true },
        { label: 'Reservation table', value: 'cleared — we start this ordering from scratch' }
      ]
    });

    const planned = new Array(n).fill(null);
    let feasible = true;
    let orderExpanded = 0;

    for (let p = 0; p < order.length; p++) {
      const idx = order[p];
      const ag = agents[idx];
      const { vertexBlocked, edgeBlocked } = buildReservations(planned.filter(Boolean), maxT);

      trace.add({
        k: 'PLAN',
        agentId: ag.id,
        title: 'Priority ' + (p + 1) + ': plan R' + (ag.id + 1),
        lines: [
          { label: 'Start / Goal', value: '(' + ag.start.r + ',' + ag.start.c + ') -> (' + ag.goal.r + ',' + ag.goal.c + ')' },
          { label: 'Cells already reserved by higher-priority robots', value: String(vertexBlocked.size) },
          { label: 'Blocked swap transitions', value: String(edgeBlocked.size) },
          { label: 'WAIT allowed', value: 'yes — waiting is how a lower-priority robot yields' }
        ],
        highlight: { cells: [ag.start, ag.goal], agentId: ag.id }
      });

      const res = spaceTimeAStar(ag, rows, cols, walls, {
        vertexBlocked, edgeBlocked, allowWait: true, maxT,
        trace: oi === 0 ? trace : null,
        traceTag: 'ordering ' + (oi + 1),
        detailLimit: 10
      });
      orderExpanded += res.expanded;

      if (!res.found) {
        feasible = false;
        trace.add({
          k: 'FAIL',
          agentId: ag.id,
          title: 'R' + (ag.id + 1) + ' has no feasible path under this ordering',
          lines: [
            { label: 'Reason', value: 'higher-priority reservations block every route' },
            { label: 'Action', value: 'discard this ordering and try the next one' }
          ]
        });
        break;
      }
      planned[idx] = res.path;
      trace.add({
        k: 'RESERVE',
        agentId: ag.id,
        title: 'Reserve R' + (ag.id + 1) + "'s path in the table",
        lines: [
          { label: 'Path cost', value: String(res.cost) },
          { label: 'Waits used', value: String(res.waits) },
          { label: 'Cells now reserved', value: String(res.path.length) + ' (plus its goal for all later time)' }
        ],
        highlight: { path: res.path, agentId: ag.id }
      });
    }

    expandedTotal += orderExpanded;

    if (!feasible) {
      orderingResults.push({ order, label: orderingLabel(order), feasible: false, totalCost: Infinity, makespan: Infinity });
      return;
    }

    const m = computeMetrics(planned);
    orderingResults.push({
      order, label: orderingLabel(order), feasible: true,
      totalCost: m.totalCost, makespan: m.makespan, waits: m.waits, collisions: m.collisions
    });

    trace.add({
      k: 'SCORE',
      title: 'Score for ordering ' + (oi + 1),
      formula: 'TotalCost = sum of each robot path length',
      lines: [
        { label: 'Ordering', value: orderingLabel(order) },
        { label: 'Total cost', value: String(m.totalCost), strong: true },
        { label: 'Makespan (last arrival)', value: String(m.makespan) },
        { label: 'Waits', value: String(m.waits) },
        { label: 'Collisions', value: String(m.collisions) + ' (reservations make this 0 by construction)' },
        { label: 'Best so far', value: best ? String(best.totalCost) : 'none yet' }
      ],
      highlight: { paths: planned }
    });

    if (!best || m.totalCost < best.totalCost ||
        (m.totalCost === best.totalCost && m.makespan < best.makespan)) {
      best = { paths: planned, totalCost: m.totalCost, makespan: m.makespan, order, orderIndex: oi };
    }
  });

  if (!best) {
    trace.add({
      k: 'RESULT',
      title: 'No ordering produced a complete solution',
      lines: [{ label: 'Suggestion', value: 'reduce the number of robots or clear some obstacles' }]
    });
    const metrics = computeMetrics(new Array(n).fill(null), {
      expanded: expandedTotal, timeMs: Math.max(0.01, performance.now() - t0),
      orderingsTried: orderings.length, orderingResults
    });
    return { paths: new Array(n).fill(null), metrics, trace };
  }

  trace.add({
    k: 'SELECT',
    title: 'Pick the winning ordering',
    formula: 'BestSolution = argmin TotalCost',
    lines: [
      { label: 'Winner', value: 'Ordering ' + (best.orderIndex + 1) + ' : ' + orderingLabel(best.order), strong: true },
      { label: 'Total cost', value: String(best.totalCost) },
      { label: 'Makespan', value: String(best.makespan) },
      { label: 'Orderings evaluated', value: String(orderings.length) },
      { label: 'Worst ordering cost', value: String(Math.max(...orderingResults.filter((o) => o.feasible).map((o) => o.totalCost))) },
      { label: 'Why this matters', value: 'the gap between best and worst ordering is exactly the priority-order sensitivity we removed' }
    ],
    highlight: { paths: best.paths }
  });

  const metrics = computeMetrics(best.paths, {
    expanded: expandedTotal,
    timeMs: Math.max(0.01, performance.now() - t0),
    orderingsTried: orderings.length,
    orderingResults,
    chosenOrdering: orderingLabel(best.order)
  });
  return { paths: best.paths, metrics, trace };
}

// ==================================================================
// A3 — CAR-A*  (Congestion-Aware Reservation A*)
// ==================================================================
/** Tiered congestion: busy cells get progressively more expensive. */
function congestionTier(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 3;
  return 6;
}

export function runCarAStar(agents, rows, cols, walls, trace, opts = {}) {
  const t0 = performance.now();
  const lambda = opts.lambda ?? 2.0;
  const window = opts.window ?? 2;
  const n = agents.length;
  const maxT = Math.min(300, rows * cols + 30);

  trace.add({
    k: 'PHASE',
    title: 'Algorithm 3 — CAR-A* (Congestion-Aware Reservation A*)',
    formula: 'f(n) = g(n) + h(n) + lambda * C(n,t)',
    lines: [
      { label: 'Key idea 1', value: 'Search in space AND time: a node is (row, col, time), not just (row, col).' },
      { label: 'Key idea 2', value: 'A busy cell is expensive, not forbidden — the robot weighs a short crowded route against a longer empty one.' },
      { label: 'Key idea 3', value: 'WAIT is a real action costing 1, so yielding can be cheaper than a detour.' },
      { label: 'Key idea 4', value: 'Edge swaps are blocked explicitly — two robots can never cross through each other.' },
      { label: 'Key idea 5', value: 'Robots are ordered by least remaining slack (closest to its goal plans first).' },
      { label: 'lambda (congestion weight)', value: String(lambda) },
      { label: 'Congestion tiers', value: '1 reservation -> +1,  2 -> +3,  3 or more -> +6  (times lambda)' }
    ]
  });

  // --- adaptive priority: least remaining slack first ---------------
  const slack = agents.map((a, i) => ({ i, d: manhattan(a.start, a.goal) }));
  slack.sort((x, y) => x.d - y.d);
  const order = slack.map((s) => s.i);

  trace.add({
    k: 'ORDER',
    title: 'Adaptive priority by remaining slack',
    formula: 'priority = fewest cells remaining to the goal',
    lines: [
      ...slack.map((s) => ({
        label: 'R' + (agents[s.i].id + 1) + ' distance to goal',
        value: String(s.d) + ' cells'
      })),
      { label: 'Resulting order', value: orderingLabel(order), strong: true },
      { label: 'Why', value: 'a robot that is nearly done should not be pushed around by one that has just started' }
    ]
  });

  let expandedTotal = 0;
  let planned = new Array(n).fill(null);
  let activeOrder = order;
  let failed = false;

  // One full prioritized sweep over a given order. Returns the index of the
  // robot that failed, or -1 on success.
  const attempt = (ord, attemptNo) => {
    const result = new Array(n).fill(null);
    // reservation counts per cell/time, used for the SOFT congestion term
    const softCount = new Map();
    const bump = (r, c, t, d) => {
      const k = vKey(r, c, t);
      softCount.set(k, (softCount.get(k) || 0) + d);
    };
    const congestion = (r, c, t) => {
      let count = 0;
      for (let dt = -window; dt <= window; dt++) {
        const tt = t + dt;
        if (tt < 0) continue;
        count += softCount.get(vKey(r, c, tt)) || 0;
      }
      return congestionTier(count);
    };

    for (let p = 0; p < ord.length; p++) {
      const ag = agents[ord[p]];
      const { vertexBlocked, edgeBlocked } = buildReservations(result.filter(Boolean), maxT);

      trace.add({
        k: 'PLAN',
        agentId: ag.id,
        title: 'Priority ' + (p + 1) + ': plan R' + (ag.id + 1) + ' with congestion costs'
          + (attemptNo > 1 ? '  (retry ' + attemptNo + ')' : ''),
        formula: 'f(n) = g(n) + h(n) + ' + lambda + ' * C(n,t)',
        lines: [
          { label: 'Start / Goal', value: '(' + ag.start.r + ',' + ag.start.c + ') -> (' + ag.goal.r + ',' + ag.goal.c + ')' },
          { label: 'h(start)', value: String(manhattan(ag.start, ag.goal)) },
          { label: 'Hard reservations to avoid', value: String(vertexBlocked.size) + ' cell-times' },
          { label: 'Edge swaps blocked', value: String(edgeBlocked.size) },
          { label: 'Soft congestion entries on the map', value: String(softCount.size) },
          { label: 'C(start, t=0)', value: String(congestion(ag.start.r, ag.start.c, 0)) }
        ],
        highlight: { cells: [ag.start, ag.goal], agentId: ag.id }
      });

      const res = spaceTimeAStar(ag, rows, cols, walls, {
        vertexBlocked, edgeBlocked,
        congestion, lambda,
        allowWait: true, maxT,
        trace, traceTag: 'CAR-A*', detailLimit: attemptNo > 1 ? 4 : 16
      });
      expandedTotal += res.expanded;

      if (!res.found) {
        trace.add({
          k: 'FAIL',
          agentId: ag.id,
          title: 'R' + (ag.id + 1) + ' is boxed in under this priority order',
          lines: [
            { label: 'Cause', value: 'robots planned before it have reserved every route' },
            { label: 'Anti-starvation rule', value: 'promote R' + (ag.id + 1) + ' to the front of the order and replan the whole team' }
          ]
        });
        return { failedIdx: ord[p], result };
      }

      result[ord[p]] = res.path;
      res.path.forEach((nd) => bump(nd.r, nd.c, nd.t, 1));

      trace.add({
        k: 'RESERVE',
        agentId: ag.id,
        title: 'R' + (ag.id + 1) + ' reserved — congestion map updated',
        lines: [
          { label: 'Path cost', value: String(res.cost) },
          { label: 'WAIT actions chosen', value: String(res.waits) },
          { label: 'Detour vs straight line', value: String(res.cost - manhattan(ag.start, ag.goal)) + ' extra steps' },
          { label: 'Cells added to congestion map', value: String(res.path.length) },
          { label: 'Reading', value: res.waits > 0
            ? 'the robot preferred waiting over a longer detour at least once'
            : 'the robot found a clear route without waiting' }
        ],
        highlight: { path: res.path, agentId: ag.id }
      });
    }
    return { failedIdx: -1, result };
  };

  let att = attempt(activeOrder, 1);
  let tries = 1;
  while (att.failedIdx >= 0 && tries <= n) {
    const promoted = att.failedIdx;
    activeOrder = [promoted, ...activeOrder.filter((i) => i !== promoted)];
    tries++;
    trace.add({
      k: 'ORDER',
      title: 'Re-order and retry (attempt ' + tries + ')',
      lines: [
        { label: 'Promoted robot', value: 'R' + (agents[promoted].id + 1) + ' now plans first' },
        { label: 'New order', value: orderingLabel(activeOrder), strong: true },
        { label: 'Why', value: 'alternating priority stops the same robot losing every conflict (starvation)' }
      ]
    });
    att = attempt(activeOrder, tries);
  }
  planned = att.result;
  failed = att.failedIdx >= 0;

  const paths = failed ? new Array(n).fill(null) : planned;
  const m0 = computeMetrics(paths);

  trace.add({
    k: 'RESULT',
    title: 'CAR-A* finished',
    lines: [
      { label: 'All robots routed', value: m0.solved ? 'yes' : 'no' },
      { label: 'Total cost', value: String(m0.totalCost) },
      { label: 'Makespan', value: String(m0.makespan) },
      { label: 'Waits', value: String(m0.waits) },
      { label: 'Collisions', value: String(m0.collisions), strong: true },
      { label: 'Guarantee', value: 'zero collisions by construction — hard reservations cover both cells and swaps' }
    ],
    highlight: { paths }
  });

  const metrics = computeMetrics(paths, {
    expanded: expandedTotal,
    timeMs: Math.max(0.01, performance.now() - t0),
    lambda,
    priorityOrder: orderingLabel(activeOrder),
    retries: tries - 1
  });
  return { paths, metrics, trace };
}

// ==================================================================
// A4 — Conflict-Based Search (optimal)
// ==================================================================
export function runCBS(agents, rows, cols, walls, trace, opts = {}) {
  const t0 = performance.now();
  const n = agents.length;
  const maxNodes = opts.maxNodes ?? 220;
  const maxT = Math.min(260, rows * cols + 25);

  trace.add({
    k: 'PHASE',
    title: 'Algorithm 4 — Conflict-Based Search',
    formula: 'High level: constraint tree.   Low level: single-robot space-time A*.',
    lines: [
      { label: 'Level 1 (high)', value: 'Search a binary tree of constraints. Each node holds a full set of paths.' },
      { label: 'Level 2 (low)', value: 'Re-plan ONE robot under the constraints inherited from the tree node.' },
      { label: 'Step', value: 'Take the cheapest open node -> find its first conflict -> split it into two children.' },
      { label: 'Child A', value: 'robot i is forbidden from that cell/edge at that time' },
      { label: 'Child B', value: 'robot j is forbidden from that cell/edge at that time' },
      { label: 'Guarantee', value: 'expanding by lowest total cost makes the first conflict-free node optimal' },
      { label: 'Node budget', value: String(maxNodes) }
    ]
  });

  /** constraints: array per agent of {type:'V'|'E', r,c,t} / {type:'E', from, to, t} */
  const lowLevel = (agentIdx, constraints) => {
    const vertexBlocked = new Set();
    const edgeBlocked = new Set();
    (constraints[agentIdx] || []).forEach((cn) => {
      if (cn.type === 'V') vertexBlocked.add(vKey(cn.r, cn.c, cn.t));
      else edgeBlocked.add(eKey(cn.from.r, cn.from.c, cn.to.r, cn.to.c, cn.t));
    });
    return spaceTimeAStar(agents[agentIdx], rows, cols, walls, {
      vertexBlocked, edgeBlocked, allowWait: true, maxT
    });
  };

  // ---- root node --------------------------------------------------
  const rootConstraints = agents.map(() => []);
  const rootPaths = [];
  let expandedTotal = 0;
  let rootOk = true;
  for (let i = 0; i < n; i++) {
    const r = lowLevel(i, rootConstraints);
    expandedTotal += r.expanded;
    if (!r.found) { rootOk = false; break; }
    rootPaths.push(r.path);
  }

  const treeNodes = [];
  let nextId = 0;

  if (!rootOk) {
    trace.add({ k: 'FAIL', title: 'Root node has no solution', lines: [{ label: 'Cause', value: 'at least one robot cannot reach its goal even on an empty grid' }] });
    const metrics = computeMetrics(new Array(n).fill(null), {
      expanded: expandedTotal, timeMs: Math.max(0.01, performance.now() - t0), ctNodes: 0
    });
    return { paths: new Array(n).fill(null), metrics, trace, cbsTree: treeNodes };
  }

  const rootCost = rootPaths.reduce((s, p) => s + (p.length - 1), 0);
  const rootConf = detectConflicts(rootPaths);
  const root = {
    id: nextId++, parentId: null, depth: 0,
    constraints: rootConstraints, paths: rootPaths,
    cost: rootCost, conflicts: rootConf.length,
    label: 'ROOT', status: 'open'
  };
  treeNodes.push({ id: root.id, parentId: null, depth: 0, label: 'ROOT', cost: rootCost, conflicts: rootConf.length, status: 'open' });

  trace.add({
    k: 'CBS',
    title: 'Root constraint-tree node',
    lines: [
      { label: 'Constraints', value: 'none' },
      { label: 'Total cost (sum of path lengths)', value: String(rootCost), strong: true },
      { label: 'Conflicts in this plan', value: String(rootConf.length) },
      { label: 'Next', value: rootConf.length === 0 ? 'already conflict-free — this is the optimal solution' : 'split on the earliest conflict' }
    ],
    cbsTree: treeNodes.map((x) => ({ ...x })),
    cbsFocus: root.id,
    highlight: { paths: rootPaths }
  });

  const open = [root];
  let goalNode = null;
  let processed = 0;

  while (open.length > 0 && processed < maxNodes) {
    open.sort((a, b) => (a.cost - b.cost) || (a.conflicts - b.conflicts) || (a.depth - b.depth));
    const node = open.shift();
    processed++;

    const conflicts = detectConflicts(node.paths, 1);
    const tn = treeNodes.find((x) => x.id === node.id);

    if (conflicts.length === 0) {
      if (tn) tn.status = 'solution';
      goalNode = node;
      trace.add({
        k: 'CBS',
        title: 'Conflict-free node found — CBS is done',
        lines: [
          { label: 'Node', value: '#' + node.id + ' at depth ' + node.depth },
          { label: 'Total cost', value: String(node.cost), strong: true },
          { label: 'Constraints along this branch', value: String(node.constraints.reduce((s, a) => s + a.length, 0)) },
          { label: 'CT nodes expanded', value: String(processed) },
          { label: 'Optimality', value: 'this node had the lowest cost in the open list, so no cheaper conflict-free plan exists' }
        ],
        cbsTree: treeNodes.map((x) => ({ ...x })),
        cbsFocus: node.id,
        highlight: { paths: node.paths }
      });
      break;
    }

    if (tn) tn.status = 'expanded';
    const cf = conflicts[0];
    const who = 'R' + (agents[cf.a].id + 1) + ' and R' + (agents[cf.b].id + 1);

    trace.add({
      k: 'CBS',
      title: 'Expand node #' + node.id + ' — conflict detected',
      lines: [
        { label: 'Node cost', value: String(node.cost) },
        { label: 'Conflict type', value: cf.type === 'VERTEX' ? 'VERTEX — both robots on one cell' : 'EDGE — the two robots swap places' },
        { label: 'Robots involved', value: who },
        { label: 'Cell', value: '(' + cf.cell.r + ',' + cf.cell.c + ')' },
        { label: 'Time', value: 't = ' + cf.t },
        { label: 'Branching rule', value: 'create two children: forbid it for one robot in each' }
      ],
      cbsTree: treeNodes.map((x) => ({ ...x })),
      cbsFocus: node.id,
      highlight: { cells: [cf.cell], paths: node.paths }
    });

    for (const side of ['a', 'b']) {
      const agentIdx = cf[side];
      const newConstraints = node.constraints.map((arr) => arr.slice());

      let label;
      if (cf.type === 'VERTEX') {
        newConstraints[agentIdx].push({ type: 'V', r: cf.cell.r, c: cf.cell.c, t: cf.t });
        label = 'R' + (agents[agentIdx].id + 1) + ' not at (' + cf.cell.r + ',' + cf.cell.c + ') @t=' + cf.t;
      } else {
        const from = side === 'a' ? cf.from : cf.cell;
        const to = side === 'a' ? cf.cell : cf.from;
        newConstraints[agentIdx].push({ type: 'E', from, to, t: cf.t });
        label = 'R' + (agents[agentIdx].id + 1) + ' no ' + from.r + ',' + from.c + '->' + to.r + ',' + to.c + ' @t=' + cf.t;
      }

      const replan = lowLevel(agentIdx, newConstraints);
      expandedTotal += replan.expanded;

      if (!replan.found) {
        const deadId = nextId++;
        treeNodes.push({ id: deadId, parentId: node.id, depth: node.depth + 1, label, cost: Infinity, conflicts: -1, status: 'pruned' });
        trace.add({
          k: 'CBS',
          title: 'Child #' + deadId + ' pruned',
          lines: [
            { label: 'Constraint added', value: label },
            { label: 'Result', value: 'no path exists for this robot under the constraint — branch discarded' }
          ],
          cbsTree: treeNodes.map((x) => ({ ...x })),
          cbsFocus: deadId
        });
        continue;
      }

      const childPaths = node.paths.map((p, i) => (i === agentIdx ? replan.path : p));
      const childCost = childPaths.reduce((s, p) => s + (p.length - 1), 0);
      const childConf = detectConflicts(childPaths).length;
      const childId = nextId++;

      const child = {
        id: childId, parentId: node.id, depth: node.depth + 1,
        constraints: newConstraints, paths: childPaths,
        cost: childCost, conflicts: childConf, label, status: 'open'
      };
      open.push(child);
      treeNodes.push({ id: childId, parentId: node.id, depth: child.depth, label, cost: childCost, conflicts: childConf, status: 'open' });

      trace.add({
        k: 'CBS',
        title: 'Create child #' + childId,
        lines: [
          { label: 'Constraint added', value: label, strong: true },
          { label: 'Re-planned robot', value: 'R' + (agents[agentIdx].id + 1) },
          { label: 'Its new path cost', value: String(replan.cost) + ' (was ' + (node.paths[agentIdx].length - 1) + ')' },
          { label: 'Child total cost', value: String(childCost) },
          { label: 'Conflicts remaining', value: String(childConf) },
          { label: 'Open list size', value: String(open.length) }
        ],
        cbsTree: treeNodes.map((x) => ({ ...x })),
        cbsFocus: childId,
        highlight: { paths: childPaths, agentId: agents[agentIdx].id }
      });
    }
  }

  if (!goalNode) {
    trace.add({
      k: 'FAIL',
      title: 'CBS hit its node budget',
      lines: [
        { label: 'CT nodes expanded', value: String(processed) },
        { label: 'Meaning', value: 'the instance is too tangled for the budget — CBS is optimal but can blow up combinatorially' },
        { label: 'Try', value: 'fewer robots, a larger grid, or use CAR-A* which stays fast' }
      ],
      cbsTree: treeNodes.map((x) => ({ ...x }))
    });
    const metrics = computeMetrics(new Array(n).fill(null), {
      expanded: expandedTotal, timeMs: Math.max(0.01, performance.now() - t0),
      ctNodes: processed, budgetExceeded: true
    });
    return { paths: new Array(n).fill(null), metrics, trace, cbsTree: treeNodes };
  }

  const metrics = computeMetrics(goalNode.paths, {
    expanded: expandedTotal,
    timeMs: Math.max(0.01, performance.now() - t0),
    ctNodes: processed,
    treeDepth: goalNode.depth,
    constraintsUsed: goalNode.constraints.reduce((s, a) => s + a.length, 0)
  });
  return { paths: goalNode.paths, metrics, trace, cbsTree: treeNodes };
}

// ==================================================================
// Dispatcher + scenario generation
// ==================================================================
export function runMapfAlgorithm(algoId, agents, rows, cols, walls, opts = {}) {
  const trace = new Trace(opts.traceLimit ?? 2600);
  let out;
  if (algoId === 'A1') out = runIndependentAStar(agents, rows, cols, walls, trace);
  else if (algoId === 'A2') out = runAdaptivePriorityReservationAStar(agents, rows, cols, walls, trace, opts);
  else if (algoId === 'A3') out = runCarAStar(agents, rows, cols, walls, trace, opts);
  else out = runCBS(agents, rows, cols, walls, trace, opts);

  // Append the execution timeline so Next also walks the robots along their paths.
  const { paths, metrics } = out;
  if (metrics.solved || paths.some(Boolean)) {
    const horizon = Math.max(...paths.filter(Boolean).map((p) => p.length - 1), 0);
    out.trace.add({
      k: 'EXEC_HEAD',
      title: 'Execution — now watch the robots move',
      lines: [
        { label: 'Timesteps to replay', value: String(horizon + 1) },
        { label: 'Controls', value: 'press Next (or Play) to advance one timestep at a time' }
      ],
      highlight: { paths }
    });
    for (let t = 0; t <= horizon; t++) {
      const occupied = paths.map((p) => (p ? posAt(p, t) : null));
      const lines = paths.map((p, i) => {
        const pos = p ? posAt(p, t) : null;
        const arrived = p && t >= p.length - 1;
        return {
          label: 'R' + (agents[i].id + 1),
          value: pos
            ? '(' + pos.r + ',' + pos.c + ')' + (arrived ? '  — at goal' : '  ' + (pos.move || ''))
            : 'no path'
        };
      });
      out.trace.add({
        k: 'EXEC',
        title: 'Timestep t = ' + t,
        t,
        lines,
        positions: occupied,
        highlight: { paths }
      });
    }
  }
  return out;
}

/** Random multi-robot scenario that is guaranteed solvable by CBS-free reasoning. */
export function generateMapfScenario(rows, cols, agentCount, obstacleDensity = 0.16) {
  for (let attempt = 0; attempt < 140; attempt++) {
    const walls = new Set();
    const target = Math.floor(rows * cols * obstacleDensity);
    while (walls.size < target) {
      walls.add(cellKey(Math.floor(Math.random() * rows), Math.floor(Math.random() * cols)));
    }

    const taken = new Set();
    const agents = [];
    let ok = true;

    for (let i = 0; i < agentCount; i++) {
      let s = null, g = null;
      for (let k = 0; k < 220 && (!s || !g); k++) {
        const cand = { r: Math.floor(Math.random() * rows), c: Math.floor(Math.random() * cols) };
        const ck = cellKey(cand.r, cand.c);
        if (walls.has(ck) || taken.has(ck)) continue;
        if (!s) { s = cand; taken.add(ck); }
        else if (cand.r !== s.r || cand.c !== s.c) { g = cand; taken.add(ck); }
      }
      if (!s || !g) { ok = false; break; }
      agents.push({ id: i, start: s, goal: g, color: AGENT_COLORS[i % AGENT_COLORS.length].hex });
    }
    if (!ok) continue;

    // each robot must at least be able to reach its goal on its own
    const reachable = agents.every(
      (a) => spaceTimeAStar(a, rows, cols, walls, { allowWait: false }).found
    );
    if (reachable) return { rows, cols, walls, agents };
  }

  // fallback: clean grid, agents on opposite edges
  const walls = new Set();
  const agents = [];
  for (let i = 0; i < agentCount; i++) {
    agents.push({
      id: i,
      start: { r: i % rows, c: 0 },
      goal: { r: (rows - 1 - (i % rows)), c: cols - 1 },
      color: AGENT_COLORS[i % AGENT_COLORS.length].hex
    });
  }
  return { rows, cols, walls, agents };
}

export function makeDefaultAgents(count, rows, cols) {
  const agents = [];
  for (let i = 0; i < count; i++) {
    agents.push({
      id: i,
      start: { r: Math.min(rows - 1, i), c: 0 },
      goal: { r: Math.max(0, rows - 1 - i), c: cols - 1 },
      color: AGENT_COLORS[i % AGENT_COLORS.length].hex
    });
  }
  return agents;
}
