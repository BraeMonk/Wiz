import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import {
  Wand2,
  Heart,
  Droplet,
  Flame,
  Zap,
  Skull
} from 'lucide-react';

const WizardDungeonCrawler = () => {
  // Game state
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, dead, victory
  const [currentLevel, setCurrentLevel] = useState(1);

  // Player stats
  const [player, setPlayer] = useState({
    x: 5,
    y: 5,
    angle: 0,
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    kills: 0
  });

  // Spells
  const [equippedSpells, setEquippedSpells] = useState([
    { key: 'fire', name: 'Fireball', damage: 25, manaCost: 15, cooldown: 0, maxCooldown: 1.0, color: '#ff4400', icon: Flame },
    { key: 'ice', name: 'Ice Shard', damage: 15, manaCost: 10, cooldown: 0, maxCooldown: 0.5, color: '#00aaff', icon: Droplet },
    { key: 'lightning', name: 'Lightning', damage: 40, manaCost: 25, cooldown: 0, maxCooldown: 2.0, color: '#ffff00', icon: Zap }
  ]);

  const [selectedSpell, setSelectedSpell] = useState(0);

  // Dungeon & entities
  const [dungeon, setDungeon] = useState([]);
  const [heightMap, setHeightMap] = useState([]); // terrain heights
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const particlesRef = useRef([]);

  // Rendering
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Input
  const keysPressed = useRef({});
  const lastTime = useRef(Date.now());

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Touch controls (mobile)
  const leftTouchId = useRef(null);
  const rightTouchId = useRef(null);
  const leftStart = useRef({ x: 0, y: 0 });
  const rightStart = useRef({ x: 0, y: 0 });
  const mobileMoveRef = useRef({ x: 0, y: 0 });
  const mobileLookRef = useRef({ x: 0, y: 0 });

  // Gamepad state
  const gamepadStateRef = useRef({ lx: 0, ly: 0, rx: 0, ry: 0, fire: false });
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Vertical look and jump
  const [pitch, setPitch] = useState(0); // look up/down
  const pitchRef = useRef(0);

  const [jumpState, setJumpState] = useState({
    height: 0,
    velocity: 0,
    grounded: true
  });
  const jumpRef = useRef({
    height: 0,
    velocity: 0,
    grounded: true
  });

  // Live player ref so spells always use current position/angle
  const playerRef = useRef(player);

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = 320;
  const MOVE_SPEED = 3;
  const TURN_SPEED = 2;
  const PIXEL_STEP = 4; // quantization step for "pixel" look

  // Wall types (more cave-like, plus special shapes)
  const WALL_TYPES = {
    0: null, // empty
    1: { color: '#3a3248', name: 'Stone' },        // cold stone
    2: { color: '#5b3b2a', name: 'Strata' },       // layered rock
    3: { color: '#244026', name: 'Moss' },         // damp moss
    4: { color: '#5a1010', name: 'Vein' },         // blood / ore veins
    5: { color: '#40304a', name: 'Stalactite' },   // ceiling spikes
    6: { color: '#3b2f24', name: 'Stalagmite' },   // floor spikes
    7: { color: '#4b3a30', name: 'Boulder' }       // chunky blocks
  };

  // Enemy types (4 monsters)
  const ENEMY_TYPES = {
    skeleton: { health: 30, damage: 10, speed: 1.5, xp: 15, color: '#e5e5e5', gold: 5 },
    demon: { health: 50, damage: 15, speed: 1.0, xp: 25, color: '#ff3b3b', gold: 10 },
    ghost: { health: 20, damage: 8, speed: 2.0, xp: 20, color: '#b8c6ff', gold: 8 },
    golem: { health: 80, damage: 20, speed: 0.8, xp: 40, color: '#b08b57', gold: 15 }
  };

  // --------- COLOR HELPERS FOR ENV + PIXEL SHADING ----------

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  };

  const rgbToCss = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;

  const lerp = (a, b, t) => a + (b - a) * t;

  const lerpColor = (hexA, hexB, t) => {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);

    const r = Math.round(lerp(a.r, b.r, t));
    const g = Math.round(lerp(a.g, b.g, t));
    const bVal = Math.round(lerp(a.b, b.b, t));

    const toHex = (v) => v.toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(bVal)}`;
  };

  // Dungeon → cave → deep cave theme based on depth
  const getEnvironmentTheme = (level) => {
    // t = 0 early levels (cold stone dungeon), t = 1 deep earth cave
    const t = Math.max(0, Math.min(1, (level - 1) / 8));

    // Ceiling / floor / fog
    const ceiling = lerpColor('#151826', '#050608', t);        // blue-purple → almost black
    const floorTop = lerpColor('#2b2838', '#3a2818', t);       // arcane stone → warm earth
    const floorBottom = lerpColor('#14101e', '#1a0c08', t);    // dark violet → deep brown
    const fog = lerpColor('#05040b', '#030203', t);            // soft arcane haze → heavy dark fog

    // Wall palette progression:
    //  - early: cooler, bluish stone
    //  - mid: warmer torch-lit stone
    //  - deep: earthy + lava veins + bright moss
    const wallPalette = {
      1: lerpColor('#3a3248', '#3b2f24', t),  // stone → earth stone
      2: lerpColor('#5b3b2a', '#6a4324', t),  // strata: gets warmer
      3: lerpColor('#244026', '#3f6b32', t),  // moss: brighter / more alive deeper
      4: lerpColor('#5a1010', '#c13a16', t),  // vein: becomes hotter, lava-like
      5: lerpColor('#40304a', '#2c1d24', t),  // stalactite: darkens overhead
      6: lerpColor('#3b2f24', '#4b2b1a', t),  // stalagmite: warmer rock
      7: lerpColor('#4b3a30', '#3a2a20', t)   // boulder: heavier, darker
    };

    const accentTorch = lerpColor('#ffb347', '#ff7b1a', t);     // warm fire
    const accentFungi = lerpColor('#6bd6ff', '#9cffc5', t);     // blue → green bio-glow

    return {
      ceiling,
      floorTop,
      floorBottom,
      fog,
      wallPalette,
      accentTorch,
      accentFungi
    };
  };

  // Keep refs in sync with state
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);

  useEffect(() => {
    jumpRef.current = jumpState;
  }, [jumpState]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      const mobile =
        /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ||
        window.innerWidth < 900;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gamepad connect / disconnect
  useEffect(() => {
    const handleConnect = () => setGamepadConnected(true);
    const handleDisconnect = () => setGamepadConnected(false);

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  // Ambient dust particles
  useEffect(() => {
    const count = 60;
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),                  // 0..1 screen space
        y: Math.random(),
        z: Math.random(),                  // 0 near, 1 far
        vx: (Math.random() - 0.5) * 0.06,  // slow drift
        vy: (Math.random() - 0.5) * 0.06
      });
    }
    particlesRef.current = particles;
  }, []);

  // Generate dungeon + terrain
  const generateDungeon = useCallback((level) => {
    const size = DUNGEON_SIZE;
    const map = [];

    // Initialize with walls
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
          row.push(1);
        } else {
          if (Math.random() < 0.2) {
            const r = Math.random();
            let tile;
            if (r < 0.5) tile = 1;             // stone
            else if (r < 0.7) tile = 2;        // strata
            else if (r < 0.82) tile = 3;       // moss
            else if (r < 0.9) tile = 4;        // vein
            else if (r < 0.95) tile = 5;       // stalactite
            else if (r < 0.975) tile = 6;      // stalagmite
            else tile = 7;                     // boulder
            row.push(tile);
          } else {
            row.push(0);
          }
        }
      }
      map.push(row);
    }

    // Create rooms
    const numRooms = 5 + level * 2;
    for (let i = 0; i < numRooms; i++) {
      const roomW = Math.floor(Math.random() * 5) + 3;
      const roomH = Math.floor(Math.random() * 5) + 3;
      const roomX = Math.floor(Math.random() * (size - roomW - 2)) + 1;
      const roomY = Math.floor(Math.random() * (size - roomH - 2)) + 1;

      for (let y = roomY; y < roomY + roomH; y++) {
        for (let x = roomX; x < roomX + roomW; x++) {
          if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
            map[y][x] = 0;
          }
        }
      }
    }

    // Clear spawn area
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = 5 + dx;
        const y = 5 + dy;
        if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
          map[y][x] = 0;
        }
      }
    }

    // --- Terrain height map (basic bumps/levels) ---
    const heights = [];
    for (let y = 0; y < size; y++) {
      const rowHeights = [];
      for (let x = 0; x < size; x++) {
        if (map[y][x] === 0) {
          const r = Math.random();
          let h = 0;
          if (r < 0.05) h = 1;       // slightly raised tile
          else if (r > 0.95) h = -1; // slightly lower tile
          rowHeights.push(h);
        } else {
          rowHeights.push(0);
        }
      }
      heights.push(rowHeights);
    }

    // Flatten spawn area
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = 5 + dx;
        const y = 5 + dy;
        if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
          heights[y][x] = 0;
        }
      }
    }

    setHeightMap(heights);
    // --- end terrain ---

    // Generate enemies
    const newEnemies = [];
    const enemyCount = 10 + level * 3;
    const enemyTypesList = Object.keys(ENEMY_TYPES);

    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      do {
        x = Math.random() * (size - 4) + 2;
        y = Math.random() * (size - 4) + 2;
      } while (map[Math.floor(y)][Math.floor(x)] !== 0 || Math.hypot(x - 5, y - 5) < 5);

      const type = enemyTypesList[Math.floor(Math.random() * enemyTypesList.length)];
      const stats = ENEMY_TYPES[type];

      newEnemies.push({
        id: Math.random(),
        x,
        y,
        type,
        health: stats.health * (1 + level * 0.2),
        maxHealth: stats.health * (1 + level * 0.2),
        damage: stats.damage * (1 + level * 0.1),
        speed: stats.speed,
        xp: stats.xp * level,
        gold: stats.gold * level,
        color: stats.color,
        angle: Math.random() * Math.PI * 2,
        state: 'idle', // idle, chasing, attacking
        attackCooldown: 0
      });
    }

    // Generate items
    const newItems = [];
    const itemCount = 5 + level;
    const itemTypes = [
      { type: 'health', amount: 30, color: '#ff0000' },
      { type: 'mana', amount: 40, color: '#0000ff' },
      { type: 'gold', amount: 25, color: '#ffff00' }
    ];

    for (let i = 0; i < itemCount; i++) {
      let x, y;
      do {
        x = Math.random() * (size - 4) + 2;
        y = Math.random() * (size - 4) + 2;
      } while (map[Math.floor(y)][Math.floor(x)] !== 0);

      const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      newItems.push({
        id: Math.random(),
        x,
        y,
        ...itemType,
        collected: false
      });
    }

    setDungeon(map);
    setEnemies(newEnemies);
    setItems(newItems);

    return map;
  }, []);

  // Initialize game on play
  useEffect(() => {
    if (gameState === 'playing') {
      const newMap = generateDungeon(currentLevel);
      setPlayer(prev => ({ ...prev, x: 5, y: 5, angle: 0 }));
      setProjectiles([]);
      setDungeon(newMap);
      setPitch(0);
      setJumpState({ height: 0, velocity: 0, grounded: true });
    }
  }, [gameState, currentLevel, generateDungeon]);

  // Raycasting
  const castRay = useCallback((origin, angle, map) => {
    const rayDir = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = 0;
    const step = 0.05;

    while (distance < RENDER_DISTANCE) {
      const checkX = origin.x + rayDir.x * distance;
      const checkY = origin.y + rayDir.y * distance;
      const tileX = Math.floor(checkX);
      const tileY = Math.floor(checkY);

      if (
        tileX < 0 ||
        tileX >= DUNGEON_SIZE ||
        tileY < 0 ||
        tileY >= DUNGEON_SIZE
      ) {
        return { distance: RENDER_DISTANCE, tile: 1, tileX, tileY };
      }

      const tile = map[tileY][tileX];
      if (tile > 0) {
        const correctedDistance = distance * Math.cos(angle - origin.angle);
        const hitX = checkX - tileX;
        const hitY = checkY - tileY;
        const side =
          Math.abs(hitX - 0.5) > Math.abs(hitY - 0.5) ? 1 : 0;
        return { distance: correctedDistance, tile, side, tileX, tileY };
      }

      distance += step;
    }

    return null;
  }, []);

  // --------- MONSTER SPRITE DRAWING (dark fantasy pixel look) ----------

  const drawMonsterSprite = (ctx, sprite, x, y, w, h, brightness) => {
    ctx.save();
    ctx.globalAlpha = brightness;

    const baseColor = hexToRgb(sprite.color.startsWith('#') ? sprite.color : '#ffffff');
    const darkColor = {
      r: Math.round(baseColor.r * 0.4),
      g: Math.round(baseColor.g * 0.4),
      b: Math.round(baseColor.b * 0.4)
    };

    const fillBase = rgbToCss(baseColor);
    const fillDark = rgbToCss(darkColor);

    const px = Math.max(2, Math.floor(w / 6));
    const py = Math.max(2, Math.floor(h / 6));

    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';

    switch (sprite.type) {
      case 'skeleton': {
        // Skull
        const headW = px * 3;
        const headH = py * 2;
        ctx.fillStyle = fillBase;
        ctx.fillRect(cx - headW / 2, y, headW, headH);
        // Eye sockets
        ctx.fillStyle = fillDark;
        ctx.fillRect(cx - px, y + py / 2, px / 2, py / 2);
        ctx.fillRect(cx + px / 2, y + py / 2, px / 2, py / 2);
        // Jaw
        ctx.fillRect(cx - headW / 3, y + headH - py / 2, (headW * 2) / 3, py / 2);

        // Spine
        ctx.fillStyle = fillBase;
        ctx.fillRect(cx - px / 4, y + headH, px / 2, h / 2);

        // Ribs
        for (let i = 0; i < 3; i++) {
          const ry = y + headH + py * (1 + i);
          ctx.fillRect(cx - px * 1.5, ry, px, py / 4);
          ctx.fillRect(cx + px * 0.5, ry, px, py / 4);
        }

        // Legs
        const legY = y + h - py * 1.5;
        ctx.fillRect(cx - px, legY, px / 2, py * 1.5);
        ctx.fillRect(cx + px / 2, legY, px / 2, py * 1.5);

        break;
      }
      case 'demon': {
        // Torso
        ctx.fillStyle = fillBase;
        const bodyW = px * 3;
        const bodyH = h * 0.55;
        const bodyX = cx - bodyW / 2;
        const bodyY = cy - bodyH / 3;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

        // Horns
        ctx.fillRect(bodyX - px / 2, bodyY - py, px, py);
        ctx.fillRect(bodyX + bodyW - px / 2, bodyY - py, px, py);

        // Eyes
        ctx.fillStyle = 'rgb(255,230,120)';
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px / 2, py / 2);
        ctx.fillRect(bodyX + bodyW - px, bodyY + py / 2, px / 2, py / 2);

        // Mouth
        ctx.fillStyle = fillDark;
        ctx.fillRect(bodyX + px / 2, bodyY + py * 1.6, bodyW - px, py / 2);

        // Arms
        ctx.fillStyle = fillBase;
        ctx.fillRect(bodyX - px, bodyY + py, px, py * 2);
        ctx.fillRect(bodyX + bodyW, bodyY + py, px, py * 2);

        // Legs
        const legY = bodyY + bodyH;
        ctx.fillRect(cx - px, legY, px, py * 2);
        ctx.fillRect(cx + px / 2, legY, px, py * 2);

        break;
      }
      case 'ghost': {
        // Floating sheet body with wavy bottom
        ctx.fillStyle = fillBase;
        const bodyW = px * 3;
        const bodyH = h * 0.7;
        const bodyX = cx - bodyW / 2;
        const bodyY = y + py;

        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

        // Wave bottom
        ctx.fillStyle = fillDark;
        for (let i = 0; i < 3; i++) {
          const wx = bodyX + (i * bodyW) / 3;
          const wy = bodyY + bodyH - py / 2;
          ctx.fillRect(wx, wy, bodyW / 4, py / 2);
        }

        // Eyes
        ctx.fillStyle = 'rgb(40,40,80)';
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px / 2, py / 2);
        ctx.fillRect(bodyX + bodyW - px, bodyY + py / 2, px / 2, py / 2);

        // Halo-ish glow outline
        ctx.strokeStyle = 'rgba(200,220,255,0.7)';
        ctx.strokeRect(bodyX - 1, bodyY - 1, bodyW + 2, bodyH + 2);

        break;
      }
      case 'golem': {
        // Chunky rock torso
        ctx.fillStyle = fillBase;
        const bodyW = px * 4;
        const bodyH = h * 0.55;
        const bodyX = cx - bodyW / 2;
        const bodyY = cy - bodyH / 3;

        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

        // Random stone "chips"
        ctx.fillStyle = fillDark;
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px, py / 2);
        ctx.fillRect(bodyX + bodyW - px * 1.5, bodyY + py, px, py / 2);
        ctx.fillRect(bodyX + px, bodyY + bodyH - py, px, py / 2);

        // Head block
        ctx.fillStyle = fillBase;
        const headW = px * 2.2;
        const headH = py * 1.6;
        const headX = cx - headW / 2;
        const headY = bodyY - headH;
        ctx.fillRect(headX, headY, headW, headH);

        // Eyes (dim)
        ctx.fillStyle = 'rgb(230,200,140)';
        ctx.fillRect(headX + px / 2, headY + py / 2, px / 2, py / 2);
        ctx.fillRect(headX + headW - px, headY + py / 2, px / 2, py / 2);

        // Arms
        ctx.fillStyle = fillBase;
        ctx.fillRect(bodyX - px, bodyY + py, px, bodyH - py);
        ctx.fillRect(bodyX + bodyW, bodyY + py, px, bodyH - py);

        // Legs
        const legY = bodyY + bodyH;
        ctx.fillRect(cx - px * 1.2, legY, px, py * 2);
        ctx.fillRect(cx + px * 0.2, legY, px, py * 2);

        break;
      }
      default: {
        // Fallback rectangle
        ctx.fillStyle = fillBase;
        ctx.fillRect(x, y, w, h);
      }
    }

    ctx.restore();
  };

  // --------- PROJECTILE SPRITES (fire / ice / lightning) ----------
  const drawProjectileSprite = (ctx, projectile, x, y, size, brightness) => {
    ctx.save();
    ctx.globalAlpha = brightness;

    const baseColor = projectile.color || '#ffffff';

    switch (projectile.spellType) {
      case 'fire': {
        // Teardrop flame
        ctx.translate(x, y);
        ctx.scale(1, 1.3); // a bit taller
        const r = size * 0.6;

        // Outer glow
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 140, 0, 0.25)';
        ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Main flame body
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r, -r * 0.4, r * 0.6, r * 0.7, 0, r);
        ctx.bezierCurveTo(-r * 0.6, r * 0.7, -r, -r * 0.4, 0, -r);
        ctx.fill();

        // Hot core
        ctx.beginPath();
        ctx.fillStyle = '#ffe9a3';
        ctx.moveTo(0, -r * 0.6);
        ctx.bezierCurveTo(
          r * 0.4, -r * 0.2,
          r * 0.2, r * 0.4,
          0,
          r * 0.6
        );
        ctx.bezierCurveTo(
          -r * 0.2, r * 0.4,
          -r * 0.4, -r * 0.2,
          0,
          -r * 0.6
        );
        ctx.fill();

        break;
      }

      case 'ice': {
        // Shard diamond + spikes
        ctx.translate(x, y);
        const r = size * 0.7;

        // Soft icy glow
        ctx.beginPath();
        ctx.fillStyle = 'rgba(180, 220, 255, 0.25)';
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Main diamond shard
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.75, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.75, 0);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.fillStyle = '#e6f4ff';
        ctx.moveTo(0, -r * 0.6);
        ctx.lineTo(r * 0.4, 0);
        ctx.lineTo(0, r * 0.6);
        ctx.lineTo(-r * 0.4, 0);
        ctx.closePath();
        ctx.fill();

        // Side shards
        ctx.strokeStyle = '#c2e4ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.2);
        ctx.lineTo(-r * 1.2, -r * 0.5);
        ctx.moveTo(r * 0.9, r * 0.2);
        ctx.lineTo(r * 1.2, r * 0.5);
        ctx.stroke();

        break;
      }

      case 'lightning': {
        // Jagged bolt
        ctx.translate(x, y);
        const len = size * 2.0;
        const half = len / 2;

        // Outer glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
        grad.addColorStop(0, 'rgba(255, 255, 180, 0.6)');
        grad.addColorStop(1, 'rgba(255, 255, 180, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, len, 0, Math.PI * 2);
        ctx.fill();

        // Core bolt
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-size * 0.3, -half);
        ctx.lineTo(size * 0.1, -half * 0.3);
        ctx.lineTo(-size * 0.15, half * 0.1);
        ctx.lineTo(size * 0.25, half * 0.8);
        ctx.stroke();

        // Secondary highlight
        ctx.strokeStyle = '#fffff0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, -half * 0.8);
        ctx.lineTo(size * 0.05, -half * 0.4);
        ctx.lineTo(-size * 0.05, half * 0.1);
        ctx.stroke();

        break;
      }

      default: {
        // Fallback: simple orb
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  // Render frame
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dungeon.length) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    const env = getEnvironmentTheme(currentLevel);

    const playerTileX = Math.floor(player.x);
    const playerTileY = Math.floor(player.y);
    const playerHeight =
      heightMap[playerTileY]?.[playerTileX] ?? 0;

    const baseHorizon = height / 2;
    const horizon =
      baseHorizon +
      pitch * (height * 0.4) -
      jumpState.height * 40;

    // Clear / fog
    ctx.fillStyle = env.fog;
    ctx.fillRect(0, 0, width, height);

    // Ceiling (above horizon)
    ctx.fillStyle = env.ceiling;
    const ceilingHeight = Math.max(0, Math.min(height, horizon));
    ctx.fillRect(0, 0, width, ceilingHeight);

    // Floor (below horizon)
    const floorStart = Math.max(0, Math.min(height, horizon));
    const gradient = ctx.createLinearGradient(0, floorStart, 0, height);
    gradient.addColorStop(0, env.floorTop);
    gradient.addColorStop(1, env.floorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, floorStart, width, height - floorStart);

    // Cast rays for walls (pixel-quantized)
    const rayAngleStep = (FOV * Math.PI / 180) / RESOLUTION;
    const startAngle = player.angle - (FOV * Math.PI / 180) / 2;

    const zBuffer = new Array(RESOLUTION).fill(RENDER_DISTANCE);

    for (let i = 0; i < RESOLUTION; i++) {
      const rayAngle = startAngle + i * rayAngleStep;
      const hit = castRay(player, rayAngle, dungeon);

      if (hit) {
        const sliceWidth = width / RESOLUTION;
        const wallHeightRaw = hit.distance > 0.1 ? height / hit.distance : height * 2;
        const baseWallHeight = Math.max(
          PIXEL_STEP,
          Math.floor(wallHeightRaw / PIXEL_STEP) * PIXEL_STEP
        );

        const x = i * sliceWidth;

        // Terrain-aware wall vertical position
        const tileHeight = heightMap[hit.tileY]?.[hit.tileX] ?? 0;
        const relativeHeight = tileHeight - playerHeight;
        const terrainOffset = relativeHeight * 20;

        const yRaw =
          horizon - baseWallHeight / 2 - terrainOffset;
        let sliceY = Math.floor(yRaw / PIXEL_STEP) * PIXEL_STEP;
        let sliceHeight = baseWallHeight;

        const tileId = hit.tile;

        // shape tweaks per tile (stalactites/stalagmites/boulders)
        if (tileId === 5) {
          const raw = Math.sin(i * 12.9898 + currentLevel * 78.233) * 43758.5453;
          const noise = raw - Math.floor(raw);
          const offset = Math.floor((noise * baseWallHeight * 0.3) / PIXEL_STEP) * PIXEL_STEP;
          sliceHeight = Math.max(PIXEL_STEP, sliceHeight - offset);
        } else if (tileId === 6) {
          const raw = Math.sin(i * 7.123 + currentLevel * 19.321) * 43758.5453;
          const noise = raw - Math.floor(raw);
          const offset = Math.floor((noise * baseWallHeight * 0.3) / PIXEL_STEP) * PIXEL_STEP;
          sliceY += offset;
          sliceHeight = Math.max(PIXEL_STEP, sliceHeight - offset);
        } else if (tileId === 7) {
          const offset = Math.floor((baseWallHeight * 0.15) / PIXEL_STEP) * PIXEL_STEP;
          sliceY += offset;
          sliceHeight = Math.max(PIXEL_STEP, sliceHeight - offset);
        }

        const wallType = WALL_TYPES[tileId];
        if (wallType) {
          let brightness = 1.0 - (hit.distance / RENDER_DISTANCE);

          const depthFactor =
            0.9 - Math.max(0, Math.min(0.4, (currentLevel - 1) * 0.03));
          brightness *= depthFactor;

          if (hit.side === 1) brightness *= 0.75;

          const dither =
            (i + Math.floor(sliceY / PIXEL_STEP)) % 2 === 0 ? 0.95 : 1.05;
          brightness *= dither;

          const baseHex = env.wallPalette[tileId] || wallType.color;
          const { r, g, b } = hexToRgb(baseHex);

          const rr = Math.max(0, Math.min(255, r * brightness));
          const gg = Math.max(0, Math.min(255, g * brightness));
          const bb = Math.max(0, Math.min(255, b * brightness));

          ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
          ctx.fillRect(
            Math.floor(x),
            sliceY,
            Math.ceil(sliceWidth) + 1,
            sliceHeight
          );

          if (tileId === 7) {
            ctx.strokeStyle = `rgba(0,0,0,0.35)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.floor(x) + sliceWidth * 0.3, sliceY + sliceHeight * 0.2);
            ctx.lineTo(Math.floor(x) + sliceWidth * 0.7, sliceY + sliceHeight * 0.5);
            ctx.lineTo(Math.floor(x) + sliceWidth * 0.4, sliceY + sliceHeight * 0.8);
            ctx.stroke();
          }
        }

        zBuffer[i] = hit.distance;
      }
    }

    // Draw sprites (enemies, items, projectiles)
    const allSprites = [
      ...enemies.map(e => ({ ...e, spriteType: 'enemy' })),
      ...items.filter(i => !i.collected).map(i => ({ ...i, spriteType: 'item' })),
      ...projectiles.map(p => ({ ...p, spriteType: 'projectile' }))
    ];

    allSprites.sort((a, b) => {
      const distA = Math.hypot(a.x - player.x, a.y - player.y);
      const distB = Math.hypot(b.x - player.x, b.y - player.y);
      return distB - distA;
    });

    allSprites.forEach(sprite => {
      const dx = sprite.x - player.x;
      const dy = sprite.y - player.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 0.1 || distance > RENDER_DISTANCE) return;

      let angleToSprite = Math.atan2(dy, dx) - player.angle;
      while (angleToSprite > Math.PI) angleToSprite -= Math.PI * 2;
      while (angleToSprite < -Math.PI) angleToSprite += Math.PI * 2;

      const halfFov = (FOV * Math.PI / 180) / 2;
      if (Math.abs(angleToSprite) > halfFov) return;

      const screenX = (angleToSprite / (FOV * Math.PI / 180) + 0.5) * width;
      const spriteHeightRaw = height / distance;
      const spriteHeight = Math.max(
        PIXEL_STEP,
        Math.floor(spriteHeightRaw / PIXEL_STEP) * PIXEL_STEP
      );
      const spriteWidthRaw = spriteHeight * (sprite.spriteType === 'projectile' ? 0.3 : 0.8);
      const spriteWidth = Math.max(
        PIXEL_STEP,
        Math.floor(spriteWidthRaw / PIXEL_STEP) * PIXEL_STEP
      );

      const x = Math.floor((screenX - spriteWidth / 2) / PIXEL_STEP) * PIXEL_STEP;

      const spriteTileX = Math.floor(sprite.x);
      const spriteTileY = Math.floor(sprite.y);
      const spriteTileHeight =
        heightMap[spriteTileY]?.[spriteTileX] ?? 0;
      const spriteRelHeight = spriteTileHeight - playerHeight;
      const spriteTerrainOffset = spriteRelHeight * 20;

      const yRawSprite =
        horizon - spriteHeight / 2 - spriteTerrainOffset;
      const y = Math.floor((yRawSprite) / PIXEL_STEP) * PIXEL_STEP;

      const screenSlice = Math.floor(screenX / (width / RESOLUTION));
      if (
        screenSlice >= 0 &&
        screenSlice < RESOLUTION &&
        distance < zBuffer[screenSlice]
      ) {
        let brightness = 1.0 - (distance / RENDER_DISTANCE) * 0.5;
        brightness = Math.max(0.2, Math.min(1.0, brightness));

        if (sprite.spriteType === 'enemy') {
          drawMonsterSprite(ctx, sprite, x, y, spriteWidth, spriteHeight, brightness);

          // Health bar (pixel bar)
          const healthPercent = sprite.health / sprite.maxHealth;
          const barWidth = spriteWidth;
          const barHeight = Math.max(2, Math.floor(PIXEL_STEP / 2));
          const barX = x;
          const barY = y - PIXEL_STEP;

          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#3f0b0b';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
          ctx.globalAlpha = 1;
        } else if (sprite.spriteType === 'item') {
          ctx.globalAlpha = brightness * 0.9;
          ctx.fillStyle = sprite.color;
          ctx.beginPath();
          ctx.arc(
            screenX,
            y + spriteHeight / 2,
            spriteWidth / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (sprite.spriteType === 'projectile') {
          const centerX = screenX;
          const centerY = y + spriteHeight / 2;
          const size = spriteWidth * 0.5;

          drawProjectileSprite(ctx, sprite, centerX, centerY, size, brightness);
        }
      }
    });

    // Dust particles overlay
    if (particlesRef.current.length) {
      ctx.save();
      particlesRef.current.forEach(p => {
        const screenX = p.x * width;
        const screenY = p.y * height;
        const size = (1 - p.z) * 3 + 1;
        const alpha = 0.12 + (1 - p.z) * 0.18;
        ctx.fillStyle = `rgba(245, 235, 220, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const centerX = width / 2;
    const centerY = horizon;
    const crossSize = 15;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();

    // Minimap
    const minimapSize = 150;
    const minimapScale = minimapSize / DUNGEON_SIZE;
    const minimapX = width - minimapSize - 20;
    const minimapY = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw walls on minimap
    dungeon.forEach((row, yIdx) => {
      row.forEach((tile, xIdx) => {
        if (tile > 0) {
          ctx.fillStyle = '#444455';
          ctx.fillRect(
            minimapX + xIdx * minimapScale,
            minimapY + yIdx * minimapScale,
            minimapScale,
            minimapScale
          );
        }
      });
    });

    // Draw enemies on minimap
    enemies.forEach(enemy => {
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(
        minimapX + enemy.x * minimapScale,
        minimapY + enemy.y * minimapScale,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw player on minimap
    ctx.fillStyle = '#5bff8a';
    ctx.beginPath();
    ctx.arc(
      minimapX + player.x * minimapScale,
      minimapY + player.y * minimapScale,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // View direction
    const dirX =
      minimapX +
      player.x * minimapScale +
      Math.cos(player.angle) * 10;
    const dirY =
      minimapY +
      player.y * minimapScale +
      Math.sin(player.angle) * 10;
    ctx.strokeStyle = '#5bff8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      minimapX + player.x * minimapScale,
      minimapY + player.y * minimapScale
    );
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
  }, [
    player,
    dungeon,
    enemies,
    items,
    projectiles,
    dimensions,
    castRay,
    currentLevel,
    heightMap,
    pitch,
    jumpState
  ]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || dungeon.length === 0) return;

    const updateGamepadState = () => {
      if (!navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const gp = pads[0];
      if (!gp) {
        gamepadStateRef.current = { lx: 0, ly: 0, rx: 0, ry: 0, fire: false };
        return;
      }
      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;
      const rx = gp.axes[2] || 0;
      const ry = gp.axes[3] || 0;
      const fire = !!(gp.buttons[0] && gp.buttons[0].pressed);
      gamepadStateRef.current = { lx, ly, rx, ry, fire };
    };

    const castSpellFromLoop = () => {
      if (selectedSpell < 0 || selectedSpell >= equippedSpells.length) return;
      const spell = equippedSpells[selectedSpell];
      if (!spell) return;

      let didCast = false;

      setPlayer(prev => {
        if (spell.cooldown > 0 || prev.mana < spell.manaCost) return prev;
        didCast = true;
        return { ...prev, mana: prev.mana - spell.manaCost };
      });

      if (!didCast) return;

      setEquippedSpells(prev =>
        prev.map((s, i) =>
          i === selectedSpell ? { ...s, cooldown: s.maxCooldown } : s
        )
      );

      const p = playerRef.current;

      setProjectiles(prev => [
        ...prev,
        {
          id: Math.random(),
          x: p.x,
          y: p.y,
          angle: p.angle,
          speed: 8,
          damage: spell.damage,
          color: spell.color,
          lifetime: 3,
          dead: false,
          spellType: spell.key
        }
      ]);
    };

    let animationId;
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime.current) / 1000;
      lastTime.current = now;

      // Update floating dust particles
      const dust = particlesRef.current;
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;

        // Wrap around screen
        if (p.x < 0) p.x += 1;
        if (p.x > 1) p.x -= 1;
        if (p.y < 0) p.y += 1;
        if (p.y > 1) p.y -= 1;
      }

      // Update gamepad axes
      if (gamepadConnected) {
        updateGamepadState();
      } else {
        gamepadStateRef.current = { lx: 0, ly: 0, rx: 0, ry: 0, fire: false };
      }

      const gamepadState = gamepadStateRef.current;

      // Player movement
      setPlayer(prev => {
        let newAngle = prev.angle;
        let moveX = 0;
        let moveY = 0;

        // Keyboard rotation
        if (keysPressed.current['arrowleft'] || keysPressed.current['q']) {
          newAngle -= TURN_SPEED * deltaTime;
        }
        if (keysPressed.current['arrowright'] || keysPressed.current['e']) {
          newAngle += TURN_SPEED * deltaTime;
        }

        // Keyboard movement
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
          moveX += Math.cos(newAngle) * MOVE_SPEED * deltaTime;
          moveY += Math.sin(newAngle) * MOVE_SPEED * deltaTime;
        }
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          moveX -= Math.cos(newAngle) * MOVE_SPEED * deltaTime;
          moveY -= Math.sin(newAngle) * MOVE_SPEED * deltaTime;
        }
        if (keysPressed.current['a']) {
          moveX += Math.cos(newAngle - Math.PI / 2) * MOVE_SPEED * deltaTime;
          moveY += Math.sin(newAngle - Math.PI / 2) * MOVE_SPEED * deltaTime;
        }
        if (keysPressed.current['d']) {
          moveX += Math.cos(newAngle + Math.PI / 2) * MOVE_SPEED * deltaTime;
          moveY += Math.sin(newAngle + Math.PI / 2) * MOVE_SPEED * deltaTime;
        }

        // Gamepad movement
        const deadZone = 0.2;
        const { lx, ly, rx, ry } = gamepadState;
        if (Math.abs(ly) > deadZone) {
          const forward = -ly * MOVE_SPEED * deltaTime;
          moveX += Math.cos(newAngle) * forward;
          moveY += Math.sin(newAngle) * forward;
        }
        if (Math.abs(lx) > deadZone) {
          const strafe = lx * MOVE_SPEED * deltaTime;
          moveX += Math.cos(newAngle + Math.PI / 2) * strafe;
          moveY += Math.sin(newAngle + Math.PI / 2) * strafe;
        }
        if (Math.abs(rx) > deadZone) {
          newAngle += rx * TURN_SPEED * deltaTime;
        }

        // Mobile touch movement/look
        if (isMobile) {
          const mv = mobileMoveRef.current;
          const look = mobileLookRef.current;
          const maxDistance = 80; // pixels
          const moveNormX = Math.max(-1, Math.min(1, mv.x / maxDistance));
          const moveNormY = Math.max(-1, Math.min(1, mv.y / maxDistance));
          const lookNormX = Math.max(-1, Math.min(1, look.x / maxDistance));

          if (Math.abs(moveNormY) > 0.05) {
            const forward = -moveNormY * MOVE_SPEED * deltaTime;
            moveX += Math.cos(newAngle) * forward;
            moveY += Math.sin(newAngle) * forward;
          }
          if (Math.abs(moveNormX) > 0.05) {
            const strafe = moveNormX * MOVE_SPEED * deltaTime;
            moveX += Math.cos(newAngle + Math.PI / 2) * strafe;
            moveY += Math.sin(newAngle + Math.PI / 2) * strafe;
          }

          if (Math.abs(lookNormX) > 0.05) {
            const touchTurnSpeed = TURN_SPEED * 1.5;
            newAngle += lookNormX * touchTurnSpeed * deltaTime;
          }
        }

        // Collision
        let newX = prev.x + moveX;
        let newY = prev.y + moveY;

        const checkTile = (x, y) => {
          const tileX = Math.floor(x);
          const tileY = Math.floor(y);
          if (
            tileX < 0 ||
            tileX >= DUNGEON_SIZE ||
            tileY < 0 ||
            tileY >= DUNGEON_SIZE
          )
            return true;
          return dungeon[tileY][tileX] > 0;
        };

        if (checkTile(newX, prev.y)) newX = prev.x;
        if (checkTile(prev.x, newY)) newY = prev.y;

        // Mana regen
        const newMana = Math.min(prev.maxMana, prev.mana + 10 * deltaTime);

        return { ...prev, x: newX, y: newY, angle: newAngle, mana: newMana };
      });

      // Gamepad vertical look
      {
        const { ry } = gamepadState;
        const deadZone = 0.2;
        if (Math.abs(ry) > deadZone) {
          const PITCH_SPEED = 1.2;
          const deltaPitch = -ry * PITCH_SPEED * deltaTime;
          setPitch(prev => {
            let next = prev + deltaPitch;
            if (next > 0.6) next = 0.6;
            if (next < -0.6) next = -0.6;
            return next;
          });
        }
      }

      // Jump physics
      setJumpState(prev => {
        let { height, velocity, grounded } = prev;

        if (!grounded || velocity !== 0) {
          const GRAVITY = 9.8;
          velocity -= GRAVITY * deltaTime;
          height += velocity * deltaTime;

          if (height <= 0) {
            height = 0;
            velocity = 0;
            grounded = true;
          } else {
            grounded = false;
          }
        }

        return { height, velocity, grounded };
      });

      // Gamepad fire
      if (gamepadState.fire) {
        castSpellFromLoop();
      }

      // Update spell cooldowns
      setEquippedSpells(prev =>
        prev.map(spell => ({
          ...spell,
          cooldown: Math.max(0, spell.cooldown - deltaTime)
        }))
      );

      // Update projectiles
      setProjectiles(prev =>
        prev
          .map(p => {
            const newX = p.x + Math.cos(p.angle) * p.speed * deltaTime;
            const newY = p.y + Math.sin(p.angle) * p.speed * deltaTime;
            const newLifetime = p.lifetime - deltaTime;

            const tileX = Math.floor(newX);
            const tileY = Math.floor(newY);
            if (
              tileX < 0 ||
              tileX >= DUNGEON_SIZE ||
              tileY < 0 ||
              tileY >= DUNGEON_SIZE ||
              dungeon[tileY][tileX] > 0
            ) {
              return { ...p, dead: true };
            }

            return {
              ...p,
              x: newX,
              y: newY,
              lifetime: newLifetime,
              dead: newLifetime <= 0
            };
          })
          .filter(p => !p.dead)
      );

      // Projectile-enemy collisions
      setProjectiles(prev => {
        const remaining = [];
        prev.forEach(proj => {
          let hit = false;
          setEnemies(prevEnemies =>
            prevEnemies
              .map(enemy => {
                if (hit) return enemy;
                const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
                if (dist < 0.5) {
                  hit = true;
                  const newHealth = enemy.health - proj.damage;
                  if (newHealth <= 0) {
                    setPlayer(p => ({
                      ...p,
                      xp: p.xp + enemy.xp,
                      gold: p.gold + enemy.gold,
                      kills: p.kills + 1
                    }));
                    return { ...enemy, health: 0, dead: true };
                  }
                  return { ...enemy, health: newHealth, state: 'chasing' };
                }
                return enemy;
              })
              .filter(e => !e.dead)
          );
          if (!hit) remaining.push(proj);
        });
        return remaining;
      });

      // Update enemies
      setEnemies(prev =>
        prev.map(enemy => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.hypot(dx, dy);

          let newState = enemy.state;
          let newX = enemy.x;
          let newY = enemy.y;
          let newAngle = enemy.angle;
          let newAttackCooldown = Math.max(
            0,
            enemy.attackCooldown - deltaTime
          );

          if (distance < 10) {
            newState = 'chasing';

            if (distance > 1) {
              newAngle = Math.atan2(dy, dx);
              const moveAmount = enemy.speed * deltaTime;
              newX += Math.cos(newAngle) * moveAmount;
              newY += Math.sin(newAngle) * moveAmount;

              const tileX = Math.floor(newX);
              const tileY = Math.floor(newY);
              if (
                tileX < 0 ||
                tileX >= DUNGEON_SIZE ||
                tileY < 0 ||
                tileY >= DUNGEON_SIZE ||
                dungeon[tileY][tileX] > 0
              ) {
                newX = enemy.x;
                newY = enemy.y;
              }
            } else if (distance < 1.5 && newAttackCooldown <= 0) {
              setPlayer(p => ({
                ...p,
                health: Math.max(0, p.health - enemy.damage)
              }));
              newAttackCooldown = 1.5;
            }
          } else {
            newState = 'idle';
          }

          return {
            ...enemy,
            x: newX,
            y: newY,
            angle: newAngle,
            state: newState,
            attackCooldown: newAttackCooldown
          };
        })
      );

      // Check item pickup
      setItems(prev =>
        prev.map(item => {
          if (item.collected) return item;

          const dist = Math.hypot(item.x - player.x, item.y - player.y);
          if (dist < 0.7) {
            setPlayer(p => {
              if (item.type === 'health') {
                return {
                  ...p,
                  health: Math.min(p.maxHealth, p.health + item.amount)
                };
              } else if (item.type === 'mana') {
                return {
                  ...p,
                  mana: Math.min(p.maxMana, p.mana + item.amount)
                };
              } else if (item.type === 'gold') {
                return { ...p, gold: p.gold + item.amount };
              }
              return p;
            });
            return { ...item, collected: true };
          }
          return item;
        })
      );

      // Level up
      setPlayer(prev => {
        if (prev.xp >= prev.xpToNext) {
          return {
            ...prev,
            level: prev.level + 1,
            xp: prev.xpToNext,
            xpToNext: Math.floor(prev.xpToNext * 1.5),
            maxHealth: prev.maxHealth + 20,
            health: prev.maxHealth + 20,
            maxMana: prev.maxMana + 15,
            mana: prev.maxMana + 15
          };
        }
        return prev;
      });

      // Death
      if (player.health <= 0) {
        setGameState('dead');
        return;
      }

      // Victory
      if (enemies.length === 0 && gameState === 'playing') {
        setGameState('victory');
        return;
      }

      render();
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [
    gameState,
    dungeon,
    enemies.length,
    render,
    player.health,
    equippedSpells,
    selectedSpell,
    gamepadConnected,
    isMobile,
    player.x,
    player.y
  ]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setCurrentLevel(1);
    setPlayer({
      x: 5,
      y: 5,
      angle: 0,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      level: 1,
      xp: 0,
      xpToNext: 100,
      gold: 0,
      kills: 0
    });

    setPitch(0);
    setJumpState({ height: 0, velocity: 0, grounded: true });

    mobileMoveRef.current = { x: 0, y: 0 };
    mobileLookRef.current = { x: 0, y: 0 };
    leftTouchId.current = null;
    rightTouchId.current = null;
  };

  const nextLevel = () => {
    setCurrentLevel(prev => prev + 1);
    setPlayer(prev => ({ ...prev, x: 5, y: 5, angle: 0 }));
    setPitch(0);
    setJumpState({ height: 0, velocity: 0, grounded: true });
    mobileMoveRef.current = { x: 0, y: 0 };
    mobileLookRef.current = { x: 0, y: 0 };
    leftTouchId.current = null;
    rightTouchId.current = null;
    setGameState('playing');
  };

  // Stat bar UI
  const StatBar = ({ current, max, color, icon: Icon, label }) => (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Icon size={16} style={{ color }} />
          <span className="text-xs text-white">{label}</span>
        </div>
        <span className="text-xs text-white">
          {Math.floor(current)}/{max}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-700 rounded overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${(current / max) * 100}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );

  // Keyboard + Mouse input
  useEffect(() => {
    const handleKeyDown = e => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      if (e.key >= '1' && e.key <= '3') {
        setSelectedSpell(parseInt(e.key) - 1);
      }

      if (e.code === 'Space') {
        setJumpState(prev => {
          if (!prev.grounded) return prev;
          return {
            ...prev,
            velocity: 5,
            grounded: false
          };
        });
      }

      if (e.key === 'Escape' || e.key === 'Esc') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };

    const handleKeyUp = e => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    const handleMouseMove = e => {
      if (gameState !== 'playing' || isMobile) return;
      if (document.pointerLockElement !== canvasRef.current) return;

      const sensitivityX = 0.002;
      const sensitivityY = 0.002;
      const deltaX = e.movementX || 0;
      const deltaY = e.movementY || 0;

      // Horizontal look
      setPlayer(prev => ({
        ...prev,
        angle: prev.angle + deltaX * sensitivityX
      }));

      // Vertical look
      setPitch(prev => {
        let next = prev - deltaY * sensitivityY;
        if (next > 0.6) next = 0.6;
        if (next < -0.6) next = -0.6;
        return next;
      });
    };

    const handleClick = () => {
      if (gameState !== 'playing') return;

      // Desktop: request pointer lock first click, then cast
      if (!isMobile) {
        const canvas = canvasRef.current;
        if (canvas && document.pointerLockElement !== canvas) {
          if (canvas.requestPointerLock) {
            const lockPromise = canvas.requestPointerLock();
            if (lockPromise && lockPromise.catch) {
              lockPromise.catch(err => {
                console.log('Pointer lock failed:', err);
              });
            }
          }
          return;
        }
      }

      // Cast spell
      if (selectedSpell < 0 || selectedSpell >= equippedSpells.length) return;
      const spell = equippedSpells[selectedSpell];

      if (spell.cooldown > 0 || player.mana < spell.manaCost) return;

      setPlayer(prev => ({
        ...prev,
        mana: prev.mana - spell.manaCost
      }));

      setEquippedSpells(prev =>
        prev.map((s, i) =>
          i === selectedSpell ? { ...s, cooldown: s.maxCooldown } : s
        )
      );

      const p = playerRef.current;

      setProjectiles(prev => [
        ...prev,
        {
          id: Math.random(),
          x: p.x,
          y: p.y,
          angle: p.angle,
          speed: 8,
          damage: spell.damage,
          color: spell.color,
          lifetime: 3,
          dead: false,
          spellType: spell.key
        }
      ]);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, equippedSpells, selectedSpell, player.mana, isMobile]);

  // Touch controls (mobile)
  useEffect(() => {
    if (!isMobile || gameState !== 'playing') return;

    const handleTouchStart = (e) => {
      for (const touch of e.changedTouches) {
        const half = window.innerWidth / 2;
        if (touch.clientX < half && leftTouchId.current === null) {
          leftTouchId.current = touch.identifier;
          leftStart.current = { x: touch.clientX, y: touch.clientY };
          mobileMoveRef.current = { x: 0, y: 0 };
        } else if (touch.clientX >= half && rightTouchId.current === null) {
          rightTouchId.current = touch.identifier;
          rightStart.current = { x: touch.clientX, y: touch.clientY };
          mobileLookRef.current = { x: 0, y: 0 };
        }
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === leftTouchId.current) {
          const dx = touch.clientX - leftStart.current.x;
          const dy = touch.clientY - leftStart.current.y;
          mobileMoveRef.current = { x: dx, y: dy };
        } else if (touch.identifier === rightTouchId.current) {
          const dx = touch.clientX - rightStart.current.x;
          mobileLookRef.current = { x: dx, y: 0 };
        }
      }
    };

    const handleTouchEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === leftTouchId.current) {
          leftTouchId.current = null;
          mobileMoveRef.current = { x: 0, y: 0 };
        } else if (touch.identifier === rightTouchId.current) {
          rightTouchId.current = null;
          mobileLookRef.current = { x: 0, y: 0 };

          // TAP TO CAST on right side
          if (gameState === 'playing') {
            if (selectedSpell < 0 || selectedSpell >= equippedSpells.length) return;
            const spell = equippedSpells[selectedSpell];
            if (spell && spell.cooldown <= 0 && player.mana >= spell.manaCost) {
              setPlayer(prev => ({
                ...prev,
                mana: prev.mana - spell.manaCost
              }));

              setEquippedSpells(prev =>
                prev.map((s, i) =>
                  i === selectedSpell ? { ...s, cooldown: s.maxCooldown } : s
                )
              );

              const p = playerRef.current;

              setProjectiles(prev => [
                ...prev,
                {
                  id: Math.random(),
                  x: p.x,
                  y: p.y,
                  angle: p.angle,
                  speed: 8,
                  damage: spell.damage,
                  color: spell.color,
                  lifetime: 3,
                  dead: false,
                  spellType: spell.key
                }
              ]);
            }
          }
        }
      }
    };

    const handleTouchCancel = handleTouchEnd;

    const el = canvasRef.current || window;
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isMobile, gameState, equippedSpells, selectedSpell, player.mana]);

  // ---------- SCREENS ----------

  if (gameState === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            <Wand2 className="inline-block mb-2" size={64} />
            <br />
            WIZARD&apos;S DESCENT
          </h1>
          <p className="text-lg md:text-xl text-purple-200 mb-8">
            A Procedural Dungeon Crawler
          </p>
          <button
            onClick={startGame}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-lg md:text-xl transition-all transform hover:scale-105"
          >
            Begin Your Journey
          </button>
          <div className="mt-8 text-purple-200 text-sm space-y-1">
            <p>Desktop: WASD Move · Mouse Look · Click Cast · Space Jump</p>
            <p>1/2/3 Spells · ESC Pause</p>
            <p>Mobile: Left Thumb Move · Right Thumb Look · Tap Right to Cast</p>
            <p>Controller: Left Stick Move · Right Stick Look · A/X Cast</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'dead') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-red-900 via-red-800 to-black flex items-center justify-center">
        <div className="text-center px-4">
          <Skull className="mx-auto mb-4 text-red-400" size={80} />
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            You Have Fallen
          </h1>
          <p className="text-lg md:text-xl text-red-200 mb-2">
            Level Reached: {currentLevel}
          </p>
          <p className="text-lg md:text-xl text-red-200 mb-2">
            Enemies Slain: {player.kills}
          </p>
          <p className="text-lg md:text-xl text-red-200 mb-8">
            Gold Collected: {player.gold}
          </p>
          <button
            onClick={startGame}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-lg md:text-xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'victory') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-yellow-600 via-yellow-700 to-orange-800 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Level Complete!
          </h1>
          <p className="text-xl text-yellow-100 mb-2">
            Dungeon {currentLevel} Cleared
          </p>
          <p className="text-lg md:text-xl text-yellow-200 mb-2">
            Enemies Defeated: {player.kills}
          </p>
          <p className="text-lg md:text-xl text-yellow-200 mb-8">
            Level: {player.level} | Gold: {player.gold}
          </p>
          <button
            onClick={nextLevel}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-lg md:text-xl transition-all"
          >
            Descend Deeper (Level {currentLevel + 1})
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'paused') {
    return (
      <div className="w-full h-screen bg-black bg-opacity-80 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-6 md:p-8 rounded-lg mx-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Paused
          </h1>
          <button
            onClick={() => setGameState('playing')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg mb-4 w-full"
          >
            Resume
          </button>
          <button
            onClick={() => setGameState('menu')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg w-full"
          >
            Quit to Menu
          </button>
        </div>
      </div>
    );
  }

  // ---------- MAIN GAME VIEW ----------

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative touch-none">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Left side - Stats */}
          <div className="bg-black bg-opacity-60 p-3 md:p-4 rounded-lg w-52 md:w-64">
            <div className="text-white text-xs md:text-sm mb-2 flex justify-between">
              <span>Level {player.level}</span>
              <span>Dungeon {currentLevel}</span>
            </div>
            <StatBar
              current={player.health}
              max={player.maxHealth}
              color="#f87171"
              icon={Heart}
              label="Health"
            />
            <StatBar
              current={player.mana}
              max={player.maxMana}
              color="#60a5fa"
              icon={Droplet}
              label="Mana"
            />
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>
                  XP: {Math.floor(player.xp)}/{player.xpToNext}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${(player.xp / player.xpToNext) * 100}%`
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-yellow-400 text-xs md:text-sm">
              💰 {player.gold} Gold | 💀 {player.kills} Kills
            </div>
          </div>

          {/* Right side - Info */}
          <div className="bg-black bg-opacity-60 p-3 md:p-4 rounded-lg">
            <div className="text-white text-xs md:text-sm text-right space-y-1">
              <p>Enemies: {enemies.length}</p>
              <p className="text-gray-400 text-[10px] md:text-xs mt-1">
                ESC to pause
              </p>
              {gamepadConnected && (
                <p className="text-green-400 text-[10px] md:text-xs">
                  🎮 Gamepad connected
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - Spells */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2 md:gap-3">
          {equippedSpells.map((spell, index) => {
            const Icon = spell.icon;
            const isSelected = index === selectedSpell;
            const isReady =
              spell.cooldown <= 0 && player.mana >= spell.manaCost;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedSpell(index)}
                className={`bg-black bg-opacity-70 p-2 md:p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-yellow-400 scale-110'
                    : 'border-gray-600'
                } ${!isReady ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <Icon
                    size={24}
                    className="md:hidden"
                    style={{ color: spell.color }}
                  />
                  <Icon
                    size={32}
                    className="hidden md:block"
                    style={{ color: spell.color }}
                  />
                  <div className="text-white text-[10px] md:text-xs mt-1">
                    {spell.name}
                  </div>
                  <div className="text-gray-400 text-[10px] md:text-xs">
                    {spell.manaCost} mana
                  </div>
                  <div className="text-white text-[10px] md:text-xs font-bold">
                    {index + 1}
                  </div>
                  {spell.cooldown > 0 && (
                    <div className="text-red-400 text-[10px] md:text-xs">
                      {spell.cooldown.toFixed(1)}s
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile touch hints */}
      {isMobile && (
        <>
          <div className="pointer-events-none absolute bottom-24 left-4 w-24 h-24 rounded-full border border-purple-400/50 bg-purple-500/10" />
          <div className="pointer-events-none absolute bottom-24 right-4 w-24 h-24 rounded-full border border-indigo-400/50 bg-indigo-500/10" />
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 text-center text-[10px] text-purple-100">
            Left thumb: move · Right thumb: look · Tap right side: cast
          </div>
        </>
      )}
    </div>
  );
};

export default WizardDungeonCrawler;
