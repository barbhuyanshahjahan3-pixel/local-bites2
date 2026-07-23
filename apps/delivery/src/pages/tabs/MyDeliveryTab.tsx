import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AssignedOrder } from '../../api/types';
import DeliveryMap from '../../components/DeliveryMap';
import { useLiveLocationReporter } from '../../hooks/useLiveLocationReporter';

const STEP_ACTIONS: Record<string, { action: string; label: string } | null> = {
  delivery_accepted: { action: 'pickup', label: 'Mark picked up' },
  picked_up: { action: 'on_the_way', label: 'Mark on the way' },
  on_the_way: { action: 'delivered', label: 'Mark delivered' },
};

export default function MyDeliveryTab({ refreshKey }: { refreshKey: number }) {
  const [order, setOrder] = useState<AssignedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const selfPosition = useLiveLocationReporter(!!order);

  const load = () =>
    api.get<{ order: AssignedOrder | null }>('/api/delivery/my-order').then((r) => setOrder(r.order));

  useEffect(() => {
    load();
  }, [refreshKey]);

  const advance = async () => {
    if (!order) return;
    const step = STEP_ACTIONS[order.status];
    if (!step) return;

    const body: { action: string; cashCollected?: boolean } = { action: step.action };
    if (step.action === 'delivered' && order.codRemainingAmount > 0) {
      const confirmed = confirm(
        `Confirm you have collected ₹${order.codRemainingAmount} cash from the customer.`
      );
      if (!confirmed) return;
      body.cashCollected = true;
    }

    setLoading(true);
    try {
      await api.patch(`/api/delivery/orders/${order._id}/status`, body);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!order) return;
    if (!confirm('Reject this delivery? It will be re-queued for another rider.')) return;
    await api.patch(`/api/delivery/orders/${order._id}/status`, { action: 'reject', reason: 'Unable to complete' });
    await load();
  };

  if (!order) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Current delivery</h2>
        <p className="text-sm text-slate-500">No active delivery. Accept one from the Available tab.</p>
      </div>
    );
  }

  const step = STEP_ACTIONS[order.status];

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white">Current delivery</h2>
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-white">{order.orderNumber}</p>
          <span className="badge bg-brand/20 text-brand">{order.status.replace(/_/g, ' ')}</span>
        </div>

        <div>
          <p className="label">Customer</p>
          <p className="text-sm text-slate-200">{order.customerName} · {order.customerMobile}</p>
        </div>
        <div>
          <p className="label">Deliver to</p>
          <p className="text-sm text-slate-200">{order.deliveryAddress}</p>
        </div>
        {(order.restaurant?.lat || order.deliveryLat) && (
          <DeliveryMap
            pickup={
              order.restaurant?.lat && order.restaurant?.lng
                ? { lat: order.restaurant.lat, lng: order.restaurant.lng }
                : null
            }
            drop={order.deliveryLat && order.deliveryLng ? { lat: order.deliveryLat, lng: order.deliveryLng } : null}
            self={selfPosition}
          />
        )}
        <div>
          <p className="label">Order</p>
          <ul className="text-sm text-slate-400">
            {order.items.map((it, i) => (
              <li key={i}>{it.quantity} × {it.name}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-slate-300">
          Total ₹{order.grandTotal} · {order.paymentMethod.toUpperCase()} · {order.paymentStatus}
        </p>
        {order.codRemainingAmount > 0 && (
          <p className="text-sm font-semibold text-amber-400">
            Collect ₹{order.codRemainingAmount} cash on delivery
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {step && (
            <button className="btn-primary flex-1 text-sm" disabled={loading} onClick={advance}>
              {loading ? 'Updating…' : step.label}
            </button>
          )}
          {order.status === 'delivery_accepted' && (
            <button className="btn-ghost flex-1 text-sm" onClick={reject}>
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
