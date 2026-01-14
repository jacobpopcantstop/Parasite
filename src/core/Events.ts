import { Entity } from './Entity';

/**
 * Game event types for decoupled communication between systems.
 * Used for UI updates, sound triggers, achievements, etc.
 */
export enum GameEventType {
  // Entity lifecycle
  ENTITY_SPAWNED = 'entity:spawned',
  ENTITY_DESTROYED = 'entity:destroyed',

  // Parasite events
  PARASITE_DAMAGED = 'parasite:damaged',
  PARASITE_HEALED = 'parasite:healed',
  PARASITE_DIED = 'parasite:died',
  PARASITE_GREW = 'parasite:grew',
  PARASITE_SHRANK = 'parasite:shrank',

  // Combat/interaction
  FOOD_COLLECTED = 'food:collected',
  ENEMY_KILLED = 'enemy:killed',
  COLLISION = 'collision',
  WALL_HIT = 'wall:hit',

  // Detection (Phase 4)
  DETECTION_STARTED = 'detection:started',
  DETECTION_ENDED = 'detection:ended',
  ALERT_TRIGGERED = 'alert:triggered',

  // Progression
  LEVEL_UP = 'progression:levelup',
  ABILITY_UNLOCKED = 'progression:ability',
  CELL_ENTERED = 'cell:entered',
  CELL_CLEARED = 'cell:cleared',

  // Game state
  GAME_STARTED = 'game:started',
  GAME_PAUSED = 'game:paused',
  GAME_RESUMED = 'game:resumed',
  GAME_OVER = 'game:over',
}

/**
 * Event payload types
 */
export interface GameEventPayload {
  [GameEventType.ENTITY_SPAWNED]: { entity: Entity };
  [GameEventType.ENTITY_DESTROYED]: { entity: Entity };
  [GameEventType.PARASITE_DAMAGED]: { amount: number; source?: Entity };
  [GameEventType.PARASITE_HEALED]: { amount: number };
  [GameEventType.PARASITE_DIED]: { killer?: Entity };
  [GameEventType.PARASITE_GREW]: { oldSize: number; newSize: number };
  [GameEventType.PARASITE_SHRANK]: { oldSize: number; newSize: number };
  [GameEventType.FOOD_COLLECTED]: { entity: Entity; value: number };
  [GameEventType.ENEMY_KILLED]: { entity: Entity; points: number };
  [GameEventType.COLLISION]: { entityA: Entity; entityB: Entity };
  [GameEventType.WALL_HIT]: { x: number; y: number; velocity: number };
  [GameEventType.DETECTION_STARTED]: { detector: Entity };
  [GameEventType.DETECTION_ENDED]: { detector: Entity };
  [GameEventType.ALERT_TRIGGERED]: { level: number; source: Entity };
  [GameEventType.LEVEL_UP]: { level: number };
  [GameEventType.ABILITY_UNLOCKED]: { abilityId: string };
  [GameEventType.CELL_ENTERED]: { cellId: string };
  [GameEventType.CELL_CLEARED]: { cellId: string; time: number };
  [GameEventType.GAME_STARTED]: Record<string, never>;
  [GameEventType.GAME_PAUSED]: Record<string, never>;
  [GameEventType.GAME_RESUMED]: Record<string, never>;
  [GameEventType.GAME_OVER]: { reason: string };
}

type EventCallback<T extends GameEventType> = (payload: GameEventPayload[T]) => void;

interface EventSubscription {
  type: GameEventType;
  callback: EventCallback<GameEventType>;
  once: boolean;
}

/**
 * Global event bus for game-wide communication.
 * Allows systems to communicate without direct dependencies.
 */
class EventBus {
  private subscriptions: Map<GameEventType, EventSubscription[]> = new Map();
  private eventQueue: Array<{ type: GameEventType; payload: unknown }> = [];
  private processing = false;

  /**
   * Subscribe to an event type
   */
  on<T extends GameEventType>(type: T, callback: EventCallback<T>): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }

    const subscription: EventSubscription = {
      type,
      callback: callback as EventCallback<GameEventType>,
      once: false,
    };

    this.subscriptions.get(type)!.push(subscription);

    // Return unsubscribe function
    return () => this.off(type, callback);
  }

  /**
   * Subscribe to an event type (fires only once)
   */
  once<T extends GameEventType>(type: T, callback: EventCallback<T>): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }

    const subscription: EventSubscription = {
      type,
      callback: callback as EventCallback<GameEventType>,
      once: true,
    };

    this.subscriptions.get(type)!.push(subscription);

    return () => this.off(type, callback);
  }

  /**
   * Unsubscribe from an event type
   */
  off<T extends GameEventType>(type: T, callback: EventCallback<T>): void {
    const subs = this.subscriptions.get(type);
    if (!subs) return;

    const index = subs.findIndex((s) => s.callback === callback);
    if (index !== -1) {
      subs.splice(index, 1);
    }
  }

  /**
   * Emit an event (queued for processing)
   */
  emit<T extends GameEventType>(type: T, payload: GameEventPayload[T]): void {
    this.eventQueue.push({ type, payload });

    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process all queued events
   */
  private processQueue(): void {
    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      const subs = this.subscriptions.get(event.type);

      if (subs) {
        // Create copy to allow modifications during iteration
        const subsToCall = [...subs];

        for (const sub of subsToCall) {
          sub.callback(event.payload as GameEventPayload[GameEventType]);

          // Remove one-time subscriptions
          if (sub.once) {
            const index = subs.indexOf(sub);
            if (index !== -1) {
              subs.splice(index, 1);
            }
          }
        }
      }
    }

    this.processing = false;
  }

  /**
   * Remove all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.eventQueue = [];
  }
}

// Singleton instance
export const Events = new EventBus();
