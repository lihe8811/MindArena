import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Swords, ArrowRight, Github } from 'lucide-react';
import type { VerificationChallenge } from '@/shared/types';

const STRICT_EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?=.{4,255}$)(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\.)+[A-Za-z]{2,63}$/;

function isValidEmailAddress(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!STRICT_EMAIL_PATTERN.test(normalized)) {
    return false;
  }

  const [, domain = ''] = normalized.split('@');
  const hostname = domain.replace(/\.[A-Za-z]{2,63}$/, '');

  return /[A-Za-z]/.test(hostname);
}

interface LandingProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onConfirmLogin: (email: string, code: string) => Promise<void>;
  onRegister: (payload: { name: string; email: string; password: string }) => Promise<void>;
  onResendLoginVerification: (email: string) => Promise<void>;
  onVerifyEmail: (email: string, code: string) => Promise<void>;
  onResendVerification: (email: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onResetPassword: (email: string, code: string, password: string) => Promise<void>;
  loginChallenge?: VerificationChallenge | null;
  verificationChallenge?: VerificationChallenge | null;
  passwordResetChallenge?: VerificationChallenge | null;
  isLoading?: boolean;
  error?: string | null;
  notice?: string | null;
}

export function Landing({
  onLogin,
  onConfirmLogin,
  onRegister,
  onResendLoginVerification,
  onVerifyEmail,
  onResendVerification,
  onRequestPasswordReset,
  onResetPassword,
  loginChallenge,
  verificationChallenge,
  passwordResetChallenge,
  isLoading,
  error,
  notice,
}: LandingProps) {
  const [mode, setMode] = useState<'login' | 'login-verify' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!loginChallenge) return;
    setMode('login-verify');
    setEmail(loginChallenge.email);
    setCode('');
    setLocalError(null);
  }, [loginChallenge]);

  useEffect(() => {
    if (!verificationChallenge) return;
    setMode('verify');
    setEmail(verificationChallenge.email);
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
  }, [verificationChallenge]);

  useEffect(() => {
    if (!passwordResetChallenge) return;
    setMode('reset');
    setEmail(passwordResetChallenge.email);
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
  }, [passwordResetChallenge]);

  const activeChallenge =
    mode === 'login-verify'
      ? loginChallenge
      : mode === 'verify'
        ? verificationChallenge
        : mode === 'reset'
          ? passwordResetChallenge
          : null;
  const expiresLabel = activeChallenge
    ? new Date(activeChallenge.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const previewCode = activeChallenge?.deliveryMethod === 'dev-log' ? activeChallenge.previewCode : null;

  const message = localError ?? error;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Section: Marketing */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-surface-container-lowest overflow-hidden border-r border-outline-variant">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#7c3aed_0%,transparent_50%)]" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        </div>
        
        <div className="absolute inset-0 opacity-[0.03] bg-grid" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Swords className="w-6 h-6 text-on-primary fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-on-surface">MindArena</span>
          </div>

          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Next-Gen Rhetoric Engine
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tight text-on-surface mb-8 leading-[1.1]"
            >
              Master the Art of <span className="text-primary">Persuasion.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-secondary leading-relaxed mb-12"
            >
              Leverage high-precision AI to sharpen your critical thinking, identify logical fallacies, and construct impenetrable arguments in real-time.
            </motion.p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-surface-container border border-outline-variant">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-primary text-sm font-bold">01</span>
                </div>
                <h3 className="font-bold text-on-surface mb-1 text-sm">Rhetoric Analysis</h3>
                <p className="text-xs text-secondary">Real-time tone and logic scoring for every claim made.</p>
              </div>
              <div className="p-5 rounded-xl bg-surface-container border border-outline-variant">
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center mb-3">
                  <span className="text-tertiary text-sm font-bold">02</span>
                </div>
                <h3 className="font-bold text-on-surface mb-1 text-sm">Formal Logic</h3>
                <p className="text-xs text-secondary">Built-in library of 200+ philosophical frameworks.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-background" 
                  src={`https://i.pravatar.cc/150?u=mindarena-${i}`}
                  alt="Avatar"
                />
              ))}
            </div>
            <p className="text-sm text-secondary">
              Join <span className="text-on-surface font-bold">12,400+</span> scholars worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Right Section: Logic Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2">
              {mode === 'login'
                ? 'Welcome back'
                : mode === 'login-verify'
                  ? 'Enter sign-in code'
                : mode === 'register'
                  ? 'Create your account'
                  : mode === 'verify'
                    ? 'Verify your email'
                    : mode === 'forgot'
                      ? 'Reset your passcode'
                      : 'Enter reset code'}
            </h2>
            <p className="text-secondary text-sm">
              {mode === 'login'
                ? 'Enter your credentials to access the engine.'
                : mode === 'login-verify'
                  ? `Enter the 6-digit code sent to ${loginChallenge?.email ?? email} to finish signing in.`
                : mode === 'register'
                  ? 'Register with a real email address to unlock your workspace.'
                  : mode === 'verify'
                    ? `Enter the 6-digit code sent to ${verificationChallenge?.email ?? email}.`
                    : mode === 'forgot'
                      ? 'Enter your email and we will send a verification code to reset your passcode.'
                      : `Enter the reset code sent to ${passwordResetChallenge?.email ?? email} and choose a new passcode.`}
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setLocalError(null);

              if (!isValidEmailAddress(email)) {
                setLocalError('Please enter a valid email address.');
                return;
              }

              if (mode === 'login') {
                await onLogin(email, password);
                return;
              }
              if (mode === 'login-verify') {
                if (!code.trim() || code.trim().length !== 6) {
                  setLocalError('Please enter the 6-digit sign-in code.');
                  return;
                }
                await onConfirmLogin(email, code);
                return;
              }
              if (mode === 'verify') {
                if (!code.trim() || code.trim().length !== 6) {
                  setLocalError('Please enter the 6-digit verification code.');
                  return;
                }
                await onVerifyEmail(email, code);
                return;
              }
              if (mode === 'forgot') {
                await onRequestPasswordReset(email);
                return;
              }
              if (mode === 'reset') {
                if (!code.trim() || code.trim().length !== 6) {
                  setLocalError('Please enter the 6-digit reset code.');
                  return;
                }
                if (password.trim().length < 8) {
                  setLocalError('New passcode must be at least 8 characters.');
                  return;
                }
                if (password !== confirmPassword) {
                  setLocalError('Passcode confirmation does not match.');
                  return;
                }
                await onResetPassword(email, code, password);
                return;
              }
              if (!name.trim()) {
                setLocalError('Please enter a display name.');
                return;
              }
              if (password.trim().length < 8) {
                setLocalError('Password must be at least 8 characters.');
                return;
              }
              await onRegister({ name, email, password });
            }}
          >
            {mode === 'register' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Display Name</label>
                <input
                  type="text"
                  placeholder="Your debate name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">
                {mode === 'forgot' || mode === 'reset' ? 'Account Email' : 'Verified Email'}
              </label>
              <input 
                type="email" 
                placeholder="name@school.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={mode === 'login-verify' || mode === 'verify' || mode === 'reset'}
                className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            {mode === 'login-verify' || mode === 'verify' || mode === 'reset' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-secondary">
                    {mode === 'login-verify'
                      ? 'Sign-In Code'
                      : mode === 'verify'
                        ? 'Verification Code'
                        : 'Reset Code'}
                  </label>
                  {expiresLabel ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Expires {expiresLabel}
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none tracking-[0.35em] text-center"
                />
                {previewCode ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-on-surface">
                    Local dev mode: your{' '}
                    {mode === 'login-verify' ? 'sign-in' : mode === 'verify' ? 'verification' : 'reset'} code is{' '}
                    <span className="font-black tracking-[0.25em]">{previewCode}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {mode === 'login' || mode === 'register' || mode === 'reset' ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-secondary">
                      {mode === 'reset' ? 'New Passcode' : 'Secret Key'}
                    </label>
                    {mode === 'login' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setCode('');
                          setPassword('');
                          setConfirmPassword('');
                          setLocalError(null);
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot Key?
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    placeholder={mode === 'reset' ? 'Choose a new passcode' : '••••••••'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                {mode === 'reset' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Confirm Passcode</label>
                    <input
                      type="password"
                      placeholder="Repeat the new passcode"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                ) : (
                  <label className="flex items-center gap-3 py-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary/20" />
                    <span className="text-sm text-secondary select-none group-hover:text-on-surface transition-colors">Remember session for 30 days</span>
                  </label>
                )}
              </>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-tertiary/30 bg-tertiary/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-red-200">
                {message}
              </div>
            ) : null}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Authenticating...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'login-verify'
                    ? 'Confirm Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : mode === 'verify'
                      ? 'Confirm Email'
                      : mode === 'forgot'
                        ? 'Send Reset Code'
                        : 'Set New Passcode'}
              <ArrowRight className="w-4 h-4" />
            </button>

            {mode === 'login-verify' || mode === 'verify' || mode === 'reset' ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setCode('');
                    setPassword('');
                    setConfirmPassword('');
                    setLocalError(null);
                  }}
                  className="text-secondary hover:text-on-surface transition-colors"
                >
                  Back to sign in
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLocalError(null);
                    if (!isValidEmailAddress(email)) {
                      setLocalError('Please enter a valid email address.');
                      return;
                    }
                    if (mode === 'login-verify') {
                      await onResendLoginVerification(email);
                      return;
                    }
                    if (mode === 'verify') {
                      await onResendVerification(email);
                      return;
                    }
                    await onRequestPasswordReset(email);
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  Resend code
                </button>
              </div>
            ) : null}
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-background px-4 text-secondary font-medium">External Identity</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="h-12 flex items-center justify-center gap-3 border border-outline-variant rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors active:scale-[0.98]">
              <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-bold text-on-surface">Google</span>
            </button>
            <button className="h-12 flex items-center justify-center gap-3 border border-outline-variant rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors active:scale-[0.98]">
              <Github className="w-5 h-5 text-on-surface" />
              <span className="text-sm font-bold text-on-surface">GitHub</span>
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-secondary">
            {mode === 'login'
              ? 'New to the circle?'
              : mode === 'login-verify'
                ? 'Need another sign-in attempt?'
              : mode === 'register'
                ? 'Already have an account?'
                : mode === 'verify'
                  ? 'Verified already?'
                  : mode === 'forgot'
                    ? 'Remembered your passcode?'
                    : 'Password updated already?'}{' '}
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                setCode('');
                setPassword('');
                setConfirmPassword('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="text-primary font-bold hover:underline"
            >
              {mode === 'login' ? 'Register account' : mode === 'login-verify' ? 'Back to sign in' : 'Back to sign in'}
            </button>
          </p>
        </div>

        <div className="mt-auto pt-10 text-center">
          <div className="flex justify-center gap-6 mb-4">
            {['Terms', 'Privacy', 'Security'].map((item) => (
              <button key={item} className="text-[10px] uppercase tracking-widest text-secondary hover:text-on-surface transition-colors">{item}</button>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-secondary/30">© 2024 MindArena Systems. Encrypted under 256-bit AES.</p>
        </div>
      </div>
    </div>
  );
}
