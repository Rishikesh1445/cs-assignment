import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { GridBoard } from './components/GridBoard';
import { ManualControls } from './components/ManualControls';
import { AutoControls } from './components/AutoControls';
import { HeuristicCalcPanel } from './components/HeuristicCalcPanel';
import { ComparisonModal } from './components/ComparisonModal';

import {
  runAStarSearch,
  generateRandomSolvableGrid,
  calculateCellHeuristics
} from './utils/pathfinding';
import { sound } from './utils/sound';

import './styles/app.css';
import './styles/grid.css';

export function App() {
  // App Modes: 'MANUAL' | 'AUTO'
  const [appMode, setAppMode] = useState('MANUAL');

  // Grid Dimensions & State
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(8);
  const [start, setStart] = useState({ r: 0, c: 0 });
  const [goal, setGoal] = useState({ r: 7, c: 7 });
  const [walls, setWalls] = useState(new Set());

  // Interactive Click Mode: 'INSPECT' | 'START' | 'GOAL' | 'WALL'
  const [clickMode, setClickMode] = useState('INSPECT');

  // Selected Cell for Step-by-Step Math Inspector
  const [selectedCell, setSelectedCell] = useState(null);
  const [calcData, setCalcData] = useState(null);

  // Active Heuristic Selection for Manual Mode: 'H1' | 'H2' | 'H3' | 'H4' | 'H5'
  const [heuristic, setHeuristic] = useState('H1');

  // Robot Dynamic State
  const [robotPos, setRobotPos] = useState({ r: 0, c: 0 });
  const [robotAngle, setRobotAngle] = useState(0);
  const [visited, setVisited] = useState(new Set(['0,0']));
  const [pathSet, setPathSet] = useState(null);

  // App Settings & Flags
  const [isIsometric, setIsIsometric] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('Ready — Click any cell to view math calculations or run A* Pathfinding');

  // Auto Benchmark Experiment State
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoIteration, setAutoIteration] = useState(0);
  const [autoStats, setAutoStats] = useState(null);
  const [lastAStarResult, setLastAStarResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);

  const animationTimerRef = useRef(null);

  // Sync sound settings
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Adjust Start/Goal bounds when dimensions shrink
  useEffect(() => {
    if (start.r >= rows || start.c >= cols) {
      setStart({ r: 0, c: 0 });
      setRobotPos({ r: 0, c: 0 });
    }
    if (goal.r >= rows || goal.c >= cols) {
      setGoal({ r: rows - 1, c: cols - 1 });
    }
  }, [rows, cols, start, goal]);

  // Update calculation breakdown when selected cell, start, goal, or walls change
  useEffect(() => {
    if (selectedCell) {
      const data = calculateCellHeuristics(selectedCell, goal, start, rows, cols, walls);
      setCalcData(data);
    }
  }, [selectedCell, goal, start, rows, cols, walls]);

  // Reset Robot to Start Position
  const resetRobot = useCallback(() => {
    if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    setIsRunning(false);
    setRobotPos({ r: start.r, c: start.c });
    setRobotAngle(0);
    setVisited(new Set([`${start.r},${start.c}`]));
    setPathSet(null);
    setStatusText('Robot reset to Start position');
  }, [start]);

  // Clear Walls
  const clearWalls = () => {
    setWalls(new Set());
    setSelectedCell(null);
    setCalcData(null);
    setStatusText('All walls cleared');
  };

  // Randomize Obstacles in Manual Mode
  const handleRandomizeObstacles = () => {
    if (isRunning) return;
    const randomGrid = generateRandomSolvableGrid(rows, Math.max(rows, cols), 0.22);
    setWalls(randomGrid.walls);
    setStart(randomGrid.start);
    setGoal(randomGrid.goal);
    setRobotPos(randomGrid.start);
    setVisited(new Set([`${randomGrid.start.r},${randomGrid.start.c}`]));
    setPathSet(null);
    setSelectedCell(null);
    setCalcData(null);
    setStatusText('Randomized grid obstacles and start/goal positions');
    sound.playStep();
  };

  // Cell Click Handler
  const handleCellClick = (r, c) => {
    if (isRunning || isAutoRunning) return;
    const key = `${r},${c}`;

    if (clickMode === 'INSPECT') {
      setSelectedCell({ r, c });
      const data = calculateCellHeuristics({ r, c }, goal, start, rows, cols, walls);
      setCalcData(data);
      setStatusText(`Inspecting heuristic math steps for cell (${r}, ${c})`);
      sound.playStep();
    } else if (clickMode === 'START') {
      setStart({ r, c });
      setRobotPos({ r, c });
      setVisited(new Set([key]));
      setPathSet(null);
      setStatusText(`Start set to (${r}, ${c})`);
    } else if (clickMode === 'GOAL') {
      setGoal({ r, c });
      setPathSet(null);
      setStatusText(`Goal set to (${r}, ${c})`);
    } else if (clickMode === 'WALL') {
      if ((r === start.r && c === start.c) || (r === goal.r && c === goal.c)) return;
      setWalls((prevWalls) => {
        const nextWalls = new Set(prevWalls);
        if (nextWalls.has(key)) {
          nextWalls.delete(key);
          setStatusText(`Wall removed at (${r}, ${c})`);
        } else {
          nextWalls.add(key);
          sound.playWall();
          setStatusText(`Wall placed at (${r}, ${c})`);
        }
        return nextWalls;
      });
    }
  };

  // Run Manual A* Pathfinding Animation
  const handleSolveAStar = () => {
    if (isRunning || isAutoRunning) return;

    const res = runAStarSearch(start, goal, rows, cols, walls, heuristic);

    if (!res.found || !res.path || res.path.length <= 0) {
      setStatusText('❌ No valid path found from Start to Goal!');
      sound.playWall();
      return;
    }

    setIsRunning(true);
    setStatusText(`🤖 Animating A* path (${heuristic}) ... Path Length: ${res.pathLength} steps`);

    const pathKeys = new Set(res.path.map((node) => `${node.r},${node.c}`));
    setPathSet(pathKeys);

    let idx = 0;
    animationTimerRef.current = setInterval(() => {
      if (idx >= res.path.length) {
        clearInterval(animationTimerRef.current);
        setIsRunning(false);
        setStatusText(`🎉 Goal Reached using ${heuristic}! Path length: ${res.pathLength} steps.`);
        sound.playGoal();
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
        return;
      }

      const node = res.path[idx];
      setRobotPos({ r: node.r, c: node.c });
      setRobotAngle(node.angle || 0);
      setVisited((v) => new Set(v).add(`${node.r},${node.c}`));
      sound.playStep();

      idx++;
    }, 120);
  };

  // -------------------------------------------------------------
  // AUTO MODE: Run 10 Benchmark Iterations across 5 Heuristics
  // -------------------------------------------------------------
  const handleStartAutoExperiment = async () => {
    if (isAutoRunning) return;

    setIsAutoRunning(true);
    setHasAutoCompleted(false);
    setAutoIteration(0);
    setStatusText('⚡ Starting 10-Iteration Heuristics Benchmark (5 Algos)...');

    const benchmarkRuns = [];

    for (let iter = 1; iter <= 10; iter++) {
      setAutoIteration(iter);

      const randGrid = generateRandomSolvableGrid(7, 12, 0.20);
      setRows(randGrid.rows);
      setCols(randGrid.cols);
      setStart(randGrid.start);
      setGoal(randGrid.goal);
      setWalls(randGrid.walls);
      setRobotPos(randGrid.start);
      setVisited(new Set([`${randGrid.start.r},${randGrid.start.c}`]));

      // Evaluate all 5 heuristics on THIS EXACT SAME GRID
      const resH1 = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, 'H1');
      const resH2 = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, 'H2');
      const resH3 = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, 'H3');
      const resH4 = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, 'H4');
      const resH5 = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, 'H5');

      const baselineLen = resH1.pathLength > 0 ? resH1.pathLength : 1;

      benchmarkRuns.push({
        iter,
        gridSize: `${randGrid.rows}x${randGrid.cols}`,
        h1: { ...resH1, optimalityRatio: 1.00 },
        h2: { ...resH2, optimalityRatio: resH2.pathLength / baselineLen },
        h3: { ...resH3, optimalityRatio: resH3.pathLength / baselineLen },
        h4: { ...resH4, optimalityRatio: resH4.pathLength / baselineLen },
        h5: { ...resH5, optimalityRatio: resH5.pathLength / baselineLen }
      });

      setLastAStarResult(resH1);
      sound.playStep();

      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    // Compute aggregated averages across 10 iterations for all 5 heuristics
    const calcAvg = (key, prop) => benchmarkRuns.reduce((acc, r) => acc + r[key][prop], 0) / 10;

    const statsSummary = [
      {
        id: 'H1',
        name: 'H1: Manhattan Distance',
        avgTime: calcAvg('h1', 'executionTimeMs'),
        avgLength: calcAvg('h1', 'pathLength'),
        avgExpanded: calcAvg('h1', 'expandedNodes'),
        avgOptimalityRatio: 1.00
      },
      {
        id: 'H2',
        name: 'H2: Goal-Direction / Angular',
        avgTime: calcAvg('h2', 'executionTimeMs'),
        avgLength: calcAvg('h2', 'pathLength'),
        avgExpanded: calcAvg('h2', 'expandedNodes'),
        avgOptimalityRatio: calcAvg('h2', 'optimalityRatio')
      },
      {
        id: 'H3',
        name: 'H3: Obstacle-Aware Manhattan',
        avgTime: calcAvg('h3', 'executionTimeMs'),
        avgLength: calcAvg('h3', 'pathLength'),
        avgExpanded: calcAvg('h3', 'expandedNodes'),
        avgOptimalityRatio: calcAvg('h3', 'optimalityRatio')
      },
      {
        id: 'H4',
        name: 'H4: Euclidean Distance',
        avgTime: calcAvg('h4', 'executionTimeMs'),
        avgLength: calcAvg('h4', 'pathLength'),
        avgExpanded: calcAvg('h4', 'expandedNodes'),
        avgOptimalityRatio: calcAvg('h4', 'optimalityRatio')
      },
      {
        id: 'H5',
        name: 'H5: Chebyshev Distance',
        avgTime: calcAvg('h5', 'executionTimeMs'),
        avgLength: calcAvg('h5', 'pathLength'),
        avgExpanded: calcAvg('h5', 'expandedNodes'),
        avgOptimalityRatio: calcAvg('h5', 'optimalityRatio')
      }
    ];

    setAutoStats(statsSummary);
    setIsAutoRunning(false);
    setHasAutoCompleted(true);
    setStatusText('🎉 Benchmark Completed! Opening Comparison Metrics Dialog...');
    sound.playGoal();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 }
    });

    setIsModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Top Header Card */}
      <Header
        appMode={appMode}
        setAppMode={setAppMode}
        isIsometric={isIsometric}
        togglePerspective={() => setIsIsometric(!isIsometric)}
        soundEnabled={soundEnabled}
        toggleSound={() => setSoundEnabled(!soundEnabled)}
        rows={rows}
        cols={cols}
        status={statusText}
        isAutoRunning={isAutoRunning}
        openModal={() => setIsModalOpen(true)}
        hasAutoCompleted={hasAutoCompleted}
      />

      {/* Main Edge-to-Edge Grid Workspace */}
      <main className="main-layout-fullscreen">
        {/* Left Side Floating Control Panel */}
        <aside className="left-controls-drawer">
          {appMode === 'MANUAL' ? (
            <ManualControls
              rows={rows}
              cols={cols}
              setRows={setRows}
              setCols={setCols}
              heuristic={heuristic}
              setHeuristic={setHeuristic}
              mode={clickMode}
              setMode={setClickMode}
              isRunning={isRunning || isAutoRunning}
              onRandomizeObstacles={handleRandomizeObstacles}
              onSolveAStar={handleSolveAStar}
              onResetRobot={resetRobot}
              onClearWalls={clearWalls}
            />
          ) : (
            <AutoControls
              isAutoRunning={isAutoRunning}
              currentIteration={autoIteration}
              totalIterations={10}
              onStartAutoExperiment={handleStartAutoExperiment}
              openModal={() => setIsModalOpen(true)}
              hasAutoCompleted={hasAutoCompleted}
              autoStats={autoStats}
            />
          )}
        </aside>

        {/* Center Grid Viewport (Spans entire screen) */}
        <section className="grid-viewport-workspace">
          <GridBoard
            rows={rows}
            cols={cols}
            start={start}
            goal={goal}
            walls={walls}
            visited={visited}
            pathSet={pathSet}
            selectedCell={selectedCell}
            robotPos={robotPos}
            robotAngle={robotAngle}
            isIsometric={isIsometric}
            onCellClick={handleCellClick}
          />

          {/* Toast Status Message Banner */}
          <div className="toast-banner">
            <span>{statusText}</span>
          </div>
        </section>

        {/* Right Side Heuristic Math Inspector & Telemetry */}
        <aside className="right-calc-drawer">
          <HeuristicCalcPanel
            appMode={appMode}
            selectedCell={selectedCell}
            calcData={calcData}
            robotPos={robotPos}
            goal={goal}
            activeHeuristic={heuristic}
            lastAStarResult={lastAStarResult}
            isAutoRunning={isAutoRunning}
            currentIteration={autoIteration}
          />
        </aside>
      </main>

      {/* End-of-Benchmark Metrics Comparison Modal Dialog */}
      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        autoStats={autoStats}
      />
    </div>
  );
}

export default App;
