import { motion, AnimatePresence } from 'framer-motion';
import { Screen } from '../navigation';

const ITEMS: { screen: Screen['name']; label: string; icon: string }[] = [
  { screen: 'home', label: 'Home', icon: '🏠' },
  { screen: 'search', label: 'Search', icon: '🔍' },
  { screen: 'cart', label: 'Cart', icon: '🛒' },
  { screen: 'orders', label: 'Orders', icon: '📦' },
  { screen: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav({
  active,
  onNavigate,
  cartCount,
}: {
  active: Screen['name'];
  onNavigate: (s: Screen) => void;
  cartCount: number;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 flex z-40">
      {ITEMS.map((item) => {
        const isActive = active === item.screen;
        return (
          <button
            key={item.screen}
            className={`nav-tab relative ${isActive ? 'text-brand' : 'text-slate-400'}`}
            onClick={() => onNavigate({ name: item.screen } as Screen)}
          >
            {isActive && (
              <motion.span
                layoutId="nav-indicator"
                className="absolute top-0 inset-x-3 h-0.5 bg-brand rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <motion.span animate={isActive ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }} className="text-lg">
              {item.icon}
            </motion.span>
            {item.label}
            <AnimatePresence>
              {item.screen === 'cart' && cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                  className="absolute top-0 right-6 bg-brand text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </nav>
  );
}
