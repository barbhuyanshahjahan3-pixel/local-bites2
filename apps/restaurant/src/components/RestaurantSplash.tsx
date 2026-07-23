import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Stage = 'launch' | 'logo' | 'pop' | 'loading' | 'welcome' | 'done';

const DURATIONS: Record<Exclude<Stage, 'done'>, number> = {
  launch: 650,
  logo: 750,
  pop: 750,
  loading: 1100,
  welcome: 1300,
};

const ORDER: Stage[] = ['launch', 'logo', 'pop', 'loading', 'welcome', 'done'];

/**
 * Restaurant app opening animation — plays once on every fresh app load,
 * matching the requested 6-step sequence: solid-color launch screen, logo
 * fade+scale in, a little bounce/particle "pop", a loading bar, a welcome
 * screen with the tagline, then the real app slides up underneath it.
 */
export default function RestaurantSplash({ onDone }: { onDone?: () => void }) {
  const [stage, setStage] = useState<Stage>('launch');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage === 'done') {
      onDone?.();
      return;
    }
    const ms = DURATIONS[stage as Exclude<Stage, 'done'>];
    const timer = setTimeout(() => {
      const next = ORDER[ORDER.indexOf(stage) + 1];
      setStage(next);
    }, ms);
    return () => clearTimeout(timer);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== 'loading') return;
    setProgress(0);
    const start = Date.now();
    const raf = setInterval(() => {
      const pct = Math.min(100, (Date.now() - start) / DURATIONS.loading * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(raf);
    }, 30);
    return () => clearInterval(raf);
  }, [stage]);

  if (stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Stage 1 — App Launch: solid brand-green screen, white cloche icon */}
        {stage === 'launch' && (
          <motion.div
            key="launch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-brand flex items-center justify-center"
          >
            <motion.svg
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M4 15h16M12 15V9a5 5 0 0 1 5 5M12 4v1M18 17H6l-.5 2h13z" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </motion.div>
        )}

        {/* Stage 2 — Logo Animation: white bg, logo scales up with fade-in */}
        {stage === 'logo' && (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white flex items-center justify-center"
          >
            <motion.img
              src="/restaurant/logo.png"
              alt="Local Bites Restaurant Partner"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="w-40 h-40 rounded-3xl shadow-xl"
            />
          </motion.div>
        )}

        {/* Stage 3 — Logo Pop Effect: slight bounce with particles */}
        {stage === 'pop' && (
          <motion.div
            key="pop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white flex items-center justify-center"
          >
            <motion.img
              src="/restaurant/logo.png"
              alt="Local Bites Restaurant Partner"
              animate={{ scale: [1, 1.12, 0.97, 1.03, 1] }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="w-40 h-40 rounded-3xl shadow-xl relative z-10"
            />
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * 2 * Math.PI;
              const dist = 90 + (i % 3) * 20;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    scale: [0, 1, 0.5],
                  }}
                  transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
                  className="absolute w-2 h-2 rounded-full bg-brand"
                  style={{ left: '50%', top: '50%' }}
                />
              );
            })}
          </motion.div>
        )}

        {/* Stage 4 — Loading Screen: logo + loading bar filling smoothly */}
        {stage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white flex flex-col items-center justify-center px-10"
          >
            <img
              src="/restaurant/logo.png"
              alt="Local Bites Restaurant Partner"
              className="w-32 h-32 rounded-3xl shadow-xl mb-8"
            />
            <div className="w-full max-w-[220px] h-2 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full bg-brand rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-3">Loading…</p>
          </motion.div>
        )}

        {/* Stage 5 — Welcome Screen: tagline + illustration fade in */}
        {stage === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-emerald-50 flex flex-col items-center justify-center px-8 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-slate-900">Manage</h1>
              <h1 className="text-2xl font-bold text-brand mb-2">Your Restaurant</h1>
              <p className="text-sm text-slate-600">Orders, Menu, Customers — All in One Place</p>
            </motion.div>
            <motion.img
              src="/restaurant/logo.png"
              alt="Local Bites Restaurant Partner"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              className="w-40 h-40 rounded-3xl shadow-xl mt-8"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
