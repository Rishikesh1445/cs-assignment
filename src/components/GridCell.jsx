import React from 'react';
import { Flag, Target, ShieldAlert, Sparkles } from 'lucide-react';

export const GridCell = ({
  r,
  c,
  isStart,
  isGoal,
  isWall,
  isVisited,
  isPath,
  isSelected,
  isRobotHere,
  onClick
}) => {
  let cellClass = 'cell-tile';
  if (isStart) cellClass += ' is-start';
  if (isGoal) cellClass += ' is-goal';
  if (isWall) cellClass += ' is-wall';
  if (isPath && !isStart && !isGoal) cellClass += ' is-path';
  if (isVisited && !isStart && !isGoal && !isPath) cellClass += ' is-visited';
  if (isSelected) cellClass += ' is-selected';

  return (
    <div
      className={`cell-wrapper ${isSelected ? 'cell-wrapper-selected' : ''}`}
      onClick={() => onClick(r, c)}
      title={`Cell (${r}, ${c})`}
    >
      <div className={cellClass}>
        <div className="cell-inner">
          {/* Wall texture overlay */}
          {isWall && <div className="wall-pattern" />}

          {/* Start Badge */}
          {isStart && (
            <div className="cell-badge-icon" title="Start Location">
              <Flag size={22} color="#ffffff" />
            </div>
          )}

          {/* Goal Badge */}
          {isGoal && (
            <div className="cell-badge-icon" title="Goal State">
              <Target size={24} color="#ffffff" />
            </div>
          )}

          {/* Wall Icon */}
          {isWall && (
            <div className="cell-badge-icon" title="Obstacle Wall">
              <ShieldAlert size={20} color="#94a3b8" />
            </div>
          )}

          {/* Path cell indicator */}
          {isPath && !isStart && !isGoal && !isWall && !isRobotHere && (
            <div className="path-cell-indicator">
              <Sparkles size={14} color="#ffffff" />
            </div>
          )}

          {/* Visited pressed trail indicator */}
          {isVisited && !isStart && !isGoal && !isWall && !isPath && !isRobotHere && (
            <div className="visited-trail-dot" />
          )}

          {/* Grid coordinates label */}
          <span className="coord-label">{r},{c}</span>
        </div>
      </div>
    </div>
  );
};
