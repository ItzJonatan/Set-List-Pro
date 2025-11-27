import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Music2, Music3, Music4 } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  iconIndex: number;
  velocity: { x: number; y: number };
}

export const ClickEffect: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Function to spawn particles
  const spawnParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    const count = 4 + Math.floor(Math.random() * 4); // 4 to 7 particles

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + Math.random(),
        x,
        y,
        rotation: Math.random() * 360,
        iconIndex: Math.floor(Math.random() * 4),
        velocity: {
          x: (Math.random() - 0.5) * 4, // Spread horizontally
          y: -2 - Math.random() * 4,    // Move up
        },
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  // Global click listener
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Check if the target is a button or inside a button
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      
      // Only trigger on button clicks or elements with role="button"
      if (button || target.getAttribute('role') === 'button') {
        spawnParticles(e.clientX, e.clientY);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [spawnParticles]);

  // Cleanup particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles((prev) => prev.slice(1)); // Remove oldest
    }, 1000);
    return () => clearTimeout(timer);
  }, [particles]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: p.x, y: p.y, scale: 0.5, rotate: p.rotation }}
            animate={{
              x: p.x + p.velocity.x * 50,
              y: p.y + p.velocity.y * 50,
              opacity: 0,
              scale: 1.2,
              rotate: p.rotation + 90,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]"
          >
            {getIcon(p.iconIndex)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const getIcon = (index: number) => {
  const size = 20;
  switch (index) {
    case 0: return <Music size={size} />;
    case 1: return <Music2 size={size} />;
    case 2: return <Music3 size={size} />;
    default: return <Music4 size={size} />;
  }
};