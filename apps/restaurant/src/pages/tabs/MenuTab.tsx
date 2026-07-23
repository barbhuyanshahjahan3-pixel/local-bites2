import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { Category, Food } from '../../api/types';
import { filesToBase64 } from '../../api/fileToBase64';

const MAX_PHOTOS = 5;

export default function MenuTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    offerPrice: '',
    isVeg: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_PHOTOS);
    if (files.length > MAX_PHOTOS) {
      setError(`You can add up to ${MAX_PHOTOS} photos — only the first ${MAX_PHOTOS} were kept.`);
    }
    imageFiles.forEach((_, i) => URL.revokeObjectURL(previews[i]));
    setImageFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setImageFiles(imageFiles.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const load = async () => {
    const [c, f] = await Promise.all([
      api.get<{ categories: Category[] }>('/api/restaurant/categories'),
      api.get<{ foods: Food[] }>('/api/restaurant/foods'),
    ]);
    setCategories(c.categories);
    setFoods(f.foods);
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/api/restaurant/categories', { name: newCategory });
    setNewCategory('');
    await load();
  };

  const addFood = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const imagesBase64 = imageFiles.length ? await filesToBase64(imageFiles) : undefined;
      await api.post('/api/restaurant/foods', {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        offerPrice: form.offerPrice ? Number(form.offerPrice) : null,
        isVeg: form.isVeg,
        imagesBase64,
      });
      setForm({ categoryId: '', name: '', description: '', price: '', offerPrice: '', isVeg: true });
      previews.forEach((p) => URL.revokeObjectURL(p));
      setImageFiles([]);
      setPreviews([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this item — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailable = async (food: Food) => {
    await api.patch(`/api/restaurant/foods/${food._id}`, { isAvailable: !food.isAvailable });
    await load();
  };

  const deleteFood = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/api/restaurant/foods/${id}`);
    await load();
  };

  const categoryName = (cat: Food['category']) =>
    typeof cat === 'string' ? categories.find((c) => c._id === cat)?.name : cat?.name;

  return (
    <div className="space-y-6">
      <form onSubmit={addCategory} className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label">New category</label>
          <input
            className="input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Starters"
            required
          />
        </div>
        <button className="btn-primary">Add category</button>
      </form>

      <form onSubmit={addFood} className="card space-y-3">
        <h2 className="font-semibold text-white">Add food item</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input
              type="number"
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Offer price (₹, optional)</label>
            <input
              type="number"
              className="input"
              value={form.offerPrice}
              onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Photos (up to {MAX_PHOTOS})</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-sm text-slate-300"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <AnimatePresence>
                  {previews.map((src, i) => (
                    <motion.div
                      key={src}
                      layout
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <img src={src} className="h-16 w-16 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full w-5 h-5 text-xs leading-5"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={form.isVeg}
              onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
            />
            <label className="text-sm text-slate-300">Vegetarian</label>
          </div>
        </div>
        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Add item'}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {foods.map((f, idx) => (
            <motion.div
              key={f._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(idx * 0.03, 0.2), duration: 0.2 }}
              className="card"
            >
              {f.imageUrl && (
                <div className="relative mb-2">
                  <img src={f.imageUrl} alt={f.name} className="rounded-lg h-32 w-full object-cover" />
                  {(f.images?.length ?? 0) > 1 && (
                    <span className="absolute bottom-1 right-1 badge bg-black/60 text-white text-xs">
                      +{(f.images?.length ?? 1) - 1} more
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">{categoryName(f.category)}</p>
              <p className="font-medium text-white">{f.name}</p>
              <p className="text-sm text-slate-400">
                ₹{f.offerPrice ?? f.price}{' '}
                {f.offerPrice && <span className="line-through text-slate-600">₹{f.price}</span>}
              </p>
              <div className="flex items-center justify-between mt-3">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  className={`badge ${f.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}
                  onClick={() => toggleAvailable(f)}
                >
                  {f.isAvailable ? 'Available' : "86'd"}
                </motion.button>
                <button className="btn-ghost text-sm" onClick={() => deleteFood(f._id)}>
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {foods.length === 0 && <p className="text-sm text-slate-500">No menu items yet — add one above.</p>}
      </div>
    </div>
  );
}
