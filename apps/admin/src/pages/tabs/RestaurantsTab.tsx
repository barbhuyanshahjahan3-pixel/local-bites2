import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AdminRestaurant } from '../../api/types';

export default function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<AdminRestaurant>>({});

  const load = () =>
    api.get<{ restaurants: AdminRestaurant[] }>('/api/admin/restaurants').then((r) => setRestaurants(r.restaurants));

  useEffect(() => {
    load();
  }, []);

  const startEdit = (r: AdminRestaurant) => {
    setEditing(r._id);
    setForm({
      name: r.name,
      address: r.address,
      contactPhone: r.contactPhone,
      isOpen: r.isOpen,
      isFeatured: r.isFeatured ?? false,
      featuredOrder: r.featuredOrder ?? 0,
    });
  };

  const save = async (id: string) => {
    await api.patch(`/api/admin/restaurants/${id}`, form);
    setEditing(null);
    await load();
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white">Restaurants</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((r) => (
          <div key={r._id} className="card space-y-2">
            {editing === r._id ? (
              <>
                <input
                  className="input"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input"
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <input
                  className="input"
                  value={form.contactPhone || ''}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isOpen ?? true}
                    onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                  />
                  Open for orders
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isFeatured ?? false}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  />
                  Show in home page banner
                </label>
                {form.isFeatured && (
                  <div>
                    <label className="label">Banner order (lower shows first)</label>
                    <input
                      type="number"
                      className="input"
                      value={form.featuredOrder ?? 0}
                      onChange={(e) => setForm({ ...form, featuredOrder: Number(e.target.value) })}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="btn-primary text-sm flex-1" onClick={() => save(r._id)}>
                    Save
                  </button>
                  <button className="btn-ghost text-sm flex-1" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-white">{r.name}</p>
                <p className="text-xs text-slate-500">{r.restaurantId}</p>
                <p className="text-sm text-slate-400">{r.address}</p>
                <p className="text-sm text-slate-400">{r.contactPhone}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${r.isOpen ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {r.isOpen ? 'Open' : 'Closed'}
                  </span>
                  {r.isFeatured && <span className="badge bg-amber-500/20 text-amber-300 text-xs">Featured #{r.featuredOrder ?? 0}</span>}
                  <button className="btn-ghost text-sm" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
