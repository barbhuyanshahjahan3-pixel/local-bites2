import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { Screen } from '../navigation';

type DeliveryEstimate = { distanceKm: number | null; deliveryCharge: number };

export default function CartPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { lines, setQuantity, itemsTotal, restaurantId } = useCart();
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);

  // Rough delivery charge preview right here in the cart (city-default rate,
  // since we don't have the customer's exact location yet — that's asked for
  // at checkout and the final charge there is the authoritative one).
  useEffect(() => {
    if (!restaurantId) {
      setEstimate(null);
      return;
    }
    api
      .get<DeliveryEstimate>(`/api/public/delivery-estimate?restaurantId=${restaurantId}`)
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [restaurantId]);

  const deliveryCharge = estimate?.deliveryCharge ?? 0;
  const grandTotal = itemsTotal + deliveryCharge;

  if (lines.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 py-6 pb-24 flex flex-col items-center text-center mt-10"
      >
        <div className="text-5xl mb-3">🛒</div>
        <p className="text-sm text-slate-500">Your cart is empty.</p>
        <button className="btn-primary mt-4" onClick={() => onNavigate({ name: 'home' })}>
          Browse restaurants
        </button>
      </motion.div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <h1 className="text-xl font-semibold text-white">Your cart</h1>
      <AnimatePresence initial={false}>
        {lines.map((l) => (
          <motion.div
            key={l.food._id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="card flex items-center gap-3 overflow-hidden"
          >
            {l.food.imageUrl && (
              <img src={l.food.imageUrl} alt={l.food.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium text-white">{l.food.name}</p>
              <p className="text-sm text-slate-400">₹{l.food.offerPrice ?? l.food.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost w-8 h-8 p-0" onClick={() => setQuantity(l.food._id, l.quantity - 1)}>
                −
              </button>
              <motion.span
                key={l.quantity}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="w-6 text-center"
              >
                {l.quantity}
              </motion.span>
              <button className="btn-ghost w-8 h-8 p-0" onClick={() => setQuantity(l.food._id, l.quantity + 1)}>
                +
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div layout className="card space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Items total</span>
          <span className="text-white">₹{itemsTotal}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">
            Delivery charge{estimate?.distanceKm != null ? ` (${estimate.distanceKm} km)` : ''}
          </span>
          <span className="text-white">₹{deliveryCharge}</span>
        </div>
        <div className="border-t border-slate-800 my-1" />
        <div className="flex items-center justify-between font-semibold">
          <span className="text-slate-300">Total</span>
          <span className="text-white">₹{grandTotal}</span>
        </div>
        <p className="text-xs text-slate-500 pt-1">
          Exact delivery charge is confirmed at checkout once you share your location.
        </p>
      </motion.div>

      <button className="btn-primary w-full" onClick={() => onNavigate({ name: 'checkout' })}>
        Proceed to checkout
      </button>
    </div>
  );
}
