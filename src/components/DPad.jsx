import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation } from 'lucide-react';

export const DPad = ({ onMove, disabled }) => {
  return (
    <div className="glass-panel dpad-container">
      <div className="dpad-header">
        <Navigation size={16} color="#3b82f6" />
        <span>Manual Drive (D-Pad)</span>
      </div>

      <div className="dpad-grid">
        <div />
        <button
          className="dpad-btn dpad-up"
          onClick={() => onMove(-1, 0, 'UP', 270)}
          disabled={disabled}
          title="Move Up (ArrowUp)"
        >
          <ArrowUp size={20} />
        </button>
        <div />

        <button
          className="dpad-btn dpad-left"
          onClick={() => onMove(0, -1, 'LEFT', 180)}
          disabled={disabled}
          title="Move Left (ArrowLeft)"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="dpad-center" />

        <button
          className="dpad-btn dpad-right"
          onClick={() => onMove(0, 1, 'RIGHT', 0)}
          disabled={disabled}
          title="Move Right (ArrowRight)"
        >
          <ArrowRight size={20} />
        </button>

        <div />
        <button
          className="dpad-btn dpad-down"
          onClick={() => onMove(1, 0, 'DOWN', 90)}
          disabled={disabled}
          title="Move Down (ArrowDown)"
        >
          <ArrowDown size={20} />
        </button>
        <div />
      </div>

      <p className="dpad-hint">Or use Keyboard Arrow Keys</p>
    </div>
  );
};
