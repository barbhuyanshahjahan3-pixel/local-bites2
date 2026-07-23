import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Stage = 'logo' | 'loading' | 'done';

const DURATIONS: Record<Exclude<Stage, 'done'>, number> = {
  logo: 700,
  loading: 900,
};

const ORDER: Stage[] = ['logo', 'loading', 'done'];

/**
 * Delivery app opening animation — plays once on every fresh app load:
 * logo fades/scales in on the brand-lime background, then a brief loading
 * bar, then the real app (login or dashboard) fades in underneath it.
 * Mirrors the customer and restaurant apps' launch flows so every partner
 * surface has the same polish.
 */
export default function DeliverySplash({ onDone }: { onDone?: () => void }) {
  const [stage, setStage] = useState<Stage>('logo');
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
      const pct = Math.min(100, ((Date.now() - start) / DURATIONS.loading) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(raf);
    }, 30);
    return () => clearInterval(raf);
  }, [stage]);

  if (stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 'logo' && (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center"
          >
            <motion.img
              src="/delivery/logo.png"
              alt="Local Bites Delivery Partner"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="w-32 h-32 rounded-3xl shadow-xl shadow-brand/20 mb-4"
            />
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Local Bites <span className="text-brand">Delivery</span>
            </h1>
          </motion.div>
        )}

        {stage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center px-10"
          >
            <img
              src="/delivery/logo.png"
              alt="Local Bites Delivery Partner"
              className="w-24 h-24 rounded-3xl shadow-xl shadow-brand/20 mb-8"
            />
            <div className="w-full max-w-[220px] h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-brand rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-3">Getting ready…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
