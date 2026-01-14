import Phaser from 'phaser';
import { CONFIG } from '../config';

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class GameScene extends Phaser.Scene {
  // Core game objects
  private parasite!: Phaser.GameObjects.Container;
  private parasiteBody!: Phaser.GameObjects.Arc;
  private parasiteGlow!: Phaser.GameObjects.Arc;

  // Physics state
  private velocity = new Phaser.Math.Vector2(0, 0);
  private targetPosition = new Phaser.Math.Vector2(0, 0);
  private isPointerActive = false;

  // Visual effects
  private trail: TrailPoint[] = [];
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private wallFlashAlpha = 0;

  // Input state
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

    // Create layers in order (back to front)
    this.createGrid();
    this.createBoundaryWalls();
    this.trailGraphics = this.add.graphics();
    this.createParasite();

    // Set up camera
    this.setupCamera();

    // Set up input
    this.setupInput();

    // Initialize target to parasite position
    this.targetPosition.set(this.parasite.x, this.parasite.y);
  }

  private createGrid(): void {
    // Create grid using graphics (rendered once as texture for performance)
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, CONFIG.GRID_COLOR, CONFIG.GRID_ALPHA);

    // Draw grid lines
    for (let x = 0; x <= CONFIG.WORLD_WIDTH; x += CONFIG.GRID_SIZE) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, CONFIG.WORLD_HEIGHT);
    }
    for (let y = 0; y <= CONFIG.WORLD_HEIGHT; y += CONFIG.GRID_SIZE) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(CONFIG.WORLD_WIDTH, y);
    }
    gridGraphics.strokePath();
  }

  private createBoundaryWalls(): void {
    const graphics = this.add.graphics();
    const t = CONFIG.WALL_THICKNESS;
    const w = CONFIG.WORLD_WIDTH;
    const h = CONFIG.WORLD_HEIGHT;

    // Main wall outline
    graphics.lineStyle(t, CONFIG.WALL_COLOR, 0.6);
    graphics.strokeRect(t / 2, t / 2, w - t, h - t);

    // Corner accents (brighter)
    const cornerSize = 60;
    graphics.lineStyle(3, CONFIG.WALL_COLOR, 1);

    // Draw L-shaped corners
    const corners = [
      { x: 0, y: 0, dx: 1, dy: 1 },      // top-left
      { x: w, y: 0, dx: -1, dy: 1 },     // top-right
      { x: w, y: h, dx: -1, dy: -1 },    // bottom-right
      { x: 0, y: h, dx: 1, dy: -1 },     // bottom-left
    ];

    corners.forEach(({ x, y, dx, dy }) => {
      graphics.moveTo(x, y + dy * cornerSize);
      graphics.lineTo(x, y);
      graphics.lineTo(x + dx * cornerSize, y);
    });
    graphics.strokePath();
  }

  private createParasite(): void {
    const x = CONFIG.WORLD_WIDTH / 2;
    const y = CONFIG.WORLD_HEIGHT / 2;

    // Container for parasite parts
    this.parasite = this.add.container(x, y);

    // Outer glow (larger, semi-transparent)
    this.parasiteGlow = this.add.circle(0, 0, CONFIG.PARASITE_RADIUS * 1.5, CONFIG.PARASITE_COLOR, 0.15);

    // Main body
    this.parasiteBody = this.add.circle(0, 0, CONFIG.PARASITE_RADIUS, CONFIG.PARASITE_COLOR);
    this.parasiteBody.setStrokeStyle(2, 0xffffff, 0.3);

    // Inner highlight (gives depth)
    const highlight = this.add.circle(
      -CONFIG.PARASITE_RADIUS * 0.3,
      -CONFIG.PARASITE_RADIUS * 0.3,
      CONFIG.PARASITE_RADIUS * 0.3,
      0xffffff,
      0.2
    );

    this.parasite.add([this.parasiteGlow, this.parasiteBody, highlight]);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    cam.startFollow(this.parasite, true, CONFIG.CAMERA_LERP, CONFIG.CAMERA_LERP);
  }

  private setupInput(): void {
    // Keyboard input
    if (this.input.keyboard) {
      this.keys = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Pointer input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isPointerActive = true;
      this.updateTargetFromPointer(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown || this.isPointerActive) {
        this.updateTargetFromPointer(pointer);
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerActive = false;
    });
  }

  private updateTargetFromPointer(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.targetPosition.set(worldPoint.x, worldPoint.y);
  }

  update(time: number, delta: number): void {
    this.handleInput(delta);
    this.updatePhysics(delta);
    this.updateTrail();
    this.updateVisuals(time, delta);
    this.drawTrail();
  }

  private handleInput(delta: number): void {
    // Keyboard movement (direct velocity control)
    if (this.keys) {
      const keyAccel = CONFIG.ACCELERATION * 0.8;
      let kx = 0, ky = 0;

      if (this.keys.left.isDown || this.keys.a.isDown) kx -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) kx += 1;
      if (this.keys.up.isDown || this.keys.w.isDown) ky -= 1;
      if (this.keys.down.isDown || this.keys.s.isDown) ky += 1;

      if (kx !== 0 || ky !== 0) {
        const len = Math.sqrt(kx * kx + ky * ky);
        this.velocity.x += (kx / len) * keyAccel * (delta / 1000);
        this.velocity.y += (ky / len) * keyAccel * (delta / 1000);
      }
    }

    // Pointer/touch movement
    if (this.isPointerActive) {
      const dx = this.targetPosition.x - this.parasite.x;
      const dy = this.targetPosition.y - this.parasite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > CONFIG.DEAD_ZONE) {
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Smoother acceleration curve
        const accelerationScale = Math.min(distance / 150, 1);
        const scaledAcceleration = CONFIG.ACCELERATION * accelerationScale;

        this.velocity.x += dirX * scaledAcceleration * (delta / 1000);
        this.velocity.y += dirY * scaledAcceleration * (delta / 1000);
      }
    }
  }

  private updatePhysics(delta: number): void {
    // Frame-rate independent drag
    // drag^(delta/16.67) gives consistent behavior across frame rates
    const frameRatio = delta / 16.667;
    const effectiveDrag = Math.pow(CONFIG.DRAG, frameRatio);

    this.velocity.x *= effectiveDrag;
    this.velocity.y *= effectiveDrag;

    // Clamp to max speed
    const speed = this.velocity.length();
    if (speed > CONFIG.MAX_SPEED) {
      this.velocity.normalize().scale(CONFIG.MAX_SPEED);
    }

    // Stop if moving very slowly
    if (speed < 1) {
      this.velocity.set(0, 0);
    }

    // Update position
    this.parasite.x += this.velocity.x * (delta / 1000);
    this.parasite.y += this.velocity.y * (delta / 1000);

    // Enforce boundaries
    this.enforceBoundaries();
  }

  private enforceBoundaries(): void {
    const margin = CONFIG.PARASITE_RADIUS + CONFIG.WALL_THICKNESS / 2;
    let hitWall = false;

    // Left wall
    if (this.parasite.x < margin) {
      this.parasite.x = margin;
      this.velocity.x = Math.abs(this.velocity.x) * CONFIG.BOUNCE_FACTOR;
      hitWall = true;
    }
    // Right wall
    if (this.parasite.x > CONFIG.WORLD_WIDTH - margin) {
      this.parasite.x = CONFIG.WORLD_WIDTH - margin;
      this.velocity.x = -Math.abs(this.velocity.x) * CONFIG.BOUNCE_FACTOR;
      hitWall = true;
    }
    // Top wall
    if (this.parasite.y < margin) {
      this.parasite.y = margin;
      this.velocity.y = Math.abs(this.velocity.y) * CONFIG.BOUNCE_FACTOR;
      hitWall = true;
    }
    // Bottom wall
    if (this.parasite.y > CONFIG.WORLD_HEIGHT - margin) {
      this.parasite.y = CONFIG.WORLD_HEIGHT - margin;
      this.velocity.y = -Math.abs(this.velocity.y) * CONFIG.BOUNCE_FACTOR;
      hitWall = true;
    }

    // Visual feedback on wall hit
    if (hitWall && this.velocity.length() > 50) {
      this.wallFlashAlpha = 0.8;
      this.cameras.main.shake(50, 0.003);
    }
  }

  private updateTrail(): void {
    const speed = this.velocity.length();

    // Only add trail points when moving
    if (speed > 20) {
      // Add new trail point
      this.trail.unshift({
        x: this.parasite.x,
        y: this.parasite.y,
        alpha: Math.min(speed / CONFIG.MAX_SPEED, 1) * 0.6,
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

  private drawTrail(): void {
    this.trailGraphics.clear();

    if (this.trail.length < 2) return;

    // Draw trail segments
    for (let i = 0; i < this.trail.length - 1; i++) {
      const point = this.trail[i];
      const nextPoint = this.trail[i + 1];

      // Size decreases along trail
      const sizeRatio = 1 - (i / this.trail.length);
      const radius = CONFIG.PARASITE_RADIUS * 0.8 * sizeRatio;

      this.trailGraphics.fillStyle(CONFIG.PARASITE_COLOR, point.alpha * 0.5);
      this.trailGraphics.fillCircle(point.x, point.y, radius);

      // Connect with line
      this.trailGraphics.lineStyle(radius * 2, CONFIG.PARASITE_COLOR, point.alpha * 0.3);
      this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
    }
  }

  private updateVisuals(time: number, delta: number): void {
    const speed = this.velocity.length();
    const speedRatio = speed / CONFIG.MAX_SPEED;

    // Pulse effect
    const pulse = 1 + Math.sin(time * 0.005) * 0.03;
    const speedPulse = 1 + speedRatio * 0.15;
    this.parasite.setScale(pulse * speedPulse);

    // Rotate slightly in movement direction
    if (speed > 10) {
      const targetAngle = Math.atan2(this.velocity.y, this.velocity.x);
      this.parasite.rotation = Phaser.Math.Angle.RotateTo(
        this.parasite.rotation,
        targetAngle,
        0.1
      );
    }

    // Glow intensity based on speed
    this.parasiteGlow.setAlpha(0.1 + speedRatio * 0.25);
    this.parasiteGlow.setScale(1 + speedRatio * 0.3);

    // Dynamic camera lerp (faster follow when moving fast)
    const camLerp = Phaser.Math.Linear(
      CONFIG.CAMERA_LERP,
      CONFIG.CAMERA_LERP_FAST,
      speedRatio
    );
    this.cameras.main.setLerp(camLerp, camLerp);

    // Wall flash decay
    if (this.wallFlashAlpha > 0) {
      this.wallFlashAlpha -= delta * 0.005;
      const baseColor = new Phaser.Display.Color(10, 10, 18);
      const flashColor = new Phaser.Display.Color(0, 255, 157);
      const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
        baseColor,
        flashColor,
        100,
        this.wallFlashAlpha * 100
      );
      this.cameras.main.setBackgroundColor(
        Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b)
      );
    }
  }
}
