import React from 'react';
import { Bot, Layers, Volume2, VolumeX, Eye, Sparkles, Sliders, Play, Award } from 'lucide-react';

export const Header = ({
  appMode,
  setAppMode,
  isIsometric,
  togglePerspective,
  soundEnabled,
  toggleSound,
  rows,
  cols,
  status,
  isAutoRunning,
  openModal,
  hasAutoCompleted
}) => {
  return (
    <header className="glass-panel header-card">
      <div className="brand">
        <div className="brand-badge">Q1</div>
        <div className="brand-icon">
          <Bot size={26} color="#452400" />
        </div>
        <div>
          <h1 className="brand-title">Q1: Robot Path-finding Problem</h1>
          <p className="brand-subtitle">A* Search Heuristics Performance Comparison & Interactive Sandbox</p>
        </div>
      </div>

      <div className="header-center-tabs">
        <button
          className={`tab-btn ${appMode === 'MANUAL' ? 'active' : ''}`}
          onClick={() => !isAutoRunning && setAppMode('MANUAL')}
          disabled={isAutoRunning}
        >
          <Sliders size={16} />
          <span>Manual Mode</span>
        </button>

        <button
          className={`tab-btn ${appMode === 'AUTO' ? 'active' : ''}`}
          onClick={() => !isAutoRunning && setAppMode('AUTO')}
          disabled={isAutoRunning}
        >
          <Play size={16} />
          <span>Auto Experiment</span>
          {isAutoRunning && <span className="running-dot" />}
        </button>
      </div>

      <div className="header-badges">
        <div className="badge badge-primary">
          <Layers size={14} />
          <span>Grid: {rows} × {cols}</span>
        </div>

        {hasAutoCompleted && (
          <button
            className="btn btn-accent btn-sm"
            onClick={openModal}
            title="View Comparison Metrics Modal"
          >
            <Award size={15} />
            <span>View Comparison Dialog</span>
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={togglePerspective}
          title="Toggle 2.5D Isometric View"
        >
          <Eye size={15} />
          <span>{isIsometric ? '2.5D Isometric' : '2D Top-Down'}</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleSound}
          title="Toggle Audio Feedback"
        >
          {soundEnabled ? <Volume2 size={15} color="#3b82f6" /> : <VolumeX size={15} color="#94a3b8" />}
        </button>
      </div>
    </header>
  );
};
