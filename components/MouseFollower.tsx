"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function MouseFollower() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const rafRef = useRef<number | null>(null);
  const latestPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsClient(true);
    
    // Throttle mousemove updates using requestAnimationFrame
    const updatePosition = (e: MouseEvent) => {
      latestPos.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setPosition(latestPos.current);
          rafRef.current = null;
        });
      }
    };

    window.addEventListener('mousemove', updatePosition);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!isClient) return null;

  return (
    <>
      {/* Main large follower */}
      <div 
        className="fixed pointer-events-none z-0 opacity-30 rounded-full bg-purple-600 blur-3xl"
        style={{
          width: '400px',
          height: '400px',
          transform: `translate(${position.x - 200}px, ${position.y - 200}px)`,
          transition: 'transform 0.15s ease-out',
        }}
        aria-hidden="true"
      />
      
      {/* Secondary smaller follower */}
      <div 
        className="fixed pointer-events-none z-0 opacity-50 rounded-full bg-purple-400 blur-xl"
        style={{
          width: '100px',
          height: '100px',
          transform: `translate(${position.x - 50}px, ${position.y - 50}px)`,
          transition: 'transform 0.05s linear',
        }}
        aria-hidden="true"
      />
      
      {/* Little bright dot at cursor */}
      <div 
        className="fixed pointer-events-none z-0 opacity-80 rounded-full bg-white"
        style={{
          width: '8px',
          height: '8px',
          transform: `translate(${position.x - 4}px, ${position.y - 4}px)`,
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
        }}
        aria-hidden="true"
      />
    </>
  );
} 