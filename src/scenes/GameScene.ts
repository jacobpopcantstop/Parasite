import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Parasite } from '../entities/Parasite';
import { GameState } from '../core/GameState';
import { Events, GameEventType } from '../core/Events';

export class GameScene extends Phaser.Scene {
  // Phase 2: Entity-managed parasite
  private parasite!: Parasite;

  // Wall flash visual feedback (camera-level effect, lives in scene)
  private wallFlashAlpha = 0;

  // Keyboard input
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

  // Stored unsubscribe functions for event cleanup on scene shutdown
  private eventUnsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Initialize game state for a new run
    GameState.startRun();

    // Set world bounds
    this.physics.world.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

    // Create background layers (back to front)
    this.createGrid();
    this.createBoundaryWalls();

    // Create and render the parasite entity
    this.parasite = new Parasite(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    this.parasite.render(this);
    this.parasite.setBounds(
      CONFIG.WORLD_WIDTH,
      CONFIG.WORLD_HEIGHT,
      CONFIG.WALL_THICKNESS,
      CONFIG.BOUNCE_FACTOR
    );

    // Set up camera to follow parasite
    this.setupCamera();

    // Set up input handlers
    this.setupInput();

    // Subscribe to game events
    this.setupEvents();
  }

  private createGrid(): void {
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, CONFIG.GRID_COLOR, CONFIG.GRID_ALPHA);

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

    const corners = [
      { x: 0, y: 0, dx: 1, dy: 1 },
      { x: w, y: 0, dx: -1, dy: 1 },
      { x: w, y: h, dx: -1, dy: -1 },
      { x: 0, y: h, dx: 1, dy: -1 },
    ];

    corners.forEach(({ x, y, dx, dy }) => {
      graphics.moveTo(x, y + dy * cornerSize);
      graphics.lineTo(x, y);
      graphics.lineTo(x + dx * cornerSize, y);
    });
    graphics.strokePath();
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    if (this.parasite.container) {
      cam.startFollow(this.parasite.container, true, CONFIG.CAMERA_LERP, CONFIG.CAMERA_LERP);
    }
  }

  private setupInput(): void {
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.parasite.setPointerActive(true);
      this.updateTargetFromPointer(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.updateTargetFromPointer(pointer);
      }
    });

    this.input.on('pointerup', () => {
      this.parasite.setPointerActive(false);
    });
  }

  private updateTargetFromPointer(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.parasite.setTarget(worldPoint.x, worldPoint.y);
  }

  private setupEvents(): void {
    // Wall hit: trigger camera shake and background flash
    this.eventUnsubscribers.push(
      Events.on(GameEventType.WALL_HIT, ({ velocity }) => {
        if (velocity > 50) {
          this.wallFlashAlpha = 0.8;
          this.cameras.main.shake(50, 0.003);
        }
      })
    );
  }

  update(time: number, delta: number): void {
    // Feed keyboard input to the parasite entity
    this.handleKeyboardInput(delta);

    // Update parasite physics and state
    this.parasite.update(delta, time);

    // Update parasite visuals
    this.parasite.updateVisuals(time, delta);

    // Dynamic camera lerp (faster follow when parasite is moving fast)
    this.updateCameraLerp();

    // Update wall flash background effect
    this.updateWallFlash(delta);

    // Track run duration
    GameState.updateRunDuration();
  }

  private handleKeyboardInput(delta: number): void {
    if (!this.keys) return;

    let kx = 0, ky = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) kx -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) kx += 1;
    if (this.keys.up.isDown || this.keys.w.isDown) ky -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown) ky += 1;

    this.parasite.applyKeyboardInput(kx, ky, delta);
  }

  private updateCameraLerp(): void {
    const speedRatio = this.parasite.speed / GameState.effectiveMaxSpeed;
    const camLerp = Phaser.Math.Linear(
      CONFIG.CAMERA_LERP,
      CONFIG.CAMERA_LERP_FAST,
      speedRatio
    );
    this.cameras.main.setLerp(camLerp, camLerp);
  }

  private updateWallFlash(delta: number): void {
    if (this.wallFlashAlpha <= 0) return;

    this.wallFlashAlpha -= delta * 0.005;

    // Flash fully faded: reset background to normal color
    if (this.wallFlashAlpha <= 0) {
      this.wallFlashAlpha = 0;
      this.cameras.main.setBackgroundColor(CONFIG.BACKGROUND_COLOR);
      return;
    }

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

  shutdown(): void {
    // Unsubscribe from all game events
    for (const unsub of this.eventUnsubscribers) {
      unsub();
    }
    this.eventUnsubscribers = [];

    // Clean up the parasite entity
    if (this.parasite) {
      this.parasite.destroy();
    }
  }
}
