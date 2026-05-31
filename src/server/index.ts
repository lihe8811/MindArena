import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response } from 'express';
import {
  appendDebateMessage,
  buildDashboardForUser,
  buildPerformanceForUser,
  createDebateForUser,
  getActiveDebate,
  getSessionFromToken,
  listUserHistory,
  loginUser,
  logoutSession,
  registerUser,
  requireUserFromToken,
} from './stores/appStore';
import type { AppBootstrap } from '@/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3001);
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
          'Start a debate to practice structured argumentation.',
          'Review history after each completed round.',
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
        recommendation: 'Create an account, then start your first debate.',
        milestoneProgress: 0,
      },
      activeDebate: null,
    };
  }

  return {
    session,
    dashboard: buildDashboardForUser(session.user),
    history: listUserHistory(session.user.id),
    performance: buildPerformanceForUser(session.user.id),
    activeDebate: getActiveDebate(session.user.id),
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

app.post('/api/session/register', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!email || !password || password.length < 8) {
    res.status(400).send('Name, email, and a password with at least 8 characters are required.');
    return;
  }

  try {
    res.status(201).json(registerUser({ name, email, password }));
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Unable to register.');
  }
});

app.post('/api/session/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).send('Email and password are required.');
    return;
  }

  try {
    res.json(loginUser({ email, password }));
  } catch (error) {
    res.status(401).send(error instanceof Error ? error.message : 'Unable to sign in.');
  }
});

app.post('/api/session/logout', (req, res) => {
  logoutSession(getAuthToken(req));
  res.json({ ok: true });
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
    }),
  );
});

app.post('/api/debates/current/messages', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const content = String(req.body?.content ?? '').trim();
  if (!content) {
    res.status(400).send('Message cannot be empty.');
    return;
  }

  try {
    res.json(appendDebateMessage(user.id, user.name, content));
  } catch (error) {
    res.status(404).send(error instanceof Error ? error.message : 'No active debate.');
  }
});

const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`MindArena server listening on http://localhost:${port}`);
});
