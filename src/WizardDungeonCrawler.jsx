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
  Skull,
  Wind,
  Sparkles,
  Shield,
  Crown,
  TrendingUp
} from 'lucide-react';

import chillyWilly from './audio/Chilly Willy.mp3';
import glow from './audio/Glow.mp3';
import sunnyDaze from './audio/Sunny Daze.mp3';
import messinAround from './audio/messin around.mp3';

const WizardDungeonCrawler = () => {
  // Game state
  const [gameState, setGameState] = useState('menu');
  const [currentLevel, setCurrentLevel] = useState(1);

  // Persistent upgrades (roguelite)
  const [permanentUpgrades, setPermanentUpgrades] = useState(() => {
    const saved = localStorage.getItem('wizardUpgrades');
    return saved ? JSON.parse(saved) : {
      maxHealthBonus: 0,
      maxManaBonus: 0,
      damageBonus: 0,
      speedBonus: 0,
      manaRegenBonus: 0,
      goldMultiplier: 0
    };
  });

  const [essence, setEssence] = useState(() => {
    const saved = localStorage.getItem('wizardEssence');
    return saved ? parseInt(saved) : 0;
  });

  const [totalRuns, setTotalRuns] = useState(() => {
    const saved = localStorage.getItem('wizardRuns');
    return saved ? parseInt(saved) : 0;
  });

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

  // All available spells (expanded to 12+)
  const ALL_SPELLS = {
    fire: { 
      key: 'fire', 
      name: 'Fireball', 
      damage: 25, 
      manaCost: 15, 
      cooldown: 0, 
      maxCooldown: 1.0, 
      color: '#ff4400', 
      icon: Flame, 
      price: 0,
      description: 'Classic fire projectile'
    },
    ice: { 
      key: 'ice', 
      name: 'Ice Shard', 
      damage: 15, 
      manaCost: 10, 
      cooldown: 0, 
      maxCooldown: 0.5, 
      color: '#00aaff', 
      icon: Droplet, 
      price: 0,
      description: 'Fast, low-cost attack'
    },
    lightning: { 
      key: 'lightning', 
      name: 'Lightning', 
      damage: 40, 
      manaCost: 25, 
      cooldown: 0, 
      maxCooldown: 2.0, 
      color: '#ffff00', 
      icon: Zap, 
      price: 0,
      description: 'Powerful electric bolt'
    },
    meteor: { 
      key: 'meteor', 
      name: 'Meteor', 
      damage: 60, 
      manaCost: 40, 
      cooldown: 0, 
      maxCooldown: 3.0, 
      color: '#ff6600', 
      icon: Flame, 
      price: 150,
      description: 'Devastating fire from above'
    },
    frost: { 
      key: 'frost', 
      name: 'Frost Nova', 
      damage: 35, 
      manaCost: 20, 
      cooldown: 0, 
      maxCooldown: 1.5, 
      color: '#88ddff', 
      icon: Droplet, 
      price: 100,
      description: 'Freezing burst'
    },
    chain: { 
      key: 'chain', 
      name: 'Chain Lightning', 
      damage: 50, 
      manaCost: 30, 
      cooldown: 0, 
      maxCooldown: 2.5, 
      color: '#ffff88', 
      icon: Zap, 
      price: 200,
      description: 'Arcing electricity'
    },
    windblast: {
      key: 'windblast',
      name: 'Wind Blast',
      damage: 20,
      manaCost: 12,
      cooldown: 0,
      maxCooldown: 0.7,
      color: '#88ff88',
      icon: Wind,
      price: 80,
      description: 'Swift wind projectile'
    },
    arcane: {
      key: 'arcane',
      name: 'Arcane Missile',
      damage: 30,
      manaCost: 18,
      cooldown: 0,
      maxCooldown: 1.2,
      color: '#ff88ff',
      icon: Sparkles,
      price: 120,
      description: 'Pure magical energy'
    },
    inferno: {
      key: 'inferno',
      name: 'Inferno',
      damage: 75,
      manaCost: 50,
      cooldown: 0,
      maxCooldown: 4.0,
      color: '#ff0000',
      icon: Flame,
      price: 250,
      description: 'Massive fire explosion'
    },
    blizzard: {
      key: 'blizzard',
      name: 'Blizzard',
      damage: 45,
      manaCost: 35,
      cooldown: 0,
      maxCooldown: 2.8,
      color: '#aaffff',
      icon: Droplet,
      price: 180,
      description: 'Icy storm'
    },
    storm: {
      key: 'storm',
      name: 'Thunderstorm',
      damage: 65,
      manaCost: 45,
      cooldown: 0,
      maxCooldown: 3.5,
      color: '#ffdd00',
      icon: Zap,
      price: 220,
      description: 'Raging lightning storm'
    },
    shadow: {
      key: 'shadow',
      name: 'Shadow Bolt',
      damage: 55,
      manaCost: 28,
      cooldown: 0,
      maxCooldown: 2.2,
      color: '#8800ff',
      icon: Skull,
      price: 160,
      description: 'Dark magic missile'
    }
  };

  // Spells
  const [equippedSpells, setEquippedSpells] = useState([
    { ...ALL_SPELLS.fire },
    { ...ALL_SPELLS.ice },
    { ...ALL_SPELLS.lightning }
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

  const [gold, setGold] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);

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
  const [pitch, setPitch] = useState(0);
  const pitchRef = useRef(0);

  // Live player ref
  const playerRef = useRef(player);

  const bgmRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = isMobile ? 160 : 320;
  const MOVE_SPEED = 3;
  const TURN_SPEED = 2;
  const PIXEL_STEP = 4;
 
  // Wall types
  const WALL_TYPES = {
    0: null,
    1: { color: '#3a3248', name: 'Stone' },
    2: { color: '#5b3b2a', name: 'Strata' },
    3: { color: '#244026', name: 'Moss' },
    4: { color: '#5a1010', name: 'Vein' },
    5: { color: '#40304a', name: 'Stalactite' },
    6: { color: '#3b2f24', name: 'Stalagmite' },
    7: { color: '#4b3a30', name: 'Boulder' }
  };

  // Enemy types (including bosses)
  const ENEMY_TYPES = {
    skeleton: { health: 30, damage: 10, speed: 1.5, xp: 15, color: '#e5e5e5', gold: 5, essence: 1 },
    demon: { health: 50, damage: 15, speed: 1.0, xp: 25, color: '#ff3b3b', gold: 10, essence: 2 },
    ghost: { health: 20, damage: 8, speed: 2.0, xp: 20, color: '#b8c6ff', gold: 8, essence: 1 },
    golem: { health: 80, damage: 20, speed: 0.8, xp: 40, color: '#b08b57', gold: 15, essence: 3 },
    // Bosses
    boss_necromancer: { health: 300, damage: 30, speed: 0.6, xp: 200, color: '#aa00ff', gold: 100, essence: 20, isBoss: true },
    boss_dragon: { health: 500, damage: 40, speed: 0.5, xp: 300, color: '#ff0000', gold: 150, essence: 30, isBoss: true },
    boss_lich: { health: 400, damage: 35, speed: 0.7, xp: 250, color: '#00ffaa', gold: 120, essence: 25, isBoss: true }
  };

  const musicTracks = [
    chillyWilly,
    glow,
    sunnyDaze,
    messinAround
  ];

  // Save persistent data
  useEffect(() => {
    localStorage.setItem('wizardUpgrades', JSON.stringify(permanentUpgrades));
  }, [permanentUpgrades]);

  useEffect(() => {
    localStorage.setItem('wizardEssence', essence.toString());
  }, [essence]);

  useEffect(() => {
    localStorage.setItem('wizardRuns', totalRuns.toString());
  }, [totalRuns]);
  
  // Color helpers
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

  const getEnvironmentTheme = (level) => {
    const t = Math.max(0, Math.min(1, (level - 1) / 8));

    const ceiling = lerpColor('#151826', '#050608', t);
    const floorTop = lerpColor('#2b2838', '#3a2818', t);
    const floorBottom = lerpColor('#14101e', '#1a0c08', t);
    const fog = lerpColor('#05040b', '#030203', t);

    const wallPalette = {
      1: lerpColor('#3a3248', '#3b2f24', t),
      2: lerpColor('#5b3b2a', '#6a4324', t),
      3: lerpColor('#244026', '#3f6b32', t),
      4: lerpColor('#5a1010', '#c13a16', t),
      5: lerpColor('#40304a', '#2c1d24', t),
      6: lerpColor('#3b2f24', '#4b2b1a', t),
      7: lerpColor('#4b3a30', '#3a2a20', t)
    };

    const accentTorch = lerpColor('#ffb347', '#ff7b1a', t);
    const accentFungi = lerpColor('#6bd6ff', '#9cffc5', t);

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

  // Keep refs in sync
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);

  useEffect(() => {
    equippedSpellsRef.current = equippedSpells;
  }, [equippedSpells]);

  useEffect(() => {
    selectedSpellRef.current = selectedSpell;
  }, [selectedSpell]);

  // Music setup
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

  // Gamepad
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

  // Particles
  useEffect(() => {
    const count = isMobile ? 30 : 60;
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.06,
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
    
      if (spell.cooldown > 0) {
        return prev;
      }
    
      const currentPlayer = playerRef.current;
      if (currentPlayer.mana < spell.manaCost) {
        return prev;
      }
    
      setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));
    
      const bonusDamage = permanentUpgrades.damageBonus * 0.1;
      const finalDamage = spell.damage * (1 + bonusDamage);

      setProjectiles(projs => [
        ...projs,
        {
          id: Math.random(),
          x: currentPlayer.x,
          y: currentPlayer.y,
          angle: currentPlayer.angle,
          speed: 8,
          damage: finalDamage,
          color: spell.color,
          lifetime: 3,
          dead: false,
          spellType: spell.key
        }
      ]);
    
      return prev.map((s, i) =>
        i === idx ? { ...s, cooldown: s.maxCooldown } : s
      );
    });
  }, [permanentUpgrades.damageBonus]);

  // Generate dungeon
  const generateDungeon = useCallback((level) => {
    const size = DUNGEON_SIZE;
    const map = [];

    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
          row.push(1);
        } else {
          if (Math.random() < 0.2) {
            const r = Math.random();
            let tile;
            if (r < 0.5) tile = 1;
            else if (r < 0.7) tile = 2;
            else if (r < 0.82) tile = 3;
            else if (r < 0.9) tile = 4;
            else if (r < 0.95) tile = 5;
            else if (r < 0.975) tile = 6;
            else tile = 7;
            row.push(tile);
          } else {
            row.push(0);
          }
        }
      }
      map.push(row);
    }

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
    const isBossLevel = level % 5 === 0;

    if (isBossLevel) {
      // Spawn boss
      const bossTypes = ['boss_necromancer', 'boss_dragon', 'boss_lich'];
      const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
      const stats = ENEMY_TYPES[bossType];

      let x, y;
      do {
        x = Math.random() * (size - 10) + 5;
        y = Math.random() * (size - 10) + 5;
      } while (map[Math.floor(y)][Math.floor(x)] !== 0 || Math.hypot(x - 5, y - 5) < 10);

      newEnemies.push({
        id: Math.random(),
        x,
        y,
        type: bossType,
        health: stats.health * (1 + level * 0.2),
        maxHealth: stats.health * (1 + level * 0.2),
        damage: stats.damage * (1 + level * 0.1),
        speed: stats.speed,
        xp: stats.xp * level,
        gold: stats.gold * level,
        essence: stats.essence,
        color: stats.color,
        angle: Math.random() * Math.PI * 2,
        state: 'idle',
        attackCooldown: 0,
        isBoss: true
      });

      // Add some minions
      const minionCount = 5 + level;
      const enemyTypesList = ['skeleton', 'demon', 'ghost', 'golem'];

      for (let i = 0; i < minionCount; i++) {
        let mx, my;
        do {
          mx = Math.random() * (size - 4) + 2;
          my = Math.random() * (size - 4) + 2;
        } while (map[Math.floor(my)][Math.floor(mx)] !== 0 || Math.hypot(mx - 5, my - 5) < 5);

        const type = enemyTypesList[Math.floor(Math.random() * enemyTypesList.length)];
        const mstats = ENEMY_TYPES[type];

        newEnemies.push({
          id: Math.random(),
          x: mx,
          y: my,
          type,
          health: mstats.health * (1 + level * 0.2),
          maxHealth: mstats.health * (1 + level * 0.2),
          damage: mstats.damage * (1 + level * 0.1),
          speed: mstats.speed,
          xp: mstats.xp * level,
          gold: mstats.gold * level,
          essence: mstats.essence,
          color: mstats.color,
          angle: Math.random() * Math.PI * 2,
          state: 'idle',
          attackCooldown: 0,
          isBoss: false
        });
      }
    } else {
      // Normal level
      const enemyCount = 10 + level * 3;
      const enemyTypesList = ['skeleton', 'demon', 'ghost', 'golem'];

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
          gold: stats.gold * (1 + permanentUpgrades.goldMultiplier * 0.1),
          essence: stats.essence,
          color: stats.color,
          angle: Math.random() * Math.PI * 2,
          state: 'idle',
          attackCooldown: 0,
          isBoss: false
        });
      }
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
  }, [permanentUpgrades.goldMultiplier]);

  // Initialize game
  useEffect(() => {
    if (gameState === 'playing') {
      const newMap = generateDungeon(currentLevel);
      
      const baseMaxHealth = 100 + permanentUpgrades.maxHealthBonus * 20;
      const baseMaxMana = 100 + permanentUpgrades.maxManaBonus * 15;

      setPlayer(prev => ({ 
        ...prev, 
        x: 5, 
        y: 5, 
        angle: 0,
        maxHealth: baseMaxHealth,
        health: baseMaxHealth,
        maxMana: baseMaxMana,
        mana: baseMaxMana
      }));
      setProjectiles([]);
      setDungeon(newMap);
      setPitch(0);
    }
  }, [gameState, currentLevel, generateDungeon, permanentUpgrades]);

  // Raycasting
  const castRay = useCallback((origin, angle, map) => {
    const rayDir = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = 0;
    const step = 0.08;

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

  // Draw monster sprite
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

    // Boss indicator - crown above head
    if (sprite.isBoss) {
      ctx.fillStyle = '#ffd700';
      const crownY = y - py * 2;
      ctx.beginPath();
      ctx.moveTo(cx, crownY);
      ctx.lineTo(cx - px, crownY + py);
      ctx.lineTo(cx - px / 2, crownY + py / 2);
      ctx.lineTo(cx, crownY + py);
      ctx.lineTo(cx + px / 2, crownY + py / 2);
      ctx.lineTo(cx + px, crownY + py);
      ctx.closePath();
      ctx.fill();
    }

    switch (sprite.type) {
      case 'skeleton': {
        const headW = px * 3;
        const headH = py * 2;
        ctx.fillStyle = fillBase;
        ctx.fillRect(cx - headW / 2, y, headW, headH);
        ctx.fillStyle = fillDark;
        ctx.fillRect(cx - px, y + py / 2, px / 2, py / 2);
        ctx.fillRect(cx + px / 2, y + py / 2, px / 2, py / 2);
        ctx.fillRect(cx - headW / 3, y + headH - py / 2, (headW * 2) / 3, py / 2);
        ctx.fillStyle = fillBase;
        ctx.fillRect(cx - px / 4, y + headH, px / 2, h / 2);
        for (let i = 0; i < 3; i++) {
          const ry = y + headH + py * (1 + i);
          ctx.fillRect(cx - px * 1.5, ry, px, py / 4);
          ctx.fillRect(cx + px * 0.5, ry, px, py / 4);
        }
        const legY = y + h - py * 1.5;
        ctx.fillRect(cx - px, legY, px / 2, py * 1.5);
        ctx.fillRect(cx + px / 2, legY, px / 2, py * 1.5);
        break;
      }
      case 'demon': {
        ctx.fillStyle = fillBase;
        const bodyW = px * 3;
        const bodyH = h * 0.55;
        const bodyX = cx - bodyW / 2;
        const bodyY = cy - bodyH / 3;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
        ctx.fillRect(bodyX - px / 2, bodyY - py, px, py);
        ctx.fillRect(bodyX + bodyW - px / 2, bodyY - py, px, py);
        ctx.fillStyle = 'rgb(255,230,120)';
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px / 2, py / 2);
        ctx.fillRect(bodyX + bodyW - px, bodyY + py / 2, px / 2, py / 2);
        ctx.fillStyle = fillDark;
        ctx.fillRect(bodyX + px / 2, bodyY + py * 1.6, bodyW - px, py / 2);
        ctx.fillStyle = fillBase;
        ctx.fillRect(bodyX - px, bodyY + py, px, py * 2);
        ctx.fillRect(bodyX + bodyW, bodyY + py, px, py * 2);
        const legY = bodyY + bodyH;
        ctx.fillRect(cx - px, legY, px, py * 2);
        ctx.fillRect(cx + px / 2, legY, px, py * 2);
        break;
      }
      case 'ghost': {
        ctx.fillStyle = fillBase;
        const bodyW = px * 3;
        const bodyH = h * 0.7;
        const bodyX = cx - bodyW / 2;
        const bodyY = y + py;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
        ctx.fillStyle = fillDark;
        for (let i = 0; i < 3; i++) {
          const wx = bodyX + (i * bodyW) / 3;
          const wy = bodyY + bodyH - py / 2;
          ctx.fillRect(wx, wy, bodyW / 4, py / 2);
        }
        ctx.fillStyle = 'rgb(40,40,80)';
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px / 2, py / 2);
        ctx.fillRect(bodyX + bodyW - px, bodyY + py / 2, px / 2, py / 2);
        ctx.strokeStyle = 'rgba(200,220,255,0.7)';
        ctx.strokeRect(bodyX - 1, bodyY - 1, bodyW + 2, bodyH + 2);
        break;
      }
      case 'golem': {
        ctx.fillStyle = fillBase;
        const bodyW = px * 4;
        const bodyH = h * 0.55;
        const bodyX = cx - bodyW / 2;
        const bodyY = cy - bodyH / 3;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
        ctx.fillStyle = fillDark;
        ctx.fillRect(bodyX + px / 2, bodyY + py / 2, px, py / 2);
        ctx.fillRect(bodyX + bodyW - px * 1.5, bodyY + py, px, py / 2);
        ctx.fillRect(bodyX + px, bodyY + bodyH - py, px, py / 2);
        ctx.fillStyle = fillBase;
        const headW = px * 2.2;
        const headH = py * 1.6;
        const headX = cx - headW / 2;
        const headY = bodyY - headH;
        ctx.fillRect(headX, headY, headW, headH);
        ctx.fillStyle = 'rgb(230,200,140)';
        ctx.fillRect(headX + px / 2, headY + py / 2, px / 2, py / 2);
        ctx.fillRect(headX + headW - px, headY + py / 2, px / 2, py / 2);
        ctx.fillStyle = fillBase;
        ctx.fillRect(bodyX - px, bodyY + py, px, bodyH - py);
        ctx.fillRect(bodyX + bodyW, bodyY + py, px, bodyH - py);
        const legY = bodyY + bodyH;
        ctx.fillRect(cx - px * 1.2, legY, px, py * 2);
        ctx.fillRect(cx + px * 0.2, legY, px, py * 2);
        break;
      }
      case 'boss_necromancer':
      case 'boss_dragon':
      case 'boss_lich': {
        // Larger more imposing sprite
        ctx.fillStyle = fillBase;
        const bodyW = px * 5;
        const bodyH = h * 0.6;
        const bodyX = cx - bodyW / 2;
        const bodyY = cy - bodyH / 3;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
        
        // Glowing eyes
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bodyX + px, bodyY + py, px, py);
        ctx.fillRect(bodyX + bodyW - px * 2, bodyY + py, px, py);
        
        // Extra detail for bosses
        ctx.fillStyle = fillDark;
        ctx.fillRect(bodyX + bodyW / 2 - px / 2, bodyY + py * 2, px, bodyH - py * 2);
        
        const legY = bodyY + bodyH;
        ctx.fillStyle = fillBase;
        ctx.fillRect(cx - px * 1.5, legY, px * 1.2, py * 2.5);
        ctx.fillRect(cx + px * 0.3, legY, px * 1.2, py * 2.5);
        break;
      }
      default: {
        ctx.fillStyle = fillBase;
        ctx.fillRect(x, y, w, h);
      }
    }

    ctx.restore();
  };

  const drawProjectileSprite = (ctx, projectile, x, y, size, brightness) => {
    ctx.save();
    
    const baseColor = projectile.color || '#ffffff';

    switch (projectile.spellType) {
      case 'fire':
      case 'meteor':
      case 'inferno': {
        ctx.translate(x, y);
        const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
        outerGlow.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
        outerGlow.addColorStop(0.5, 'rgba(255, 80, 0, 0.2)');
        outerGlow.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(1.2, 1.5);
        const r = size * 0.8;
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r, -r * 0.4, r * 0.6, r * 0.7, 0, r);
        ctx.bezierCurveTo(-r * 0.6, r * 0.7, -r, -r * 0.4, 0, -r);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#fff5d0';
        ctx.moveTo(0, -r * 0.5);
        ctx.bezierCurveTo(r * 0.5, -r * 0.2, r * 0.3, r * 0.5, 0, r * 0.7);
        ctx.bezierCurveTo(-r * 0.3, r * 0.5, -r * 0.5, -r * 0.2, 0, -r * 0.5);
        ctx.fill();
        break;
      }

      case 'ice':
      case 'frost':
      case 'blizzard': {
        ctx.translate(x, y);
        const r = size * 0.9;
        const iceGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
        iceGlow.addColorStop(0, 'rgba(120, 200, 255, 0.5)');
        iceGlow.addColorStop(0.5, 'rgba(100, 180, 255, 0.25)');
        iceGlow.addColorStop(1, 'rgba(80, 160, 255, 0)');
        ctx.fillStyle = iceGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.moveTo(0, -r * 1.2);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r * 1.2);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#f0f8ff';
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(r * 0.5, 0);
        ctx.lineTo(0, r * 0.7);
        ctx.lineTo(-r * 0.5, 0);
        ctx.closePath();
        ctx.fill();
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

      case 'lightning':
      case 'chain':
      case 'storm': {
        ctx.translate(x, y);
        const len = size * 2.5;
        const lightningGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 1.5);
        lightningGlow.addColorStop(0, 'rgba(255, 255, 150, 0.7)');
        lightningGlow.addColorStop(0.5, 'rgba(255, 255, 120, 0.4)');
        lightningGlow.addColorStop(1, 'rgba(255, 255, 100, 0)');
        ctx.fillStyle = lightningGlow;
        ctx.beginPath();
        ctx.arc(0, 0, len * 1.5, 0, Math.PI * 2);
        ctx.fill();
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

      case 'windblast': {
        ctx.translate(x, y);
        const windGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.5);
        windGlow.addColorStop(0, 'rgba(136, 255, 136, 0.5)');
        windGlow.addColorStop(1, 'rgba(136, 255, 136, 0)');
        ctx.fillStyle = windGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, size * (0.5 + i * 0.3), 0, Math.PI * 1.5);
          ctx.stroke();
        }
        break;
      }

      case 'arcane': {
        ctx.translate(x, y);
        const arcaneGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.5);
        arcaneGlow.addColorStop(0, 'rgba(255, 136, 255, 0.6)');
        arcaneGlow.addColorStop(1, 'rgba(255, 136, 255, 0)');
        ctx.fillStyle = arcaneGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'shadow': {
        ctx.translate(x, y);
        const shadowGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
        shadowGlow.addColorStop(0, 'rgba(136, 0, 255, 0.5)');
        shadowGlow.addColorStop(1, 'rgba(136, 0, 255, 0)');
        ctx.fillStyle = shadowGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(size * 0.3, size * 0.3, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
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

    ctx.fillStyle = env.fog;
    ctx.fillRect(0, 0, width, height);

    const ceilingHeight = Math.max(0, Math.min(height, horizon));
    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, ceilingHeight);
    ceilingGrad.addColorStop(0, env.ceiling);
    ceilingGrad.addColorStop(1, lerpColor(env.ceiling, env.floorTop, 0.25));
    ctx.fillStyle = ceilingGrad;
    ctx.fillRect(0, 0, width, ceilingHeight);

    const floorStart = Math.max(0, Math.min(height, horizon));
    const floorGrad = ctx.createLinearGradient(0, floorStart, 0, height);
    floorGrad.addColorStop(0, env.floorTop);
    floorGrad.addColorStop(0.6, lerpColor(env.floorTop, env.floorBottom, 0.7));
    floorGrad.addColorStop(1, env.floorBottom);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorStart, width, height - floorStart);

    const horizonGlow = ctx.createRadialGradient(
      width / 2, horizon, 0,
      width / 2, horizon, width * 0.5
    );
    horizonGlow.addColorStop(0, 'rgba(80, 60, 100, 0.12)');
    horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, width, height);

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

          if (hit.side === 0 && brightness > 0.4) {
            const highlightAlpha = (brightness - 0.4) * 0.15;
            ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
            ctx.fillRect(Math.floor(x), sliceY, 2, sliceHeight);
          }

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

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    
    for (let i = 0; i < RESOLUTION; i += 8) {
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
      const spriteWidthRaw = spriteHeight * (sprite.spriteType === 'projectile' ? 0.3 : sprite.isBoss ? 1.2 : 0.8);
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

          const healthPercent = sprite.health / sprite.maxHealth;
          const barWidth = spriteWidth;
          const barHeight = Math.max(2, Math.floor(PIXEL_STEP / 2));
          const barX = x;
          const barY = y - PIXEL_STEP;

          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#3f0b0b';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = sprite.isBoss ? '#ffff00' : '#00ff00';
          ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
          ctx.globalAlpha = 1;
          
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

    if (particlesRef.current.length) {
      ctx.save();
      particlesRef.current.forEach(p => {
        const screenX = p.x * width;
        const screenY = p.y * height;
        const size = (1 - p.z) * 3 + 1;
        const alpha = 0.12 + (1 - p.z) * 0.18;
        
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
        
        ctx.fillStyle = `rgba(255, 245, 235, ${alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    const centerX = width / 2;
    const centerY = horizon;
    const crossSize = 15;
    const selectedSpellColor = equippedSpells[selectedSpell]?.color || '#ffffff';
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize, centerY);
    ctx.lineTo(centerX + crossSize, centerY);
    ctx.moveTo(centerX, centerY - crossSize);
    ctx.lineTo(centerX, centerY + crossSize);
    ctx.stroke();
    
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
    
    const dotGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 4);
    dotGrad.addColorStop(0, selectedSpellColor);
    dotGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    const minimapSize = 150;
    const minimapScale = minimapSize / DUNGEON_SIZE;
    const minimapX = width - minimapSize - 20;
    const minimapY = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    ctx.strokeStyle = 'rgba(100, 80, 150, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

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

    enemies.forEach(enemy => {
      ctx.fillStyle = enemy.isBoss ? '#ffd700' : '#ff5555';
      ctx.beginPath();
      ctx.arc(
        minimapX + enemy.x * minimapScale,
        minimapY + enemy.y * minimapScale,
        enemy.isBoss ? 4 : 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

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
      const rb = !!(gp.buttons[5] && gp.buttons[5].pressed);
      const lb = !!(gp.buttons[4] && gp.buttons[4].pressed);
      const start = !!(gp.buttons[9] && gp.buttons[9].pressed);
      
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

      const dust = particlesRef.current;
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;

        if (p.x < 0) p.x += 1;
        if (p.x > 1) p.x -= 1;
        if (p.y < 0) p.y += 1;
        if (p.y > 1) p.y -= 1;
      }

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

      if (gamepadState.startPressed) {
        setGameState('paused');
      }

      setPlayer(prev => {
        let newAngle = prev.angle;
        let moveX = 0;
        let moveY = 0;

        const speedBonus = 1 + permanentUpgrades.speedBonus * 0.05;
        const effectiveMoveSpeed = MOVE_SPEED * speedBonus;

        if (keysPressed.current['arrowleft'] || keysPressed.current['q']) {
          newAngle -= TURN_SPEED * deltaTime;
        }
        if (keysPressed.current['arrowright'] || keysPressed.current['e']) {
          newAngle += TURN_SPEED * deltaTime;
        }

        if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
          moveX += Math.cos(newAngle) * effectiveMoveSpeed * deltaTime;
          moveY += Math.sin(newAngle) * effectiveMoveSpeed * deltaTime;
        }
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          moveX -= Math.cos(newAngle) * effectiveMoveSpeed * deltaTime;
          moveY -= Math.sin(newAngle) * effectiveMoveSpeed * deltaTime;
        }
        if (keysPressed.current['a']) {
          moveX += Math.cos(newAngle - Math.PI / 2) * effectiveMoveSpeed * deltaTime;
          moveY += Math.sin(newAngle - Math.PI / 2) * effectiveMoveSpeed * deltaTime;
        }
        if (keysPressed.current['d']) {
          moveX += Math.cos(newAngle + Math.PI / 2) * effectiveMoveSpeed * deltaTime;
          moveY += Math.sin(newAngle + Math.PI / 2) * effectiveMoveSpeed * deltaTime;
        }

        const deadZone = 0.2;
        const { lx, ly, rx, ry } = gamepadState;
        if (Math.abs(ly) > deadZone) {
          const forward = -ly * effectiveMoveSpeed * deltaTime;
          moveX += Math.cos(newAngle) * forward;
          moveY += Math.sin(newAngle) * forward;
        }
        if (Math.abs(lx) > deadZone) {
          const strafe = lx * effectiveMoveSpeed * deltaTime;
          moveX += Math.cos(newAngle + Math.PI / 2) * strafe;
          moveY += Math.sin(newAngle + Math.PI / 2) * strafe;
        }
        if (Math.abs(rx) > deadZone) {
          newAngle += rx * TURN_SPEED * deltaTime;
        }

        if (isMobile) {
          const mv = mobileMoveRef.current;
          const look = mobileLookRef.current;
          const maxDistance = 80;
          const moveNormX = Math.max(-1, Math.min(1, mv.x / maxDistance));
          const moveNormY = Math.max(-1, Math.min(1, mv.y / maxDistance));
          const lookNormX = Math.max(-1, Math.min(1, look.x / maxDistance));

          if (Math.abs(moveNormY) > 0.05) {
            const forward = -moveNormY * effectiveMoveSpeed * deltaTime;
            moveX += Math.cos(newAngle) * forward;
            moveY += Math.sin(newAngle) * forward;
          }
          if (Math.abs(moveNormX) > 0.05) {
            const strafe = moveNormX * effectiveMoveSpeed * deltaTime;
            moveX += Math.cos(newAngle + Math.PI / 2) * strafe;
            moveY += Math.sin(newAngle + Math.PI / 2) * strafe;
          }

          if (Math.abs(lookNormX) > 0.05) {
            const touchTurnSpeed = TURN_SPEED * 1.5;
            newAngle += lookNormX * touchTurnSpeed * deltaTime;
          }
        }

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
        
        const manaRegenBonus = 1 + permanentUpgrades.manaRegenBonus * 0.1;
        const newMana = Math.min(prev.maxMana, prev.mana + 10 * manaRegenBonus * deltaTime);
        
        return { ...prev, x: newX, y: newY, angle: newAngle, mana: newMana };
      });

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

      if (gamepadState.rbPressed) {
        castCurrentSpell();
      }
      
      if (gamepadState.lbPressed) {
        setSelectedSpell(prev => (prev + 1) % equippedSpells.length);
      }

      setEquippedSpells(prev =>
        prev.map(spell => ({
          ...spell,
          cooldown: Math.max(0, spell.cooldown - deltaTime)
        }))
      );

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
                    setEssence(prev => prev + enemy.essence);
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

      if (player.health <= 0) {
        setGameState('dead');
        setTotalRuns(prev => prev + 1);
        return;
      }

      if (
        gameState === 'playing' &&
        enemies.length === 0 &&
        Date.now() - levelStartTimeRef.current > 500
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
    castCurrentSpell,
    permanentUpgrades
  ]);

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
      health: 100 + permanentUpgrades.maxHealthBonus * 20,
      maxHealth: 100 + permanentUpgrades.maxHealthBonus * 20,
      mana: 100 + permanentUpgrades.maxManaBonus * 15,
      maxMana: 100 + permanentUpgrades.maxManaBonus * 15,
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
  
    if (bgmRef.current && musicEnabled) {
      bgmRef.current.src = musicTracks[0];
      bgmRef.current.load();
      bgmRef.current.play().catch(err => console.log('Audio play blocked:', err));
    }
  };

  const nextLevel = () => {
    setShowShop(true);
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

      setPlayer(prev => ({
        ...prev,
        angle: prev.angle + deltaX * sensitivityX
      }));

      setPitch(prev => {
        let next = prev + deltaY * sensitivityY;
        if (next > 0.6) next = 0.6;
        if (next < -0.6) next = -0.6;
        return next;
      });
    };

    const handleClick = () => {
      if (isMobile) return;
      if (gameState !== 'playing') return;

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

  useEffect(() => {
    if (!isMobile || gameState !== 'playing') return;

    const handleTouchStart = (e) => {
      e.preventDefault();
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
        const isLeft = touch.identifier === leftTouchId.current;
        const isRight = touch.identifier === rightTouchId.current;

        let startPos = null;
        if (isLeft) startPos = leftStart.current;
        else if (isRight) startPos = rightStart.current;

        if (startPos) {
          const dx = touch.clientX - startPos.x;
          const dy = touch.clientY - startPos.y;
          if (Math.hypot(dx, dy) < 20 && gameState === 'playing') {
            castCurrentSpell();
          }
        } else {
          if (gameState === 'playing') castCurrentSpell();
        }

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

  // UPGRADE COSTS
  const UPGRADE_COSTS = {
    maxHealthBonus: (level) => 10 + level * 5,
    maxManaBonus: (level) => 10 + level * 5,
    damageBonus: (level) => 15 + level * 7,
    speedBonus: (level) => 12 + level * 6,
    manaRegenBonus: (level) => 12 + level * 6,
    goldMultiplier: (level) => 20 + level * 10
  };

  const UPGRADE_NAMES = {
    maxHealthBonus: 'Max Health',
    maxManaBonus: 'Max Mana',
    damageBonus: 'Spell Damage',
    speedBonus: 'Movement Speed',
    manaRegenBonus: 'Mana Regeneration',
    goldMultiplier: 'Gold Multiplier'
  };

  const UPGRADE_DESCRIPTIONS = {
    maxHealthBonus: '+20 Max Health per level',
    maxManaBonus: '+15 Max Mana per level',
    damageBonus: '+10% Damage per level',
    speedBonus: '+5% Speed per level',
    manaRegenBonus: '+10% Mana Regen per level',
    goldMultiplier: '+10% Gold per level'
  };

  const UPGRADE_ICONS = {
    maxHealthBonus: Heart,
    maxManaBonus: Droplet,
    damageBonus: Flame,
    speedBonus: Wind,
    manaRegenBonus: Sparkles,
    goldMultiplier: Crown
  };

  // SCREENS

  if (showUpgradeMenu) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-purple-900 via-indigo-900 to-black overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-4">
            <TrendingUp className="mx-auto mb-2 text-white" size={40} />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              Permanent Upgrades
            </h1>
            <p className="text-base md:text-lg text-purple-200">
              Essence: ✨ {essence}
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              Total Runs: {totalRuns}
            </p>
          </div>
  
          {/* Upgrades list */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(UPGRADE_COSTS).map(upgradeKey => {
              const currentLevel = permanentUpgrades[upgradeKey];
              const cost = UPGRADE_COSTS[upgradeKey](currentLevel);
              const canAfford = essence >= cost;
              const Icon = UPGRADE_ICONS[upgradeKey];
  
              return (
                <div
                  key={upgradeKey}
                  className="bg-black bg-opacity-70 p-4 rounded-lg border border-purple-600"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={28} className="text-purple-400" />
                    <div className="text-left flex-1">
                      <h3 className="text-white font-semibold text-sm md:text-base">
                        {UPGRADE_NAMES[upgradeKey]}
                      </h3>
                      <p className="text-gray-300 text-xs md:text-sm">
                        {UPGRADE_DESCRIPTIONS[upgradeKey]}
                      </p>
                      <p className="text-yellow-400 text-xs mt-1">
                        Level: {currentLevel}
                      </p>
                    </div>
                  </div>
  
                  <button
                    onClick={() => {
                      if (canAfford) {
                        setEssence(prev => prev - cost);
                        setPermanentUpgrades(prev => ({
                          ...prev,
                          [upgradeKey]: prev[upgradeKey] + 1
                        }));
                      }
                    }}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded text-sm font-bold ${
                      canAfford
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    } text-white`}
                  >
                    Upgrade for ✨ {cost}
                  </button>
                </div>
              );
            })}
          </div>
  
          {/* Footer button */}
          <button
            onClick={() => setShowUpgradeMenu(false)}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-base"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }
  
  if (showShop) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-indigo-900 via-purple-900 to-black overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Spell Shop
              </h1>
              <p className="text-xs md:text-sm text-purple-200">
                Tap a spell to buy or equip
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm md:text-base text-yellow-400 font-semibold">
                💰 {player.gold}
              </p>
            </div>
          </div>
  
          {/* Spells list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(ALL_SPELLS).map(spell => {
              const Icon = spell.icon;
              const owned = purchasedSpells.includes(spell.key);
              const equipped = equippedSpells.some(s => s.key === spell.key);
              const canAfford = player.gold >= spell.price;
  
              return (
                <div
                  key={spell.key}
                  className={`bg-black bg-opacity-70 p-4 rounded-lg border ${
                    equipped
                      ? 'border-yellow-400'
                      : owned
                      ? 'border-green-600'
                      : 'border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={28} style={{ color: spell.color }} />
                    <div className="text-left flex-1">
                      <h3 className="text-white font-semibold text-sm md:text-base">
                        {spell.name}
                      </h3>
                      <p className="text-gray-300 text-xs md:text-sm">
                        Damage: {spell.damage} | Mana: {spell.manaCost}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {spell.description}
                      </p>
                    </div>
                  </div>
  
                  {/* Buttons */}
                  {!owned && spell.price > 0 && (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          setPlayer(prev => ({
                            ...prev,
                            gold: prev.gold - spell.price
                          }));
                          setPurchasedSpells(prev => [...prev, spell.key]);
                        }
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded text-sm font-bold mb-2 ${
                        canAfford
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 cursor-not-allowed'
                      } text-white`}
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
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-sm"
                    >
                      {equippedSpells.length >= 3 ? 'Slots Full' : 'Equip'}
                    </button>
                  )}
  
                  {equipped && (
                    <button
                      onClick={() => {
                        setEquippedSpells(prev =>
                          prev.filter(s => s.key !== spell.key)
                        );
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-sm"
                    >
                      Unequip
                    </button>
                  )}
  
                  {/* Free starter spells (price 0, auto-owned) */}
                  {!owned && spell.price === 0 && (
                    <p className="text-xs text-green-400 mt-1">
                      Starter spell – already available
                    </p>
                  )}
                </div>
              );
            })}
          </div>
  
          {/* Footer button */}
          <button
            onClick={continueToNextLevel}
            disabled={equippedSpells.length === 0}
            className={`mt-6 w-full py-3 rounded-lg text-base font-bold text-white ${
              equippedSpells.length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {equippedSpells.length === 0
              ? 'Equip at least 1 spell!'
              : `Continue to Level ${currentLevel + 1}`}
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
          <p className="text-lg md:text-xl text-purple-200 mb-2">
            A Roguelite Dungeon Crawler
          </p>
          <p className="text-sm text-purple-300 mb-8">
            Essence: ✨ {essence} | Runs: {totalRuns}
          </p>
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-lg md:text-xl transition-all transform hover:scale-105 w-full md:w-auto"
            >
              Begin Your Journey
            </button>
            <br />
            <button
              onClick={() => setShowUpgradeMenu(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-lg md:text-xl transition-all transform hover:scale-105 w-full md:w-auto"
            >
              <TrendingUp className="inline-block mr-2" size={24} />
              Permanent Upgrades
            </button>
          </div>
          <div className="mt-8 text-purple-200 text-sm space-y-1">
            <p>Desktop: WASD Move · Mouse Look · Click Cast</p>
            <p>1/2/3 Spells · ESC Pause</p>
            <p>Mobile: Left Thumb Move · Right Thumb Look · Tap to Cast</p>
            <p>Controller: Left Stick Move · Right Stick Look · RB Cast · LB Cycle</p>
            <p className="text-yellow-400 mt-4">Bosses every 5 levels!</p>
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
          <p className="text-lg md:text-xl text-red-200 mb-2">
            Gold Collected: {player.gold}
          </p>
          <p className="text-xl text-yellow-400 mb-8">
            Essence Earned: ✨ {essence}
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
    const isBossLevel = currentLevel % 5 === 0;
    return (
      <div className={`w-full h-screen bg-gradient-to-b ${isBossLevel ? 'from-yellow-600 via-orange-700 to-red-800' : 'from-yellow-600 via-yellow-700 to-orange-800'} flex items-center justify-center`}>
        <div className="text-center px-4">
          {isBossLevel && <Crown className="mx-auto mb-4 text-yellow-300" size={80} />}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {isBossLevel ? 'Boss Defeated!' : 'Level Complete!'}
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
            Visit Shop (Level {currentLevel + 1})
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

  // MAIN GAME VIEW
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative touch-none">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      <button
        type="button"
        onClick={() => setGameState('paused')}
        className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs md:text-sm px-3 py-2 rounded-lg z-20 pointer-events-auto"
      >
        Pause
      </button>

      <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className={`bg-black bg-opacity-60 rounded-lg ${isMobile ? 'p-2 w-36' : 'p-3 md:p-4 w-52 md:w-64'}`}>
            {!isMobile && (
              <div className="text-white text-xs md:text-sm mb-2 flex justify-between">
                <span>Level {player.level}</span>
                <span>Dungeon {currentLevel}</span>
              </div>
            )}
            
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


