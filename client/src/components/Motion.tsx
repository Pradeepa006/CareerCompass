import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const ease = [0.23, 1, 0.32, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.24, ease }}>{children}</motion.div>;
}

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: reducedMotion ? 0 : 0.28, delay: reducedMotion ? 0 : delay, ease }}>{children}</motion.div>;
}

export function AnimatedNumber({ value, suffix = "", duration = 0.65 }: { value: number; suffix?: string; duration?: number }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  useEffect(() => {
    if (reducedMotion) { setDisplay(value); return; }
    const controls = animate(0, value, { duration, ease, onUpdate: latest => setDisplay(Math.round(latest)) });
    return () => controls.stop();
  }, [duration, reducedMotion, value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

export const interactiveCard = "transition duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(24,39,56,.09)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_38px_rgba(24,39,56,.09)]";
