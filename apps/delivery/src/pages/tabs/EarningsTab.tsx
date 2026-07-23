import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Earnings } from '../../api/types';
import NotificationSettingsCard from '../../components/NotificationSettingsCard';

export default function EarningsTab() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);

  useEffect(() => {
    api.get<{ earnings: Earnings }>('/api/delivery/earnings').then((r) => setEarnings(r.earnings));
  }, []);

  return (
    <div className="max-w-sm space-y-3">
      <h2 className="font-semibold text-white">Earnings</h2>
      <NotificationSettingsCard />
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Total earned</span>
          <span className="text-2xl font-semibold text-white">₹{earnings?.totalEarnings ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Total deliveries</span>
          <span className="text-lg text-slate-200">{earnings?.totalDeliveries ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
