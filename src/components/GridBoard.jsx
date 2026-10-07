import React from 'react';
import { GridCell } from './GridCell';
import { Robot } from './Robot';
import { AGENT_COLORS } from '../utils/mapf';

export const GridBoard = ({
  rows,
  cols,
  start,
  goal,
  walls,
  visited,
  pathSet,
  selectedCell,
  robotPos,
  robotAngle,
  isIsometric,
  onCellClick,
  // ---- Q2 ----
  question = 'Q1',
  agents = [],
  agentPaths = null,
  agentPositions = null,
  highlightCells = null
}) => {
  const maxDim = Math.max(rows, cols);
  let cellSize = 64;
  let gap = 10;
  let radius = 16;
  let bezel = 5;

  if (maxDim >= 14) { cellSize = 38; gap = 5; radius = 10; bezel = 3; }
  else if (maxDim >= 11) { cellSize = 46; gap = 6; radius = 12; bezel = 3.5; }
  else if (maxDim >= 9) { cellSize = 54; gap = 8; radius = 14; bezel = 4; }

  const gridStyle = {
    '--cell-size': `${cellSize}px`,
    '--grid-gap': `${gap}px`,
    '--cell-radius': `${radius}px`,
    '--bezel-width': `${bezel}px`
  };

  const isQ2 = question === 'Q2';

  // ---- Pre-index the Q2 overlays by cell so each cell lookup is O(1) ----
  const mapfIndex = React.useMemo(() => {
    if (!isQ2) return null;
    const starts = new Map();
    const goals = new Map();
    const trails = new Map();
    const occupants = new Map();
    const hl = new Set();

    const colorOf = (ag) => AGENT_COLORS[ag.id % AGENT_COLORS.length].hex;
    const push = (map, key, val) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(val);
    };

    agents.forEach((ag) => {
      const col = colorOf(ag);
      push(starts, `${ag.start.r},${ag.start.c}`, { id: ag.id, color: col });
      push(goals, `${ag.goal.r},${ag.goal.c}`, { id: ag.id, color: col });
    });

    if (agentPaths) {
      agentPaths.forEach((p, i) => {
        if (!p || !agents[i]) return;
        const col = colorOf(agents[i]);
        p.forEach((n) => {
          const k = `${n.r},${n.c}`;
          if (!trails.has(k)) trails.set(k, []);
          if (!trails.get(k).includes(col)) trails.get(k).push(col);
        });
      });
    }

    if (agentPositions) {
      agentPositions.forEach((pos, i) => {
        if (!pos || !agents[i]) return;
        push(occupants, `${pos.r},${pos.c}`, { id: agents[i].id, color: colorOf(agents[i]) });
      });
    }

    if (highlightCells) {
      highlightCells.forEach((cl) => { if (cl) hl.add(`${cl.r},${cl.c}`); });
    }

    return { starts, goals, trails, occupants, hl };
  }, [isQ2, agents, agentPaths, agentPositions, highlightCells]);

  return (
    <div className="grid-viewport-container">
      <div
        className={`grid-board-25d ${isIsometric ? 'isometric-mode' : 'flat-mode'}`}
        style={gridStyle}
      >
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="grid-row">
            {Array.from({ length: cols }).map((_, c) => {
              const cellKey = `${r},${c}`;
              const isWall = walls.has(cellKey);
              const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;

              if (isQ2) {
                return (
                  <GridCell
                    key={cellKey}
                    r={r}
                    c={c}
                    isStart={false}
                    isGoal={false}
                    isWall={isWall}
                    isVisited={false}
                    isPath={false}
                    isSelected={isSelected}
                    isRobotHere={false}
                    onClick={onCellClick}
                    mapf={{
                      starts: mapfIndex.starts.get(cellKey) || null,
                      goals: mapfIndex.goals.get(cellKey) || null,
                      trails: mapfIndex.trails.get(cellKey) || null,
                      occupants: mapfIndex.occupants.get(cellKey) || null,
                      highlighted: mapfIndex.hl.has(cellKey)
                    }}
                  />
                );
              }

              return (
                <GridCell
                  key={cellKey}
                  r={r}
                  c={c}
                  isStart={start.r === r && start.c === c}
                  isGoal={goal.r === r && goal.c === c}
                  isWall={isWall}
                  isVisited={visited.has(cellKey)}
                  isPath={pathSet ? pathSet.has(cellKey) : false}
                  isSelected={isSelected}
                  isRobotHere={robotPos.r === r && robotPos.c === c}
                  onClick={onCellClick}
                />
              );
            })}
          </div>
        ))}

        {/* Single upright robot is a Q1-only flourish */}
        {!isQ2 && (
          <Robot
            r={robotPos.r}
            c={robotPos.c}
            angle={robotAngle}
            cellSize={cellSize}
            gap={gap}
            isIsometric={isIsometric}
          />
        )}
      </div>
    </div>
  );
};
