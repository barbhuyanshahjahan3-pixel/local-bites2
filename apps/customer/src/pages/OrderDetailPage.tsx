import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useCustomerSocket } from '../hooks/useCustomerSocket';
import { Screen } from '../navigation';
import OrderTrackingMap from '../components/OrderTrackingMap';

interface StatusEvent {
  status: string;
  at: string;
  by?: string;
  note?: string;
}

interface OrderFull {
  _id: string;
  orderNumber: string;
  items: { name: string; price: number; quantity: number }[];
  itemsTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  advanceAmount: number;
  codRemainingAmount: number;
  codCollected: boolean;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  statusHistory: StatusEvent[];
  restaurant: { _id: string; name: string; lat?: number; lng?: number };
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryPartner?: { name: string; currentLat?: number; currentLng?: number; vehicleType?: string } | null;
}

const TRACKABLE_STATUSES = ['delivery_accepted', 'picked_up', 'on_the_way'];

const CANCELLABLE_STATUSES = ['placed', 'restaurant_accepted'];

const STATUS_LABEL: Record<string, string> = {
  placed: 'Order placed',
  restaurant_accepted: 'Accepted by restaurant',
  preparing: 'Preparing your food',
  ready_for_pickup: 'Ready for pickup',
  delivery_accepted: 'Rider assigned',
  picked_up: 'Picked up by rider',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  restaurant_rejected: 'Rejected by restaurant',
  delivery_rejected: 'Re-queued for a new rider',
  cancelled: 'Cancelled',
};

export default function OrderDetailPage({ orderId }: { orderId: string; onNavigate: (s: Screen) => void }) {
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [partnerPos, setPartnerPos] = useState<{ lat: number; lng: number } | null>(null);

  const load = () =>
    api.get<{ order: OrderFull }>(`/api/customer/orders/mine/${orderId}`).then((r) => {
      setOrder(r.order);
      if (r.order.deliveryPartner?.currentLat && r.order.deliveryPartner?.currentLng) {
        setPartnerPos({ lat: r.order.deliveryPartner.currentLat, lng: r.order.deliveryPartner.currentLng });
      }
    });

  useEffect(() => {
    load();
  }, [orderId]);

  useCustomerSocket(
    (payload) => {
      if (payload.orderId === orderId) load();
    },
    (payload) => {
      if (payload.orderId === orderId) setPartnerPos({ lat: payload.lat, lng: payload.lng });
    }
  );

  const submitReview = async () => {
    if (!order) return;
    await api.post('/api/customer/reviews', {
      restaurantId: order.restaurant._id,
      orderId: order._id,
      rating,
      comment,
    });
    setReviewSent(true);
  };

  const cancelOrder = async () => {
    if (!order) return;
    const confirmed = window.confirm(
      `Cancel this order? The Rs.${order.advanceAmount} you already paid online will NOT be refunded.`
    );
    if (!confirmed) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/api/customer/orders/${order._id}/cancel`, {});
      load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (!order) return <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>;

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-white">{order.orderNumber}</h1>
        <p className="text-sm text-slate-400">{order.restaurant?.name}</p>
      </div>

      {TRACKABLE_STATUSES.includes(order.status) && (order.restaurant?.lat || order.deliveryLat) && (
        <div className="space-y-1">
          <OrderTrackingMap
            restaurant={
              order.restaurant?.lat && order.restaurant?.lng
                ? { lat: order.restaurant.lat, lng: order.restaurant.lng }
                : null
            }
            drop={order.deliveryLat && order.deliveryLng ? { lat: order.deliveryLat, lng: order.deliveryLng } : null}
            partner={partnerPos}
          />
          {!partnerPos && (
            <p className="text-xs text-slate-500">
              Waiting for your delivery partner's live location…
            </p>
          )}
        </div>
      )}

      <div className="card space-y-2">
        {order.statusHistory.map((ev, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-200">{STATUS_LABEL[ev.status] || ev.status}</p>
              <p className="text-xs text-slate-500">{new Date(ev.at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-1">
        <h2 className="font-semibold text-white mb-1">Items</h2>
        {order.items.map((it, i) => (
          <p key={i} className="text-sm text-slate-400">
            {it.quantity} × {it.name} — ₹{it.price * it.quantity}
          </p>
        ))}
        <div className="border-t border-slate-800 mt-2 pt-2 text-sm text-slate-300 space-y-1">
          <p>Items total: ₹{order.itemsTotal}</p>
          <p>Delivery: ₹{order.deliveryCharge}</p>
          <p className="font-semibold text-white">Total: ₹{order.grandTotal}</p>
        </div>
        <div className="border-t border-slate-800 mt-2 pt-2 text-sm space-y-1">
          <p className="text-slate-300">
            Paid online: ₹{order.advanceAmount}{' '}
            <span className="text-xs text-slate-500">({order.paymentStatus})</span>
          </p>
          {order.codRemainingAmount > 0 && (
            <p className="text-slate-300">
              Cash on delivery: ₹{order.codRemainingAmount}{' '}
              <span className="text-xs text-slate-500">
                ({order.codCollected ? 'collected' : 'due at delivery'})
              </span>
            </p>
          )}
        </div>
      </div>

      {CANCELLABLE_STATUSES.includes(order.status) && (
        <div className="card space-y-2">
          {cancelError && <p className="text-sm text-red-400">{cancelError}</p>}
          <button
            className="w-full rounded-lg border border-red-500/40 text-red-400 py-2 text-sm font-medium disabled:opacity-50"
            disabled={cancelling}
            onClick={cancelOrder}
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
          <p className="text-xs text-slate-500">
            The ₹{order.advanceAmount} already paid online will not be refunded.
          </p>
        </div>
      )}

      {order.status === 'delivered' && !reviewSent && (
        <div className="card space-y-2">
          <h2 className="font-semibold text-white">Rate this order</h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-slate-600'}>
                ★
              </button>
            ))}
          </div>
          <textarea
            className="input"
            placeholder="Optional comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={submitReview}>
            Submit review
          </button>
        </div>
      )}
      {reviewSent && <p className="text-sm text-emerald-400">Thanks for your review!</p>}
    </div>
  );
}
