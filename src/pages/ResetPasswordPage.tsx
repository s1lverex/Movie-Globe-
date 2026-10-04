import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, resetPassword } from '../lib/account';
import { navigate } from '../lib/nav';
import { useAppStore } from '../store/useAppStore';
import { Overlay } from '../ui/Overlay';

/** Landing page for the emailed reset link: /reset-password?token=… */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useAppStore((s) => s.toast);
  const field =
    'w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none';

  return (
    <Overlay title="Choose a new password">
      {!token ? (
        <p className="text-sm text-slate-300">
          This reset link is incomplete. Request a new one from the Account page.
        </p>
      ) : (
        <form
          className="space-y-3"
          data-testid="reset-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw !== pw2) return setErr('Passwords don’t match.');
            setBusy(true);
            setErr('');
            try {
              await resetPassword(token, pw);
              toast({ title: 'Password updated', body: 'You’re signed in. Other devices were signed out.' });
              navigate('/account');
            } catch (x) {
              setErr(x instanceof ApiError ? x.message : 'Something went wrong.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">New password (min. 8 characters)</span>
            <input
              className={field}
              type="password"
              minLength={8}
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Repeat new password</span>
            <input
              className={field}
              type="password"
              minLength={8}
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {err && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
              {err}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="reset-submit">
            {busy && <Loader2 size={16} className="animate-spin" />} Update password
          </button>
        </form>
      )}
    </Overlay>
  );
}
