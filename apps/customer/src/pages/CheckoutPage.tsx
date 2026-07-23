import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../navigation';
import { getSavedTheme } from '../utils/theme';

type PlaceOrderResponse = {
  order: { _id: string; grandTotal: number; advanceAmount: number; codRemainingAmount: number };
  razorpayOrder: { id: string; amount: number };
  razorpayKeyId: string;
};

type DeliveryEstimate = { distanceKm: number | null; deliveryCharge: number };

export default function CheckoutPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { restaurantId, lines, itemsTotal, clear } = useCart();
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported on this device/browser.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Could not get your location. You can still place the order, but the delivery charge will use the city default.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!coords || !restaurantId) return;
    setEstimating(true);
    api
      .get<DeliveryEstimate>(
        `/api/public/delivery-estimate?restaurantId=${restaurantId}&lat=${coords.lat}&lng=${coords.lng}`
      )
      .then(setEstimate)
      .finally(() => setEstimating(false));
  }, [coords, restaurantId]);

  if (!restaurantId || lines.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">Your cart is empty.</p>;
  }

  // Rough client-side estimate for display — the server always computes the
  // authoritative amounts (including the real per-km delivery charge) and
  // that's what's actually charged, but once we have a location-based
  // estimate we show that instead of guessing.
  const deliveryCharge = estimate?.deliveryCharge ?? null;
  const displayTotal = itemsTotal + (deliveryCharge ?? 0);
  const estimatedAdvance = paymentMethod === 'online' ? displayTotal : Math.round(displayTotal / 2);
  const estimatedCodRemaining = paymentMethod === 'online' ? 0 : displayTotal - estimatedAdvance;

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<PlaceOrderResponse>('/api/customer/orders', {
        restaurantId,
        items: lines.map((l) => ({ foodId: l.food._id, quantity: l.quantity })),
        paymentMethod,
        name,
        mobile,
        deliveryAddress: address,
        lat: coords?.lat,
        lng: coords?.lng,
      });

      // Every order requires an online payment now — the full amount for 'online',
      // or the 50% advance for 'cod'. The restaurant is never notified until this
      // payment is verified, so an order isn't really "placed" until it's paid.
      const rzp = new window.Razorpay({
        key: res.razorpayKeyId,
        amount: res.razorpayOrder.amount,
        currency: 'INR',
        name: 'Local Bites',
        description:
          res.order.codRemainingAmount > 0
            ? `Advance payment (Rs.${res.order.codRemainingAmount} due as cash on delivery)`
            : 'Full payment',
        order_id: res.razorpayOrder.id,
        // UPI (which covers GPay, PhonePe, Paytm, BHIM, etc.) is already offered
        // automatically by Razorpay's checkout alongside cards/netbanking — no
        // separate integration is needed per payment app.
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await api.post('/api/payments/verify', {
            orderId: res.order._id,
            ...response,
          });
          clear();
          onNavigate({ name: 'orderConfirmed', orderId: res.order._id });
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        prefill: { name, contact: mobile },
        theme: { color: getSavedTheme().hex },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order');
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <h1 className="text-xl font-semibold text-white">Checkout</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <form onSubmit={placeOrder} className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card space-y-3"
        >
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mobile number</label>
            <input
              className="input"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Delivery address</label>
            <textarea className="input" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="pt-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={shareLocation}
              disabled={locating}
              className={`w-full text-sm rounded-lg px-3 py-2 flex items-center justify-center gap-2 ${
                coords ? 'bg-emerald-500/15 text-emerald-300' : 'btn-ghost'
              }`}
            >
              {locating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Getting your location…
                </>
              ) : coords ? (
                '📍 Location shared — tap to update'
              ) : (
                '📍 Share my exact location for accurate delivery charge'
              )}
            </motion.button>
            {locationError && <p className="text-xs text-amber-400 mt-1">{locationError}</p>}
            {!coords && !locationError && (
              <p className="text-xs text-slate-500 mt-1">
                This lets us calculate the real distance from the restaurant so the delivery
                charge is accurate, and helps the delivery partner find you.
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="card space-y-2"
        >
          <p className="label">Payment method</p>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
            />
            Cash on Delivery — pay 50% now online, rest in cash at delivery
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
            />
            Pay full amount online now (UPI / card / netbanking)
          </label>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="card space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Items total</span>
            <span className="text-white">Rs.{itemsTotal}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              Delivery charge {estimate?.distanceKm != null && `(${estimate.distanceKm} km)`}
            </span>
            <span className="text-white">
              {estimating ? '…' : deliveryCharge != null ? `Rs.${deliveryCharge}` : 'Added at checkout'}
            </span>
          </div>
          <div className="border-t border-slate-800 my-1" />
          <div className="flex items-center justify-between font-semibold">
            <span className="text-slate-300">Pay now (online)</span>
            <span className="text-white">Rs.{estimatedAdvance}</span>
          </div>
          {estimatedCodRemaining > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Pay on delivery (cash)</span>
              <span className="text-slate-300">Rs.{estimatedCodRemaining}</span>
            </div>
          )}
          <p className="text-xs text-slate-500 pt-1">
            {coords
              ? 'Delivery charge is calculated from your shared location and the restaurant’s location.'
              : 'Share your location above for an accurate delivery charge — otherwise the city default applies.'}{' '}
            If you cancel this order after paying, the online amount already paid is not refunded.
          </p>
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {loading ? 'Opening payment…' : `Pay Rs.${estimatedAdvance} & place order`}
        </motion.button>
      </form>
    </div>
  );
}
