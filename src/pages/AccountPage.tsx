import { useState } from 'react';
import { CheckCircle2, CloudOff, Loader2, LogOut, Trash2, UserRound } from 'lucide-react';
import {
  ApiError,
  deleteAccount,
  initAccount,
  login,
  logout,
  register,
  requestPasswordReset,
  useAccount,
} from '../lib/account';
import { useAppStore } from '../store/useAppStore';
import { Overlay } from '../ui/Overlay';

const field =
  'w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none';

function ForgotPassword({ initialEmail }: { initialEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [err, setErr] = useState('');
  if (!open)
    return (
      <button
        type="button"
        className="mt-3 w-full text-center text-xs text-[#9CC2FF] hover:underline"
        onClick={() => {
          setEmail(initialEmail);
          setOpen(true);
        }}
        data-testid="forgot-open"
      >
        Forgot password?
      </button>
    );
  return (
    <form
      className="mt-4 space-y-2 rounded-2xl border border-white/10 p-3"
      data-testid="forgot-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('busy');
        setErr('');
        try {
          await requestPasswordReset(email);
          setState('sent');
        } catch (x) {
          setErr(x instanceof ApiError ? x.message : 'Something went wrong.');
          setState('idle');
        }
      }}
    >
      {state === 'sent' ? (
        <p className="text-sm text-emerald-300" role="status" data-testid="forgot-sent">
          If an account exists for that email, we’ve sent a reset link. It expires in 30 minutes.
        </p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Email for the reset link</span>
            <input
              className={field}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          {err && <p className="text-xs text-rose-300">{err}</p>}
          <button
            type="submit"
            className="btn-ghost w-full text-sm"
            disabled={state === 'busy'}
            data-testid="forgot-submit"
          >
            {state === 'busy' && <Loader2 size={14} className="animate-spin" />} Email me a reset link
          </button>
        </>
      )}
    </form>
  );
}

function AuthForm() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useAppStore((s) => s.toast);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (tab === 'login') await login(email, password);
      else await register(email, password, name);
      toast({
        title: tab === 'login' ? 'Signed in' : 'Account created',
        body: 'Your trips, diary and character now sync.',
      });
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex rounded-2xl bg-white/5 p-1" role="tablist">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setErr('');
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${tab === t ? 'bg-accent text-white' : 'text-slate-300'}`}
          >
            {t === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <form className="space-y-3" onSubmit={submit} data-testid="auth-form">
        {tab === 'register' && (
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Display name</span>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="nickname"
            />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Email</span>
          <input
            className={field}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">
            Password {tab === 'register' && '(min. 8 characters)'}
          </span>
          <input
            className={field}
            type="password"
            required
            minLength={tab === 'register' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {err && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy} data-testid="auth-submit">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {tab === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {tab === 'login' && <ForgotPassword initialEmail={email} />}
      <p className="mt-4 text-xs text-slate-400">
        An account keeps your trips, travel diary, passport stamps, saved places and character in sync across
        devices. Without one, everything is saved on this device only.
      </p>
    </div>
  );
}

function SignedIn() {
  const { user, syncState, lastSynced } = useAccount();
  const toast = useAppStore((s) => s.toast);
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  if (!user) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/25 text-[#9CC2FF]">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <div className="truncate font-semibold text-white" data-testid="account-name">
            {user.displayName}
          </div>
          <div className="truncate text-xs text-slate-400">{user.email}</div>
        </div>
      </div>
      <p
        className="flex items-center gap-2 text-sm text-slate-300"
        aria-live="polite"
        data-testid="sync-state"
      >
        {syncState === 'syncing' ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Syncing…
          </>
        ) : syncState === 'error' ? (
          <>
            <CloudOff size={14} className="text-rose-300" /> Couldn’t sync — will retry on your next change.
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="text-emerald-400" /> Synced
            {lastSynced ? ` · ${new Date(lastSynced).toLocaleTimeString()}` : ''}
          </>
        )}
      </p>
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={async () => {
          await logout();
          toast({ title: 'Signed out', body: 'Your data stays on this device.' });
        }}
        data-testid="logout"
      >
        <LogOut size={16} /> Sign out
      </button>
      {!confirm ? (
        <button
          type="button"
          className="w-full py-2 text-xs text-rose-300 hover:underline"
          onClick={() => setConfirm(true)}
        >
          Delete account…
        </button>
      ) : (
        <form
          className="space-y-2 rounded-2xl border border-rose-500/30 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await deleteAccount(pw);
              toast({ title: 'Account deleted' });
            } catch (x) {
              setErr(x instanceof ApiError ? x.message : 'Could not delete account.');
            }
          }}
        >
          <p className="text-xs text-rose-200">
            This permanently deletes your account and synced data. Enter your password to confirm.
          </p>
          <input
            className={field}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          {err && <p className="text-xs text-rose-300">{err}</p>}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white"
          >
            <Trash2 size={14} /> Delete permanently
          </button>
        </form>
      )}
    </div>
  );
}

export default function AccountPage() {
  const status = useAccount((s) => s.status);
  return (
    <Overlay title="Account">
      {status === 'unknown' && <Loader2 className="mx-auto mt-10 animate-spin text-slate-400" />}
      {status === 'signedOut' && <AuthForm />}
      {status === 'signedIn' && <SignedIn />}
      {status === 'unavailable' && (
        <div className="space-y-3 text-sm text-slate-300" data-testid="account-unavailable">
          <p>Accounts aren’t available on this server yet.</p>
          <p className="text-xs text-slate-400">
            They need the free Cloudflare Pages Functions + D1 database that ship with this project (see
            README → Accounts). Everything still works and is saved on this device.
          </p>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => void initAccount()}>
            Try again
          </button>
        </div>
      )}
    </Overlay>
  );
}
