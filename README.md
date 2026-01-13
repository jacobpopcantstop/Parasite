# PARASITE V3.7: HOST PROTOCOL

A web-based bio-simulation game where you play as a parasitic organism infiltrating and consuming host cells.

## How to Play

### Game Overview
- **Goal**: Infiltrate hosts, consume cells, and grow stronger
- **Currency**: DNA - collected from defeated enemies and destroyed organelles
- **Progression**: Gain biomass to unlock mutations and upgrades

### Controls

#### Touch/Mobile (Left/Right Split Screen)
- **Left Side**: Movement joystick - swipe to move
- **Right Side**: Dash button - tap to dash

#### Keyboard
- **WASD** or **Arrow Keys**: Move
- **SPACE**: Dash (costs energy)

### Game Mechanics

1. **Integrity (HP)**: Your health - when it reaches 0, the run ends
2. **Energy**: Dash ability cooldown - regenerates over time
3. **Biomass (XP)**: Gain from consuming cells and defeating enemies - level up to unlock mutations

### Mutations (Upgrades)

Available upgrades at each level-up:

- **⚡ MOTILITY**: Increases movement speed
- **🏹 NEEDLES**: Adds auto-fire weapon targeting nearby enemies
- **💥 SPIKES**: Adds contact damage to enemies
- **🧪 ACID**: Creates damaging trail behind you
- **🛡️ CARAPACE**: Reduces damage taken from enemy projectiles

### Enemies

- **Chargers** (Orange Triangle): Rush directly at you
- **Shooters** (Cyan Square): Keep distance and shoot projectiles
- **Antibodies** (Red Hexagon): Fast melee defenders in hosts

### Host Cells

Large organisms containing:
- **Organelles** (Yellow/Orange): High-value targets, full of DNA
- **Cell Matter** (Red): Basic cells for XP and healing
- **Antibodies**: Immune system defenders

## Running the Game

### Using Python
```bash
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Using Node.js (http-server)
```bash
npx http-server -p 8000 -o
```

## Game Features

- **Canvas-based rendering**: Full 2D graphics using HTML5 Canvas
- **Procedural host generation**: Unique host layouts every run
- **Spatial hashing**: Optimized collision detection
- **Audio synthesis**: Dynamic sound effects using Web Audio API
- **Minimap**: Real-time navigation with enemy tracking
- **Progressive difficulty**: Enemies scale with progression
- **Save system**: DNA persists between runs via localStorage

## Technical Details

- **Pure JavaScript**: No external dependencies required
- **Single HTML file**: All code, styles, and assets embedded
- **Mobile-optimized**: Touch controls and responsive design
- **Performant**: Spatial hashing for efficient collision detection
- **Cross-browser**: Works on all modern browsers

## Development

The game is built as a single `index.html` file containing:
- HTML structure
- CSS styling and animations
- JavaScript game engine with:
  - Game loop and rendering pipeline
  - Entity management (Player, Enemies, Hosts, etc.)
  - Input handling (keyboard, touch, mouse)
  - Collision detection
  - UI and HUD systems
  - Audio engine
  - Procedural generation
