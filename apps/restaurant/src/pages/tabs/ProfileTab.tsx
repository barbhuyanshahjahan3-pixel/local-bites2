import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { fileToBase64 } from '../../api/fileToBase64';
import NotificationSettingsCard from '../../components/NotificationSettingsCard';

interface GalleryImage {
  url: string;
  publicId: string;
}

interface RestaurantProfile {
  _id: string;
  name: string;
  description?: string;
  address: string;
  lat?: number;
  lng?: number;
  cuisineTags: string[];
  galleryImages: GalleryImage[];
}

export default function ProfileTab() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineTags, setCuisineTags] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api.get<{ restaurant: RestaurantProfile }>('/api/restaurant/profile').then((r) => {
      setProfile(r.restaurant);
      setName(r.restaurant.name);
      setDescription(r.restaurant.description || '');
      setAddress(r.restaurant.address);
      setCuisineTags((r.restaurant.cuisineTags || []).join(', '));
      setLat(r.restaurant.lat != null ? String(r.restaurant.lat) : '');
      setLng(r.restaurant.lng != null ? String(r.restaurant.lng) : '');
    });

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.patch('/api/restaurant/profile', {
        name,
        description,
        address,
        cuisineTags: cuisineTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => setError('Could not get your current location — enter it manually instead')
    );
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const imageBase64 = await fileToBase64(file);
      const res = await api.post<{ galleryImages: GalleryImage[] }>('/api/restaurant/gallery', {
        imageBase64,
      });
      setProfile((p) => (p ? { ...p, galleryImages: res.galleryImages } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (publicId: string) => {
    if (!confirm('Remove this photo?')) return;
    const res = await api.delete<{ galleryImages: GalleryImage[] }>(`/api/restaurant/gallery/${publicId}`);
    setProfile((p) => (p ? { ...p, galleryImages: res.galleryImages } : p));
  };

  if (!profile) return <p className="text-sm text-slate-500">Loading…</p>;

  const hasCoords = lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const mapEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01}%2C${Number(lat) - 0.01}%2C${Number(lng) + 0.01}%2C${Number(lat) + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <NotificationSettingsCard />

      <div className="card space-y-3">
        <h2 className="font-semibold text-white">Restaurant profile</h2>
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Tell customers what makes your food special…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Cuisine tags (comma separated)</label>
          <input
            className="input"
            placeholder="North Indian, Chinese, Rolls"
            value={cuisineTags}
            onChange={(e) => setCuisineTags(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Location on map</h2>
          <button type="button" className="btn-ghost text-xs" onClick={useMyLocation}>
            Use my current location
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Latitude</label>
            <input className="input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="26.0027" />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="92.8628" />
          </div>
        </div>
        {mapEmbedUrl && (
          <iframe
            title="Restaurant location preview"
            src={mapEmbedUrl}
            className="w-full h-56 rounded-lg border border-slate-800"
          />
        )}
        <p className="text-xs text-slate-500">
          Tip: open Google Maps, find your restaurant, right-click the pin and copy the two numbers shown — paste
          the first into Latitude and the second into Longitude.
        </p>
      </div>

      <button className="btn-primary" disabled={saving} onClick={saveProfile}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
      {saved && <p className="text-sm text-emerald-400">Saved.</p>}

      <div className="card space-y-3">
        <h2 className="font-semibold text-white">Photo gallery</h2>
        <p className="text-xs text-slate-500">
          Customers see these photos on your restaurant page — add pictures of your food, seating, and storefront.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {profile.galleryImages.map((img) => (
            <div key={img.publicId} className="relative group">
              <img src={img.url} alt="" className="w-full h-24 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => deletePhoto(img.publicId)}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="btn-ghost text-sm inline-block cursor-pointer">
          {uploading ? 'Uploading…' : '+ Add photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
