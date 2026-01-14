import Phaser from 'phaser';
import { Entity, EntityType } from '../core/Entity';
import { GameState } from '../core/GameState';
import { Events, GameEventType } from '../core/Events';
import { CONFIG } from '../config';

/**
 * Trail point for visual effect
 */
interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

/**
 * The player-controlled parasite entity.
 * Uses GameState for stats and physics calculations.
 */
export class Parasite extends Entity {
  public readonly type = EntityType.PARASITE;

  // Visual components
  private body!: Phaser.GameObjects.Arc;
  private glow!: Phaser.GameObjects.Arc;
  private highlight!: Phaser.GameObjects.Arc;

  // Trail effect
  private trail: TrailPoint[] = [];
  private trailGraphics!: Phaser.GameObjects.Graphics;

  // Input state
  private targetPosition = new Phaser.Math.Vector2(0, 0);
  private isPointerActive = false;

  constructor(x: number, y: number) {
    super(x, y, GameState.parasiteStats.baseSize);

    // Initialize health from GameState
    this.initHealth(
      GameState.parasiteStats.maxHealth,
      GameState.parasiteStats.health
    );
  }

  /**
   * Create visual representation
   */
  render(scene: Phaser.Scene): void {
    if (this.container) return; // Already rendered

    this.container = scene.add.container(this.x, this.y);

    // Outer glow
    this.glow = scene.add.circle(0, 0, this.radius * 1.5, CONFIG.PARASITE_COLOR, 0.15);

    // Main body
    this.body = scene.add.circle(0, 0, this.radius, CONFIG.PARASITE_COLOR);
    this.body.setStrokeStyle(2, 0xffffff, 0.3);

    // Inner highlight
    this.highlight = scene.add.circle(
      -this.radius * 0.3,
      -this.radius * 0.3,
      this.radius * 0.3,
      0xffffff,
      0.2
    );

    this.container.add([this.glow, this.body, this.highlight]);

    // Trail graphics (separate, behind container)
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setDepth(-1);
  }

  /**
   * Set target position (from input)
   */
  setTarget(x: number, y: number): void {
    this.targetPosition.set(x, y);
  }

  /**
   * Set pointer active state
   */
  setPointerActive(active: boolean): void {
    this.isPointerActive = active;
  }

  /**
   * Apply keyboard input
   */
  applyKeyboardInput(dx: number, dy: number, delta: number): void {
    if (dx === 0 && dy === 0) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    const accel = GameState.effectiveAcceleration * 0.8;

    this.velocity.x += (dx / len) * accel * (delta / 1000);
    this.velocity.y += (dy / len) * accel * (delta / 1000);
  }

  /**
   * Update entity state
   */
  update(delta: number, _time: number): void {
    this.age += delta;

    // Apply pointer/touch input
    if (this.isPointerActive) {
      const dx = this.targetPosition.x - this.x;
      const dy = this.targetPosition.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > CONFIG.DEAD_ZONE) {
        const dirX = dx / distance;
        const dirY = dy / distance;

        const accelerationScale = Math.min(distance / 150, 1);
        const scaledAcceleration = GameState.effectiveAcceleration * accelerationScale;

        this.velocity.x += dirX * scaledAcceleration * (delta / 1000);
        this.velocity.y += dirY * scaledAcceleration * (delta / 1000);
      }
    }

    // Apply global forces (currents, etc.)
    const globalForce = GameState.totalGlobalForce;
    if (globalForce.x !== 0 || globalForce.y !== 0) {
      this.velocity.x += globalForce.x * (delta / 1000);
      this.velocity.y += globalForce.y * (delta / 1000);
    }

    // Apply acceleration
    this.velocity.x += this.acceleration.x * (delta / 1000);
    this.velocity.y += this.acceleration.y * (delta / 1000);
    this.acceleration.set(0, 0);

    // Apply drag (frame-rate independent)
    const frameRatio = delta / 16.667;
    const effectiveDrag = Math.pow(GameState.parasiteStats.drag, frameRatio);
    this.velocity.x *= effectiveDrag;
    this.velocity.y *= effectiveDrag;

    // Clamp to max speed
    const maxSpeed = GameState.effectiveMaxSpeed;
    if (this.speed > maxSpeed) {
      this.velocity.normalize().scale(maxSpeed);
    }

    // Stop if very slow
    if (this.speed < 1) {
      this.velocity.set(0, 0);
    }

    // Update position
    this.x += this.velocity.x * (delta / 1000);
    this.y += this.velocity.y * (delta / 1000);

    // Update trail
    this.updateTrail();

    // Sync health with GameState
    GameState.modifyStat('health', this.health);
  }

  /**
   * Update visual representation
   */
  updateVisuals(time: number, _delta: number): void {
    if (!this.container) return;

    // Sync position
    this.syncContainerPosition();

    // Update size based on GameState
    const currentSize = GameState.parasiteStats.sizeMultiplier;
    this.sizeMultiplier = currentSize;

    // Speed-based effects
    const speedRatio = this.speed / GameState.effectiveMaxSpeed;

    // Pulse effect
    const pulse = 1 + Math.sin(time * 0.005) * 0.03;
    const speedPulse = 1 + speedRatio * 0.15;
    this.container.setScale(currentSize * pulse * speedPulse);

    // Rotation toward movement
    if (this.speed > 10) {
      const targetAngle = Math.atan2(this.velocity.y, this.velocity.x);
      this.container.rotation = Phaser.Math.Angle.RotateTo(
        this.container.rotation,
        targetAngle,
        GameState.effectiveTurnRate
      );
    }

    // Glow intensity
    this.glow.setAlpha(0.1 + speedRatio * 0.25);
    this.glow.setScale(1 + speedRatio * 0.3);

    // Draw trail
    this.drawTrail();
  }

  /**
   * Update trail points
   */
  private updateTrail(): void {
    if (this.speed > 20) {
      this.trail.unshift({
        x: this.x,
        y: this.y,
        alpha: Math.min(this.speed / GameState.effectiveMaxSpeed, 1) * 0.6,
      });
    }

    // Fade and remove old points
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= CONFIG.TRAIL_FADE_RATE;
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1);
      }
    }

    // Limit trail length
    while (this.trail.length > CONFIG.TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  /**
   * Draw trail graphics
   */
  private drawTrail(): void {
    if (!this.trailGraphics) return;

    this.trailGraphics.clear();

    if (this.trail.length < 2) return;

    for (let i = 0; i < this.trail.length - 1; i++) {
      const point = this.trail[i];
      const nextPoint = this.trail[i + 1];

      const sizeRatio = 1 - (i / this.trail.length);
      const trailRadius = this.radius * 0.8 * sizeRatio;

      this.trailGraphics.fillStyle(CONFIG.PARASITE_COLOR, point.alpha * 0.5);
      this.trailGraphics.fillCircle(point.x, point.y, trailRadius);

      this.trailGraphics.lineStyle(trailRadius * 2, CONFIG.PARASITE_COLOR, point.alpha * 0.3);
      this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
    }
  }

  /**
   * Handle taking damage
   */
  override damage(amount: number): number {
    const actualDamage = super.damage(amount);
    if (actualDamage > 0) {
      Events.emit(GameEventType.PARASITE_DAMAGED, { amount: actualDamage });

      if (this.isDead) {
        Events.emit(GameEventType.PARASITE_DIED, {});
      }
    }
    return actualDamage;
  }

  /**
   * Handle healing
   */
  override heal(amount: number): number {
    const actualHeal = super.heal(amount);
    if (actualHeal > 0) {
      Events.emit(GameEventType.PARASITE_HEALED, { amount: actualHeal });
    }
    return actualHeal;
  }

  /**
   * Clean up resources
   */
  override destroy(): void {
    if (this.trailGraphics) {
      this.trailGraphics.destroy();
    }
    super.destroy();
  }
}
