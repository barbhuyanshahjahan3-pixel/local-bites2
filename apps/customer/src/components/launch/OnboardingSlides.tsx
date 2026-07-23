import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

const SLIDES = [
  {
    emoji: '🛵',
    title: 'Delicious food, delivered to your door',
    body: 'Order from the best local restaurants near you, tracked live from kitchen to doorstep.',
  },
  {
    emoji: '🍔',
    title: 'Hundreds of restaurants, one app',
    body: 'Biryani, pizza, burgers, cakes and more — browse, compare and order in a few taps.',
  },
  {
    emoji: '📍',
    title: 'Know exactly where your order is',
    body: 'Share your location for accurate delivery charges and real-time tracking on the map.',
  },
];

/**
 * First-time-only onboarding: three swipeable illustration slides with dot
 * indicators, matching the splash → slides → location-permission flow.
 * Shown once (App.tsx sets lb_onboarded after this completes).
 */
export default function OnboardingSlides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const go = (next: number) => {
    if (next < 0) return;
    if (next >= SLIDES.length) return onDone();
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1);
    else if (info.offset.x > 60) go(index - 1);
  };

  const slide = SLIDES[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950"
    >
      <div className="flex justify-end px-4 pt-4">
        <button className="text-sm text-slate-500" onClick={onDone}>
          Skip
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -80 : 80 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-32 h-32 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-6xl mb-8"
            >
              {slide.emoji}
            </motion.div>
            <h2 className="text-xl font-semibold text-white mb-2">{slide.title}</h2>
            <p className="text-sm text-slate-400 max-w-xs">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-10 space-y-5">
        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-brand' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full"
          onClick={() => go(index + 1)}
        >
          {isLast ? 'Get started' : 'Next'}
        </motion.button>
      </div>
    </motion.div>
  );
}
