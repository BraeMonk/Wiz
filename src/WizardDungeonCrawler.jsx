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

function fadeVolume(audio, target, speed = 0.02) {
  let v = audio.volume;
  const fade = setInterval(() => {
    if (Math.abs(v - target) < speed) {
      audio.volume = target;
      clearInterval(fade);
    } else {
      v += (target > v ? speed : -speed);
      audio.volume = Math.max(0, Math.min(1, v));
    }
  }, 50);
}

const musicTracks = [
  chillyWilly,
  glow,
  sunnyDaze,
  messinAround
];

const ZERO_GAMEPAD = {
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

  // Add powerup state to player (around line 86):
  const [playerBuffs, setPlayerBuffs] = useState({
    damageBoost: { active: false, multiplier: 1, timeLeft: 0 },
    speedBoost: { active: false, multiplier: 1, timeLeft: 0 },
    invincible: { active: false, timeLeft: 0 }
  });

  const [essence, setEssence] = useState(() => {
    const saved = localStorage.getItem('wizardEssence');
    return saved ? parseInt(saved) : 0;
  });

  const [totalRuns, setTotalRuns] = useState(() => {
    const saved = localStorage.getItem('wizardRuns');
    return saved ? parseInt(saved) : 0;
  });

  // Add these state declarations near the top with your other useState hooks (around line 50-100)
  const [highestLevel, setHighestLevel] = useState(() => {
    const saved = localStorage.getItem('wizardHighestLevel');
    return saved ? parseInt(saved) : 1;
  });

  const [totalKills, setTotalKills] = useState(() => {
    const saved = localStorage.getItem('wizardTotalKills');
    return saved ? parseInt(saved) : 0;
  });

  const [totalGold, setTotalGold] = useState(() => {
    const saved = localStorage.getItem('wizardTotalGold');
    return saved ? parseInt(saved) : 0;
  });

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Then add this function to show achievements:
  const showNotification = (text, color = 'yellow') => {
    setNotification({ text, color });
  };

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

  const [combo, setCombo] = useState({ count: 0, multiplier: 1.0, timer: 0 });
  const comboRef = useRef({ count: 0, multiplier: 1.0, timer: 0 });
  
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);
  
  // Dungeon & entities
  const [dungeon, setDungeon] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const particlesRef = useRef([]);

  const [bossIntro, setBossIntro] = useState(null);

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

  const [screenShake, setScreenShake] = useState({ x: 0, y: 0, intensity: 0 });
  const screenShakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  
  useEffect(() => {
    screenShakeRef.current = screenShake;
  }, [screenShake]);
  
  // Add this function after the useEffect above
  const addScreenShake = useCallback((intensity = 1.0) => {
    setScreenShake(prev => ({
      x: (Math.random() - 0.5) * intensity * 20,
      y: (Math.random() - 0.5) * intensity * 20,
      intensity: Math.max(prev.intensity, intensity)
    }));
  }, []);

  // Live player ref
  const playerRef = useRef(player);

  const bgmRef = useRef(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.5); // 50% default

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = isMobile ? 400 : 800;  // INCREASED from 160/320 - 2.5x more rays
  const MOVE_SPEED = 3;
  const TURN_SPEED = 2;
  const PIXEL_STEP = isMobile ? 2 : 1;  // DECREASED from 4 - smaller pixels = more detail
 
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

  useEffect(() => {
    localStorage.setItem('wizardHighestLevel', highestLevel.toString());
  }, [highestLevel]);

  useEffect(() => {
    localStorage.setItem('wizardTotalKills', totalKills.toString());
  }, [totalKills]);

  useEffect(() => {
    localStorage.setItem('wizardTotalGold', totalGold.toString());
  }, [totalGold]);

  // Music setup – create audio ONCE
  useEffect(() => {
    if (musicTracks.length === 0) return;

    const audio = new Audio();
    audio.loop = false;
    audio.volume = musicVolume;
    bgmRef.current = audio;

    const handleEnded = () => {
      setCurrentTrackIndex(prev => (prev + 1) % musicTracks.length);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      bgmRef.current = null;
    };
  }, []); // <- no deps, runs once

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio || musicTracks.length === 0) return;

    audio.src = musicTracks[currentTrackIndex];
    audio.load();

    if (gameState === 'playing' && musicEnabled) {
      audio.volume = 0; // start quiet
      audio.play().catch(() => {});
      fadeVolume(audio, musicVolume, 0.02); // fade up to target volume
    }
  }, [currentTrackIndex, gameState, musicEnabled]); // <- no musicVolume

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

  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    // Fade to new volume whenever musicVolume changes
    fadeVolume(audio, musicVolume, 0.05);
  }, [musicVolume]);
  
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

  // --- Global gamepad poller (runs regardless of gameState) ---
  useEffect(() => {
    if (!navigator.getGamepads) {
      if (gamepadConnected) setGamepadConnected(false);
      gamepadStateRef.current = ZERO_GAMEPAD;
      return;
    }

    let frameId;

    const poll = () => {
      const pads = navigator.getGamepads();
      const gp = pads && pads[0];

      if (!gp) {
        if (gamepadConnected) setGamepadConnected(false);
        gamepadStateRef.current = ZERO_GAMEPAD;
      } else {
        if (!gamepadConnected) setGamepadConnected(true);

        const lx = gp.axes[0] || 0;
        const ly = gp.axes[1] || 0;
        const rx = gp.axes[2] || 0;
        const ry = gp.axes[3] || 0;
        const fire = !!(gp.buttons[0] && gp.buttons[0].pressed);
        const rb   = !!(gp.buttons[5] && gp.buttons[5].pressed);
        const lb   = !!(gp.buttons[4] && gp.buttons[4].pressed);
        const start = !!(gp.buttons[9] && gp.buttons[9].pressed);

        const prev = gamepadStateRef.current || ZERO_GAMEPAD;

        const nextState = {
          lx,
          ly,
          rx,
          ry,
          fire,
          rb,
          lb,
          rbPressed:  rb   && !prev.rb,
          lbPressed:  lb   && !prev.lb,
          start,
          startPressed: start && !prev.start
        };

        gamepadStateRef.current = nextState;
      }

      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, [gamepadConnected]);

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
  
  // Enhanced particle system
  const createParticleEffect = useCallback((x, y, color, count = 10, type = 'explosion') => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 0.5 + Math.random() * 1.5;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 5,
        type
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);
  
  const gameParticlesRef = useRef([]);
  
  // Add this function after createParticleEffect
  const updateGameParticles = useCallback((deltaTime) => {
    gameParticlesRef.current = gameParticlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * deltaTime,
        y: p.y + p.vy * deltaTime,
        vx: p.vx * 0.95,
        vy: p.vy * 0.95,
        life: p.life - deltaTime / p.maxLife
      }))
      .filter(p => p.life > 0);
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
  
    // IMPORTANT: Move setPlayer OUTSIDE of setEquippedSpells
    // Remove this line from here:
    // setPlayer(p => ({ ...p, mana: p.mana - spell.manaCost }));
  
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

    // ADD THIS OUTSIDE - deduct mana after spell is cast
    setPlayer(p => {
      const idx = selectedSpellRef.current;
      const spell = equippedSpellsRef.current[idx];
      if (spell && p.mana >= spell.manaCost) {
        return { ...p, mana: p.mana - spell.manaCost };
      }
      return p;
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
      
      // Spawn boss
      const bossTypes = ['boss_necromancer', 'boss_dragon', 'boss_lich'];
      const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];

      if (isBossLevel) {
      setBossIntro({
        name: bossType.replace('boss_', '').toUpperCase(),
        timer: 3.0
      });
        
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
        essence: stats.essence * (1 + Math.floor(level / 5)), // <-- ADD THIS LINE (bosses give more essence based on depth)
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
      { type: 'gold', amount: 25, color: '#ffff00' },
      { type: 'powerup_damage', duration: 10, multiplier: 1.5, color: '#ff6600' },
      { type: 'powerup_speed', duration: 10, multiplier: 1.5, color: '#00ff00' },
      { type: 'powerup_invincible', duration: 5, color: '#ffff00' }
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

  // N64-style distinct monster sprites per type
  const drawMonsterSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    switch (sprite.type) {
      case 'skeleton':
        return drawSkeletonSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'demon':
        return drawDemonSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'ghost':
        return drawGhostSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'golem':
        return drawGolemSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'boss_necromancer':
        return drawNecromancerSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'boss_dragon':
        return drawDragonSprite(ctx, sprite, x, y, w, h, brightness, time);
      case 'boss_lich':
        return drawLichSprite(ctx, sprite, x, y, w, h, brightness, time);
      default:
        return drawGenericMonsterSprite(ctx, sprite, x, y, w, h, brightness, time);
    }
  };
  
  const getBands = (baseColor, brightness, bias = 0) => {
    const baseRgb = hexToRgb(baseColor);
    const clamp = v => Math.max(0, Math.min(255, v));
  
    const boost = o => Math.max(0.25, Math.min(1.15, brightness + bias + o));
  
    const band1 = {
      r: clamp(baseRgb.r * boost(0.15)),
      g: clamp(baseRgb.g * boost(0.15)),
      b: clamp(baseRgb.b * boost(0.15))
    };
    const band2 = {
      r: clamp(baseRgb.r * boost(0)),
      g: clamp(baseRgb.g * boost(0)),
      b: clamp(baseRgb.b * boost(0))
    };
    const band3 = {
      r: clamp(baseRgb.r * boost(-0.25)),
      g: clamp(baseRgb.g * boost(-0.25)),
      b: clamp(baseRgb.b * boost(-0.25))
    };
    return { band1, band2, band3 };
  };
  
  const drawFeetShadow = (ctx, cx, bodyWidth, bodyBottom, h, brightness) => {
    const shadowWidth = bodyWidth * 0.8;
    const shadowHeight = h * 0.035;
    const shadowY = bodyBottom + shadowHeight * 0.4;
  
    ctx.fillStyle = `rgba(0,0,0,${0.4 * brightness})`;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      shadowY,
      shadowWidth / 2,
      shadowHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };
  
  // =============== SKELETON ===============
  const drawSkeletonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = '#dcdcdc';
    const { band1, band2, band3 } = getBands(baseColor, brightness, -0.05);
  
    const phase = time * 1.0 + sprite.id * 0.73;
  
    const bodyWidth = w * 0.45;
    const bodyHeight = h * 0.9;
    const cx = x + w / 2;
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.02);
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.5;
  
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Spine (thin central column)
    const spineWidth = bodyWidth * 0.18;
    const spineTop = bodyTop + bodyHeight * 0.2;
    const spineHeight = bodyHeight * 0.45;
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(cx - spineWidth / 2, spineTop, spineWidth, spineHeight);
  
    // Ribcage bands
    ctx.strokeStyle = rgbToCss(band1);
    ctx.lineWidth = 2;
    const ribCount = 4;
    for (let i = 0; i < ribCount; i++) {
      const ry = spineTop + (spineHeight * (i + 0.5)) / ribCount;
      const ribLen = bodyWidth * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - ribLen, ry);
      ctx.lineTo(cx + ribLen, ry);
      ctx.stroke();
    }
  
    // Pelvis
    const pelvisWidth = bodyWidth * 0.6;
    const pelvisHeight = bodyHeight * 0.12;
    const pelvisY = spineTop + spineHeight + pelvisHeight * 0.2;
    ctx.fillStyle = rgbToCss(band3);
    ctx.fillRect(
      cx - pelvisWidth / 2,
      pelvisY,
      pelvisWidth,
      pelvisHeight
    );
  
    // Legs = bones
    const legHeight = bodyHeight * 0.25;
    const legWidth = bodyWidth * 0.12;
    const legOffsetX = bodyWidth * 0.18;
    const legsTop = pelvisY + pelvisHeight;
  
    ctx.fillStyle = rgbToCss(band2);
    [ -legOffsetX, legOffsetX ].forEach(offset => {
      ctx.fillRect(
        cx + offset - legWidth / 2,
        legsTop,
        legWidth,
        legHeight
      );
    });
  
    // Head: skull
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.65;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
  
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(
      headLeft + headWidth * 0.08,
      headTop + headHeight * 0.55,
      headWidth * 0.84,
      headHeight * 0.35
    ); // jaw
  
    // Eye sockets
    const eyeWidth = headWidth * 0.2;
    const eyeHeight = headHeight * 0.25;
    const eyeY = headTop + headHeight * 0.28;
    const eyeOffsetX = headWidth * 0.25;
  
    ctx.fillStyle = '#050608';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    // Red pupils
    const pupilWidth = eyeWidth * 0.45;
    const pupilHeight = eyeHeight * 0.45;
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(
      cx - eyeOffsetX - pupilWidth / 2,
      eyeY + eyeHeight * 0.25,
      pupilWidth,
      pupilHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - pupilWidth / 2,
      eyeY + eyeHeight * 0.25,
      pupilWidth,
      pupilHeight
    );
  
    // Teeth
    ctx.strokeStyle = 'rgba(5,5,5,0.7)';
    ctx.lineWidth = 1;
    const teethCount = 4;
    const mouthTop = headTop + headHeight * 0.68;
    const mouthBottom = headTop + headHeight * 0.9;
    for (let i = 1; i < teethCount; i++) {
      const tx = headLeft + (headWidth * i) / teethCount;
      ctx.beginPath();
      ctx.moveTo(tx, mouthTop);
      ctx.lineTo(tx, mouthBottom);
      ctx.stroke();
    }
  
    ctx.restore();
  };
  
  // =============== DEMON ===============
  const drawDemonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#b03030';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0);
  
    const phase = time * 1.2 + sprite.id * 0.9;
  
    const bodyWidth = w * 0.6;
    const bodyHeight = h * 0.9;
    const cx = x + w / 2 + Math.sin(phase * 0.7) * (w * 0.02);
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.02);
  
    const bodyTop = cy - bodyHeight * 0.45;
    const bodyBottom = cy + bodyHeight * 0.45;
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Torso: big block
    const torsoHeight = bodyHeight * 0.6;
    const torsoTop = bodyTop + bodyHeight * 0.15;
    const torsoBottom = torsoTop + torsoHeight;
    const torsoLeft = cx - bodyWidth / 2;
    const torsoRight = cx + bodyWidth / 2;
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(torsoLeft, torsoTop, bodyWidth, torsoHeight);
  
    // Chest plate
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(
      torsoLeft + bodyWidth * 0.1,
      torsoTop + torsoHeight * 0.1,
      bodyWidth * 0.8,
      torsoHeight * 0.28
    );
  
    // Abdomen plate
    ctx.fillStyle = rgbToCss(band3);
    ctx.fillRect(
      torsoLeft + bodyWidth * 0.2,
      torsoTop + torsoHeight * 0.5,
      bodyWidth * 0.6,
      torsoHeight * 0.35
    );
  
    // Shoulder spikes
    ctx.fillStyle = rgbToCss(band1);
    ctx.beginPath();
    ctx.moveTo(torsoLeft, torsoTop + torsoHeight * 0.25);
    ctx.lineTo(torsoLeft - bodyWidth * 0.2, torsoTop + torsoHeight * 0.1);
    ctx.lineTo(torsoLeft, torsoTop + torsoHeight * 0.05);
    ctx.closePath();
    ctx.fill();
  
    ctx.beginPath();
    ctx.moveTo(torsoRight, torsoTop + torsoHeight * 0.25);
    ctx.lineTo(torsoRight + bodyWidth * 0.2, torsoTop + torsoHeight * 0.1);
    ctx.lineTo(torsoRight, torsoTop + torsoHeight * 0.05);
    ctx.closePath();
    ctx.fill();
  
    // Legs
    const legHeight = bodyHeight * 0.3;
    const legWidth = bodyWidth * 0.25;
    const legsTop = torsoBottom - legHeight * 0.25;
    ctx.fillStyle = rgbToCss(band3);
    [ -legWidth * 0.7, legWidth * 0.7 ].forEach(offset => {
      ctx.fillRect(
        cx + offset - legWidth / 2,
        legsTop,
        legWidth,
        legHeight
      );
    });
  
    // Head with horns
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.7;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Horns
    ctx.fillStyle = rgbToCss(band3);
    const hornHeight = headHeight * 0.7;
    const hornWidth = headWidth * 0.25;
  
    // Left horn
    ctx.beginPath();
    ctx.moveTo(headLeft + headWidth * 0.1, headTop);
    ctx.lineTo(headLeft, headTop - hornHeight);
    ctx.lineTo(headLeft + hornWidth, headTop);
    ctx.closePath();
    ctx.fill();
  
    // Right horn
    ctx.beginPath();
    ctx.moveTo(headLeft + headWidth * 0.9, headTop);
    ctx.lineTo(headLeft + headWidth, headTop - hornHeight);
    ctx.lineTo(headLeft + headWidth - hornWidth, headTop);
    ctx.closePath();
    ctx.fill();
  
    // Eyes
    const eyeWidth = headWidth * 0.2;
    const eyeHeight = headHeight * 0.2;
    const eyeY = headTop + headHeight * 0.35;
    const eyeOffsetX = headWidth * 0.25;
    ctx.fillStyle = '#fff187';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    // Pupils
    const irisWidth = eyeWidth * 0.4;
    const irisHeight = eyeHeight * 0.6;
    ctx.fillStyle = '#ff6b1c';
    ctx.fillRect(
      cx - eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
  
    // Mouth
    const mouthWidth = headWidth * 0.5;
    const mouthHeight = sprite.state === 'attacking'
      ? headHeight * 0.3
      : headHeight * 0.18;
    const mouthY = headTop + headHeight * 0.65;
    ctx.fillStyle = '#551010';
    ctx.fillRect(
      cx - mouthWidth / 2,
      mouthY,
      mouthWidth,
      mouthHeight
    );

    ctx.globalAlpha = 1;
    ctx.restore();
  };
  
  // =============== GHOST ===============
  const drawGhostSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = '#dce8ff';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0.05);
  
    const phase = time * 0.9 + sprite.id * 1.31;
  
    const bodyWidth = w * 0.5;
    const bodyHeight = h * 0.9;
    const cx = x + w / 2 + Math.sin(phase * 0.7) * (w * 0.03);
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.04);
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.3; // tail extends below
    ctx.globalAlpha = brightness * 0.9;
  
    // No feet shadow: floaty look
  
    // Upper robe
    const robeTopHeight = bodyHeight * 0.45;
    const robeTop = bodyTop;
    const robeBottom = robeTop + robeTopHeight;
    const left = cx - bodyWidth / 2;
    const right = cx + bodyWidth / 2;
  
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(left, robeTop, bodyWidth, robeTopHeight * 0.4);
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(
      left,
      robeTop + robeTopHeight * 0.4,
      bodyWidth,
      robeTopHeight * 0.6
    );
  
    // Tail: tapered, tattered
    const tailHeight = bodyHeight * 0.55;
    const tailTop = robeBottom - bodyHeight * 0.08;
    const tailBottom = tailTop + tailHeight;
  
    ctx.beginPath();
    ctx.moveTo(left + bodyWidth * 0.15, tailTop);
    ctx.lineTo(right - bodyWidth * 0.15, tailTop);
    ctx.lineTo(right - bodyWidth * 0.05, tailBottom);
    ctx.lineTo(cx, tailBottom - bodyHeight * 0.08);
    ctx.lineTo(left + bodyWidth * 0.05, tailBottom);
    ctx.closePath();
    ctx.fillStyle = rgbToCss(band3);
    ctx.fill();
  
    // Vertical fade lines
    ctx.strokeStyle = 'rgba(200,220,255,0.6)';
    ctx.lineWidth = 1;
    const lineCount = 3;
    for (let i = 0; i < lineCount; i++) {
      const lx = left + bodyWidth * (0.25 + 0.25 * i);
      ctx.beginPath();
      ctx.moveTo(lx, tailTop + 2);
      ctx.lineTo(lx, tailBottom - 2);
      ctx.stroke();
    }
  
    // Head
    const headHeight = bodyHeight * 0.23;
    const headWidth = bodyWidth * 0.75;
    const headTop = bodyTop - headHeight * 0.05;
    const headLeft = cx - headWidth / 2;
  
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Eyes: large glowing blocks
    const eyeWidth = headWidth * 0.24;
    const eyeHeight = headHeight * 0.35;
    const eyeY = headTop + headHeight * 0.35;
    const eyeOffsetX = headWidth * 0.24;
    ctx.fillStyle = 'rgba(230,240,255,1)';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    ctx.fillStyle = '#8fc3ff';
    const irisWidth = eyeWidth * 0.6;
    const irisHeight = eyeHeight * 0.55;
    ctx.fillRect(
      cx - eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
  
    // Soft aura
    const auraR = bodyWidth * 0.8;
    const auraGrad = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      auraR
    );
    auraGrad.addColorStop(0, `rgba(200,220,255,${0.25 * brightness})`);
    auraGrad.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
    ctx.fill();
  
    ctx.restore();
  };
  
  // =============== GOLEM ===============
  const drawGolemSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#b08b57';
    const { band1, band2, band3 } = getBands(baseColor, brightness, -0.05);
  
    const phase = time * 0.7 + sprite.id * 0.53;
  
    const bodyWidth = w * 0.7;
    const bodyHeight = h * 0.95;
    const cx = x + w / 2;
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.01);
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.5;
  
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Torso: big stone block with offset top slab
    const torsoHeight = bodyHeight * 0.55;
    const torsoTop = bodyTop + bodyHeight * 0.12;
    const torsoLeft = cx - bodyWidth / 2;
    const torsoRight = cx + bodyWidth / 2;
  
    // base block
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(torsoLeft, torsoTop, bodyWidth, torsoHeight);
  
    // top slab slightly offset
    const slabHeight = torsoHeight * 0.25;
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(
      torsoLeft + bodyWidth * 0.04,
      torsoTop - slabHeight * 0.3,
      bodyWidth * 0.92,
      slabHeight
    );
  
    // Cracks
    ctx.strokeStyle = 'rgba(35,20,10,0.8)';
    ctx.lineWidth = Math.max(2, w * 0.018);
    ctx.beginPath();
    ctx.moveTo(cx - bodyWidth * 0.3, torsoTop + torsoHeight * 0.2);
    ctx.lineTo(cx - bodyWidth * 0.1, torsoTop + torsoHeight * 0.45);
    ctx.lineTo(cx + bodyWidth * 0.25, torsoTop + torsoHeight * 0.35);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.moveTo(cx + bodyWidth * 0.28, torsoTop + torsoHeight * 0.12);
    ctx.lineTo(cx + bodyWidth * 0.15, torsoTop + torsoHeight * 0.25);
    ctx.stroke();
  
    // Legs: chunky blocks
    const legHeight = bodyHeight * 0.28;
    const legWidth = bodyWidth * 0.28;
    const legsTop = torsoTop + torsoHeight - legHeight * 0.1;
    ctx.fillStyle = rgbToCss(band3);
    [ -legWidth * 0.8, legWidth * 0.8 ].forEach(offset => {
      ctx.fillRect(
        cx + offset - legWidth / 2,
        legsTop,
        legWidth,
        legHeight
      );
    });
  
    // Head: stone chunk
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.6;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Eyes: narrow glowing slits
    const eyeWidth = headWidth * 0.18;
    const eyeHeight = headHeight * 0.18;
    const eyeY = headTop + headHeight * 0.4;
    const eyeOffsetX = headWidth * 0.22;
    ctx.fillStyle = '#ffcf69';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headLeft, eyeY);
    ctx.lineTo(headLeft + headWidth, eyeY);
    ctx.stroke();
  
    ctx.restore();
  };
  
  // =============== NECROMANCER (BOSS) ===============
  const drawNecromancerSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#aa00ff';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0.05);
  
    const phase = time * 0.9 + sprite.id * 1.11;
  
    const bodyWidth = w * 0.5;
    const bodyHeight = h * 1.0;
    const cx = x + w / 2 + Math.sin(phase * 0.5) * (w * 0.015);
    const cy = y + h / 2;
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.5;
  
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Robe (tall rectangle)
    const robeTop = bodyTop + bodyHeight * 0.15;
    const robeHeight = bodyHeight * 0.65;
    const robeLeft = cx - bodyWidth / 2;
  
    ctx.fillStyle = rgbToCss(band3);
    ctx.fillRect(robeLeft, robeTop, bodyWidth, robeHeight);
  
    // Lighter front stripe
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(
      cx - bodyWidth * 0.15,
      robeTop,
      bodyWidth * 0.3,
      robeHeight
    );
  
    // Head (hood)
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.7;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Hood rim
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(
      headLeft,
      headTop + headHeight * 0.6,
      headWidth,
      headHeight * 0.4
    );
  
    // Eyes
    const eyeWidth = headWidth * 0.18;
    const eyeHeight = headHeight * 0.22;
    const eyeY = headTop + headHeight * 0.35;
    const eyeOffsetX = headWidth * 0.25;
    ctx.fillStyle = '#e9c0ff';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    ctx.fillStyle = '#441066';
    const irisWidth = eyeWidth * 0.55;
    const irisHeight = eyeHeight * 0.6;
    ctx.fillRect(
      cx - eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.15,
      irisWidth,
      irisHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.15,
      irisWidth,
      irisHeight
    );
  
    // Staff
    const staffX = cx - bodyWidth * 0.8;
    const staffTop = robeTop - headHeight * 0.1;
    const staffBottom = robeTop + robeHeight + bodyHeight * 0.1;
    ctx.strokeStyle = 'rgba(50,20,80,0.95)';
    ctx.lineWidth = Math.max(2, w * 0.02);
    ctx.beginPath();
    ctx.moveTo(staffX, staffTop);
    ctx.lineTo(staffX, staffBottom);
    ctx.stroke();
  
    // Orb
    const orbR = headHeight * 0.22;
    const orbY = staffTop - orbR * 0.4;
    ctx.fillStyle = '#d78bff';
    ctx.beginPath();
    ctx.arc(staffX, orbY, orbR, 0, Math.PI * 2);
    ctx.fill();
  
    // Orb aura
    const orbGrad = ctx.createRadialGradient(staffX, orbY, 0, staffX, orbY, orbR * 2.3);
    orbGrad.addColorStop(0, `rgba(215,139,255,${0.45 * brightness})`);
    orbGrad.addColorStop(1, 'rgba(215,139,255,0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(staffX, orbY, orbR * 2.3, 0, Math.PI * 2);
    ctx.fill();
  
    ctx.restore();
  };
  
  // =============== DRAGON (BOSS) ===============
  const drawDragonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#ff0000';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0);
  
    const phase = time * 1.0 + sprite.id * 0.79;
  
    const bodyWidth = w * 0.8;
    const bodyHeight = h * 0.9;
    const cx = x + w / 2 + Math.sin(phase * 0.6) * (w * 0.02);
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.015);
  
    const bodyTop = cy - bodyHeight * 0.4;
    const bodyBottom = cy + bodyHeight * 0.5;
  
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Wings behind body
    const wingsSpan = bodyWidth * 1.7;
    const wingsHeight = bodyHeight * 0.7;
    const wingsY = bodyTop + bodyHeight * 0.3;
  
    ctx.fillStyle = `rgba(40,0,0,${0.5 * brightness})`;
    ctx.beginPath();
    ctx.moveTo(cx - wingsSpan / 2, wingsY);
    ctx.lineTo(cx, wingsY - wingsHeight * 0.7);
    ctx.lineTo(cx + wingsSpan / 2, wingsY);
    ctx.lineTo(cx, wingsY + wingsHeight * 0.3);
    ctx.closePath();
    ctx.fill();
  
    // Body
    const torsoHeight = bodyHeight * 0.5;
    const torsoTop = bodyTop + bodyHeight * 0.25;
    const torsoLeft = cx - bodyWidth / 2;
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(torsoLeft, torsoTop, bodyWidth, torsoHeight);
  
    // Chest patch
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(
      cx - bodyWidth * 0.18,
      torsoTop + torsoHeight * 0.15,
      bodyWidth * 0.36,
      torsoHeight * 0.4
    );
  
    // Legs
    const legHeight = bodyHeight * 0.25;
    const legWidth = bodyWidth * 0.25;
    const legsTop = torsoTop + torsoHeight - legHeight * 0.1;
    ctx.fillStyle = rgbToCss(band3);
    [ -legWidth * 0.9, legWidth * 0.9 ].forEach(offset => {
      ctx.fillRect(
        cx + offset - legWidth / 2,
        legsTop,
        legWidth,
        legHeight
      );
    });
  
    // Head: long rectangular snout
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.65;
    const headTop = bodyTop;
    const headLeft = cx - headWidth * 0.4; // shift a bit to right for snout
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Snout
    ctx.fillStyle = rgbToCss(band3);
    const snoutHeight = headHeight * 0.5;
    ctx.fillRect(
      headLeft + headWidth * 0.45,
      headTop + headHeight * 0.35,
      headWidth * 0.35,
      snoutHeight
    );
  
    // Eyes
    const eyeWidth = headWidth * 0.15;
    const eyeHeight = headHeight * 0.2;
    const eyeY = headTop + headHeight * 0.3;
    const eyeOffsetX = headWidth * 0.18;
    ctx.fillStyle = '#fff7aa';
    ctx.fillRect(
      headLeft + headWidth * 0.2 - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      headLeft + headWidth * 0.45 - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    ctx.fillStyle = '#ff4b16';
    const irisWidth = eyeWidth * 0.5;
    const irisHeight = eyeHeight * 0.6;
    ctx.fillRect(
      headLeft + headWidth * 0.2 - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
    ctx.fillRect(
      headLeft + headWidth * 0.45 - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
  
    ctx.restore();
  };
  
  // =============== LICH (BOSS) ===============
  const drawLichSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#00ffaa';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0);
  
    const phase = time * 1.0 + sprite.id * 0.61;
  
    const bodyWidth = w * 0.5;
    const bodyHeight = h * 0.95;
    const cx = x + w / 2;
    const cy = y + h / 2;
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.5;
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Robe
    const robeTop = bodyTop + bodyHeight * 0.2;
    const robeHeight = bodyHeight * 0.6;
    const robeLeft = cx - bodyWidth / 2;
  
    ctx.fillStyle = rgbToCss(band3);
    ctx.fillRect(robeLeft, robeTop, bodyWidth, robeHeight);
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(
      robeLeft + bodyWidth * 0.18,
      robeTop,
      bodyWidth * 0.64,
      robeHeight
    );
  
    // Head (skull)
    const headHeight = bodyHeight * 0.2;
    const headWidth = bodyWidth * 0.65;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
  
    ctx.fillStyle = '#ddeee4';
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
    // Eye sockets
    const eyeWidth = headWidth * 0.18;
    const eyeHeight = headHeight * 0.25;
    const eyeY = headTop + headHeight * 0.3;
    const eyeOffsetX = headWidth * 0.22;
    ctx.fillStyle = '#013528';
    ctx.fillRect(
      cx - eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - eyeWidth / 2,
      eyeY,
      eyeWidth,
      eyeHeight
    );
  
    // Glow in sockets
    ctx.fillStyle = '#19cfa0';
    const irisWidth = eyeWidth * 0.5;
    const irisHeight = eyeHeight * 0.6;
    ctx.fillRect(
      cx - eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
    ctx.fillRect(
      cx + eyeOffsetX - irisWidth / 2,
      eyeY + eyeHeight * 0.2,
      irisWidth,
      irisHeight
    );
  
    // Teeth
    ctx.strokeStyle = 'rgba(10,20,15,0.7)';
    ctx.lineWidth = 1;
    const mouthTop = headTop + headHeight * 0.7;
    const mouthBottom = headTop + headHeight * 0.92;
    const teethCount = 4;
    for (let i = 1; i < teethCount; i++) {
      const tx = headLeft + (headWidth * i) / teethCount;
      ctx.beginPath();
      ctx.moveTo(tx, mouthTop);
      ctx.lineTo(tx, mouthBottom);
      ctx.stroke();
    }
  
    // Aura ellipse
    const auraWidth = bodyWidth * 1.6;
    const auraHeight = bodyHeight * 1.2;
    ctx.strokeStyle = `rgba(0,255,200,${0.4 * brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      (robeTop + robeTop + robeHeight) / 2,
      auraWidth / 2,
      auraHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  
    ctx.restore();
  };
  
  // =============== GENERIC FALLBACK ===============
  const drawGenericMonsterSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
    ctx.save();
  
    const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#b0b0b0';
    const { band1, band2, band3 } = getBands(baseColor, brightness, 0);
  
    const phase = time * 1.0 + sprite.id * 0.42;
  
    const bodyWidth = w * 0.5;
    const bodyHeight = h * 0.9;
    const cx = x + w / 2;
    const cy = y + h / 2 + Math.sin(phase) * (h * 0.02);
  
    const bodyTop = cy - bodyHeight * 0.5;
    const bodyBottom = cy + bodyHeight * 0.5;
  
    ctx.globalAlpha = brightness;
    drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);
  
    // Torso
    const torsoHeight = bodyHeight * 0.55;
    const torsoTop = bodyTop + bodyHeight * 0.2;
    const torsoLeft = cx - bodyWidth / 2;
  
    ctx.fillStyle = rgbToCss(band2);
    ctx.fillRect(torsoLeft, torsoTop, bodyWidth, torsoHeight);
  
    // Head
    const headHeight = bodyHeight * 0.22;
    const headWidth = bodyWidth * 0.7;
    const headTop = bodyTop;
    const headLeft = cx - headWidth / 2;
    ctx.fillStyle = rgbToCss(band1);
    ctx.fillRect(headLeft, headTop, headWidth, headHeight);
  
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

    const time = performance.now() / 1000;

    ctx.save();
    const shake = screenShakeRef.current;
    if (shake.intensity > 0.01) {
      ctx.translate(shake.x, shake.y);
    }

    // Enable smoothing for crisp rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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
    
      // Skip anything weird so it can't blow up the frame
      if (!Number.isFinite(distance) || distance < 0.1 || distance > RENDER_DISTANCE) {
        return;
      }
    
      let angleToSprite = Math.atan2(dy, dx) - player.angle;
    
      if (!Number.isFinite(angleToSprite)) return;
    
      while (angleToSprite > Math.PI) angleToSprite -= Math.PI * 2;
      while (angleToSprite < -Math.PI) angleToSprite += Math.PI * 2;
    
      const halfFov = (FOV * Math.PI / 180) / 2;
      if (Math.abs(angleToSprite) > halfFov) return;
    
      const screenX = (angleToSprite / (FOV * Math.PI / 180) + 0.5) * width;
      if (!Number.isFinite(screenX)) return;
    
      const spriteHeightRaw = height / distance;
      if (!Number.isFinite(spriteHeightRaw) || spriteHeightRaw <= 0) return;
    
      const spriteHeight = Math.max(
        PIXEL_STEP,
        Math.floor(spriteHeightRaw / PIXEL_STEP) * PIXEL_STEP
      );
      const spriteWidthRaw =
        spriteHeight * (sprite.spriteType === 'projectile'
          ? 0.3
          : sprite.isBoss
          ? 1.2
          : 0.8);
      const spriteWidth = Math.max(
        PIXEL_STEP,
        Math.floor(spriteWidthRaw / PIXEL_STEP) * PIXEL_STEP
      );
    
      const x = Math.floor((screenX - spriteWidth / 2) / PIXEL_STEP) * PIXEL_STEP;
    
      const yRawSprite = horizon - spriteHeight / 2;
      const y = Math.floor(yRawSprite / PIXEL_STEP) * PIXEL_STEP;
    
      const screenSlice = Math.floor(screenX / (width / RESOLUTION));
      if (
        screenSlice >= 0 &&
        screenSlice < RESOLUTION &&
        distance < zBuffer[screenSlice]
      ) {
        let brightness = 1.0 - (distance / RENDER_DISTANCE) * 0.5;
        brightness = Math.max(0.2, Math.min(1.0, brightness));
    
        if (sprite.spriteType === 'enemy') {
          drawMonsterSprite(ctx, sprite, x, y, spriteWidth, spriteHeight, brightness, time);
    
          // health bar + shadow remains the same...
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

    // Render game particles
    if (gameParticlesRef.current.length > 0) {
      ctx.save();
      gameParticlesRef.current.forEach(p => {
        const worldToScreenX = (p.x - player.x) * 40 + width / 2;
        const worldToScreenY = (p.y - player.y) * 40 + height / 2;
        
        if (worldToScreenX > -50 && worldToScreenX < width + 50 &&
            worldToScreenY > -50 && worldToScreenY < height + 50) {
          
          const alpha = p.life;
          ctx.globalAlpha = alpha;
          
          if (p.type === 'explosion') {
            const grad = ctx.createRadialGradient(
              worldToScreenX, worldToScreenY, 0,
              worldToScreenX, worldToScreenY, p.size
            );
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(worldToScreenX, worldToScreenY, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'hit') {
            ctx.fillStyle = p.color;
            ctx.fillRect(
              worldToScreenX - p.size / 2,
              worldToScreenY - p.size / 2,
              p.size,
              p.size
            );
          }
        }
      });
      ctx.restore();
    }
    
    ctx.restore(); // Restore screen shake transform

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

    let animationId;
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime.current) / 1000;

      setScreenShake(prev => ({
        x: prev.x * 0.85,
        y: prev.y * 0.85,
        intensity: prev.intensity * 0.9
      }));

      if (bossIntro && bossIntro.timer > 0) {
        setBossIntro(prev => ({
          ...prev,
          timer: prev.timer - deltaTime
        }));
        if (bossIntro.timer - deltaTime <= 0) {
          setBossIntro(null);
        }
      }

      // Update combo timer
      setCombo(prev => {
        const newTimer = Math.max(0, prev.timer - deltaTime);
        if (newTimer <= 0 && prev.count > 0) {
          return { count: 0, multiplier: 1.0, timer: 0 };
        }
        return { ...prev, timer: newTimer };
      });
      
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

      updateGameParticles(deltaTime);

      const gamepadState = gamepadStateRef.current || ZERO_GAMEPAD;

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
          // Handle enemy projectiles hitting player
          if (proj.isEnemyProjectile) {
            const distToPlayer = Math.hypot(proj.x - player.x, proj.y - player.y);
            if (distToPlayer < 0.5) {
              setPlayer(p => ({
                ...p,
                health: Math.max(0, p.health - proj.damage)
              }));
              createParticleEffect(proj.x, proj.y, proj.color, 12, 'explosion');
              addScreenShake(0.4);
              return; // Don't add to remaining
            }
            remaining.push(proj);
            return;
          }
      
          // Player projectiles hitting enemies
          let hit = false;
          setEnemies(prevEnemies =>
            prevEnemies
              .map(enemy => {
                if (hit) return enemy;
                const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
                if (dist < 0.5) {
                  hit = true;
                  // Inside setProjectiles where you handle enemy hits
                  const bonusDamage = permanentUpgrades.damageBonus * 0.1;
                  const critChance = permanentUpgrades.criticalChance * 0.05;
                  const isCrit = Math.random() < critChance;
                  const critMultiplier = isCrit ? 2.0 : 1.0;
                  const finalDamage = proj.damage * (1 + bonusDamage) * critMultiplier;

                  if (isCrit) {
                    createParticleEffect(proj.x, proj.y, '#ffff00', 20, 'explosion');
                    addScreenShake(0.5);
                  }

                  const newHealth = enemy.health - finalDamage;
                  
                  // Create hit particles
                  createParticleEffect(proj.x, proj.y, enemy.color, 8, 'hit');
                  addScreenShake(0.2);
                  
                  if (newHealth <= 0) {
                    // Death particles
                    createParticleEffect(enemy.x, enemy.y, enemy.color, 20, 'explosion');
                    addScreenShake(enemy.isBoss ? 0.8 : 0.3);

                    const newCombo = comboRef.current.count + 1;
                    const newMultiplier = 1.0 + Math.min(newCombo * 0.1, 3.0);
                    setCombo({ count: newCombo, multiplier: newMultiplier, timer: 3.0 });
                    
                    const comboBonus = comboRef.current.multiplier;
                    setPlayer(p => ({
                      ...p,
                      xp: p.xp + Math.floor(enemy.xp * comboBonus),
                      gold: p.gold + Math.floor(enemy.gold * comboBonus),
                      kills: p.kills + 1
                    }));
                    
                    const essenceBonus = 1 + (permanentUpgrades.essenceGain * 0.2);
                    setEssence(prev => prev + Math.floor(enemy.essence * essenceBonus));
                    setTotalKills(prev => {
                      const newTotal = prev + 1;
                      if (newTotal % 100 === 0) {
                        showNotification(`🎯 ${newTotal} Total Kills!`, 'purple');
                      }
                      return newTotal;
                    });

                    // Life steal
                    const lifeStealPercent = permanentUpgrades.lifeSteal * 0.02;
                    const healAmount = finalDamage * lifeStealPercent;
                    if (healAmount > 0) {
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + healAmount)
                      }));
                      createParticleEffect(player.x, player.y, '#00ff00', 5, 'hit');
                    }
                    
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

      // Build a distance field from player to every walkable tile
      const buildDistanceField = () => {
        const w = DUNGEON_SIZE;
        const h = DUNGEON_SIZE;
        const dist = Array.from({ length: h }, () =>
          new Array(w).fill(Infinity)
        );
      
        const startX = Math.floor(player.x);
        const startY = Math.floor(player.y);
      
        if (
          startX < 0 ||
          startX >= w ||
          startY < 0 ||
          startY >= h ||
          dungeon[startY][startX] > 0
        ) {
          return dist;
        }
      
        const q = [];
        dist[startY][startX] = 0;
        q.push([startX, startY]);
      
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ];
      
        while (q.length) {
          const [cx, cy] = q.shift();
          const base = dist[cy][cx];
      
          for (const [ox, oy] of dirs) {
            const nx = cx + ox;
            const ny = cy + oy;
            if (
              nx < 0 ||
              nx >= w ||
              ny < 0 ||
              ny >= h ||
              dungeon[ny][nx] > 0
            )
              continue;
            if (dist[ny][nx] > base + 1) {
              dist[ny][nx] = base + 1;
              q.push([nx, ny]);
            }
          }
        }
      
        return dist;
      };
      
      const distField = buildDistanceField();

      setEnemies(prev =>
        prev.map(enemy => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.hypot(dx, dy);
      
          let newState = enemy.state;
          let newX = enemy.x;
          let newY = enemy.y;
          let newAngle = enemy.angle;
          let newAttackCooldown = Math.max(0, enemy.attackCooldown - deltaTime);
      
          const canSeePlayer = distance < 12;
      
          if (canSeePlayer) {
            newState = 'chasing';
      
            // Boss special attacks
            if (enemy.isBoss && distance < 8 && newAttackCooldown <= 0) {
              // Shoot projectile at player
              setProjectiles(projs => [
                ...projs,
                {
                  id: Math.random(),
                  x: enemy.x,
                  y: enemy.y,
                  angle: Math.atan2(dy, dx),
                  speed: 6,
                  damage: enemy.damage * 0.5,
                  color: enemy.color,
                  lifetime: 4,
                  dead: false,
                  spellType: 'enemy',
                  isEnemyProjectile: true
                }
              ]);
              newAttackCooldown = 2.0;
              addScreenShake(0.3);
            }
      
            const ex = Math.floor(enemy.x);
            const ey = Math.floor(enemy.y);
      
            if (ex >= 0 && ex < DUNGEON_SIZE && ey >= 0 && ey < DUNGEON_SIZE) {
              const hereDist =
                distField[ey] && distField[ey][ex] !== undefined
                  ? distField[ey][ex]
                  : Infinity;
      
              const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
              let bestTile = null;
              let bestDist = hereDist;
      
              for (const [ox, oy] of dirs) {
                const nx = ex + ox;
                const ny = ey + oy;
                if (nx < 0 || nx >= DUNGEON_SIZE || ny < 0 || ny >= DUNGEON_SIZE)
                  continue;
      
                const d = distField[ny][nx];
                if (d < bestDist) {
                  bestDist = d;
                  bestTile = { x: nx, y: ny };
                }
              }
      
              if (bestTile && bestDist < Infinity) {
                const targetX = bestTile.x + 0.5;
                const targetY = bestTile.y + 0.5;
                const dirX = targetX - enemy.x;
                const dirY = targetY - enemy.y;
                const len = Math.hypot(dirX, dirY) || 1;
                const moveAmount = enemy.speed * deltaTime;
      
                newX = enemy.x + (dirX / len) * moveAmount;
                newY = enemy.y + (dirY / len) * moveAmount;
                newAngle = Math.atan2(dirY, dirX);
      
                const tileX = Math.floor(newX);
                const tileY = Math.floor(newY);
                if (
                  tileX < 0 || tileX >= DUNGEON_SIZE || 
                  tileY < 0 || tileY >= DUNGEON_SIZE ||
                  dungeon[tileY][tileX] > 0
                ) {
                  const fallbackMove = enemy.speed * deltaTime * 0.6;
                  const fallbackAngle = Math.atan2(dy, dx);
                  const fx = enemy.x + Math.cos(fallbackAngle) * fallbackMove;
                  const fy = enemy.y + Math.sin(fallbackAngle) * fallbackMove;
      
                  const ftx = Math.floor(fx);
                  const fty = Math.floor(fy);
                  if (
                    ftx >= 0 && ftx < DUNGEON_SIZE && 
                    fty >= 0 && fty < DUNGEON_SIZE &&
                    dungeon[fty][ftx] === 0
                  ) {
                    newX = fx;
                    newY = fy;
                    newAngle = fallbackAngle;
                  } else {
                    newX = enemy.x;
                    newY = enemy.y;
                  }
                }
              }
            }
      
            if (distance < 1.5 && newAttackCooldown <= 0) {
              newState = 'attacking';
              setPlayer(p => ({
                ...p,
                health: Math.max(0, p.health - enemy.damage)
              }));
      
              addScreenShake(0.5);
              createParticleEffect(player.x, player.y, '#ff0000', 15, 'hit');
      
              try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(60);
                }
      
                if (navigator.getGamepads) {
                  const pads = navigator.getGamepads();
                  const gp = pads && pads[0];
                  if (
                    gp &&
                    gp.vibrationActuator &&
                    gp.vibrationActuator.type === 'dual-rumble'
                  ) {
                    gp.vibrationActuator
                      .playEffect('dual-rumble', {
                        duration: 90,
                        strongMagnitude: 0.9,
                        weakMagnitude: 0.4
                      })
                      .catch(() => {});
                  }
                }
              } catch (err) {
                console.log('Haptics not supported', err);
              }
      
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
      
      // Update buff timers in game loop:
      setPlayerBuffs(prev => ({
        damageBoost: {
          ...prev.damageBoost,
          timeLeft: Math.max(0, prev.damageBoost.timeLeft - deltaTime),
          active: prev.damageBoost.timeLeft > deltaTime
        },
        speedBoost: {
          ...prev.speedBoost,
          timeLeft: Math.max(0, prev.speedBoost.timeLeft - deltaTime),
          active: prev.speedBoost.timeLeft > deltaTime
        },
        invincible: {
          ...prev.invincible,
          timeLeft: Math.max(0, prev.invincible.timeLeft - deltaTime),
          active: prev.invincible.timeLeft > deltaTime
        }
      }));
      
      // Update item pickup (around line 1885):
      setItems(prev =>
        prev.map(item => {
          if (item.collected) return item;
      
          const dist = Math.hypot(item.x - player.x, item.y - player.y);
          if (dist < 0.7) {
            createParticleEffect(item.x, item.y, item.color, 15, 'explosion');
            
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
                setTotalGold(prev => prev + item.amount);
                return { ...p, gold: p.gold + item.amount };
              }
              return p;
            });
            
            if (item.type === 'powerup_damage') {
              setPlayerBuffs(prev => ({
                ...prev,
                damageBoost: { active: true, multiplier: item.multiplier, timeLeft: item.duration }
              }));
            } else if (item.type === 'powerup_speed') {
              setPlayerBuffs(prev => ({
                ...prev,
                speedBoost: { active: true, multiplier: item.multiplier, timeLeft: item.duration }
              }));
            } else if (item.type === 'powerup_invincible') {
              setPlayerBuffs(prev => ({
                ...prev,
                invincible: { active: true, timeLeft: item.duration }
              }));
            }
            
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
      const audio = bgmRef.current;
      audio.src = musicTracks[0];
      audio.load();
      audio.volume = 0; // start silent
      audio.play().catch(err => console.log('Audio play blocked:', err));

      fadeVolume(audio, musicVolume, 0.02); // fade 0 -> musicVolume
    }
  };

  const nextLevel = () => {
    setShowShop(true);
  };
  
  const continueToNextLevel = () => {
    levelStartTimeRef.current = Date.now();
    setHighestLevel(prev => Math.max(prev, nextLevel));
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

  const StatBar = ({ current, max, color, icon: Icon, label }) => {
    const safeMax = max || 1; // avoid divide-by-0
    const percent = Math.max(0, Math.min(100, (current / safeMax) * 100));

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <Icon size={16} style={{ color }} />
            <span className="text-xs text-white">{label}</span>
          </div>
          <span className="text-xs text-white">
            {Math.floor(current)}/{safeMax}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

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
      <div className="w-full h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black flex flex-col">
        {/* Header - Fixed at top */}
        <div className="px-4 pt-4 pb-3 text-center bg-black bg-opacity-30">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-1">
            <TrendingUp className="inline-block mb-1" size={40} />
            <br />
            Permanent Upgrades
          </h1>
          <p className="text-lg md:text-xl text-purple-300 mb-0">Essence: ✨ {essence}</p>
          <p className="text-sm text-gray-400">Total Runs: {totalRuns}</p>
        </div>
  
        {/* Scrollable upgrades list - Takes remaining space between header and footer */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(UPGRADE_COSTS).map(upgradeKey => {
              const currentLevel = permanentUpgrades[upgradeKey];
              const cost = UPGRADE_COSTS[upgradeKey](currentLevel);
              const canAfford = essence >= cost;
              const Icon = UPGRADE_ICONS[upgradeKey];
  
              return (
                <div
                  key={upgradeKey}
                  className="bg-black bg-opacity-60 p-4 rounded-lg border-2 border-purple-600"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={32} className="text-purple-400" />
                    <div className="text-left flex-1">
                      <h3 className="text-white font-bold text-base">
                        {UPGRADE_NAMES[upgradeKey]}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {UPGRADE_DESCRIPTIONS[upgradeKey]}
                      </p>
                      <p className="text-yellow-400 text-xs">
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
                    className={`w-full py-2 rounded text-white font-bold ${
                      canAfford
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-600'
                    }`}
                  >
                    Upgrade for ✨ {cost}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
  
        {/* Footer button - Fixed at bottom */}
        <div className="px-4 py-3 bg-black bg-opacity-30">
          <button
            onClick={() => setShowUpgradeMenu(false)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (showShop) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black flex flex-col">
        {/* Header - Fixed at top */}
        <div className="px-4 pt-4 pb-3 text-center bg-black bg-opacity-30">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-1">
            Spell Shop
          </h1>
          <p className="text-lg md:text-xl text-yellow-400">Gold: 💰 {player.gold}</p>
        </div>
  
        {/* Scrollable spell list - Takes remaining space between header and footer */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(ALL_SPELLS).map(spell => {
              const Icon = spell.icon;
              const owned = purchasedSpells.includes(spell.key);
              const equipped = equippedSpells.some(s => s.key === spell.key);
              const canAfford = player.gold >= spell.price;
  
              return (
                <div
                  key={spell.key}
                  className={`bg-black bg-opacity-60 p-4 rounded-lg border-2 ${
                    equipped
                      ? 'border-yellow-400'
                      : owned
                      ? 'border-green-600'
                      : 'border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={32} style={{ color: spell.color }} />
                    <div className="text-left flex-1">
                      <h3 className="text-white font-bold text-base">{spell.name}</h3>
                      <p className="text-gray-300 text-sm">
                        Damage: {spell.damage} | Mana: {spell.manaCost}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {spell.description}
                      </p>
                    </div>
                  </div>
  
                  {/* Buttons */}
                  {!owned && (
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
                      className={`w-full py-2 rounded text-white font-bold ${
                        canAfford
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600'
                      }`}
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
                        setEquippedSpells(prev =>
                          prev.filter(s => s.key !== spell.key)
                        );
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
        </div>
  
        {/* Footer button - Fixed at bottom */}
        <div className="px-4 py-3 bg-black bg-opacity-30">
          <button
            onClick={continueToNextLevel}
            disabled={equippedSpells.length === 0}
            className={`w-full text-white font-bold py-3 px-8 rounded-lg text-lg ${
              equippedSpells.length === 0
                ? 'bg-gray-600'
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
      <div className="w-full h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 overflow-y-auto">
        <div className="min-h-screen flex flex-col justify-center px-4 py-8">
          <div className="text-center max-w-2xl mx-auto w-full">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              <Wand2 className="inline-block mb-2" size={64} />
              <br />
              WIZARD&apos;S DESCENT
            </h1>
            <p className="text-lg md:text-xl text-purple-200 mb-2">
              A Roguelite Dungeon Crawler
            </p>
        
            <div className="bg-black bg-opacity-60 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-purple-300">Essence</p>
                  <p className="text-xl text-yellow-400">✨ {essence || 0}</p>
                </div>
                <div>
                  <p className="text-purple-300">Total Runs</p>
                  <p className="text-xl text-white">{totalRuns || 0}</p>
                </div>
                <div>
                  <p className="text-purple-300">Deepest Level</p>
                  <p className="text-xl text-white">{highestLevel || 1}</p>
                </div>
                <div>
                  <p className="text-purple-300">Total Kills</p>
                  <p className="text-xl text-red-400">{totalKills || 0}</p>
                </div>
              </div>
            </div>

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
      </div>
    );
  }

  if (gameState === 'dead') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-red-900 via-red-800 to-black flex items-center justify-center overflow-y-auto">
        <div className="text-center px-4 py-8">
          <Skull className="mx-auto mb-4 text-red-400" size={80} />
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            You Have Fallen
          </h1>
        
          <div className="bg-black bg-opacity-60 p-4 rounded-lg mb-6 max-w-md mx-auto">
            <h2 className="text-xl text-yellow-400 mb-3">This Run</h2>
            <div className="space-y-2 text-left">
              <p className="text-lg text-red-200">Level Reached: {currentLevel}</p>
              <p className="text-lg text-red-200">Enemies Slain: {player.kills}</p>
              <p className="text-lg text-red-200">Gold Collected: {player.gold}</p>
              <p className="text-xl text-yellow-400 font-bold">Essence Earned: ✨ {Math.floor(essence - (parseInt(localStorage.getItem('wizardEssence')) || 0))}</p>
            </div>
          </div>

          <div className="bg-black bg-opacity-60 p-4 rounded-lg mb-6 max-w-md mx-auto">
            <h2 className="text-xl text-purple-400 mb-3">Career Stats</h2>
            <div className="space-y-2 text-left">
              <p className="text-md text-purple-200">Total Runs: {totalRuns}</p>
              <p className="text-md text-purple-200">Deepest Dungeon: {highestLevel}</p>
              <p className="text-md text-purple-200">Total Kills: {totalKills}</p>
              <p className="text-md text-purple-200">Total Gold: {totalGold}</p>
              <p className="text-md text-purple-200">Total Essence: ✨ {essence}</p>
            </div>
          </div>
        
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

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={musicVolume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMusicVolume(v);
            }}
          />

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

  {notification && (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
      <div className={`bg-${notification.color}-600 bg-opacity-90 px-6 py-3 rounded-lg text-white font-bold text-lg animate-pulse`}>
        {notification.text}
      </div>
    </div>
  )}

  // MAIN GAME VIEW
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative touch-none">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
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
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (player.mana / (player.maxMana || 1)) * 100)
                        )}%`
                      }}
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

          {/* Combo Display */}
          {combo.count > 1 && (
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div 
                className="text-center animate-pulse"
                style={{
                  textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.5)'
                }}
              >
                <div className="text-6xl font-bold text-yellow-400">
                  {combo.count}x COMBO!
                </div>
                <div className="text-2xl text-yellow-300">
                  {combo.multiplier.toFixed(1)}x Multiplier
                </div>
              </div>
            </div>
          )}
          
          {/* Active Buffs Display */}
          <div className="absolute top-20 right-4 space-y-2">
            {playerBuffs.damageBoost.active && (
              <div className="bg-orange-600 bg-opacity-80 px-3 py-2 rounded-lg text-white text-sm">
                🔥 Damage Boost: {playerBuffs.damageBoost.timeLeft.toFixed(1)}s
              </div>
            )}
            {playerBuffs.speedBoost.active && (
              <div className="bg-green-600 bg-opacity-80 px-3 py-2 rounded-lg text-white text-sm">
                ⚡ Speed Boost: {playerBuffs.speedBoost.timeLeft.toFixed(1)}s
              </div>
            )}
            {playerBuffs.invincible.active && (
              <div className="bg-yellow-600 bg-opacity-80 px-3 py-2 rounded-lg text-white text-sm animate-pulse">
                ✨ Invincible: {playerBuffs.invincible.timeLeft.toFixed(1)}s
              </div>
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

      {bossIntro && bossIntro.timer > 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center pointer-events-none z-50">
          <div className="text-center animate-pulse">
            <div className="text-8xl mb-4">⚔️</div>
            <div className="text-6xl font-bold text-red-500 mb-4" style={{
              textShadow: '0 0 30px rgba(255,0,0,0.8), 0 0 60px rgba(255,0,0,0.5)'
            }}>
              BOSS FIGHT
            </div>
            <div className="text-4xl text-red-300">
              {bossIntro.name}
            </div>
          </div>
        </div>
      )}
      
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


