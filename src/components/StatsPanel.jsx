import React from 'react';
import { Compass, Footprints, Target, MapPin, Activity } from 'lucide-react';
import { manhattanDistance } from '../utils/pathfinding';

export const StatsPanel = ({ robotPos, goalPos, startPos, steps, visitedCount, status }) => {
  const dist = manhattanDistance(robotPos, goalPos);

  return (
    <div className="glass-panel sidebar-panel">
      <div className="section-title">
        <Activity size={15} />
        <span>Telemetry HUD</span>
      </div>

      <div className="stats-grid">
        {/* Robot Pos Card */}
        <div className="stat-card">
          <div className="stat-icon icon-blue">
            <Compass size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Robot Position</span>
            <span className="stat-value">({robotPos.r}, {robotPos.c})</span>
          </div>
        </div>

        {/* Goal Pos Card */}
        <div className="stat-card">
          <div className="stat-icon icon-red">
            <Target size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Target Goal</span>
            <span className="stat-value">({goalPos.r}, {goalPos.c})</span>
          </div>
        </div>

        {/* Steps Card */}
        <div className="stat-card">
          <div className="stat-icon icon-amber">
            <Footprints size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Steps Moved</span>
            <span className="stat-value">{steps}</span>
          </div>
        </div>

        {/* Visited Cells Card */}
        <div className="stat-card">
          <div className="stat-icon icon-green">
            <MapPin size={18} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Visited Pressed Cells</span>
            <span className="stat-value">{visitedCount}</span>
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Distance Metric */}
      <div className="distance-box">
        <div className="distance-header">
          <span>Remaining Distance (Manhattan):</span>
          <span className="distance-badge">{dist} units</span>
        </div>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${Math.max(0, Math.min(100, 100 - (dist * 10)))}%` 
            }} 
          />
        </div>
      </div>

      <hr className="divider" />

      {/* Developer Algorithm Ready Note */}
      <div className="algo-info-card">
        <h4>⚡ Algorithm Ready Architecture</h4>
        <p>
          This frontend grid is ready for custom pathfinding logic (BFS, DFS, A*, Dijkstra).
          Paths are rendered frame-by-frame with smooth 2.5D cell press state transitions!
        </p>
      </div>
    </div>
  );
};
