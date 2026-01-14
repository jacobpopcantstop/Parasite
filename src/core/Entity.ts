import Phaser from 'phaser';

/**
 * Base class for all game entities (parasite, food, enemies, organelles).
 * Provides common properties and physics behavior.
 */
export abstract class Entity {
  // Position and physics
  public x: number;
  public y: number;
  public velocity: Phaser.Math.Vector2;
  public acceleration: Phaser.Math.Vector2;

  // Size and collision
  public baseRadius: number;
  public sizeMultiplier: number = 1;

  // Health (optional, -1 means invulnerable/no health)
  public health: number = -1;
  public maxHealth: number = -1;

  // State
  public active: boolean = true;
  public age: number = 0; // Time alive in ms

  // Visual
  public container: Phaser.GameObjects.Container | null = null;
  public alpha: number = 1;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.acceleration = new Phaser.Math.Vector2(0, 0);
  }

  /** Current effective radius (base * size multiplier) */
  get radius(): number {
    return this.baseRadius * this.sizeMultiplier;
  }

  /** Current speed (velocity magnitude) */
  get speed(): number {
    return this.velocity.length();
  }

  /** Check if entity has health system */
  get hasHealth(): boolean {
    return this.maxHealth > 0;
  }

  /** Health as percentage 0-1 */
  get healthPercent(): number {
    if (!this.hasHealth) return 1;
    return Math.max(0, this.health / this.maxHealth);
  }

  /** Check if entity is dead */
  get isDead(): boolean {
    return this.hasHealth && this.health <= 0;
  }

  /**
   * Apply damage to entity. Returns actual damage dealt.
   */
  damage(amount: number): number {
    if (!this.hasHealth || amount <= 0) return 0;
    const actualDamage = Math.min(this.health, amount);
    this.health -= actualDamage;
    return actualDamage;
  }

  /**
   * Heal entity. Returns actual healing done.
   */
  heal(amount: number): number {
    if (!this.hasHealth || amount <= 0) return 0;
    const actualHeal = Math.min(this.maxHealth - this.health, amount);
    this.health += actualHeal;
    return actualHeal;
  }

  /**
   * Initialize health system for this entity
   */
  initHealth(maxHealth: number, currentHealth?: number): void {
    this.maxHealth = maxHealth;
    this.health = currentHealth ?? maxHealth;
  }

  /**
   * Apply an impulse (instant velocity change)
   */
  applyImpulse(x: number, y: number): void {
    this.velocity.x += x;
    this.velocity.y += y;
  }

  /**
   * Apply a force (acceleration)
   */
  applyForce(x: number, y: number): void {
    this.acceleration.x += x;
    this.acceleration.y += y;
  }

  /**
   * Distance to another entity or point
   */
  distanceTo(other: Entity | { x: number; y: number }): number {
    return Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
  }

  /**
   * Angle to another entity or point
   */
  angleTo(other: Entity | { x: number; y: number }): number {
    return Phaser.Math.Angle.Between(this.x, this.y, other.x, other.y);
  }

  /**
   * Check collision with another entity (circle-circle)
   */
  collidesWith(other: Entity): boolean {
    if (!this.active || !other.active) return false;
    const dist = this.distanceTo(other);
    return dist < this.radius + other.radius;
  }

  /**
   * Update entity state. Override in subclasses.
   */
  abstract update(delta: number, time: number): void;

  /**
   * Create/update visual representation. Override in subclasses.
   */
  abstract render(scene: Phaser.Scene): void;

  /**
   * Clean up entity resources
   */
  destroy(): void {
    this.active = false;
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  /**
   * Sync visual container position with entity position
   */
  protected syncContainerPosition(): void {
    if (this.container) {
      this.container.x = this.x;
      this.container.y = this.y;
    }
  }
}

/**
 * Entity type identifiers for type checking and filtering
 */
export enum EntityType {
  PARASITE = 'parasite',
  FOOD = 'food',
  ENEMY = 'enemy',
  ORGANELLE = 'organelle',
  PROJECTILE = 'projectile',
}
