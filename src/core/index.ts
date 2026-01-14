// Core module exports
export { Entity, EntityType } from './Entity';
export { Events, GameEventType } from './Events';
export type { GameEventPayload } from './Events';
export { GameState } from './GameState';
export type { ParasiteStats, RunState, PersistentState } from './GameState';
export { ObjectPool, createEntityPool } from './ObjectPool';
export {
  // Collision detection
  circleCircle,
  circleCircleDetailed,
  circleRectangle,
  circleRectangleDetailed,
  rectangleRectangle,
  pointInCircle,
  pointInRectangle,
  distance,
  distanceSquared,
  // Spatial hash
  SpatialHash,
  // Collision resolution
  resolveCollision,
} from './Collision';
export type { Circle, Rectangle, CollisionResult } from './Collision';
