import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../navigation';
import { api } from '../api/client';
import { THEMES, getSavedTheme, applyTheme } from '../utils/theme';

interface ShareQr {
  imageUrl?: string;
  link?: string;
}

export default function ProfilePage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { profile, logout } = useAuth();
  const [shareQr, setShareQr] = useState<ShareQr>({});
  const [copied, setCopied] = useState(false);
  const [themeId, setThemeId] = useState(getSavedTheme().id);

  useEffect(() => {
    // Super admin sets/edits this QR image + link any time from their dashboard —
    // the customer app always shows whatever is currently configured.
    api.get<{ shareQr: ShareQr }>('/api/public/share-qr').then((r) => setShareQr(r.shareQr));
  }, []);

  const shareLink = shareQr.link || window.location.origin;
  const shareMessage = `Order food on Local Bites! ${shareLink}`;

  const shareVia = (platform: 'whatsapp' | 'facebook' | 'instagram' | 'native') => {
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`,
        '_blank'
      );
    } else if (platform === 'instagram' || platform === 'native') {
      if (navigator.share) {
        navigator.share({ title: 'Local Bites', text: shareMessage, url: shareLink }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(shareMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <h1 className="text-xl font-semibold text-white">Profile</h1>
      <div className="card">
        <p className="font-medium text-white">{profile?.name}</p>
      </div>

      <div className="space-y-2">
        <button className="card w-full text-left" onClick={() => onNavigate({ name: 'wishlist' })}>
          ♡ Wishlist
        </button>
        <button className="card w-full text-left" onClick={() => onNavigate({ name: 'complaints' })}>
          💬 Support & complaints
        </button>
      </div>

      {shareQr.imageUrl && (
        <div className="card space-y-3">
          <p className="font-medium text-white">Share Local Bites</p>
          <img src={shareQr.imageUrl} alt="Scan to download Local Bites" className="mx-auto h-40 w-40 rounded-lg" />
          <p className="text-xs text-slate-500 text-center">
            Ask friends to scan this code, or share the app link below.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-ghost text-sm" onClick={() => shareVia('whatsapp')}>
              WhatsApp
            </button>
            <button className="btn-ghost text-sm" onClick={() => shareVia('instagram')}>
              Instagram
            </button>
            <button className="btn-ghost text-sm" onClick={() => shareVia('facebook')}>
              Facebook
            </button>
          </div>
          {copied && <p className="text-xs text-emerald-400 text-center">Link copied — paste it anywhere!</p>}
        </div>
      )}

      <div className="card space-y-3">
        <p className="font-medium text-white">App theme</p>
        <p className="text-xs text-slate-500">Pick a color and every screen updates instantly.</p>
        <div className="flex gap-3 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-label={t.name}
              onClick={() => {
                applyTheme(t);
                setThemeId(t.id);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: t.hex }}
            >
              {themeId === t.id && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-ghost w-full" onClick={logout}>
        Log out
      </button>

      <p className="text-center text-xs text-slate-600 pt-4">
        © 2026 Local Bites
        <br />
        Designed &amp; Developed by Shahjahan
        <br />
        All Rights Reserved.
      </p>
    </div>
  );
}
