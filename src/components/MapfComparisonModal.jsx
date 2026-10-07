import React, { useState } from 'react';
import { X, Award, Clock, Navigation, ShieldX, CheckCircle2, Timer } from 'lucide-react';

const TABS = [
  { id: 'COLLISIONS', label: '1. Collisions', icon: ShieldX },
  { id: 'COST',       label: '2. Total Cost', icon: Navigation },
  { id: 'MAKESPAN',   label: '3. Makespan',   icon: Timer },
  { id: 'TIME',       label: '4. Runtime',    icon: Clock }
];

const BAR_COLORS = {
  A1: '#ef4444',
  A2: '#f59e0b',
  A3: '#10b981',
  A4: '#8b5cf6'
};

export const MapfComparisonModal = ({ isOpen, onClose, stats, iterations }) => {
  const [tab, setTab] = useState('COLLISIONS');
  if (!isOpen || !stats || stats.length === 0) return null;

  const field = {
    COLLISIONS: 'avgCollisions',
    COST: 'avgCost',
    MAKESPAN: 'avgMakespan',
    TIME: 'avgTime'
  }[tab];

  const unit = {
    COLLISIONS: '',
    COST: ' steps',
    MAKESPAN: ' t',
    TIME: ' ms'
  }[tab];

  const decimals = tab === 'TIME' ? 2 : tab === 'COLLISIONS' ? 2 : 1;
  const maxVal = Math.max(...stats.map((s) => s[field]), 0.0001);

  const baseline = stats.find((s) => s.id === 'A1') || stats[0];
  const best = [...stats].sort((a, b) => a.avgCollisions - b.avgCollisions || a.avgCost - b.avgCost)[0];

  const intro = {
    COLLISIONS: {
      h: 'Metric 1 — Collisions per scenario',
      p: 'A vertex collision is two robots on the same cell at the same timestep; an edge collision is two robots swapping cells. This is the metric that separates single-robot A* from real multi-robot planning: plain A* has no idea the other robots exist.'
    },
    COST: {
      h: 'Metric 2 — Total path cost',
      p: 'The sum of every robot’s path length. Lower is better, but only counts if the plan is actually collision-free — a cheap plan that crashes is worth nothing.'
    },
    MAKESPAN: {
      h: 'Metric 3 — Makespan',
      p: 'The timestep at which the last robot reaches its goal. Total cost rewards efficiency across the team; makespan measures how long the whole mission takes.'
    },
    TIME: {
      h: 'Metric 4 — Computation time',
      p: 'Wall-clock planning time. This is where the trade-off lives: CBS is optimal but can blow up, CAR-A* stays fast, and Adaptive-Priority pays for extra orderings.'
    }
  }[tab];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Award size={24} color="#f59e0b" />
            <div>
              <h2>Q2 — Multi-Robot Algorithm Comparison</h2>
              <p>Averaged over {iterations} identical randomised scenarios (same grid, same robots, four planners)</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`metric-tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="modal-body">
          <div className="metric-view">
            <div className="metric-intro">
              <h3>{intro.h}</h3>
              <p>{intro.p}</p>
            </div>

            <div className="chart-container">
              {stats.map((s) => {
                const h = Math.max(6, Math.round((s[field] / maxVal) * 100));
                return (
                  <div key={s.id} className="chart-bar-col">
                    <div className="bar-val-label">
                      {s[field].toFixed(decimals)}{unit}
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: `${h}%`, background: BAR_COLORS[s.id] }}
                      />
                    </div>
                    <div className="bar-label">{s.id} {s.short}</div>
                  </div>
                );
              })}
            </div>

            <div className="metric-summary-card">
              <CheckCircle2 size={16} color="#10b981" />
              <span>
                <strong>Analysis:</strong> plain A* ({baseline.id}) averaged{' '}
                <strong>{baseline.avgCollisions.toFixed(2)} collisions</strong> per scenario, so its
                plans cannot be executed at all. The three coordinated planners all reached{' '}
                <strong>0 collisions</strong>. Best overall here was{' '}
                <strong>{best.id} — {best.name}</strong> at {best.avgCost.toFixed(1)} total steps
                and {best.avgTime.toFixed(2)} ms.
              </span>
            </div>
          </div>

          <div className="comparison-table-wrapper">
            <h4>All-Metrics Summary ({stats.length} algorithms × {iterations} scenarios)</h4>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Solved</th>
                  <th>Collisions</th>
                  <th>Total Cost</th>
                  <th>Makespan</th>
                  <th>Waits</th>
                  <th>Expanded</th>
                  <th>Runtime</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className={s.id === 'A1' ? 'baseline-row' : ''}>
                    <td>
                      <strong>{s.id}: {s.name}</strong>
                      {s.id === 'A1' && <span className="pill-baseline">Baseline</span>}
                    </td>
                    <td>{(s.solveRate * 100).toFixed(0)}%</td>
                    <td>
                      <strong className={s.avgCollisions === 0 ? 'ok-text' : 'bad-text'}>
                        {s.avgCollisions.toFixed(2)}
                      </strong>
                    </td>
                    <td>{s.avgCost.toFixed(1)}</td>
                    <td>{s.avgMakespan.toFixed(1)}</td>
                    <td>{s.avgWaits.toFixed(1)}</td>
                    <td>{s.avgExpanded.toFixed(0)}</td>
                    <td>{s.avgTime.toFixed(2)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="metric-summary-card">
            <CheckCircle2 size={16} color="#3b82f6" />
            <span>
              <strong>Additional challenges in the multi-robot setting:</strong> robots collide on
              cells and by swapping through each other; the search space grows from (row, col) to
              (row, col, time); sequential planning becomes sensitive to which robot is planned
              first; a robot may need to WAIT rather than detour; and one robot parked on its goal
              can block another forever. Each planner above answers a different subset of these.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close Comparison</button>
        </div>
      </div>
    </div>
  );
};
