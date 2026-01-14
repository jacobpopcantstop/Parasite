/**
 * Generic object pool for efficient object reuse.
 * Avoids garbage collection spikes from frequent spawning/despawning.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private activeObjects: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  /**
   * Create a new object pool
   * @param factory Function to create new objects
   * @param reset Function to reset an object to initial state
   * @param initialSize Number of objects to pre-create
   * @param maxSize Maximum pool size (prevents memory bloat)
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Get an object from the pool (or create new if empty)
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }

    this.activeObjects.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('Attempted to release object not from this pool');
      return;
    }

    this.activeObjects.delete(obj);
    this.reset(obj);

    // Only keep up to maxSize in pool
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * Release all active objects back to pool
   */
  releaseAll(): void {
    for (const obj of this.activeObjects) {
      this.reset(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
    this.activeObjects.clear();
  }

  /**
   * Get all currently active objects
   */
  getActive(): ReadonlySet<T> {
    return this.activeObjects;
  }

  /**
   * Number of active objects
   */
  get activeCount(): number {
    return this.activeObjects.size;
  }

  /**
   * Number of objects available in pool
   */
  get availableCount(): number {
    return this.pool.length;
  }

  /**
   * Total capacity (active + available)
   */
  get totalCount(): number {
    return this.activeObjects.size + this.pool.length;
  }

  /**
   * Iterate over active objects
   */
  forEach(callback: (obj: T) => void): void {
    for (const obj of this.activeObjects) {
      callback(obj);
    }
  }

  /**
   * Filter active objects
   */
  filter(predicate: (obj: T) => boolean): T[] {
    const result: T[] = [];
    for (const obj of this.activeObjects) {
      if (predicate(obj)) {
        result.push(obj);
      }
    }
    return result;
  }
}

/**
 * Helper to create a pool for Entity subclasses
 */
export function createEntityPool<T extends { active: boolean; destroy?: () => void }>(
  factory: () => T,
  initialSize: number = 10,
  maxSize: number = 100
): ObjectPool<T> {
  return new ObjectPool<T>(
    factory,
    (obj) => {
      obj.active = false;
      // Don't call destroy here - just reset state
    },
    initialSize,
    maxSize
  );
}
