import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { GridBoard } from './components/GridBoard';
import { ManualControls } from './components/ManualControls';
import { AutoControls } from './components/AutoControls';
import { HeuristicCalcPanel } from './components/HeuristicCalcPanel';
import { ComparisonModal } from './components/ComparisonModal';
import { MultiAgentControls } from './components/MultiAgentControls';
import { MapfAutoControls } from './components/MapfAutoControls';
import { MapfCalcPanel } from './components/MapfCalcPanel';
import { MapfComparisonModal } from './components/MapfComparisonModal';

import {
  runAStarSearch,
  generateRandomSolvableGrid,
  calculateCellHeuristics
} from './utils/pathfinding';
import {
  runMapfAlgorithm,
  generateMapfScenario,
  makeDefaultAgents,
  MAPF_ALGORITHMS,
  AGENT_COLORS
} from './utils/mapf';
import { sound } from './utils/sound';

import './styles/app.css';
import './styles/grid.css';
import './styles/mapf.css';

const MAPF_BENCH_ITERATIONS = 10;

export function App() {
  // Which assignment question is on screen: 'Q1' | 'Q2'
  const [question, setQuestion] = useState('Q1');
  // App Modes: 'MANUAL' | 'AUTO'
  const [appMode, setAppMode] = useState('MANUAL');

  // ---------------- Shared grid state ----------------
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(8);
  const [walls, setWalls] = useState(new Set());

  // ---------------- Q1 state ----------------
  const [start, setStart] = useState({ r: 0, c: 0 });
  const [goal, setGoal] = useState({ r: 7, c: 7 });
  const [clickMode, setClickMode] = useState('INSPECT');
  const [selectedCell, setSelectedCell] = useState(null);
  const [calcData, setCalcData] = useState(null);
  const [heuristic, setHeuristic] = useState('H1');
  const [robotPos, setRobotPos] = useState({ r: 0, c: 0 });
  const [robotAngle, setRobotAngle] = useState(0);
  const [visited, setVisited] = useState(new Set(['0,0']));
  const [pathSet, setPathSet] = useState(null);

  // ---------------- Q2 (MAPF) state ----------------
  const [agentCount, setAgentCount] = useState(4);
  const [agents, setAgents] = useState(() => makeDefaultAgents(4, 8, 8));
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [mapfClickMode, setMapfClickMode] = useState('AGENT_START');
  const [mapfAlgorithm, setMapfAlgorithm] = useState('A3');
  const [mapfResult, setMapfResult] = useState(null);
  const [traceIndex, setTraceIndex] = useState(0);
  const [isPlayingTrace, setIsPlayingTrace] = useState(false);
  const [traceSpeed, setTraceSpeed] = useState(650);

  const [mapfAutoStats, setMapfAutoStats] = useState(null);
  const [isMapfModalOpen, setIsMapfModalOpen] = useState(false);
  const [hasMapfAutoCompleted, setHasMapfAutoCompleted] = useState(false);

  // ---------------- Shared flags ----------------
  const [isIsometric, setIsIsometric] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState(
    'Ready — Click any cell to view math calculations or run A* Pathfinding'
  );

  // ---------------- Q1 auto benchmark ----------------
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoIteration, setAutoIteration] = useState(0);
  const [autoStats, setAutoStats] = useState(null);
  const [lastAStarResult, setLastAStarResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);

  const animationTimerRef = useRef(null);
  const isQ2 = question === 'Q2';

  useEffect(() => { sound.enabled = soundEnabled; }, [soundEnabled]);

  // Keep Q1 start/goal inside the grid when it shrinks
  useEffect(() => {
    if (start.r >= rows || start.c >= cols) {
      setStart({ r: 0, c: 0 });
      setRobotPos({ r: 0, c: 0 });
    }
    if (goal.r >= rows || goal.c >= cols) {
      setGoal({ r: rows - 1, c: cols - 1 });
    }
  }, [rows, cols, start, goal]);

  useEffect(() => {
    if (selectedCell) {
      setCalcData(calculateCellHeuristics(selectedCell, goal, start, rows, cols, walls));
    }
  }, [selectedCell, goal, start, rows, cols, walls]);

  // ---------------------------------------------------------------
  // Q2 — keep the agent list consistent with count / grid size
  // ---------------------------------------------------------------
  useEffect(() => {
    setAgents((prev) => {
      const next = [];
      const used = new Set();
      const free = (cell) => {
        const k = `${cell.r},${cell.c}`;
        return cell.r >= 0 && cell.r < rows && cell.c >= 0 && cell.c < cols &&
          !walls.has(k) && !used.has(k);
      };
      const findFree = (preferR, preferC) => {
        for (let d = 0; d < rows * cols; d++) {
          const r = (preferR + Math.floor(d / cols)) % rows;
          const c = (preferC + d) % cols;
          if (free({ r, c })) return { r, c };
        }
        return { r: 0, c: 0 };
      };

      for (let i = 0; i < agentCount; i++) {
        const old = prev[i];
        let s = old && free(old.start) ? old.start : findFree(i % rows, 0);
        used.add(`${s.r},${s.c}`);
        let g = old && free(old.goal) ? old.goal : findFree((rows - 1 - (i % rows)) % rows, cols - 1);
        used.add(`${g.r},${g.c}`);
        next.push({ id: i, start: s, goal: g, color: AGENT_COLORS[i % AGENT_COLORS.length].hex });
      }
      return next;
    });
    setSelectedAgent((s) => Math.min(s, agentCount - 1));
  }, [agentCount, rows, cols, walls]);

  // Reset the plan whenever the problem definition changes
  useEffect(() => {
    setMapfResult(null);
    setTraceIndex(0);
    setIsPlayingTrace(false);
  }, [agents, rows, cols, walls, mapfAlgorithm]);

  // ---------------------------------------------------------------
  // Q2 — trace playback engine
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isPlayingTrace || !mapfResult) return undefined;
    const total = mapfResult.trace.steps.length;
    if (traceIndex >= total - 1) { setIsPlayingTrace(false); return undefined; }
    const id = setTimeout(() => {
      setTraceIndex((i) => Math.min(total - 1, i + 1));
      sound.playStep();
    }, traceSpeed);
    return () => clearTimeout(id);
  }, [isPlayingTrace, traceIndex, traceSpeed, mapfResult]);

  /** What the grid should show at the current trace step. */
  const mapfView = useMemo(() => {
    if (!mapfResult) {
      return { paths: null, positions: agents.map((a) => a.start), highlights: [] };
    }
    const steps = mapfResult.trace.steps;
    const idx = Math.min(traceIndex, steps.length - 1);

    // paths discovered so far, replayed from the start of the trace
    const shown = new Array(agents.length).fill(null);
    for (let i = 0; i <= idx; i++) {
      const h = steps[i].highlight;
      if (!h) continue;
      if (h.paths) {
        h.paths.forEach((p, ai) => { if (p) shown[ai] = p; });
      }
      if (h.path && h.agentId !== undefined && h.agentId !== null) {
        const ai = agents.findIndex((a) => a.id === h.agentId);
        if (ai >= 0) shown[ai] = h.path;
      }
    }

    const step = steps[idx];
    let positions;
    if (step.k === 'EXEC' && step.positions) {
      positions = step.positions;
    } else if (step.k === 'EXEC_HEAD') {
      positions = agents.map((a) => a.start);
    } else {
      positions = agents.map((a) => a.start);
    }

    const highlights = (step.highlight && step.highlight.cells) || [];
    return { paths: shown, positions, highlights };
  }, [mapfResult, traceIndex, agents]);

  // ---------------------------------------------------------------
  // Q1 handlers (unchanged behaviour)
  // ---------------------------------------------------------------
  const resetRobot = useCallback(() => {
    if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    setIsRunning(false);
    setRobotPos({ r: start.r, c: start.c });
    setRobotAngle(0);
    setVisited(new Set([`${start.r},${start.c}`]));
    setPathSet(null);
    setStatusText('Robot reset to Start position');
  }, [start]);

  const clearWalls = () => {
    setWalls(new Set());
    setSelectedCell(null);
    setCalcData(null);
    setStatusText('All walls cleared');
  };

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
    setPathSet(new Set(res.path.map((n) => `${n.r},${n.c}`)));

    let idx = 0;
    animationTimerRef.current = setInterval(() => {
      if (idx >= res.path.length) {
        clearInterval(animationTimerRef.current);
        setIsRunning(false);
        setStatusText(`🎉 Goal Reached using ${heuristic}! Path length: ${res.pathLength} steps.`);
        sound.playGoal();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
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

  // ---------------------------------------------------------------
  // Q2 handlers
  // ---------------------------------------------------------------
  const handleRunMapf = () => {
    if (isRunning || isAutoRunning) return;
    const algo = MAPF_ALGORITHMS.find((a) => a.id === mapfAlgorithm);
    setStatusText(`⚙️ Running ${algo.id} — ${algo.name} …`);

    try {
      const out = runMapfAlgorithm(mapfAlgorithm, agents, rows, cols, walls, {});
      setMapfResult(out);
      setTraceIndex(0);
      setIsPlayingTrace(false);

      const m = out.metrics;
      if (!m.solved) {
        setStatusText(`⚠️ ${algo.short}: no complete solution found — step through the trace to see where it failed.`);
        sound.playWall();
      } else if (m.collisions > 0) {
        setStatusText(`⚠️ ${algo.short}: all robots routed but ${m.collisions} collisions remain — this plan cannot be executed.`);
        sound.playWall();
      } else {
        setStatusText(`✅ ${algo.short}: collision-free. Cost ${m.totalCost}, makespan ${m.makespan}. Press Next or Play in the right panel.`);
        sound.playGoal();
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      setStatusText(`❌ ${algo.short} failed: ${err.message}`);
    }
  };

  const handleRandomizeMapfScenario = () => {
    if (isRunning || isAutoRunning) return;
    const sc = generateMapfScenario(rows, cols, agentCount, 0.16);
    setWalls(sc.walls);
    setAgents(sc.agents);
    setMapfResult(null);
    setTraceIndex(0);
    setStatusText(`Randomised a ${rows}×${cols} scenario with ${agentCount} robots`);
    sound.playStep();
  };

  const handleResetAgents = () => {
    setAgents(makeDefaultAgents(agentCount, rows, cols));
    setMapfResult(null);
    setTraceIndex(0);
    setStatusText('Robots reset to default start/goal positions');
  };

  const handleMapfCellClick = (r, c) => {
    if (isRunning || isAutoRunning) return;
    const key = `${r},${c}`;

    if (mapfClickMode === 'WALL') {
      const onAgent = agents.some(
        (a) => (a.start.r === r && a.start.c === c) || (a.goal.r === r && a.goal.c === c)
      );
      if (onAgent) {
        setStatusText('Cannot place a wall on a robot start or goal cell');
        return;
      }
      setWalls((prev) => {
        const next = new Set(prev);
        if (next.has(key)) { next.delete(key); setStatusText(`Wall removed at (${r}, ${c})`); }
        else { next.add(key); sound.playWall(); setStatusText(`Wall placed at (${r}, ${c})`); }
        return next;
      });
      return;
    }

    if (walls.has(key)) {
      setStatusText('That cell is a wall — pick a free cell');
      return;
    }

    const field = mapfClickMode === 'AGENT_START' ? 'start' : 'goal';
    const clash = agents.find((a, i) => i !== selectedAgent && a[field].r === r && a[field].c === c);
    if (clash) {
      setStatusText(`R${clash.id + 1} already uses (${r}, ${c}) as its ${field}`);
      return;
    }

    setAgents((prev) => prev.map((a, i) => (i === selectedAgent ? { ...a, [field]: { r, c } } : a)));
    setStatusText(`R${agents[selectedAgent].id + 1} ${field} set to (${r}, ${c})`);
    sound.playStep();
  };

  const handleCellClick = (r, c) => {
    if (isQ2) return handleMapfCellClick(r, c);
    if (isRunning || isAutoRunning) return;
    const key = `${r},${c}`;

    if (clickMode === 'INSPECT') {
      setSelectedCell({ r, c });
      setCalcData(calculateCellHeuristics({ r, c }, goal, start, rows, cols, walls));
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
        if (nextWalls.has(key)) { nextWalls.delete(key); setStatusText(`Wall removed at (${r}, ${c})`); }
        else { nextWalls.add(key); sound.playWall(); setStatusText(`Wall placed at (${r}, ${c})`); }
        return nextWalls;
      });
    }
  };

  // ---------------------------------------------------------------
  // Q1 AUTO: 10 iterations x 5 heuristics
  // ---------------------------------------------------------------
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

      const resAll = {};
      ['H1', 'H2', 'H3', 'H4', 'H5'].forEach((h) => {
        resAll[h] = runAStarSearch(randGrid.start, randGrid.goal, randGrid.rows, randGrid.cols, randGrid.walls, h);
      });
      const baselineLen = resAll.H1.pathLength > 0 ? resAll.H1.pathLength : 1;

      benchmarkRuns.push({
        iter,
        h1: { ...resAll.H1, optimalityRatio: 1.0 },
        h2: { ...resAll.H2, optimalityRatio: resAll.H2.pathLength / baselineLen },
        h3: { ...resAll.H3, optimalityRatio: resAll.H3.pathLength / baselineLen },
        h4: { ...resAll.H4, optimalityRatio: resAll.H4.pathLength / baselineLen },
        h5: { ...resAll.H5, optimalityRatio: resAll.H5.pathLength / baselineLen }
      });

      setLastAStarResult(resAll.H1);
      sound.playStep();
      await new Promise((r) => setTimeout(r, 180));
    }

    const calcAvg = (key, prop) => benchmarkRuns.reduce((acc, r) => acc + r[key][prop], 0) / 10;
    const names = {
      h1: 'H1: Manhattan Distance',
      h2: 'H2: Goal-Direction / Angular',
      h3: 'H3: Obstacle-Aware Manhattan',
      h4: 'H4: Euclidean Distance',
      h5: 'H5: Chebyshev Distance'
    };
    const statsSummary = ['h1', 'h2', 'h3', 'h4', 'h5'].map((k) => ({
      id: k.toUpperCase(),
      name: names[k],
      avgTime: calcAvg(k, 'executionTimeMs'),
      avgLength: calcAvg(k, 'pathLength'),
      avgExpanded: calcAvg(k, 'expandedNodes'),
      avgOptimalityRatio: calcAvg(k, 'optimalityRatio')
    }));

    setAutoStats(statsSummary);
    setIsAutoRunning(false);
    setHasAutoCompleted(true);
    setStatusText('🎉 Benchmark Completed! Opening Comparison Metrics Dialog...');
    sound.playGoal();
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    setIsModalOpen(true);
  };

  // ---------------------------------------------------------------
  // Q2 AUTO: N scenarios x 4 algorithms (same scenario for all four)
  // ---------------------------------------------------------------
  const handleStartMapfBenchmark = async () => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    setHasMapfAutoCompleted(false);
    setAutoIteration(0);
    setMapfAutoStats(null);
    setStatusText(`⚡ Benchmarking 4 MAPF algorithms over ${MAPF_BENCH_ITERATIONS} scenarios…`);

    const ids = MAPF_ALGORITHMS.map((a) => a.id);
    const acc = {};
    ids.forEach((id) => {
      acc[id] = { solved: 0, cost: 0, makespan: 0, waits: 0, collisions: 0, expanded: 0, time: 0, n: 0 };
    });

    const aggregate = () => ids.map((id) => {
      const a = acc[id];
      const info = MAPF_ALGORITHMS.find((x) => x.id === id);
      const solvedN = Math.max(1, a.solved);
      return {
        id,
        short: info.short,
        name: info.name,
        solveRate: a.n ? a.solved / a.n : 0,
        avgCost: a.cost / solvedN,
        avgMakespan: a.makespan / solvedN,
        avgWaits: a.waits / solvedN,
        avgCollisions: a.n ? a.collisions / a.n : 0,
        avgExpanded: a.n ? a.expanded / a.n : 0,
        avgTime: a.n ? a.time / a.n : 0
      };
    });

    for (let iter = 1; iter <= MAPF_BENCH_ITERATIONS; iter++) {
      setAutoIteration(iter);

      // vary grid size and obstacle layout across iterations
      const gr = 7 + Math.floor(Math.random() * 6);
      const gc = 7 + Math.floor(Math.random() * 6);
      const density = 0.10 + Math.random() * 0.14;
      const sc = generateMapfScenario(gr, gc, agentCount, density);

      setRows(sc.rows);
      setCols(sc.cols);
      setWalls(sc.walls);
      setAgents(sc.agents);

      ids.forEach((id) => {
        const t0 = performance.now();
        const out = runMapfAlgorithm(id, sc.agents, sc.rows, sc.cols, sc.walls, { traceLimit: 40 });
        const elapsed = performance.now() - t0;
        const m = out.metrics;
        const a = acc[id];
        a.n++;
        a.time += elapsed;
        a.expanded += m.expanded || 0;
        a.collisions += m.collisions;
        if (m.solved) {
          a.solved++;
          a.cost += m.totalCost;
          a.makespan += m.makespan;
          a.waits += m.waits;
        }
      });

      setMapfAutoStats(aggregate());
      sound.playStep();
      await new Promise((r) => setTimeout(r, 140));
    }

    setMapfAutoStats(aggregate());
    setIsAutoRunning(false);
    setHasMapfAutoCompleted(true);
    setStatusText('🎉 Algorithm benchmark complete — opening the comparison dialog.');
    sound.playGoal();
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    setIsMapfModalOpen(true);
  };

  // ---------------------------------------------------------------
  const switchQuestion = (q) => {
    if (isAutoRunning || isRunning) return;
    setQuestion(q);
    setAppMode('MANUAL');
    setIsPlayingTrace(false);
    if (q === 'Q2') {
      setMapfResult(null);
      setTraceIndex(0);
      setStatusText('Q2 — set each robot’s start and goal, pick an algorithm, then press Run.');
    } else {
      setStatusText('Q1 — click any cell to view heuristic math or run A* pathfinding.');
    }
  };

  const anyAutoCompleted = isQ2 ? hasMapfAutoCompleted : hasAutoCompleted;
  const openAnyModal = () => (isQ2 ? setIsMapfModalOpen(true) : setIsModalOpen(true));

  return (
    <div className="app-container">
      <Header
        question={question}
        setQuestion={switchQuestion}
        appMode={appMode}
        setAppMode={setAppMode}
        isIsometric={isIsometric}
        togglePerspective={() => setIsIsometric(!isIsometric)}
        soundEnabled={soundEnabled}
        toggleSound={() => setSoundEnabled(!soundEnabled)}
        rows={rows}
        cols={cols}
        agentCount={agentCount}
        isAutoRunning={isAutoRunning}
        openModal={openAnyModal}
        hasAutoCompleted={anyAutoCompleted}
      />

      <main className="main-layout-fullscreen">
        <aside className="left-controls-drawer">
          {!isQ2 && appMode === 'MANUAL' && (
            <ManualControls
              rows={rows} cols={cols} setRows={setRows} setCols={setCols}
              heuristic={heuristic} setHeuristic={setHeuristic}
              mode={clickMode} setMode={setClickMode}
              isRunning={isRunning || isAutoRunning}
              onRandomizeObstacles={handleRandomizeObstacles}
              onSolveAStar={handleSolveAStar}
              onResetRobot={resetRobot}
              onClearWalls={clearWalls}
            />
          )}

          {!isQ2 && appMode === 'AUTO' && (
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

          {isQ2 && appMode === 'MANUAL' && (
            <MultiAgentControls
              rows={rows} cols={cols} setRows={setRows} setCols={setCols}
              agents={agents}
              agentCount={agentCount} setAgentCount={setAgentCount}
              selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
              algorithm={mapfAlgorithm} setAlgorithm={setMapfAlgorithm}
              mode={mapfClickMode} setMode={setMapfClickMode}
              isRunning={isRunning || isAutoRunning}
              onRandomizeScenario={handleRandomizeMapfScenario}
              onRunAlgorithm={handleRunMapf}
              onResetAgents={handleResetAgents}
              onClearWalls={clearWalls}
            />
          )}

          {isQ2 && appMode === 'AUTO' && (
            <MapfAutoControls
              isAutoRunning={isAutoRunning}
              currentIteration={autoIteration}
              totalIterations={MAPF_BENCH_ITERATIONS}
              agentCount={agentCount}
              setAgentCount={setAgentCount}
              onStartAutoExperiment={handleStartMapfBenchmark}
              openModal={() => setIsMapfModalOpen(true)}
              hasAutoCompleted={hasMapfAutoCompleted}
              autoStats={mapfAutoStats}
            />
          )}
        </aside>

        <section className="grid-viewport-workspace">
          <GridBoard
            rows={rows} cols={cols}
            start={start} goal={goal} walls={walls}
            visited={visited} pathSet={pathSet}
            selectedCell={selectedCell}
            robotPos={robotPos} robotAngle={robotAngle}
            isIsometric={isIsometric}
            onCellClick={handleCellClick}
            question={question}
            agents={agents}
            agentPaths={isQ2 ? mapfView.paths : null}
            agentPositions={isQ2 ? mapfView.positions : null}
            highlightCells={isQ2 ? mapfView.highlights : null}
          />

          {isQ2 && (
            <div className="mapf-legend">
              {agents.map((a) => (
                <span className="mapf-legend-item" key={a.id}>
                  <i
                    className="legend-swatch"
                    style={{ background: AGENT_COLORS[a.id % AGENT_COLORS.length].hex }}
                  />
                  R{a.id + 1}
                </span>
              ))}
              <span className="mapf-legend-item">S = start · G = goal · dots = planned route</span>
            </div>
          )}

          <div className="toast-banner">
            <span>{statusText}</span>
          </div>
        </section>

        <aside className="right-calc-drawer">
          {isQ2 ? (
            <MapfCalcPanel
              algorithm={mapfAlgorithm}
              result={mapfResult}
              traceIndex={traceIndex}
              setTraceIndex={setTraceIndex}
              isPlaying={isPlayingTrace}
              setIsPlaying={setIsPlayingTrace}
              speed={traceSpeed}
              setSpeed={setTraceSpeed}
              agents={agents}
              isRunning={isRunning}
              autoMode={appMode === 'AUTO'}
              autoIteration={autoIteration}
              autoTotal={MAPF_BENCH_ITERATIONS}
              autoStats={mapfAutoStats}
            />
          ) : (
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
          )}
        </aside>
      </main>

      <ComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        autoStats={autoStats}
      />

      <MapfComparisonModal
        isOpen={isMapfModalOpen}
        onClose={() => setIsMapfModalOpen(false)}
        stats={mapfAutoStats}
        iterations={MAPF_BENCH_ITERATIONS}
      />
    </div>
  );
}

export default App;
