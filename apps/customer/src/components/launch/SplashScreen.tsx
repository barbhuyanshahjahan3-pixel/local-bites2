import { motion } from 'framer-motion';

/**
 * First thing shown every time the app opens (fresh load, not a client-side
 * navigation) — logo + tagline + a brief loading spinner while auth/session
 * state resolves. Auto-advances via the parent's timer, this component is
 * purely visual.
 */
export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <motion.img
          src="/logo.png"
          alt="Local Bites"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-3xl shadow-lg shadow-brand/20 mb-4"
        />
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Local<span className="text-brand">Bites</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Good food. Fast delivery.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-16 w-6 h-6 border-2 border-slate-700 border-t-brand rounded-full animate-spin"
      />
    </motion.div>
  );
}
