import React from 'react';
import {
  Grid, Shuffle, Flag, Target, ShieldAlert, Play, RotateCcw, Trash2,
  Users, Compass, Cpu, Minus, Plus, Lock
} from 'lucide-react';
import { MAPF_ALGORITHMS, AGENT_COLORS, manhattan } from '../utils/mapf';

export const MultiAgentControls = ({
  rows, cols, setRows, setCols,
  agents, agentCount, setAgentCount,
  selectedAgent, setSelectedAgent,
  algorithm, setAlgorithm,
  mode, setMode,
  isRunning,
  onRandomizeScenario,
  onRunAlgorithm,
  onResetAgents,
  onClearWalls
}) => {
  const algoInfo = MAPF_ALGORITHMS.find((a) => a.id === algorithm) || MAPF_ALGORITHMS[0];

  return (
    <div className="glass-panel sidebar-controls-card">
      <div className="panel-header">
        <h3>Multi-Robot Controls</h3>
        <span className="mode-pill q2-pill">Q2 · MAPF</span>
      </div>

      {/* Grid Dimensions */}
      <div className="panel-group">
        <div className="group-title">
          <Grid size={15} />
          <span>Grid Dimensions</span>
        </div>
        <div className="grid-dim-inputs">
          <div className="input-field">
            <label>Rows:</label>
            <input
              type="number" min="5" max="15" value={rows}
              onChange={(e) => setRows(Math.min(15, Math.max(5, parseInt(e.target.value) || 5)))}
              disabled={isRunning}
            />
          </div>
          <div className="input-field">
            <label>Cols:</label>
            <input
              type="number" min="5" max="15" value={cols}
              onChange={(e) => setCols(Math.min(15, Math.max(5, parseInt(e.target.value) || 5)))}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Number of Agents */}
      <div className="panel-group">
        <div className="group-title">
          <Users size={15} />
          <span>Number of Robots</span>
        </div>
        <div className="agent-count-stepper">
          <button
            className="stepper-btn"
            onClick={() => setAgentCount(Math.max(2, agentCount - 1))}
            disabled={isRunning || agentCount <= 2}
            aria-label="Remove a robot"
          >
            <Minus size={16} />
          </button>
          <div className="stepper-value">
            <strong>{agentCount}</strong>
            <span>robots</span>
          </div>
          <button
            className="stepper-btn"
            onClick={() => setAgentCount(Math.min(8, agentCount + 1))}
            disabled={isRunning || agentCount >= 8}
            aria-label="Add a robot"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Algorithm Selector */}
      <div className="panel-group">
        <div className="group-title">
          <Cpu size={15} />
          <span>Select Algorithm (4 Available)</span>
        </div>
        <div className="heuristic-select-wrapper">
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            disabled={isRunning}
            className="custom-select"
          >
            {MAPF_ALGORITHMS.map((a) => (
              <option key={a.id} value={a.id}>{a.id}: {a.name}</option>
            ))}
          </select>
        </div>
        <div className="heuristic-desc-box">
          <p>
            <strong>{algoInfo.formula}</strong>
            <br />
            {algoInfo.blurb}
          </p>
        </div>
      </div>

      {/* Heuristic locked to Manhattan for Q2 */}
      <div className="panel-group">
        <div className="group-title">
          <Compass size={15} />
          <span>Heuristic</span>
        </div>
        <div className="heuristic-select-wrapper locked-select">
          <select className="custom-select" value="H1" disabled onChange={() => {}}>
            <option value="H1">Manhattan Distance (fixed for Q2)</option>
          </select>
          <Lock size={13} className="lock-badge" />
        </div>
        <p className="locked-note">
          Q2 compares <strong>algorithms</strong>, so the heuristic is held constant at Manhattan.
        </p>
      </div>

      <hr className="subtle-divider" />

      {/* Per-agent start/goal editor */}
      <div className="panel-group">
        <div className="group-title">
          <Users size={15} />
          <span>Robot Start &amp; Goal</span>
        </div>
        <p className="locked-note">
          Pick a robot, then click <strong>Set Start</strong> or <strong>Set Goal</strong> and click a grid cell.
        </p>

        <div className="agent-list">
          {agents.map((ag, i) => {
            const col = AGENT_COLORS[ag.id % AGENT_COLORS.length].hex;
            const isSel = selectedAgent === i;
            return (
              <div
                key={ag.id}
                className={`agent-row ${isSel ? 'agent-row-selected' : ''}`}
                onClick={() => !isRunning && setSelectedAgent(i)}
                style={{ '--agent-color': col }}
              >
                <span className="agent-chip" style={{ background: col }}>R{ag.id + 1}</span>
                <div className="agent-coords">
                  <span><Flag size={11} /> ({ag.start.r},{ag.start.c})</span>
                  <span><Target size={11} /> ({ag.goal.r},{ag.goal.c})</span>
                  <span className="agent-dist">d = {manhattan(ag.start, ag.goal)}</span>
                </div>
                <div className="agent-set-btns">
                  <button
                    className={`mini-btn ${isSel && mode === 'AGENT_START' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(i); setMode('AGENT_START'); }}
                    disabled={isRunning}
                    title={`Set start cell for R${ag.id + 1}`}
                  >
                    S
                  </button>
                  <button
                    className={`mini-btn ${isSel && mode === 'AGENT_GOAL' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(i); setMode('AGENT_GOAL'); }}
                    disabled={isRunning}
                    title={`Set goal cell for R${ag.id + 1}`}
                  >
                    G
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Wall / scenario tools */}
      <div className="panel-group">
        <div className="group-title">
          <ShieldAlert size={15} />
          <span>Obstacles</span>
        </div>
        <div className="tool-grid">
          <button
            className={`tool-btn ${mode === 'WALL' ? 'active' : ''}`}
            onClick={() => setMode('WALL')}
            disabled={isRunning}
          >
            <ShieldAlert size={15} color="#64748b" />
            <span>Toggle Wall</span>
          </button>
          <button
            className="tool-btn"
            onClick={onRandomizeScenario}
            disabled={isRunning}
          >
            <Shuffle size={15} color="#f59e0b" />
            <span>Randomise</span>
          </button>
        </div>
      </div>

      <hr className="subtle-divider" />

      {/* Actions */}
      <div className="panel-group action-buttons-group">
        <button
          className="btn btn-primary btn-block"
          onClick={onRunAlgorithm}
          disabled={isRunning}
        >
          <Play size={16} />
          <span>Run {algoInfo.short}</span>
        </button>

        <div className="dual-buttons">
          <button className="btn btn-secondary btn-sm" onClick={onResetAgents} disabled={isRunning}>
            <RotateCcw size={14} />
            <span>Reset Robots</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClearWalls} disabled={isRunning}>
            <Trash2 size={14} />
            <span>Clear Walls</span>
          </button>
        </div>
      </div>
    </div>
  );
};
