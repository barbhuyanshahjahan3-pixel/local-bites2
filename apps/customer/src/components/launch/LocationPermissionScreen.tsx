import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Custom-styled lead-in shown once, right before we actually call
 * navigator.geolocation — which is what triggers the browser/OS's own
 * native permission dialog (that native dialog can't be styled, this
 * screen just sets context for it, matching how Zomato/Swiggy do it).
 * Location itself is used later at checkout for the accurate delivery
 * charge; we don't block the app on this, "Not now" just skips it.
 */
export default function LocationPermissionScreen({ onDone }: { onDone: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const allow = () => {
    if (!navigator.geolocation) return onDone();
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => onDone(),
      () => onDone(), // denied or failed — app still works, charge falls back to city default
      { timeout: 8000 }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 px-6"
    >
      <div className="pt-14 text-center">
        <img src="/logo.png" alt="Local Bites" className="w-12 h-12 rounded-xl mx-auto mb-2" />
        <h1 className="text-lg font-bold text-white">
          Local<span className="text-brand">Bites</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">📍 Delivering to you</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card w-full max-w-xs text-center space-y-4"
        >
          <p className="text-white font-medium">
            Allow Local Bites to access this device's location?
          </p>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-3xl"
          >
            📍
          </motion.div>
          <p className="text-xs text-slate-500">
            This gives you accurate delivery charges and live order tracking.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full"
            disabled={requesting}
            onClick={allow}
          >
            {requesting ? 'Requesting…' : 'Allow'}
          </motion.button>
          <button className="text-sm text-slate-500" onClick={onDone}>
            Don't allow
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
