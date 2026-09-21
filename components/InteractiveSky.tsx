import React, { useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface InteractiveSkyProps {
  className?: string;
  children?: React.ReactNode;
}

interface BirdData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSpeed: number;
  scale: number;
  opacity: number;
  bankAngle: number;
  wingPhase: number;
  flapFreq: number;
  isEvading: boolean;
  evadeCooldown: number;
  glideCooldown: number;
  isForeground: boolean;
}

interface InteractiveCloud {
  id: number;
  baseX: number; // percentage (0 to 100)
  baseY: number; // percentage (8 to 55)
  width: number;
  height: number;
  driftSpeed: number;
  depth: number; // 0.6 to 1.5
  pushX: number;
  pushY: number;
  currentScaleX: number;
  currentScaleY: number;
  opacity: number;
}

export const InteractiveSky: React.FC<InteractiveSkyProps> = ({ className = '', children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Normalized mouse coordinates (-1 to 1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for cloud push/pull physics
  const springConfig = { stiffness: 40, damping: 16 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Parallax transforms for background sky (subtle push in opposite direction)
  const skyBgX = useTransform(smoothMouseX, [-1, 1], [24, -24]);
  const skyBgY = useTransform(smoothMouseY, [-1, 1], [15, -15]);

  // Atmospheric mist push & pull (counter-directional layers creating 3D volume)
  const pullMistX = useTransform(smoothMouseX, [-1, 1], [-38, 38]);
  const pullMistY = useTransform(smoothMouseY, [-1, 1], [-18, 18]);

  const pushMistX = useTransform(smoothMouseX, [-1, 1], [32, -32]);
  const pushMistY = useTransform(smoothMouseY, [-1, 1], [16, -16]);

  // Bottom cloud horizon tilt and lift
  const horizonTilt = useTransform(smoothMouseX, [-1, 1], [-1.4, 1.4]);
  const horizonLift = useTransform(smoothMouseY, [-1, 1], [10, -10]);

  // Track cursor position in pixels for bird & cloud proximity push
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: -2000, y: -2000, active: false });

  // Floating fluffy cumulus clouds state
  const cloudsRef = useRef<InteractiveCloud[]>([
    { id: 1, baseX: 8, baseY: 16, width: 340, height: 160, driftSpeed: 0.012, depth: 1.2, pushX: 0, pushY: 0, currentScaleX: 1, currentScaleY: 1, opacity: 0.85 },
    { id: 2, baseX: 35, baseY: 10, width: 440, height: 190, driftSpeed: 0.008, depth: 0.75, pushX: 0, pushY: 0, currentScaleX: 1, currentScaleY: 1, opacity: 0.70 },
    { id: 3, baseX: 68, baseY: 22, width: 360, height: 170, driftSpeed: 0.015, depth: 1.4, pushX: 0, pushY: 0, currentScaleX: 1, currentScaleY: 1, opacity: 0.80 },
    { id: 4, baseX: 88, baseY: 14, width: 380, height: 175, driftSpeed: 0.009, depth: 0.9, pushX: 0, pushY: 0, currentScaleX: 1, currentScaleY: 1, opacity: 0.75 },
    { id: 5, baseX: 22, baseY: 38, width: 400, height: 180, driftSpeed: 0.011, depth: 1.1, pushX: 0, pushY: 0, currentScaleX: 1, currentScaleY: 1, opacity: 0.65 },
  ]);
  const cloudDomsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Interactive Birds references (Layered flock: some flying in front of headline & texts, some behind)
  const birdsRef = useRef<BirdData[]>([
    { id: 1, x: 90, y: 160, vx: 2.1, vy: 0, baseSpeed: 2.1, scale: 1.15, opacity: 0.98, bankAngle: 0, wingPhase: 0, flapFreq: 0.12, isEvading: false, evadeCooldown: 0, glideCooldown: 60, isForeground: true },
    { id: 2, x: 260, y: 70, vx: 1.6, vy: 0, baseSpeed: 1.6, scale: 0.70, opacity: 0.80, bankAngle: 0, wingPhase: 1.4, flapFreq: 0.11, isEvading: false, evadeCooldown: 0, glideCooldown: 120, isForeground: false },
    { id: 3, x: 440, y: 225, vx: 2.3, vy: 0, baseSpeed: 2.3, scale: 1.25, opacity: 0.98, bankAngle: 0, wingPhase: 2.8, flapFreq: 0.13, isEvading: false, evadeCooldown: 0, glideCooldown: 40, isForeground: true },
    { id: 4, x: 620, y: 85, vx: 1.7, vy: 0, baseSpeed: 1.7, scale: 0.75, opacity: 0.75, bankAngle: 0, wingPhase: 0.9, flapFreq: 0.10, isEvading: false, evadeCooldown: 0, glideCooldown: 90, isForeground: false },
    { id: 5, x: 800, y: 280, vx: 2.0, vy: 0, baseSpeed: 2.0, scale: 1.12, opacity: 0.96, bankAngle: 0, wingPhase: 3.5, flapFreq: 0.12, isEvading: false, evadeCooldown: 0, glideCooldown: 75, isForeground: true },
    { id: 6, x: 960, y: 110, vx: 1.8, vy: 0, baseSpeed: 1.8, scale: 0.80, opacity: 0.82, bankAngle: 0, wingPhase: 2.1, flapFreq: 0.11, isEvading: false, evadeCooldown: 0, glideCooldown: 110, isForeground: false },
    { id: 7, x: 1120, y: 185, vx: 2.2, vy: 0, baseSpeed: 2.2, scale: 1.20, opacity: 0.98, bankAngle: 0, wingPhase: 1.1, flapFreq: 0.12, isEvading: false, evadeCooldown: 0, glideCooldown: 85, isForeground: true },
  ]);
  const birdDomsRef = useRef<(HTMLDivElement | null)[]>([]);
  const birdWingsLeftRef = useRef<(SVGPathElement | null)[]>([]);
  const birdWingsRightRef = useRef<(SVGPathElement | null)[]>([]);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    mousePosRef.current = { x: clientX, y: clientY, active: true };

    // Normalized coordinates (-1 to 1)
    const nx = (clientX / rect.width) * 2 - 1;
    const ny = (clientY / rect.height) * 2 - 1;

    mouseX.set(Math.max(-1, Math.min(1, nx)));
    mouseY.set(Math.max(-1, Math.min(1, ny)));
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current = { x: -2000, y: -2000, active: false };
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Click near birds for playful scatter burst
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    birdsRef.current.forEach((bird) => {
      const dx = bird.x - cx;
      const dy = bird.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 350) {
        const force = (1 - dist / 350) * 10;
        bird.vx += (dx / (dist || 1)) * force + (Math.random() - 0.5) * 2;
        bird.vy += (dy / (dist || 1)) * force - 3;
        bird.isEvading = true;
        bird.evadeCooldown = 80;
      }
    });

    // Also ripples clouds when clicked
    cloudsRef.current.forEach((cloud) => {
      const width = containerRef.current?.clientWidth || 1200;
      const height = containerRef.current?.clientHeight || 700;
      const cloudX = (cloud.baseX / 100) * width + cloud.width / 2;
      const cloudY = (cloud.baseY / 100) * height + cloud.height / 2;
      const dx = cloudX - cx;
      const dy = cloudY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 400) {
        const pushForce = (1 - dist / 400) * 35;
        cloud.pushX += (dx / (dist || 1)) * pushForce;
        cloud.pushY += (dy / (dist || 1)) * pushForce;
      }
    });
  }, []);

  // Main High-Performance Animation Loop (RAF)
  useEffect(() => {
    let animId: number;
    let time = 0;

    const loop = () => {
      time += 0.016; // 60fps delta
      const container = containerRef.current;
      const width = container ? container.clientWidth : 1200;
      const height = container ? container.clientHeight : 750;
      const mouse = mousePosRef.current;

      // ----------------------------------------------------
      // 1. UPDATE FLOATING CLOUDS (Push & Pull Reaction)
      // ----------------------------------------------------
      cloudsRef.current.forEach((cloud, idx) => {
        // Continuous gentle ambient drift across the sky
        cloud.baseX = (cloud.baseX + cloud.driftSpeed) % 115;
        const currentPixelX = (cloud.baseX / 100) * width - (cloud.baseX > 100 ? width * 1.15 : 0);
        const currentPixelY = (cloud.baseY / 100) * height;

        // Proximity Push & Vapor Parting Reaction with mouse
        if (mouse.active) {
          const cloudCenterX = currentPixelX + cloud.width / 2;
          const cloudCenterY = currentPixelY + cloud.height / 2;
          const dx = cloudCenterX - mouse.x;
          const dy = cloudCenterY - mouse.y;
          const dist = Math.hypot(dx, dy);
          const pushRadius = 360 * cloud.depth;

          if (dist < pushRadius && dist > 1) {
            // Repulsive push vector away from mouse
            const pushRatio = Math.pow(1 - dist / pushRadius, 2);
            const targetPushX = (dx / dist) * (60 * cloud.depth) * pushRatio;
            const targetPushY = (dy / dist) * (40 * cloud.depth) * pushRatio;

            // Elastic deform: squashes slightly along push direction
            const targetScaleX = 1 + pushRatio * 0.12;
            const targetScaleY = 1 - pushRatio * 0.08;

            cloud.pushX += (targetPushX - cloud.pushX) * 0.1;
            cloud.pushY += (targetPushY - cloud.pushY) * 0.1;
            cloud.currentScaleX += (targetScaleX - cloud.currentScaleX) * 0.1;
            cloud.currentScaleY += (targetScaleY - cloud.currentScaleY) * 0.1;
          } else {
            // Spring recovery back to smooth flow
            cloud.pushX *= 0.94;
            cloud.pushY *= 0.94;
            cloud.currentScaleX += (1 - cloud.currentScaleX) * 0.08;
            cloud.currentScaleY += (1 - cloud.currentScaleY) * 0.08;
          }
        } else {
          cloud.pushX *= 0.94;
          cloud.pushY *= 0.94;
          cloud.currentScaleX += (1 - cloud.currentScaleX) * 0.08;
          cloud.currentScaleY += (1 - cloud.currentScaleY) * 0.08;
        }

        // Apply transforms directly to DOM node
        const el = cloudDomsRef.current[idx];
        if (el) {
          const finalX = currentPixelX + cloud.pushX;
          const finalY = currentPixelY + cloud.pushY;
          el.style.transform = `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, 0) scale(${cloud.currentScaleX.toFixed(3)}, ${cloud.currentScaleY.toFixed(3)})`;
        }
      });

      // ----------------------------------------------------
      // 2. UPDATE BIRDS (Flight Physics & Cursor Evasion)
      // ----------------------------------------------------
      birdsRef.current.forEach((bird, idx) => {
        // Natural serene sine wave gliding
        const ambientVertical = Math.sin(time * 2.2 + bird.id * 1.5) * 0.55;

        // Check proximity to mouse
        if (mouse.active) {
          const dx = bird.x - mouse.x;
          const dy = bird.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const evasionRadius = 240; // cursor proximity threshold

          if (dist < evasionRadius && dist > 1) {
            bird.isEvading = true;
            bird.evadeCooldown = 55;

            // Repulsive force: push bird away from mouse cursor
            const forceStrength = Math.pow(1 - dist / evasionRadius, 1.4) * 5.2;
            const pushVx = (dx / dist) * forceStrength;
            const pushVy = (dy / dist) * forceStrength - 0.6; // instinctive upward lift

            bird.vx += pushVx * 0.22;
            bird.vy += pushVy * 0.22;

            // Rapid flapping when startled
            bird.flapFreq = 0.26;
            bird.glideCooldown = 90;
          } else if (bird.evadeCooldown > 0) {
            bird.evadeCooldown--;
            bird.flapFreq = 0.18;
          } else {
            bird.isEvading = false;
            // Relax towards serene base flight
            bird.vx += (bird.baseSpeed - bird.vx) * 0.035;
            bird.vy += (ambientVertical - bird.vy) * 0.045;

            // Alternate between gentle flapping and majestic gliding
            bird.glideCooldown--;
            if (bird.glideCooldown <= 0) {
              bird.glideCooldown = 140 + Math.floor(Math.random() * 80);
            }
            // If in gliding phase, reduce flap frequency
            bird.flapFreq = bird.glideCooldown < 70 ? 0.03 : 0.11;
          }
        } else {
          bird.isEvading = false;
          bird.vx += (bird.baseSpeed - bird.vx) * 0.035;
          bird.vy += (ambientVertical - bird.vy) * 0.045;
          bird.flapFreq = 0.11;
        }

        // Clamp speed to prevent jarring leaps
        const speed = Math.hypot(bird.vx, bird.vy);
        if (speed > 6.5) {
          bird.vx = (bird.vx / speed) * 6.5;
          bird.vy = (bird.vy / speed) * 6.5;
        }

        // Advance position
        bird.x += bird.vx;
        bird.y += bird.vy;

        // Keep inside appropriate sky zone (foreground birds traverse across headline & texts)
        if (bird.isForeground) {
          if (bird.y < 95) {
            bird.y = 95;
            bird.vy = Math.abs(bird.vy) * 0.5;
          } else if (bird.y > 420) {
            bird.y = 420;
            bird.vy = -Math.abs(bird.vy) * 0.5;
          }
        } else {
          if (bird.y < 30) {
            bird.y = 30;
            bird.vy = Math.abs(bird.vy) * 0.5;
          } else if (bird.y > height * 0.60) {
            bird.y = height * 0.60;
            bird.vy = -Math.abs(bird.vy) * 0.5;
          }
        }

        // Wrap around horizontally across the screen
        if (bird.x > width + 70) {
          bird.x = -70;
          if (bird.isForeground) {
            // Re-enter directly in front of the headline and texts
            bird.y = 130 + Math.random() * 220;
          } else {
            bird.y = 35 + Math.random() * 150;
          }
          bird.vx = bird.baseSpeed;
          bird.vy = 0;
        } else if (bird.x < -90) {
          bird.x = width + 60;
        }

        // Banking tilt angle based on trajectory
        const targetBank = Math.max(-35, Math.min(35, (bird.vy / (Math.abs(bird.vx) || 1)) * 30));
        bird.bankAngle += (targetBank - bird.bankAngle) * 0.12;

        // Facing direction (bird always faces forward in direction of motion)
        const facing = bird.vx >= 0 ? 1 : -1;

        // Wing flapping cycle
        bird.wingPhase += bird.flapFreq;
        const wingFlap = Math.sin(bird.wingPhase); // -1 to 1

        // Wing rotation angles (-24 deg to +24 deg)
        const leftWingRot = wingFlap * 24;
        const rightWingRot = -wingFlap * 24;

        // Apply transforms directly
        const birdDom = birdDomsRef.current[idx];
        if (birdDom) {
          birdDom.style.transform = `translate3d(${bird.x.toFixed(1)}px, ${bird.y.toFixed(1)}px, 0) scale(${bird.scale * facing}, ${bird.scale}) rotate(${bird.bankAngle.toFixed(1)}deg)`;
        }

        const leftWing = birdWingsLeftRef.current[idx];
        if (leftWing) {
          leftWing.style.transform = `rotate(${leftWingRot.toFixed(1)}deg)`;
        }

        const rightWing = birdWingsRightRef.current[idx];
        if (rightWing) {
          rightWing.style.transform = `rotate(${rightWingRot.toFixed(1)}deg)`;
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative text-white overflow-hidden bg-[#0a66ab] ${className}`}
    >
      {/* 1. ANIMATED SKY BACKGROUND IMAGE WITH AMBIENT ZOOM + MOUSE PARALLAX PUSH/PULL */}
      <motion.div
        className="absolute -inset-12 bg-cover bg-top sm:bg-center bg-no-repeat pointer-events-none z-0"
        style={{
          backgroundImage: "url('/sky-bg.jpg')",
          x: skyBgX,
          y: skyBgY,
        }}
        animate={{
          scale: [1, 1.05, 1.02, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      />

      {/* 2. ATMOSPHERIC PULL MIST (Pulls towards mouse direction for 3D depth) */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-35 mix-blend-screen"
        style={{
          x: pullMistX,
          y: pullMistY,
        }}
      >
        <div className="absolute top-1/4 -left-10 w-[620px] h-[300px] bg-gradient-to-r from-white/40 via-sky-200/25 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[540px] h-[280px] bg-gradient-to-l from-white/30 via-blue-100/20 to-transparent rounded-full blur-3xl" />
      </motion.div>

      {/* 3. ATMOSPHERIC PUSH MIST (Pushes away from mouse for volumetric separation) */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25 mix-blend-overlay"
        style={{
          x: pushMistX,
          y: pushMistY,
        }}
      >
        <div className="absolute top-1/2 left-1/4 w-[700px] h-[290px] bg-white/35 rounded-full blur-3xl" />
      </motion.div>

      {/* 4. INTERACTIVE FLUFFY CUMULUS CLOUDS (React to cursor distance, smoothly pushing away) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {cloudsRef.current.map((cloud, idx) => (
          <div
            key={cloud.id}
            ref={(el) => (cloudDomsRef.current[idx] = el)}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${cloud.width}px`,
              height: `${cloud.height}px`,
              opacity: cloud.opacity,
              willChange: 'transform',
            }}
          >
            {/* Volumetric Cloud Shape */}
            <div className="w-full h-full relative rounded-full blur-2xl">
              {/* Outer soft glow */}
              <div className="absolute inset-0 bg-white/35 rounded-full blur-xl" />
              {/* Inner brighter cloud core */}
              <div className="absolute top-3 left-8 right-8 bottom-3 bg-gradient-to-b from-white/60 via-sky-100/35 to-transparent rounded-full blur-xl" />
              {/* Highlight billow */}
              <div className="absolute top-6 left-14 w-3/5 h-1/2 bg-white/70 rounded-full blur-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* 5. BACKGROUND BIRDS (Soaring in deep sky behind headline & text) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {birdsRef.current.map((bird, idx) => {
          if (bird.isForeground) return null;
          return (
            <div
              key={bird.id}
              ref={(el) => (birdDomsRef.current[idx] = el)}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                opacity: bird.opacity,
                willChange: 'transform',
                transformOrigin: '20px 12px',
              }}
            >
              <svg
                width="44"
                height="26"
                viewBox="0 0 44 26"
                className="overflow-visible filter drop-shadow-[0_2px_4px_rgba(10,40,75,0.4)]"
              >
                {/* Left/Far Wing */}
                <g style={{ transformOrigin: '20px 12px' }}>
                  <path
                    ref={(el) => (birdWingsLeftRef.current[idx] = el)}
                    d="M 20 12 C 16 5, 8 1, 1 1 C 8 6, 14 10, 20 12 Z"
                    fill="#0c2338"
                    style={{ transformOrigin: '20px 12px' }}
                  />
                </g>
                {/* Central Bird Body */}
                <path d="M 12 13 L 5 15 L 8 13 L 5 11 L 12 13 Z" fill="#16324f" />
                <path d="M 12 13 C 18 11, 24 11, 29 12.5 C 31 13, 31.5 13.8, 29 14.5 C 22 15.2, 16 15, 12 13 Z" fill="#16324f" />
                <circle cx="29" cy="13" r="2.2" fill="#16324f" />
                <circle cx="29.8" cy="12.5" r="0.6" fill="#fef08a" />
                <polygon points="31,12.5 35.5,13.2 31,13.8" fill="#d97706" />
                {/* Right/Near Wing */}
                <g style={{ transformOrigin: '20px 12px' }}>
                  <path
                    ref={(el) => (birdWingsRightRef.current[idx] = el)}
                    d="M 20 12 C 23 5, 29 0, 38 0 C 32 6, 26 10, 20 12 Z"
                    fill="#1b3e61"
                    style={{ transformOrigin: '20px 12px' }}
                  />
                </g>
              </svg>
            </div>
          );
        })}
      </div>

      {/* 6. SOFT ATMOSPHERIC RADIAL VIGNETTE */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-950/40 via-sky-900/15 to-sky-100/90 pointer-events-none z-0" />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none z-0"
        animate={{
          opacity: [0.75, 1, 0.8, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 7. HERO CONTENT (Header, Typography, Action Buttons, Showcase Cards) */}
      <div className="relative z-20">{children}</div>

      {/* 8. FOREGROUND BIRDS (Flying directly IN FRONT of headline, subtext & cards) */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {birdsRef.current.map((bird, idx) => {
          if (!bird.isForeground) return null;
          return (
            <div
              key={bird.id}
              ref={(el) => (birdDomsRef.current[idx] = el)}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                opacity: bird.opacity,
                willChange: 'transform',
                transformOrigin: '20px 12px',
              }}
            >
              <svg
                width="48"
                height="28"
                viewBox="0 0 44 26"
                className="overflow-visible filter drop-shadow-[0_4px_10px_rgba(0,18,40,0.65)]"
              >
                {/* Left/Far Wing with deep crisp contrast against white letters */}
                <g style={{ transformOrigin: '20px 12px' }}>
                  <path
                    ref={(el) => (birdWingsLeftRef.current[idx] = el)}
                    d="M 20 12 C 16 5, 8 1, 1 1 C 8 6, 14 10, 20 12 Z"
                    fill="#081524"
                    style={{ transformOrigin: '20px 12px' }}
                  />
                </g>
                {/* Central Aerodynamic Bird Body */}
                <path d="M 12 13 L 5 15 L 8 13 L 5 11 L 12 13 Z" fill="#0f2438" />
                <path d="M 12 13 C 18 11, 24 11, 29 12.5 C 31 13, 31.5 13.8, 29 14.5 C 22 15.2, 16 15, 12 13 Z" fill="#0f2438" />
                <circle cx="29" cy="13" r="2.2" fill="#0f2438" />
                <circle cx="29.8" cy="12.5" r="0.7" fill="#fef08a" />
                <polygon points="31,12.5 36,13.2 31,13.9" fill="#f59e0b" />
                {/* Right/Near Wing */}
                <g style={{ transformOrigin: '20px 12px' }}>
                  <path
                    ref={(el) => (birdWingsRightRef.current[idx] = el)}
                    d="M 20 12 C 23 5, 29 0, 38 0 C 32 6, 26 10, 20 12 Z"
                    fill="#15324d"
                    style={{ transformOrigin: '20px 12px' }}
                  />
                </g>
              </svg>
            </div>
          );
        })}
      </div>

      {/* 9. HORIZON CLOUDSCAPE BASE WITH INTERACTIVE TILT & WAVE LIFT */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-36 sm:h-64 pointer-events-none z-20"
        style={{
          rotate: horizonTilt,
          y: horizonLift,
        }}
        animate={{
          scaleY: [1, 1.03, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg
          className="w-full h-full text-white fill-current opacity-95 preserve-3d"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,160C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </motion.div>
    </div>
  );
};
