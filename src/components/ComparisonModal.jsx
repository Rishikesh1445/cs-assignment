import React, { useState } from 'react';
import { X, Award, Clock, Navigation, Scale, CheckCircle2 } from 'lucide-react';

export const ComparisonModal = ({ isOpen, onClose, autoStats }) => {
  const [activeMetricTab, setActiveMetricTab] = useState('TIME');

  if (!isOpen || !autoStats || autoStats.length === 0) return null;

  const h1Stat = autoStats.find((s) => s.id === 'H1') || autoStats[0];

  // Maximum values for relative SVG bar height calculation
  const maxTime = Math.max(...autoStats.map((s) => s.avgTime), 0.001);
  const maxLen = Math.max(...autoStats.map((s) => s.avgLength), 1);
  const maxRatio = Math.max(...autoStats.map((s) => s.avgOptimalityRatio), 1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Award size={24} color="#f59e0b" />
            <div>
              <h2>A* 5-Heuristics Performance Comparison</h2>
              <p>Aggregated benchmark metrics across 10 random grid iterations</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Metric Tabs */}
        <div className="modal-tabs">
          <button
            className={`metric-tab-btn ${activeMetricTab === 'TIME' ? 'active' : ''}`}
            onClick={() => setActiveMetricTab('TIME')}
          >
            <Clock size={16} />
            <span>1. Execution Time</span>
          </button>

          <button
            className={`metric-tab-btn ${activeMetricTab === 'LENGTH' ? 'active' : ''}`}
            onClick={() => setActiveMetricTab('LENGTH')}
          >
            <Navigation size={16} />
            <span>2. Path Length</span>
          </button>

          <button
            className={`metric-tab-btn ${activeMetricTab === 'OPTIMALITY' ? 'active' : ''}`}
            onClick={() => setActiveMetricTab('OPTIMALITY')}
          >
            <Scale size={16} />
            <span>3. Optimality Ratio</span>
          </button>
        </div>

        {/* Tab Content & Visual Bar Charts */}
        <div className="modal-body">
          {activeMetricTab === 'TIME' && (
            <div className="metric-view">
              <div className="metric-intro">
                <h3>Metric 1 — Execution Time (Milliseconds)</h3>
                <p>
                  Measures total computational runtime taken by A* search to solve each grid configuration across all 5 heuristics.
                </p>
              </div>

              {/* Bar Chart for 5 heuristics */}
              <div className="chart-container">
                {autoStats.map((st) => {
                  const barHeight = Math.max(15, Math.round((st.avgTime / maxTime) * 100));
                  return (
                    <div key={st.id} className="chart-bar-col">
                      <div className="bar-val-label">{st.avgTime.toFixed(3)} ms</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-${st.id.toLowerCase()}`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <div className="bar-label">{st.name.split(':')[0]}</div>
                    </div>
                  );
                })}
              </div>

              <div className="metric-summary-card">
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  <strong>Analysis:</strong> Manhattan (H1) baseline averaged <strong>{h1Stat.avgTime.toFixed(3)} ms</strong>.
                  Euclidean (H4) and Chebyshev (H5) provide direct geometric distance bounds while Goal-Direction (H2) prunes unnecessary search branches.
                </span>
              </div>
            </div>
          )}

          {activeMetricTab === 'LENGTH' && (
            <div className="metric-view">
              <div className="metric-intro">
                <h3>Metric 2 — Path Length (Number of Steps)</h3>
                <p>
                  Measures the final path step count from Start cell to Goal cell found by A* for each heuristic.
                </p>
              </div>

              {/* Bar Chart for 5 heuristics */}
              <div className="chart-container">
                {autoStats.map((st) => {
                  const barHeight = Math.max(15, Math.round((st.avgLength / maxLen) * 100));
                  return (
                    <div key={st.id} className="chart-bar-col">
                      <div className="bar-val-label">{st.avgLength.toFixed(1)} steps</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-${st.id.toLowerCase()}`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <div className="bar-label">{st.name.split(':')[0]}</div>
                    </div>
                  );
                })}
              </div>

              <div className="metric-summary-card">
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  <strong>Analysis:</strong> Manhattan A* guarantees optimal path length of <strong>{h1Stat.avgLength.toFixed(1)} steps</strong> under 4-directional grid motion.
                  Obstacle-Aware (H3) routes around dense obstacle regions to prioritize safer movement.
                </span>
              </div>
            </div>
          )}

          {activeMetricTab === 'OPTIMALITY' && (
            <div className="metric-view">
              <div className="metric-intro">
                <h3>Metric 3 — Optimality Ratio</h3>
                <div className="formula-box">
                  OptimalityRatio = PathLength<sub>heuristic</sub> / PathLength<sub>baseline</sub>
                </div>
                <p>
                  Baseline is Manhattan A* (Ratio = 1.000). A ratio &gt; 1.00 indicates a longer path traded off for fewer node expansions or obstacle avoidance.
                </p>
              </div>

              {/* Bar Chart for 5 heuristics */}
              <div className="chart-container">
                {autoStats.map((st) => {
                  const barHeight = Math.max(15, Math.round((st.avgOptimalityRatio / maxRatio) * 100));
                  return (
                    <div key={st.id} className="chart-bar-col">
                      <div className="bar-val-label">{st.avgOptimalityRatio.toFixed(3)}x</div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-${st.id.toLowerCase()}`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <div className="bar-label">{st.name.split(':')[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Comparison Table for all 5 heuristics */}
          <div className="comparison-table-wrapper">
            <h4>All-Metrics Summary Table (5 Heuristics x 10 Benchmark Runs)</h4>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Heuristic Name</th>
                  <th>Avg Exec Time (ms)</th>
                  <th>Avg Path Length</th>
                  <th>Avg Expanded Nodes</th>
                  <th>Optimality Ratio</th>
                </tr>
              </thead>
              <tbody>
                {autoStats.map((st) => (
                  <tr key={st.id} className={st.id === 'H1' ? 'baseline-row' : ''}>
                    <td>
                      <strong>{st.name}</strong> {st.id === 'H1' && <span className="pill-baseline">Baseline</span>}
                    </td>
                    <td>{st.avgTime.toFixed(3)} ms</td>
                    <td>{st.avgLength.toFixed(1)} steps</td>
                    <td>{st.avgExpanded.toFixed(1)} nodes</td>
                    <td>
                      <strong className="ratio-text">{st.avgOptimalityRatio.toFixed(3)}x</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close Metrics Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
