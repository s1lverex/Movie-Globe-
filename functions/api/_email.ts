/// <reference types="@cloudflare/workers-types" />
/**
 * Transactional email via Resend's HTTP API. The API key is a Cloudflare
 * Pages *secret* (RESEND_API_KEY) — never committed. Without it, emails are
 * skipped (logged) so local dev and tests keep working.
 */
export interface EmailEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(env: EmailEnv, msg: EmailMessage): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email skipped: no RESEND_API_KEY] ${msg.subject}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'Travel Globe <onboarding@resend.dev>',
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      tags: [{ name: 'app', value: 'travel-globe' }],
    }),
  });
  if (!res.ok) console.log(`[email failed] ${res.status} ${await res.text()}`);
  return res.ok;
}

export function appUrl(env: EmailEnv, req: Request): string {
  return (env.APP_URL || new URL(req.url).origin).replace(/\/+$/, '');
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0B1220;font-family:Inter,Arial,sans-serif;color:#E5E9F2">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#121A2B;border-radius:20px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<div style="font-size:20px;font-weight:700;color:#fff">🌍 Travel Globe</div>
<h1 style="font-size:22px;color:#fff;margin:20px 0 8px">${title}</h1>
${body}
<p style="color:#64748B;font-size:12px;margin-top:28px">Travel Globe · Walk the World. Plan Your Journey.</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#2F6BFF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:14px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;

export function welcomeEmail(name: string, url: string): Omit<EmailMessage, 'to'> {
  return {
    subject: 'Welcome to Travel Globe 🌍',
    html: layout(
      `Welcome aboard, ${esc(name)}!`,
      `<p style="line-height:1.6;color:#CBD5E1">Your account is ready. Your trips, travel diary, passport stamps and explorer now sync across all your devices.</p>${button(url, 'Open Travel Globe')}<p style="color:#94A3B8;font-size:13px">Didn’t sign up? You can ignore this email.</p>`,
    ),
    text: `Welcome aboard, ${name}!\n\nYour Travel Globe account is ready. Your trips, travel diary, passport stamps and explorer now sync across all your devices.\n\nOpen Travel Globe: ${url}\n\nDidn't sign up? You can ignore this email.`,
  };
}

export function resetEmail(name: string, link: string): Omit<EmailMessage, 'to'> {
  return {
    subject: 'Reset your Travel Globe password',
    html: layout(
      'Reset your password',
      `<p style="line-height:1.6;color:#CBD5E1">Hi ${esc(name)}, we received a request to reset your password. This link works once and expires in 30 minutes.</p>${button(link, 'Choose a new password')}<p style="color:#94A3B8;font-size:13px">If you didn’t request this, you can safely ignore this email — your password won’t change.</p>`,
    ),
    text: `Hi ${name},\n\nReset your Travel Globe password (link works once, expires in 30 minutes):\n${link}\n\nIf you didn't request this, ignore this email.`,
  };
}
