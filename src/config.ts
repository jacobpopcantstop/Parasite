// Game configuration constants
export const CONFIG = {
  // World
  WORLD_WIDTH: 3000,
  WORLD_HEIGHT: 3000,
  GRID_SIZE: 100,

  // Parasite
  PARASITE_RADIUS: 20,
  PARASITE_COLOR: 0x00ff9d,
  TRAIL_LENGTH: 15,
  TRAIL_FADE_RATE: 0.06,

  // Physics (tuned for smooth gliding)
  ACCELERATION: 1200,
  MAX_SPEED: 450,
  DRAG: 0.94, // Per 16.67ms frame
  BOUNCE_FACTOR: 0.4,
  DEAD_ZONE: 8,

  // Camera
  CAMERA_LERP: 0.08,
  CAMERA_LERP_FAST: 0.12, // When moving fast

  // Visuals
  WALL_COLOR: 0x00ff9d,
  WALL_THICKNESS: 8,
  BACKGROUND_COLOR: 0x0a0a12,
  GRID_COLOR: 0x1a1a2e,
  GRID_ALPHA: 0.4,
} as const;

export type Config = typeof CONFIG;
