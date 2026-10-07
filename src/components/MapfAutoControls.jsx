import React from 'react';
import { Play, Activity, Sparkles, Award, Zap, Users } from 'lucide-react';
import { MAPF_ALGORITHMS } from '../utils/mapf';

const BADGE = { A1: '#ef4444', A2: '#f59e0b', A3: '#10b981', A4: '#8b5cf6' };

export const MapfAutoControls = ({
  isAutoRunning,
  currentIteration,
  totalIterations = 10,
  agentCount,
  setAgentCount,
  onStartAutoExperiment,
  openModal,
  hasAutoCompleted,
  autoStats
}) => {
  const progressPercent = Math.round((currentIteration / totalIterations) * 100);

  return (
    <div className="glass-panel sidebar-controls-card auto-controls-card">
      <div className="panel-header">
        <h3>Auto Benchmark</h3>
        <span className="mode-pill q2-pill">{totalIterations} Scenarios</span>
      </div>

      <div className="auto-info-banner">
        <Sparkles size={18} color="#f59e0b" />
        <p>
          Generates <strong>{totalIterations} random scenarios</strong> (varying grid size, obstacle
          layout and robot placement) and solves each one with <strong>all 4 algorithms</strong> on
          the <em>identical</em> scenario, so the comparison is fair.
        </p>
      </div>

      <div className="algo-info-list">
        {MAPF_ALGORITHMS.map((a) => (
          <div className="algo-info-row" key={a.id}>
            <span className="algo-badge" style={{ background: BADGE[a.id] }}>{a.id}</span>
            <span><strong>{a.short}</strong> — {a.name}</span>
          </div>
        ))}
      </div>

      <hr className="subtle-divider" />

      <div className="panel-group">
        <div className="group-title">
          <Users size={15} />
          <span>Robots per scenario</span>
        </div>
        <div className="agent-count-stepper">
          <button
            className="stepper-btn"
            onClick={() => setAgentCount(Math.max(2, agentCount - 1))}
            disabled={isAutoRunning || agentCount <= 2}
          >−</button>
          <div className="stepper-value">
            <strong>{agentCount}</strong>
            <span>robots</span>
          </div>
          <button
            className="stepper-btn"
            onClick={() => setAgentCount(Math.min(8, agentCount + 1))}
            disabled={isAutoRunning || agentCount >= 8}
          >+</button>
        </div>
      </div>

      <div className="panel-group">
        {!isAutoRunning ? (
          <button className="btn btn-primary btn-block btn-lg" onClick={onStartAutoExperiment}>
            <Play size={18} />
            <span>Start Algorithm Benchmark</span>
          </button>
        ) : (
          <div className="auto-running-badge">
            <Zap size={18} className="spin-icon" color="#3b82f6" />
            <span>Benchmark running…</span>
          </div>
        )}
      </div>

      <div className="panel-group">
        <div className="progress-header">
          <span>Progress</span>
          <span>{currentIteration} / {totalIterations} ({progressPercent}%)</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {hasAutoCompleted && (
        <div className="panel-group auto-finished-box">
          <div className="finished-title">
            <Award size={20} color="#10b981" />
            <span>Benchmark complete</span>
          </div>
          <p className="finished-desc">
            {totalIterations * 4} multi-robot plans solved and scored.
          </p>
          <button className="btn btn-accent btn-block" onClick={openModal}>
            <Activity size={16} />
            <span>Open Comparison Dialog</span>
          </button>
        </div>
      )}

      {autoStats && autoStats.length > 0 && (
        <div className="panel-group">
          <div className="group-title">
            <Activity size={14} />
            <span>Live averages</span>
          </div>
          <div className="mini-stats-table">
            <div className="stats-row head">
              <span>Algo</span>
              <span>Collisions</span>
              <span>Cost</span>
            </div>
            {autoStats.map((s) => (
              <div key={s.id} className="stats-row">
                <span className="h-name">{s.id} {s.short}</span>
                <span className={s.avgCollisions === 0 ? 'ok-text' : 'bad-text'}>
                  {s.avgCollisions.toFixed(2)}
                </span>
                <span className="ratio-highlight">{s.avgCost.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
