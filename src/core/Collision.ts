import { Entity } from './Entity';

/**
 * Collision detection and response utilities.
 * Provides efficient collision checking for various shape combinations.
 */

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionResult {
  collided: boolean;
  overlapX: number;
  overlapY: number;
  normal: { x: number; y: number };
  penetration: number;
}

/**
 * Check if two circles overlap
 */
export function circleCircle(a: Circle, b: Circle): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const radiiSum = a.radius + b.radius;
  return distSq < radiiSum * radiiSum;
}

/**
 * Detailed circle-circle collision with penetration info
 */
export function circleCircleDetailed(a: Circle, b: Circle): CollisionResult {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radiiSum = a.radius + b.radius;

  if (dist >= radiiSum) {
    return {
      collided: false,
      overlapX: 0,
      overlapY: 0,
      normal: { x: 0, y: 0 },
      penetration: 0,
    };
  }

  // Normalize direction (handle case where circles are at same position)
  const nx = dist > 0 ? dx / dist : 1;
  const ny = dist > 0 ? dy / dist : 0;
  const penetration = radiiSum - dist;

  return {
    collided: true,
    overlapX: nx * penetration,
    overlapY: ny * penetration,
    normal: { x: nx, y: ny },
    penetration,
  };
}

/**
 * Check if a circle overlaps a rectangle
 */
export function circleRectangle(circle: Circle, rect: Rectangle): boolean {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;

  return distSq < circle.radius * circle.radius;
}

/**
 * Detailed circle-rectangle collision
 */
export function circleRectangleDetailed(circle: Circle, rect: Rectangle): CollisionResult {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= circle.radius) {
    return {
      collided: false,
      overlapX: 0,
      overlapY: 0,
      normal: { x: 0, y: 0 },
      penetration: 0,
    };
  }

  // Handle case where circle center is inside rectangle
  if (dist === 0) {
    // Push to nearest edge
    const toLeft = circle.x - rect.x;
    const toRight = rect.x + rect.width - circle.x;
    const toTop = circle.y - rect.y;
    const toBottom = rect.y + rect.height - circle.y;

    const minDist = Math.min(toLeft, toRight, toTop, toBottom);
    let nx = 0, ny = 0;

    if (minDist === toLeft) nx = -1;
    else if (minDist === toRight) nx = 1;
    else if (minDist === toTop) ny = -1;
    else ny = 1;

    return {
      collided: true,
      overlapX: nx * (circle.radius + minDist),
      overlapY: ny * (circle.radius + minDist),
      normal: { x: nx, y: ny },
      penetration: circle.radius + minDist,
    };
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const penetration = circle.radius - dist;

  return {
    collided: true,
    overlapX: nx * penetration,
    overlapY: ny * penetration,
    normal: { x: nx, y: ny },
    penetration,
  };
}

/**
 * Check if two rectangles overlap
 */
export function rectangleRectangle(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check if a point is inside a circle
 */
export function pointInCircle(px: number, py: number, circle: Circle): boolean {
  const dx = px - circle.x;
  const dy = py - circle.y;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRectangle(px: number, py: number, rect: Rectangle): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
}

/**
 * Get distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get squared distance between two points (faster, for comparisons)
 */
export function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Simple spatial hash for broad-phase collision detection.
 * Significantly faster than O(n²) for many entities.
 */
export class SpatialHash<T extends { x: number; y: number }> {
  private cellSize: number;
  private cells: Map<string, T[]> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cells.clear();
  }

  /**
   * Get cell key for a position
   */
  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /**
   * Insert an entity into the hash
   */
  insert(entity: T): void {
    const key = this.getKey(entity.x, entity.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(entity);
  }

  /**
   * Insert an entity that spans multiple cells (for large entities)
   */
  insertWithRadius(entity: T & { radius?: number }): void {
    const radius = entity.radius ?? 0;
    const minCx = Math.floor((entity.x - radius) / this.cellSize);
    const maxCx = Math.floor((entity.x + radius) / this.cellSize);
    const minCy = Math.floor((entity.y - radius) / this.cellSize);
    const maxCy = Math.floor((entity.y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx},${cy}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
      }
    }
  }

  /**
   * Query entities near a point
   */
  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const seen = new Set<T>();

    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const entity of cell) {
            if (!seen.has(entity)) {
              seen.add(entity);
              results.push(entity);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Find potential collision pairs
   */
  getPotentialPairs(): Array<[T, T]> {
    const pairs: Array<[T, T]> = [];
    const checked = new Set<string>();

    for (const cell of this.cells.values()) {
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          const a = cell[i];
          const b = cell[j];
          // Create unique key for this pair
          const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!checked.has(pairKey)) {
            checked.add(pairKey);
            pairs.push([a, b]);
          }
        }
      }
    }

    return pairs;
  }
}

/**
 * Resolve collision between two entities by pushing them apart
 */
export function resolveCollision(
  entityA: Entity,
  entityB: Entity,
  pushRatio: number = 0.5 // 0.5 = equal push, 1 = only push A, 0 = only push B
): void {
  const result = circleCircleDetailed(
    { x: entityA.x, y: entityA.y, radius: entityA.radius },
    { x: entityB.x, y: entityB.y, radius: entityB.radius }
  );

  if (!result.collided) return;

  // Push entities apart
  entityA.x -= result.overlapX * pushRatio;
  entityA.y -= result.overlapY * pushRatio;
  entityB.x += result.overlapX * (1 - pushRatio);
  entityB.y += result.overlapY * (1 - pushRatio);
}
