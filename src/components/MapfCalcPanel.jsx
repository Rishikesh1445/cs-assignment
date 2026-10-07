import React, { useMemo } from 'react';
import {
  Calculator, SkipBack, SkipForward, Play, Pause, RotateCcw,
  GitBranch, AlertTriangle, CheckCircle2, Timer, Network, Gauge, Flag
} from 'lucide-react';
import { AGENT_COLORS, MAPF_ALGORITHMS } from '../utils/mapf';

const STEP_KIND_META = {
  PHASE:         { label: 'Setup',        color: '#8b5cf6' },
  ORDER:         { label: 'Priority',     color: '#f59e0b' },
  PLAN:          { label: 'Planning',     color: '#3b82f6' },
  EXPAND:        { label: 'A* expand',    color: '#06b6d4' },
  RESERVE:       { label: 'Reserve',      color: '#10b981' },
  SCORE:         { label: 'Score',        color: '#f59e0b' },
  SELECT:        { label: 'Select best',  color: '#10b981' },
  PLAN_DONE:     { label: 'Done',         color: '#64748b' },
  CONFLICT_SCAN: { label: 'Collisions',   color: '#ef4444' },
  CBS:           { label: 'CBS tree',     color: '#8b5cf6' },
  FAIL:          { label: 'Failure',      color: '#ef4444' },
  RESULT:        { label: 'Result',       color: '#10b981' },
  EXEC_HEAD:     { label: 'Execution',    color: '#3b82f6' },
  EXEC:          { label: 'Timestep',     color: '#3b82f6' }
};

/** Render the CBS constraint tree as an indented, colour-coded tree. */
const CbsTree = ({ nodes, focusId }) => {
  const byParent = useMemo(() => {
    const m = new Map();
    nodes.forEach((n) => {
      const k = n.parentId === null || n.parentId === undefined ? 'root' : n.parentId;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(n);
    });
    return m;
  }, [nodes]);

  const roots = nodes.filter((n) => n.parentId === null || n.parentId === undefined);

  const renderNode = (node, depth) => {
    const kids = byParent.get(node.id) || [];
    const isFocus = node.id === focusId;
    return (
      <div key={node.id} className="cbs-node-wrap" style={{ marginLeft: depth === 0 ? 0 : 14 }}>
        <div className={`cbs-node cbs-${node.status} ${isFocus ? 'cbs-focus' : ''}`}>
          <div className="cbs-node-head">
            <span className="cbs-id">#{node.id}</span>
            <span className="cbs-cost">
              cost {node.cost === Infinity || node.cost === null ? '∞' : node.cost}
            </span>
            {node.conflicts >= 0 && (
              <span className={`cbs-conf ${node.conflicts === 0 ? 'zero' : ''}`}>
                {node.conflicts} conf
              </span>
            )}
            <span className={`cbs-status cbs-status-${node.status}`}>{node.status}</span>
          </div>
          <div className="cbs-constraint">{node.label}</div>
        </div>
        {kids.length > 0 && (
          <div className="cbs-children">
            {kids.map((k) => renderNode(k, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cbs-tree">
      {roots.map((r) => renderNode(r, 0))}
    </div>
  );
};

export const MapfCalcPanel = ({
  algorithm,
  result,
  traceIndex,
  setTraceIndex,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  agents,
  isRunning,
  autoMode,
  autoIteration,
  autoTotal,
  autoStats
}) => {
  const algoInfo = MAPF_ALGORITHMS.find((a) => a.id === algorithm) || MAPF_ALGORITHMS[0];

  // ---------- AUTO MODE telemetry ----------
  if (autoMode) {
    return (
      <div className="glass-panel right-calc-panel">
        <div className="panel-header">
          <Gauge size={18} color="#f59e0b" />
          <h3>Algorithm Benchmark</h3>
        </div>
        <div className="telemetry-box">
          <div className="telemetry-badge">
            <span>Iteration:</span>
            <strong>{autoIteration} / {autoTotal}</strong>
          </div>
          {autoStats && autoStats.length > 0 ? (
            <div className="telemetry-card">
              <h4>Running averages</h4>
              {autoStats.map((s) => (
                <div className="tel-row" key={s.id}>
                  <span>{s.id} — {s.short}</span>
                  <strong>{s.avgCollisions.toFixed(1)} collisions</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-tel-placeholder">
              <p>Benchmarking all 4 MAPF algorithms on identical random scenarios…</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- EMPTY STATE ----------
  if (!result) {
    return (
      <div className="glass-panel right-calc-panel">
        <div className="panel-header">
          <Calculator size={18} color="#3b82f6" />
          <h3>Step-by-Step Calculations</h3>
        </div>
        <div className="empty-calc-prompt">
          <Network size={32} color="#94a3b8" />
          <p>
            Set up your robots, then press <strong>Run {algoInfo.short}</strong>.
            Every calculation the algorithm makes will appear here one step at a time.
          </p>
          <div className="algo-preview-card">
            <h4>{algoInfo.id} — {algoInfo.name}</h4>
            <div className="formula-code">{algoInfo.formula}</div>
            <p>{algoInfo.blurb}</p>
          </div>
        </div>
      </div>
    );
  }

  const steps = result.trace.steps;
  const total = steps.length;
  const idx = Math.min(traceIndex, total - 1);
  const step = steps[idx];
  const meta = STEP_KIND_META[step.k] || { label: step.k, color: '#64748b' };
  const pct = total > 1 ? Math.round((idx / (total - 1)) * 100) : 100;
  const m = result.metrics;

  const agentColor = (aid) =>
    aid === undefined || aid === null ? null : AGENT_COLORS[aid % AGENT_COLORS.length].hex;

  return (
    <div className="glass-panel right-calc-panel">
      <div className="panel-header">
        <Calculator size={18} color="#3b82f6" />
        <h3>Step-by-Step Calculations</h3>
      </div>

      {/* ---- Playback controls ---- */}
      <div className="playback-bar">
        <div className="playback-btns">
          <button
            className="pb-btn"
            onClick={() => { setIsPlaying(false); setTraceIndex(0); }}
            title="Back to the first step"
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="pb-btn"
            onClick={() => { setIsPlaying(false); setTraceIndex(Math.max(0, idx - 1)); }}
            disabled={idx <= 0}
            title="Previous step"
          >
            <SkipBack size={15} />
          </button>
          <button
            className="pb-btn pb-main"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play through the steps'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            className="pb-btn pb-next"
            onClick={() => { setIsPlaying(false); setTraceIndex(Math.min(total - 1, idx + 1)); }}
            disabled={idx >= total - 1}
            title="Next step"
          >
            <span>Next</span>
            <SkipForward size={15} />
          </button>
        </div>

        <div className="playback-meta">
          <span>Step <strong>{idx + 1}</strong> / {total}</span>
          <label className="speed-ctl">
            <Timer size={12} />
            <input
              type="range" min="150" max="2200" step="50"
              value={2350 - speed}
              onChange={(e) => setSpeed(2350 - parseInt(e.target.value))}
              title="Playback speed"
            />
            <span>{(speed / 1000).toFixed(2)}s</span>
          </label>
        </div>

        <div className="playback-track">
          <div className="playback-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="calc-steps-content">
        {/* ---- Current step card ---- */}
        <div className="step-card" style={{ '--step-color': meta.color }}>
          <div className="step-card-head">
            <span className="step-kind" style={{ background: meta.color }}>{meta.label}</span>
            {step.agentId !== undefined && step.agentId !== null && (
              <span className="step-agent" style={{ background: agentColor(step.agentId) }}>
                R{step.agentId + 1}
              </span>
            )}
            {step.t !== undefined && <span className="step-time">t = {step.t}</span>}
          </div>

          <h4 className="step-title">{step.title}</h4>

          {step.formula && <div className="formula-code">{step.formula}</div>}

          {step.lines && step.lines.length > 0 && (
            <div className="step-block">
              {step.lines.map((ln, i) => (
                <div className={`step-line ${ln.strong ? 'step-line-strong' : ''}`} key={i}>
                  <span>{ln.label}</span>
                  <strong>{ln.value}</strong>
                </div>
              ))}
            </div>
          )}

          {step.cell && (
            <div className="step-cellref">
              Focus cell: <strong>({step.cell.r}, {step.cell.c})</strong>
            </div>
          )}
        </div>

        {/* ---- CBS constraint tree ---- */}
        {step.cbsTree && step.cbsTree.length > 0 && (
          <div className="cbs-panel">
            <div className="h-card-title">
              <GitBranch size={16} color="#8b5cf6" />
              <h4>Constraint Tree ({step.cbsTree.length} nodes)</h4>
            </div>
            <div className="cbs-legend">
              <span><i className="dot cbs-dot-open" /> open</span>
              <span><i className="dot cbs-dot-expanded" /> expanded</span>
              <span><i className="dot cbs-dot-solution" /> solution</span>
              <span><i className="dot cbs-dot-pruned" /> pruned</span>
            </div>
            <CbsTree nodes={step.cbsTree} focusId={step.cbsFocus} />
          </div>
        )}

        {/* ---- Live metric summary ---- */}
        <div className="metric-mini-card">
          <div className="h-card-title">
            {m.collisions === 0
              ? <CheckCircle2 size={16} color="#10b981" />
              : <AlertTriangle size={16} color="#ef4444" />}
            <h4>Final Result — {algoInfo.id} {algoInfo.short}</h4>
          </div>
          <div className="step-block">
            <div className="step-line">
              <span>All robots reached their goal</span>
              <strong className={m.solved ? 'ok-text' : 'bad-text'}>{m.solved ? 'yes' : 'no'}</strong>
            </div>
            <div className="step-line">
              <span>Collisions</span>
              <strong className={m.collisions === 0 ? 'ok-text' : 'bad-text'}>
                {m.collisions} ({m.vertexCollisions} vertex, {m.edgeCollisions} edge)
              </strong>
            </div>
            <div className="step-line"><span>Total path cost (sum)</span><strong>{m.totalCost}</strong></div>
            <div className="step-line"><span>Makespan (last arrival)</span><strong>{m.makespan}</strong></div>
            <div className="step-line"><span>WAIT actions</span><strong>{m.waits}</strong></div>
            <div className="step-line"><span>Nodes expanded</span><strong>{m.expanded}</strong></div>
            <div className="step-line"><span>Computation time</span><strong>{m.timeMs.toFixed(2)} ms</strong></div>
            {m.orderingsTried > 1 && (
              <div className="step-line"><span>Priority orderings tried</span><strong>{m.orderingsTried}</strong></div>
            )}
            {m.chosenOrdering && (
              <div className="step-line"><span>Winning ordering</span><strong>{m.chosenOrdering}</strong></div>
            )}
            {m.priorityOrder && (
              <div className="step-line"><span>Priority order used</span><strong>{m.priorityOrder}</strong></div>
            )}
            {m.retries > 0 && (
              <div className="step-line"><span>Anti-starvation retries</span><strong>{m.retries}</strong></div>
            )}
            {m.ctNodes !== undefined && (
              <div className="step-line"><span>CT nodes expanded</span><strong>{m.ctNodes}</strong></div>
            )}
            {m.constraintsUsed !== undefined && (
              <div className="step-line"><span>Constraints in solution</span><strong>{m.constraintsUsed}</strong></div>
            )}
          </div>
        </div>

        {/* ---- Per-robot path summary ---- */}
        <div className="metric-mini-card">
          <div className="h-card-title">
            <Flag size={16} color="#3b82f6" />
            <h4>Per-Robot Paths</h4>
          </div>
          <div className="step-block">
            {agents.map((ag, i) => {
              const p = result.paths[i];
              const col = AGENT_COLORS[ag.id % AGENT_COLORS.length].hex;
              return (
                <div className="step-line" key={ag.id}>
                  <span>
                    <i className="dot" style={{ background: col }} /> R{ag.id + 1}
                    {' '}({ag.start.r},{ag.start.c}) → ({ag.goal.r},{ag.goal.c})
                  </span>
                  <strong>{p ? `${p.length - 1} steps` : 'no path'}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
