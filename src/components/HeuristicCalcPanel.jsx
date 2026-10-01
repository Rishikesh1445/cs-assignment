import React from 'react';
import { Calculator, Compass, ShieldAlert, Navigation, Sparkles, MoveUpRight, Maximize2 } from 'lucide-react';

export const HeuristicCalcPanel = ({
  appMode,
  selectedCell,
  calcData,
  robotPos,
  goal,
  activeHeuristic,
  lastAStarResult,
  isAutoRunning,
  currentIteration
}) => {
  if (appMode === 'AUTO') {
    return (
      <div className="glass-panel right-calc-panel">
        <div className="panel-header">
          <Sparkles size={18} color="#f59e0b" />
          <h3>Auto Telemetry</h3>
        </div>

        <div className="telemetry-box">
          <div className="telemetry-badge">
            <span>Iteration:</span>
            <strong>{currentIteration} / 10</strong>
          </div>

          {lastAStarResult ? (
            <div className="telemetry-card">
              <h4>Latest A* Run Results</h4>
              <div className="tel-row">
                <span>Execution Time:</span>
                <strong>{lastAStarResult.executionTimeMs.toFixed(3)} ms</strong>
              </div>
              <div className="tel-row">
                <span>Path Length:</span>
                <strong>{lastAStarResult.pathLength} steps</strong>
              </div>
              <div className="tel-row">
                <span>Nodes Expanded:</span>
                <strong>{lastAStarResult.expandedNodes} nodes</strong>
              </div>
              <div className="tel-row">
                <span>Status:</span>
                <span className="badge-success">Solvable</span>
              </div>
            </div>
          ) : (
            <div className="empty-tel-placeholder">
              <p>Ready to benchmark 10 iteration runs...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Manual Mode calculation panel
  return (
    <div className="glass-panel right-calc-panel">
      <div className="panel-header">
        <Calculator size={18} color="#3b82f6" />
        <h3>Heuristic Math Inspector (5 Algos)</h3>
      </div>

      {!calcData ? (
        <div className="empty-calc-prompt">
          <Compass size={32} color="#94a3b8" />
          <p>
            <strong>Click any grid cell</strong> to view step-by-step mathematical calculations for all 5 heuristics!
          </p>
          <div className="current-pos-card">
            <div>
              <span>Robot Pos:</span>
              <strong>({robotPos.r}, {robotPos.c})</strong>
            </div>
            <div>
              <span>Goal Pos:</span>
              <strong>({goal.r}, {goal.c})</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="calc-steps-content">
          <div className="cell-inspect-header">
            <span>Selected Cell: <strong>({calcData.cell.r}, {calcData.cell.c})</strong></span>
            <span>Target Goal: <strong>({calcData.goal.r}, {calcData.goal.c})</strong></span>
          </div>

          {/* Heuristic 1 Breakdown */}
          <div className={`heuristic-card ${activeHeuristic === 'H1' ? 'active-h' : ''}`}>
            <div className="h-card-title">
              <Compass size={16} color="#3b82f6" />
              <h4>1. Manhattan Distance</h4>
              {activeHeuristic === 'H1' && <span className="active-tag">Selected</span>}
            </div>
            <div className="step-block">
              <div className="formula-code">h1(n) = |x - x_g| + |y - y_g|</div>
              <div className="step-line">
                <span>Row Diff |{calcData.cell.r} - {calcData.goal.r}|:</span>
                <strong>{calcData.rowDiff}</strong>
              </div>
              <div className="step-line">
                <span>Col Diff |{calcData.cell.c} - {calcData.goal.c}|:</span>
                <strong>{calcData.colDiff}</strong>
              </div>
              <div className="step-result">
                <span>h1 Value:</span>
                <strong className="h-val">{calcData.h1.value}</strong>
              </div>
            </div>
          </div>

          {/* Heuristic 2 Breakdown */}
          <div className={`heuristic-card ${activeHeuristic === 'H2' ? 'active-h' : ''}`}>
            <div className="h-card-title">
              <Navigation size={16} color="#10b981" />
              <h4>2. Goal-Direction / Angular</h4>
              {activeHeuristic === 'H2' && <span className="active-tag">Selected</span>}
            </div>
            <div className="step-block">
              <div className="formula-code">h2(n) = Manhattan + β * (1 - cos θ)</div>
              <div className="step-line">
                <span>Base Manhattan:</span>
                <strong>{calcData.manhattan}</strong>
              </div>
              <div className="step-line">
                <span>Cos(θ) & Direction Penalty:</span>
                <strong>{calcData.h2.cosTheta} → P_dir = {calcData.h2.pDir}</strong>
              </div>
              <div className="step-result">
                <span>h2 Value (β=2.0):</span>
                <strong className="h-val">{calcData.h2.value}</strong>
              </div>
            </div>
          </div>

          {/* Heuristic 3 Breakdown */}
          <div className={`heuristic-card ${activeHeuristic === 'H3' ? 'active-h' : ''}`}>
            <div className="h-card-title">
              <ShieldAlert size={16} color="#f59e0b" />
              <h4>3. Obstacle-Aware Manhattan</h4>
              {activeHeuristic === 'H3' && <span className="active-tag">Selected</span>}
            </div>
            <div className="step-block">
              <div className="formula-code">h3(n) = Manhattan * (1 + α * Density)</div>
              <div className="step-line">
                <span>3x3 Obstacles / Cells:</span>
                <strong>{calcData.h3.obstacleCount} / {calcData.h3.totalValidNeighbors}</strong>
              </div>
              <div className="step-line">
                <span>Obstacle Density D(n):</span>
                <strong>{calcData.h3.density}</strong>
              </div>
              <div className="step-result">
                <span>h3 Value (α=1.5):</span>
                <strong className="h-val">{calcData.h3.value}</strong>
              </div>
            </div>
          </div>

          {/* Heuristic 4 Breakdown */}
          <div className={`heuristic-card ${activeHeuristic === 'H4' ? 'active-h' : ''}`}>
            <div className="h-card-title">
              <MoveUpRight size={16} color="#8b5cf6" />
              <h4>4. Euclidean Distance</h4>
              {activeHeuristic === 'H4' && <span className="active-tag">Selected</span>}
            </div>
            <div className="step-block">
              <div className="formula-code">h4(n) = sqrt((x - x_g)² + (y - y_g)²)</div>
              <div className="step-line">
                <span>Formula Substitution:</span>
                <strong>sqrt(({calcData.rowDiff})² + ({calcData.colDiff})²)</strong>
              </div>
              <div className="step-result">
                <span>h4 Value:</span>
                <strong className="h-val">{calcData.h4.value}</strong>
              </div>
            </div>
          </div>

          {/* Heuristic 5 Breakdown */}
          <div className={`heuristic-card ${activeHeuristic === 'H5' ? 'active-h' : ''}`}>
            <div className="h-card-title">
              <Maximize2 size={16} color="#ec4899" />
              <h4>5. Chebyshev Distance</h4>
              {activeHeuristic === 'H5' && <span className="active-tag">Selected</span>}
            </div>
            <div className="step-block">
              <div className="formula-code">h5(n) = max(|x - x_g|, |y - y_g|)</div>
              <div className="step-line">
                <span>Max(|{calcData.rowDiff}|, |{calcData.colDiff}|):</span>
                <strong>max({calcData.rowDiff}, {calcData.colDiff})</strong>
              </div>
              <div className="step-result">
                <span>h5 Value:</span>
                <strong className="h-val">{calcData.h5.value}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
