import { useEffect, useState } from 'react';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionState,
  isPushSubscribed,
  isPushSupported,
} from '../utils/pushNotifications';

export default function NotificationSettingsCard() {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    isPushSubscribed().then(setSubscribed);
  }, []);

  if (!isPushSupported()) return null;

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      if (subscribed) {
        await disablePushNotifications();
        setSubscribed(false);
      } else {
        await enablePushNotifications();
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const blocked = getPushPermissionState() === 'denied';

  return (
    <div className="card space-y-2">
      <h2 className="font-semibold text-white">New order alerts</h2>
      <p className="text-sm text-slate-400">
        Get notified on this phone the moment a new order comes in — even if you've closed the
        app or your browser. Works alongside the in-app sound alert while the dashboard is open.
      </p>
      {blocked && (
        <p className="text-xs text-amber-400">
          Notifications are blocked for this site in your browser settings. Enable them there,
          then reload this page.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={toggle}
        disabled={busy || blocked}
        className={`text-sm px-3 py-2 rounded-lg ${subscribed ? 'bg-emerald-500/15 text-emerald-300' : 'btn-primary'}`}
      >
        {busy ? 'Updating…' : subscribed ? '🔔 Notifications on — tap to turn off' : 'Turn on order notifications'}
      </button>
    </div>
  );
}
