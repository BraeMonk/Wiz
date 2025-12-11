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
  startPressed: false,
  revealPressed: false
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
      goldMultiplier: 0,
      criticalChance: 0,
      lifeSteal: 0,
      essenceGain: 0,        // ← important
    };
  });

  const [prestigeLevel, setPrestigeLevel] = useState(() => {
    const saved = localStorage.getItem('wizardPrestigeLevel');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  
  const [currentClass, setCurrentClass] = useState(() => {
    const saved = localStorage.getItem('wizardCurrentClass');
    return saved || null;
  });
  
  const [showPrestigeOffer, setShowPrestigeOffer] = useState(false);
  const [prestigeClassChoices, setPrestigeClassChoices] = useState([]);

  // Add powerup state to player (around line 86):
  const [playerBuffs, setPlayerBuffs] = useState({
    damageBoost: { active: false, multiplier: 1, timeLeft: 0 },
    speedBoost: { active: false, multiplier: 1, timeLeft: 0 },
    invincible: { active: false, timeLeft: 0 },
    arcaneWard: { active: false, hits: 0, maxHits: 3 }
  });

  const [gravitySuspendedEnemies, setGravitySuspendedEnemies] = useState(new Set());

  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(0.7);
  const soundEffectsRef = useRef({
    cast: null,
    hit: null,
    playerHit: null,
    death: null,
    pickup: null
  });

  const [damageVignette, setDamageVignette] = useState(0);
  const damageVignetteRef = useRef(0);
  
  useEffect(() => {
    damageVignetteRef.current = damageVignette;
  }, [damageVignette]);
  
  const [essence, setEssence] = useState(() => {
    const saved = localStorage.getItem('wizardEssence');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });


  const [essenceAtStart, setEssenceAtStart] = useState(0);

  const [totalRuns, setTotalRuns] = useState(() => {
    const saved = localStorage.getItem('wizardRuns');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });

  // Add these state declarations near the top with your other useState hooks (around line 50-100)
  const [highestLevel, setHighestLevel] = useState(() => {
    const saved = localStorage.getItem('wizardHighestLevel');
    const parsed = saved ? parseInt(saved, 10) : 1;
    return isNaN(parsed) ? 1 : parsed;
  });

  const [totalKills, setTotalKills] = useState(() => {
    const saved = localStorage.getItem('wizardTotalKills');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });


  const [totalGold, setTotalGold] = useState(() => {
    const saved = localStorage.getItem('wizardTotalGold');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
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
    },
    dash: {
      key: 'dash',
      name: 'Teleport Dash',
      damage: 0,
      manaCost: 20,
      cooldown: 0,
      maxCooldown: 3.0,
      color: '#00ffff',
      icon: Wind,
      price: 100,
      description: 'Instant forward teleport',
      isUtility: true
    },
    pushback: {
      key: 'pushback',
      name: 'Force Push',
      damage: 10,
      manaCost: 25,
      cooldown: 0,
      maxCooldown: 4.0,
      color: '#88ff88',
      icon: Wind,
      price: 120,
      description: 'Knockback enemies around you',
      isUtility: true
    },
    arcaneward: {
      key: 'arcaneward',
      name: 'Arcane Ward',
      damage: 0,
      manaCost: 30,
      cooldown: 0,
      maxCooldown: 15.0,
      color: '#4a9eff',
      icon: Shield,
      price: 150,
      description: 'Shield that blocks 3 hits',
      isUtility: true
    },
    gravitychoke: {
      key: 'gravitychoke',
      name: 'Gravity Choke',
      damage: 10,
      manaCost: 40,
      cooldown: 0,
      maxCooldown: 8.0,
      color: '#9b4aff',
      icon: Skull,
      price: 250,
      description: 'Suspend and damage enemies over time',
      isUtility: false
    },
  };

  // Spells that can be unlocked from secret chests
  const SECRET_SPELL_KEYS = [
    'meteor',
    'frost',
    'chain',
    'windblast',
    'arcane',
    'inferno',
    'blizzard',
    'storm',
    'shadow',
    'dash',
    'pushback',
    'arcaneward',
    'gravitychoke'
    // you can tweak this list however you want
  ];

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
  const [musicVolume, setMusicVolume] = useState(0.5);
  const musicInitializedRef = useRef(false);

  const [chests, setChests] = useState([]);

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = isMobile ? 400 : 800;  // INCREASED from 160/320 - 2.5x more rays
  const MOVE_SPEED = 3;
  const TURN_SPEED = 2;
  const PIXEL_STEP = isMobile ? 2 : 1;  // DECREASED from 4 - smaller pixels = more detail

  const TILE_FLOOR = 0;
  const TILE_WALL = 1;
  const TILE_SECRET_DOOR = 8; // NEW secret door tile
  
  // Dungeon themes - each level cycles through these
  const DUNGEON_THEMES = {
    crypt: {
      name: 'Ancient Crypt',
      ceiling: '#0f0e14',
      floorTop: '#1a1622',
      floorBottom: '#0a0810',
      fog: '#08070d',
      walls: {
        1: { color: '#2d2838', name: 'Stone' },
        2: { color: '#3f3548', name: 'Carved' },
        3: { color: '#1a2a1f', name: 'Moss' },
        4: { color: '#4a1818', name: 'Blood' },
        5: { color: '#302840', name: 'Cobweb' },
        6: { color: '#2a2430', name: 'Cracks' },
        7: { color: '#352d38', name: 'Rubble' }
      },
      accent: '#8b7ba8'
    },
    lava: {
      name: 'Volcanic Depths',
      ceiling: '#1a0a08',
      floorTop: '#2d1410',
      floorBottom: '#1a0805',
      fog: '#0d0603',
      walls: {
        1: { color: '#3a1a10', name: 'Basalt' },
        2: { color: '#4a2515', name: 'Scorched' },
        3: { color: '#5a2a18', name: 'Charred' },
        4: { color: '#ff4500', name: 'Lava' },
        5: { color: '#2a1510', name: 'Obsidian' },
        6: { color: '#3a2018', name: 'Ember' },
        7: { color: '#4a2820', name: 'Magma' }
      },
      accent: '#ff6600'
    },
    ice: {
      name: 'Frozen Cavern',
      ceiling: '#0a1418',
      floorTop: '#152530',
      floorBottom: '#0a1216',
      fog: '#060a0d',
      walls: {
        1: { color: '#2a3845', name: 'Ice' },
        2: { color: '#344858', name: 'Frost' },
        3: { color: '#1f3540', name: 'Glacier' },
        4: { color: '#4a6875', name: 'Crystal' },
        5: { color: '#253845', name: 'Frozen' },
        6: { color: '#2f4350', name: 'Icicle' },
        7: { color: '#3a5060', name: 'Permafrost' }
      },
      accent: '#88ddff'
    },
    toxic: {
      name: 'Poison Swamp',
      ceiling: '#0e120a',
      floorTop: '#1a2414',
      floorBottom: '#0a0f08',
      fog: '#070a05',
      walls: {
        1: { color: '#2a3820', name: 'Slime' },
        2: { color: '#354a25', name: 'Toxic' },
        3: { color: '#1f2e18', name: 'Rot' },
        4: { color: '#4a6030', name: 'Fungal' },
        5: { color: '#253520', name: 'Decay' },
        6: { color: '#2f4028', name: 'Spore' },
        7: { color: '#3a5035', name: 'Mold' }
      },
      accent: '#88ff88'
    },
    shadow: {
      name: 'Shadow Realm',
      ceiling: '#08050a',
      floorTop: '#12081a',
      floorBottom: '#060308',
      fog: '#030204',
      walls: {
        1: { color: '#1a1028', name: 'Shadow' },
        2: { color: '#251838', name: 'Void' },
        3: { color: '#150820', name: 'Dark' },
        4: { color: '#3a2048', name: 'Ethereal' },
        5: { color: '#1f1530', name: 'Phantom' },
        6: { color: '#2a1a38', name: 'Spectral' },
        7: { color: '#352545', name: 'Cursed' }
      },
      accent: '#aa88ff'
    }
  };
  
  const THEME_ORDER = ['crypt', 'lava', 'ice', 'toxic', 'shadow'];
  
  const getCurrentTheme = (level) => {
    const themeIndex = (level - 1) % THEME_ORDER.length;
    const themeName = THEME_ORDER[themeIndex];
    return DUNGEON_THEMES[themeName];
  };

  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme(1));

  // Enemy types (including bosses)
  const ENEMY_TYPES = {
    skeleton: { health: 30, damage: 10, speed: 1.5, xp: 15, color: '#e5e5e5', gold: 5, essence: 1 },
    demon: { health: 50, damage: 15, speed: 1.0, xp: 25, color: '#ff3b3b', gold: 10, essence: 2 },
    ghost: { health: 20, damage: 8, speed: 2.0, xp: 20, color: '#b8c6ff', gold: 8, essence: 1 },
    golem: { health: 80, damage: 20, speed: 0.8, xp: 40, color: '#b08b57', gold: 15, essence: 3 },
    archer: { health: 25, damage: 12, speed: 0.8, xp: 18, color: '#8b4513', gold: 7, essence: 1, isRanged: true, attackRange: 10, attackCooldown: 2.5 },
    // Bosses
    boss_necromancer: { health: 300, damage: 30, speed: 0.6, xp: 200, color: '#aa00ff', gold: 100, essence: 20, isBoss: true },
    boss_dragon: { health: 500, damage: 40, speed: 0.5, xp: 300, color: '#ff0000', gold: 150, essence: 30, isBoss: true },
    boss_lich: { health: 400, damage: 35, speed: 0.7, xp: 250, color: '#00ffaa', gold: 120, essence: 25, isBoss: true }
  };

  const PRESTIGE_CLASSES = {
    battlemage: {
      id: 'battlemage',
      name: 'Battle Mage',
      icon: '⚔️',
      description: 'Master of close combat magic',
      color: '#ff6b35',
      bonuses: {
        damageMultiplier: 1.5,
        healthOnKill: 15,
        meleeRange: 2.0,
        specialAbility: 'Enemies that die explode, damaging nearby foes'
      }
    },
    necromancer: {
      id: 'necromancer',
      name: 'Necromancer',
      icon: '💀',
      description: 'Raise the dead to fight for you',
      color: '#8b5cf6',
      bonuses: {
        summonChance: 0.15,
        summonHealth: 50,
        essenceGainBonus: 0.5,
        specialAbility: '15% chance to summon skeleton minion on kill'
      }
    },
    elementalist: {
      id: 'elementalist',
      name: 'Elementalist',
      icon: '🔥',
      description: 'Harness all elements with devastating power',
      color: '#f59e0b',
      bonuses: {
        elementalDamage: 2.0,
        manaEfficiency: 0.7,
        aoeRadius: 1.5,
        specialAbility: 'All spells deal double damage and cost 30% less mana'
      }
    },
    shadowdancer: {
      id: 'shadowdancer',
      name: 'Shadow Dancer',
      icon: '🌙',
      description: 'Move through shadows with lethal grace',
      color: '#6366f1',
      bonuses: {
        speedMultiplier: 1.8,
        dodgeChance: 0.25,
        criticalChance: 0.3,
        specialAbility: '25% dodge chance and 30% critical hit chance'
      }
    },
    archmagus: {
      id: 'archmagus',
      name: 'Archmagus',
      icon: '✨',
      description: 'Ultimate magical mastery',
      color: '#a855f7',
      bonuses: {
        allStatsMultiplier: 1.3,
        cooldownReduction: 0.4,
        manaRegen: 2.0,
        specialAbility: '30% bonus to all stats and 40% faster cooldowns'
      }
    },
    bloodmage: {
      id: 'bloodmage',
      name: 'Blood Mage',
      icon: '🩸',
      description: 'Convert life force into devastating power',
      color: '#dc2626',
      bonuses: {
        lifestealMultiplier: 3.0,
        damagePerMissingHealth: 0.02,
        healthCostReduction: 0.5,
        specialAbility: 'Triple lifesteal, gain damage based on missing health'
      }
    },
    timewarden: {
      id: 'timewarden',
      name: 'Time Warden',
      icon: '⏰',
      description: 'Manipulate the flow of time itself',
      color: '#06b6d4',
      bonuses: {
        slowEnemies: 0.5,
        hasteSelf: 1.4,
        cooldownRewind: 0.2,
        specialAbility: 'Enemies move 50% slower, you move 40% faster'
      }
    },
    voidcaller: {
      id: 'voidcaller',
      name: 'Void Caller',
      icon: '🌀',
      description: 'Channel the power of the void',
      color: '#7c3aed',
      bonuses: {
        voidDamage: 2.5,
        piercing: true,
        healthDrain: 0.1,
        specialAbility: 'Spells pierce enemies and drain 10% of damage as health'
      }
    },
    stormlord: {
      id: 'stormlord',
      name: 'Storm Lord',
      icon: '⚡',
      description: 'Command the fury of the storm',
      color: '#eab308',
      bonuses: {
        chainLightning: 3,
        shockDamage: 1.8,
        movementInCombat: 1.5,
        specialAbility: 'Lightning spells chain to 3 additional enemies'
      }
    },
    runekeeper: {
      id: 'runekeeper',
      name: 'Runekeeper',
      icon: '📜',
      description: 'Ancient runes grant immense power',
      color: '#f97316',
      bonuses: {
        runeShield: 100,
        runeDamageBonus: 1.6,
        runeRegeneration: 5,
        specialAbility: 'Start with 100 shield that regenerates 5/sec'
      }
    },
    frostlord: {
      id: 'frostlord',
      name: 'Frost Lord',
      icon: '❄️',
      description: 'Freeze your enemies in eternal winter',
      color: '#0ea5e9',
      bonuses: {
        freezeChance: 0.3,
        freezeDuration: 2.0,
        frostDamage: 1.7,
        specialAbility: '30% chance to freeze enemies for 2 seconds'
      }
    },
    pyromancer: {
      id: 'pyromancer',
      name: 'Pyromancer',
      icon: '🔥',
      description: 'Burn everything to ashes',
      color: '#ef4444',
      bonuses: {
        burnDamage: 10,
        burnDuration: 5,
        explosionRadius: 2.0,
        specialAbility: 'Enemies burn for 10 damage/sec for 5 seconds'
      }
    },
    celestial: {
      id: 'celestial',
      name: 'Celestial',
      icon: '☀️',
      description: 'Channel divine light',
      color: '#fbbf24',
      bonuses: {
        healOnKill: 25,
        holyDamage: 1.8,
        reviveOnce: true,
        specialAbility: 'Heal 25 HP per kill, revive once per level at 50% health'
      }
    },
    demonpact: {
      id: 'demonpact',
      name: 'Demon Pact',
      icon: '👿',
      description: 'Trade health for overwhelming power',
      color: '#991b1b',
      bonuses: {
        demonicPower: 3.0,
        healthCost: 0.5,
        damageResistance: 0.3,
        specialAbility: 'Triple damage but spells cost health, 30% damage resistance'
      }
    },
    earthshaper: {
      id: 'earthshaper',
      name: 'Earth Shaper',
      icon: '🌍',
      description: 'Command the earth itself',
      color: '#92400e',
      bonuses: {
        maxHealthBonus: 200,
        earthDamage: 1.5,
        knockbackPower: 2.0,
        specialAbility: '+200 max health, spells knockback enemies'
      }
    }
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

  useEffect(() => {
    localStorage.setItem('wizardPrestigeLevel', prestigeLevel.toString());
  }, [prestigeLevel]);
  
  useEffect(() => {
    if (currentClass) {
      localStorage.setItem('wizardCurrentClass', currentClass);
    }
  }, [currentClass]);
  
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
    const theme = getCurrentTheme(level);
    const depth = Math.max(0, Math.min(1, (level - 1) / 20));
  
    // Darken colors based on depth
    const darkenColor = (hex, factor) => {
      const rgb = hexToRgb(hex);
      return `#${Math.floor(rgb.r * factor).toString(16).padStart(2, '0')}${Math.floor(rgb.g * factor).toString(16).padStart(2, '0')}${Math.floor(rgb.b * factor).toString(16).padStart(2, '0')}`;
    };
  
    const depthFactor = 1 - depth * 0.4;
  
    return {
      ceiling: darkenColor(theme.ceiling, depthFactor),
      floorTop: darkenColor(theme.floorTop, depthFactor),
      floorBottom: darkenColor(theme.floorBottom, depthFactor),
      fog: darkenColor(theme.fog, depthFactor),
      wallPalette: Object.fromEntries(
        Object.entries(theme.walls).map(([key, wall]) => [
          key,
          darkenColor(wall.color, depthFactor)
        ])
      ),
      accentTorch: theme.accent,
      accentFungi: theme.accent,
      themeName: theme.name
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

  // Music setup – create audio ONCE and keep playing
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
  }, []);
  
  // Handle track changes and initial play
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio || musicTracks.length === 0) return;
  
    audio.src = musicTracks[currentTrackIndex];
    audio.load();
  
    if (musicEnabled && musicInitializedRef.current) {
      audio.volume = 0;
      audio.play().catch(() => {});
      fadeVolume(audio, musicVolume, 0.02);
    }
  }, [currentTrackIndex]);
  
  // Handle play/pause based on musicEnabled only
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;
  
    if (!musicEnabled) {
      fadeVolume(audio, 0, 0.05);
      setTimeout(() => audio.pause(), 300);
      return;
    }
  
    if (musicEnabled && audio.paused && audio.readyState >= 2) {
      audio.volume = 0;
      audio.play().catch(() => {});
      fadeVolume(audio, musicVolume, 0.02);
    }
  }, [musicEnabled]);
  
  // Handle volume changes
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio || !musicEnabled) return;
    fadeVolume(audio, musicVolume, 0.05);
  }, [musicVolume]);

  // Sound effects setup - create ONE AudioContext
  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playSoundEffect = (frequency, duration, type = 'sine', volumeMultiplier = 1) => {
      if (!soundEffectsEnabled) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(sfxVolume * volumeMultiplier, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };
  
    soundEffectsRef.current = {
      cast: () => {
        if (!soundEffectsEnabled) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(sfxVolume * 0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      },
      
      hit: () => playSoundEffect(200, 0.15, 'sawtooth', 1),
      
      playerHit: () => {
        if (!soundEffectsEnabled) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(sfxVolume * 0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      },
      
      death: () => playSoundEffect(100, 0.5, 'sawtooth', 1),
      
      pickup: () => {
        if (!soundEffectsEnabled) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(sfxVolume * 0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    };
    
    return () => {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [soundEffectsEnabled, sfxVolume]);
  
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
          startPressed: start && !prev.start,
          revealPressed: fire && !prev.fire
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
  
      if (!spell || spell.cooldown > 0) {
        return prev;
      }
  
      const currentPlayer = playerRef.current;
      if (!currentPlayer || currentPlayer.mana < spell.manaCost) {
        return prev;
      }
  
      // 🔵 Spend mana - update both ref and state immediately so UI updates
      setPlayer(prevPlayer => {
        const cost = spell.manaCost ?? 0;
        const newMana = Math.max(0, prevPlayer.mana - cost);
        const updated = { ...prevPlayer, mana: newMana };
        playerRef.current = updated; // keep ref in sync
        return updated;
      });
  
      soundEffectsRef.current?.cast?.();
  
      const bonusDamage = (permanentUpgrades?.damageBonus ?? 0) * 0.1;
      let finalDamage = (spell.damage ?? 0) * (1 + bonusDamage);
      
      // Apply class bonuses
      if (currentClass && PRESTIGE_CLASSES[currentClass]) {
        const classData = PRESTIGE_CLASSES[currentClass];
        const bonuses = classData.bonuses || {};
        if (bonuses.damageMultiplier) {
          finalDamage *= bonuses.damageMultiplier;
        }
        if (bonuses.elementalDamage) {
          finalDamage *= bonuses.elementalDamage;
        }
        if (bonuses.allStatsMultiplier) {
          finalDamage *= bonuses.allStatsMultiplier;
        }
      }
      
      // Apply damage boost powerup
      if (playerBuffs?.damageBoost?.active) {
        finalDamage *= playerBuffs.damageBoost.multiplier ?? 1;
      }
      
      // ==============================
      //        UTILITY SPELLS
      // ==============================
      if (spell.key === 'dash') {
        // Teleport forward
        const dashDistance = 3;
        const newX = currentPlayer.x + Math.cos(currentPlayer.angle) * dashDistance;
        const newY = currentPlayer.y + Math.sin(currentPlayer.angle) * dashDistance;
        
        const tileX = Math.floor(newX);
        const tileY = Math.floor(newY);
        
        const successfulDash = (
          tileX >= 0 && tileX < DUNGEON_SIZE &&
          tileY >= 0 && tileY < DUNGEON_SIZE &&
          dungeon[tileY][tileX] === TILE_FLOOR
        );
        
        if (successfulDash) {
          // Create trail effect between old and new position
          const steps = 10;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const trailX = currentPlayer.x + (newX - currentPlayer.x) * t;
            const trailY = currentPlayer.y + (newY - currentPlayer.y) * t;
            setTimeout(() => {
              createParticleEffect(trailX, trailY, spell.color, 5, 'explosion');
            }, i * 20);
          }
          
          setPlayer(p => {
            const updated = { ...p, x: newX, y: newY };
            playerRef.current = updated;
            return updated;
          });
          createParticleEffect(currentPlayer.x, currentPlayer.y, spell.color, 20, 'explosion');
          createParticleEffect(newX, newY, spell.color, 20, 'explosion');
          addScreenShake(0.3);
        }
  
      } else if (spell.key === 'pushback') {
        // Push back all nearby enemies
        createParticleEffect(currentPlayer.x, currentPlayer.y, spell.color, 30, 'explosion');
        addScreenShake(0.6);
        
        setEnemies(prevEnemies =>
          prevEnemies
            .map(enemy => {
  
              // Skip AI if gravity suspended
              if (enemy.gravitySuspended) {
                return {
                  ...enemy,
                  x: enemy.x,
                  y: enemy.y
                };
              }
                
              const dx = enemy.x - currentPlayer.x;
              const dy = enemy.y - currentPlayer.y;
              const distance = Math.hypot(dx, dy);
              
              if (distance < 3) {
                // Apply damage
                const newHealth = (enemy.health ?? 0) - finalDamage;
                
                // Push enemy away
                const pushDistance = 2;
                const angle = Math.atan2(dy, dx);
                const newX = enemy.x + Math.cos(angle) * pushDistance;
                const newY = enemy.y + Math.sin(angle) * pushDistance;
                
                const tileX = Math.floor(newX);
                const tileY = Math.floor(newY);
                
                if (
                  tileX >= 0 && tileX < DUNGEON_SIZE &&
                  tileY >= 0 && tileY < DUNGEON_SIZE &&
                  dungeon[tileY][tileX] === TILE_FLOOR
                ) {
                  createParticleEffect(enemy.x, enemy.y, spell.color, 10, 'hit');
                  
                  if (newHealth <= 0) {
                    soundEffectsRef.current?.death?.();
                    
                    // ========== BASE DEATH PARTICLES ==========
                    createParticleEffect(enemy.x, enemy.y, enemy.color, 20, 'explosion');
                    addScreenShake(enemy.isBoss ? 0.8 : 0.3);
                  
                    // ========== PRESTIGE CLASS DEATH EFFECTS ==========
                    
                    // Battle Mage - massive explosion
                    if (currentClass === 'battlemage') {
                      const explosionRadius = PRESTIGE_CLASSES.battlemage.bonuses.meleeRange;
                      
                      // Central explosion
                      createParticleEffect(enemy.x, enemy.y, '#ff6b35', 40, 'explosion');
                      addScreenShake(0.6);
                      
                      // Shockwave rings
                      for (let ring = 1; ring <= 3; ring++) {
                        setTimeout(() => {
                          const ringParticles = 12 * ring;
                          for (let i = 0; i < ringParticles; i++) {
                            const angle = (i / ringParticles) * Math.PI * 2;
                            const dist = ring * 0.5;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * dist,
                              enemy.y + Math.sin(angle) * dist,
                              '#ff6b35',
                              6,
                              'explosion'
                            );
                          }
                        }, ring * 100);
                      }
                      
                      showNotification('💥 EXPLOSIVE DEATH!', 'orange');
                      
                      // Damage nearby enemies
                      setEnemies(prevEnemies =>
                        prevEnemies.map(otherEnemy => {
                          if (otherEnemy.id === enemy.id) return otherEnemy;
                          const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
                          if (dist < explosionRadius) {
                            const explosionDamage = finalDamage * 0.6;
                            
                            // Explosion effect on each enemy hit
                            setTimeout(() => {
                              createParticleEffect(otherEnemy.x, otherEnemy.y, '#ff6b35', 15, 'hit');
                              addScreenShake(0.2);
                            }, 150);
                            
                            return {
                              ...otherEnemy,
                              health: otherEnemy.health - explosionDamage
                            };
                          }
                          return otherEnemy;
                        }).filter(e => e.health > 0)
                      );
                      
                      // Heal on kill
                      const healAmount = PRESTIGE_CLASSES.battlemage.bonuses.healthOnKill;
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + healAmount)
                      }));
                      
                      // Healing spiral
                      for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                          const pVis = playerRef.current || currentPlayer;
                          createParticleEffect(pVis.x, pVis.y, '#00ff00', 6, 'hit');
                        }, i * 40);
                      }
                    }
                    
                    // Necromancer - soul rises
                    if (currentClass === 'necromancer' && Math.random() < PRESTIGE_CLASSES.necromancer.bonuses.summonChance) {
                      showNotification('💀 SKELETON SUMMONED!', 'purple');
                      
                      // Dark ritual circle
                      for (let circle = 0; circle < 3; circle++) {
                        setTimeout(() => {
                          const circleParticles = 8;
                          for (let i = 0; i < circleParticles; i++) {
                            const angle = (i / circleParticles) * Math.PI * 2;
                            const radius = 0.3 + circle * 0.2;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              '#8b5cf6',
                              8,
                              'explosion'
                            );
                          }
                        }, circle * 150);
                      }
                      
                      // Soul ascension
                      for (let i = 0; i < 10; i++) {
                        setTimeout(() => {
                          createParticleEffect(
                            enemy.x + (Math.random() - 0.5) * 0.6,
                            enemy.y - i * 0.1,
                            '#8b5cf6',
                            5,
                            'explosion'
                          );
                        }, i * 80);
                      }
                      
                      addScreenShake(0.3);
                    }
                    
                    // Elementalist - elemental burst
                    if (currentClass === 'elementalist') {
                      const elements = [
                        { color: '#ff4400', name: 'Fire' },
                        { color: '#00aaff', name: 'Ice' },
                        { color: '#ffff00', name: 'Lightning' },
                        { color: '#88ff88', name: 'Wind' }
                      ];
                      
                      elements.forEach((element, i) => {
                        setTimeout(() => {
                          createParticleEffect(enemy.x, enemy.y, element.color, 20, 'explosion');
                          
                          // Element-specific spread
                          for (let j = 0; j < 8; j++) {
                            const angle = (j / 8) * Math.PI * 2 + i * Math.PI / 2;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * 0.7,
                              enemy.y + Math.sin(angle) * 0.7,
                              element.color,
                              8,
                              'hit'
                            );
                          }
                        }, i * 120);
                      });
                      
                      addScreenShake(0.5);
                    }
                    
                    // Shadow Dancer - shadow dispersion
                    if (currentClass === 'shadowdancer') {
                      // Shadow clones fade away
                      for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                          const angle = (i / 5) * Math.PI * 2;
                          const dist = 0.5 + i * 0.2;
                          createParticleEffect(
                            enemy.x + Math.cos(angle) * dist,
                            enemy.y + Math.sin(angle) * dist,
                            '#6366f1',
                            12,
                            'explosion'
                          );
                        }, i * 80);
                      }
                      
                      // Quick fade effect
                      for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                          createParticleEffect(enemy.x, enemy.y, '#6366f1', 15 - i * 5, 'explosion');
                        }, i * 60);
                      }
                    }
                    
                    // Archmagus - arcane implosion
                    if (currentClass === 'archmagus') {
                      // Implosion (particles move inward)
                      for (let wave = 0; wave < 4; wave++) {
                        setTimeout(() => {
                          const particleCount = 12;
                          for (let i = 0; i < particleCount; i++) {
                            const angle = (i / particleCount) * Math.PI * 2;
                            const startDist = 1.5 - wave * 0.35;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * startDist,
                              enemy.y + Math.sin(angle) * startDist,
                              '#a855f7',
                              10,
                              'hit'
                            );
                          }
                        }, wave * 100);
                      }
                      
                      // Final burst
                      setTimeout(() => {
                        createParticleEffect(enemy.x, enemy.y, '#a855f7', 35, 'explosion');
                        addScreenShake(0.4);
                      }, 400);
                    }
                    
                    // Blood Mage - blood fountain
                    if (currentClass === 'bloodmage') {
                      const bloodHeal = finalDamage * PRESTIGE_CLASSES.bloodmage.bonuses.lifestealMultiplier * 0.15;
                      
                      // Blood eruption
                      for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                          const angle = Math.random() * Math.PI * 2;
                          const dist = Math.random() * 1.2;
                          createParticleEffect(
                            enemy.x + Math.cos(angle) * dist,
                            enemy.y + Math.sin(angle) * dist,
                            '#dc2626',
                            8,
                            'explosion'
                          );
                        }, i * 30);
                      }
                      
                      // Blood streams to player
                      for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                          const pVis = playerRef.current || currentPlayer;
                          createParticleEffect(
                            pVis.x + (Math.random() - 0.5) * 0.4,
                            pVis.y + (Math.random() - 0.5) * 0.4,
                            '#dc2626',
                            10,
                            'hit'
                          );
                        }, 200 + i * 40);
                      }
                      
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + bloodHeal)
                      }));
                      
                      showNotification(`💉 +${Math.floor(bloodHeal)} HP`, 'red');
                    }
                    
                    // Time Warden - time freeze death
                    if (currentClass === 'timewarden') {
                      // Time ripples
                      for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                          const radius = i * 0.4;
                          const particleCount = 12;
                          for (let j = 0; j < particleCount; j++) {
                            const angle = (j / particleCount) * Math.PI * 2;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              '#06b6d4',
                              6,
                              'explosion'
                            );
                          }
                        }, i * 100);
                      }
                      
                      // Slow-motion effect indicator
                      showNotification('⏰ TIME SLOWS...', 'cyan');
                    }
                    
                    // Void Caller - void implosion
                    if (currentClass === 'voidcaller') {
                      const drainAmount = finalDamage * PRESTIGE_CLASSES.voidcaller.bonuses.healthDrain;
                      
                      // Void portal opens
                      for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                          const radius = 1.2 - i * 0.15;
                          createParticleEffect(enemy.x, enemy.y, '#7c3aed', 15, 'explosion');
                          
                          // Tendrils reach out
                          for (let j = 0; j < 6; j++) {
                            const angle = (j / 6) * Math.PI * 2 + i * 0.3;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              '#7c3aed',
                              8,
                              'hit'
                            );
                          }
                        }, i * 80);
                      }
                      
                      // Void energy to player
                      for (let i = 0; i < 6; i++) {
                        setTimeout(() => {
                          const pVis = playerRef.current || currentPlayer;
                          createParticleEffect(pVis.x, pVis.y, '#7c3aed', 8, 'hit');
                        }, 400 + i * 50);
                      }
                      
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + drainAmount)
                      }));
                      
                      showNotification('🌀 VOID ABSORB', 'purple');
                    }
                    
                    // Storm Lord - lightning storm
                    if (currentClass === 'stormlord') {
                      const chainTargets = PRESTIGE_CLASSES.stormlord.bonuses.chainLightning;
                      const chainDamage = finalDamage * 0.4;
                      
                      // Lightning strikes at death location
                      for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                          createParticleEffect(
                            enemy.x + (Math.random() - 0.5) * 0.8,
                            enemy.y + (Math.random() - 0.5) * 0.8,
                            '#eab308',
                            25,
                            'explosion'
                          );
                          addScreenShake(0.3);
                        }, i * 120);
                      }
                      
                      // Chain to nearby enemies
                      let chainedEnemies = [];
                      let lastPos = { x: enemy.x, y: enemy.y };
                      
                      setEnemies(prevEnemies => {
                        const sortedByDistance = [...prevEnemies]
                          .filter(e => e.id !== enemy.id)
                          .sort((a, b) => {
                            const distA = Math.hypot(a.x - lastPos.x, a.y - lastPos.y);
                            const distB = Math.hypot(b.x - lastPos.x, b.y - lastPos.y);
                            return distA - distB;
                          });
                        
                        for (let i = 0; i < Math.min(chainTargets, sortedByDistance.length); i++) {
                          const target = sortedByDistance[i];
                          chainedEnemies.push(target);
                          
                          setTimeout(() => {
                            // Lightning bolt effect
                            createParticleEffect(target.x, target.y, '#eab308', 25, 'explosion');
                            
                            // Lightning arc particles
                            const steps = 8;
                            for (let j = 0; j <= steps; j++) {
                              const t = j / steps;
                              const arcX = lastPos.x + (target.x - lastPos.x) * t;
                              const arcY = lastPos.y + (target.y - lastPos.y) * t;
                              setTimeout(() => {
                                createParticleEffect(arcX, arcY, '#eab308', 6, 'hit');
                              }, j * 20);
                            }
                            
                            addScreenShake(0.25);
                          }, i * 200);
                          
                          lastPos = { x: target.x, y: target.y };
                        }
                        
                        return prevEnemies.map(e => {
                          if (chainedEnemies.some(ce => ce.id === e.id)) {
                            return { ...e, health: e.health - chainDamage };
                          }
                          return e;
                        }).filter(e => e.health > 0);
                      });
                      
                      if (chainedEnemies.length > 0) {
                        showNotification(`⚡ CHAINED ${chainedEnemies.length}!`, 'yellow');
                      }
                    }
                    
                    // Runekeeper - runic explosion
                    if (currentClass === 'runekeeper') {
                      // Runes orbit and explode
                      for (let i = 0; i < 6; i++) {
                        setTimeout(() => {
                          const angle = (i / 6) * Math.PI * 2;
                          const radius = 0.8;
                          createParticleEffect(
                            enemy.x + Math.cos(angle) * radius,
                            enemy.y + Math.sin(angle) * radius,
                            '#f97316',
                            15,
                            'explosion'
                          );
                        }, i * 100);
                      }
                      
                      // Final runic burst
                      setTimeout(() => {
                        createParticleEffect(enemy.x, enemy.y, '#f97316', 30, 'explosion');
                        addScreenShake(0.4);
                      }, 600);
                    }
                    
                    // Frost Lord - ice shatter
                    if (currentClass === 'frostlord') {
                      const freezeRadius = 3.0;
                      
                      // Ice explosion
                      createParticleEffect(enemy.x, enemy.y, '#0ea5e9', 35, 'explosion');
                      
                      // Ice shards fly out
                      for (let i = 0; i < 16; i++) {
                        setTimeout(() => {
                          const angle = (i / 16) * Math.PI * 2;
                          const dist = 0.3 + Math.random() * 0.8;
                          createParticleEffect(
                            enemy.x + Math.cos(angle) * dist,
                            enemy.y + Math.sin(angle) * dist,
                            '#0ea5e9',
                            10,
                            'explosion'
                          );
                        }, i * 40);
                      }
                      
                      // Freeze nearby enemies
                      setEnemies(prevEnemies =>
                        prevEnemies.map(otherEnemy => {
                          if (otherEnemy.id === enemy.id) return otherEnemy;
                          const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
                          if (dist < freezeRadius && Math.random() < PRESTIGE_CLASSES.frostlord.bonuses.freezeChance) {
                            
                            // Freeze effect on enemy
                            setTimeout(() => {
                              createParticleEffect(otherEnemy.x, otherEnemy.y, '#0ea5e9', 15, 'hit');
                            }, 100);
                            
                            return {
                              ...otherEnemy,
                              speed: otherEnemy.speed * 0.1,
                              frozen: true,
                              freezeTimer: PRESTIGE_CLASSES.frostlord.bonuses.freezeDuration
                            };
                          }
                          return otherEnemy;
                        })
                      );
                      
                      showNotification('❄️ FROZEN!', 'cyan');
                    }
                    
                    // Pyromancer - inferno
                    if (currentClass === 'pyromancer') {
                      const burnRadius = PRESTIGE_CLASSES.pyromancer.bonuses.explosionRadius;
                      
                      // Massive fire explosion
                      createParticleEffect(enemy.x, enemy.y, '#ef4444', 50, 'explosion');
                      addScreenShake(0.7);
                      
                      // Fire waves
                      for (let wave = 0; wave < 4; wave++) {
                        setTimeout(() => {
                          const waveParticles = 16;
                          for (let i = 0; i < waveParticles; i++) {
                            const angle = (i / waveParticles) * Math.PI * 2;
                            const radius = wave * 0.5;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              wave % 2 === 0 ? '#ef4444' : '#ff8800',
                              12,
                              'explosion'
                            );
                          }
                        }, wave * 120);
                      }
                      
                      // Burn nearby enemies
                      setEnemies(prevEnemies =>
                        prevEnemies.map(otherEnemy => {
                          if (otherEnemy.id === enemy.id) return otherEnemy;
                          const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
                          if (dist < burnRadius) {
                            
                            // Ignite effect
                            setTimeout(() => {
                              createParticleEffect(otherEnemy.x, otherEnemy.y, '#ef4444', 18, 'hit');
                            }, 150);
                            
                            return {
                              ...otherEnemy,
                              burning: true,
                              burnDamage: PRESTIGE_CLASSES.pyromancer.bonuses.burnDamage,
                              burnTimer: PRESTIGE_CLASSES.pyromancer.bonuses.burnDuration
                            };
                          }
                          return otherEnemy;
                        })
                      );
                      
                      showNotification('🔥 BURNING!', 'red');
                    }
                    
                    // Celestial - holy nova
                    if (currentClass === 'celestial') {
                      const healOnKill = PRESTIGE_CLASSES.celestial.bonuses.healOnKill;
                      const holyDamageMult = PRESTIGE_CLASSES.celestial.bonuses.holyDamage || 1.8;
                      const holyRadius = 3.0;
                  
                      // Holy explosion at death location
                      createParticleEffect(enemy.x, enemy.y, '#fbbf24', 40, 'explosion');
                      addScreenShake(0.5);
                  
                      // Radiating rings of light
                      for (let ring = 1; ring <= 3; ring++) {
                        setTimeout(() => {
                          const ringParticles = 16 * ring;
                          const radius = ring * 0.7;
                          for (let i = 0; i < ringParticles; i++) {
                            const angle = (i / ringParticles) * Math.PI * 2;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              '#fde68a',
                              6,
                              'explosion'
                            );
                          }
                        }, ring * 100);
                      }
                  
                      // Damage nearby enemies with holy nova
                      setEnemies(prevEnemies =>
                        prevEnemies
                          .map(otherEnemy => {
                            if (otherEnemy.id === enemy.id) return otherEnemy;
                            const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
                            if (dist < holyRadius) {
                              const aoeDamage = finalDamage * 0.5 * holyDamageMult;
                  
                              setTimeout(() => {
                                createParticleEffect(otherEnemy.x, otherEnemy.y, '#fbbf24', 12, 'hit');
                              }, 120);
                  
                              return {
                                ...otherEnemy,
                                health: otherEnemy.health - aoeDamage
                              };
                            }
                            return otherEnemy;
                          })
                          .filter(e => e.health > 0)
                      );
                  
                      // Heal the player on kill
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + healOnKill)
                      }));
                  
                      showNotification(`☀️ HOLY NOVA +${healOnKill} HP`, 'yellow');
                    }
                  
                    // Demon Pact - hellfire detonation
                    if (currentClass === 'demonpact') {
                      const demonicPower = PRESTIGE_CLASSES.demonpact.bonuses.demonicPower || 3.0;
                      const healthCostFactor = PRESTIGE_CLASSES.demonpact.bonuses.healthCost || 0.5;
                      const hellRadius = 2.5;
                  
                      // Pay health cost for the detonation
                      const healthCost = Math.floor(finalDamage * healthCostFactor);
                      setPlayer(p => ({
                        ...p,
                        health: Math.max(1, p.health - healthCost)
                      }));
                  
                      showNotification(`👿 -${healthCost} HP FOR POWER`, 'red');
                  
                      // Central hellfire explosion
                      createParticleEffect(enemy.x, enemy.y, '#991b1b', 50, 'explosion');
                      addScreenShake(0.8);
                  
                      // Rising hellfire pillars
                      for (let i = 0; i < 8; i++) {
                        setTimeout(() => {
                          const angle = (i / 8) * Math.PI * 2;
                          const dist = 0.8 + Math.random() * 0.8;
                          createParticleEffect(
                            enemy.x + Math.cos(angle) * dist,
                            enemy.y + Math.sin(angle) * dist,
                            '#ef4444',
                            10,
                            'explosion'
                          );
                        }, i * 70);
                      }
                  
                      // Massive AoE damage around corpse
                      setEnemies(prevEnemies =>
                        prevEnemies
                          .map(otherEnemy => {
                            if (otherEnemy.id === enemy.id) return otherEnemy;
                            const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
                            if (dist < hellRadius) {
                              const aoeDamage = finalDamage * demonicPower;
                  
                              setTimeout(() => {
                                createParticleEffect(otherEnemy.x, otherEnemy.y, '#ef4444', 16, 'hit');
                              }, 100);
                  
                              return {
                                ...otherEnemy,
                                health: otherEnemy.health - aoeDamage
                              };
                            }
                            return otherEnemy;
                          })
                          .filter(e => e.health > 0)
                      );
                    }
                  
                    // Earth Shaper - seismic shockwave
                    if (currentClass === 'earthshaper') {
                      const quakeRadius = 3.5;
                      const knockbackPower = PRESTIGE_CLASSES.earthshaper.bonuses.knockbackPower || 2.0;
                      const earthDamageMult = PRESTIGE_CLASSES.earthshaper.bonuses.earthDamage || 1.5;
                  
                      // Ground crack + dust burst
                      createParticleEffect(enemy.x, enemy.y, '#92400e', 35, 'explosion');
                      addScreenShake(0.7);
                  
                      // Circular shockwave
                      for (let ring = 0; ring < 3; ring++) {
                        setTimeout(() => {
                          const ringParticles = 18;
                          const radius = 0.8 + ring * 0.6;
                          for (let i = 0; i < ringParticles; i++) {
                            const angle = (i / ringParticles) * Math.PI * 2;
                            createParticleEffect(
                              enemy.x + Math.cos(angle) * radius,
                              enemy.y + Math.sin(angle) * radius,
                              '#b45309',
                              8,
                              'explosion'
                            );
                          }
                        }, ring * 90);
                      }
                  
                      // Damage + knockback nearby enemies
                      setEnemies(prevEnemies =>
                        prevEnemies
                          .map(otherEnemy => {
                            // Don't process the original enemy twice
                            if (otherEnemy.id === enemy.id) return otherEnemy;
                      
                            const dx2 = otherEnemy.x - enemy.x;
                            const dy2 = otherEnemy.y - enemy.y;
                            const dist = Math.hypot(dx2, dy2);
                      
                            if (dist > 0.01 && dist < quakeRadius) {
                              const angle = Math.atan2(dy2, dx2);
                              const knockbackDist = knockbackPower;
                      
                              let newX2 = otherEnemy.x + Math.cos(angle) * knockbackDist;
                              let newY2 = otherEnemy.y + Math.sin(angle) * knockbackDist;
                      
                              const tileX2 = Math.floor(newX2);
                              const tileY2 = Math.floor(newY2);
                      
                              // Only move if destination is walkable
                              if (
                                tileX2 >= 0 &&
                                tileX2 < DUNGEON_SIZE &&
                                tileY2 >= 0 &&
                                tileY2 < DUNGEON_SIZE &&
                                dungeon[tileY2][tileX2] === TILE_FLOOR
                              ) {
                                createParticleEffect(newX2, newY2, '#92400e', 10, 'hit');
                      
                                const quakeDamage = finalDamage * 0.5 * earthDamageMult;
                                const newHealth2 = (otherEnemy.health ?? 0) - quakeDamage;
                      
                                if (newHealth2 <= 0) {
                                  // Combo + multiplier
                                  const newCombo = comboRef.current.count + 1;
                                  const newMultiplier = 1.0 + Math.min(newCombo * 0.1, 3.0);
                                  setCombo({
                                    count: newCombo,
                                    multiplier: newMultiplier,
                                    timer: 3.0
                                  });
                      
                                  const comboBonus = comboRef.current.multiplier;
                      
                                  // XP / Gold / Kill count
                                  setPlayer(p => ({
                                    ...p,
                                    xp: p.xp + Math.floor((otherEnemy.xp ?? 0) * comboBonus),
                                    gold: p.gold + Math.floor((otherEnemy.gold ?? 0) * comboBonus),
                                    kills: p.kills + 1
                                  }));
                      
                                  // Essence gain
                                  const essenceGainUpgrade = Number(permanentUpgrades?.essenceGain ?? 0);
                                  const baseEssence = Number(otherEnemy?.essence ?? 0);
                                  const essenceBonus = 1 + essenceGainUpgrade * 0.2;
                                  const gainedEssence = Math.floor(baseEssence * essenceBonus) || 0;
                      
                                  setEssence(prev => {
                                    const safePrev = Number.isFinite(prev) ? prev : 0;
                                    return safePrev + gainedEssence;
                                  });
                      
                                  // Total kills milestones
                                  setTotalKills(prev => {
                                    const newTotal = prev + 1;
                                    if (newTotal % 100 === 0) {
                                      showNotification(`🎯 ${newTotal} Total Kills!`, 'purple');
                                    }
                                    return newTotal;
                                  });
                      
                                  // Lifesteal on quake kills
                                  const lifeStealPercent = (permanentUpgrades?.lifeSteal ?? 0) * 0.02;
                                  const healAmount = quakeDamage * lifeStealPercent;
                      
                                  if (healAmount > 0) {
                                    setPlayer(p => ({
                                      ...p,
                                      health: Math.min(p.maxHealth, p.health + healAmount)
                                    }));
                                    const pVis = playerRef.current || currentPlayer;
                                    createParticleEffect(pVis.x, pVis.y, '#00ff00', 5, 'hit');
                                  }
                      
                                  // Mark enemy as dead so we can filter it out
                                  return { ...otherEnemy, health: 0, dead: true };
                                }
                      
                                // Survives the quake: apply knockback + damage
                                return {
                                  ...otherEnemy,
                                  x: newX2,
                                  y: newY2,
                                  health: newHealth2
                                };
                              }
                            }
                      
                            // Outside radius or blocked: unchanged
                            return otherEnemy;
                          })
                          .filter(e => !e.dead)
                      );
                      
                      showNotification('🌍 SEISMIC SHOCKWAVE!', 'orange');
                    }
                    
                    // === GENERIC KILL REWARDS FOR THIS HIT ===
  
                    const newCombo = comboRef.current.count + 1;
                    const newMultiplier = 1.0 + Math.min(newCombo * 0.1, 3.0);
                    setCombo({ count: newCombo, multiplier: newMultiplier, timer: 3.0 });
                    
                    const comboBonus = comboRef.current.multiplier;
                    setPlayer(p => ({
                      ...p,
                      xp: p.xp + Math.floor((enemy.xp ?? 0) * comboBonus),
                      gold: p.gold + Math.floor((enemy.gold ?? 0) * comboBonus),
                      kills: p.kills + 1
                    }));
                    
                    const essenceGainUpgrade = Number(permanentUpgrades?.essenceGain ?? 0);
                    const baseEssence = Number(enemy?.essence ?? 0);
                    const essenceBonus = 1 + essenceGainUpgrade * 0.2;
                    const gainedEssence = Math.floor(baseEssence * essenceBonus) || 0;
                    setEssence(prev => {
                      const safePrev = Number.isFinite(prev) ? prev : 0;
                      return safePrev + gainedEssence;
                    });
                    
                    setTotalKills(prev => {
                      const newTotal = prev + 1;
                      if (newTotal % 100 === 0) {
                        showNotification(`🎯 ${newTotal} Total Kills!`, 'purple');
                      }
                      return newTotal;
                    });
                  
                    // Life steal
                    const lifeStealPercent = (permanentUpgrades?.lifeSteal ?? 0) * 0.02;
                    const healAmount = finalDamage * lifeStealPercent;
                    if (healAmount > 0) {
                      setPlayer(p => ({
                        ...p,
                        health: Math.min(p.maxHealth, p.health + healAmount)
                      }));
                      const pVis = playerRef.current || currentPlayer;
                      createParticleEffect(pVis.x, pVis.y, '#00ff00', 5, 'hit');
                    }
                    
                    // Enemy dies from the push hit
                    return { ...enemy, health: 0, dead: true };
                  }
                }
                
                // Enemy survived the hit or was out of range
                return { ...enemy, health: newHealth };
              }
              
              return enemy;
            })
            .filter(e => !e.dead)
        );
  
      } else if (spell.key === 'arcaneward') {
        // Activate shield
        setPlayerBuffs(prev => ({
          ...prev,
          arcaneWard: { active: true, hits: 0, maxHits: 3 }
        }));
        createParticleEffect(currentPlayer.x, currentPlayer.y, spell.color, 40, 'explosion');
        addScreenShake(0.2);
  
      } else if (spell.key === 'gravitychoke') {
        // Find all enemies in range and suspend them
        const suspendRadius = 4;
        const suspendedIds = new Set();
        
        setEnemies(prevEnemies =>
          prevEnemies.map(enemy => {
            const dx = enemy.x - currentPlayer.x;
            const dy = enemy.y - currentPlayer.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < suspendRadius) {
              suspendedIds.add(enemy.id);
              createParticleEffect(enemy.x, enemy.y, spell.color, 15, 'explosion');
              
              return {
                ...enemy,
                gravitySuspended: true,
                suspendTimer: 3.0,
                suspendDamageTimer: 0
              };
            }
            return enemy;
          })
        );
        setGravitySuspendedEnemies(suspendedIds);
        addScreenShake(0.4);
  
      } else {
        // ==============================
        //   NORMAL PROJECTILE SPELLS
        // ==============================
        const spawnAngle = currentPlayer.angle;
        const spawnOffset = 0.7; // about 0.7 tiles in front
  
        const spawnX = currentPlayer.x + Math.cos(spawnAngle) * spawnOffset;
        const spawnY = currentPlayer.y + Math.sin(spawnAngle) * spawnOffset;
  
        // ========== PRESTIGE CLASS ATTACK MODIFICATIONS ==========
  
        let projectileSpeed = 8;
        let projectileColor = spell.color;
        let projectileCount = 1;
        let spreadAngle = 0;
        let piercing = false;
  
        // Elementalist - enhanced spell effects
        if (currentClass === 'elementalist') {
          createParticleEffect(spawnX, spawnY, spell.color, 15, 'explosion');
  
          // Multi-element burst effect
          const colors = ['#ff4400', '#00aaff', '#ffff00', '#88ff88'];
          colors.forEach((color, i) => {
            setTimeout(() => {
              createParticleEffect(spawnX, spawnY, color, 8, 'explosion');
            }, i * 50);
          });
        }
  
        // Shadow Dancer - crit indicator (visual only here)
        if (currentClass === 'shadowdancer') {
          const critChance = PRESTIGE_CLASSES.shadowdancer.bonuses.criticalChance;
          if (Math.random() < critChance) {
            createParticleEffect(spawnX, spawnY, '#ffff00', 20, 'explosion');
            showNotification('CRITICAL!', 'yellow');
            addScreenShake(0.3);
          }
        }
  
        // Archmagus - arcane flair
        if (currentClass === 'archmagus') {
          createParticleEffect(spawnX, spawnY, '#a855f7', 12, 'explosion');
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            setTimeout(() => {
              createParticleEffect(
                spawnX + Math.cos(angle) * 0.5,
                spawnY + Math.sin(angle) * 0.5,
                '#a855f7',
                6,
                'hit'
              );
            }, i * 40);
          }
        }
  
        // Blood Mage - blood trail
        if (currentClass === 'bloodmage') {
          projectileColor = '#dc2626';
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              createParticleEffect(
                spawnX - Math.cos(spawnAngle) * i * 0.2,
                spawnY - Math.sin(spawnAngle) * i * 0.2,
                '#dc2626',
                4,
                'hit'
              );
            }, i * 30);
          }
        }
  
        // Time Warden - time ripple
        if (currentClass === 'timewarden') {
          createParticleEffect(spawnX, spawnY, '#06b6d4', 15, 'explosion');
          for (let i = 1; i <= 3; i++) {
            setTimeout(() => {
              createParticleEffect(spawnX, spawnY, '#06b6d4', 10, 'explosion');
            }, i * 100);
          }
        }
  
        // Void Caller - piercing projectiles
        if (currentClass === 'voidcaller') {
          piercing = true;
          projectileColor = '#7c3aed';
          createParticleEffect(spawnX, spawnY, '#7c3aed', 20, 'explosion');
        }
  
        // Storm Lord - lightning crackle
        if (currentClass === 'stormlord') {
          projectileColor = '#eab308';
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              const angle = Math.random() * Math.PI * 2;
              const dist = 0.3 + Math.random() * 0.4;
              createParticleEffect(
                spawnX + Math.cos(angle) * dist,
                spawnY + Math.sin(angle) * dist,
                '#eab308',
                6,
                'explosion'
              );
            }, i * 50);
          }
        }
  
        // Runekeeper - runic enhancement
        if (currentClass === 'runekeeper') {
          createParticleEffect(spawnX, spawnY, '#f97316', 18, 'explosion');
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 0.6;
            createParticleEffect(
              spawnX + Math.cos(angle) * dist,
              spawnY + Math.sin(angle) * dist,
              '#f97316',
              5,
              'hit'
            );
          }
        }
  
        // Earthshaper - little ground pop on cast (full shockwave is in hit logic)
        if (currentClass === 'earthshaper') {
          addScreenShake(0.5);
          createParticleEffect(spawnX, spawnY, '#92400e', 25, 'explosion');
        }
  
        // ========== CREATE PROJECTILE(S) ==========
  
        if (projectileCount === 1) {
          setProjectiles(projs => [
            ...projs,
            {
              id: Math.random(),
              x: spawnX,
              y: spawnY,
              angle: spawnAngle,
              speed: projectileSpeed,
              damage: finalDamage,
              color: projectileColor,
              lifetime: 3,
              dead: false,
              spellType: spell.key,
              piercing,
              prestigeClass: currentClass
            }
          ]);
        } else {
          const newProjs = [];
          for (let i = 0; i < projectileCount; i++) {
            const offset = spreadAngle * (i - (projectileCount - 1) / 2);
            newProjs.push({
              id: Math.random(),
              x: spawnX,
              y: spawnY,
              angle: spawnAngle + offset,
              speed: projectileSpeed,
              damage: finalDamage,
              color: projectileColor,
              lifetime: 3,
              dead: false,
              spellType: spell.key,
              piercing,
              prestigeClass: currentClass
            });
          }
          setProjectiles(projs => [...projs, ...newProjs]);
        }
      }
  
      // ==============================
      //   APPLY COOLDOWN FOR SPELL
      // ==============================
      return prev.map((s, i) =>
        i === idx ? { ...s, cooldown: s.maxCooldown } : s
      );
    });
  }, [permanentUpgrades, playerBuffs, currentClass, dungeon]);

    function carveCorridorToNearestFloor(map, startX, startY) {
      const size = map.length;
      let best = null;
      let bestDist = Infinity;

      // Find nearest existing floor tile outside the secret room block
      for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
              if (map[y][x] === TILE_FLOOR) {
                  const d = Math.hypot(x - startX, y - startY);
                  if (d < bestDist) {
                      bestDist = d;
                      best = { x, y };
                  }
              }
          }
      }

      if (!best) return;

      // Dig corridor step-by-step toward best floor location
      let cx = startX;
      let cy = startY;

      let safety = 2000;
      while ((cx !== best.x || cy !== best.y) && safety-- > 0) {
          if (cx < best.x) cx++;
          else if (cx > best.x) cx--;
          if (cy < best.y) cy++;
          else if (cy > best.y) cy--;

          if (cx > 0 && cy > 0 && cx < size - 1 && cy < size - 1) {
              map[cy][cx] = TILE_FLOOR;
          }
      }
    }
  
    function addSecretRoomsToDungeon(map, level) {
        const size = map.length;
        const chests = [];

        // 30% chance for a secret room to spawn at all
        if (Math.random() > 0.45) {
        return { mapWithSecrets: map, chests: [] };
        }

        // If we do spawn secrets, 1-2 rooms max (rarely 2)
        const numRooms = Math.random() > 0.7 ? 2 : 1;

        for (let n = 0; n < numRooms; n++) {
        let roomX = null;
        let roomY = null;
        let attempts = 0;

        // Find a solid wall area far from spawn that's adjacent to a corridor
        while (attempts < 300 && roomX === null) {
            const x = Math.floor(Math.random() * (size - 10)) + 5;
            const y = Math.floor(Math.random() * (size - 10)) + 5;

            // Skip if too close to spawn
            if (Math.hypot(x - 5, y - 5) < 10) {
            attempts++;
            continue;
            }

            // Check if there's a 5x5 solid area (good place to carve a room)
            let isSolid = true;
            for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
                const tx = x + ox;
                const ty = y + oy;
                if (tx < 1 || ty < 1 || tx >= size - 1 || ty >= size - 1) {
                isSolid = false;
                break;
                }
                if (map[ty][tx] === TILE_FLOOR) {
                isSolid = false;
                break;
                }
            }
            if (!isSolid) break;
            }

            if (!isSolid) {
            attempts++;
            continue;
            }

            // Check if there's a corridor nearby (within 1-2 tiles)
            const directions = [
            { dx: 0, dy: -3 }, // north
            { dx: 3, dy: 0 },  // east
            { dx: 0, dy: 3 },  // south
            { dx: -3, dy: 0 }  // west
            ];

            let hasNearbyCorridor = false;
            for (const dir of directions) {
            const checkX = x + dir.dx;
            const checkY = y + dir.dy;
            if (checkX > 0 && checkY > 0 && checkX < size - 1 && checkY < size - 1) {
                if (map[checkY][checkX] === TILE_FLOOR) {
                hasNearbyCorridor = true;
                break;
                }
            }
            }

            if (hasNearbyCorridor) {
            roomX = x;
            roomY = y;
            }

            attempts++;
        }

        if (roomX === null) continue;

        // 1) Carve 3x3 room interior
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
            const tx = roomX + ox;
            const ty = roomY + oy;
            if (tx > 0 && ty > 0 && tx < size - 1 && ty < size - 1) {
                map[ty][tx] = TILE_FLOOR;
            }
            }
        }

        // 2) Ensure walls surround the room (5x5 perimeter)
        for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
            const tx = roomX + ox;
            const ty = roomY + oy;
            if (tx <= 0 || ty <= 0 || tx >= size - 1 || ty >= size - 1) continue;

            const onPerimeter = (Math.abs(ox) === 2 || Math.abs(oy) === 2);
            const isCorner = (Math.abs(ox) === 2 && Math.abs(oy) === 2);
            
            // Only place walls on perimeter, not corners, and only if not already floor
            if (onPerimeter && !isCorner && map[ty][tx] !== TILE_FLOOR) {
                map[ty][tx] = TILE_WALL;
            }
            }
        }

        // 3) Find which direction leads to a corridor and place secret door
        const doorDirections = [
            { dx: 0, dy: -1, doorX: roomX, doorY: roomY - 2, name: 'north' },
            { dx: 1, dy: 0, doorX: roomX + 2, doorY: roomY, name: 'east' },
            { dx: 0, dy: 1, doorX: roomX, doorY: roomY + 2, name: 'south' },
            { dx: -1, dy: 0, doorX: roomX - 2, doorY: roomY, name: 'west' }
        ];

        let doorPlaced = false;
        for (const dir of doorDirections) {
            // Look 1-2 tiles beyond the door position for a corridor
            const checkX1 = dir.doorX + dir.dx;
            const checkY1 = dir.doorY + dir.dy;
            const checkX2 = dir.doorX + dir.dx * 2;
            const checkY2 = dir.doorY + dir.dy * 2;
            
            let foundCorridor = false;
            if (checkX1 > 0 && checkY1 > 0 && checkX1 < size - 1 && checkY1 < size - 1) {
            if (map[checkY1][checkX1] === TILE_FLOOR) {
                foundCorridor = true;
            }
            }
            if (!foundCorridor && checkX2 > 0 && checkY2 > 0 && checkX2 < size - 1 && checkY2 < size - 1) {
            if (map[checkY2][checkX2] === TILE_FLOOR) {
                foundCorridor = true;
            }
            }
            
            if (foundCorridor) {
            // Place secret door on the wall
            map[dir.doorY][dir.doorX] = TILE_SECRET_DOOR;
            doorPlaced = true;
            break;
            }
        }

        if (!doorPlaced) {
            // Fallback: just pick the first valid wall position
            for (const dir of doorDirections) {
            if (dir.doorX > 0 && dir.doorY > 0 && dir.doorX < size - 1 && dir.doorY < size - 1) {
                if (map[dir.doorY][dir.doorX] === TILE_WALL || map[dir.doorY][dir.doorX] > 0) {
                map[dir.doorY][dir.doorX] = TILE_SECRET_DOOR;
                break;
                }
            }
            }
        }

        // 3B) Guarantee a corridor into the secret room
        // Pick the tile just inside the door and extend a path outward
        for (const dir of doorDirections) {
          const doorTile = map[dir.doorY]?.[dir.doorX];
          if (doorTile === TILE_SECRET_DOOR || doorTile === TILE_FLOOR) {
            carveCorridorToNearestFloor(map, roomX, roomY);
            break;
          }
        }

        // 4) Chest in center of room
        chests.push({
            id: `secret-${n}-${Date.now()}`,
            x: roomX + 0.5,
            y: roomY + 0.5,
            opened: false,
            inSecretRoom: true
        });
        }

        return { mapWithSecrets: map, chests };
    }

    const upgradeRandomPermanentStat = useCallback(() => {
        const keys = [
        'maxHealthBonus',
        'maxManaBonus',
        'damageBonus',
        'speedBonus',
        'manaRegenBonus',
        'goldMultiplier',
        'criticalChance',
        'lifeSteal',
        'essenceGain'
        ];

        const chosenKey = keys[Math.floor(Math.random() * keys.length)];

        const prettyNameMap = {
        maxHealthBonus: 'Max Health',
        maxManaBonus: 'Max Mana',
        damageBonus: 'Damage',
        speedBonus: 'Speed',
        manaRegenBonus: 'Mana Regen',
        goldMultiplier: 'Gold Gain',
        criticalChance: 'Critical Chance',
        lifeSteal: 'Life Steal',
        essenceGain: 'Essence Gain'
        };

        const label = prettyNameMap[chosenKey] || chosenKey;

        setPermanentUpgrades(prev => {
        const newLevel = (prev[chosenKey] || 0) + 1;
        
        // Check if any stat reaches 50 and offer prestige
        if (newLevel >= 50) {
            const allClasses = Object.keys(PRESTIGE_CLASSES);
            const availableClasses = allClasses.filter(c => c !== currentClass);
            const shuffled = [...availableClasses].sort(() => Math.random() - 0.5);
            const choices = shuffled.slice(0, 3);
            
            setPrestigeClassChoices(choices);
            setShowPrestigeOffer(true);
        }
        
        const next = {
            ...prev,
            [chosenKey]: newLevel
        };
        localStorage.setItem('wizardUpgrades', JSON.stringify(next));

        setTimeout(() => {
            showNotification(`⭐ Permanent Upgrade: +1 ${label}!`, 'purple');
        }, 200);

        return next;
        });
    }, [showNotification, currentClass]);

    const acceptPrestige = (classId) => {
        const classData = PRESTIGE_CLASSES[classId];
        
        // Reset all permanent upgrades
        const resetUpgrades = {
        maxHealthBonus: 0,
        maxManaBonus: 0,
        damageBonus: 0,
        speedBonus: 0,
        manaRegenBonus: 0,
        goldMultiplier: 0,
        criticalChance: 0,
        lifeSteal: 0,
        essenceGain: 0
        };
        
        setPermanentUpgrades(resetUpgrades);
        localStorage.setItem('wizardUpgrades', JSON.stringify(resetUpgrades));
        
        // Set new class and prestige level
        setCurrentClass(classId);
        setPrestigeLevel(prev => prev + 1);
        
        // Award bonus essence
        const bonusEssence = 500 * (prestigeLevel + 1);
        setEssence(prev => prev + bonusEssence);
        
        setShowPrestigeOffer(false);
        
        showNotification(`🎖️ Prestige ${prestigeLevel + 1}: ${classData.name}!`, 'purple');
        setTimeout(() => {
        showNotification(`Bonus: +${bonusEssence} Essence!`, 'yellow');
        }, 1000);
    };

    const declinePrestige = () => {
        setShowPrestigeOffer(false);
        showNotification('Prestige offer declined - you can try again later', 'blue');
    };

    const getDifficultyMultiplier = () => {
        return 1 + (prestigeLevel * 0.3); // 30% harder per prestige
    };

    const applyClassBonuses = (baseDamage, baseSpeed, baseHealth) => {
        let damage = baseDamage;
        let speed = baseSpeed;
        let health = baseHealth;
        
        if (currentClass) {
        const classData = PRESTIGE_CLASSES[currentClass];
        const bonuses = classData.bonuses;
        
        if (bonuses.damageMultiplier) damage *= bonuses.damageMultiplier;
        if (bonuses.speedMultiplier) speed *= bonuses.speedMultiplier;
        if (bonuses.maxHealthBonus) health += bonuses.maxHealthBonus;
        }
        
        return { damage, speed, health };
    };
        
    const unlockRandomSecretSpell = useCallback(() => {
        setEquippedSpells(prev => {
        const ownedKeys = new Set(prev.map(s => s.key));
        const candidates = SECRET_SPELL_KEYS.filter(key => !ownedKeys.has(key));

        if (candidates.length === 0) {
            setTimeout(() => {
            showNotification('✨ All spells mastered! Granting upgrade...', 'purple');
            }, 200);
            upgradeRandomPermanentStat();
            return prev;
        }

        const key = candidates[Math.floor(Math.random() * candidates.length)];
        const spell = ALL_SPELLS[key];

        setTimeout(() => {
            showNotification(`🔮 Secret Spell Unlocked: ${spell.name}!`, 'purple');
        }, 200);

        if (prev.some(s => s.key === key)) return prev;
        return [...prev, { ...spell }];
        });
    }, [showNotification, upgradeRandomPermanentStat]);

    // NOW define grantSecretChestReward AFTER the above two
    const grantSecretChestReward = useCallback(() => {
        const roll = Math.random();
        setTimeout(() => {
        if (roll < 0.5) {
            upgradeRandomPermanentStat();
        } else {
            unlockRandomSecretSpell();
        }
        }, 100);
    }, [upgradeRandomPermanentStat, unlockRandomSecretSpell]);

    const revealNearbySecretDoors = (px, py, dungeonMap) => {
        const size = dungeonMap.length;
        const radius = 1;
        let changed = false;

        for (let y = py - radius; y <= py + radius; y++) {
        for (let x = px - radius; x <= px + radius; x++) {
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            if (dungeonMap[y][x] === TILE_SECRET_DOOR) {
            dungeonMap[y][x] = TILE_FLOOR;
            changed = true;
            }
        }
        }

        return changed;
    };

    // Generate dungeon
    const generateDungeon = useCallback((level) => {
        const size = DUNGEON_SIZE;
        const map = [];

        // Pick and store theme for this level
        const theme = getCurrentTheme(level);
        setCurrentTheme(theme);

        // 1) Start with solid walls (more controllable than noise)
        for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) {
            if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
            row.push(TILE_WALL);
            } else {
            row.push(TILE_WALL); // everything is wall, we carve rooms/corridors
            }
        }
        map.push(row);
        }

        // 2) Rooms list
        const rooms = [];

        // 2a) Guaranteed start room around (5,5)
        const startRoomSize = 8; // 8x8 start room
        const half = Math.floor(startRoomSize / 2);

        const startX = Math.max(1, 5 - half);
        const startY = Math.max(1, 5 - half);
        const endX = Math.min(size - 2, startX + startRoomSize - 1);
        const endY = Math.min(size - 2, startY + startRoomSize - 1);

        for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            map[y][x] = TILE_FLOOR;
        }
        }

        rooms.push({
        x: startX,
        y: startY,
        w: endX - startX + 1,
        h: endY - startY + 1,
        centerX: 5,   // we know spawn is here
        centerY: 5
        });

        // 2b) Carve additional random rooms and remember their centers
        const numRooms = 5 + level * 2;

        for (let i = 0; i < numRooms; i++) {
        const roomW = Math.floor(Math.random() * 5) + 4; // a bit larger
        const roomH = Math.floor(Math.random() * 5) + 4;
        const roomX = Math.floor(Math.random() * (size - roomW - 2)) + 1;
        const roomY = Math.floor(Math.random() * (size - roomH - 2)) + 1;

        for (let y = roomY; y < roomY + roomH; y++) {
            for (let x = roomX; x < roomX + roomW; x++) {
            if (x > 0 && x < size - 1 && y > 0 && y < size - 1) {
                map[y][x] = TILE_FLOOR;
            }
            }
        }

        rooms.push({
            x: roomX,
            y: roomY,
            w: roomW,
            h: roomH,
            centerX: Math.floor(roomX + roomW / 2),
            centerY: Math.floor(roomY + roomH / 2)
        });
        }

        // 3) Connect rooms with corridors so layout feels intentional
        for (let i = 1; i < rooms.length; i++) {
        const prev = rooms[i - 1];
        const curr = rooms[i];

        let x1 = prev.centerX;
        let y1 = prev.centerY;
        const x2 = curr.centerX;
        const y2 = curr.centerY;

        if (Math.random() < 0.5) {
            // horizontal then vertical
            while (x1 !== x2) {
            map[y1][x1] = TILE_FLOOR;
            x1 += x2 > x1 ? 1 : -1;
            }
            while (y1 !== y2) {
            map[y1][x1] = TILE_FLOOR;
            y1 += y2 > y1 ? 1 : -1;
            }
        } else {
            // vertical then horizontal
            while (y1 !== y2) {
            map[y1][x1] = TILE_FLOOR;
            y1 += y2 > y1 ? 1 : -1;
            }
            while (x1 !== x2) {
            map[y1][x1] = TILE_FLOOR;
            x1 += x2 > x1 ? 1 : -1;
            }
        }
        }

        // ❌ 4) REMOVE your old "clear spawn area around (5,5)" block entirely

        // 5) Decorate walls with themed variants (2–7) near floors
        for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (map[y][x] === TILE_WALL) {
            const nearFloor =
                map[y - 1][x] === TILE_FLOOR ||
                map[y + 1][x] === TILE_FLOOR ||
                map[y][x - 1] === TILE_FLOOR ||
                map[y][x + 1] === TILE_FLOOR;

            if (nearFloor && Math.random() < 0.2) {
                const r = Math.random();
                let tile = 1;
                if (r < 0.3) tile = 2;
                else if (r < 0.5) tile = 3;
                else if (r < 0.7) tile = 4;
                else if (r < 0.85) tile = 5;
                else if (r < 0.95) tile = 6;
                else tile = 7;
                map[y][x] = tile;
            }
            }
        }
        }

        // 6) Secret rooms + chests (uses existing helper)
        const { mapWithSecrets, chests: newChests } = addSecretRoomsToDungeon(map, level);

        // Rough "power level" based on all permanent upgrades
        const totalUpgradeLevels =
        permanentUpgrades.maxHealthBonus +
        permanentUpgrades.maxManaBonus +
        permanentUpgrades.damageBonus +
        permanentUpgrades.speedBonus +
        permanentUpgrades.manaRegenBonus +
        permanentUpgrades.goldMultiplier +
        permanentUpgrades.criticalChance +
        permanentUpgrades.lifeSteal +
        permanentUpgrades.essenceGain;

        // Each upgrade = +8% boss HP
        const bossPlayerScale = 1 + totalUpgradeLevels * 0.08;
        
        // 7) Generate enemies (same logic as before, but using mapWithSecrets)
        const newEnemies = [];
        const isBossLevel = level % 5 === 0;

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
        } while (
            mapWithSecrets[Math.floor(y)][Math.floor(x)] !== TILE_FLOOR ||
            Math.hypot(x - 5, y - 5) < 10
        );

        newEnemies.push({
            id: Math.random(),
            x,
            y,
            type: bossType,
            // Boss HP scales harder with level AND your permanent upgrades
            health: stats.health * (1 + level * 0.35) * bossPlayerScale * getDifficultyMultiplier(),
            maxHealth: stats.health * (1 + level * 0.35) * bossPlayerScale * getDifficultyMultiplier(),
            damage: stats.damage * (1 + level * 0.1),
            speed: stats.speed,
            xp: stats.xp * level,
            gold: stats.gold * level,
            essence: stats.essence * (1 + Math.floor(level / 5)),
            color: stats.color,
            angle: Math.random() * Math.PI * 2,
            state: 'idle',
            attackCooldown: 0,
            isBoss: true,
            hasSummonedMinions: false
        });

        // minions
        const minionCount = 5 + level;
        const enemyTypesList = ['skeleton', 'demon', 'ghost', 'golem', 'archer'];

        for (let i = 0; i < minionCount; i++) {
            let mx, my;
            do {
            mx = Math.random() * (size - 4) + 2;
            my = Math.random() * (size - 4) + 2;
            } while (
            mapWithSecrets[Math.floor(my)][Math.floor(mx)] !== TILE_FLOOR ||
            Math.hypot(mx - 5, my - 5) < 5
            );

            const type = enemyTypesList[Math.floor(Math.random() * enemyTypesList.length)];
            const mstats = ENEMY_TYPES[type];

            newEnemies.push({
            id: Math.random(),
            x: mx,
            y: my,
            type,
            health: mstats.health * (1 + level * 0.2) * getDifficultyMultiplier(),
            maxHealth: mstats.health * (1 + level * 0.2) * getDifficultyMultiplier(),
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
            } while (
            mapWithSecrets[Math.floor(y)][Math.floor(x)] !== TILE_FLOOR ||
            Math.hypot(x - 5, y - 5) < 5
            );

            const type = enemyTypesList[Math.floor(Math.random() * enemyTypesList.length)];
            const stats = ENEMY_TYPES[type];

            newEnemies.push({
            id: Math.random(),
            x,
            y,
            type,
            health: stats.health * (1 + level * 0.2) * getDifficultyMultiplier(),
            maxHealth: stats.health * (1 + level * 0.2) * getDifficultyMultiplier(),
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

        // 8) Generate items (unchanged, but using mapWithSecrets)
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
        } while (mapWithSecrets[Math.floor(y)][Math.floor(x)] !== TILE_FLOOR);

        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        newItems.push({
            id: Math.random(),
            x,
            y,
            ...itemType,
            collected: false
        });
        }

        // 9) Commit dungeon state
        setDungeon(mapWithSecrets);
        setEnemies(newEnemies);
        setItems(newItems);
        setChests(newChests);

        return mapWithSecrets;
    }, [permanentUpgrades]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, currentLevel]);

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

    // N64-style distinct monster sprites with professional polish
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
        case 'archer':
            return drawArcherSprite(ctx, sprite, x, y, w, h, brightness, time);
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

    const drawSkeletonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = '#e2dfd7'; // warmer bone tone
        const { band1, band2, band3 } = getBands(baseColor, brightness, -0.05);

        // Animation personality
        const phase = time * 1.3 + sprite.id * 0.67;
        const jitter = Math.sin(phase * 4) * (h * 0.01); // undead trembling
        const bob = Math.sin(phase) * (h * 0.015);

        const cx = x + w / 2;
        const cy = y + h / 2 + bob + jitter;

        const bodyHeight = h * 0.9;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;

        // Ground shadow
        drawFeetShadow(ctx, cx, w * 0.4, bodyBottom, h, brightness);

        // --------------------------------------------
        // ✦ SKULL (smooth rounded shape + shading)
        // --------------------------------------------
        const skullW = w * 0.45;
        const skullH = h * 0.22;
        const skullX = cx - skullW / 2;
        const skullY = bodyTop;

        // Skull main form (rounded)
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.ellipse(cx, skullY + skullH * 0.45, skullW * 0.5, skullH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lower jaw
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(cx, skullY + skullH * 0.9, skullW * 0.36, skullH * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye sockets (deep, circular cavities)
        const eyeR = skullW * 0.14;
        const eyeY = skullY + skullH * 0.45;
        const eyeOff = skullW * 0.22;

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.arc(cx - eyeOff, eyeY, eyeR, 0, Math.PI * 2);
        ctx.arc(cx + eyeOff, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // Red glow pupils (tiny, eerie)
        const pupilR = skullW * 0.06;
        const glowStrength = 0.35 + Math.sin(time * 3) * 0.25;

        ctx.fillStyle = `rgba(255,70,70,${glowStrength})`;
        ctx.beginPath();
        ctx.arc(cx - eyeOff, eyeY, pupilR, 0, Math.PI * 2);
        ctx.arc(cx + eyeOff, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // Nose cavity (triangle)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx, skullY + skullH * 0.55);
        ctx.lineTo(cx - skullW * 0.07, skullY + skullH * 0.72);
        ctx.lineTo(cx + skullW * 0.07, skullY + skullH * 0.72);
        ctx.closePath();
        ctx.fill();


        // --------------------------------------------
        // ✦ RIBCAGE (full rounded form, not rectangles)
        // --------------------------------------------
        const ribW = w * 0.48;
        const ribH = h * 0.32;
        const ribX = cx - ribW / 2;
        const ribY = skullY + skullH * 1.1;

        // Ribcage oval body
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(cx, ribY + ribH * 0.55, ribW * 0.5, ribH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rib arcs (curved horizontal ribs)
        ctx.strokeStyle = rgbToCss(band1);
        ctx.lineWidth = 2;
        const ribCount = 5;

        for (let i = 0; i < ribCount; i++) {
        const t = (i + 1) / (ribCount + 1);
        const yy = ribY + ribH * t;

        ctx.beginPath();
        ctx.ellipse(cx, yy, ribW * (0.5 - t * 0.1), ribH * 0.12, 0, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        }


        // --------------------------------------------
        // ✦ SPINE (smooth vertical segments)
        // --------------------------------------------
        const spineTop = ribY + ribH * 0.2;
        const spineBottom = bodyBottom - h * 0.28;

        const spineSegH = (spineBottom - spineTop) / 7;
        const spineR = w * 0.05;

        ctx.fillStyle = rgbToCss(band3);
        for (let i = 0; i < 7; i++) {
        const sy = spineTop + spineSegH * i;
        ctx.beginPath();
        ctx.ellipse(cx, sy, spineR, spineSegH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        }


        // --------------------------------------------
        // ✦ PELVIS (anatomical shape)
        // --------------------------------------------
        const pelW = w * 0.42;
        const pelH = h * 0.18;
        const pelY = spineBottom;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(cx, pelY + pelH * 0.4, pelW * 0.5, pelH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pelvis holes
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(cx - pelW * 0.22, pelY + pelH * 0.42, pelW * 0.15, 0, Math.PI * 2);
        ctx.arc(cx + pelW * 0.22, pelY + pelH * 0.42, pelW * 0.15, 0, Math.PI * 2);
        ctx.fill();


        // --------------------------------------------
        // ✦ LEGS (joints + bone segments)
        // --------------------------------------------
        const legH = h * 0.26;
        const upperH = legH * 0.55;
        const lowerH = legH * 0.45;
        const legOff = w * 0.18;

        const drawLeg = (side) => {
        const lx = cx + legOff * side;

        // Upper leg
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - w * 0.04,
            pelY + pelH * 0.6,
            w * 0.08,
            upperH,
            w * 0.03
        );
        ctx.fill();

        // Knee
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.arc(lx, pelY + pelH * 0.6 + upperH, w * 0.045, 0, Math.PI * 2);
        ctx.fill();

        // Lower leg
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            lx - w * 0.035,
            pelY + pelH * 0.6 + upperH + w * 0.045,
            w * 0.07,
            lowerH,
            w * 0.03
        );
        ctx.fill();
        };

        drawLeg(-1);
        drawLeg(1);


        // --------------------------------------------
        // ✦ ARMS (NEW — wasn’t in old version at all)
        // --------------------------------------------
        const armH = h * 0.28;
        const upperAH = armH * 0.55;
        const lowerAH = armH * 0.45;
        const armOff = w * 0.32;

        const drawArm = (side) => {
        const ax = cx + armOff * side;
        const ay = ribY + ribH * 0.3;

        // Upper arm
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.03,
            ay,
            w * 0.06,
            upperAH,
            w * 0.025
        );
        ctx.fill();

        // Elbow
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.arc(ax, ay + upperAH, w * 0.035, 0, Math.PI * 2);
        ctx.fill();

        // Lower arm
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.028,
            ay + upperAH + w * 0.03,
            w * 0.056,
            lowerAH,
            w * 0.025
        );
        ctx.fill();
        };

        drawArm(-1);
        drawArm(1);

        ctx.restore();
    };

    const drawDemonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#b1342e';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0);

        // Animation: breathing + subtle sway
        const phase = time * 1.1 + sprite.id * 0.8;
        const breathe = Math.sin(phase * 0.7) * (h * 0.015);
        const sway = Math.sin(phase * 0.4) * (w * 0.02);
        const attackOpen = sprite.state === 'attacking' ? 1 : 0;

        const cx = x + w / 2 + sway;
        const cy = y + h / 2 + breathe;

        const bodyHeight = h * 0.95;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, w * 0.6, bodyBottom, h, brightness);

        // --------------------------------------------
        // ✦ LEGS (digitigrade, chunky)
        // --------------------------------------------
        const legH = h * 0.3;
        const thighH = legH * 0.55;
        const shinH = legH * 0.45;
        const legOff = w * 0.22;
        const legsTop = bodyBottom - legH * 1.1;

        const drawLeg = (side) => {
        const lx = cx + legOff * side;

        // Thigh
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - w * 0.05,
            legsTop,
            w * 0.1,
            thighH,
            w * 0.035
        );
        ctx.fill();

        // Knee
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.arc(lx, legsTop + thighH, w * 0.045, 0, Math.PI * 2);
        ctx.fill();

        // Shin
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            lx - w * 0.045,
            legsTop + thighH + w * 0.02,
            w * 0.09,
            shinH,
            w * 0.035
        );
        ctx.fill();

        // Clawed foot
        const footY = legsTop + thighH + shinH + w * 0.02;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(lx, footY, w * 0.07, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();

        // Toe claws
        ctx.fillStyle = '#f6e3c8';
        const clawSpread = w * 0.04;
        [ -clawSpread, 0, clawSpread ].forEach(offset => {
            ctx.beginPath();
            ctx.moveTo(lx + offset - w * 0.014, footY);
            ctx.lineTo(lx + offset, footY + h * 0.035);
            ctx.lineTo(lx + offset + w * 0.014, footY);
            ctx.closePath();
            ctx.fill();
        });
        };

        drawLeg(-1);
        drawLeg(1);

        // --------------------------------------------
        // ✦ TORSO (triangular, muscular)
        // --------------------------------------------
        const torsoH = bodyHeight * 0.55;
        const torsoTop = bodyTop + bodyHeight * 0.2;
        const torsoBottom = torsoTop + torsoH;
        const torsoW = w * 0.6;
        const torsoLeft = cx - torsoW / 2;
        const torsoRight = cx + torsoW / 2;

        // Torso base
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.moveTo(torsoLeft, torsoBottom);
        ctx.lineTo(torsoLeft + torsoW * 0.1, torsoTop);
        ctx.lineTo(torsoRight - torsoW * 0.1, torsoTop);
        ctx.lineTo(torsoRight, torsoBottom);
        ctx.closePath();
        ctx.fill();

        // Chest plates
        ctx.fillStyle = rgbToCss(band1);
        const chestH = torsoH * 0.3;
        const chestY = torsoTop + torsoH * 0.12;
        const chestW = torsoW * 0.32;

        [ -1, 1 ].forEach(side => {
        const ccx = cx + side * torsoW * 0.16;
        ctx.beginPath();
        ctx.roundRect(
            ccx - chestW / 2,
            chestY,
            chestW,
            chestH,
            w * 0.03
        );
        ctx.fill();
        });

        // Abs
        ctx.fillStyle = rgbToCss(band3);
        const absW = torsoW * 0.34;
        const absX = cx - absW / 2;
        const absTop = chestY + chestH * 1.1;
        const absSegH = torsoH * 0.12;

        for (let i = 0; i < 3; i++) {
        const ay = absTop + absSegH * i;
        ctx.beginPath();
        ctx.roundRect(
            absX,
            ay,
            absW,
            absSegH * 0.9,
            w * 0.02
        );
        ctx.fill();
        }

        // Scar
        ctx.strokeStyle = 'rgba(20,0,0,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - torsoW * 0.18, torsoTop + torsoH * 0.22);
        ctx.lineTo(cx - torsoW * 0.02, torsoTop + torsoH * 0.32);
        ctx.lineTo(cx + torsoW * 0.18, torsoTop + torsoH * 0.28);
        ctx.stroke();

        // --------------------------------------------
        // ✦ ARMS (brawler build)
        // --------------------------------------------
        const armH = bodyHeight * 0.4;
        const upperAH = armH * 0.55;
        const lowerAH = armH * 0.45;
        const armOff = torsoW * 0.55;
        const shoulderY = torsoTop + torsoH * 0.15;

        const drawArm = (side) => {
        const ax = cx + armOff * side;
        const punchPhase = sprite.state === 'attacking'
            ? Math.sin(time * 18 + side * Math.PI) * 0.4
            : 0;

        // Shoulder
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.arc(ax, shoulderY, w * 0.055, 0, Math.PI * 2);
        ctx.fill();

        // Upper arm
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.04,
            shoulderY + h * 0.01,
            w * 0.08,
            upperAH,
            w * 0.035
        );
        ctx.fill();

        // Elbow
        const elbowY = shoulderY + h * 0.01 + upperAH;
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.arc(ax, elbowY, w * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Forearm + fist (slightly forward if attacking)
        const forearmTilt = punchPhase * h * 0.08;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.035 + forearmTilt * side * 0.4,
            elbowY + w * 0.02,
            w * 0.07,
            lowerAH,
            w * 0.03
        );
        ctx.fill();

        // Fist
        const fistY = elbowY + w * 0.02 + lowerAH + h * 0.01;
        const fistX = ax + forearmTilt * side * 0.5;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(fistX, fistY, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        };

        drawArm(-1);
        drawArm(1);

        // --------------------------------------------
        // ✦ WINGS (behind body)
        // --------------------------------------------
        const wingSpan = w * 1.6;
        const wingH = h * 0.45;
        const wingY = torsoTop + torsoH * 0.25;
        const flap = Math.sin(phase * 1.2) * (h * 0.02);

        const drawWing = (side) => {
        const rootX = cx + side * torsoW * 0.25;

        ctx.fillStyle = `rgba(30,0,0,${0.55 * brightness})`;
        ctx.beginPath();
        ctx.moveTo(rootX, wingY);

        const tipX = rootX + side * wingSpan * 0.5;
        const tipY = wingY - wingH * 0.4 + flap * side;

        ctx.quadraticCurveTo(
            (rootX + tipX) / 2,
            wingY - wingH * 0.8,
            tipX,
            tipY
        );
        ctx.lineTo(
            tipX - side * wingSpan * 0.08,
            tipY + wingH * 0.8
        );
        ctx.quadraticCurveTo(
            (rootX + tipX) / 2,
            wingY + wingH * 0.5,
            rootX,
            wingY
        );
        ctx.closePath();
        ctx.fill();
        };

        drawWing(-1);
        drawWing(1);

        // --------------------------------------------
        // ✦ HEAD (horned, expressive)
        // --------------------------------------------
        const headH = bodyHeight * 0.22;
        const headW = w * 0.5;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        // Head shape
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        headLeft,
        headTop,
        headW,
        headH,
        w * 0.04
        );
        ctx.fill();

        // Horns
        ctx.fillStyle = rgbToCss(band3);
        const hornH = headH * 0.9;
        const hornW = headW * 0.26;

        [ -1, 1 ].forEach(side => {
        const baseX = cx + side * headW * 0.32;
        const baseY = headTop + headH * 0.25;

        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(
            baseX + side * hornW * 0.6,
            baseY - hornH * 0.4,
            baseX + side * hornW * 0.4,
            baseY - hornH
        );
        ctx.lineTo(baseX + side * hornW * 0.05, baseY - hornH * 0.7);
        ctx.quadraticCurveTo(
            baseX + side * hornW * 0.45,
            baseY - hornH * 0.35,
            baseX,
            baseY
        );
        ctx.closePath();
        ctx.fill();

        // Rings
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const ry = baseY - hornH * t;
            ctx.beginPath();
            ctx.moveTo(baseX + side * hornW * 0.05, ry);
            ctx.lineTo(baseX + side * hornW * 0.3, ry - hornH * 0.05);
            ctx.stroke();
        }
        });

        // Eyes
        const eyeW = headW * 0.18;
        const eyeH = headH * 0.24;
        const eyeY = headTop + headH * 0.45;
        const eyeOff = headW * 0.22;

        // Sockets
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW * 0.6,
            eyeY - eyeH * 0.35,
            eyeW * 1.2,
            eyeH * 1.4,
            w * 0.02
        );
        ctx.fill();
        });

        // Glowing eyes
        const eyeGlow = 0.5 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = '#fff6b0';
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY - eyeH * 0.1,
            eyeW,
            eyeH,
            w * 0.015
        );
        ctx.fill();

        const irisW = eyeW * 0.4;
        const irisH = eyeH * 0.7;
        ctx.fillStyle = '#ff7c2a';
        ctx.fillRect(
            ex - irisW / 2,
            eyeY - irisH * 0.1,
            irisW,
            irisH
        );

        // Vertical slit
        ctx.fillStyle = '#000';
        ctx.fillRect(
            ex - w * 0.007,
            eyeY - irisH * 0.1,
            w * 0.014,
            irisH
        );

        // Radial glow
        const grad = ctx.createRadialGradient(
            ex, eyeY, 0, ex, eyeY, eyeW * 1.2
        );
        grad.addColorStop(0, `rgba(255,246,176,${eyeGlow * brightness})`);
        grad.addColorStop(1, 'rgba(255,246,176,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeW * 1.2, 0, Math.PI * 2);
        ctx.fill();
        });

        // Mouth
        const mouthW = headW * 0.56;
        const mouthTop = headTop + headH * 0.72;
        const mouthH = headH * (0.16 + 0.15 * attackOpen);
        ctx.fillStyle = '#3a0505';
        ctx.beginPath();
        ctx.roundRect(
        cx - mouthW / 2,
        mouthTop,
        mouthW,
        mouthH,
        w * 0.015
        );
        ctx.fill();

        // Fangs (bigger in attack)
        const fangH = mouthH * (0.65 + 0.3 * attackOpen);
        ctx.fillStyle = '#f3e9d4';
        const fangPositions = [ -0.3, -0.1, 0.1, 0.3 ];
        fangPositions.forEach(p => {
        const fx = cx + mouthW * p;
        ctx.beginPath();
        ctx.moveTo(fx - w * 0.014, mouthTop);
        ctx.lineTo(fx, mouthTop + fangH);
        ctx.lineTo(fx + w * 0.014, mouthTop);
        ctx.closePath();
        ctx.fill();
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    };

    // =============== GHOST - Enhanced N64 Style ===============
    const drawGhostSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = '#dce8ff';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0.05);

        // Ghost personality: smooth float + sideways sway
        const phase = time * 0.9 + sprite.id * 1.31;
        const float = Math.sin(phase) * (h * 0.05);
        const sway = Math.sin(phase * 0.7) * (w * 0.04);

        const cx = x + w / 2 + sway;
        const cy = y + h / 2 + float;

        const bodyHeight = h * 0.95;
        const bodyTop = cy - bodyHeight * 0.55;
        const bodyBottom = cy + bodyHeight * 0.4;

        ctx.globalAlpha = brightness * 0.95;

        // --------------------------------------------
        // ✦ Ground shadow (very faint to keep floaty)
        // --------------------------------------------
        const shadowY = bodyBottom + h * 0.03;
        ctx.fillStyle = `rgba(0,0,0,${0.18 * brightness})`;
        ctx.beginPath();
        ctx.ellipse(
        cx,
        shadowY,
        w * 0.22,
        h * 0.06,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // --------------------------------------------
        // ✦ MAIN ROBE (layered, bell-shaped)
        // --------------------------------------------
        const robeW = w * 0.55;
        const robeH = bodyHeight * 0.65;
        const robeTop = bodyTop + bodyHeight * 0.1;
        const robeMidY = robeTop + robeH * 0.45;
        const robeBottom = robeTop + robeH;

        // Back layer
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        robeMidY,
        robeW * 0.55,
        robeH * 0.55,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Middle layer
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        robeMidY - robeH * 0.06,
        robeW * 0.5,
        robeH * 0.48,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Front highlight
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        robeMidY - robeH * 0.12,
        robeW * 0.38,
        robeH * 0.32,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // --------------------------------------------
        // ✦ TATTERED TAIL (smooth, flowing points)
        // --------------------------------------------
        const tailTop = robeBottom - bodyHeight * 0.1;
        const tailHeight = bodyHeight * 0.45;
        const tailBottom = tailTop + tailHeight;

        const tailPoints = [];
        const wisps = 5;
        for (let i = 0; i <= wisps; i++) {
        const t = i / wisps;
        const wobble = Math.sin(phase * 1.6 + i * 0.9) * (w * 0.03);
        const width = robeW * (0.45 - t * 0.3);
        const px = cx + wobble;
        const py = tailTop + tailHeight * t;

        tailPoints.push({ x: px, y: py, w: width });
        }

        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        // left edge top → bottom
        ctx.moveTo(tailPoints[0].x - tailPoints[0].w / 2, tailPoints[0].y);
        for (let i = 1; i < tailPoints.length; i++) {
        const p = tailPoints[i];
        ctx.lineTo(p.x - p.w / 2, p.y);
        }
        // right edge bottom → top
        for (let i = tailPoints.length - 1; i >= 0; i--) {
        const p = tailPoints[i];
        ctx.lineTo(p.x + p.w / 2, p.y);
        }
        ctx.closePath();
        ctx.fill();

        // Soft vertical fade lines
        ctx.strokeStyle = 'rgba(215,230,255,0.5)';
        ctx.lineWidth = 1;
        const lineCount = 3;
        for (let i = 0; i < lineCount; i++) {
        const lerp = (a, b, t) => a + (b - a) * t;
        const lx = lerp(
            cx - robeW * 0.18,
            cx + robeW * 0.18,
            i / (lineCount - 1 || 1)
        );
        ctx.beginPath();
        ctx.moveTo(lx, tailTop + 3);
        ctx.lineTo(lx, tailBottom - 3);
        ctx.stroke();
        }

        // --------------------------------------------
        // ✦ LITTLE ARMS (cloak flaps)
        // --------------------------------------------
        const armH = bodyHeight * 0.18;
        const armW = robeW * 0.55;
        const armY = robeTop + robeH * 0.25;
        const armOff = robeW * 0.6;

        ctx.fillStyle = rgbToCss(band2);
        [ -1, 1 ].forEach(side => {
        const ax = cx + armOff * 0.4 * side;
        ctx.beginPath();
        ctx.moveTo(ax, armY);
        ctx.quadraticCurveTo(
            ax + side * armW * 0.5,
            armY + armH * 0.1,
            ax + side * armW * 0.5,
            armY + armH
        );
        ctx.quadraticCurveTo(
            ax + side * armW * 0.2,
            armY + armH * 0.7,
            ax,
            armY + armH * 0.4
        );
        ctx.closePath();
        ctx.fill();
        });

        // --------------------------------------------
        // ✦ HEAD / FACE
        // --------------------------------------------
        const headH = bodyHeight * 0.24;
        const headW = robeW * 0.9;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        // Head bubble
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        headTop + headH * 0.55,
        headW * 0.5,
        headH * 0.55,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Lower face shading
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        headTop + headH * 0.8,
        headW * 0.5,
        headH * 0.35,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Eyes (big, hollow, glowing)
        const eyeW = headW * 0.24;
        const eyeH = headH * 0.35;
        const eyeY = headTop + headH * 0.55;
        const eyeOff = headW * 0.24;
        const isAttacking = sprite.state === 'attacking';

        // Sockets
        ctx.fillStyle = 'rgba(0,0,20,0.8)';
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW * 0.6,
            eyeY - eyeH * 0.5,
            eyeW * 1.2,
            eyeH * (isAttacking ? 1.2 : 1.0),
            w * 0.02
        );
        ctx.fill();
        });

        // Inner glow
        const irisW = eyeW * 0.65;
        const irisH = eyeH * 0.6;
        const innerColor = '#90bffd';

        ctx.fillStyle = innerColor;
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - irisW / 2,
            eyeY - irisH * 0.2,
            irisW,
            irisH,
            w * 0.015
        );
        ctx.fill();
        });

        // Tiny pupils (optional eerie dots)
        const pupilR = eyeW * 0.12;
        const pupilY = eyeY + irisH * 0.0;
        ctx.fillStyle = 'rgba(10,20,50,0.9)';
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.arc(ex, pupilY, pupilR, 0, Math.PI * 2);
        ctx.fill();
        });

        // Mouth (sad / open when attacking)
        const mouthW = headW * 0.4;
        const baseMouthH = headH * 0.12;
        const mouthH = isAttacking ? baseMouthH * 2.4 : baseMouthH;
        const mouthY = headTop + headH * (isAttacking ? 0.78 : 0.8);

        ctx.fillStyle = 'rgba(5,5,25,0.9)';
        ctx.beginPath();
        ctx.ellipse(
        cx,
        mouthY,
        mouthW * 0.5,
        mouthH * 0.6,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Inner spectral glow in mouth (when attacking)
        if (isAttacking) {
        const mGrad = ctx.createRadialGradient(
            cx, mouthY, 0,
            cx, mouthY, mouthW * 0.5
        );
        mGrad.addColorStop(0, 'rgba(150, 210, 255, 0.7)');
        mGrad.addColorStop(1, 'rgba(150, 210, 255, 0)');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.ellipse(
            cx,
            mouthY,
            mouthW * 0.6,
            mouthH * 0.85,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        }

        // --------------------------------------------
        // ✦ AURA / GLOW
        // --------------------------------------------
        const auraR = bodyHeight * 0.55;
        const auraGrad = ctx.createRadialGradient(
        cx, cy, 0,
        cx, cy, auraR
        );
        const flicker = 0.3 + Math.sin(time * 2.7 + sprite.id) * 0.1;
        auraGrad.addColorStop(0, `rgba(200,220,255,${flicker * brightness})`);
        auraGrad.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    // =============== GOLEM - Enhanced N64 Style ===============
    const drawGolemSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#b08b57'; // warm stone
        const { band1, band2, band3 } = getBands(baseColor, brightness, -0.05);

        // Heavy, slow animation
        const phase = time * 0.6 + sprite.id * 0.5;
        const stomp = Math.sin(phase) * (h * 0.01);
        const sway = Math.sin(phase * 0.4) * (w * 0.015);

        const cx = x + w / 2 + sway;
        const cy = y + h / 2 + stomp;

        const bodyHeight = h * 0.95;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, w * 0.8, bodyBottom, h, brightness);

        // --------------------------------------------
        // ✦ LEGS (huge stone columns)
        // --------------------------------------------
        const legH = bodyHeight * 0.3;
        const legW = w * 0.22;
        const legsTop = bodyBottom - legH * 1.05;
        const legOff = w * 0.2;

        ctx.fillStyle = rgbToCss(band3);

        const drawLeg = (side) => {
        const lx = cx + legOff * side;

        // Upper leg block
        ctx.beginPath();
        ctx.roundRect(
            lx - legW / 2,
            legsTop,
            legW,
            legH * 0.55,
            w * 0.03
        );
        ctx.fill();

        // Knee stone
        ctx.fillStyle = rgbToCss(band2);
        const kneeY = legsTop + legH * 0.55;
        ctx.beginPath();
        ctx.roundRect(
            lx - legW * 0.55,
            kneeY,
            legW * 1.1,
            legH * 0.16,
            w * 0.02
        );
        ctx.fill();

        // Lower leg
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW * 0.45,
            kneeY + legH * 0.16,
            legW * 0.9,
            legH * 0.45,
            w * 0.03
        );
        ctx.fill();

        // Feet slab
        const footY = legsTop + legH * 0.93;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW * 0.7,
            footY,
            legW * 1.4,
            legH * 0.12,
            w * 0.02
        );
        ctx.fill();
        };

        drawLeg(-1);
        drawLeg(1);

        // --------------------------------------------
        // ✦ HIP / PELVIS SLAB
        // --------------------------------------------
        const hipH = bodyHeight * 0.16;
        const hipW = w * 0.6;
        const hipTop = legsTop - hipH * 0.7;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        cx - hipW / 2,
        hipTop,
        hipW,
        hipH,
        w * 0.03
        );
        ctx.fill();

        // Cracks on hip
        ctx.strokeStyle = 'rgba(40,25,15,0.8)';
        ctx.lineWidth = Math.max(2, w * 0.018);
        ctx.beginPath();
        ctx.moveTo(cx - hipW * 0.3, hipTop + hipH * 0.2);
        ctx.lineTo(cx - hipW * 0.05, hipTop + hipH * 0.55);
        ctx.lineTo(cx + hipW * 0.25, hipTop + hipH * 0.4);
        ctx.stroke();

        // --------------------------------------------
        // ✦ TORSO (stacked stone plates + chest core)
        // --------------------------------------------
        const torsoH = bodyHeight * 0.45;
        const torsoTop = bodyTop + bodyHeight * 0.18;
        const torsoW = w * 0.7;
        const torsoLeft = cx - torsoW / 2;

        // Main block
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft,
        torsoTop,
        torsoW,
        torsoH,
        w * 0.04
        );
        ctx.fill();

        // Upper plate
        const plateH = torsoH * 0.28;
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft + torsoW * 0.06,
        torsoTop - plateH * 0.4,
        torsoW * 0.88,
        plateH,
        w * 0.03
        );
        ctx.fill();

        // Lower band
        ctx.fillStyle = rgbToCss(band3);
        const lowerBandH = torsoH * 0.22;
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft + torsoW * 0.08,
        torsoTop + torsoH * 0.6,
        torsoW * 0.84,
        lowerBandH,
        w * 0.03
        );
        ctx.fill();

        // Chest core gem
        const coreR = w * 0.05;
        const coreY = torsoTop + torsoH * 0.42;
        const coreColor = sprite.element === 'ice'
        ? '#a5e8ff'
        : sprite.element === 'lava'
        ? '#ffb347'
        : '#ffd86b';

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(cx, coreY, coreR, 0, Math.PI * 2);
        ctx.fill();

        const coreGlow = ctx.createRadialGradient(
        cx, coreY, 0,
        cx, coreY, coreR * 2.4
        );
        coreGlow.addColorStop(0, `${coreColor}bb`.replace('#', '#'));
        coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(cx, coreY, coreR * 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Torso cracks
        ctx.strokeStyle = 'rgba(35,20,10,0.85)';
        ctx.lineWidth = Math.max(2, w * 0.018);
        ctx.beginPath();
        ctx.moveTo(torsoLeft + torsoW * 0.18, torsoTop + torsoH * 0.18);
        ctx.lineTo(torsoLeft + torsoW * 0.35, torsoTop + torsoH * 0.4);
        ctx.lineTo(torsoLeft + torsoW * 0.6, torsoTop + torsoH * 0.3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(torsoLeft + torsoW * 0.68, torsoTop + torsoH * 0.16);
        ctx.lineTo(torsoLeft + torsoW * 0.52, torsoTop + torsoH * 0.32);
        ctx.stroke();

        // --------------------------------------------
        // ✦ SHOULDERS / ARMS (big brawler stone arms)
        // --------------------------------------------
        const armH = bodyHeight * 0.38;
        const upperAH = armH * 0.5;
        const lowerAH = armH * 0.5;
        const shoulderY = torsoTop + torsoH * 0.15;
        const shoulderOff = torsoW * 0.55;

        const isAttacking = sprite.state === 'attacking';

        const drawArm = (side) => {
        const ax = cx + shoulderOff * side;
        const punch = isAttacking
            ? Math.sin(time * 16 + side * Math.PI) * (w * 0.03)
            : 0;

        // Shoulder chunk
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.06,
            shoulderY - h * 0.01,
            w * 0.12,
            upperAH * 0.55,
            w * 0.03
        );
        ctx.fill();

        // Upper arm
        const upperY = shoulderY + upperAH * 0.2;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.05,
            upperY,
            w * 0.1,
            upperAH,
            w * 0.03
        );
        ctx.fill();

        // Elbow block
        const elbowY = upperY + upperAH;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            ax - w * 0.055,
            elbowY,
            w * 0.11,
            h * 0.05,
            w * 0.02
        );
        ctx.fill();

        // Forearm + fist
        const forearmX = ax + punch * side;
        const forearmY = elbowY + h * 0.03;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            forearmX - w * 0.05,
            forearmY,
            w * 0.1,
            lowerAH * 0.75,
            w * 0.03
        );
        ctx.fill();

        // Fist = front slab
        const fistY = forearmY + lowerAH * 0.75;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            forearmX - w * 0.06,
            fistY,
            w * 0.12,
            h * 0.06,
            w * 0.025
        );
        ctx.fill();

        // Knuckle highlights
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(forearmX - w * 0.05, fistY + h * 0.02);
        ctx.lineTo(forearmX + w * 0.05, fistY + h * 0.02);
        ctx.stroke();
        };

        drawArm(-1);
        drawArm(1);

        // --------------------------------------------
        // ✦ HEAD (stone block with slitted eyes)
        // --------------------------------------------
        const headH = bodyHeight * 0.18;
        const headW = w * 0.5;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        // Head block
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        headLeft,
        headTop,
        headW,
        headH,
        w * 0.03
        );
        ctx.fill();

        // Brow ridge
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        headLeft + headW * 0.05,
        headTop + headH * 0.35,
        headW * 0.9,
        headH * 0.22,
        w * 0.02
        );
        ctx.fill();

        // Eyes
        const eyeW = headW * 0.18;
        const eyeH = headH * 0.22;
        const eyeY = headTop + headH * 0.5;
        const eyeOff = headW * 0.2;

        const eyeColor = sprite.element === 'ice'
        ? '#c8f3ff'
        : sprite.element === 'lava'
        ? '#ffb35c'
        : '#ffe18a';

        ctx.fillStyle = eyeColor;
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY,
            eyeW,
            eyeH,
            w * 0.01
        );
        ctx.fill();

        // Dark slit
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(
            ex - eyeW * 0.45,
            eyeY + eyeH * 0.35,
            eyeW * 0.9,
            eyeH * 0.3
        );

        // Small inner glow
        const grad = ctx.createRadialGradient(
            ex, eyeY + eyeH * 0.3, 0,
            ex, eyeY + eyeH * 0.3, eyeW
        );
        grad.addColorStop(0, `${eyeColor}cc`.replace('#', '#'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeH * 0.3, eyeW, 0, Math.PI * 2);
        ctx.fill();
        });

        // Forehead crack
        ctx.strokeStyle = 'rgba(20,10,5,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headLeft + headW * 0.3, headTop + headH * 0.15);
        ctx.lineTo(headLeft + headW * 0.45, headTop + headH * 0.35);
        ctx.lineTo(headLeft + headW * 0.65, headTop + headH * 0.22);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
    };

    const drawArcherSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#8b4513';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0);

        const phase = time * 0.8 + sprite.id * 0.9;
        const breathe = Math.sin(phase * 0.6) * (h * 0.012);
        const readyBow = sprite.state === 'attacking' ? 1 : 0;

        const cx = x + w / 2;
        const cy = y + h / 2 + breathe;

        const bodyHeight = h * 0.92;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, w * 0.45, bodyBottom, h, brightness);

        // --------------------------------------------
        // ✦ LEGS (archer stance - one forward)
        // --------------------------------------------
        const legH = bodyHeight * 0.28;
        const legW = w * 0.18;
        const legsTop = bodyBottom - legH * 1.05;
        const legOff = w * 0.15;

        const drawLeg = (side, forward) => {
        const lx = cx + legOff * side;
        const legForward = forward ? legH * 0.15 : 0;

        // Upper leg
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW / 2,
            legsTop - legForward,
            legW,
            legH * 0.55,
            w * 0.03
        );
        ctx.fill();

        // Knee
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.arc(lx, legsTop + legH * 0.55 - legForward, w * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Lower leg
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW * 0.42,
            legsTop + legH * 0.55 + w * 0.02 - legForward,
            legW * 0.84,
            legH * 0.4,
            w * 0.03
        );
        ctx.fill();

        // Boot
        const bootY = legsTop + legH * 0.95 - legForward;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.ellipse(lx, bootY, legW * 0.5, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        };

        drawLeg(-1, true);  // Left leg forward
        drawLeg(1, false);  // Right leg back

        // --------------------------------------------
        // ✦ QUIVER (on back)
        // --------------------------------------------
        const quiverX = cx + w * 0.25;
        const quiverY = bodyTop + bodyHeight * 0.35;
        const quiverH = bodyHeight * 0.25;

        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        quiverX - w * 0.05,
        quiverY,
        w * 0.1,
        quiverH,
        w * 0.02
        );
        ctx.fill();

        // Arrow fletchings sticking out
        ctx.fillStyle = '#ff6b6b';
        for (let i = 0; i < 3; i++) {
        const ay = quiverY + quiverH * (0.2 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(quiverX - w * 0.03, ay);
        ctx.lineTo(quiverX + w * 0.02, ay - h * 0.02);
        ctx.lineTo(quiverX + w * 0.02, ay + h * 0.02);
        ctx.closePath();
        ctx.fill();
        }

        // --------------------------------------------
        // ✦ TORSO (leather armor)
        // --------------------------------------------
        const torsoH = bodyHeight * 0.48;
        const torsoW = w * 0.52;
        const torsoTop = bodyTop + bodyHeight * 0.22;
        const torsoLeft = cx - torsoW / 2;

        // Main torso
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft,
        torsoTop,
        torsoW,
        torsoH,
        w * 0.04
        );
        ctx.fill();

        // Leather strap across chest
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft + torsoW * 0.15,
        torsoTop + torsoH * 0.25,
        torsoW * 0.7,
        torsoH * 0.12,
        w * 0.02
        );
        ctx.fill();

        // Belt
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft + torsoW * 0.1,
        torsoTop + torsoH * 0.75,
        torsoW * 0.8,
        torsoH * 0.15,
        w * 0.02
        );
        ctx.fill();

        // --------------------------------------------
        // ✦ BOW & ARMS (drawing animation)
        // --------------------------------------------
        const shoulderY = torsoTop + torsoH * 0.18;
        const armH = bodyHeight * 0.35;

        // Left arm (bow hand) - extended
        const leftArmX = cx - torsoW * 0.4;
        const leftArmExtend = w * 0.3;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        leftArmX - w * 0.04,
        shoulderY,
        w * 0.08,
        armH * 0.5,
        w * 0.03
        );
        ctx.fill();

        // Left forearm extending
        ctx.beginPath();
        ctx.roundRect(
        leftArmX - leftArmExtend - w * 0.035,
        shoulderY + armH * 0.5,
        leftArmExtend + w * 0.07,
        w * 0.07,
        w * 0.025
        );
        ctx.fill();

        // Bow
        const bowX = leftArmX - leftArmExtend;
        const bowY = shoulderY + armH * 0.55;
        const bowH = h * 0.35;

        ctx.strokeStyle = rgbToCss(band3);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bowX, bowY, bowH * 0.5, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();

        // Bowstring
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bowX, bowY - bowH * 0.45);
        if (readyBow > 0.5) {
        // Pulled back
        ctx.lineTo(cx + torsoW * 0.2, shoulderY + armH * 0.6);
        } else {
        // Relaxed
        ctx.lineTo(bowX - w * 0.05, bowY);
        }
        ctx.lineTo(bowX, bowY + bowH * 0.45);
        ctx.stroke();

        // Arrow when drawn
        if (readyBow > 0.5) {
        const arrowStartX = bowX;
        const arrowStartY = bowY;
        const arrowEndX = cx + torsoW * 0.2;
        const arrowEndY = shoulderY + armH * 0.6;

        // Arrow shaft
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(arrowStartX, arrowStartY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.moveTo(arrowStartX - w * 0.03, arrowStartY);
        ctx.lineTo(arrowStartX, arrowStartY - h * 0.015);
        ctx.lineTo(arrowStartX, arrowStartY + h * 0.015);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY - h * 0.02);
        ctx.lineTo(arrowEndX + w * 0.03, arrowEndY);
        ctx.lineTo(arrowEndX, arrowEndY + h * 0.02);
        ctx.closePath();
        ctx.fill();
        }

        // Right arm (drawing hand)
        const rightArmX = cx + torsoW * 0.4;
        const pullBack = readyBow * w * 0.15;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        rightArmX - w * 0.04,
        shoulderY,
        w * 0.08,
        armH * 0.5,
        w * 0.03
        );
        ctx.fill();

        // Right forearm
        ctx.beginPath();
        ctx.roundRect(
        rightArmX - w * 0.035 + pullBack,
        shoulderY + armH * 0.5,
        w * 0.07,
        armH * 0.45,
        w * 0.025
        );
        ctx.fill();

        // --------------------------------------------
        // ✦ HEAD / HOOD
        // --------------------------------------------
        const headH = bodyHeight * 0.2;
        const headW = w * 0.42;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        // Hood
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.ellipse(
        cx,
        headTop + headH * 0.5,
        headW * 0.55,
        headH * 0.6,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Face (shadowed)
        ctx.fillStyle = 'rgba(50, 40, 30, 0.8)';
        ctx.beginPath();
        ctx.ellipse(
        cx,
        headTop + headH * 0.55,
        headW * 0.4,
        headH * 0.45,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Eyes (focused)
        const eyeW = headW * 0.12;
        const eyeY = headTop + headH * 0.5;
        const eyeOff = headW * 0.18;

        ctx.fillStyle = '#ffeb99';
        [-1, 1].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeW * 0.3, eyeW * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    };

    // =============== NECROMANCER (BOSS) ===============
    const drawNecromancerSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#9b3dff';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0.05);

        const phase = time * 0.9 + sprite.id * 1.11;
        const float = Math.sin(phase * 0.7) * (h * 0.02);
        const sway = Math.sin(phase * 0.4) * (w * 0.015);

        const casting = sprite.state === 'attacking' || sprite.state === 'casting';

        const cx = x + w / 2 + sway;
        const cy = y + h / 2 + float;

        const bodyHeight = h * 1.0;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, w * 0.45, bodyBottom, h, brightness);

        // ----- Robe -----
        const robeW = w * 0.5;
        const robeH = bodyHeight * 0.7;
        const robeTop = bodyTop + bodyHeight * 0.2;
        const robeLeft = cx - robeW / 2;

        // Back robe
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(robeLeft, robeTop, robeW, robeH, w * 0.04);
        ctx.fill();

        // Front stripe
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        cx - robeW * 0.13,
        robeTop,
        robeW * 0.26,
        robeH,
        w * 0.02
        );
        ctx.fill();

        // Lower tattered hem
        const hemY = robeTop + robeH;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.moveTo(robeLeft, hemY);
        ctx.lineTo(robeLeft + robeW * 0.2, hemY + h * 0.04);
        ctx.lineTo(cx, hemY + h * 0.02);
        ctx.lineTo(robeLeft + robeW * 0.8, hemY + h * 0.05);
        ctx.lineTo(robeLeft + robeW, hemY);
        ctx.closePath();
        ctx.fill();

        // ----- Shoulders / Sleeves -----
        const shoulderY = robeTop + robeH * 0.15;
        const shoulderOff = robeW * 0.6;
        const sleeveH = bodyHeight * 0.22;

        ctx.fillStyle = rgbToCss(band2);
        [ -1, 1 ].forEach(side => {
        const sx = cx + shoulderOff * 0.3 * side;
        ctx.beginPath();
        ctx.ellipse(
            sx,
            shoulderY,
            w * 0.07,
            h * 0.06,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Hanging sleeve
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.moveTo(sx, shoulderY);
        ctx.quadraticCurveTo(
            sx + side * w * 0.12,
            shoulderY + sleeveH * 0.2,
            sx + side * w * 0.12,
            shoulderY + sleeveH
        );
        ctx.quadraticCurveTo(
            sx + side * w * 0.06,
            shoulderY + sleeveH * 0.8,
            sx,
            shoulderY + sleeveH * 0.6
        );
        ctx.closePath();
        ctx.fill();
        });

        // ----- Staff (left side) -----
        const staffX = cx - robeW * 0.7;
        const staffTop = bodyTop + bodyHeight * 0.12;
        const staffBottom = hemY + h * 0.08;

        ctx.strokeStyle = 'rgba(40,10,80,0.95)';
        ctx.lineWidth = Math.max(2, w * 0.02);
        ctx.beginPath();
        ctx.moveTo(staffX, staffTop);
        ctx.lineTo(staffX, staffBottom);
        ctx.stroke();

        // Orb with casting pulse
        const orbR = h * 0.09;
        const orbY = staffTop - orbR * 0.2;
        const pulse = 0.6 + Math.sin(time * 4 + sprite.id) * 0.3;

        ctx.fillStyle = '#e8b5ff';
        ctx.beginPath();
        ctx.arc(staffX, orbY, orbR, 0, Math.PI * 2);
        ctx.fill();

        const orbGrad = ctx.createRadialGradient(
        staffX, orbY, 0,
        staffX, orbY, orbR * 2.7
        );
        orbGrad.addColorStop(0, `rgba(232,181,255,${pulse * brightness})`);
        orbGrad.addColorStop(1, 'rgba(232,181,255,0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(staffX, orbY, orbR * 2.7, 0, Math.PI * 2);
        ctx.fill();

        // Extra casting swirl
        if (casting) {
        ctx.strokeStyle = `rgba(200,180,255,${0.8 * brightness})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(staffX, orbY, orbR * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        }

        // ----- Head / Hood -----
        const headH = bodyHeight * 0.22;
        const headW = robeW * 0.9;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        // Hood outer
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        headLeft,
        headTop,
        headW,
        headH,
        w * 0.04
        );
        ctx.fill();

        // Inner hood shadow
        ctx.fillStyle = 'rgba(10, 0, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(
        headLeft + headW * 0.12,
        headTop + headH * 0.25,
        headW * 0.76,
        headH * 0.6,
        w * 0.03
        );
        ctx.fill();

        // Eyes
        const eyeW = headW * 0.18;
        const eyeH = headH * 0.22;
        const eyeY = headTop + headH * 0.45;
        const eyeOff = headW * 0.24;

        const eyeOuterColor = '#f3ddff';
        const eyeInnerColor = '#6f20b3';

        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;

        // Glow plate
        ctx.fillStyle = eyeOuterColor;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY,
            eyeW,
            eyeH,
            w * 0.015
        );
        ctx.fill();

        // Inner iris
        const irisW = eyeW * 0.55;
        const irisH = eyeH * 0.6;
        ctx.fillStyle = eyeInnerColor;
        ctx.fillRect(
            ex - irisW / 2,
            eyeY + eyeH * 0.15,
            irisW,
            irisH
        );

        // Vertical slit
        ctx.fillStyle = '#000';
        ctx.fillRect(
            ex - irisW * 0.1,
            eyeY + eyeH * 0.15,
            irisW * 0.2,
            irisH
        );

        // Soft outward glow
        const eg = ctx.createRadialGradient(
            ex, eyeY + eyeH * 0.3, 0,
            ex, eyeY + eyeH * 0.3, eyeW * 1.5
        );
        eg.addColorStop(0, `rgba(243,221,255,${0.6 * brightness})`);
        eg.addColorStop(1, 'rgba(243,221,255,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeH * 0.3, eyeW * 1.5, 0, Math.PI * 2);
        ctx.fill();
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    };


    // =============== DRAGON (BOSS) ===============
    const drawDragonSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#e33426';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0);

        const phase = time * 1.0 + sprite.id * 0.7;
        const flap = Math.sin(phase * 1.2) * (h * 0.03);
        const sway = Math.sin(phase * 0.6) * (w * 0.03);
        const roar = sprite.state === 'attacking';

        const cx = x + w / 2 + sway;
        const cy = y + h * 0.56 + flap * 0.4;

        const bodyHeight = h * 0.9;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, w * 0.9, bodyBottom, h, brightness);

        // ----- Wings (behind body) -----
        const wingSpan = w * 1.7;
        const wingH = h * 0.55;
        const wingY = bodyTop + bodyHeight * 0.35;

        const drawWing = (side) => {
        const rootX = cx + side * w * 0.18;
        const rootY = wingY;

        ctx.fillStyle = `rgba(40, 0, 0, ${0.6 * brightness})`;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);

        const tipX = rootX + side * wingSpan * 0.5;
        const tipY = rootY - wingH * 0.4 + flap * side;

        ctx.quadraticCurveTo(
            (rootX + tipX) / 2,
            rootY - wingH * 0.9,
            tipX,
            tipY
        );
        ctx.lineTo(
            tipX - side * wingSpan * 0.12,
            tipY + wingH * 0.9
        );
        ctx.quadraticCurveTo(
            (rootX + tipX) / 2,
            rootY + wingH * 0.5,
            rootX,
            rootY
        );
        ctx.closePath();
        ctx.fill();

        // Membrane veins
        ctx.strokeStyle = `rgba(0,0,0,${0.5 * brightness})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.lineTo(tipX - side * wingSpan * 0.06, tipY + wingH * 0.45);
        ctx.stroke();
        };

        drawWing(-1);
        drawWing(1);

        // ----- Torso / Chest -----
        const torsoH = bodyHeight * 0.5;
        const torsoW = w * 0.7;
        const torsoTop = bodyTop + bodyHeight * 0.25;
        const torsoLeft = cx - torsoW / 2;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        torsoLeft,
        torsoTop,
        torsoW,
        torsoH,
        w * 0.05
        );
        ctx.fill();

        // Belly plates
        ctx.fillStyle = rgbToCss(band1);
        const bellyW = torsoW * 0.34;
        const bellyX = cx - bellyW / 2;
        const bellyTop = torsoTop + torsoH * 0.1;
        const bellySegH = torsoH * 0.16;
        for (let i = 0; i < 3; i++) {
        const by = bellyTop + i * bellySegH;
        ctx.beginPath();
        ctx.roundRect(
            bellyX,
            by,
            bellyW,
            bellySegH * 0.9,
            w * 0.025
        );
        ctx.fill();
        }

        // ----- Legs / Claws -----
        const legH = bodyHeight * 0.28;
        const legW = w * 0.22;
        const legsTop = torsoTop + torsoH - legH * 0.1;
        const legOff = w * 0.26;

        const drawLeg = (side) => {
        const lx = cx + legOff * side;

        // Thigh
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW / 2,
            legsTop,
            legW,
            legH * 0.55,
            w * 0.035
        );
        ctx.fill();

        // Shin
        const shinTop = legsTop + legH * 0.5;
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
            lx - legW * 0.45,
            shinTop,
            legW * 0.9,
            legH * 0.4,
            w * 0.03
        );
        ctx.fill();

        // Foot
        const footY = legsTop + legH * 0.95;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.ellipse(
            lx,
            footY,
            legW * 0.7,
            h * 0.045,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Claws
        ctx.fillStyle = '#f6e0c0';
        const spread = legW * 0.35;
        [ -spread, 0, spread ].forEach(offset => {
            ctx.beginPath();
            ctx.moveTo(lx + offset - w * 0.016, footY);
            ctx.lineTo(lx + offset, footY + h * 0.045);
            ctx.lineTo(lx + offset + w * 0.016, footY);
            ctx.closePath();
            ctx.fill();
        });
        };

        drawLeg(-1);
        drawLeg(1);

        // ----- Neck / Head -----
        const neckH = bodyHeight * 0.22;
        const neckW = w * 0.18;
        const neckTop = bodyTop + bodyHeight * 0.1;

        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        cx - neckW / 2,
        neckTop,
        neckW,
        neckH,
        w * 0.03
        );
        ctx.fill();

        const headH = bodyHeight * 0.25;
        const headW = w * 0.6;
        const headTop = neckTop - headH * 0.1;
        const headLeft = cx - headW * 0.35; // push snout right

        // Head bulk
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        headLeft,
        headTop,
        headW,
        headH,
        w * 0.04
        );
        ctx.fill();

        // Snout
        const snoutH = headH * 0.55;
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        headLeft + headW * 0.45,
        headTop + headH * 0.35,
        headW * 0.38,
        snoutH,
        w * 0.03
        );
        ctx.fill();

        // Eyes
        const eyeW = headW * 0.16;
        const eyeH = headH * 0.22;
        const eyeY = headTop + headH * 0.35;
        const eyeOff = headW * 0.2;
        const eyeColor = '#ffeaa8';

        [ -1, 1 ].forEach(side => {
        const ex = headLeft + headW * (side === -1 ? 0.25 : 0.5);
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY,
            eyeW,
            eyeH,
            w * 0.015
        );
        ctx.fill();

        // Iris and slit
        const irisW = eyeW * 0.45;
        const irisH = eyeH * 0.7;
        ctx.fillStyle = '#ff7b24';
        ctx.fillRect(
            ex - irisW / 2,
            eyeY + eyeH * 0.2,
            irisW,
            irisH
        );

        ctx.fillStyle = '#000';
        ctx.fillRect(
            ex - irisW * 0.1,
            eyeY + eyeH * 0.2,
            irisW * 0.2,
            irisH
        );
        });

        // Brows
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headLeft + headW * 0.2, eyeY - eyeH * 0.2);
        ctx.lineTo(headLeft + headW * 0.35, eyeY - eyeH * 0.1);
        ctx.moveTo(headLeft + headW * 0.45, eyeY - eyeH * 0.2);
        ctx.lineTo(headLeft + headW * 0.6, eyeY - eyeH * 0.1);
        ctx.stroke();

        // Mouth (open wider when roaring)
        const mouthW = headW * 0.38;
        const mouthTop = headTop + headH * 0.7;
        const baseMouthH = headH * 0.16;
        const mouthH = roar ? baseMouthH * 1.8 : baseMouthH;
        const mouthX = headLeft + headW * 0.6;

        ctx.fillStyle = '#3a0505';
        ctx.beginPath();
        ctx.roundRect(
        mouthX - mouthW / 2,
        mouthTop,
        mouthW,
        mouthH,
        w * 0.02
        );
        ctx.fill();

        // Fangs
        ctx.fillStyle = '#f6eae0';
        const fangPositions = [ -0.35, -0.15, 0.15, 0.35 ];
        const fangH = mouthH * (roar ? 0.7 : 0.5);
        fangPositions.forEach(p => {
        const fx = mouthX + mouthW * p;
        ctx.beginPath();
        ctx.moveTo(fx - w * 0.015, mouthTop);
        ctx.lineTo(fx, mouthTop + fangH);
        ctx.lineTo(fx + w * 0.015, mouthTop);
        ctx.closePath();
        ctx.fill();
        });

        // Flame breath glow (when attacking)
        if (roar) {
        const flameX = mouthX + mouthW * 0.6;
        const flameY = mouthTop + mouthH * 0.5;
        const flameR = w * 0.4;
        const fg = ctx.createRadialGradient(
            flameX, flameY, 0,
            flameX, flameY, flameR
        );
        fg.addColorStop(0, 'rgba(255, 200, 80, 0.9)');
        fg.addColorStop(0.5, 'rgba(255, 120, 40, 0.5)');
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(flameX, flameY, flameR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    };


    // =============== LICH (BOSS) ===============
    const drawLichSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#00ffaa';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0.05);

        const phase = time * 1.0 + sprite.id * 0.6;
        const float = Math.sin(phase * 0.8) * (h * 0.03);
        const sway = Math.sin(phase * 0.5) * (w * 0.02);
        const channeling = sprite.state === 'attacking' || sprite.state === 'casting';

        const cx = x + w / 2 + sway;
        const cy = y + h / 2 + float;

        const bodyHeight = h * 0.98;
        const bodyTop = cy - bodyHeight * 0.5;
        const bodyBottom = cy + bodyHeight * 0.5;

        ctx.globalAlpha = brightness * 0.95;
        drawFeetShadow(ctx, cx, w * 0.4, bodyBottom, h, brightness);

        // ----- Robe (tall, angular) -----
        const robeW = w * 0.46;
        const robeH = bodyHeight * 0.7;
        const robeTop = bodyTop + bodyHeight * 0.2;
        const robeLeft = cx - robeW / 2;

        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.moveTo(robeLeft, robeTop);
        ctx.lineTo(robeLeft + robeW, robeTop);
        ctx.lineTo(robeLeft + robeW * 0.85, robeTop + robeH);
        ctx.lineTo(robeLeft + robeW * 0.15, robeTop + robeH);
        ctx.closePath();
        ctx.fill();

        // Inner robe
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.moveTo(cx - robeW * 0.18, robeTop);
        ctx.lineTo(cx + robeW * 0.18, robeTop);
        ctx.lineTo(cx + robeW * 0.12, robeTop + robeH);
        ctx.lineTo(cx - robeW * 0.12, robeTop + robeH);
        ctx.closePath();
        ctx.fill();

        // Trim
        ctx.strokeStyle = `rgba(200,255,230,${0.6 * brightness})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(robeLeft + robeW * 0.15, robeTop + robeH);
        ctx.lineTo(robeLeft, robeTop);
        ctx.lineTo(robeLeft + robeW, robeTop);
        ctx.lineTo(robeLeft + robeW * 0.85, robeTop + robeH);
        ctx.stroke();

        // ----- Arms (skeletal sleeves forward) -----
        const armY = robeTop + robeH * 0.28;
        const armLen = bodyHeight * 0.28;
        const armOff = robeW * 0.7;

        const drawArm = (side) => {
        const ax = cx + armOff * 0.35 * side;

        // Sleeve
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.moveTo(ax, armY);
        ctx.quadraticCurveTo(
            ax + side * w * 0.15,
            armY + armLen * 0.2,
            ax + side * w * 0.13,
            armY + armLen
        );
        ctx.quadraticCurveTo(
            ax + side * w * 0.06,
            armY + armLen * 0.7,
            ax,
            armY + armLen * 0.5
        );
        ctx.closePath();
        ctx.fill();

        // Skeletal hand
        const handX = ax + side * w * 0.13;
        const handY = armY + armLen;
        ctx.fillStyle = '#e6fff4';
        ctx.beginPath();
        ctx.ellipse(
            handX,
            handY,
            w * 0.035,
            h * 0.025,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Fingers (simple lines)
        ctx.strokeStyle = '#6ddfb7';
        ctx.lineWidth = 2;
        const fingerSpread = w * 0.02;
        [ -fingerSpread, 0, fingerSpread ].forEach(offset => {
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX + offset, handY + h * 0.04);
            ctx.stroke();
        });
        };

        drawArm(-1);
        drawArm(1);

        // ----- Head / Skull + Crown -----
        const headH = bodyHeight * 0.2;
        const headW = w * 0.38;
        const headTop = bodyTop;
        const headLeft = cx - headW / 2;

        ctx.fillStyle = '#e6fff4';
        ctx.beginPath();
        ctx.roundRect(
        headLeft,
        headTop,
        headW,
        headH,
        w * 0.03
        );
        ctx.fill();

        // Crown
        const crownH = headH * 0.35;
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.moveTo(headLeft, headTop + crownH);
        ctx.lineTo(headLeft + headW * 0.2, headTop);
        ctx.lineTo(headLeft + headW * 0.4, headTop + crownH * 0.3);
        ctx.lineTo(headLeft + headW * 0.6, headTop);
        ctx.lineTo(headLeft + headW * 0.8, headTop + crownH * 0.3);
        ctx.lineTo(headLeft + headW, headTop + crownH);
        ctx.closePath();
        ctx.fill();

        // Eye sockets
        const eyeW = headW * 0.18;
        const eyeH = headH * 0.25;
        const eyeY = headTop + headH * 0.4;
        const eyeOff = headW * 0.22;

        ctx.fillStyle = '#00281e';
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY,
            eyeW,
            eyeH,
            w * 0.015
        );
        ctx.fill();
        });

        // Inner necrotic glow
        const innerColor = '#16dba0';
        const irisW = eyeW * 0.55;
        const irisH = eyeH * 0.6;
        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;
        ctx.fillStyle = innerColor;
        ctx.fillRect(
            ex - irisW / 2,
            eyeY + eyeH * 0.2,
            irisW,
            irisH
        );

        const eg = ctx.createRadialGradient(
            ex, eyeY + eyeH * 0.35, 0,
            ex, eyeY + eyeH * 0.35, eyeW * 1.4
        );
        eg.addColorStop(0, `rgba(22,219,160,${0.8 * brightness})`);
        eg.addColorStop(1, 'rgba(22,219,160,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeH * 0.35, eyeW * 1.4, 0, Math.PI * 2);
        ctx.fill();
        });

        // Teeth
        ctx.strokeStyle = 'rgba(5,20,15,0.8)';
        ctx.lineWidth = 1.5;
        const mouthTop = headTop + headH * 0.75;
        const mouthBottom = headTop + headH * 0.95;
        const teethCount = 5;
        for (let i = 1; i < teethCount; i++) {
        const tx = headLeft + (headW * i) / teethCount;
        ctx.beginPath();
        ctx.moveTo(tx, mouthTop);
        ctx.lineTo(tx, mouthBottom);
        ctx.stroke();
        }

        // ----- Aura / Phylactery halo -----
        const auraW = robeW * 1.7;
        const auraH = bodyHeight * 1.2;
        const auraGrad = ctx.createRadialGradient(
        cx, (robeTop + robeTop + robeH) / 2, 0,
        cx, (robeTop + robeTop + robeH) / 2, auraH * 0.7
        );
        const baseAura = 0.4 + Math.sin(time * 1.8 + sprite.id) * 0.1;
        auraGrad.addColorStop(0, `rgba(0,255,200,${baseAura * brightness})`);
        auraGrad.addColorStop(1, 'rgba(0,255,200,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(
        cx,
        (robeTop + robeTop + robeH) / 2,
        auraW * 0.6,
        auraH * 0.6,
        0,
        0,
        Math.PI * 2
        );
        ctx.fill();

        // Channeling rings
        if (channeling) {
        ctx.strokeStyle = `rgba(120,255,220,${0.7 * brightness})`;
        ctx.lineWidth = 2;
        const ringR = robeW * 0.9;
        const ringY = robeTop + robeH * 0.45;
        ctx.beginPath();
        ctx.ellipse(cx, ringY, ringR, ringR * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        }

        ctx.restore();
    };

    // =============== GENERIC FALLBACK ===============
    const drawGenericMonsterSprite = (ctx, sprite, x, y, w, h, brightness, time) => {
        ctx.save();

        const baseColor = sprite.color?.startsWith('#') ? sprite.color : '#8f8fb0';
        const { band1, band2, band3 } = getBands(baseColor, brightness, 0.02);

        const phase = time * 0.9 + sprite.id * 0.37;
        const bob = Math.sin(phase) * (h * 0.02);
        const squish = 1 + Math.sin(phase * 2) * 0.06;

        const cx = x + w / 2;
        const cy = y + h / 2 + bob;

        const bodyHeight = h * 0.85;
        const bodyWidth = w * 0.55;
        const bodyTop = cy - (bodyHeight * squish) / 2;
        const bodyBottom = cy + (bodyHeight * squish) / 2;

        ctx.globalAlpha = brightness;
        drawFeetShadow(ctx, cx, bodyWidth, bodyBottom, h, brightness);

        // Blob body (rounded, layered)
        ctx.fillStyle = rgbToCss(band2);
        ctx.beginPath();
        ctx.roundRect(
        cx - bodyWidth / 2,
        bodyTop,
        bodyWidth,
        bodyHeight * squish,
        w * 0.08
        );
        ctx.fill();

        // Inner core
        ctx.fillStyle = rgbToCss(band1);
        ctx.beginPath();
        ctx.roundRect(
        cx - bodyWidth * 0.35,
        bodyTop + bodyHeight * 0.2,
        bodyWidth * 0.7,
        bodyHeight * 0.45,
        w * 0.05
        );
        ctx.fill();

        // Lower darker band
        ctx.fillStyle = rgbToCss(band3);
        ctx.beginPath();
        ctx.roundRect(
        cx - bodyWidth * 0.4,
        bodyTop + bodyHeight * 0.55,
        bodyWidth * 0.8,
        bodyHeight * 0.25,
        w * 0.05
        );
        ctx.fill();

        // Eyes
        const eyeW = bodyWidth * 0.22;
        const eyeH = bodyHeight * 0.2;
        const eyeY = bodyTop + bodyHeight * 0.35;
        const eyeOff = bodyWidth * 0.22;

        [ -1, 1 ].forEach(side => {
        const ex = cx + side * eyeOff;

        // Outer eye plate
        ctx.fillStyle = '#f2f2ff';
        ctx.beginPath();
        ctx.roundRect(
            ex - eyeW / 2,
            eyeY,
            eyeW,
            eyeH,
            w * 0.02
        );
        ctx.fill();

        // Iris
        const irisW = eyeW * 0.55;
        const irisH = eyeH * 0.6;
        ctx.fillStyle = '#545488';
        ctx.fillRect(
            ex - irisW / 2,
            eyeY + eyeH * 0.2,
            irisW,
            irisH
        );

        // Pupil
        ctx.fillStyle = '#151524';
        ctx.fillRect(
            ex - irisW * 0.15,
            eyeY + eyeH * 0.22,
            irisW * 0.3,
            irisH * 0.7
        );
        });

        // Simple mouth line
        const mouthW = bodyWidth * 0.3;
        const mouthY = bodyTop + bodyHeight * 0.65;
        ctx.strokeStyle = 'rgba(10,10,30,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - mouthW / 2, mouthY);
        ctx.quadraticCurveTo(
        cx,
        mouthY + bodyHeight * 0.08,
        cx + mouthW / 2,
        mouthY
        );
        ctx.stroke();

        // Soft aura so it doesn't look like a placeholder
        const auraR = bodyWidth * 0.9;
        const auraGrad = ctx.createRadialGradient(
        cx, cy, 0,
        cx, cy, auraR
        );
        auraGrad.addColorStop(0, `rgba(180,180,220,${0.3 * brightness})`);
        auraGrad.addColorStop(1, 'rgba(180,180,220,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

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

        case 'dash': {
            ctx.translate(x, y);
            
            // Teleport swirl effect
            const swirls = 3;
            for (let i = 0; i < swirls; i++) {
            const angle = (i / swirls) * Math.PI * 2 + time * 5;
            const radius = size * (0.8 + i * 0.4);
            
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = brightness * (1 - i * 0.3);
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, angle, angle + Math.PI * 0.8);
            ctx.stroke();
            }
            
            // Center burst
            const burstGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
            burstGlow.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            burstGlow.addColorStop(0.5, 'rgba(0, 200, 255, 0.4)');
            burstGlow.addColorStop(1, 'rgba(0, 150, 255, 0)');
            ctx.globalAlpha = brightness;
            ctx.fillStyle = burstGlow;
            ctx.beginPath();
            ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + time * 3;
            const px = Math.cos(angle) * size * 1.5;
            const py = Math.sin(angle) * size * 1.5;
            ctx.fillRect(px - 2, py - 2, 4, 4);
            }
            break;
        }
        
        case 'pushback': {
            ctx.translate(x, y);
            
            // Expanding force rings
            const rings = 4;
            for (let i = 0; i < rings; i++) {
            const ringPhase = (time * 3 + i * 0.3) % 1;
            const ringRadius = size * (0.5 + ringPhase * 2.5);
            const ringAlpha = brightness * (1 - ringPhase);
            
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 4;
            ctx.globalAlpha = ringAlpha;
            
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            }
            
            // Center impact
            const impactGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
            impactGlow.addColorStop(0, 'rgba(136, 255, 136, 0.9)');
            impactGlow.addColorStop(0.5, 'rgba(100, 255, 100, 0.5)');
            impactGlow.addColorStop(1, 'rgba(50, 200, 50, 0)');
            ctx.globalAlpha = brightness;
            ctx.fillStyle = impactGlow;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Directional force lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = brightness * 0.8;
            for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const innerR = size * 0.5;
            const outerR = size * 2;
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
            ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
            ctx.stroke();
            }
            break;
        }

        case 'gravitychoke': {
            ctx.translate(x, y);
            
            // Swirling vortex effect
            const vortexRings = 5;
            for (let i = 0; i < vortexRings; i++) {
            const ringPhase = (time * 2 - i * 0.2) % 1;
            const ringRadius = size * (1 + i * 0.4);
            const ringAlpha = brightness * (1 - ringPhase) * 0.6;
            
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = ringAlpha;
            
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            }
            
            // Center gravity well
            const wellGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
            wellGrad.addColorStop(0, 'rgba(155, 74, 255, 0.9)');
            wellGrad.addColorStop(0.5, 'rgba(100, 50, 200, 0.5)');
            wellGrad.addColorStop(1, 'rgba(50, 20, 100, 0)');
            ctx.globalAlpha = brightness;
            ctx.fillStyle = wellGrad;
            ctx.beginPath();
            ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Orbiting particles
            for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 3;
            const orbitR = size * 1.5;
            const px = Math.cos(angle) * orbitR;
            const py = Math.sin(angle) * orbitR;
            
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = brightness * 0.8;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
            }
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

        // Draw theme name
        const themeName = env.themeName;
        if (themeName) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = env.accentTorch;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(themeName, width - 180, 35);
        ctx.restore();
        }

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

            if (tileId > 0) {
            let brightness = 1.0 - (hit.distance / RENDER_DISTANCE);
            
            const depthFactor =
                0.9 - Math.max(0, Math.min(0.4, (currentLevel - 1) * 0.03));
            brightness *= depthFactor;
            
            if (hit.side === 1) brightness *= 0.75;
            
            const dither =
                (i + Math.floor(sliceY / PIXEL_STEP)) % 2 === 0 ? 0.95 : 1.05;
            brightness *= dither;
            
            // 💡 Use accent color for secret doors, normal palette otherwise
            let baseHex;
            if (tileId === TILE_SECRET_DOOR) {
                baseHex =
                env.accentTorch ||
                env.accent ||
                env.wallPalette[4] || // fallback to a "special" wall
                '#7b4fb8';
            } else {
                baseHex = env.wallPalette[tileId] || '#3a3248';
            }
            
            const { r, g, b } = hexToRgb(baseHex);
            
            let rr = Math.max(0, Math.min(255, r * brightness));
            let gg = Math.max(0, Math.min(255, g * brightness));
            let bb = Math.max(0, Math.min(255, b * brightness));
            
            // ✨ Rune-like pulse for secret doors when you're somewhat close
            if (tileId === TILE_SECRET_DOOR && hit.distance < 8) {
                const pulse = 0.85 + 0.25 * Math.sin(time * 3 + i * 0.35);
            
                rr = Math.min(255, rr * pulse + 20);
                gg = Math.min(255, gg * pulse + 5);
                bb = Math.min(255, bb * pulse + 40);
            }
            
            ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
            ctx.fillRect(
                Math.floor(x),
                sliceY,
                Math.ceil(sliceWidth) + 1,
                sliceHeight
            );
            
            // existing highlight / shadow / scanline stuff stays the same
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

        // N64-style environmental details per theme
        const theme = getCurrentTheme(currentLevel);
        
        // Draw atmospheric particles/effects based on theme
        ctx.save();
        for (let i = 0; i < RESOLUTION; i += 8) {
        const rayAngle = startAngle + i * rayAngleStep;
        const hit = castRay(player, rayAngle, dungeon);
        
        if (hit && hit.distance < RENDER_DISTANCE) {
            const sliceWidth = width / RESOLUTION;
            const x = i * sliceWidth;
            const wallHeightRaw = hit.distance > 0.1 ? height / hit.distance : height * 2;
            const baseWallHeight = Math.max(PIXEL_STEP, Math.floor(wallHeightRaw / PIXEL_STEP) * PIXEL_STEP);
            const yRaw = horizon - baseWallHeight / 2;
            const sliceY = Math.floor(yRaw / PIXEL_STEP) * PIXEL_STEP;
            const sliceHeight = baseWallHeight;
            const brightness = 1.0 - (hit.distance / RENDER_DISTANCE);
            
            // Theme-specific wall details
            if (themeName === 'lava' && hit.tile === 4) {
            // Glowing lava cracks
            const glowIntensity = 0.3 + Math.sin(time * 3 + i * 0.5) * 0.2;
            ctx.fillStyle = `rgba(255, 100, 0, ${glowIntensity * brightness})`;
            ctx.fillRect(x, sliceY, Math.ceil(sliceWidth) + 1, sliceHeight);
            
            // Flowing lava effect
            const flowOffset = (time * 20 + i * 2) % (sliceHeight / 4);
            ctx.strokeStyle = `rgba(255, 150, 0, ${0.4 * brightness})`;
            ctx.lineWidth = 2;
            for (let flow = 0; flow < sliceHeight; flow += sliceHeight / 4) {
                ctx.beginPath();
                ctx.moveTo(x, sliceY + flow + flowOffset);
                ctx.lineTo(x + sliceWidth, sliceY + flow + flowOffset);
                ctx.stroke();
            }
            }
            
            if (themeName === 'ice' && brightness > 0.4) {
            // Ice crystals and frost
            const crystalChance = Math.sin(i * 13.37 + hit.tileX * 7.89) * 0.5 + 0.5;
            if (crystalChance > 0.7) {
                ctx.fillStyle = `rgba(150, 200, 255, ${0.3 * brightness})`;
                const crystalSize = 3 + Math.floor(crystalChance * 5);
                const crystalY = sliceY + Math.floor(Math.sin(i * 3.14) * sliceHeight * 0.3);
                ctx.fillRect(x + sliceWidth / 2 - crystalSize / 2, crystalY, crystalSize, crystalSize * 2);
                
                // Sparkle effect
                if (Math.sin(time * 5 + i) > 0.8) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * brightness})`;
                ctx.fillRect(x + sliceWidth / 2 - 1, crystalY, 2, 2);
                }
            }
            }
            
            if (themeName === 'toxic') {
            // Dripping slime
            const dripSeed = Math.sin(i * 9.876 + time * 0.5) * 0.5 + 0.5;
            if (dripSeed > 0.75) {
                const dripLength = Math.floor(baseWallHeight * 0.15 * dripSeed);
                ctx.strokeStyle = `rgba(100, 180, 50, ${0.4 * brightness})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + sliceWidth / 2, sliceY);
                ctx.lineTo(x + sliceWidth / 2, sliceY + dripLength);
                ctx.stroke();
                
                // Drip blob
                ctx.fillStyle = `rgba(100, 200, 50, ${0.5 * brightness})`;
                ctx.beginPath();
                ctx.arc(x + sliceWidth / 2, sliceY + dripLength, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Glowing fungus patches
            if (hit.tile === 3 || hit.tile === 6) {
                const fungusGlow = 0.2 + Math.sin(time * 2 + i * 0.7) * 0.15;
                ctx.fillStyle = `rgba(150, 255, 100, ${fungusGlow * brightness})`;
                const patchY = sliceY + sliceHeight * 0.6;
                ctx.fillRect(x, patchY, sliceWidth, sliceHeight * 0.3);
            }
            }
            
            if (themeName === 'shadow') {
            // Floating shadow wisps
            const wispChance = Math.sin(i * 11.11 + time * 0.8) * 0.5 + 0.5;
            if (wispChance > 0.8) {
                const wispY = sliceY + Math.sin(time * 2 + i * 0.5) * (sliceHeight * 0.3);
                const wispSize = 4 + Math.sin(time * 3 + i) * 2;
                
                const gradient = ctx.createRadialGradient(
                x + sliceWidth / 2, wispY, 0,
                x + sliceWidth / 2, wispY, wispSize * 2
                );
                gradient.addColorStop(0, `rgba(170, 100, 255, ${0.4 * brightness})`);
                gradient.addColorStop(1, 'rgba(170, 100, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x + sliceWidth / 2, wispY, wispSize * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Creeping darkness at wall edges
            if (hit.side === 1) {
                ctx.fillStyle = `rgba(10, 5, 20, ${0.3 * brightness})`;
                ctx.fillRect(x, sliceY, sliceWidth * 0.3, sliceHeight);
            }
            }
            
            if (themeName === 'crypt') {
            // Cobwebs
            if (hit.tile === 5) {
                const webY = sliceY + sliceHeight * 0.1;
                ctx.strokeStyle = `rgba(200, 200, 200, ${0.2 * brightness})`;
                ctx.lineWidth = 1;
                for (let web = 0; web < 3; web++) {
                ctx.beginPath();
                ctx.moveTo(x, webY + web * 4);
                ctx.lineTo(x + sliceWidth, webY + web * 4 + 2);
                ctx.stroke();
                }
            }
            
            // Blood stains
            if (hit.tile === 4) {
                const stainAlpha = 0.3 * brightness * (Math.sin(i * 7.77) * 0.3 + 0.7);
                ctx.fillStyle = `rgba(100, 20, 20, ${stainAlpha})`;
                const stainHeight = sliceHeight * 0.4;
                ctx.fillRect(x, sliceY + sliceHeight - stainHeight, sliceWidth, stainHeight);
            }
            }
        }
        }
        ctx.restore();
        
        // Floor/ceiling atmospheric effects
        ctx.save();
        
        if (themeName === 'lava') {
        // Lava glow on floor
        const lavaGlow = ctx.createLinearGradient(0, floorStart, 0, height);
        lavaGlow.addColorStop(0, 'rgba(255, 80, 0, 0.15)');
        lavaGlow.addColorStop(0.5, 'rgba(200, 60, 0, 0.08)');
        lavaGlow.addColorStop(1, 'rgba(150, 40, 0, 0)');
        ctx.fillStyle = lavaGlow;
        ctx.fillRect(0, floorStart, width, height - floorStart);
        
        // Heat wave distortion effect (simulated with bands)
        for (let wave = 0; wave < 5; wave++) {
            const waveY = floorStart + (height - floorStart) * (wave / 5);
            const waveOffset = Math.sin(time * 2 + wave) * 10;
            ctx.fillStyle = `rgba(255, 100, 0, ${0.03})`;
            ctx.fillRect(waveOffset, waveY, width, (height - floorStart) / 5);
        }
        }
        
        if (themeName === 'ice') {
        // Frost fog near floor
        const frostFog = ctx.createLinearGradient(0, floorStart, 0, height);
        frostFog.addColorStop(0, 'rgba(200, 230, 255, 0.12)');
        frostFog.addColorStop(1, 'rgba(150, 200, 240, 0)');
        ctx.fillStyle = frostFog;
        ctx.fillRect(0, floorStart, width, height - floorStart);
        }
        
        if (themeName === 'toxic') {
        // Toxic mist
        const toxicMist = ctx.createLinearGradient(0, floorStart, 0, height);
        toxicMist.addColorStop(0, 'rgba(100, 180, 50, 0.15)');
        toxicMist.addColorStop(1, 'rgba(80, 150, 40, 0.05)');
        ctx.fillStyle = toxicMist;
        ctx.fillRect(0, floorStart, width, height - floorStart);
        
        // Bubbling effect
        for (let bubble = 0; bubble < 10; bubble++) {
            const bubbleX = (Math.sin(time * 1.5 + bubble * 2.1) * 0.5 + 0.5) * width;
            const bubbleY = floorStart + (Math.sin(time * 2 + bubble * 1.7) * 0.5 + 0.5) * (height - floorStart);
            const bubbleSize = 3 + Math.sin(time * 3 + bubble) * 2;
            
            ctx.fillStyle = `rgba(150, 220, 80, 0.3)`;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
            ctx.fill();
        }
        }
        
        if (themeName === 'shadow') {
        // Dark tendrils rising from floor
        for (let tendril = 0; tendril < 8; tendril++) {
            const tendrilX = (tendril / 8) * width + Math.sin(time * 1.2 + tendril) * 30;
            const tendrilHeight = 80 + Math.sin(time * 1.5 + tendril * 2) * 40;
            
            const tendrilGrad = ctx.createLinearGradient(
            tendrilX, height,
            tendrilX, height - tendrilHeight
            );
            tendrilGrad.addColorStop(0, 'rgba(50, 20, 80, 0.25)');
            tendrilGrad.addColorStop(1, 'rgba(50, 20, 80, 0)');
            
            ctx.fillStyle = tendrilGrad;
            ctx.fillRect(tendrilX - 15, height - tendrilHeight, 30, tendrilHeight);
        }
        }
        
        if (themeName === 'crypt') {
        // Ghostly fog
        const cryptFog = ctx.createLinearGradient(0, floorStart, 0, height);
        cryptFog.addColorStop(0, 'rgba(180, 170, 200, 0.08)');
        cryptFog.addColorStop(1, 'rgba(160, 150, 180, 0)');
        ctx.fillStyle = cryptFog;
        ctx.fillRect(0, floorStart, width, height - floorStart);
        }
        ctx.restore();

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

            // Gravity suspension effect
            if (sprite.gravitySuspended) {
                ctx.save();
                
                // Purple gravity field
                const fieldGrad = ctx.createRadialGradient(
                screenX, y + spriteHeight / 2, 0,
                screenX, y + spriteHeight / 2, spriteWidth * 0.8
                );
                fieldGrad.addColorStop(0, 'rgba(155, 74, 255, 0.4)');
                fieldGrad.addColorStop(1, 'rgba(155, 74, 255, 0)');
                ctx.fillStyle = fieldGrad;
                ctx.beginPath();
                ctx.arc(screenX, y + spriteHeight / 2, spriteWidth * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Floating particles
                for (let p = 0; p < 6; p++) {
                const angle = (p / 6) * Math.PI * 2 + time * 2;
                const radius = spriteWidth * 0.4;
                const px = screenX + Math.cos(angle) * radius;
                const py = y + spriteHeight / 2 + Math.sin(angle) * radius;
                
                ctx.fillStyle = '#bb88ff';
                ctx.globalAlpha = 0.8 * brightness;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
                }
                
                ctx.restore();
            }
        
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

        // Damage vignette overlay (light at low damage, solid at high damage)
        if (damageVignette > 0.01) {
        const t = Math.max(0, Math.min(1, damageVignette)); // clamp 0–1
        const minDim = Math.min(width, height);
        
        // As damage increases:
        // - inner radius shrinks (vignette creeps inward)
        // - outer radius grows slightly
        const innerRadius = minDim * (0.55 - 0.35 * t); // 0.55 → 0.20
        const outerRadius = minDim * (0.75 + 0.15 * t); // 0.75 → 0.90
        
        // Start very light, get more solid with damage
        const alpha = 0.12 + 0.45 * Math.pow(t, 1.2); // gentle at first, steeper near 1
        
        const vignetteGrad = ctx.createRadialGradient(
            width / 2, height / 2, innerRadius,
            width / 2, height / 2, outerRadius
        );
        
        vignetteGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
        vignetteGrad.addColorStop(1, `rgba(255, 0, 0, ${alpha})`);
        
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);
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

        // Draw chests on minimap
        chests.forEach(chest => {
        if (chest.opened) return;
        
        ctx.fillStyle = chest.inSecretRoom ? '#ffd700' : '#8b4513';
        ctx.beginPath();
        ctx.arc(
            minimapX + chest.x * minimapScale,
            minimapY + chest.y * minimapScale,
            3,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Gold ring for secret chests
        if (chest.inSecretRoom) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
            minimapX + chest.x * minimapScale,
            minimapY + chest.y * minimapScale,
            5,
            0,
            Math.PI * 2
            );
            ctx.stroke();
        }
        });

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

        // Draw chests in 3D view
        chests.forEach(chest => {
        if (chest.opened) return;
        
        const dx = chest.x - player.x;
        const dy = chest.y - player.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > RENDER_DISTANCE) return;
        
        let angleToChest = Math.atan2(dy, dx) - player.angle;
        
        while (angleToChest > Math.PI) angleToChest -= Math.PI * 2;
        while (angleToChest < -Math.PI) angleToChest += Math.PI * 2;
        
        const halfFov = (FOV * Math.PI / 180) / 2;
        if (Math.abs(angleToChest) > halfFov) return;
        
        const screenX = (angleToChest / (FOV * Math.PI / 180) + 0.5) * width;
        
        const spriteHeightRaw = height / distance;
        const spriteHeight = Math.max(
            PIXEL_STEP,
            Math.floor(spriteHeightRaw / PIXEL_STEP) * PIXEL_STEP
        );
        const spriteWidth = spriteHeight * 0.8;
        
        const x = Math.floor((screenX - spriteWidth / 2) / PIXEL_STEP) * PIXEL_STEP;
        const yRaw = horizon - spriteHeight / 2;
        const y = Math.floor(yRaw / PIXEL_STEP) * PIXEL_STEP;
        
        const screenSlice = Math.floor(screenX / (width / RESOLUTION));
        if (
            screenSlice >= 0 &&
            screenSlice < RESOLUTION &&
            distance < zBuffer[screenSlice]
        ) {
            let brightness = 1.0 - (distance / RENDER_DISTANCE) * 0.5;
            brightness = Math.max(0.2, Math.min(1.0, brightness));
            
            ctx.save();
            ctx.globalAlpha = brightness;
            
            // Draw chest body
            ctx.fillStyle = chest.inSecretRoom ? '#8b4513' : '#654321';
            ctx.fillRect(x, y + spriteHeight * 0.3, spriteWidth, spriteHeight * 0.7);
            
            // Draw chest lid
            ctx.fillStyle = chest.inSecretRoom ? '#a0522d' : '#7a5230';
            ctx.fillRect(x, y + spriteHeight * 0.3, spriteWidth, spriteHeight * 0.3);
            
            // Draw lock/keyhole
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(
            x + spriteWidth * 0.4,
            y + spriteHeight * 0.5,
            spriteWidth * 0.2,
            spriteHeight * 0.15
            );
            
            // Glow effect for secret chests
            if (chest.inSecretRoom) {
            const glowGrad = ctx.createRadialGradient(
                screenX, y + spriteHeight / 2, 0,
                screenX, y + spriteHeight / 2, spriteWidth * 1.5
            );
            glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(screenX, y + spriteHeight / 2, spriteWidth * 1.5, 0, Math.PI * 2);
            ctx.fill();
            }
            
            ctx.restore();
        }
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

        // Fade damage vignette
        setDamageVignette(prev => Math.max(0, prev - deltaTime * 2));

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
            let effectiveMoveSpeed = MOVE_SPEED * speedBonus;
            
            // Apply class bonuses
            if (currentClass) {
            const classData = PRESTIGE_CLASSES[currentClass];
            if (classData.bonuses.speedMultiplier) {
                effectiveMoveSpeed *= classData.bonuses.speedMultiplier;
            }
            if (classData.bonuses.hasteSelf) {
                effectiveMoveSpeed *= classData.bonuses.hasteSelf;
            }
            }

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
            
            const next = { ...prev, x: newX, y: newY, angle: newAngle, mana: newMana };
            playerRef.current = next;
            return next;
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
                // Check arcane ward
                if (playerBuffs.arcaneWard.active) {
                    const newHits = playerBuffs.arcaneWard.hits + 1;
                    
                    setPlayerBuffs(prev => ({
                    ...prev,
                    arcaneWard: {
                        ...prev.arcaneWard,
                        hits: newHits,
                        active: newHits < prev.arcaneWard.maxHits
                    }
                    }));
                    
                    createParticleEffect(player.x, player.y, '#4a9eff', 20, 'explosion');
                    addScreenShake(0.2);
                    
                    if (newHits >= playerBuffs.arcaneWard.maxHits) {
                    showNotification('Shield Broken!', 'blue');
                    }
                } else {
                    soundEffectsRef.current?.playerHit?.();
                    setDamageVignette(1.0);
                    
                    setPlayer(p => ({
                    ...p,
                    health: Math.max(0, p.health - proj.damage)
                    }));
                }
                
                createParticleEffect(proj.x, proj.y, proj.color, 12, 'explosion');
                addScreenShake(0.4);
                // Projectile hit player, don't add to remaining
                } else {
                // Enemy projectile didn't hit yet, keep it
                remaining.push(proj);
                }
                return; // Skip the player projectile logic below
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

                    soundEffectsRef.current?.hit?.();
                    
                    // Damage / crits
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
                    
                    // Hit particles
                    createParticleEffect(proj.x, proj.y, enemy.color, 8, 'hit');
                    addScreenShake(0.2);
                    
                    if (newHealth <= 0) {
                        soundEffectsRef.current?.death?.();
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
                        
                        const essenceGainUpgrade = Number(permanentUpgrades?.essenceGain ?? 0);
                        const baseEssence = Number(enemy?.essence ?? 0);

                        const essenceBonus = 1 + essenceGainUpgrade * 0.2;
                        const gainedEssence = Math.floor(baseEssence * essenceBonus) || 0;

                        setEssence(prev => {
                        const safePrev = Number.isFinite(prev) ? prev : 0;
                        return safePrev + gainedEssence;
                        });
                        
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
        
                // Ranged enemy behavior
                if (ENEMY_TYPES[enemy.type]?.isRanged) {
                const idealRange = ENEMY_TYPES[enemy.type].attackRange * 0.7;
                
                if (distance < idealRange - 2) {
                    // Too close, back away
                    const awayAngle = Math.atan2(-dy, -dx);
                    const moveAmount = enemy.speed * deltaTime;
                    const testX = enemy.x + Math.cos(awayAngle) * moveAmount;
                    const testY = enemy.y + Math.sin(awayAngle) * moveAmount;
                    
                    const tileX = Math.floor(testX);
                    const tileY = Math.floor(testY);
                    
                    if (
                    tileX >= 0 && tileX < DUNGEON_SIZE &&
                    tileY >= 0 && tileY < DUNGEON_SIZE &&
                    dungeon[tileY][tileX] === 0
                    ) {
                    newX = testX;
                    newY = testY;
                    }
                    newAngle = awayAngle;
                } else if (distance > idealRange + 2) {
                    // Too far, move closer (use pathfinding)
                    const ex = Math.floor(enemy.x);
                    const ey = Math.floor(enemy.y);
        
                    if (ex >= 0 && ex < DUNGEON_SIZE && ey >= 0 && ey < DUNGEON_SIZE) {
                    const hereDist = distField[ey]?.[ex] ?? Infinity;
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
                        newX = enemy.x;
                        newY = enemy.y;
                        }
                    }
                    }
                } else {
                    // In ideal range, just aim at player
                    newAngle = Math.atan2(dy, dx);
                }
                
                // Shoot at player if in range and cooldown ready
                if (distance <= ENEMY_TYPES[enemy.type].attackRange && newAttackCooldown <= 0) {
                    const angleToPlayer = Math.atan2(dy, dx);
                    const spawnOffset = 0.7;

                    const spawnX = newX + Math.cos(angleToPlayer) * spawnOffset;
                    const spawnY = newY + Math.sin(angleToPlayer) * spawnOffset;

                    setProjectiles(projs => [
                    ...projs,
                    {
                        id: Math.random(),
                        x: spawnX,
                        y: spawnY,
                        angle: angleToPlayer,
                        speed: 6,
                        damage: enemy.damage,
                        color: enemy.color,
                        lifetime: 4,
                        dead: false,
                        spellType: 'enemy',
                        isEnemyProjectile: true
                    }
                    ]);

                    newAttackCooldown = ENEMY_TYPES[enemy.type].attackCooldown;
                    addScreenShake(0.2);
                }
                }
                // Boss special attacks
                else if (enemy.isBoss && distance < 8 && newAttackCooldown <= 0) {
                const angleToPlayer = Math.atan2(dy, dx);
                const spawnOffset = 0.7;

                const spawnX = newX + Math.cos(angleToPlayer) * spawnOffset;
                const spawnY = newY + Math.sin(angleToPlayer) * spawnOffset;

                setProjectiles(projs => [
                    ...projs,
                    {
                    id: Math.random(),
                    x: spawnX,
                    y: spawnY,
                    angle: angleToPlayer,
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
                // Melee enemy pathfinding
                else if (!ENEMY_TYPES[enemy.type]?.isRanged) {
                const ex = Math.floor(enemy.x);
                const ey = Math.floor(enemy.y);
        
                if (ex >= 0 && ex < DUNGEON_SIZE && ey >= 0 && ey < DUNGEON_SIZE) {
                    const hereDist = distField[ey]?.[ex] ?? Infinity;
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
        
                // Melee attack
                if (distance < 1.5 && newAttackCooldown <= 0) {
                    newState = 'attacking';
                    
                    // Check arcane ward
                    if (playerBuffs.arcaneWard.active) {
                    const newHits = playerBuffs.arcaneWard.hits + 1;
                    
                    setPlayerBuffs(prev => ({
                        ...prev,
                        arcaneWard: {
                        ...prev.arcaneWard,
                        hits: newHits,
                        active: newHits < prev.arcaneWard.maxHits
                        }
                    }));
                    
                    createParticleEffect(player.x, player.y, '#4a9eff', 20, 'explosion');
                    addScreenShake(0.3);
                    
                    if (newHits >= playerBuffs.arcaneWard.maxHits) {
                        showNotification('Shield Broken!', 'blue');
                    }
                    } else {
                    setPlayer(p => ({
                        ...p,
                        health: Math.max(0, p.health - enemy.damage)
                    }));
        
                    soundEffectsRef.current?.playerHit?.();
                    setDamageVignette(1.0);
                    addScreenShake(0.5);
                    createParticleEffect(player.x, player.y, '#ff0000', 15, 'hit');
                    }
        
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
                }
            } else {
                newState = 'idle';
            }

            // Boss 50% HP minion summon
            if (enemy.isBoss && !enemy.hasSummonedMinions) {
                const hpPercent = enemy.health / enemy.maxHealth;

                if (hpPercent <= 0.5) {
                enemy.hasSummonedMinions = true;

                createParticleEffect(enemy.x, enemy.y, '#ff8800', 35, 'explosion');
                addScreenShake(0.5);
                showNotification('👹 The boss summons reinforcements!', 'orange');

                const minionCount = Math.min(4 + Math.floor(currentLevel / 3), 8);

                for (let i = 0; i < minionCount; i++) {
                    const angle = (Math.PI * 2 * i) / minionCount;
                    const dist = 2 + Math.random() * 1.5;
                    const spawnX = enemy.x + Math.cos(angle) * dist;
                    const spawnY = enemy.y + Math.sin(angle) * dist;

                    const minionType = Math.random() < 0.5 ? 'demon' : 'skeleton';
                    const base = ENEMY_TYPES[minionType];

                    setEnemies(prevEnemies => [
                    ...prevEnemies,
                    {
                        id: Math.random(),
                        x: spawnX,
                        y: spawnY,
                        type: minionType,
                        health: base.health * (1 + currentLevel * 0.15),
                        maxHealth: base.health * (1 + currentLevel * 0.15),
                        damage: base.damage * (1 + currentLevel * 0.1),
                        speed: base.speed,
                        xp: base.xp * currentLevel,
                        gold: base.gold * currentLevel,
                        essence: base.essence,
                        color: base.color,
                        angle: Math.random() * Math.PI * 2,
                        state: 'idle',
                        attackCooldown: 0,
                        isBoss: false
                    }
                    ]);
                }
                }
            }
        
            // Update status effects (burn, freeze)
            let effectiveHealth = enemy.health;
            let effectiveSpeed = enemy.speed;
            let effectiveFrozen = enemy.frozen || false;
            let effectiveFreezeTimer = enemy.freezeTimer || 0;
            let effectiveBurning = enemy.burning || false;
            let effectiveBurnTimer = enemy.burnTimer || 0;
            
            if (effectiveFrozen && effectiveFreezeTimer > 0) {
                effectiveFreezeTimer -= deltaTime;
                if (effectiveFreezeTimer <= 0) {
                effectiveFrozen = false;
                effectiveSpeed = enemy.speed;
                }
            }
            
            if (effectiveBurning && effectiveBurnTimer > 0) {
                effectiveBurnTimer -= deltaTime;
                effectiveHealth -= (enemy.burnDamage || 0) * deltaTime;
                
                if (Math.random() < 0.1) {
                createParticleEffect(enemy.x, enemy.y, '#ef4444', 3, 'hit');
                }
                
                if (effectiveBurnTimer <= 0) {
                effectiveBurning = false;
                }
            }
            
            return {
                ...enemy,
                x: newX,
                y: newY,
                angle: newAngle,
                state: newState,
                attackCooldown: newAttackCooldown,
                frozen: effectiveFrozen,
                freezeTimer: effectiveFreezeTimer,
                burning: effectiveBurning,
                burnTimer: effectiveBurnTimer,
                health: effectiveHealth
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
            },
            arcaneWard: prev.arcaneWard
        }));

        // Update gravity suspended enemies
        setEnemies(prevEnemies =>
            prevEnemies
            .map(enemy => {
                if (!enemy.gravitySuspended) return enemy;
        
                const oldTimer = enemy.suspendTimer || 0;
                const oldDamageTimer = enemy.suspendDamageTimer || 0;
        
                const newTimer = Math.max(0, oldTimer - deltaTime);
                let newDamageTimer = oldDamageTimer + deltaTime;
                let newHealth = enemy.health;
        
                // Apply damage every second while suspended
                if (newDamageTimer >= 1.0) {
                // one tick of damage per second (you can scale this later)
                newHealth -= 10;
                createParticleEffect(enemy.x, enemy.y, '#9b4aff', 8, 'hit');
                newDamageTimer -= 1.0;
                }
        
                // If they die while suspended
                if (newHealth <= 0) {
                soundEffectsRef.current?.death?.();
                createParticleEffect(enemy.x, enemy.y, enemy.color, 20, 'explosion');
                addScreenShake(enemy.isBoss ? 0.8 : 0.3);
        
                // Combo + rewards
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
        
                // Essence
                const essenceGainUpgrade = Number(permanentUpgrades?.essenceGain ?? 0);
                const baseEssence = Number(enemy?.essence ?? 0);
                const essenceBonus = 1 + essenceGainUpgrade * 0.2;
                const gainedEssence = Math.floor(baseEssence * essenceBonus) || 0;
                setEssence(prev => {
                    const safePrev = Number.isFinite(prev) ? prev : 0;
                    return safePrev + gainedEssence;
                });
        
                // Total kills tracker
                setTotalKills(prev => {
                    const newTotal = prev + 1;
                    if (newTotal % 100 === 0) {
                    showNotification(`🎯 ${newTotal} Total Kills!`, 'purple');
                    }
                    return newTotal;
                });
        
                // Lifesteal from suspended kill (uses same permanent upgrade)
                const lifeStealPercent = permanentUpgrades.lifeSteal * 0.02;
                const healAmount = 10 * lifeStealPercent; // based on DOT tick, tweak if you want
                if (healAmount > 0) {
                    setPlayer(p => ({
                    ...p,
                    health: Math.min(p.maxHealth, p.health + healAmount)
                    }));
                    createParticleEffect(player.x, player.y, '#00ff00', 5, 'hit');
                }
        
                return { ...enemy, health: 0, dead: true, gravitySuspended: false };
                }
        
                // Still suspended but alive
                return {
                ...enemy,
                health: newHealth,
                suspendTimer: newTimer,
                suspendDamageTimer: newDamageTimer,
                gravitySuspended: newTimer > 0
                };
            })
            .filter(e => !e.dead)
        );
        
        // Update item pickup
        setItems(prevItems =>
            prevItems.map(item => {
            if (item.collected) return item;
        
            const dist = Math.hypot(item.x - player.x, item.y - player.y);
            if (dist < 0.7) {
                soundEffectsRef.current?.pickup?.();
                createParticleEffect(item.x, item.y, item.color, 15, 'explosion');
        
                setPlayer(p => {
                if (item.type === 'health') {
                    return {
                    ...p,
                    health: Math.min(p.maxHealth, p.health + item.amount),
                    };
                } else if (item.type === 'mana') {
                    return {
                    ...p,
                    mana: Math.min(p.maxMana, p.mana + item.amount),
                    };
                } else if (item.type === 'gold') {
                    setTotalGold(prev => prev + item.amount);
                    return {
                    ...p,
                    gold: p.gold + item.amount,
                    };
                }
                return p;
                });
        
                if (item.type === 'powerup_damage') {
                setPlayerBuffs(prev => ({
                    ...prev,
                    damageBoost: {
                    active: true,
                    multiplier: item.multiplier,
                    timeLeft: item.duration,
                    },
                }));
                } else if (item.type === 'powerup_speed') {
                setPlayerBuffs(prev => ({
                    ...prev,
                    speedBoost: {
                    active: true,
                    multiplier: item.multiplier,
                    timeLeft: item.duration,
                    },
                }));
                } else if (item.type === 'powerup_invincible') {
                setPlayerBuffs(prev => ({
                    ...prev,
                    invincible: {
                    active: true,
                    timeLeft: item.duration,
                    },
                }));
                }
        
                return { ...item, collected: true };
            }
        
            return item;
            })
        );

        // Add chest checking RIGHT AFTER setItems:
        setChests(prevChests =>
            prevChests.map(chest => {
            if (chest.opened) return chest;
        
            const dist = Math.hypot(chest.x - player.x, chest.y - player.y);
            if (dist < 0.7) {
                createParticleEffect(chest.x, chest.y, '#ffaa00', 25, 'explosion');
                addScreenShake(0.3);
                soundEffectsRef.current?.pickup?.();
        
                if (chest.inSecretRoom) {
                showNotification('🗝️ Secret Chest!', 'yellow');
        
                const roll = Math.random();
                if (roll < 0.5) {
                    upgradeRandomPermanentStat();
                    setPlayer(p => ({
                    ...p,
                    maxHealth: p.maxHealth + 20,
                    health: p.health + 20,
                    maxMana: p.maxMana + 15,
                    mana: p.mana + 15,
                    }));
                } else {
                    unlockRandomSecretSpell();
                }
                } else {
                showNotification('💰 Chest Opened!', 'yellow');
                // You can drop bonus gold / items here if you want
                }
        
                return { ...chest, opened: true };
            }
        
            return chest;
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

        // Reveal secret doors (keyboard + controller)
        {
            const px = Math.floor(player.x);
            const py = Math.floor(player.y);

            const wantsReveal =
            keysPressed.current['f'] || gamepadState.revealPressed; // we'll wire this below

            if (wantsReveal) {
            setDungeon(prev => {
                const copy = prev.map(row => [...row]);
                const changed = revealNearbySecretDoors(px, py, copy);
                if (changed) {
                showNotification?.('A hidden passage opens...', 'purple');
                }
                return copy;
            });
            }
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
        
        setEssenceAtStart(essence);

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

        // Start music on first game start
        if (!musicInitializedRef.current && bgmRef.current && musicEnabled) {
        musicInitializedRef.current = true;
        const audio = bgmRef.current;
        audio.src = musicTracks[0];
        audio.load();
        audio.volume = 0;
        audio.play().catch(err => console.log('Audio play blocked:', err));
        fadeVolume(audio, musicVolume, 0.02);
        }
    };

    const nextLevel = () => {
        setShowShop(true);
    };

    const continueToNextLevel = () => {
        levelStartTimeRef.current = Date.now();
        const nextLevelNum = currentLevel + 1;
        setHighestLevel(prev => Math.max(prev, nextLevelNum));
        setCurrentLevel(nextLevelNum);
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
      const numericCurrent = Number.isFinite(current) ? current : 0;
      const numericMax = Number.isFinite(max) && max > 0 ? max : 1;
    
      const safeCurrent = Math.max(0, numericCurrent);
      const safeMax = numericMax;
      const percent = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
    
      return (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Icon size={16} style={{ color }} />
              <span className="text-xs text-white">{label}</span>
            </div>
            <span className="text-xs text-white">
              {Math.floor(safeCurrent)}/{safeMax}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full transition-all duration-150"
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

    if (showPrestigeOffer) {
        return (
        <div className="w-full h-screen bg-gradient-to-b from-yellow-900 via-orange-900 to-red-900 flex items-center justify-center overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <div className="text-8xl mb-4 animate-pulse">🎖️</div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                PRESTIGE AVAILABLE!
            </h1>
            <p className="text-2xl text-yellow-300 mb-6">
                You have reached level 50 in a permanent upgrade!
            </p>
            
            <div className="bg-black bg-opacity-60 p-6 rounded-lg mb-8">
                <h2 className="text-3xl text-orange-400 mb-4">Choose Your Path</h2>
                <p className="text-lg text-white mb-2">Prestiging will:</p>
                <ul className="text-left text-white space-y-2 max-w-2xl mx-auto">
                <li>✨ Reset all permanent upgrades to 0</li>
                <li>🎯 Grant you a powerful class with unique abilities</li>
                <li>📈 Increase game difficulty by 30%</li>
                <li>💎 Award {500 * (prestigeLevel + 1)} bonus Essence</li>
                <li>🏆 Your prestige level: {prestigeLevel} → {prestigeLevel + 1}</li>
                </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {prestigeClassChoices.map(classId => {
                const classData = PRESTIGE_CLASSES[classId];
                return (
                    <div
                    key={classId}
                    className="bg-black bg-opacity-70 p-6 rounded-lg border-4 border-yellow-500 hover:border-yellow-300 transition-all"
                    >
                    <div className="text-6xl mb-3">{classData.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{classData.name}</h3>
                    <p className="text-gray-300 mb-4">{classData.description}</p>
                    
                    <div className="text-left text-sm text-gray-200 space-y-1 mb-4">
                        <p className="font-bold text-yellow-400">Special Ability:</p>
                        <p>{classData.bonuses.specialAbility}</p>
                    </div>
                    
                    <button
                        onClick={() => acceptPrestige(classId)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                    >
                        Choose {classData.name}
                    </button>
                    </div>
                );
                })}
            </div>
            
            <button
                onClick={declinePrestige}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
                Decline (Keep Current Progress)
            </button>
            </div>
        </div>
        );
    }

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
            <p className="text-lg md:text-xl text-purple-300 mb-0">
                Essence: ✨ {essence}
            </p>
            <p className="text-sm text-gray-400">Total Runs: {totalRuns}</p>
            </div>

            {/* Scrollable upgrades list */}
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
                        if (!canAfford) return;
                        setEssence(prev => prev - cost);
                        setPermanentUpgrades(prev => {
                            const newLevel = prev[upgradeKey] + 1;
                            const next = {
                            ...prev,
                            [upgradeKey]: newLevel
                            };
                            
                            // Check if this upgrade or any stat hits 50
                            if (
                            newLevel === 50 ||
                            Object.values(next).some(level => level >= 50)
                            ) {
                            setTimeout(() => {
                                const allClasses = Object.keys(PRESTIGE_CLASSES);
                                const availableClasses = allClasses.filter(
                                c => c !== currentClass
                                );
                                const shuffled = [...availableClasses].sort(
                                () => Math.random() - 0.5
                                );
                                const choices = shuffled.slice(0, 3);
                                
                                setPrestigeClassChoices(choices);
                                setShowPrestigeOffer(true);
                            }, 500);
                            }
                            
                            return next;
                        });
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

            {/* Prestige Offer Button */}
            {Object.values(permanentUpgrades).some(level => level >= 50) &&
            !showPrestigeOffer && (
                <div className="px-4 pb-3">
                <button
                    onClick={() => {
                    const allClasses = Object.keys(PRESTIGE_CLASSES);
                    const availableClasses = allClasses.filter(
                        c => c !== currentClass
                    );
                    const shuffled = [...availableClasses].sort(
                        () => Math.random() - 0.5
                    );
                    const choices = shuffled.slice(0, 3);
                    
                    setPrestigeClassChoices(choices);
                    setShowPrestigeOffer(true);
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-8 rounded-lg text-lg animate-pulse"
                >
                    🎖️ PRESTIGE AVAILABLE - Click to View Options
                </button>
                </div>
            )}
            
            {/* Footer button */}
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
            {/* Header */}
            <div className="px-4 pt-4 pb-3 text-center bg-black bg-opacity-30">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-1">
                Spell Shop
            </h1>
            <p className="text-lg md:text-xl text-yellow-400">
                Gold: 💰 {player.gold}
            </p>
            </div>

            {/* Scrollable spell list */}
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
                        <h3 className="text-white font-bold text-base">
                            {spell.name}
                        </h3>
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
                            if (!canAfford) return;
                            setPlayer(prev => ({
                            ...prev,
                            gold: prev.gold - spell.price
                            }));
                            setPurchasedSpells(prev => [...prev, spell.key]);
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
                        if (equippedSpells.length >= 3) return;
                        setEquippedSpells(prev => [...prev, { ...spell }]);
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

            {/* Footer button */}
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
                WIZARD'S DESCENT
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

                {currentClass && (
                <div className="bg-black bg-opacity-60 p-4 rounded-lg mb-4">
                    <div className="text-center">
                    <div className="text-5xl mb-2">
                        {PRESTIGE_CLASSES[currentClass].icon}
                    </div>
                    <p className="text-xl text-yellow-400 font-bold">
                        {PRESTIGE_CLASSES[currentClass].name}
                    </p>
                    <p className="text-sm text-purple-300">
                        Prestige Level {prestigeLevel}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        {PRESTIGE_CLASSES[currentClass].bonuses.specialAbility}
                    </p>
                    </div>
                </div>
                )}
                
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
                <p className="text-xl text-yellow-400 font-bold">
                    Essence Earned: ✨ {
                    Math.max(
                        0,
                        Number.isFinite(essence - essenceAtStart)
                        ? Math.floor(essence - essenceAtStart)
                        : 0
                    )
                    }
                </p>
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
        <div
            className={`w-full h-screen bg-gradient-to-b ${
            isBossLevel
                ? 'from-yellow-600 via-orange-700 to-red-800'
                : 'from-yellow-600 via-yellow-700 to-orange-800'
            } flex items-center justify-center`}
        >
            <div className="text-center px-4">
            {isBossLevel && (
                <Crown className="mx-auto mb-4 text-yellow-300" size={80} />
            )}
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
            <div className="text-center bg-gray-800 p-6 md:p-8 rounded-lg mx-4 max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Paused
            </h1>

            <div className="space-y-4 mb-6">
                <div>
                <button
                    onClick={() => setMusicEnabled(prev => !prev)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm mb-2 w-full"
                >
                    {musicEnabled ? '🔊 Music: On' : '🔇 Music: Off'}
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-white text-xs">Volume:</span>
                    <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={musicVolume}
                    onChange={e => setMusicVolume(parseFloat(e.target.value))}
                    className="flex-1"
                    />
                    <span className="text-white text-xs">
                    {Math.round(musicVolume * 100)}%
                    </span>
                </div>
                </div>

                <div>
                <button
                    onClick={() => setSoundEffectsEnabled(prev => !prev)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm mb-2 w-full"
                >
                    {soundEffectsEnabled ? '🔊 SFX: On' : '🔇 SFX: Off'}
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-white text-xs">Volume:</span>
                    <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sfxVolume}
                    onChange={e => setSfxVolume(parseFloat(e.target.value))}
                    className="flex-1"
                    />
                    <span className="text-white text-xs">
                    {Math.round(sfxVolume * 100)}%
                    </span>
                </div>
                </div>
            </div>

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
        {notification && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
            <div className="bg-black bg-opacity-90 px-6 py-3 rounded-lg text-white font-bold text-lg animate-pulse">
                {notification.text}
            </div>
            </div>
        )}
        
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
            <div
                className={`bg-black bg-opacity-60 rounded-lg ${
                isMobile ? 'p-2 w-36' : 'p-3 md:p-4 w-52 md:w-64'
                }`}
            >
                {!isMobile && (
                <div className="text-white text-xs md:text-sm mb-2 flex justify-between">
                    <span>Level {player.level}</span>
                    <span>Dungeon {currentLevel}</span>
                </div>
                )}
                
                {isMobile ? (
                <>
                  {/* Health */}
                  <div className="flex items-center gap-1 mb-1">
                    <Heart size={12} style={{ color: '#f87171' }} />
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full transition-all bg-red-400"
                        style={{
                          width: (() => {
                            const hp = Number.isFinite(player.health) ? player.health : 0;
                            const maxHp = Number.isFinite(player.maxHealth) && player.maxHealth > 0
                              ? player.maxHealth
                              : 1;
                            const pct = (hp / maxHp) * 100;
                            return `${Math.max(0, Math.min(100, pct))}%`;
                          })()
                        }}
                      />
                    </div>
                  </div>
              
                  {/* Mana */}
                  <div className="flex items-center gap-1 mb-1">
                    <Droplet size={12} style={{ color: '#60a5fa' }} />
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full transition-all bg-blue-400"
                        style={{
                          width: (() => {
                            const mana = Number.isFinite(player.mana) ? player.mana : 0;
                            const maxMana = Number.isFinite(player.maxMana) && player.maxMana > 0
                              ? player.maxMana
                              : 1;
                            const pct = (mana / maxMana) * 100;
                            return `${Math.max(0, Math.min(100, pct))}%`;
                          })()
                        }}
                      />
                    </div>
                  </div>
              
                  {/* Tiny footer */}
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
                      <span>XP: {Math.floor(player.xp)}/{player.xpToNext}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${(player.xp / player.xpToNext) * 100}%` }}
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
                    textShadow:
                        '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.5)'
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
                {playerBuffs.arcaneWard.active && (
                <div className="bg-blue-600 bg-opacity-80 px-3 py-2 rounded-lg text-white text-sm">
                    🛡️ Arcane Ward:{' '}
                    {playerBuffs.arcaneWard.maxHits -
                    playerBuffs.arcaneWard.hits}{' '}
                    hits left
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

        {/* Spell bar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex gap-2 md:gap-3">
            {equippedSpells.map((spell, index) => {
                const Icon = spell.icon;
                const isSelected = index === selectedSpell;
                const isReady = spell.cooldown <= 0 && player.mana >= spell.manaCost;
                const isUtility = spell.isUtility;
            
                return (
                <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedSpell(index)}
                    className={`bg-black bg-opacity-70 p-2 md:p-3 rounded-lg border-2 transition-all relative ${
                    isSelected
                        ? 'border-yellow-400 scale-110'
                        : 'border-gray-600'
                    } ${!isReady ? 'opacity-50' : ''}`}
                >
                    {/* Utility indicator */}
                    {isUtility && (
                    <div className="absolute -top-1 -right-1 bg-cyan-500 rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                        <span className="text-white text-[8px] md:text-[10px] font-bold">
                        U
                        </span>
                    </div>
                    )}
                    
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

        {/* Boss intro overlay */}
        {bossIntro && bossIntro.timer > 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center pointer-events-none z-50">
            <div className="text-center animate-pulse">
                <div className="text-8xl mb-4">⚔️</div>
                <div
                className="text-6xl font-bold text-red-500 mb-4"
                style={{
                    textShadow:
                    '0 0 30px rgba(255,0,0,0.8), 0 0 60px rgba(255,0,0,0.5)'
                }}
                >
                BOSS FIGHT
                </div>
                <div className="text-4xl text-red-300">{bossIntro.name}</div>
            </div>
            </div>
        )}
        
        {/* Mobile controls overlay */}
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
