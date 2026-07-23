import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { SalesReport } from '../../api/types';

export default function ReportsTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<{ report: SalesReport }>(`/api/restaurant/reports/sales?${params}`);
      setReport(res.report);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <form onSubmit={runReport} className="card space-y-3">
        <h2 className="font-semibold text-white">Sales report</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Run report'}
        </motion.button>
      </form>

      {report && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Delivered orders" value={report.orderCount} icon="📦" delay={0} />
          <StatCard label="Gross revenue" value={report.totalRevenue} prefix="₹" icon="💰" delay={0.05} />
          <StatCard label="Platform commission" value={report.totalCommission} prefix="₹" icon="🧾" delay={0.1} />
          <StatCard
            label="Net payout"
            value={report.netPayout}
            prefix="₹"
            icon="✅"
            highlight
            delay={0.15}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  prefix = '',
  icon,
  highlight,
  delay,
}: {
  label: string;
  value: number;
  prefix?: string;
  icon: string;
  highlight?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`card space-y-1 ${highlight ? 'ring-1 ring-brand/60' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <motion.p
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.1, type: 'spring', stiffness: 300, damping: 18 }}
        className={`text-2xl font-bold ${highlight ? 'text-brand' : 'text-white'}`}
      >
        {prefix}
        {value.toLocaleString('en-IN')}
      </motion.p>
    </motion.div>
  );
}
