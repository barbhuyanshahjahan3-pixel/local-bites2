import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { City, RestaurantSummary } from '../api/types';
import { Screen } from '../navigation';

function RestaurantCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-32 w-full rounded-lg bg-slate-800 mb-2" />
      <div className="h-4 w-2/3 bg-slate-800 rounded mb-2" />
      <div className="h-3 w-1/3 bg-slate-800 rounded" />
    </div>
  );
}

export default function HomePage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState<string>(localStorage.getItem('lb_city') || '');
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [featured, setFeatured] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ cities: City[] }>('/api/public/cities').then((r) => {
      setCities(r.cities);
      if (!cityId && r.cities[0]) setCityId(r.cities[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!cityId) return;
    localStorage.setItem('lb_city', cityId);
    setLoading(true);
    api
      .get<{ restaurants: RestaurantSummary[] }>(`/api/public/restaurants?cityId=${cityId}`)
      .then((r) => setRestaurants(r.restaurants))
      .finally(() => setLoading(false));
    // Order/selection of this banner is set by admin via each restaurant's
    // isFeatured + featuredOrder fields — the customer app just renders it.
    api
      .get<{ restaurants: RestaurantSummary[] }>(`/api/public/restaurants?cityId=${cityId}&featured=true`)
      .then((r) => setFeatured(r.restaurants));
  }, [cityId]);

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <img src="/logo.png" alt="Local Bites" className="w-8 h-8 rounded-lg" />
          <h1 className="text-xl font-bold text-white tracking-tight">Local Bites</h1>
        </motion.div>
        <select className="input w-auto" value={cityId} onChange={(e) => setCityId(e.target.value)}>
          {cities.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {featured.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-300 mb-2">Featured for you</p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
            {featured.map((r, i) => (
              <motion.button
                key={r._id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate({ name: 'restaurant', id: r._id })}
                className="relative shrink-0 w-64 h-32 rounded-xl overflow-hidden snap-start"
              >
                {r.coverImageUrl ? (
                  <img src={r.coverImageUrl} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <p className="absolute bottom-2 left-3 right-3 text-white font-semibold text-left truncate">
                  {r.name}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}

        {!loading &&
          restaurants.map((r, i) => (
            <motion.button
              key={r._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate({ name: 'restaurant', id: r._id })}
              className="card text-left hover:border-brand transition-colors"
            >
              {r.coverImageUrl && (
                <img src={r.coverImageUrl} alt={r.name} className="rounded-lg mb-2 h-32 w-full object-cover" />
              )}
              <p className="font-medium text-white">{r.name}</p>
              <p className="text-xs text-slate-500">{r.cuisineTags?.join(', ')}</p>
              {r.ratingCount > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  ★ {r.avgRating.toFixed(1)} ({r.ratingCount})
                </p>
              )}
            </motion.button>
          ))}

        {!loading && restaurants.length === 0 && (
          <p className="text-sm text-slate-500">No restaurants open in this city right now.</p>
        )}
      </div>
    </div>
  );
}
