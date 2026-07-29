import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useCredits } from '../../shared/economy/useCredits';
import toast from 'react-hot-toast';

interface PurgaSlicerProps {
  className?: string;
}

interface GameObject {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  angularVelocity: number;
  type: EmojiType;
  baseScale: number;
  pulseAmp: number;
  pulseFreq: number;
  pulsePhase: number;
  id: string;
  sliced: boolean;
  frozen: boolean;
  frozenTimer: number;
  points: number;
}

type EmojiType = 'coin' | 'snowflake' | 'bomb' | 'skull' | 'phoenix' | 'smiley' | 'star' | 'heart' | 'diamond' | 'lightning' | 'crown' | 'ghost';

const EMOJI_CONFIG: Record<EmojiType, { emoji: string; points: number; color: string }> = {
  coin:      { emoji: '🪙', points: 10, color: '#f59e0b' },
  snowflake: { emoji: '❄️', points: 5,  color: '#38bdf8' },
  bomb:      { emoji: '💣', points: 0,  color: '#ef4444' },
  skull:     { emoji: '💀', points: -20, color: '#94a3b8' },
  phoenix:   { emoji: '🔥', points: 25, color: '#f97316' },
  smiley:    { emoji: '😊', points: 8,  color: '#fbbf24' },
  star:      { emoji: '⭐', points: 15, color: '#facc15' },
  heart:     { emoji: '❤️', points: 0,  color: '#ef4444' },
  diamond:   { emoji: '💎', points: 30, color: '#60a5fa' },
  lightning: { emoji: '⚡', points: 12, color: '#a78bfa' },
  crown:     { emoji: '👑', points: 20, color: '#fbbf24' },
  ghost:     { emoji: '👻', points: -10, color: '#c084fc' },
};

const PurgaSlicer: React.FC<PurgaSlicerProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const animationIdRef = useRef<number>();
  const gameObjectsRef = useRef<GameObject[]>([]);
  const pointerRef = useRef({ x: 0, y: 0 });
  const isSlicingRef = useRef(false);
  const lastTrailPointRef = useRef<{ x: number; y: number } | null>(null);
  const livesRef = useRef(5);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const gameEndedRef = useRef(false);
  const multiplierRef = useRef(1);
  const multiplierTimerRef = useRef(0);
  const totalCoinsSlicedRef = useRef(0);
  const screenShakeRef = useRef(0);

  const { balance, processFullGameSession, spendCredits } = useCredits();

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState('sheol_embers');
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [selectedBlade, setSelectedBlade] = useState('blade_of_valor');
  const [multiplierActive, setMultiplierActive] = useState(false);
  const [frozenCount, setFrozenCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeBackgroundId = (bgId: string) => {
    if (bgId === 'molten_gate') return 'gates_of_zion';
    if (bgId === 'ashen_temple') return 'temple_ruins';
    if (bgId === 'obsidian_ember') return 'sheol_embers';
    return bgId;
  };

  const normalizeBladeId = (bladeId: string) => {
    if (bladeId === 'ember') return 'blade_of_valor';
    if (bladeId === 'obsidian') return 'goliaths_edge';
    if (bladeId === 'seraph') return 'seraphs_song';
    return bladeId;
  };

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const storedBg = normalizeBackgroundId(localStorage.getItem('perga_bg') || 'sheol_embers');
    const storedBlade = normalizeBladeId(localStorage.getItem('perga_blade') || 'blade_of_valor');
    const storedOwned = (localStorage.getItem('perga_owned_backgrounds') || 'sheol_embers')
      .split(',').map(normalizeBackgroundId).filter(Boolean).join(',');
    const storedCustomBg = localStorage.getItem('perga_custom_bg');
    const storedOwnedBlades = (localStorage.getItem('perga_owned_blades') || 'blade_of_valor')
      .split(',').map(normalizeBladeId).filter(Boolean);
    if (storedCustomBg) setCustomBgUrl(storedCustomBg);
    const ownedBackgroundsRefCurrent = new Set(storedOwned.split(',').filter(Boolean));
    setSelectedBackground(storedBg);
    setSelectedBlade(storedBlade);
    localStorage.setItem('perga_bg', storedBg);
    localStorage.setItem('perga_blade', storedBlade);
    localStorage.setItem('perga_owned_backgrounds', Array.from(ownedBackgroundsRefCurrent).join(','));
    localStorage.setItem('perga_owned_blades', Array.from(new Set(storedOwnedBlades)).join(','));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const aspect = w / h;
    const viewSize = 6;
    const camera = new THREE.OrthographicCamera(
      -aspect * viewSize, aspect * viewSize, viewSize, -viewSize, 0.1, 100
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const createGradientTexture = (top: string, bottom: string, accent?: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture(canvas);
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = accent || '#ff7a18';
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const getBgPalette = (bgId: string, lvl: number) => {
      const t = Math.min(1, (lvl - 1) / 10);
      if (bgId === 'gates_of_zion') return {
        top: `rgb(${20 + t * 10}, ${10 - t * 5}, ${0})`,
        bottom: '#000000',
        accent: `rgb(${255}, ${80 + t * 60}, ${18})`
      };
      if (bgId === 'temple_ruins') return {
        top: `rgb(${11 + t * 15}, ${11 + t * 5}, ${11})`,
        bottom: '#000000',
        accent: `rgb(${100 + t * 80}, ${60 + t * 40}, ${200})`
      };
      return {
        top: `rgb(${9 + t * 12}, ${9}, ${9 + t * 8})`,
        bottom: '#000000',
        accent: `rgb(${200 + t * 55}, ${100 + t * 50}, ${20})`
      };
    };

    let bgMaterial: THREE.MeshBasicMaterial;
    if (selectedBackground === 'custom' && customBgUrl) {
      const loader = new THREE.TextureLoader();
      const tex = loader.load(customBgUrl);
      tex.minFilter = THREE.LinearFilter;
      bgMaterial = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1 });
    } else {
      const bg = getBgPalette(selectedBackground, levelRef.current);
      const bgTex = createGradientTexture(bg.top, bg.bottom, bg.accent);
      bgMaterial = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, opacity: 1 });
    }

    const bgGeometry = new THREE.PlaneGeometry(aspect * viewSize * 2, viewSize * 2);
    const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
    bgPlane.position.z = -5;
    scene.add(bgPlane);

    const bladeTrailColor = (bladeId: string) => {
      if (bladeId === 'blade_of_valor') return 'rgba(255, 122, 24, 0.9)';
      if (bladeId === 'goliaths_edge') return 'rgba(220, 220, 220, 0.9)';
      if (bladeId === 'seraphs_song') return 'rgba(255, 180, 80, 0.95)';
      return 'rgba(255, 122, 24, 0.9)';
    };

    const bladeConfig = (bladeId: string) => {
      if (bladeId === 'goliaths_edge') return { scoreMult: 1.25, cursePenaltyMult: 1.1, corruptionDamage: 1 };
      if (bladeId === 'seraphs_song') return { scoreMult: 1.1, cursePenaltyMult: 0.9, corruptionDamage: 0.75 };
      return { scoreMult: 1.0, cursePenaltyMult: 1.0, corruptionDamage: 1 };
    };

    const createEmojiTexture = (emoji: string, size = 160) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (!ctx) return new THREE.Texture(c);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(emoji, c.width / 2, c.height / 2 + 8);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    };

    // Emoji spawn weights by level — higher levels add more dangerous types, not faster speed
    const getSpawnWeights = (lvl: number): Record<EmojiType, number> => {
      // Good targets (always present but taper off slightly)
      const coinWeight = Math.max(12, 35 - lvl * 1.5);
      const smileyWeight = Math.max(8, 25 - lvl * 1.2);
      const starWeight = Math.max(5, 15 - lvl * 0.8);
      // Utility (steady presence)
      const snowflakeWeight = 6 + Math.min(6, lvl * 0.8);
      const heartWeight = Math.max(2, 7 - lvl * 0.4);
      const lightningWeight = 4 + Math.min(5, lvl * 0.6);
      // High value (rare but scaling up)
      const diamondWeight = 1 + Math.min(5, lvl * 0.6);
      const crownWeight = 1 + Math.min(4, lvl * 0.5);
      const phoenixWeight = Math.max(1, 5 - lvl * 0.3);
      // Dangerous (scale up aggressively)
      const skullWeight = 3 + Math.min(20, lvl * 2.5);
      const bombWeight = 2 + Math.min(10, lvl * 1.2);
      const ghostWeight = 1 + Math.min(8, lvl * 1);
      return {
        coin: coinWeight,
        smiley: smileyWeight,
        star: starWeight,
        snowflake: snowflakeWeight,
        heart: heartWeight,
        lightning: lightningWeight,
        diamond: diamondWeight,
        crown: crownWeight,
        phoenix: phoenixWeight,
        skull: skullWeight,
        bomb: bombWeight,
        ghost: ghostWeight,
      };
    };

    const pickEmojiType = (lvl: number): EmojiType => {
      const weights = getSpawnWeights(lvl);
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (const [type, weight] of Object.entries(weights)) {
        r -= weight;
        if (r <= 0) return type as EmojiType;
      }
      return 'coin';
    };

    const createLaunchObject = (forceType?: EmojiType) => {
      const lvl = levelRef.current;
      const type = forceType || pickEmojiType(lvl);
      const cfg = EMOJI_CONFIG[type];
      const texture = createEmojiTexture(cfg.emoji);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);

      const startX = (Math.random() - 0.5) * (aspect * viewSize * 1.7);
      sprite.position.set(startX, -viewSize - 0.8, 0);
      const baseScale = (type === 'bomb' ? 1.5 : type === 'skull' ? 1.3 : type === 'diamond' ? 1.2 : type === 'crown' ? 1.35 : 1.4) + Math.random() * 0.5;
      sprite.scale.set(baseScale, baseScale, 1);

      const vx = (Math.random() - 0.5) * 4;
      const vy = 14 + Math.random() * 5;

      const obj: GameObject = {
        sprite,
        velocity: new THREE.Vector3(vx, vy, 0),
        angularVelocity: (Math.random() - 0.5) * 2.5,
        type,
        baseScale,
        pulseAmp: 0.05 + Math.random() * 0.12,
        pulseFreq: 2.0 + Math.random() * 4.0,
        pulsePhase: Math.random() * Math.PI * 2,
        id: Math.random().toString(36).substr(2, 9),
        sliced: false,
        frozen: false,
        frozenTimer: 0,
        points: cfg.points,
      };

      scene.add(sprite);
      gameObjectsRef.current.push(obj);
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const gravity = -18;

    const resizeTrailCanvas = () => {
      if (!trailCanvasRef.current || !mountRef.current) return;
      const cw = mountRef.current.clientWidth;
      const ch = mountRef.current.clientHeight;
      trailCanvasRef.current.width = Math.floor(cw * (window.devicePixelRatio || 1));
      trailCanvasRef.current.height = Math.floor(ch * (window.devicePixelRatio || 1));
      trailCanvasRef.current.style.width = `${cw}px`;
      trailCanvasRef.current.style.height = `${ch}px`;
    };

    const clearTrail = () => {
      const canvas = trailCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawTrailSegment = (x0: number, y0: number, x1: number, y1: number) => {
      const canvas = trailCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = bladeTrailColor(selectedBlade);
      ctx.shadowColor = 'rgba(255, 122, 24, 0.35)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 7 * (window.devicePixelRatio || 1);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    };

    const fadeTrail = (amount: number) => {
      const canvas = trailCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${amount})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    const updatePointerFromEvent = (clientX: number, clientY: number) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      pointerRef.current.x = (x / rect.width) * 2 - 1;
      pointerRef.current.y = -(y / rect.height) * 2 + 1;
      const px = x * (window.devicePixelRatio || 1);
      const py = y * (window.devicePixelRatio || 1);
      if (isSlicingRef.current) {
        if (lastTrailPointRef.current) {
          drawTrailSegment(lastTrailPointRef.current.x, lastTrailPointRef.current.y, px, py);
        }
        lastTrailPointRef.current = { x: px, y: py };
      }
    };

    const triggerBombEffect = () => {
      screenShakeRef.current = 15;
      const remaining: GameObject[] = [];
      gameObjectsRef.current.forEach(obj => {
        if (obj.sliced) return;
        obj.sliced = true;
        scene.remove(obj.sprite);
        if (obj.type === 'coin') {
          totalCoinsSlicedRef.current += 1;
          const add = Math.round(10 * multiplierRef.current);
          scoreRef.current += add;
          setScore(s => s + add);
        }
      });
      gameObjectsRef.current = remaining;
      setFrozenCount(0);
    };

    const triggerFreezeEffect = (originX: number, originY: number) => {
      const freezeRadius = 2.5;
      let count = 0;
      gameObjectsRef.current.forEach(obj => {
        if (obj.sliced || obj.frozen) return;
        const dx = obj.sprite.position.x - originX;
        const dy = obj.sprite.position.y - originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < freezeRadius) {
          obj.frozen = true;
          obj.frozenTimer = 3.0;
          obj.velocity.set(0, 0, 0);
          count++;
        }
      });
      setFrozenCount(count);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerFromEvent(event.clientX, event.clientY);
      if (gameState !== 'playing') return;
      if (!isSlicingRef.current) return;

      ndc.x = pointerRef.current.x;
      ndc.y = pointerRef.current.y;
      raycaster.setFromCamera(ndc, camera);
      const sprites = gameObjectsRef.current.filter(o => !o.sliced).map(o => o.sprite);
      const hits = raycaster.intersectObjects(sprites, false);
      if (hits.length === 0) return;

      const hitSprite = hits[0].object as THREE.Sprite;
      const hitObj = gameObjectsRef.current.find(o => o.sprite === hitSprite);
      if (!hitObj || hitObj.sliced) return;
      hitObj.sliced = true;
      scene.remove(hitObj.sprite);
      gameObjectsRef.current = gameObjectsRef.current.filter(o => o !== hitObj);

      const bladeCfg = bladeConfig(selectedBlade);

      switch (hitObj.type) {
        case 'coin': {
          const add = Math.round(10 * (comboRef.current + 1) * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          setCombo(c => c + 1);
          totalCoinsSlicedRef.current += 1;
          break;
        }
        case 'snowflake': {
          triggerFreezeEffect(hitObj.sprite.position.x, hitObj.sprite.position.y);
          const add = Math.round(5 * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          break;
        }
        case 'bomb': {
          triggerBombEffect();
          break;
        }
        case 'skull': {
          const penalty = Math.round(20 * bladeCfg.cursePenaltyMult);
          setScore(s => Math.max(0, s - penalty));
          setCombo(0);
          break;
        }
        case 'phoenix': {
          multiplierRef.current = 2;
          multiplierTimerRef.current = 4;
          setMultiplierActive(true);
          const add = Math.round(25 * bladeCfg.scoreMult);
          setScore(s => s + add);
          break;
        }
        case 'smiley': {
          const add = Math.round(8 * (comboRef.current + 1) * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          setCombo(c => c + 1);
          break;
        }
        case 'star': {
          const add = Math.round(15 * (comboRef.current + 1) * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          setCombo(c => c + 2);
          break;
        }
        case 'heart': {
          setLives(l => Math.min(l + 1, 5));
          const add = Math.round(5 * bladeCfg.scoreMult);
          setScore(s => s + add);
          break;
        }
        case 'diamond': {
          const add = Math.round(30 * (comboRef.current + 1) * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          setCombo(c => c + 2);
          break;
        }
        case 'lightning': {
          multiplierRef.current = 1.5;
          multiplierTimerRef.current = 3;
          setMultiplierActive(true);
          const add = Math.round(12 * bladeCfg.scoreMult);
          setScore(s => s + add);
          break;
        }
        case 'crown': {
          const add = Math.round(20 * (comboRef.current + 2) * bladeCfg.scoreMult * multiplierRef.current);
          setScore(s => s + add);
          setCombo(c => c + 3);
          break;
        }
        case 'ghost': {
          const penalty = Math.round(10 * bladeCfg.cursePenaltyMult);
          setScore(s => Math.max(0, s - penalty));
          setCombo(0);
          break;
        }
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      isSlicingRef.current = true;
      lastTrailPointRef.current = null;
      updatePointerFromEvent(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      isSlicingRef.current = false;
      lastTrailPointRef.current = null;
    };

    resizeTrailCanvas();
    clearTrail();

    if (mountRef.current) {
      mountRef.current.addEventListener('pointermove', handlePointerMove);
      mountRef.current.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointerup', handlePointerUp);
    }

    const clock = new THREE.Clock();
    let spawnTimer = 0;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const dt = Math.min(0.033, clock.getDelta());
      const t = clock.elapsedTime;

      fadeTrail(0.12);

      if (gameState === 'playing') {
        // Update level
        const newLevel = Math.floor(scoreRef.current / 200) + 1;
        if (newLevel !== levelRef.current) {
          levelRef.current = newLevel;
          setLevel(newLevel);
        }

        // Multiplier timer
        if (multiplierTimerRef.current > 0) {
          multiplierTimerRef.current -= dt;
          if (multiplierTimerRef.current <= 0) {
            multiplierRef.current = 1;
            setMultiplierActive(false);
          }
        }

        // Spawn — constant interval, more emojis per burst as level rises
        spawnTimer += dt;
        const spawnInterval = 0.65;
        if (spawnTimer >= spawnInterval) {
          const lvl = levelRef.current;
          const burstCount = Math.min(8, 1 + Math.floor((lvl - 1) * 0.7));
          for (let i = 0; i < burstCount; i++) createLaunchObject();
          spawnTimer = 0;
        }

        // Screen shake
        if (screenShakeRef.current > 0) {
          screenShakeRef.current--;
        }

        const bottomOut = -viewSize - 1.2;
        const remaining: GameObject[] = [];
        gameObjectsRef.current.forEach((obj) => {
          if (obj.frozen) {
            obj.frozenTimer -= dt;
            if (obj.frozenTimer <= 0) {
              obj.frozen = false;
              obj.velocity.y = 12;
              obj.velocity.x = (Math.random() - 0.5) * 3;
            }
            // Frozen items still pulse
            const s = obj.baseScale * (1 + obj.pulseAmp * 0.5 * Math.sin((t * obj.pulseFreq) + obj.pulsePhase));
            obj.sprite.scale.set(s, s, 1);
            obj.sprite.material.rotation += obj.angularVelocity * dt * 0.2;
            remaining.push(obj);
            return;
          }

          obj.velocity.y += gravity * dt;
          obj.sprite.position.x += obj.velocity.x * dt;
          obj.sprite.position.y += obj.velocity.y * dt;
          obj.sprite.material.rotation += obj.angularVelocity * dt;

          const s = obj.baseScale * (1 + obj.pulseAmp * Math.sin((t * obj.pulseFreq) + obj.pulsePhase));
          obj.sprite.scale.set(s, s, 1);

          if (obj.sprite.position.y < bottomOut) {
            scene.remove(obj.sprite);
            if (obj.type === 'skull' || obj.type === 'ghost') {
              // Skull/ghost fell off = no penalty (player avoided it)
            } else if (obj.type === 'coin' || obj.type === 'phoenix' || obj.type === 'star' || obj.type === 'diamond' || obj.type === 'crown' || obj.type === 'smiley' || obj.type === 'lightning') {
              setLives(prev => Math.max(0, prev - 1));
              livesRef.current = Math.max(0, livesRef.current - 1);
              setCombo(0);
            } else if (obj.type === 'snowflake' || obj.type === 'bomb' || obj.type === 'heart') {
              // Snowflake/bomb/heart fell = no penalty
            }
          } else {
            remaining.push(obj);
          }
        });
        gameObjectsRef.current = remaining;

        if (livesRef.current <= 0) {
          setGameState('gameOver');
        }
      }

      // Apply screen shake
      if (screenShakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * screenShakeRef.current * 0.3;
        const sy = (Math.random() - 0.5) * screenShakeRef.current * 0.3;
        renderer.domElement.style.transform = `translate(${sx}px, ${sy}px)`;
      } else {
        renderer.domElement.style.transform = '';
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      if (nw <= 0 || nh <= 0) return;
      const naspect = nw / nh;
      camera.left = -naspect * viewSize;
      camera.right = naspect * viewSize;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      resizeTrailCanvas();
    };

    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(() => handleResize());
    if (mountRef.current) ro.observe(mountRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      if (mountRef.current) {
        mountRef.current.removeEventListener('pointermove', handlePointerMove);
        mountRef.current.removeEventListener('pointerdown', handlePointerDown);
        if (renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
      window.removeEventListener('pointerup', handlePointerUp);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      gameObjectsRef.current.forEach(obj => scene.remove(obj.sprite));
      gameObjectsRef.current.length = 0;
      renderer.dispose();
    };
  }, [gameState, selectedBackground, selectedBlade, customBgUrl]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(5);
    livesRef.current = 5;
    scoreRef.current = 0;
    setCombo(0);
    setLevel(1);
    levelRef.current = 1;
    multiplierRef.current = 1;
    multiplierTimerRef.current = 0;
    setMultiplierActive(false);
    setFrozenCount(0);
    totalCoinsSlicedRef.current = 0;
    setShowSettings(false);
    setCreditsEarned(0);
    gameEndedRef.current = false;
    if (sceneRef.current) {
      gameObjectsRef.current.forEach(obj => sceneRef.current!.remove(obj.sprite));
      gameObjectsRef.current.length = 0;
    }
  };

  const pauseGame = () => {
    setGameState(gameState === 'paused' ? 'playing' : 'paused');
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0);
    setLives(5);
    livesRef.current = 5;
    scoreRef.current = 0;
    setCombo(0);
    setLevel(1);
    levelRef.current = 1;
    setMultiplierActive(false);
    setFrozenCount(0);
    totalCoinsSlicedRef.current = 0;
    setShowSettings(false);
    setCreditsEarned(0);
    gameEndedRef.current = false;
    if (sceneRef.current) {
      gameObjectsRef.current.forEach(obj => sceneRef.current!.remove(obj.sprite));
      gameObjectsRef.current.length = 0;
    }
  };

  useEffect(() => {
    if (gameState === 'gameOver' && !gameEndedRef.current) {
      gameEndedRef.current = true;
      const processCredits = async () => {
        const result = await processFullGameSession({
          gameId: 'SWORD_OF_JUDGMENT',
          score: score,
          isPerfect: lives > 0,
          isWin: lives > 0,
          corruptionHits: 0,
          missedTargets: 0
        });
        setCreditsEarned(result.net);
        const currentHigh = Number(localStorage.getItem('perga_high_score') || '0');
        if (score > currentHigh) localStorage.setItem('perga_high_score', String(score));
        const gamesPlayed = Number(localStorage.getItem('perga_games_played') || '0');
        localStorage.setItem('perga_games_played', String(gamesPlayed + 1));
        localStorage.setItem('perga_last_result', JSON.stringify({
          game: 'Judgment', net: result.net, score, timestamp: Date.now(),
          details: `Lives: ${lives}, Combo: ${combo}, Level: ${level}, Coins: ${totalCoinsSlicedRef.current}`
        }));
      };
      processCredits();
    }
  }, [gameState, score, lives, processFullGameSession]);

  useEffect(() => { localStorage.setItem('perga_bg', selectedBackground); }, [selectedBackground]);
  useEffect(() => { localStorage.setItem('perga_blade', selectedBlade); }, [selectedBlade]);

  const backgrounds = [
    { id: 'sheol_embers', name: 'Sheol Embers', cost: 0 },
    { id: 'temple_ruins', name: 'Temple Ruins', cost: 500 },
    { id: 'gates_of_zion', name: 'Gates of Zion', cost: 1000 },
  ];

  const blades = [
    { id: 'blade_of_valor', name: 'Blade of Valor', cost: 0 },
    { id: 'goliaths_edge', name: "Goliath's Edge", cost: 350 },
    { id: 'seraphs_song', name: "Seraph's Song", cost: 750 },
  ];

  const buyBackground = async (id: string, cost: number) => {
    const owned = new Set((localStorage.getItem('perga_owned_backgrounds') || 'sheol_embers').split(',').map(normalizeBackgroundId).filter(Boolean));
    if (owned.has(id)) { setSelectedBackground(id); return; }
    if (balance < cost) { toast.error('Insufficient credits'); return; }
    const success = await spendCredits(cost, `Purchased background: ${id}`);
    if (success) {
      owned.add(id);
      localStorage.setItem('perga_owned_backgrounds', Array.from(owned).join(','));
      setSelectedBackground(id);
    }
  };

  const buyBlade = async (id: string, cost: number) => {
    const key = 'perga_owned_blades';
    const owned = new Set((localStorage.getItem(key) || 'blade_of_valor').split(',').map(normalizeBladeId).filter(Boolean));
    if (owned.has(id)) { setSelectedBlade(id); return; }
    if (balance < cost) { toast.error('Insufficient credits'); return; }
    const success = await spendCredits(cost, `Purchased blade: ${id}`);
    if (success) {
      owned.add(id);
      localStorage.setItem(key, Array.from(owned).join(','));
      setSelectedBlade(id);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image too large (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomBgUrl(result);
      setSelectedBackground('custom');
      localStorage.setItem('perga_custom_bg', result);
      localStorage.setItem('perga_bg', 'custom');
      toast.success('Background uploaded!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`relative w-full min-h-screen ${className}`}
      style={{ backgroundColor: '#0b0b0b', touchAction: 'none', overscrollBehavior: 'contain', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0b0b0b] to-black" />
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.55),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(249,115,22,0.25),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.12),transparent_45%)]" />

        <div className="absolute inset-0 px-2 sm:px-4 py-2 sm:py-4">
          <div className="relative w-full h-full max-w-[1100px] mx-auto">
            <div ref={mountRef} className="absolute inset-0 rounded-2xl overflow-hidden border border-orange-500/10 shadow-2xl" />
            <canvas ref={trailCanvasRef} className="absolute inset-0 pointer-events-none rounded-2xl" />

            {/* HUD */}
            <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start text-white pointer-events-none">
              <div className="pointer-events-auto rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-black/55 backdrop-blur-md border border-orange-500/20 shadow-lg shadow-black/40">
                <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Sword of Judgment</div>
                <div className="mt-1 grid grid-cols-3 gap-x-4 gap-y-1">
                  <div className="text-xs sm:text-sm"><span className="text-gray-400">Score</span> <span className="font-bold">{score}</span></div>
                  <div className="text-xs sm:text-sm"><span className="text-gray-400">Lives</span> <span className="font-bold">{lives}</span></div>
                  <div className="text-xs sm:text-sm"><span className="text-gray-400">Combo</span> <span className="font-bold">x{combo}</span></div>
                  <div className="text-xs sm:text-sm"><span className="text-gray-400">Level</span> <span className="font-bold text-orange-400">{level}</span></div>
                  <div className="text-xs sm:text-sm"><span className="text-gray-400">Coins</span> <span className="font-bold">{totalCoinsSlicedRef.current}</span></div>
                  {multiplierActive && (
                    <div className="text-xs sm:text-sm animate-pulse"><span className="text-yellow-400 font-black">2x ACTIVE</span></div>
                  )}
                  {frozenCount > 0 && (
                    <div className="text-xs sm:text-sm"><span className="text-cyan-400">❄️ {frozenCount}</span></div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pointer-events-auto">
                {gameState === 'playing' && (
                  <button onClick={pauseGame} className="bg-black/55 hover:bg-black/75 backdrop-blur-md border border-orange-500/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest">
                    <span className="hidden sm:inline">Pause</span><span className="sm:hidden">⏸️</span>
                  </button>
                )}
                <button onClick={() => setShowSettings(true)} className="bg-black/55 hover:bg-black/75 backdrop-blur-md border border-orange-500/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest">⚙️</button>
                {gameState === 'playing' && (
                  <button onClick={resetGame} className="bg-black/55 hover:bg-black/75 backdrop-blur-md border border-orange-500/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest">
                    <span className="hidden sm:inline">Reset</span><span className="sm:hidden">🔄</span>
                  </button>
                )}
              </div>
            </div>

            {/* Settings */}
            {showSettings && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 z-50">
                <div className="w-full max-w-2xl bg-[#0b0b0b] border border-orange-500/25 rounded-2xl p-4 sm:p-6 text-white max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="text-lg sm:text-xl font-bold text-orange-400">The Tabernacle</div>
                    <button onClick={() => setShowSettings(false)} className="bg-black/60 hover:bg-black/80 border border-orange-500/20 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm">Close</button>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300 mb-4 sm:mb-6">
                    Slice coins to earn. Use snowflakes to freeze. Grab bombs to clear. Avoid skulls. Phoenix grants 2x power.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <div className="font-semibold mb-3">Hallowed Grounds</div>
                      <div className="space-y-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors ${selectedBackground === 'custom' ? 'border-orange-500 bg-orange-500/10' : 'border-[#222] bg-black/40 hover:border-orange-500/40'}`}>
                          <div className="flex items-center justify-between"><span className="font-medium text-sm sm:text-base">Custom Image</span><span className="text-xs sm:text-sm text-blue-400">Upload</span></div>
                        </button>
                        {backgrounds.map(bg => {
                          const owned = new Set((localStorage.getItem('perga_owned_backgrounds') || 'sheol_embers').split(',').map(normalizeBackgroundId).filter(Boolean)).has(bg.id);
                          const active = selectedBackground === bg.id;
                          return (
                            <button key={bg.id} onClick={() => buyBackground(bg.id, bg.cost)} className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors ${active ? 'border-orange-500 bg-orange-500/10' : 'border-[#222] bg-black/40 hover:border-orange-500/40'}`}>
                              <div className="flex items-center justify-between"><span className="font-medium text-sm sm:text-base">{bg.name}</span><span className="text-xs sm:text-sm text-orange-300">{owned ? 'Owned' : `${bg.cost} pts`}</span></div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-3">Righteous Blades</div>
                      <div className="space-y-2">
                        {blades.map(b => {
                          const owned = new Set((localStorage.getItem('perga_owned_blades') || 'blade_of_valor').split(',').map(normalizeBladeId).filter(Boolean)).has(b.id);
                          const active = selectedBlade === b.id;
                          return (
                            <button key={b.id} onClick={() => buyBlade(b.id, b.cost)} className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-colors ${active ? 'border-orange-500 bg-orange-500/10' : 'border-[#222] bg-black/40 hover:border-orange-500/40'}`}>
                              <div className="flex items-center justify-between"><span className="font-medium text-sm sm:text-base">{b.name}</span><span className="text-xs sm:text-sm text-orange-300">{owned ? 'Owned' : `${b.cost} pts`}</span></div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Menu */}
            {gameState === 'menu' && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white px-4 sm:px-6 max-w-xl">
                  <div className="mb-5 sm:mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <div className="text-3xl">⚔️</div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic mb-2">
                    Sword of <span className="text-orange-500">Judgment</span>
                  </h1>
                  <p className="text-sm sm:text-base text-gray-300 mb-2">Survive. Slice. Ascend.</p>
                  <div className="text-xs text-gray-400 mb-4 space-y-1">
                    <p>🪙 <b>Coin</b> — Slice for points & combo</p>
                    <p>❄️ <b>Snowflake</b> — Freezes nearby icons</p>
                    <p>💣 <b>Bomb</b> — Explodes all on screen</p>
                    <p>💀 <b>Skull</b> — Lose a life if missed</p>
                    <p>🔥 <b>Phoenix</b> — 4s of 2x score (rare!)</p>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mb-6">Hold and drag to slice. Survive as long as you can.</div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <button onClick={startGame} className="px-8 py-4 rounded-full bg-orange-600 hover:bg-orange-500 font-black uppercase tracking-widest">Initialize Run</button>
                    <button onClick={() => setShowSettings(true)} className="px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 font-black uppercase tracking-widest">The Tabernacle</button>
                  </div>
                </div>
              </div>
            )}

            {/* Paused */}
            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <div className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-2">Run Paused</div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic mb-5">Stand By</h2>
                  <button onClick={pauseGame} className="px-8 py-4 rounded-full bg-orange-600 hover:bg-orange-500 font-black uppercase tracking-widest">Resume</button>
                </div>
              </div>
            )}

            {/* Game Over */}
            {gameState === 'gameOver' && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center">
                <div className="text-center text-white px-4 max-w-md">
                  <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <div className="text-3xl">🕯️</div>
                  </div>
                  <div className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-2">Run Concluded</div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-2">
                    Judgment <span className="text-orange-500">Rendered</span>
                  </h2>
                  <div className="text-sm font-bold mb-5" style={{ color: lives <= 0 ? '#fb7185' : '#f97316' }}>
                    {lives <= 0 ? 'Lives Depleted' : 'Run Ended'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full mb-6">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Score</div>
                      <div className="text-2xl font-black">{score}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Level</div>
                      <div className="text-2xl font-black text-orange-400">{level}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Coins Sliced</div>
                      <div className="text-2xl font-black">{totalCoinsSlicedRef.current}</div>
                    </div>
                    <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-orange-300">Credits</div>
                      <div className="text-2xl font-black text-orange-500">+{creditsEarned}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={startGame} className="px-8 py-4 rounded-full bg-orange-600 hover:bg-orange-500 font-black uppercase tracking-widest">Retry Run</button>
                    <button onClick={resetGame} className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 font-black uppercase tracking-widest">Main Menu</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurgaSlicer;
