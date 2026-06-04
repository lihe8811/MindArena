import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BarChart2, BookOpen } from 'lucide-react';
import { MindArenaLogo } from '@/client/components/MindArenaLogo';
import { StudentAvatar } from '@/client/components/StudentAvatar';
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
  onConfirmLogin?: (email: string, code: string) => Promise<void>;
  onRegister: (payload: { name: string; email: string; password: string }) => Promise<void>;
  onResendLoginVerification?: (email: string) => Promise<void>;
  onVerifyEmail?: (email: string, code: string) => Promise<void>;
  onResendVerification?: (email: string) => Promise<void>;
  onRequestPasswordReset?: (email: string) => Promise<void>;
  onResetPassword?: (email: string, code: string, password: string) => Promise<void>;
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--color-primary-container)_0%,transparent_60%)]" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        </div>
        
        <div className="absolute inset-0 opacity-[0.03] bg-grid" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-20">
          <div className="flex items-center gap-3">
            <MindArenaLogo />
            <span className="text-2xl font-black tracking-tighter text-on-surface">MindArena</span>
          </div>

          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI Debate Practice
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tight text-on-surface mb-8 leading-[1.1] text-balance"
            >
              Master the Art of <span className="text-primary">Persuasion.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-secondary leading-relaxed mb-12"
            >
              Practice structured debates against an AI that pushes back. Get specific feedback on your logic, catch your own fallacies, and track how your score improves over time.
            </motion.p>

            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface text-sm">Rhetoric Analysis</h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">Real-time tone and logic scoring for every argument you make.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant">
                <div className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-tertiary" />
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface text-sm">Philosophical Frameworks</h3>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">200+ frameworks from Socratic questioning to game theory.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[0, 1, 2].map((variant) => (
                <div key={variant}>
                  <StudentAvatar
                    variant={variant}
                    className="h-10 w-10"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-secondary">
              Join <span className="text-on-surface font-bold">12,400+</span> students worldwide.
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
                if (!onConfirmLogin) {
                  setLocalError('Sign-in verification is unavailable in this client.');
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
                if (!onVerifyEmail) {
                  setLocalError('Email verification is unavailable in this client.');
                  return;
                }
                await onVerifyEmail(email, code);
                return;
              }
              if (mode === 'forgot') {
                if (!onRequestPasswordReset) {
                  setLocalError('Password reset is unavailable in this client.');
                  return;
                }
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
                if (!onResetPassword) {
                  setLocalError('Password reset is unavailable in this client.');
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
                <label className="text-sm font-semibold text-secondary ml-1">Display Name</label>
                <input
                  type="text"
                  placeholder="Your debate name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary ml-1">
                {mode === 'forgot' || mode === 'reset' ? 'Account Email' : 'Verified Email'}
              </label>
              <input 
                type="email" 
                placeholder="name@school.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={mode === 'login-verify' || mode === 'verify' || mode === 'reset'}
                className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            {mode === 'login-verify' || mode === 'verify' || mode === 'reset' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-semibold text-secondary">
                    {mode === 'login-verify'
                      ? 'Sign-In Code'
                      : mode === 'verify'
                        ? 'Verification Code'
                        : 'Reset Code'}
                  </label>
                  {expiresLabel ? (
                    <span className="text-xs font-medium text-secondary">
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
                  className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none tracking-[0.35em] text-center"
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
                    <label className="text-sm font-semibold text-secondary">
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
                    className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                {mode === 'reset' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary ml-1">Confirm Passcode</label>
                    <input
                      type="password"
                      placeholder="Repeat the new passcode"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full h-12 bg-surface-container border border-outline-variant rounded-lg px-4 text-on-surface placeholder:text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
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
                    if (mode === 'login-verify' && onResendLoginVerification) {
                      await onResendLoginVerification(email);
                      return;
                    }
                    if (mode === 'verify' && onResendVerification) {
                      await onResendVerification(email);
                      return;
                    }
                    if (onRequestPasswordReset) {
                      await onRequestPasswordReset(email);
                      return;
                    }
                    setLocalError('Code resend is unavailable in this client.');
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  Resend code
                </button>
              </div>
            ) : null}
          </form>

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
              <button key={item} className="text-xs text-secondary hover:text-on-surface transition-colors">{item}</button>
            ))}
          </div>
          <p className="text-xs text-secondary/30">© 2026 MindArena</p>
        </div>
      </div>
    </div>
  );
}
