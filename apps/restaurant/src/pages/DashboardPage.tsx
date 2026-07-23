import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import OrdersTab from './tabs/OrdersTab';
import MenuTab from './tabs/MenuTab';
import ReportsTab from './tabs/ReportsTab';
import ProfileTab from './tabs/ProfileTab';

const TABS = [
  { id: 'orders', label: 'Orders', Component: OrdersTab },
  { id: 'menu', label: 'Menu', Component: MenuTab },
  { id: 'profile', label: 'Profile & Gallery', Component: ProfileTab },
  { id: 'reports', label: 'Reports', Component: ReportsTab },
] as const;

export default function DashboardPage() {
  const { logout, profile } = useAuth();
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('orders');
  const ActiveComponent = TABS.find((t) => t.id === active)!.Component;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/restaurant/logo.png" alt="Local Bites Restaurant Partner" className="w-9 h-9 rounded-lg" />
          <div>
            <h1 className="text-lg font-semibold text-white">Local Bites — Restaurant</h1>
            {profile && <p className="text-xs text-slate-500">{profile.name}</p>}
          </div>
        </div>
        <button className="btn-ghost text-sm" onClick={logout}>
          Log out
        </button>
      </header>

      <nav className="px-4 sm:px-8 py-3 flex gap-2 overflow-x-auto border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`relative px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              active === t.id ? 'text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {active === t.id && (
              <motion.span
                layoutId="restaurant-tab-bg"
                className="absolute inset-0 bg-brand rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="px-4 sm:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
