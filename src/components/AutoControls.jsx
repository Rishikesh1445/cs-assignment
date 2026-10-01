import React from 'react';
import { Play, Activity, Sparkles, Award, Zap } from 'lucide-react';

export const AutoControls = ({
  isAutoRunning,
  currentIteration,
  totalIterations = 10,
  onStartAutoExperiment,
  openModal,
  hasAutoCompleted,
  autoStats
}) => {
  const progressPercent = Math.round((currentIteration / totalIterations) * 100);

  return (
    <div className="glass-panel sidebar-controls-card auto-controls-card">
      <div className="panel-header">
        <h3>Auto Mode</h3>
        <span className="mode-pill auto-pill">10 Runs Benchmark</span>
      </div>

      <div className="auto-info-banner">
        <Sparkles size={18} color="#f59e0b" />
        <p>
          Evaluates <strong>10 random grid benchmarks</strong> across all <strong>5 heuristics</strong>:
          <br />
          1. Manhattan Distance
          <br />
          2. Goal-Direction / Angular
          <br />
          3. Obstacle-Aware Manhattan
          <br />
          4. Euclidean Distance
          <br />
          5. Chebyshev Distance
        </p>
      </div>

      <div className="panel-group">
        {!isAutoRunning ? (
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={onStartAutoExperiment}
          >
            <Play size={18} />
            <span>Start Auto Experiment</span>
          </button>
        ) : (
          <div className="auto-running-badge">
            <Zap size={18} className="spin-icon" color="#3b82f6" />
            <span>Experiment Running... (No Pause)</span>
          </div>
        )}
      </div>

      {/* Progress Bar & Live Status */}
      <div className="panel-group">
        <div className="progress-header">
          <span>Experiment Progress</span>
          <span>{currentIteration} / {totalIterations} Iterations ({progressPercent}%)</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {hasAutoCompleted && (
        <div className="panel-group auto-finished-box">
          <div className="finished-title">
            <Award size={20} color="#10b981" />
            <span>All 10 Runs Completed!</span>
          </div>
          <p className="finished-desc">
            Evaluated all 50 pathfinding solutions under 1 minute.
          </p>
          <button
            className="btn btn-accent btn-block"
            onClick={openModal}
          >
            <Activity size={16} />
            <span>Compare Metrics Dialog Modal</span>
          </button>
        </div>
      )}

      {/* Mini Telemetry Table during or after runs */}
      {autoStats && autoStats.length > 0 && (
        <div className="panel-group">
          <div className="group-title">
            <Activity size={14} />
            <span>Live Aggregated Averages (5 Heuristics)</span>
          </div>
          <div className="mini-stats-table">
            <div className="stats-row head">
              <span>Heuristic</span>
              <span>Time(ms)</span>
              <span>Opt.Ratio</span>
            </div>
            {autoStats.map((st, i) => (
              <div key={i} className="stats-row">
                <span className="h-name">{st.name}</span>
                <span>{st.avgTime.toFixed(2)}ms</span>
                <span className="ratio-highlight">{st.avgOptimalityRatio.toFixed(3)}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
