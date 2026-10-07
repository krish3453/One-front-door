import React, { useEffect, useRef, useState, useCallback } from "react";
import "./InteractiveOrb.css";

interface InteractiveOrbProps {
  onClick?: () => void;
}

export const InteractiveOrb: React.FC<InteractiveOrbProps> = ({ onClick }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const plasmaRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const nucleusRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isRippling, setIsRippling] = useState(false);

  // Motion physics state
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, proximity: 0 });
  const animFrameId = useRef<number | null>(null);

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Limit maximum magnetic pull distance
    const maxDist = 380;
    const clampedDist = Math.min(dist, maxDist);
    const proximity = Math.max(0, 1 - clampedDist / maxDist);

    // Normalize coordinates (-1 to 1) scaled by proximity
    const normX = (dx / (rect.width * 2)) * Math.min(1.4, proximity * 1.6);
    const normY = (dy / (rect.height * 2)) * Math.min(1.4, proximity * 1.6);

    mouse.current.targetX = normX * 35;
    mouse.current.targetY = normY * 35;
    mouse.current.proximity = proximity;
  }, []);

  const handlePointerLeave = useCallback(() => {
    mouse.current.targetX = 0;
    mouse.current.targetY = 0;
    mouse.current.proximity = 0;
    setIsHovered(false);
  }, []);

  const handleClick = () => {
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 900);
    if (onClick) onClick();
  };

  useEffect(() => {
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave);

    // Smooth Lerp Animation Loop
    let currX = 0;
    let currY = 0;
    let currProx = 0;

    const renderLoop = () => {
      // Linear interpolation (lerp)
      currX += (mouse.current.targetX - currX) * 0.085;
      currY += (mouse.current.targetY - currY) * 0.085;
      currProx += (mouse.current.proximity - currProx) * 0.085;

      const rotX = -currY * 0.8;
      const rotY = currX * 0.8;

      if (orbRef.current) {
        orbRef.current.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(${currX * 0.7}px, ${currY * 0.7}px, 0) scale(${1 + currProx * 0.12})`;
      }

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${currX * 0.3}px, ${currY * 0.3}px, 0) scale(${1 + currProx * 0.25})`;
        auraRef.current.style.opacity = `${0.65 + currProx * 0.35}`;
      }

      if (plasmaRef.current) {
        plasmaRef.current.style.transform = `translate3d(${currX * 0.6}px, ${currY * 0.6}px, 15px)`;
      }

      if (coreRef.current) {
        coreRef.current.style.transform = `translate3d(${currX * 1.1}px, ${currY * 1.1}px, 30px)`;
      }

      if (nucleusRef.current) {
        nucleusRef.current.style.transform = `translate3d(${currX * 1.8}px, ${currY * 1.8}px, 45px) scale(${1 + currProx * 0.4})`;
      }

      if (ring1Ref.current) {
        ring1Ref.current.style.transform = `rotate(${currX * 2}deg) scale(${1 + currProx * 0.08})`;
      }

      if (ring2Ref.current) {
        ring2Ref.current.style.transform = `rotate(${-currY * 2}deg) scale(${1 + currProx * 0.12})`;
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [handlePointerMove, handlePointerLeave]);

  return (
    <div
      ref={wrapperRef}
      className={`interactive-orb-wrapper ${isHovered ? "hovered" : ""} ${
        isRippling ? "rippling" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handlePointerLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title="Click to interact with Campus AI Core"
    >
      <div ref={orbRef} className="interactive-orb">
        {/* Shockwave ripple ring triggered on click */}
        <div className="interactive-shockwave" />

        {/* Ambient Outer Aura */}
        <div ref={auraRef} className="orb-layer orb-aura" />

        {/* Liquid Plasma Body */}
        <div ref={plasmaRef} className="orb-layer orb-plasma" />

        {/* Inner Glowing Core */}
        <div ref={coreRef} className="orb-layer orb-core" />

        {/* Floating Magnetic Nucleus */}
        <div ref={nucleusRef} className="orb-layer orb-nucleus" />

        {/* Rotating Light Orbit Rings */}
        <div ref={ring1Ref} className="orb-ring orb-ring-1" />
        <div ref={ring2Ref} className="orb-ring orb-ring-2" />
      </div>
    </div>
  );
};

export default InteractiveOrb;
