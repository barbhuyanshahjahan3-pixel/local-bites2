import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OnlineToggle from '../components/OnlineToggle';
import AvailableTab from './tabs/AvailableTab';
import MyDeliveryTab from './tabs/MyDeliveryTab';
import HistoryTab from './tabs/HistoryTab';
import EarningsTab from './tabs/EarningsTab';

const TAB_IDS = ['delivery', 'available', 'history', 'earnings'] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABEL: Record<TabId, string> = {
  delivery: 'Current',
  available: 'Available',
  history: 'History',
  earnings: 'Earnings',
};

export default function DashboardPage() {
  const { logout, profile } = useAuth();
  const [active, setActive] = useState<TabId>('delivery');
  const [isOnline, setIsOnline] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/delivery/logo.png" alt="Local Bites Delivery Partner" className="w-9 h-9 rounded-lg" />
          <div>
            <h1 className="text-lg font-semibold text-white">Local Bites — Delivery</h1>
            {profile && <p className="text-xs text-slate-500">{profile.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OnlineToggle isOnline={isOnline} onChange={setIsOnline} />
          <button className="btn-ghost text-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="px-4 sm:px-8 py-3 flex gap-2 overflow-x-auto border-b border-slate-800">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              active === id ? 'bg-brand text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </nav>

      <main className="px-4 sm:px-8 py-6">
        {!isOnline && (
          <p className="text-sm text-amber-400 mb-4">
            You're offline — go online to receive new delivery alerts.
          </p>
        )}
        {active === 'delivery' && <MyDeliveryTab refreshKey={refreshKey} />}
        {active === 'available' && <AvailableTab onAccepted={() => { setRefreshKey((k) => k + 1); setActive('delivery'); }} />}
        {active === 'history' && <HistoryTab />}
        {active === 'earnings' && <EarningsTab />}
      </main>
    </div>
  );
}
