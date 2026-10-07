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
  onClick,
  // ---- Q2 multi-robot extras ----
  mapf = null
}) => {
  let cellClass = 'cell-tile';
  if (isStart) cellClass += ' is-start';
  if (isGoal) cellClass += ' is-goal';
  if (isWall) cellClass += ' is-wall';
  if (isPath && !isStart && !isGoal) cellClass += ' is-path';
  if (isVisited && !isStart && !isGoal && !isPath) cellClass += ' is-visited';
  if (isSelected) cellClass += ' is-selected';

  // Q2: starts / goals / trails / live robots on this cell
  const starts = mapf ? mapf.starts : null;
  const goals = mapf ? mapf.goals : null;
  const trails = mapf ? mapf.trails : null;
  const occupants = mapf ? mapf.occupants : null;
  const highlighted = mapf ? mapf.highlighted : false;
  const collision = occupants && occupants.length > 1;

  return (
    <div
      className={`cell-wrapper ${isSelected ? 'cell-wrapper-selected' : ''}`}
      onClick={() => onClick(r, c)}
      title={`Cell (${r}, ${c})`}
    >
      <div className={cellClass}>
        <div className="cell-inner">
          {isWall && <div className="wall-pattern" />}

          {/* ---------- Q1 single-robot badges ---------- */}
          {!mapf && isStart && (
            <div className="cell-badge-icon" title="Start Location">
              <Flag size={22} color="#ffffff" />
            </div>
          )}
          {!mapf && isGoal && (
            <div className="cell-badge-icon" title="Goal State">
              <Target size={24} color="#ffffff" />
            </div>
          )}

          {isWall && (
            <div className="cell-badge-icon" title="Obstacle Wall">
              <ShieldAlert size={20} color="#94a3b8" />
            </div>
          )}

          {!mapf && isPath && !isStart && !isGoal && !isWall && !isRobotHere && (
            <div className="path-cell-indicator">
              <Sparkles size={14} color="#ffffff" />
            </div>
          )}

          {!mapf && isVisited && !isStart && !isGoal && !isWall && !isPath && !isRobotHere && (
            <div className="visited-trail-dot" />
          )}

          {/* ---------- Q2 multi-robot layers ---------- */}
          {mapf && trails && trails.length > 0 && (
            <>
              <div
                className="route-wash"
                style={{
                  background: trails.length === 1
                    ? trails[0]
                    : `linear-gradient(135deg, ${trails.join(', ')})`
                }}
              />
              <div className="agent-trail-dots">
                {trails.slice(0, 4).map((t, i) => (
                  <span key={i} className="trail-dot" style={{ background: t }} />
                ))}
              </div>
            </>
          )}

          {mapf && starts && starts.length > 0 && (
            <div className="agent-endpoint">
              <span
                className="endpoint-badge"
                style={{ background: starts[0].color }}
                title={`Start of R${starts[0].id + 1}`}
              >
                S{starts.map((s) => s.id + 1).join('/')}
              </span>
            </div>
          )}

          {mapf && goals && goals.length > 0 && !(starts && starts.length > 0) && (
            <div className="agent-endpoint">
              <span
                className="endpoint-badge endpoint-goal"
                style={{ background: goals[0].color }}
                title={`Goal of R${goals[0].id + 1}`}
              >
                G{goals.map((g) => g.id + 1).join('/')}
              </span>
            </div>
          )}

          {mapf && occupants && occupants.length > 0 && (
            <div className="agent-marker">
              <span
                className="agent-disc"
                style={{
                  background: collision
                    ? 'repeating-linear-gradient(45deg, #dc2626 0 6px, #111827 6px 12px)'
                    : occupants[0].color
                }}
                title={collision
                  ? `COLLISION: ${occupants.map((o) => 'R' + (o.id + 1)).join(' & ')}`
                  : `R${occupants[0].id + 1}`}
              >
                {collision ? '!' : `R${occupants[0].id + 1}`}
              </span>
            </div>
          )}

          {mapf && highlighted && <div className="cell-highlight-ring" />}

          <span className="coord-label">{r},{c}</span>
        </div>
      </div>
    </div>
  );
};
