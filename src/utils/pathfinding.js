/**
 * Robot Path-finding Problem: A* Search with 5 Heuristics
 * 
 * Heuristic 1 (H1): Manhattan Distance
 * h(n) = |x - x_g| + |y - y_g|
 * 
 * Heuristic 2 (H2): Goal-Direction / Angular Heuristic
 * h(n) = Manhattan(n, g) + \beta * P_direction
 * P_direction = 1 - cos(\theta)
 * 
 * Heuristic 3 (H3): Obstacle-Aware Manhattan Heuristic
 * h(n) = Manhattan(n, g) * (1 + \alpha * D(n))
 * D(n) = nearby_obstacles / nearby_cells
 * 
 * Heuristic 4 (H4): Euclidean Distance
 * h(n) = \sqrt{(x - x_g)^2 + (y - y_g)^2}
 * 
 * Heuristic 5 (H5): Chebyshev Distance
 * h(n) = \max(|x - x_g|, |y - y_g|)
 */

export const isValidMove = (r, c, rows, cols, walls) => {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
  const key = `${r},${c}`;
  return !walls.has(key);
};

export const getNeighbors = (r, c, rows, cols, walls) => {
  const directions = [
    { r: -1, c: 0, dir: 'UP', angle: 270 },
    { r: 0, c: 1, dir: 'RIGHT', angle: 0 },
    { r: 1, c: 0, dir: 'DOWN', angle: 90 },
    { r: 0, c: -1, dir: 'LEFT', angle: 180 }
  ];

  const neighbors = [];
  for (const d of directions) {
    const nr = r + d.r;
    const nc = c + d.c;
    if (isValidMove(nr, nc, rows, cols, walls)) {
      neighbors.push({ r: nr, c: nc, dir: d.dir, angle: d.angle });
    }
  }
  return neighbors;
};

// 1. Manhattan Distance
export const manhattanDistance = (p1, p2) => {
  return Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
};

// 4. Euclidean Distance
export const euclideanDistance = (p1, p2) => {
  const dr = p1.r - p2.r;
  const dc = p1.c - p2.c;
  return Math.sqrt(dr * dr + dc * dc);
};

// 5. Chebyshev Distance
export const chebyshevDistance = (p1, p2) => {
  return Math.max(Math.abs(p1.r - p2.r), Math.abs(p1.c - p2.c));
};

// 2. Goal-Direction / Angular Penalty calculation
export const calculateAngularPenalty = (curr, goal, parent) => {
  const dxGoal = goal.c - curr.c;
  const dyGoal = goal.r - curr.r;

  const dxMove = parent ? curr.c - parent.c : dxGoal;
  const dyMove = parent ? curr.r - parent.r : dyGoal;

  const magGoal = Math.sqrt(dxGoal * dxGoal + dyGoal * dyGoal);
  const magMove = Math.sqrt(dxMove * dxMove + dyMove * dyMove);

  if (magGoal === 0 || magMove === 0) {
    return 0; // At goal or stationary
  }

  const dot = dxGoal * dxMove + dyGoal * dyMove;
  let cosTheta = dot / (magGoal * magMove);
  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  return 1 - cosTheta;
};

// 3. Obstacle Density calculation around cell in 3x3 window
export const calculateObstacleDensity = (r, c, rows, cols, walls) => {
  let obstacleCount = 0;
  let totalValidNeighbors = 0;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        totalValidNeighbors++;
        if (walls.has(`${nr},${nc}`)) {
          obstacleCount++;
        }
      }
    }
  }

  if (totalValidNeighbors === 0) return 0;
  return obstacleCount / totalValidNeighbors;
};

/**
 * Compute heuristic value for a cell with chosen heuristic ID ('H1' | 'H2' | 'H3' | 'H4' | 'H5')
 */
export const computeHeuristicValue = (curr, goal, parent, rows, cols, walls, heuristicType = 'H1', alpha = 1.5, beta = 2.0) => {
  const manhattan = manhattanDistance(curr, goal);

  if (heuristicType === 'H1') {
    return manhattan;
  }

  if (heuristicType === 'H2') {
    const pDir = calculateAngularPenalty(curr, goal, parent);
    return manhattan + beta * pDir;
  }

  if (heuristicType === 'H3') {
    const density = calculateObstacleDensity(curr.r, curr.c, rows, cols, walls);
    return manhattan * (1 + alpha * density);
  }

  if (heuristicType === 'H4') {
    return euclideanDistance(curr, goal);
  }

  if (heuristicType === 'H5') {
    return chebyshevDistance(curr, goal);
  }

  return manhattan;
};

/**
 * Detailed step-by-step heuristic calculation for all 5 heuristics
 */
export const calculateCellHeuristics = (cell, goal, start, rows, cols, walls, alpha = 1.5, beta = 2.0) => {
  const manhattan = manhattanDistance(cell, goal);
  const rowDiff = Math.abs(cell.r - goal.r);
  const colDiff = Math.abs(cell.c - goal.c);

  // H2 Angular calculation
  const dxGoal = goal.c - cell.c;
  const dyGoal = goal.r - cell.r;
  const dxMove = cell.c - start.c;
  const dyMove = cell.r - start.r;
  const magGoal = Math.sqrt(dxGoal * dxGoal + dyGoal * dyGoal);
  const magMove = Math.sqrt(dxMove * dxMove + dyMove * dyMove);
  const dot = dxGoal * dxMove + dyGoal * dyMove;
  let cosTheta = (magGoal > 0 && magMove > 0) ? dot / (magGoal * magMove) : 1;
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  const pDir = 1 - cosTheta;
  const h2Val = manhattan + beta * pDir;

  // H3 Density calculation
  let obstacleCount = 0;
  let totalValidNeighbors = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        totalValidNeighbors++;
        if (walls.has(`${nr},${nc}`)) {
          obstacleCount++;
        }
      }
    }
  }
  const density = totalValidNeighbors > 0 ? obstacleCount / totalValidNeighbors : 0;
  const h3Val = manhattan * (1 + alpha * density);

  // H4 Euclidean calculation
  const euclideanVal = euclideanDistance(cell, goal);

  // H5 Chebyshev calculation
  const chebyshevVal = chebyshevDistance(cell, goal);

  return {
    cell,
    goal,
    manhattan,
    rowDiff,
    colDiff,
    h1: {
      formula: `h1 = |${cell.r} - ${goal.r}| + |${cell.c} - ${goal.c}|`,
      value: manhattan
    },
    h2: {
      formula: `h2 = Manhattan(${manhattan}) + ${beta} * P_direction`,
      dxGoal,
      dyGoal,
      dxMove,
      dyMove,
      cosTheta: cosTheta.toFixed(3),
      pDir: pDir.toFixed(3),
      value: Number(h2Val.toFixed(2))
    },
    h3: {
      formula: `h3 = Manhattan(${manhattan}) * (1 + ${alpha} * Density)`,
      obstacleCount,
      totalValidNeighbors,
      density: density.toFixed(2),
      value: Number(h3Val.toFixed(2))
    },
    h4: {
      formula: `h4 = sqrt((${cell.r} - ${goal.r})^2 + (${cell.c} - ${goal.c})^2)`,
      value: Number(euclideanVal.toFixed(2))
    },
    h5: {
      formula: `h5 = max(|${cell.r} - ${goal.r}|, |${cell.c} - ${goal.c}|)`,
      value: chebyshevVal
    }
  };
};

/**
 * Priority Queue Implementation for A*
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }
  enqueue(element, priority, hVal) {
    this.elements.push({ element, priority, hVal });
    this.elements.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.hVal - b.hVal;
      }
      return a.priority - b.priority;
    });
  }
  dequeue() {
    return this.elements.shift().element;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * A* Pathfinding Search Implementation
 */
export const runAStarSearch = (start, goal, rows, cols, walls, heuristicType = 'H1', alpha = 1.5, beta = 2.0) => {
  const startTime = performance.now();
  const startKey = `${start.r},${start.c}`;
  const goalKey = `${goal.r},${goal.c}`;

  if (startKey === goalKey) {
    const endTime = performance.now();
    return {
      path: [{ r: start.r, c: start.c, angle: 0 }],
      visitedOrder: [startKey],
      pathLength: 0,
      expandedNodes: 1,
      executionTimeMs: Math.max(0.01, endTime - startTime),
      found: true
    };
  }

  const openSet = new PriorityQueue();
  const gScore = new Map();
  const fScore = new Map();
  const cameFrom = new Map();
  const visitedOrder = [];

  gScore.set(startKey, 0);
  const initialH = computeHeuristicValue(start, goal, null, rows, cols, walls, heuristicType, alpha, beta);
  fScore.set(startKey, initialH);

  openSet.enqueue({ r: start.r, c: start.c }, initialH, initialH);

  let expandedCount = 0;
  let found = false;

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    const currKey = `${current.r},${current.c}`;

    visitedOrder.push(currKey);
    expandedCount++;

    if (current.r === goal.r && current.c === goal.c) {
      found = true;
      break;
    }

    const currentG = gScore.get(currKey);
    const neighbors = getNeighbors(current.r, current.c, rows, cols, walls);

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.r},${neighbor.c}`;
      const tentativeG = currentG + 1;

      if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, { node: current, angle: neighbor.angle });
        gScore.set(neighborKey, tentativeG);

        const hVal = computeHeuristicValue(
          { r: neighbor.r, c: neighbor.c },
          goal,
          current,
          rows,
          cols,
          walls,
          heuristicType,
          alpha,
          beta
        );
        const fVal = tentativeG + hVal;
        fScore.set(neighborKey, fVal);

        openSet.enqueue({ r: neighbor.r, c: neighbor.c }, fVal, hVal);
      }
    }
  }

  const endTime = performance.now();
  const executionTimeMs = Math.max(0.02, endTime - startTime);

  if (!found) {
    return {
      path: null,
      visitedOrder,
      pathLength: Infinity,
      expandedNodes: expandedCount,
      executionTimeMs,
      found: false
    };
  }

  // Reconstruct path
  const path = [];
  let curr = { r: goal.r, c: goal.c };
  let currKey = goalKey;

  while (currKey !== startKey) {
    const prevInfo = cameFrom.get(currKey);
    path.unshift({ r: curr.r, c: curr.c, angle: prevInfo ? prevInfo.angle : 0 });
    curr = prevInfo.node;
    currKey = `${curr.r},${curr.c}`;
  }
  path.unshift({ r: start.r, c: start.c, angle: path[0] ? path[0].angle : 0 });

  return {
    path,
    visitedOrder,
    pathLength: path.length - 1,
    expandedNodes: expandedCount,
    executionTimeMs,
    found: true
  };
};

/**
 * BFS Solver used as fallback verification
 */
export const findBFSPath = (start, goal, rows, cols, walls) => {
  const result = runAStarSearch(start, goal, rows, cols, walls, 'H1');
  return result.path;
};

/**
 * Generate a random solvable grid with random obstacles, start & goal
 */
export const generateRandomSolvableGrid = (minDim = 7, maxDim = 12, obstacleDensity = 0.22) => {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const rows = Math.floor(Math.random() * (maxDim - minDim + 1)) + minDim;
    const cols = Math.floor(Math.random() * (maxDim - minDim + 1)) + minDim;

    const start = {
      r: Math.floor(Math.random() * Math.floor(rows / 2)),
      c: Math.floor(Math.random() * Math.floor(cols / 2))
    };

    const goal = {
      r: Math.floor(Math.random() * Math.ceil(rows / 2)) + Math.floor(rows / 2) - 1,
      c: Math.floor(Math.random() * Math.ceil(cols / 2)) + Math.floor(cols / 2) - 1
    };

    if (start.r === goal.r && start.c === goal.c) {
      goal.r = rows - 1;
      goal.c = cols - 1;
    }

    const walls = new Set();
    const totalCells = rows * cols;
    const wallCount = Math.floor(totalCells * obstacleDensity);

    while (walls.size < wallCount) {
      const wr = Math.floor(Math.random() * rows);
      const wc = Math.floor(Math.random() * cols);

      if ((wr === start.r && wc === start.c) || (wr === goal.r && wc === goal.c)) {
        continue;
      }
      walls.add(`${wr},${wc}`);
    }

    const check = runAStarSearch(start, goal, rows, cols, walls, 'H1');
    if (check.found && check.pathLength > 0) {
      return { rows, cols, start, goal, walls };
    }
  }

  return {
    rows: 8,
    cols: 8,
    start: { r: 0, c: 0 },
    goal: { r: 7, c: 7 },
    walls: new Set()
  };
};
