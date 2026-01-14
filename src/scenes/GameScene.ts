import Phaser from 'phaser';

// Configuration
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const PARASITE_RADIUS = 20;
const ACCELERATION = 800;
const MAX_SPEED = 400;
const DRAG = 0.92;
const CAMERA_LERP = 0.1;

export class GameScene extends Phaser.Scene {
  private parasite!: Phaser.GameObjects.Arc;
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private targetPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private gridGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Set up world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw background grid
    this.createGrid();

    // Draw boundary walls
    this.createBoundaryWalls();

    // Create the parasite (circular entity)
    this.parasite = this.add.circle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      PARASITE_RADIUS,
      0x00ff9d
    );

    // Add a glow effect
    this.parasite.setStrokeStyle(3, 0x00ff9d, 0.5);

    // Initialize target position to parasite position
    this.targetPosition.set(this.parasite.x, this.parasite.y);

    // Set up camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.parasite, true, CAMERA_LERP, CAMERA_LERP);

    // Set up input handlers
    this.setupInput();
  }

  private createGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x1a1a2e, 0.5);

    const gridSize = 100;

    // Vertical lines
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, WORLD_HEIGHT);
    }

    // Horizontal lines
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(WORLD_WIDTH, y);
    }

    this.gridGraphics.strokePath();
  }

  private createBoundaryWalls(): void {
    const wallThickness = 10;
    const wallColor = 0x00ff9d;
    const wallAlpha = 0.8;

    // Create visual boundary walls
    const graphics = this.add.graphics();
    graphics.lineStyle(wallThickness, wallColor, wallAlpha);

    // Draw rectangle around the world
    graphics.strokeRect(
      wallThickness / 2,
      wallThickness / 2,
      WORLD_WIDTH - wallThickness,
      WORLD_HEIGHT - wallThickness
    );

    // Add corner accents
    const cornerSize = 50;
    graphics.lineStyle(4, wallColor, 1);

    // Top-left corner
    graphics.moveTo(0, cornerSize);
    graphics.lineTo(0, 0);
    graphics.lineTo(cornerSize, 0);

    // Top-right corner
    graphics.moveTo(WORLD_WIDTH - cornerSize, 0);
    graphics.lineTo(WORLD_WIDTH, 0);
    graphics.lineTo(WORLD_WIDTH, cornerSize);

    // Bottom-right corner
    graphics.moveTo(WORLD_WIDTH, WORLD_HEIGHT - cornerSize);
    graphics.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    graphics.lineTo(WORLD_WIDTH - cornerSize, WORLD_HEIGHT);

    // Bottom-left corner
    graphics.moveTo(cornerSize, WORLD_HEIGHT);
    graphics.lineTo(0, WORLD_HEIGHT);
    graphics.lineTo(0, WORLD_HEIGHT - cornerSize);

    graphics.strokePath();
  }

  private setupInput(): void {
    // Handle pointer (mouse/touch) movement
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateTargetPosition(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateTargetPosition(pointer);
    });
  }

  private updateTargetPosition(pointer: Phaser.Input.Pointer): void {
    // Convert screen coordinates to world coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.targetPosition.set(worldPoint.x, worldPoint.y);
  }

  update(_time: number, delta: number): void {
    // Calculate direction to target
    const dx = this.targetPosition.x - this.parasite.x;
    const dy = this.targetPosition.y - this.parasite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only accelerate if we're not at the target (dead zone to prevent jitter)
    if (distance > 5) {
      // Normalize direction and apply acceleration
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Scale acceleration based on distance (stronger pull when far)
      const accelerationScale = Math.min(distance / 200, 1);
      const scaledAcceleration = ACCELERATION * accelerationScale;

      // Apply acceleration
      this.velocity.x += dirX * scaledAcceleration * (delta / 1000);
      this.velocity.y += dirY * scaledAcceleration * (delta / 1000);
    }

    // Apply drag (momentum decay)
    this.velocity.x *= DRAG;
    this.velocity.y *= DRAG;

    // Clamp to max speed
    const speed = this.velocity.length();
    if (speed > MAX_SPEED) {
      this.velocity.normalize().scale(MAX_SPEED);
    }

    // Update position
    this.parasite.x += this.velocity.x * (delta / 1000);
    this.parasite.y += this.velocity.y * (delta / 1000);

    // Enforce boundary walls with bounce
    this.enforceBoundaries();

    // Pulse effect based on speed
    const speedRatio = speed / MAX_SPEED;
    const pulseScale = 1 + speedRatio * 0.1;
    this.parasite.setScale(pulseScale);

    // Adjust glow intensity based on speed
    const glowAlpha = 0.3 + speedRatio * 0.5;
    this.parasite.setStrokeStyle(3 + speedRatio * 2, 0x00ff9d, glowAlpha);
  }

  private enforceBoundaries(): void {
    const margin = PARASITE_RADIUS;
    const bounceFactor = 0.5;

    // Left wall
    if (this.parasite.x < margin) {
      this.parasite.x = margin;
      this.velocity.x = Math.abs(this.velocity.x) * bounceFactor;
    }

    // Right wall
    if (this.parasite.x > WORLD_WIDTH - margin) {
      this.parasite.x = WORLD_WIDTH - margin;
      this.velocity.x = -Math.abs(this.velocity.x) * bounceFactor;
    }

    // Top wall
    if (this.parasite.y < margin) {
      this.parasite.y = margin;
      this.velocity.y = Math.abs(this.velocity.y) * bounceFactor;
    }

    // Bottom wall
    if (this.parasite.y > WORLD_HEIGHT - margin) {
      this.parasite.y = WORLD_HEIGHT - margin;
      this.velocity.y = -Math.abs(this.velocity.y) * bounceFactor;
    }
  }
}
