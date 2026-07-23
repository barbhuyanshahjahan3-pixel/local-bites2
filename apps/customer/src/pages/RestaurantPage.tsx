import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { Food, RestaurantDetail } from '../api/types';
import { useCart } from '../context/CartContext';
import { Screen } from '../navigation';
import PhotoCarousel from '../components/PhotoCarousel';

export default function RestaurantPage({
  restaurantId,
  onNavigate,
}: {
  restaurantId: string;
  onNavigate: (s: Screen) => void;
}) {
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [galleryFood, setGalleryFood] = useState<Food | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const { addItem, lines } = useCart();

  useEffect(() => {
    api
      .get<{ restaurant: RestaurantDetail; foods: Food[] }>(`/api/public/restaurants/${restaurantId}`)
      .then((r) => {
        setRestaurant(r.restaurant);
        setFoods(r.foods);
      });
  }, [restaurantId]);

  const toggleWishlist = async (foodId: string) => {
    await api.post(`/api/customer/wishlist/${foodId}`);
  };

  const handleAdd = (f: Food) => {
    addItem(f, restaurant!._id);
    setJustAdded(f._id);
    setTimeout(() => setJustAdded((cur) => (cur === f._id ? null : cur)), 500);
  };

  const quantityOf = (foodId: string) => lines.find((l) => l.food._id === foodId)?.quantity || 0;

  const grouped = foods.reduce<Record<string, Food[]>>((acc, f) => {
    const catName = typeof f.category === 'string' ? 'Menu' : f.category.name;
    (acc[catName] ||= []).push(f);
    return acc;
  }, {});

  if (!restaurant) {
    return (
      <div className="px-4 py-4 space-y-3 animate-pulse">
        <div className="h-40 w-full rounded-xl bg-slate-800" />
        <div className="h-5 w-2/3 bg-slate-800 rounded" />
        <div className="h-3 w-1/2 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <button className="px-4 py-3 text-sm text-slate-400" onClick={() => onNavigate({ name: 'home' })}>
        ← Back
      </button>

      {restaurant.coverImageUrl && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          src={restaurant.coverImageUrl}
          alt={restaurant.name}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="px-4 py-3">
        <h1 className="text-xl font-semibold text-white">{restaurant.name}</h1>
        <p className="text-sm text-slate-400">{restaurant.description}</p>
        <p className="text-xs text-slate-500 mt-1">{restaurant.address}</p>
        {restaurant.ratingCount > 0 && (
          <p className="text-xs text-amber-400 mt-1">
            ★ {restaurant.avgRating.toFixed(1)} ({restaurant.ratingCount} ratings)
          </p>
        )}
        {!restaurant.isOpen && <p className="text-xs text-red-400 mt-1">Currently closed</p>}
      </div>

      {restaurant.galleryImages && restaurant.galleryImages.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="font-semibold text-white mb-2">Gallery</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {restaurant.galleryImages.map((img) => (
              <img
                key={img.publicId}
                src={img.url}
                alt={restaurant.name}
                className="h-28 w-28 rounded-lg object-cover shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {restaurant.lat != null && restaurant.lng != null && (
        <div className="px-4 pb-4">
          <h2 className="font-semibold text-white mb-2">Location</h2>
          <iframe
            title="Restaurant location"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${restaurant.lng - 0.01}%2C${restaurant.lat - 0.01}%2C${restaurant.lng + 0.01}%2C${restaurant.lat + 0.01}&layer=mapnik&marker=${restaurant.lat}%2C${restaurant.lng}`}
            className="w-full h-40 rounded-lg border border-slate-800"
          />
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-sm text-brand"
          >
            Get directions →
          </a>
        </div>
      )}

      <div className="px-4 space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="font-semibold text-white mb-2">{category}</h2>
            <div className="space-y-2">
              {items.map((f, idx) => (
                <motion.div
                  key={f._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.2), duration: 0.2 }}
                  className="card flex gap-3"
                >
                  {f.imageUrl && (
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden">
                      {(f.images?.length ?? 0) > 1 ? (
                        <>
                          <PhotoCarousel
                            images={f.images!}
                            className="w-20 h-20"
                            onOpenFullscreen={() => setGalleryFood(f)}
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">
                            +{(f.images?.length ?? 1) - 1}
                          </span>
                        </>
                      ) : (
                        <img src={f.imageUrl} alt={f.name} className="w-20 h-20 rounded-lg object-cover" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-white">{f.name}</p>
                      <button className="text-slate-500 hover:text-brand" onClick={() => toggleWishlist(f._id)}>
                        ♡
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{f.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-slate-300">
                        ₹{f.offerPrice ?? f.price}{' '}
                        {f.offerPrice && <span className="line-through text-slate-600">₹{f.price}</span>}
                      </p>
                      {f.isAvailable ? (
                        quantityOf(f._id) > 0 ? (
                          <motion.span
                            key={quantityOf(f._id)}
                            initial={{ scale: 0.7 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                            className="badge bg-brand/20 text-brand"
                          >
                            {quantityOf(f._id)} in cart
                          </motion.span>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            animate={justAdded === f._id ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 0.35 }}
                            className="btn-primary text-sm py-1"
                            onClick={() => handleAdd(f)}
                          >
                            Add
                          </motion.button>
                        )
                      ) : (
                        <span className="text-xs text-slate-500">Unavailable</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {lines.length > 0 && (
          <motion.button
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => onNavigate({ name: 'cart' })}
            className="fixed bottom-16 inset-x-4 btn-primary shadow-lg"
          >
            View cart ({lines.reduce((s, l) => s + l.quantity, 0)})
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {galleryFood && galleryFood.images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center px-4"
            onClick={() => setGalleryFood(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-2xl leading-none"
              onClick={() => setGalleryFood(null)}
            >
              ×
            </button>
            <div className="max-h-[70vh] w-full rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <PhotoCarousel images={galleryFood.images} className="w-full h-[60vh]" />
            </div>
            <p className="text-white font-medium mt-3">{galleryFood.name}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
