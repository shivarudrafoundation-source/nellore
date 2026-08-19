'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CategoryHeroConfig, heroCategories } from '../config/hero.config';

interface HeroContestantCanvasProps {
  category: CategoryHeroConfig;
  onLoadingStateChange?: (loading: boolean) => void;
}

// Global in-memory cache for all category frames so they load once and stay forever
const frameCache: Record<string, HTMLImageElement[]> = {};
let isGlobalPreloading = false;

function preloadAllCategories(onCategoryReady?: (catId: string) => void) {
  if (isGlobalPreloading) return;
  isGlobalPreloading = true;

  heroCategories.forEach((cat) => {
    if (frameCache[cat.id] && frameCache[cat.id].length === cat.frameCount) return;

    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;
    const count = cat.frameCount;

    for (let i = 0; i < count; i++) {
      const img = new Image();
      const frameStr = String(i).padStart(3, '0');
      img.src = `${cat.path}/frame_${frameStr}.webp`;

      img.onload = () => {
        loadedCount++;
        if (loadedCount >= count) {
          const sorted = [...loadedImages].sort((a, b) => {
            const getNum = (src: string) => {
              const match = src.match(/frame_(\d+)\.webp/);
              return match ? parseInt(match[1], 10) : 0;
            };
            return getNum(a.src) - getNum(b.src);
          });
          frameCache[cat.id] = sorted;
          onCategoryReady?.(cat.id);
        }
      };

      img.onerror = () => {
        // Fallback: don't block playback if single frame has error
        loadedCount++;
        if (loadedCount >= count) {
          frameCache[cat.id] = loadedImages;
          onCategoryReady?.(cat.id);
        }
      };

      loadedImages.push(img);
    }
  });
}

export default function HeroContestantCanvas({
  category,
  onLoadingStateChange,
}: HeroContestantCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentFrames, setCurrentFrames] = useState<HTMLImageElement[]>(() => frameCache[category.id] || []);
  const [ready, setReady] = useState<boolean>(() => !!frameCache[category.id]?.length);
  const animationFrameId = useRef<number | null>(null);
  const currentFrameIndex = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const prefersReducedMotion = useRef<boolean>(false);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Preload all categories on initial mount
  useEffect(() => {
    preloadAllCategories((readyCatId) => {
      if (readyCatId === category.id) {
        setCurrentFrames(frameCache[readyCatId] || []);
        setReady(true);
        onLoadingStateChange?.(false);
      }
    });
  }, [category.id, onLoadingStateChange]);

  // Update active frames whenever category prop changes
  useEffect(() => {
    if (frameCache[category.id] && frameCache[category.id].length > 0) {
      setCurrentFrames(frameCache[category.id]);
      setReady(true);
      onLoadingStateChange?.(false);
    } else {
      setReady(false);
      onLoadingStateChange?.(true);
      // Ensure frames for this category are loaded
      preloadAllCategories((readyCatId) => {
        if (readyCatId === category.id) {
          setCurrentFrames(frameCache[readyCatId] || []);
          setReady(true);
          onLoadingStateChange?.(false);
        }
      });
    }
  }, [category.id, onLoadingStateChange]);

  // RequestAnimationFrame Canvas Rendering Loop
  useEffect(() => {
    if (!ready || currentFrames.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    currentFrameIndex.current = 0;
    lastFrameTime.current = performance.now();
    const frameInterval = 1000 / 24; // 24 FPS target (~41.6ms)

    const render = (timestamp: number) => {
      if (document.visibilityState === 'hidden') {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      const elapsed = timestamp - lastFrameTime.current;

      if (prefersReducedMotion.current) {
        const img = currentFrames[0];
        if (img && img.complete) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawScaledPerson(ctx, img, canvas.width, canvas.height);
        }
        return;
      }

      if (elapsed >= frameInterval) {
        lastFrameTime.current = timestamp - (elapsed % frameInterval);

        const img = currentFrames[currentFrameIndex.current];
        if (img && img.complete) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawScaledPerson(ctx, img, canvas.width, canvas.height);
        }

        currentFrameIndex.current = (currentFrameIndex.current + 1) % currentFrames.length;
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [currentFrames, ready]);

  /**
   * Scales and positions the walking contestant on the runway.
   * Applied a 10% height increase (scale 1.10) with bottom alignment anchored to the runway base.
   */
  const drawScaledPerson = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cWidth: number,
    cHeight: number,
  ) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = cWidth / cHeight;
    
    // Scale by 1.10 (+10% height increase)
    const scaleFactor = 1.10;
    let dWidth = cWidth * scaleFactor;
    let dHeight = (cWidth / imgRatio) * scaleFactor;

    if (imgRatio > canvasRatio) {
      dWidth = (cHeight * imgRatio) * scaleFactor;
      dHeight = cHeight * scaleFactor;
    }

    const dx = (cWidth - dWidth) / 2;
    // Anchor to bottom runway line so feet stay grounded
    const dy = cHeight - dHeight;

    ctx.drawImage(img, dx, dy, dWidth, dHeight);
  };

  return (
    <div className="relative w-full h-full flex items-end justify-center">
      {/* Golden Aura Rim Light behind the contestant */}
      <div className="absolute inset-0 bg-radial-glow from-luxury-gold/15 via-transparent to-transparent pointer-events-none select-none filter blur-2xl opacity-70 z-0" />

      {/* HTML5 Canvas Surface (Increased resolution 400x704 for crisp 10% taller rendering) */}
      <canvas
        ref={canvasRef}
        width={400}
        height={704}
        className="w-full h-full object-contain object-bottom relative z-10 select-none pointer-events-none"
      />

      {/* Drop Shadow effect on floor */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-52 h-4 bg-black/70 rounded-full blur-md z-0 pointer-events-none select-none" />

      <style jsx global>{`
        .bg-radial-glow {
          background: radial-gradient(circle at 50% 60%, rgba(212, 175, 55, 0.18) 0%, transparent 65%);
        }
      `}</style>
    </div>
  );
}
