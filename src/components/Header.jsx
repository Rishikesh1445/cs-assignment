import React from 'react';
import { Bot, Layers, Volume2, VolumeX, Eye, Sliders, Play, Award, Users, Navigation } from 'lucide-react';

export const Header = ({
  question,
  setQuestion,
  appMode,
  setAppMode,
  isIsometric,
  togglePerspective,
  soundEnabled,
  toggleSound,
  rows,
  cols,
  agentCount,
  isAutoRunning,
  openModal,
  hasAutoCompleted
}) => {
  const isQ2 = question === 'Q2';

  return (
    <header className="glass-panel header-card">
      <div className="brand">
        <div className="brand-badge">{isQ2 ? 'Q2' : 'Q1'}</div>
        <div className="brand-icon">
          <Bot size={26} color="#452400" />
        </div>
        <div>
          <h1 className="brand-title">
            {isQ2 ? 'Q2: Multi-Robot Path Finding' : 'Q1: Robot Path-finding Problem'}
          </h1>
          <p className="brand-subtitle">
            {isQ2
              ? 'Collision-free planning for many robots — A*, Adaptive-Priority, CAR-A* and CBS'
              : 'A* Search Heuristics Performance Comparison & Interactive Sandbox'}
          </p>
        </div>
      </div>

      {/* Question switch — the primary toggle */}
      <div className="question-switch" role="tablist" aria-label="Select question">
        <button
          role="tab"
          aria-selected={!isQ2}
          className={`q-switch-btn ${!isQ2 ? 'active' : ''}`}
          onClick={() => !isAutoRunning && setQuestion('Q1')}
          disabled={isAutoRunning}
          title="Single-robot A* with 5 heuristics"
        >
          <Navigation size={15} />
          <span>Q1 · Single Robot</span>
        </button>
        <button
          role="tab"
          aria-selected={isQ2}
          className={`q-switch-btn ${isQ2 ? 'active' : ''}`}
          onClick={() => !isAutoRunning && setQuestion('Q2')}
          disabled={isAutoRunning}
          title="Multi-robot path finding with 4 algorithms"
        >
          <Users size={15} />
          <span>Q2 · Multi Robot</span>
        </button>
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
          <span>{isQ2 ? 'Auto Benchmark' : 'Auto Experiment'}</span>
          {isAutoRunning && <span className="running-dot" />}
        </button>
      </div>

      <div className="header-badges">
        <div className="badge badge-primary">
          <Layers size={14} />
          <span>Grid: {rows} × {cols}</span>
        </div>

        {isQ2 && (
          <div className="badge badge-primary">
            <Users size={14} />
            <span>{agentCount} robots</span>
          </div>
        )}

        {hasAutoCompleted && (
          <button className="btn btn-accent btn-sm" onClick={openModal} title="View comparison metrics">
            <Award size={15} />
            <span>View Comparison</span>
          </button>
        )}

        <button className="btn btn-secondary btn-sm" onClick={togglePerspective} title="Toggle 2.5D isometric view">
          <Eye size={15} />
          <span>{isIsometric ? '2.5D Isometric' : '2D Top-Down'}</span>
        </button>

        <button className="btn btn-secondary btn-sm" onClick={toggleSound} title="Toggle audio feedback">
          {soundEnabled ? <Volume2 size={15} color="#3b82f6" /> : <VolumeX size={15} color="#94a3b8" />}
        </button>
      </div>
    </header>
  );
};
