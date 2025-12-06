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
    { name: 'Fireball', damage: 25, manaCost: 15, cooldown: 0, maxCooldown: 1.0, color: '#ff4400', icon: Flame },
    { name: 'Ice Shard', damage: 15, manaCost: 10, cooldown: 0, maxCooldown: 0.5, color: '#00aaff', icon: Droplet },
    { name: 'Lightning', damage: 40, manaCost: 25, cooldown: 0, maxCooldown: 2.0, color: '#ffff00', icon: Zap }
  ]);
  const [selectedSpell, setSelectedSpell] = useState(0);

  // Dungeon & entities
  const [dungeon, setDungeon] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [items, setItems] = useState([]);
  const [projectiles, setProjectiles] = useState([]);

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
  const gamepadStateRef = useRef({ lx: 0, ly: 0, rx: 0, fire: false });
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Constants
  const DUNGEON_SIZE = 30;
  const FOV = 60;
  const RENDER_DISTANCE = 20;
  const RESOLUTION = 320;
  const MOVE_SPEED = 3;
  const TURN_SPEED = 2;

  // Wall types
  const WALL_TYPES = {
    0: null, // empty
    1: { color: '#4a5568', name: 'Stone' },
    2: { color: '#8b4513', name: 'Wood' },
    3: { color: '#2d5016', name: 'Moss' },
    4: { color: '#8b0000', name: 'Blood' }
  };

  // Enemy types
  const ENEMY_TYPES = {
    skeleton: { health: 30, damage: 10, speed: 1.5, xp: 15, color: '#cccccc', gold: 5 },
    demon: { health: 50, damage: 15, speed: 1.0, xp: 25, color: '#ff0000', gold: 10 },
    ghost: { health: 20, damage: 8, speed: 2.0, xp: 20, color: '#aaaaff', gold: 8 },
    golem: { health: 80, damage: 20, speed: 0.8, xp: 40, color: '#6b4423', gold: 15 }
  };

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

  // Generate dungeon
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
          row.push(Math.random() < 0.2 ? Math.floor(Math.random() * 4) + 1 : 0);
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
      generateDungeon(currentLevel);
      setPlayer(prev => ({ ...prev, x: 5, y: 5, angle: 0 }));
      setProjectiles([]);
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
        return { distance: RENDER_DISTANCE, tile: 1 };
      }

      const tile = map[tileY][tileX];
      if (tile > 0) {
        const correctedDistance = distance * Math.cos(angle - origin.angle);
        const hitX = checkX - tileX;
        const hitY = checkY - tileY;
        const side =
          Math.abs(hitX - 0.5) > Math.abs(hitY - 0.5) ? 1 : 0;
        return { distance: correctedDistance, tile, side };
      }

      distance += step;
    }

    return null;
  }, []);

  // Render frame
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dungeon.length) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Ceiling
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height / 2);

    // Floor
    const gradient = ctx.createLinearGradient(0, height / 2, 0, height);
    gradient.addColorStop(0, '#2a2a3e');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height / 2, width, height / 2);

    // Cast rays for walls
    const rayAngleStep = (FOV * Math.PI / 180) / RESOLUTION;
    const startAngle = player.angle - (FOV * Math.PI / 180) / 2;

    const zBuffer = new Array(RESOLUTION).fill(RENDER_DISTANCE);

    for (let i = 0; i < RESOLUTION; i++) {
      const rayAngle = startAngle + i * rayAngleStep;
      const hit = castRay(player, rayAngle, dungeon);

      if (hit) {
        const sliceWidth = width / RESOLUTION;
        const wallHeight = hit.distance > 0.1 ? height / hit.distance : height * 2;
        const x = i * sliceWidth;
        const y = (height - wallHeight) / 2;

        const wallType = WALL_TYPES[hit.tile];
        if (wallType) {
          let brightness = 1.0 - (hit.distance / RENDER_DISTANCE);
          brightness = Math.max(0.2, Math.min(1.0, brightness));
          if (hit.side === 1) brightness *= 0.7;

          const color = wallType.color;
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);

          ctx.fillStyle = `rgb(${r * brightness}, ${g * brightness}, ${b * brightness})`;
          ctx.fillRect(x, y, sliceWidth + 1, wallHeight);
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
      const spriteHeight = height / distance;
      const spriteWidth = spriteHeight * (sprite.spriteType === 'projectile' ? 0.3 : 0.8);

      const x = screenX - spriteWidth / 2;
      const y = (height - spriteHeight) / 2;

      // Check z-buffer
      const screenSlice = Math.floor(screenX / (width / RESOLUTION));
      if (
        screenSlice >= 0 &&
        screenSlice < RESOLUTION &&
        distance < zBuffer[screenSlice]
      ) {
        let brightness = 1.0 - (distance / RENDER_DISTANCE) * 0.5;

        if (sprite.spriteType === 'enemy') {
          ctx.fillStyle = sprite.color;
          ctx.globalAlpha = brightness;
          ctx.fillRect(x, y, spriteWidth, spriteHeight);

          // Health bar
          const healthPercent = sprite.health / sprite.maxHealth;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(x, y - 10, spriteWidth, 5);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(x, y - 10, spriteWidth * healthPercent, 5);

          ctx.globalAlpha = 1;
        } else if (sprite.spriteType === 'item') {
          ctx.fillStyle = sprite.color;
          ctx.globalAlpha = brightness * 0.8;
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
          ctx.fillStyle = sprite.color;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(
            screenX,
            y + spriteHeight / 2,
            spriteWidth,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });

    // Crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const centerX = width / 2;
    const centerY = height / 2;
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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw walls on minimap
    dungeon.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile > 0) {
          ctx.fillStyle = '#555555';
          ctx.fillRect(
            minimapX + x * minimapScale,
            minimapY + y * minimapScale,
            minimapScale,
            minimapScale
          );
        }
      });
    });

    // Draw enemies on minimap
    enemies.forEach(enemy => {
      ctx.fillStyle = '#ff0000';
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
    ctx.fillStyle = '#00ff00';
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
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      minimapX + player.x * minimapScale,
      minimapY + player.y * minimapScale
    );
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
  }, [player, dungeon, enemies, items, projectiles, dimensions, castRay]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateGamepadState = () => {
      if (!navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const gp = pads[0];
      if (!gp) {
        gamepadStateRef.current = { lx: 0, ly: 0, rx: 0, fire: false };
        return;
      }
      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;
      const rx = gp.axes[2] || 0;
      const fire = !!(gp.buttons[0] && gp.buttons[0].pressed);
      gamepadStateRef.current = { lx, ly, rx, fire };
    };

    const castSpellFromLoop = () => {
      const spell = equippedSpells[selectedSpell];
      if (!spell) return;

      setPlayer(prev => {
        if (spell.cooldown > 0 || prev.mana < spell.manaCost) return prev;
        return { ...prev, mana: prev.mana - spell.manaCost };
      });

      setEquippedSpells(prev =>
        prev.map((s, i) =>
          i === selectedSpell ? { ...s, cooldown: s.maxCooldown } : s
        )
      );

      setProjectiles(prev => [
        ...prev,
        {
          id: Math.random(),
          x: player.x,
          y: player.y,
          angle: player.angle,
          speed: 8,
          damage: spell.damage,
          color: spell.color,
          lifetime: 3,
          dead: false
        }
      ]);
    };

    let animationId;
    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime.current) / 1000;
      lastTime.current = now;

      // Update gamepad axes
      if (gamepadConnected) {
        updateGamepadState();
      } else {
        gamepadStateRef.current = { lx: 0, ly: 0, rx: 0, fire: false };
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
        const { lx, ly, rx } = gamepadState;
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

      // Gamepad fire (do it outside setPlayer so we don't spam)
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
  }, [gameState, dungeon, enemies.length, render, player.health, equippedSpells, selectedSpell, gamepadConnected, isMobile, player.x, player.y]);

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
  };

  const nextLevel = () => {
    setCurrentLevel(prev => prev + 1);
    setPlayer(prev => ({ ...prev, x: 5, y: 5, angle: 0 }));
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

      const sensitivity = 0.002;
      const deltaX = e.movementX || 0;

      setPlayer(prev => ({
        ...prev,
        angle: prev.angle + deltaX * sensitivity
      }));
    };

    const handleClick = (e) => {
      if (gameState !== 'playing') return;

      // Desktop: request pointer lock first click, then cast
      if (!isMobile) {
        const canvas = canvasRef.current;
        if (canvas && document.pointerLockElement !== canvas) {
          canvas.requestPointerLock().catch(err => {
            console.log('Pointer lock failed:', err);
          });
          return;
        }
      }

      // Cast spell
      const spell = equippedSpells[selectedSpell];
      if (!spell || spell.cooldown > 0 || player.mana < spell.manaCost) return;

      setPlayer(prev => ({
        ...prev,
        mana: prev.mana - spell.manaCost
      }));

      setEquippedSpells(prev =>
        prev.map((s, i) =>
          i === selectedSpell ? { ...s, cooldown: s.maxCooldown } : s
        )
      );

      setProjectiles(prev => [
        ...prev,
        {
          id: Math.random(),
          x: player.x,
          y: player.y,
          angle: player.angle,
          speed: 8,
          damage: spell.damage,
          color: spell.color,
          lifetime: 3,
          dead: false
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
    if (!isMobile) return;

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

              setProjectiles(prev => [
                ...prev,
                {
                  id: Math.random(),
                  x: player.x,
                  y: player.y,
                  angle: player.angle,
                  speed: 8,
                  damage: spell.damage,
                  color: spell.color,
                  lifetime: 3,
                  dead: false
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
  }, [isMobile, gameState, equippedSpells, selectedSpell, player.mana, player.x, player.y, player.angle]);

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
            <p>Desktop: WASD Move · Mouse Look · Click Cast</p>
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
          <p className="text-lg md:text-xl text-red-200 mb-2">Level Reached: {currentLevel}</p>
          <p className="text-lg md:text-xl text-red-200 mb-2">Enemies Slain: {player.kills}</p>
          <p className="text-lg md:text-xl text-red-200 mb-8">Gold Collected: {player.gold}</p>
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
          <p className="text-xl text-yellow-100 mb-2">Dungeon {currentLevel} Cleared</p>
          <p className="text-lg md:text-xl text-yellow-200 mb-2">
            Enemies Defeated: {10 + currentLevel * 3}
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
              <p className="text-gray-400 text-[10px] md:text-xs mt-1">ESC to pause</p>
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
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className="flex gap-2 md:gap-3">
          {equippedSpells.map((spell, index) => {
            const Icon = spell.icon;
            const isSelected = index === selectedSpell;
            const isReady =
              spell.cooldown <= 0 && player.mana >= spell.manaCost;

            return (
              <div
                key={index}
                className={`bg-black bg-opacity-70 p-2 md:p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-yellow-400 scale-110'
                    : 'border-gray-600'
                } ${!isReady ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <Icon size={24} className="md:hidden" style={{ color: spell.color }} />
                  <Icon size={32} className="hidden md:block" style={{ color: spell.color }} />
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
              </div>
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
