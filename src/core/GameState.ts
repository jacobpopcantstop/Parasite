import { Events, GameEventType } from './Events';

/**
 * Parasite stats that can be modified by growth and abilities
 */
export interface ParasiteStats {
  // Base stats
  maxHealth: number;
  health: number;
  baseSize: number;
  sizeMultiplier: number;

  // Movement stats (can be modified by size/abilities)
  acceleration: number;
  maxSpeed: number;
  drag: number;
  turnRate: number;

  // Combat stats (Phase 4+)
  damage: number;
  armor: number;
  detectionRadius: number;
}

/**
 * Current run/session state
 */
export interface RunState {
  // Progression
  biomass: number; // XP equivalent, earned by eating
  level: number;
  evolutionPoints: number;

  // Current cell
  cellId: string | null;
  cellsCleared: number;

  // Time tracking
  runStartTime: number;
  runDuration: number;

  // Statistics
  foodEaten: number;
  enemiesKilled: number;
  damageDealt: number;
  damageTaken: number;
}

/**
 * Persistent state across runs (meta-progression)
 */
export interface PersistentState {
  // Unlocks
  unlockedAbilities: string[];
  highestLevel: number;
  totalCellsCleared: number;

  // Currency
  dna: number; // Persistent currency for permanent upgrades
}

/**
 * Global game state manager.
 * Separates game logic state from rendering.
 */
class GameStateManager {
  // Parasite stats (modified by growth, abilities, etc.)
  private _parasiteStats: ParasiteStats = this.getDefaultParasiteStats();

  // Current run state
  private _runState: RunState = this.getDefaultRunState();

  // Persistent state
  private _persistentState: PersistentState = this.getDefaultPersistentState();

  // External forces affecting all entities (currents, gravity, etc.)
  private _globalForces: Array<{ x: number; y: number; id: string }> = [];

  // Game flags
  private _isPaused = false;
  private _isRunActive = false;

  // --- Getters (read-only access) ---

  get parasiteStats(): Readonly<ParasiteStats> {
    return this._parasiteStats;
  }

  get runState(): Readonly<RunState> {
    return this._runState;
  }

  get persistentState(): Readonly<PersistentState> {
    return this._persistentState;
  }

  get globalForces(): ReadonlyArray<{ x: number; y: number; id: string }> {
    return this._globalForces;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get isRunActive(): boolean {
    return this._isRunActive;
  }

  /**
   * Get combined global force vector
   */
  get totalGlobalForce(): { x: number; y: number } {
    return this._globalForces.reduce(
      (acc, force) => ({ x: acc.x + force.x, y: acc.y + force.y }),
      { x: 0, y: 0 }
    );
  }

  /**
   * Get effective parasite speed based on size
   * Larger = more momentum but slower acceleration/turning
   */
  get effectiveMaxSpeed(): number {
    const sizeFactor = 1 / Math.sqrt(this._parasiteStats.sizeMultiplier);
    return this._parasiteStats.maxSpeed * sizeFactor;
  }

  get effectiveAcceleration(): number {
    const sizeFactor = 1 / this._parasiteStats.sizeMultiplier;
    return this._parasiteStats.acceleration * sizeFactor;
  }

  get effectiveTurnRate(): number {
    const sizeFactor = 1 / Math.sqrt(this._parasiteStats.sizeMultiplier);
    return this._parasiteStats.turnRate * sizeFactor;
  }

  // --- State Modifiers ---

  /**
   * Start a new run
   */
  startRun(): void {
    this._runState = this.getDefaultRunState();
    this._runState.runStartTime = Date.now();
    this._parasiteStats = this.getDefaultParasiteStats();
    this._globalForces = [];
    this._isRunActive = true;
    this._isPaused = false;
    Events.emit(GameEventType.GAME_STARTED, {});
  }

  /**
   * End the current run
   */
  endRun(reason: string): void {
    this._isRunActive = false;
    this._runState.runDuration = Date.now() - this._runState.runStartTime;

    // Award DNA based on performance
    const dnaEarned = Math.floor(
      this._runState.biomass * 0.1 +
      this._runState.cellsCleared * 50 +
      this._runState.enemiesKilled * 5
    );
    this._persistentState.dna += dnaEarned;

    // Update high scores
    if (this._runState.level > this._persistentState.highestLevel) {
      this._persistentState.highestLevel = this._runState.level;
    }
    this._persistentState.totalCellsCleared += this._runState.cellsCleared;

    this.savePersistentState();
    Events.emit(GameEventType.GAME_OVER, { reason });
  }

  /**
   * Pause/unpause the game
   */
  setPaused(paused: boolean): void {
    if (this._isPaused === paused) return;
    this._isPaused = paused;
    Events.emit(paused ? GameEventType.GAME_PAUSED : GameEventType.GAME_RESUMED, {});
  }

  /**
   * Add biomass (from eating food)
   */
  addBiomass(amount: number): void {
    this._runState.biomass += amount;
    this._runState.foodEaten++;

    // Check for level up
    const nextLevelThreshold = this.getLevelThreshold(this._runState.level + 1);
    if (this._runState.biomass >= nextLevelThreshold) {
      this.levelUp();
    }
  }

  /**
   * Level up the parasite
   */
  private levelUp(): void {
    this._runState.level++;
    this._runState.evolutionPoints++;
    Events.emit(GameEventType.LEVEL_UP, { level: this._runState.level });
  }

  /**
   * Get biomass required for a level
   */
  getLevelThreshold(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  /**
   * Grow the parasite
   */
  grow(amount: number): void {
    const oldSize = this._parasiteStats.sizeMultiplier;
    this._parasiteStats.sizeMultiplier += amount;
    Events.emit(GameEventType.PARASITE_GREW, {
      oldSize,
      newSize: this._parasiteStats.sizeMultiplier,
    });
  }

  /**
   * Shrink the parasite
   */
  shrink(amount: number): void {
    const oldSize = this._parasiteStats.sizeMultiplier;
    this._parasiteStats.sizeMultiplier = Math.max(0.5, this._parasiteStats.sizeMultiplier - amount);
    Events.emit(GameEventType.PARASITE_SHRANK, {
      oldSize,
      newSize: this._parasiteStats.sizeMultiplier,
    });
  }

  /**
   * Modify a parasite stat
   */
  modifyStat<K extends keyof ParasiteStats>(stat: K, value: ParasiteStats[K]): void {
    this._parasiteStats[stat] = value;
  }

  /**
   * Add a global force (e.g., cytoplasm current)
   */
  addGlobalForce(id: string, x: number, y: number): void {
    // Remove existing force with same ID
    this.removeGlobalForce(id);
    this._globalForces.push({ id, x, y });
  }

  /**
   * Remove a global force
   */
  removeGlobalForce(id: string): void {
    this._globalForces = this._globalForces.filter((f) => f.id !== id);
  }

  /**
   * Clear all global forces
   */
  clearGlobalForces(): void {
    this._globalForces = [];
  }

  /**
   * Update run duration (call each frame)
   */
  updateRunDuration(): void {
    if (this._isRunActive && !this._isPaused) {
      this._runState.runDuration = Date.now() - this._runState.runStartTime;
    }
  }

  // --- Persistence ---

  /**
   * Save persistent state to localStorage
   */
  savePersistentState(): void {
    try {
      localStorage.setItem('parasite_save', JSON.stringify(this._persistentState));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  /**
   * Load persistent state from localStorage
   */
  loadPersistentState(): void {
    try {
      const saved = localStorage.getItem('parasite_save');
      if (saved) {
        this._persistentState = {
          ...this.getDefaultPersistentState(),
          ...JSON.parse(saved),
        };
      }
    } catch (e) {
      console.warn('Failed to load game state:', e);
      this._persistentState = this.getDefaultPersistentState();
    }
  }

  // --- Defaults ---

  private getDefaultParasiteStats(): ParasiteStats {
    return {
      maxHealth: 100,
      health: 100,
      baseSize: 20,
      sizeMultiplier: 1,
      acceleration: 1200,
      maxSpeed: 450,
      drag: 0.94,
      turnRate: 0.15,
      damage: 10,
      armor: 0,
      detectionRadius: 0, // How easily detected (0 = normal, negative = stealthy)
    };
  }

  private getDefaultRunState(): RunState {
    return {
      biomass: 0,
      level: 1,
      evolutionPoints: 0,
      cellId: null,
      cellsCleared: 0,
      runStartTime: 0,
      runDuration: 0,
      foodEaten: 0,
      enemiesKilled: 0,
      damageDealt: 0,
      damageTaken: 0,
    };
  }

  private getDefaultPersistentState(): PersistentState {
    return {
      unlockedAbilities: [],
      highestLevel: 1,
      totalCellsCleared: 0,
      dna: 0,
    };
  }
}

// Singleton instance
export const GameState = new GameStateManager();
