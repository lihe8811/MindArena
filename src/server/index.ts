import express from 'express';
import path from 'node:path';
import type { Request, Response } from 'express';
import { isValidEmailAddress } from './auth/email';
import { sendVerificationCodeEmail } from './auth/emailVerification';
import {
  appendDebateMessage,
  buildDashboardForUser,
  buildPerformanceForUser,
  confirmLoginCode,
  createDebateForUser,
  getActiveDebate,
  getSessionFromToken,
  getUserSettings,
  listUserHistory,
  loginUser,
  logoutSession,
  requestPasswordReset,
  registerUser,
  resendLoginCode,
  resetPasswordWithCode,
  resendVerificationCode,
  requireUserFromToken,
  updateUserSettings,
  verifyUserEmail,
} from './stores/appStore.ts';
import {
  createKnowledgeEntry,
  deleteKnowledgeDocument,
  getKnowledgeDocumentDetail,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  searchKnowledgeBase,
} from './stores/knowledgeBaseStore.ts';
import { RoundOrchestrator } from './orchestration/roundOrchestrator.ts';
import type { AppBootstrap } from '@/shared/types';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const distPath = path.join(import.meta.dir, '../../dist');
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use(express.json());

app.use('/api', (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || current.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  if (current.count >= 180) {
    res.status(429).send('Too many requests. Please slow down.');
    return;
  }

  current.count += 1;
  rateLimitMap.set(key, current);
  next();
});

function getAuthToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}

function buildBootstrap(req: Request): AppBootstrap {
  const session = getSessionFromToken(getAuthToken(req));

  if (!session.authenticated || !session.user) {
    return {
      session,
      dashboard: {
        heroTitle: 'Train arguments that hold up under pressure',
        heroSubtitle: 'Create an account to persist debates, documents, settings, and future AI-assisted rounds.',
        stats: {
          logicScore: 0,
          averageResponseSeconds: 0,
          winRate: 0,
          debatesCompleted: 0,
        },
        recentDebates: [],
        recommendations: [
          'Create an account to persist your workspace.',
          'Add rule sets before debating.',
          'Start a debate after your knowledge base is ready.',
        ],
      },
      history: [],
      performance: {
        highlights: [
          { label: 'Win Rate', value: '0%', trend: '+0%' },
          { label: 'Elo Rating', value: '1200', trend: '+0' },
          { label: 'Global Rank', value: '#--', trend: '-0', isDown: true },
          { label: 'Avg Response', value: '--', trend: '-0.0s' },
        ],
        skillBalance: [],
        insight: 'Sign in to start tracking your performance.',
        recommendation: 'Create an account, add rule sets, then start your first debate.',
        milestoneProgress: 0,
      },
      knowledgeBase: [],
      activeDebate: null,
      settings: null,
    };
  }

  return {
    session,
    dashboard: buildDashboardForUser(session.user),
    history: listUserHistory(session.user.id),
    performance: buildPerformanceForUser(session.user.id),
    knowledgeBase: listKnowledgeDocuments(session.user.id),
    activeDebate: getActiveDebate(session.user.id),
    settings: getUserSettings(session.user.id),
  };
}

function requireAuth(req: Request, res: Response) {
  try {
    return requireUserFromToken(getAuthToken(req));
  } catch (error) {
    res.status(401).send(error instanceof Error ? error.message : 'Authentication required.');
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/bootstrap', (req, res) => {
  res.json(buildBootstrap(req));
});

app.post('/api/session/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!name || !email || !password || password.length < 8) {
    res.status(400).send('Name, email, and a password with at least 8 characters are required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    const verification = registerUser({ name, email, password });
    let deliveryMethod: 'email' | 'dev-log' = 'email';
    let previewCode: string | undefined;
    try {
      const delivery = await sendVerificationCodeEmail({
        email: verification.email,
        code: verification.code,
        expiresAt: verification.expiresAt,
        purpose: 'verification',
      });
      deliveryMethod = delivery.provider === 'resend' ? 'email' : 'dev-log';
      previewCode = delivery.previewCode;
    } catch (deliveryError) {
      res
        .status(502)
        .send(
          deliveryError instanceof Error
            ? `Account created, but we could not send the verification email. ${deliveryError.message}`
            : 'Account created, but we could not send the verification email.',
        );
      return;
    }
    res.status(201).json({
      email: verification.email,
      expiresAt: verification.expiresAt,
      requiresVerification: true,
      deliveryMethod,
      previewCode,
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to register.');
  }
});

app.post('/api/session/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).send('Email and password are required.');
    return;
  }

  try {
    const challenge = loginUser({ email, password });
    let deliveryMethod: 'email' | 'dev-log' = 'email';
    let previewCode: string | undefined;
    try {
      const delivery = await sendVerificationCodeEmail({
        email: challenge.email,
        code: challenge.code,
        expiresAt: challenge.expiresAt,
        purpose: 'login',
      });
      deliveryMethod = delivery.provider === 'resend' ? 'email' : 'dev-log';
      previewCode = delivery.previewCode;
    } catch (deliveryError) {
      res
        .status(502)
        .send(
          deliveryError instanceof Error
            ? `Sign-in code created, but we could not send the email. ${deliveryError.message}`
            : 'Sign-in code created, but we could not send the email.',
        );
      return;
    }

    res.json({
      email: challenge.email,
      expiresAt: challenge.expiresAt,
      requiresVerification: true,
      deliveryMethod,
      previewCode,
    });
  } catch (error) {
    res.status(401).send(error instanceof Error ? error.message : 'Unable to sign in.');
  }
});

app.post('/api/session/confirm-login', (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const code = String(req.body?.code ?? '').trim();

  if (!email || !code) {
    res.status(400).send('Email and sign-in code are required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    res.json(confirmLoginCode({ email, code }));
  } catch (error) {
    res.status(401).send(error instanceof Error ? error.message : 'Unable to complete sign in.');
  }
});

app.post('/api/session/resend-login-code', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();

  if (!email) {
    res.status(400).send('Email is required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    const challenge = resendLoginCode(email);
    let deliveryMethod: 'email' | 'dev-log' = 'email';
    let previewCode: string | undefined;
    try {
      const delivery = await sendVerificationCodeEmail({
        email: challenge.email,
        code: challenge.code,
        expiresAt: challenge.expiresAt,
        purpose: 'login',
      });
      deliveryMethod = delivery.provider === 'resend' ? 'email' : 'dev-log';
      previewCode = delivery.previewCode;
    } catch (deliveryError) {
      res
        .status(502)
        .send(
          deliveryError instanceof Error
            ? `A new sign-in code was created, but we could not send the email. ${deliveryError.message}`
            : 'A new sign-in code was created, but we could not send the email.',
        );
      return;
    }

    res.json({
      email: challenge.email,
      expiresAt: challenge.expiresAt,
      requiresVerification: true,
      deliveryMethod,
      previewCode,
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to resend sign-in code.');
  }
});

app.post('/api/session/verify-email', (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const code = String(req.body?.code ?? '').trim();

  if (!email || !code) {
    res.status(400).send('Email and verification code are required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    res.json({
      ok: true,
      ...verifyUserEmail({ email, code }),
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to verify email.');
  }
});

app.post('/api/session/resend-verification', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();

  if (!email) {
    res.status(400).send('Email is required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    const verification = resendVerificationCode(email);
    let deliveryMethod: 'email' | 'dev-log' = 'email';
    let previewCode: string | undefined;
    try {
      const delivery = await sendVerificationCodeEmail({
        email: verification.email,
        code: verification.code,
        expiresAt: verification.expiresAt,
        purpose: 'verification',
      });
      deliveryMethod = delivery.provider === 'resend' ? 'email' : 'dev-log';
      previewCode = delivery.previewCode;
    } catch (deliveryError) {
      res
        .status(502)
        .send(
          deliveryError instanceof Error
            ? `A new code was created, but we could not send the verification email. ${deliveryError.message}`
            : 'A new code was created, but we could not send the verification email.',
        );
      return;
    }
    res.json({
      email: verification.email,
      expiresAt: verification.expiresAt,
      requiresVerification: true,
      deliveryMethod,
      previewCode,
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to resend verification code.');
  }
});

app.post('/api/session/request-password-reset', async (req, res) => {
  const email = String(req.body?.email ?? '').trim();

  if (!email) {
    res.status(400).send('Email is required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  try {
    const reset = requestPasswordReset(email);
    let deliveryMethod: 'email' | 'dev-log' = 'email';
    let previewCode: string | undefined;
    try {
      const delivery = await sendVerificationCodeEmail({
        email: reset.email,
        code: reset.code,
        expiresAt: reset.expiresAt,
        purpose: 'password-reset',
      });
      deliveryMethod = delivery.provider === 'resend' ? 'email' : 'dev-log';
      previewCode = delivery.previewCode;
    } catch (deliveryError) {
      res
        .status(502)
        .send(
          deliveryError instanceof Error
            ? `A reset code was created, but we could not send the email. ${deliveryError.message}`
            : 'A reset code was created, but we could not send the email.',
        );
      return;
    }

    res.json({
      email: reset.email,
      expiresAt: reset.expiresAt,
      requiresVerification: true,
      deliveryMethod,
      previewCode,
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to request password reset.');
  }
});

app.post('/api/session/reset-password', (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const code = String(req.body?.code ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!email || !code || !password) {
    res.status(400).send('Email, reset code, and new password are required.');
    return;
  }

  if (!isValidEmailAddress(email)) {
    res.status(400).send('Please enter a valid email address.');
    return;
  }

  if (password.length < 8) {
    res.status(400).send('New password must be at least 8 characters.');
    return;
  }

  try {
    res.json(resetPasswordWithCode({ email, code, password }));
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to reset password.');
  }
});

app.post('/api/session/logout', (req, res) => {
  logoutSession(getAuthToken(req));
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  res.json({
    settings: getUserSettings(user.id),
  });
});

app.put('/api/settings', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const displayName = String(req.body?.displayName ?? '').trim();
  const title = String(req.body?.title ?? '').trim();

  if (!displayName || !title) {
    res.status(400).send('Display name and title are required.');
    return;
  }

  try {
    res.json(
      updateUserSettings(user.id, {
        displayName,
        title,
        defaultStance: req.body?.defaultStance === 'Opponent' ? 'Opponent' : 'Proponent',
        defaultRigor: Number(req.body?.defaultRigor ?? 3),
        emailNotifications: Boolean(req.body?.emailNotifications),
        rememberSession: Boolean(req.body?.rememberSession),
        compactSidebar: Boolean(req.body?.compactSidebar),
        autoOpenArena: Boolean(req.body?.autoOpenArena),
      }),
    );
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to update settings.');
  }
});

app.get('/api/notifications', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const completedCount = listUserHistory(user.id).filter((item) => item.status !== 'In Progress').length;
  const notifications = completedCount > 0
    ? [
        {
          id: 'debate-progress',
          type: 'info',
          title: 'Debate progress',
          message: `You have ${completedCount} completed debate(s). Keep up the practice.`,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  res.json({ notifications });
});

app.put('/api/notifications/read', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  res.json({ ok: true });
});

app.get('/api/knowledge-base', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  res.json({
    documents: listKnowledgeDocuments(user.id),
  });
});

app.get('/api/knowledge-base/:documentId', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    res.json(getKnowledgeDocumentDetail(user.id, req.params.documentId));
  } catch (error) {
    res.status(404).send(error instanceof Error ? error.message : 'Knowledge document not found.');
  }
});

app.post('/api/knowledge-base/rules', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const title = String(req.body?.title ?? '').trim();
  const category = String(req.body?.category ?? 'Rules').trim();
  const content = String(req.body?.content ?? '').trim();

  if (!content) {
    res.status(400).send('Rule content is required.');
    return;
  }

  try {
    const document = createKnowledgeEntry({
      ownerUserId: user.id,
      title: title || 'New Rule Set',
      category,
      sourceType: 'rule',
      content,
    });

    res.status(201).json({
      document,
      documents: listKnowledgeDocuments(user.id),
    });
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Failed to store rules.');
  }
});

app.post('/api/knowledge-base/search', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const query = String(req.body?.query ?? '').trim();
  const limit = Math.max(1, Math.min(20, Number(req.body?.limit ?? 8)));
  res.json(searchKnowledgeBase(user.id, query, limit));
});

app.post('/api/knowledge-base/:documentId/reindex', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    res.json(reindexKnowledgeDocument(user.id, req.params.documentId));
  } catch (error) {
    res.status(404).send(error instanceof Error ? error.message : 'Knowledge document not found.');
  }
});

app.post('/api/knowledge-base/:documentId', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    res.json({
      documents: deleteKnowledgeDocument(user.id, req.params.documentId),
    });
  } catch (error) {
    res.status(404).send(error instanceof Error ? error.message : 'Knowledge document not found.');
  }
});

app.get('/api/debates/current', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  res.json({
    debate: getActiveDebate(user.id),
  });
});

app.post('/api/debates', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const topic = String(req.body?.topic ?? '').trim();
  const speakerRole = (['pro1', 'pro2', 'con1', 'con2'] as const).find(
    (role) => role === req.body?.speakerRole,
  );
  const stance =
    speakerRole === 'con1' || speakerRole === 'con2'
      ? 'Opponent'
      : req.body?.stance === 'Opponent'
        ? 'Opponent'
        : 'Proponent';
  const rigor = Math.max(1, Math.min(5, Number(req.body?.rigor ?? 3)));
  const knowledgeDocumentIds = Array.isArray(req.body?.knowledgeDocumentIds)
    ? req.body.knowledgeDocumentIds.filter((value: unknown): value is string => typeof value === 'string')
    : [];

  if (!topic) {
    res.status(400).send('Topic is required.');
    return;
  }

  res.status(201).json(
    createDebateForUser(user.id, {
      topic,
      stance,
      speakerRole,
      rigor,
      knowledgeDocumentIds,
    }),
  );
});

app.post('/api/debates/current/messages', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const content = String(req.body?.content ?? '').trim();
  if (!content) {
    res.status(400).send('Message cannot be empty.');
    return;
  }

  try {
    const updatedDebate = await RoundOrchestrator.processTurn(user.id, content);
    res.json(updatedDebate);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'Error processing debate turn.');
  }
});

app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`MindArena server listening on http://localhost:${port}`);
});
