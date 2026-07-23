import { useEffect, useState, FormEvent } from 'react';
import { api } from '../../api/client';
import { fileToBase64 } from '../../api/fileToBase64';

interface ShareQr {
  imageUrl?: string;
  link?: string;
}

export default function SettingsTab() {
  const [form, setForm] = useState({
    defaultCommissionPercent: 15,
    defaultDeliveryCharge: 30,
    perKmDeliveryRate: 8,
    minDeliveryCharge: 20,
    maxDeliveryCharge: 150,
    codEnabled: true,
    razorpayEnabled: true,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shareQr, setShareQr] = useState<ShareQr>({});
  const [qrLink, setQrLink] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ shareQr: ShareQr }>('/api/public/share-qr').then((r) => {
      setShareQr(r.shareQr);
      setQrLink(r.shareQr?.link || '');
    });
    api.get<{ settings: Partial<typeof form> }>('/api/superadmin/settings').then((r) => {
      setForm((f) => ({ ...f, ...r.settings }));
    });
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await api.patch('/api/superadmin/settings', form);
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  const saveShareQr = async (e: FormEvent) => {
    e.preventDefault();
    setQrSaving(true);
    setQrSaved(false);
    setQrError(null);
    try {
      const imageBase64 = qrFile ? await fileToBase64(qrFile) : undefined;
      const res = await api.patch<{ shareQr: ShareQr }>('/api/superadmin/share-qr', {
        imageBase64,
        link: qrLink,
      });
      setShareQr(res.shareQr);
      setQrFile(null);
      if (qrPreview) URL.revokeObjectURL(qrPreview);
      setQrPreview(null);
      setQrSaved(true);
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'Could not save — please try again.');
    } finally {
      setQrSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-semibold text-white">Platform settings</h2>
        {saved && <p className="text-sm text-emerald-400">Settings saved.</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Default commission (%)</label>
            <input
              type="number"
              className="input"
              value={form.defaultCommissionPercent}
              onChange={(e) => setForm({ ...form, defaultCommissionPercent: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Default delivery charge (₹)</label>
            <input
              type="number"
              className="input"
              value={form.defaultDeliveryCharge}
              onChange={(e) => setForm({ ...form, defaultDeliveryCharge: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Used only when distance can't be calculated (e.g. no location shared).
            </p>
          </div>
          <div>
            <label className="label">Delivery charge per km (₹)</label>
            <input
              type="number"
              className="input"
              value={form.perKmDeliveryRate}
              onChange={(e) => setForm({ ...form, perKmDeliveryRate: Number(e.target.value) })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Charged per km between restaurant and customer, calculated automatically via maps.
            </p>
          </div>
          <div>
            <label className="label">Minimum delivery charge (₹)</label>
            <input
              type="number"
              className="input"
              value={form.minDeliveryCharge}
              onChange={(e) => setForm({ ...form, minDeliveryCharge: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Maximum delivery charge (₹)</label>
            <input
              type="number"
              className="input"
              value={form.maxDeliveryCharge}
              onChange={(e) => setForm({ ...form, maxDeliveryCharge: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.codEnabled}
              onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
            />
            Cash on Delivery enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.razorpayEnabled}
              onChange={(e) => setForm({ ...form, razorpayEnabled: e.target.checked })}
            />
            Online payment enabled
          </label>
        </div>

        <button className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <form onSubmit={saveShareQr} className="card space-y-4">
        <h2 className="font-semibold text-white">App share QR code</h2>
        <p className="text-xs text-slate-500">
          Shown in every customer's profile so they can share the app via WhatsApp, Instagram, or
          Facebook. Replace the image or link here any time — it updates for all customers immediately.
        </p>
        {qrSaved && <p className="text-sm text-emerald-400">Saved.</p>}
        {qrError && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
            {qrError}
          </p>
        )}

        <div className="flex items-center gap-4">
          <img
            src={qrPreview || shareQr.imageUrl || undefined}
            alt="Share QR"
            className={`h-24 w-24 rounded-lg object-cover bg-slate-800 ${
              qrPreview || shareQr.imageUrl ? '' : 'hidden'
            }`}
          />
          <input
            type="file"
            accept="image/*"
            className="text-sm text-slate-300"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (qrPreview) URL.revokeObjectURL(qrPreview);
              setQrFile(f);
              setQrPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </div>

        <div>
          <label className="label">App / download link</label>
          <input
            className="input"
            placeholder="https://..."
            value={qrLink}
            onChange={(e) => setQrLink(e.target.value)}
          />
        </div>

        <button className="btn-primary" disabled={qrSaving}>
          {qrSaving ? 'Saving…' : 'Save share QR'}
        </button>
      </form>
    </div>
  );
}
