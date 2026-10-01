import React from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Sliders, 
  Flag, 
  Target, 
  ShieldAlert, 
  Navigation,
  Grid,
  Zap,
  Trash2
} from 'lucide-react';

export const ControlPanel = ({
  rows,
  cols,
  setRows,
  setCols,
  mode,
  setMode,
  speed,
  setSpeed,
  isRunning,
  onPlay,
  onPause,
  onResetRobot,
  onClearWalls,
  onClearVisited
}) => {
  return (
    <div className="glass-panel sidebar-panel">
      {/* Grid Size Configuration */}
      <div className="panel-section">
        <div className="section-title">
          <Grid size={15} />
          <span>Grid Dimensions</span>
        </div>

        <div className="grid-dim-controls">
          <div className="dim-input-group">
            <label>Rows (M):</label>
            <input
              type="number"
              min="3"
              max="15"
              value={rows}
              onChange={(e) => setRows(Math.min(15, Math.max(3, parseInt(e.target.value) || 3)))}
              disabled={isRunning}
            />
          </div>

          <div className="dim-input-group">
            <label>Cols (N):</label>
            <input
              type="number"
              min="3"
              max="15"
              value={cols}
              onChange={(e) => setCols(Math.min(15, Math.max(3, parseInt(e.target.value) || 3)))}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Interactive Tool Selector */}
      <div className="panel-section">
        <div className="section-title">
          <Sliders size={15} />
          <span>Click Action Tool</span>
        </div>

        <div className="tool-btn-group">
          <button
            className={`tool-btn ${mode === 'MOVE' ? 'active' : ''}`}
            onClick={() => setMode('MOVE')}
          >
            <Navigation size={16} />
            <span>Drive Robot</span>
          </button>

          <button
            className={`tool-btn ${mode === 'START' ? 'active' : ''}`}
            onClick={() => setMode('START')}
          >
            <Flag size={16} color="#10b981" />
            <span>Set Start</span>
          </button>

          <button
            className={`tool-btn ${mode === 'GOAL' ? 'active' : ''}`}
            onClick={() => setMode('GOAL')}
          >
            <Target size={16} color="#ef4444" />
            <span>Set Goal</span>
          </button>

          <button
            className={`tool-btn ${mode === 'WALL' ? 'active' : ''}`}
            onClick={() => setMode('WALL')}
          >
            <ShieldAlert size={16} color="#475569" />
            <span>Toggle Wall</span>
          </button>
        </div>
      </div>

      <hr className="divider" />

      {/* Animation Speed Slider */}
      <div className="panel-section">
        <div className="section-title">
          <Zap size={15} />
          <span>Animation Delay: {speed} ms</span>
        </div>

        <input
          type="range"
          min="50"
          max="800"
          step="50"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          className="speed-slider"
        />
      </div>

      <hr className="divider" />

      {/* Simulation Playback Actions */}
      <div className="panel-section">
        <div className="section-title">
          <Play size={15} />
          <span>Simulation Actions</span>
        </div>

        <div className="action-btn-grid">
          {!isRunning ? (
            <button className="btn btn-primary" onClick={onPlay}>
              <Play size={16} />
              <span>Auto Path</span>
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onPause}>
              <Square size={16} />
              <span>Pause</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={onResetRobot}>
            <RotateCcw size={16} />
            <span>Reset Robot</span>
          </button>
        </div>
      </div>

      <hr className="divider" />

      {/* Reset & Clear Tools */}
      <div className="panel-section">
        <div className="action-btn-grid">
          <button className="btn btn-secondary btn-sm" onClick={onClearVisited}>
            <Trash2 size={14} />
            <span>Clear Visited Trails</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onClearWalls}>
            <Trash2 size={14} />
            <span>Clear All Walls</span>
          </button>
        </div>
      </div>
    </div>
  );
};
