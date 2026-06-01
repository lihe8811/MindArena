/**
 * MindArena Server - Button → Endpoint Mapping
 * =============================================
 * Every button in the app and its wiring status.
 * Updated: 2026/05/31
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  SIDEBAR NAVIGATION                                                         │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Button                          │  Status                                 │
 * ├──────────────────────────────────┼──────────────────────────────────────────┤
 * │  Home                            │  ✅ COMPLETE — navigates to dashboard    │
 * │  Start Debate                    │  ✅ COMPLETE — navigates to start-debate │
 * │  Live Arena                      │  ✅ COMPLETE — navigates to arena        │
 * │  History                         │  ✅ COMPLETE — navigates to history       │
 * │  Performance                     │  ✅ COMPLETE — navigates to performance  │
 * │  Knowledge Base                  │  ✅ COMPLETE — navigates to knowledge-base│
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  DASHBOARD PAGE                                                             │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Start New Debate                │  ✅ COMPLETE → 'start-debate' view       │
 * │  Review History                  │  ✅ COMPLETE → 'history' view            │
 * │  View History (Recent Debates)    │  ✅ COMPLETE → 'history' view            │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  START DEBATE PAGE                                                          │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Random Prompt                   │  ✅ COMPLETE — client cycles prompts[]   │
 * │  Proponent                       │  ✅ COMPLETE — sets stance state         │
 * │  Opponent                        │  ✅ COMPLETE — sets stance state         │
 * │  Rigor (range slider)            │  ✅ COMPLETE — sets rigor 1-5            │
 * │  Create Debate Room              │  ✅ COMPLETE → POST /api/debates          │
 * │  Knowledge Document selection    │  ✅ COMPLETE — toggles doc IDs           │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ARENA PAGE                                                                 │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Send Argument (submit)           │  ✅ COMPLETE → POST /api/debates/current/messages │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  HISTORY PAGE                                                               │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  (No interactive buttons — table of completed debates from GET /api/bootstrap) │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  PERFORMANCE PAGE                                                           │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Win Rate                        │  ✅ COMPLETE — recalculates from history │
 * │  Elo Rating                      │  ✅ COMPLETE — recalculates from history  │
 * │  Global Rank                     │  ✅ COMPLETE — recalculates from history  │
 * │  Avg Response                    │  ✅ COMPLETE — recalculates from history  │
 * │  Skill Balance (5 skills)        │  ✅ COMPLETE — recalculates from history  │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  TOP BAR                                                                   │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Notification Bell               │  ✅ COMPLETE → GET /api/notifications     │
 * │  Settings Gear                   │  ✅ COMPLETE → GET /api/settings         │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  LANDING PAGE (Auth)                                                        │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Sign In                         │  ✅ COMPLETE → POST /api/session/login    │
 * │  Create Account                  │  ✅ COMPLETE → POST /api/session/register │
 * │  Google Sign-In                  │  ⚠️ STUB — needs OAuth provider           │
 * │  GitHub Sign-In                  │  ⚠️ STUB — needs OAuth provider           │
 * │  Forgot Key                      │  ⚠️ STUB — needs email service            │
 * │  Toggle Login/Register           │  ✅ COMPLETE — client state toggle        │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  KNOWLEDGE BASE PAGE                                                       │
 * ├──────────────────────────────────┬──────────────────────────────────────────┤
 * │  Save Rule                       │  ✅ COMPLETE → POST /api/knowledge-base/rules │
 * │  Upload File                     │  ✅ COMPLETE → POST /api/knowledge-base/upload │
 * │  Search                          │  ✅ COMPLETE → POST /api/knowledge-base/search │
 * │  View Document Detail            │  ✅ COMPLETE → GET /api/knowledge-base/:id  │
 * │  Reindex Document                │  ✅ COMPLETE → POST /api/knowledge-base/:id/reindex │
 * │  Delete Document                 │  ✅ COMPLETE → DELETE /api/knowledge-base/:id │
 * └──────────────────────────────────┴──────────────────────────────────────────┘
 *
 * ================================================================================
 * STATS RECALCULATION LOGIC
 * ================================================================================
 *
 * All stats (win rate, Elo, global rank, avg response, skill balance) are
 * recalculated server-side in appStore.ts via buildPerformanceForUser() and
 * buildDashboardForUser() every time GET /api/bootstrap is called.
 *
 * refreshApp() in App.tsx calls getBootstrap() which hits /api/bootstrap,
 * which in turn calls buildDashboardForUser() and buildPerformanceForUser()
 * using the latest debate data from the server store.
 *
 * Key functions:
 * - buildPerformanceForUser(userId) → recalculates all PerformanceData fields
 * - buildDashboardForUser(user)    → recalculates all DashboardData stats
 * - listUserHistory(userId)        → returns completed debates for computation
 * - listUserDebates(userId)        → all debates (completed + in-progress)
 *
 * Stats recalculate on:
 * - App load (bootstrap)
 * - After completing a debate (handleSendMessage)
 * - After logging in (refreshApp)
 * - Opening notifications (handleOpenNotifications → refreshApp)
 *
 * ================================================================================
 */

export {}; // Documentation only