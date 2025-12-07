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

import chillyWilly from './audio/Chilly Willy.mp3';
import glow from './audio/Glow.mp3';
import sunnyDaze from './audio/Sunny Daze.mp3';
import messinAround from './audio/messin around.mp3';

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
  const equippedSpellsRef = useRef(equippedSpells);
  const selectedSpellRef = useRef(0);

  // Dungeon & entities
  const [dungeon, setDungeon] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const particlesRef = useRef([]);

  const levelStartTimeRef = useRef(Date.now());

  const [gold, setGold] = useState(0); // Separate persistent gold
  const [showShop, setShowShop] = useState(false);

  const [purchasedSpells, setPurchasedSpells] = useState(['fire', 'ice', 'lightning']);
  
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
  const gamepadStateRef = useRef({
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    fire: false,
    rb: false,
    lb: false,
    rbPressed: false,
    lbPressed: false,
    start: false,
    startPressed: false
  });
  
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Vertical look and jump
  const [pitch, setPitch] = useState(0); // look up/down
  const pitchRef = useRef(0);

  // Live player ref so spells always use current position/angle
  const playerRef = useRef(player);

  const bgmRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = isMobile ? 160 : 320; // Half resolution on mobile
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

  const ALL_SPELLS = {
    fire: { key: 'fire', name: 'Fireball', damage: 25, manaCost: 15, cooldown: 0, maxCooldown: 1.0, color: '#ff4400', icon: Flame, price: 0 },
    ice: { key: 'ice', name: 'Ice Shard', damage: 15, manaCost: 10, cooldown: 0, maxCooldown: 0.5, color: '#00aaff', icon: Droplet, price: 0 },
    lightning: { key: 'lightning', name: 'Lightning', damage: 40, manaCost: 25, cooldown: 0, maxCooldown: 2.0, color: '#ffff00', icon: Zap, price: 0 },
    meteor: { key: 'meteor', name: 'Meteor', damage: 60, manaCost: 40, cooldown: 0, maxCooldown: 3.0, color: '#ff6600', icon: Flame, price: 150 },
    frost: { key: 'frost', name: 'Frost Nova', damage: 35, manaCost: 20, cooldown: 0, maxCooldown: 1.5, color: '#88ddff', icon: Droplet, price: 100 },
    chain: { key: 'chain', name: 'Chain Lightning', damage: 50, manaCost: 30, cooldown: 0, maxCooldown: 2.5, color: '#ffff88', icon: Zap, price: 200 }
  };

  const musicTracks = [
    chillyWilly,
    glow,
    sunnyDaze,
    messinAround
  ];
  
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

  // Keep it in sync
  useEffect(() => {
    equippedSpellsRef.current = equippedSpells;
  }, [equippedSpells]);

  useEffect(() => {
    selectedSpellRef.current = selectedSpell;
  }, [selectedSpell]);

  useEffect(() => {
    if (musicTracks.length === 0) return;

    const audio = new Audio(musicTracks[0]);
    audio.loop = false;
    audio.volume = 0.4;
    bgmRef.current = audio;

    const handleEnded = () => {
      setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.src = '';
    };
  }, [musicTracks]);

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio || musicTracks.length === 0) return;

    audio.src = musicTracks[currentTrackIndex];
    audio.load();

    if (gameState === 'playing' && musicEnabled) {
      audio.play().catch(() => {});
    }
  }, [currentTrackIndex, musicTracks]);

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    if (!musicEnabled || gameState !== 'playing') {
      audio.pause();
      return;
    }

    if (audio.paused && audio.readyState >= 2) {
      audio.play().catch(() => {});
    }
  }, [gameState, musicEnabled]);
  
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
    const count = isMobile ? 30 : 60; // Half particles on mobile
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

  const castCurrentSpell = useCallback(() => {
    const idx = selectedSpellRef.current;
  
    setEquippedSpells(prev => {
      if (idx < 0 || idx >= prev.length) return prev;
      const spell = prev[idx];
    
      // Check if we can cast
      if (spell.cooldown > 0) {
        console.log('On cooldown:', spell.cooldown);
        return prev;
      }
    
      // Check mana from playerRef
      const currentPlayer = playerRef.current;
      if (currentPlayer.mana < spell.manaCost) {
        console.log('Not enough mana');
        return prev;
      }
    
      // Deduct mana
      setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));
    
      // Create projectile
      console.log('FIRING PROJECTILE at', currentPlayer.x, currentPlayer.y, 'angle', currentPlayer.angle);
      setProjectiles(projs => [
        ...projs,
        {
          id: Math.random(),
          x: currentPlayer.x,
          y: currentPlayer.y,
          angle: currentPlayer.angle,
          speed: 8,
          damage: spell.damage,
          color: spell.color,
          lifetime: 3,
          dead: false,
          spellType: spell.key
        }
      ]);
    
      // Return spells with cooldown applied
      return prev.map((s, i) =>
        i === idx ? { ...s, cooldown: s.maxCooldown } : s
      );
    });
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
    }
  }, [gameState, currentLevel, generateDungeon]);

  // Raycasting
  const castRay = useCallback((origin, angle, map) => {
    const rayDir = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = 0;
    const step = 0.08; // Larger steps = faster raycasting

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
  // --------- PROJECTILE SPRITES (fire / ice / lightning) ----------
  const drawProjectileSprite = (ctx, projectile, x, y, size, brightness) => {
    ctx.save();
    
    const baseColor = projectile.color || '#ffffff';

    switch (projectile.spellType) {
      case 'fire': {
        ctx.translate(x, y);
        
        // **THICK OUTER GLOW**
        const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
        outerGlow.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
        outerGlow.addColorStop(0.5, 'rgba(255, 80, 0, 0.2)');
        outerGlow.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Bigger flame
        ctx.scale(1.2, 1.5);
        const r = size * 0.8;
        
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r, -r * 0.4, r * 0.6, r * 0.7, 0, r);
        ctx.bezierCurveTo(-r * 0.6, r * 0.7, -r, -r * 0.4, 0, -r);
        ctx.fill();

        // Hot core
        ctx.beginPath();
        ctx.fillStyle = '#fff5d0';
        ctx.moveTo(0, -r * 0.5);
        ctx.bezierCurveTo(r * 0.5, -r * 0.2, r * 0.3, r * 0.5, 0, r * 0.7);
        ctx.bezierCurveTo(-r * 0.3, r * 0.5, -r * 0.5, -r * 0.2, 0, -r * 0.5);
        ctx.fill();

        break;
      }

      case 'ice': {
        ctx.translate(x, y);
        const r = size * 0.9;

        // **THICK ICY GLOW**
        const iceGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
        iceGlow.addColorStop(0, 'rgba(120, 200, 255, 0.5)');
        iceGlow.addColorStop(0.5, 'rgba(100, 180, 255, 0.25)');
        iceGlow.addColorStop(1, 'rgba(80, 160, 255, 0)');
        ctx.fillStyle = iceGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Thicker shard
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r * 1.2);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r * 1.2);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.fillStyle = '#f0f8ff';
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(r * 0.5, 0);
        ctx.lineTo(0, r * 0.7);
        ctx.lineTo(-r * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Chunky side shards
        ctx.strokeStyle = '#c2e4ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 1.1, -r * 0.3);
        ctx.lineTo(-r * 1.5, -r * 0.7);
        ctx.moveTo(r * 1.1, r * 0.3);
        ctx.lineTo(r * 1.5, r * 0.7);
        ctx.stroke();

        break;
      }

      case 'lightning': {
        ctx.translate(x, y);
        const len = size * 2.5;

        // **HUGE ELECTRIC GLOW**
        const lightningGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 1.5);
        lightningGlow.addColorStop(0, 'rgba(255, 255, 150, 0.7)');
        lightningGlow.addColorStop(0.5, 'rgba(255, 255, 120, 0.4)');
        lightningGlow.addColorStop(1, 'rgba(255, 255, 100, 0)');
        ctx.fillStyle = lightningGlow;
        ctx.beginPath();
        ctx.arc(0, 0, len * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Thicker bolt
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-size * 0.4, -len * 0.5);
        ctx.lineTo(size * 0.2, -len * 0.2);
        ctx.lineTo(-size * 0.2, len * 0.1);
        ctx.lineTo(size * 0.4, len * 0.5);
        ctx.stroke();

        // Bright inner
        ctx.strokeStyle = '#ffffd0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, -len * 0.4);
        ctx.lineTo(size * 0.1, -len * 0.15);
        ctx.lineTo(-size * 0.1, len * 0.15);
        ctx.lineTo(size * 0.3, len * 0.4);
        ctx.stroke();

        break;
      }

      default: {
        // Chunky fallback
        const orbGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        orbGlow.addColorStop(0, baseColor);
        orbGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = orbGlow;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
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

    const horizon = height / 2 - pitch * (height * 0.4);

    // Clear / fog
    ctx.fillStyle = env.fog;
    ctx.fillRect(0, 0, width, height);

    // Ceiling with subtle gradient (above horizon)
    const ceilingHeight = Math.max(0, Math.min(height, horizon));
    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, ceilingHeight);
    ceilingGrad.addColorStop(0, env.ceiling);
    ceilingGrad.addColorStop(1, lerpColor(env.ceiling, env.floorTop, 0.25));
    ctx.fillStyle = ceilingGrad;
    ctx.fillRect(0, 0, width, ceilingHeight);

    // Floor with depth gradient (below horizon)
    const floorStart = Math.max(0, Math.min(height, horizon));
    const floorGrad = ctx.createLinearGradient(0, floorStart, 0, height);
    floorGrad.addColorStop(0, env.floorTop);
    floorGrad.addColorStop(0.6, lerpColor(env.floorTop, env.floorBottom, 0.7));
    floorGrad.addColorStop(1, env.floorBottom);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorStart, width, height - floorStart);

    // Atmospheric glow at horizon line
    const horizonGlow = ctx.createRadialGradient(
      width / 2, horizon, 0,
      width / 2, horizon, width * 0.5
    );
    horizonGlow.addColorStop(0, 'rgba(80, 60, 100, 0.12)');
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, width, height);

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

        const yRaw = horizon - baseWallHeight / 2;
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

          // Edge highlight for depth perception
          if (hit.side === 0 && brightness > 0.4) {
            const highlightAlpha = (brightness - 0.4) * 0.15;
            ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
            ctx.fillRect(Math.floor(x), sliceY, 2, sliceHeight);
          }

          // Subtle shadow on darker side
          if (hit.side === 1 && brightness < 0.7) {
            const shadowAlpha = (0.7 - brightness) * 0.1;
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
            ctx.fillRect(
              Math.floor(x) + Math.ceil(sliceWidth) - 2,
              sliceY,
              2,
              sliceHeight
            );
          }

          // **TEXTURE DETAIL** - Add scanlines for depth (desktop only)
          if (!isMobile && baseWallHeight > PIXEL_STEP * 3) {
            ctx.strokeStyle = `rgba(0, 0, 0, ${brightness * 0.08})`;
            ctx.lineWidth = 1;
            for (let scan = 0; scan < sliceHeight; scan += PIXEL_STEP * 2) {
              ctx.beginPath();
              ctx.moveTo(Math.floor(x), sliceY + scan);
              ctx.lineTo(Math.floor(x) + Math.ceil(sliceWidth), sliceY + scan);
              ctx.stroke();
            }
          }
          
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

    // **AMBIENT OCCLUSION** - darken corners and tight spaces
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    
    for (let i = 0; i < RESOLUTION; i += 8) { // Sample every 8th ray instead of 4th
      const rayAngle = startAngle + i * rayAngleStep;
      const hit = castRay(player, rayAngle, dungeon);
      
      if (hit && hit.distance < 3) {
        const sliceWidth = width / RESOLUTION;
        const x = i * sliceWidth;
        const occlusion = 1 - (hit.distance / 3);
        const shadowAlpha = occlusion * 0.15;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fillRect(
          Math.floor(x),
          0,
          Math.ceil(sliceWidth * 4) + 1,
          height
        );
      }
    }
    ctx.restore();

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

      const yRawSprite = horizon - spriteHeight / 2;
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
          // **MONSTER SHADOW ON GROUND**
          const shadowY = y + spriteHeight + PIXEL_STEP;
          const shadowWidth = spriteWidth * 0.8;
          const shadowHeight = PIXEL_STEP * 2;
          
          const shadowGrad = ctx.createRadialGradient(
            screenX, shadowY, 0,
            screenX, shadowY, shadowWidth / 2
          );
          shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
          shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = shadowGrad;
          ctx.beginPath();
          ctx.ellipse(
            screenX, shadowY,
            shadowWidth / 2, shadowHeight / 2,
            0, 0, Math.PI * 2
          );
          ctx.fill();
          
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

          // Motion blur trail effect
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (let t = 1; t <= 4; t++) {
            const trailDist = t * 0.2;
            const trailX = centerX - Math.cos(sprite.angle) * trailDist * width * 0.015;
            const trailY = centerY - Math.sin(sprite.angle) * trailDist * height * 0.015;
            const trailSize = size * (1 - t * 0.15);
            const trailAlpha = brightness * (1 - t * 0.2) * 0.4;
            
            ctx.globalAlpha = trailAlpha;
            ctx.fillStyle = sprite.color;
            ctx.beginPath();
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          drawProjectileSprite(ctx, sprite, centerX, centerY, size, brightness);
        }
      }
    });

    // Enhanced dust particles with glow
    if (particlesRef.current.length) {
      ctx.save();
      particlesRef.current.forEach(p => {
        const screenX = p.x * width;
        const screenY = p.y * height;
        const size = (1 - p.z) * 3 + 1;
        const alpha = 0.12 + (1 - p.z) * 0.18;
        
        // Soft glow
        const glowGrad = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, size * 2
        );
        glowGrad.addColorStop(0, `rgba(245, 235, 220, ${alpha})`);
        glowGrad.addColorStop(1, 'rgba(245, 235, 220, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core particle
        ctx.fillStyle = `rgba(255, 245, 235, ${alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Enhanced dynamic crosshair
    const centerX = width / 2;
    const centerY = horizon;
    const crossSize = 15;
    const selectedSpellColor = equippedSpells[selectedSpell]?.color || '#ffffff';
    
    // Outer glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
    
    // Main crosshair with spell color hint
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX - 4, centerY);
    ctx.moveTo(centerX + 4, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY - 4);
    ctx.moveTo(centerX, centerY + 4);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
    
    // Center dot with spell color
    const dotGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 4);
    dotGrad.addColorStop(0, selectedSpellColor);
    dotGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Minimap
    const minimapSize = 150;
    const minimapScale = minimapSize / DUNGEON_SIZE;
    const minimapX = width - minimapSize - 20;
    const minimapY = 20;

    // Minimap background with border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Border glow
    ctx.strokeStyle = 'rgba(100, 80, 150, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

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
    pitch,
    equippedSpells,
    selectedSpell,
    isMobile,
  ]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || dungeon.length === 0) return;

    const updateGamepadState = () => {
      if (!navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const gp = pads[0];
      if (!gp) {
        gamepadStateRef.current = {
          lx: 0,
          ly: 0,
          rx: 0,
          ry: 0,
          fire: false,
          rb: false,
          lb: false,
          rbPressed: false,
          lbPressed: false,
          start: false,
          startPressed: false
        };
        return;
      }
      
      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;
      const rx = gp.axes[2] || 0;
      const ry = gp.axes[3] || 0;
      const fire = !!(gp.buttons[0] && gp.buttons[0].pressed);
      const rb = !!(gp.buttons[5] && gp.buttons[5].pressed); // Right bumper
      const lb = !!(gp.buttons[4] && gp.buttons[4].pressed); // Left bumper
      const start = !!(gp.buttons[9] && gp.buttons[9].pressed); // Start / Options
      
      // Track if these are NEW presses (not held)
      const prevState = gamepadStateRef.current;
      const rbPressed = rb && !prevState.rb;
      const lbPressed = lb && !prevState.lb;
      const startPressed = start && !prevState.start;

      gamepadStateRef.current = {
        lx, ly, rx, ry,
        fire,
        rb, lb,
        rbPressed, lbPressed,
        start, startPressed
      };
    }

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
        gamepadStateRef.current = {
          lx: 0,
          ly: 0,
          rx: 0,
          ry: 0,
          fire: false,
          rb: false,
          lb: false,
          rbPressed: false,
          lbPressed: false,
          start: false,
          startPressed: false
        };
      }

      const gamepadState = gamepadStateRef.current;

      // Gamepad Start button to pause
      if (gamepadState.startPressed) {
        setGameState('paused');
      }

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

      // Gamepad vertical look (up on stick = look up)
      {
        const { ry } = gamepadState;
        const deadZone = 0.2;
        if (Math.abs(ry) > deadZone) {
          const PITCH_SPEED = 1.2;
          const deltaPitch = ry * PITCH_SPEED * deltaTime;
          setPitch(prev => {
            let next = prev + deltaPitch;
            if (next > 0.6) next = 0.6;
            if (next < -0.6) next = -0.6;
            return next;
          });
        }
      }

      // Gamepad right bumper to cast
      if (gamepadState.rbPressed) {
        castCurrentSpell();
      }
      
      // Gamepad left bumper to cycle spells
      if (gamepadState.lbPressed) {
        setSelectedSpell(prev => (prev + 1) % equippedSpells.length);
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

      // Victory (only after the level has actually started and had time to spawn)
      if (
        gameState === 'playing' &&
        enemies.length === 0 &&
        Date.now() - levelStartTimeRef.current > 500 // wait ~0.5s
      ) {
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
    player.x,
    player.y,
    gamepadConnected,
    isMobile,
    castCurrentSpell
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

  const startGame = () => {
    levelStartTimeRef.current = Date.now();
  
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
  
    mobileMoveRef.current = { x: 0, y: 0 };
    mobileLookRef.current = { x: 0, y: 0 };
    leftTouchId.current = null;
    rightTouchId.current = null;
  
    // FORCE AUDIO TO PLAY ON USER INTERACTION
    if (bgmRef.current && musicEnabled) {
      bgmRef.current.src = musicTracks[0];
      bgmRef.current.load();
      bgmRef.current.play().catch(err => console.log('Audio play blocked:', err));
    }
  };

  const nextLevel = () => {
    setShowShop(true); // Show shop instead of immediately starting next level
  };
  
  const continueToNextLevel = () => {
    levelStartTimeRef.current = Date.now();
    setCurrentLevel(prev => prev + 1);
    setPlayer(prev => ({ ...prev, x: 5, y: 5, angle: 0 }));
    setPitch(0);
    mobileMoveRef.current = { x: 0, y: 0 };
    mobileLookRef.current = { x: 0, y: 0 };
    leftTouchId.current = null;
    rightTouchId.current = null;
    setShowShop(false);
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

      // Vertical look (normal: up = look up, down = look down)
      setPitch(prev => {
        let next = prev + deltaY * sensitivityY;
        if (next > 0.6) next = 0.6;
        if (next < -0.6) next = -0.6;
        return next;
      });
    };

    const handleClick = () => {
      // Ignore clicks entirely on mobile (touch handles casting there)
      if (isMobile) return;
      if (gameState !== 'playing') return;

      const canvas = canvasRef.current;

      // Desktop: first click = pointer lock
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

      // Desktop click to cast
      castCurrentSpell();
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
  }, [gameState, castCurrentSpell, isMobile]);

  // Touch controls (mobile) – tap anywhere to cast
  useEffect(() => {
    if (!isMobile || gameState !== 'playing') return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const half = window.innerWidth / 2;

        if (touch.clientX < half && leftTouchId.current === null) {
          // Left thumb = movement
          leftTouchId.current = touch.identifier;
          leftStart.current = { x: touch.clientX, y: touch.clientY };
          mobileMoveRef.current = { x: 0, y: 0 };
        } else if (touch.clientX >= half && rightTouchId.current === null) {
          // Right thumb = look
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
        const isLeft = touch.identifier === leftTouchId.current;
        const isRight = touch.identifier === rightTouchId.current;

        // Figure out how far this finger moved (for tap detection)
        let startPos = null;
        if (isLeft) startPos = leftStart.current;
        else if (isRight) startPos = rightStart.current;

        if (startPos) {
          const dx = touch.clientX - startPos.x;
          const dy = touch.clientY - startPos.y;
          const dist = Math.hypot(dx, dy);

          // If the finger barely moved → treat as a CAST
          if (dist < 20 && gameState === 'playing') {
            castCurrentSpell();
          }
        } else {
          // Any other quick tap we didn't track as a stick → also cast
          if (gameState === 'playing') {
            castCurrentSpell();
          }
        }

        // Reset sticks
        if (isLeft) {
          leftTouchId.current = null;
          mobileMoveRef.current = { x: 0, y: 0 };
        }
        if (isRight) {
          rightTouchId.current = null;
          mobileLookRef.current = { x: 0, y: 0 };
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
  }, [isMobile, gameState, castCurrentSpell]);

  // ---------- SCREENS ----------

  if (showShop) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black flex items-center justify-center overflow-y-auto">
        <div className="text-center px-4 py-8 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Spell Shop
          </h1>
          <p className="text-xl text-yellow-400 mb-6">Gold: 💰 {player.gold}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {Object.values(ALL_SPELLS).map(spell => {
              const Icon = spell.icon;
              const owned = purchasedSpells.includes(spell.key);
              const equipped = equippedSpells.some(s => s.key === spell.key);
              const canAfford = player.gold >= spell.price;
              
              return (
                <div key={spell.key} className={`bg-black bg-opacity-60 p-4 rounded-lg border-2 ${equipped ? 'border-yellow-400' : owned ? 'border-green-600' : 'border-gray-600'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={32} style={{ color: spell.color }} />
                    <div className="text-left flex-1">
                      <h3 className="text-white font-bold">{spell.name}</h3>
                      <p className="text-gray-300 text-sm">Damage: {spell.damage} | Mana: {spell.manaCost}</p>
                    </div>
                  </div>
                  
                  {!owned && (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          setPlayer(prev => ({ ...prev, gold: prev.gold - spell.price }));
                          setPurchasedSpells(prev => [...prev, spell.key]);
                        }
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded ${canAfford ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'} text-white font-bold`}
                    >
                      Buy for 💰 {spell.price}
                    </button>
                  )}
                  
                  {owned && !equipped && (
                    <button
                      onClick={() => {
                        if (equippedSpells.length < 3) {
                          setEquippedSpells(prev => [...prev, { ...spell }]);
                        }
                      }}
                      disabled={equippedSpells.length >= 3}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
                    >
                      {equippedSpells.length >= 3 ? 'Slots Full' : 'Equip'}
                    </button>
                  )}
                  
                  {equipped && (
                    <button
                      onClick={() => {
                        setEquippedSpells(prev => prev.filter(s => s.key !== spell.key));
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          <button
            onClick={continueToNextLevel}
            disabled={equippedSpells.length === 0}
            className={`${equippedSpells.length === 0 ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold py-4 px-8 rounded-lg text-xl`}
          >
            {equippedSpells.length === 0 ? 'Equip at least 1 spell!' : `Continue to Level ${currentLevel + 1}`}
          </button>
        </div>
      </div>
    );
  }

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
            <p>Desktop: WASD Move · Mouse Look · Click Cast</p>
            <p>1/2/3 Spells · ESC Pause</p>
            <p>Mobile: Left Thumb Move · Right Thumb Look · Tap to Cast</p>
            <p>Controller: Left Stick Move · Right Stick Look · RB Cast · LB Cycle Spells</p>
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

          {/* Music toggle */}
          <button
            onClick={() => setMusicEnabled(prev => !prev)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm mb-4 w-full"
          >
            {musicEnabled ? '🔊 Music: On' : '🔇 Music: Off'}
          </button>

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

      {/* Pause button (mobile + desktop) */}
      <button
        type="button"
        onClick={() => setGameState('paused')}
        className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs md:text-sm px-3 py-2 rounded-lg z-20 pointer-events-auto"
      >
        Pause
      </button>

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Left side - Stats */}
          <div className={`bg-black bg-opacity-60 rounded-lg ${isMobile ? 'p-2 w-36' : 'p-3 md:p-4 w-52 md:w-64'}`}>
            {!isMobile && (
              <div className="text-white text-xs md:text-sm mb-2 flex justify-between">
                <span>Level {player.level}</span>
                <span>Dungeon {currentLevel}</span>
              </div>
            )}
            
            {/* Mobile: Compact bars only */}
            {isMobile ? (
              <>
                <div className="flex items-center gap-1 mb-1">
                  <Heart size={12} style={{ color: '#f87171' }} />
                  <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full transition-all bg-red-400"
                      style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <Droplet size={12} style={{ color: '#60a5fa' }} />
                  <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full transition-all bg-blue-400"
                      style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-yellow-400 text-[9px] mt-1">
                  Lv{player.level} | 💀{enemies.length}
                </div>
              </>
            ) : (
              <>
                {/* Desktop: Full stats */}
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
              </>
            )}
          </div>

          {/* Right side - Info (Desktop only) */}
          {!isMobile && (
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
          )}
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
            Left thumb: move · Right thumb: look · Tap to cast
          </div>
        </>
      )}
    </div>
  );
};

export default WizardDungeonCrawler;
