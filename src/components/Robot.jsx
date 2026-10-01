import React from 'react';
import robotImg from '../assets/robot.png';

export const Robot = ({ r, c, angle, cellSize, gap, isIsometric }) => {
  // Calculate top/left offset based on row, column, cell size and gap
  const top = r * (cellSize + gap);
  const left = c * (cellSize + gap);

  return (
    <div
      className={`robot-overlay ${isIsometric ? 'upright-isometric' : 'flat-view'}`}
      style={{
        transform: `translate3d(${left}px, ${top}px, 20px)`
      }}
    >
      <div className="robot-container">
        {/* Cyan energy shadow puddle on the tile floor */}
        <div className="robot-shadow-puddle" />

        {/* Upright Standing Robot Avatar */}
        <div className="upright-wrapper">
          <img
            src={robotImg}
            alt="Robot Nav"
            className="robot-avatar"
            style={{
              transform: `rotate(${angle}deg)`
            }}
          />
        </div>
      </div>
    </div>
  );
};
