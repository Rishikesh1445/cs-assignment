import React from 'react';
import { GridCell } from './GridCell';
import { Robot } from './Robot';

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
  onCellClick
}) => {
  // Compute responsive cell size so the grid spans full screen height/width
  const maxDim = Math.max(rows, cols);
  let cellSize = 64;
  let gap = 10;
  let radius = 16;
  let bezel = 5;

  if (maxDim >= 14) {
    cellSize = 38;
    gap = 5;
    radius = 10;
    bezel = 3;
  } else if (maxDim >= 11) {
    cellSize = 46;
    gap = 6;
    radius = 12;
    bezel = 3.5;
  } else if (maxDim >= 9) {
    cellSize = 54;
    gap = 8;
    radius = 14;
    bezel = 4;
  }

  const gridStyle = {
    '--cell-size': `${cellSize}px`,
    '--grid-gap': `${gap}px`,
    '--cell-radius': `${radius}px`,
    '--bezel-width': `${bezel}px`
  };

  return (
    <div className="grid-viewport-container">
      <div
        className={`grid-board-25d ${isIsometric ? 'isometric-mode' : 'flat-mode'}`}
        style={gridStyle}
      >
        {/* Render Grid Rows & Cells */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="grid-row">
            {Array.from({ length: cols }).map((_, c) => {
              const cellKey = `${r},${c}`;
              const isStart = start.r === r && start.c === c;
              const isGoal = goal.r === r && goal.c === c;
              const isWall = walls.has(cellKey);
              const isVisited = visited.has(cellKey);
              const isPath = pathSet ? pathSet.has(cellKey) : false;
              const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
              const isRobotHere = robotPos.r === r && robotPos.c === c;

              return (
                <GridCell
                  key={cellKey}
                  r={r}
                  c={c}
                  isStart={isStart}
                  isGoal={isGoal}
                  isWall={isWall}
                  isVisited={isVisited}
                  isPath={isPath}
                  isSelected={isSelected}
                  isRobotHere={isRobotHere}
                  onClick={onCellClick}
                />
              );
            })}
          </div>
        ))}

        {/* Upright Floating Robot Layer */}
        <Robot
          r={robotPos.r}
          c={robotPos.c}
          angle={robotAngle}
          cellSize={cellSize}
          gap={gap}
          isIsometric={isIsometric}
        />
      </div>
    </div>
  );
};
