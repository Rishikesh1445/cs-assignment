import React from 'react';
import {
  Grid,
  Shuffle,
  Flag,
  Target,
  ShieldAlert,
  Play,
  RotateCcw,
  Trash2,
  HelpCircle,
  Calculator,
  Compass
} from 'lucide-react';

export const ManualControls = ({
  rows,
  cols,
  setRows,
  setCols,
  heuristic,
  setHeuristic,
  mode,
  setMode,
  isRunning,
  onRandomizeObstacles,
  onSolveAStar,
  onResetRobot,
  onClearWalls
}) => {
  return (
    <div className="glass-panel sidebar-controls-card">
      <div className="panel-header">
        <h3>Manual Controls</h3>
        <span className="mode-pill">Interactive</span>
      </div>

      {/* Grid Dimension Selection */}
      <div className="panel-group">
        <div className="group-title">
          <Grid size={15} />
          <span>Grid Dimensions</span>
        </div>
        <div className="grid-dim-inputs">
          <div className="input-field">
            <label>Rows:</label>
            <input
              type="number"
              min="5"
              max="15"
              value={rows}
              onChange={(e) => setRows(Math.min(15, Math.max(5, parseInt(e.target.value) || 5)))}
              disabled={isRunning}
            />
          </div>
          <div className="input-field">
            <label>Cols:</label>
            <input
              type="number"
              min="5"
              max="15"
              value={cols}
              onChange={(e) => setCols(Math.min(15, Math.max(5, parseInt(e.target.value) || 5)))}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Heuristic Selector (5 Heuristics) */}
      <div className="panel-group">
        <div className="group-title">
          <Compass size={15} />
          <span>Select A* Heuristic (5 Available)</span>
        </div>
        <div className="heuristic-select-wrapper">
          <select
            value={heuristic}
            onChange={(e) => setHeuristic(e.target.value)}
            disabled={isRunning}
            className="custom-select"
          >
            <option value="H1">H1: Normal Manhattan Distance</option>
            <option value="H2">H2: Goal-Direction / Angular Heuristic</option>
            <option value="H3">H3: Obstacle-Aware Manhattan</option>
            <option value="H4">H4: Euclidean Distance</option>
            <option value="H5">H5: Chebyshev Distance</option>
          </select>
        </div>
        <div className="heuristic-desc-box">
          {heuristic === 'H1' && <p><strong>h(n) = |x - x_g| + |y - y_g|</strong><br/>Standard 4-way distance metric.</p>}
          {heuristic === 'H2' && <p><strong>h(n) = Manhattan + β*(1 - cos θ)</strong><br/>Rewards moving directly toward target goal.</p>}
          {heuristic === 'H3' && <p><strong>h(n) = Manhattan * (1 + α * Density)</strong><br/>Penalizes cells near high obstacle clusters.</p>}
          {heuristic === 'H4' && <p><strong>h(n) = sqrt((x - x_g)² + (y - y_g)²)</strong><br/>Straight-line diagonal distance metric.</p>}
          {heuristic === 'H5' && <p><strong>h(n) = max(|x - x_g|, |y - y_g|)</strong><br/>Chebyshev grid distance metric.</p>}
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Obstacle Randomizer Button */}
      <div className="panel-group">
        <button
          className="btn btn-secondary btn-block"
          onClick={onRandomizeObstacles}
          disabled={isRunning}
        >
          <Shuffle size={16} />
          <span>Randomise Obstacles</span>
        </button>
      </div>

      <hr className="subtle-divider" />

      {/* Click Action Mode Selector */}
      <div className="panel-group">
        <div className="group-title">
          <Calculator size={15} />
          <span>Click Cell Action</span>
        </div>
        <div className="tool-grid">
          <button
            className={`tool-btn ${mode === 'INSPECT' ? 'active' : ''}`}
            onClick={() => setMode('INSPECT')}
            title="Click any grid cell to view step-by-step heuristic math calculation on right side"
          >
            <HelpCircle size={15} color="#3b82f6" />
            <span>Math Steps</span>
          </button>

          <button
            className={`tool-btn ${mode === 'START' ? 'active' : ''}`}
            onClick={() => setMode('START')}
          >
            <Flag size={15} color="#10b981" />
            <span>Set Start</span>
          </button>

          <button
            className={`tool-btn ${mode === 'GOAL' ? 'active' : ''}`}
            onClick={() => setMode('GOAL')}
          >
            <Target size={15} color="#ef4444" />
            <span>Set Goal</span>
          </button>

          <button
            className={`tool-btn ${mode === 'WALL' ? 'active' : ''}`}
            onClick={() => setMode('WALL')}
          >
            <ShieldAlert size={15} color="#64748b" />
            <span>Toggle Wall</span>
          </button>
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Action Buttons */}
      <div className="panel-group action-buttons-group">
        <button
          className="btn btn-primary btn-block"
          onClick={onSolveAStar}
          disabled={isRunning}
        >
          <Play size={16} />
          <span>Run A* Pathfinding</span>
        </button>

        <div className="dual-buttons">
          <button className="btn btn-secondary btn-sm" onClick={onResetRobot}>
            <RotateCcw size={14} />
            <span>Reset Robot</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClearWalls}>
            <Trash2 size={14} />
            <span>Clear Walls</span>
          </button>
        </div>
      </div>
    </div>
  );
};
