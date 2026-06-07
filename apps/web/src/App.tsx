import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from './utils/AuthContext';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { InstallPrompt } from './components/InstallPrompt';

// ─── Lazy-loaded routes (code splitting) ─────────────────────────────────────
const LandingPage      = lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const DashboardLayout  = lazy(() => import('./components/layout/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const BoundsDashboard  = lazy(() => import('./components/dashboard/BoundsDashboard').then(m => ({ default: m.BoundsDashboard })));
const BoundCreator     = lazy(() => import('./components/creator/BoundCreator').then(m => ({ default: m.BoundCreator })));
const MobilePlayer     = lazy(() => import('./components/player/MobilePlayer').then(m => ({ default: m.MobilePlayer })));
const ResultsDashboard = lazy(() => import('./components/dashboard/ResultsDashboard').then(m => ({ default: m.ResultsDashboard })));
const TemplatesLibrary = lazy(() => import('./components/dashboard/TemplatesLibrary').then(m => ({ default: m.TemplatesLibrary })));
const ClassGroups      = lazy(() => import('./components/dashboard/ClassGroups').then(m => ({ default: m.ClassGroups })));
const SettingsPage     = lazy(() => import('./components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PricingPage         = lazy(() => import('./components/pricing/PricingPage').then(m => ({ default: m.PricingPage })));
const AdminPanel          = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const PublicLeaderboard   = lazy(() => import('./components/leaderboard/PublicLeaderboard').then(m => ({ default: m.PublicLeaderboard })));
const LiveSessionHost     = lazy(() => import('./components/session/LiveSessionHost').then(m => ({ default: m.LiveSessionHost })));
const JoinSession         = lazy(() => import('./components/session/JoinSession').then(m => ({ default: m.JoinSession })));
const PrivacyPolicy       = lazy(() => import('./components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService      = lazy(() => import('./components/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
const ExplorePage         = lazy(() => import('./components/explore/ExplorePage').then(m => ({ default: m.ExplorePage })));

// ─── Loader ───────────────────────────────────────────────────────────────────

function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Player route ─────────────────────────────────────────────────────────────

function PlayerRoute() {
  const { questId } = useParams<{ questId: string }>();
  if (!questId) return <Navigate to="/" replace />;
  return <MobilePlayer questId={questId} />;
}

// ─── Dashboard shell ───────────────────────────────────────────────────────────

type DashboardView = 'dashboard' | 'creator' | 'templates' | 'groups' | 'results' | 'settings';
const DASHBOARD_VIEWS: DashboardView[] = ['dashboard', 'creator', 'templates', 'groups', 'results', 'settings'];

function DashboardShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const segment = pathname.replace(/^\//, '').split('/')[0] as DashboardView;
  const view = DASHBOARD_VIEWS.includes(segment) ? segment : 'dashboard';

  return (
    <DashboardLayout currentView={view} onNavigate={(v) => navigate(`/${v}`)}>
      <Routes>
        <Route path="dashboard"       element={<BoundsDashboard onCreateNew={() => navigate('/creator')} />} />
        <Route path="creator"         element={<BoundCreator />} />
        <Route path="creator/:questId" element={<BoundCreator />} />
        <Route path="templates"       element={<TemplatesLibrary onUseTemplate={(tpl) => navigate('/creator', { state: { templateData: tpl } })} />} />
        <Route path="groups"          element={<ClassGroups />} />
        <Route path="results"         element={<ResultsDashboard />} />
        <Route path="settings"        element={<SettingsPage />} />
        <Route index                  element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

// ─── Root routes ──────────────────────────────────────────────────────────────

function AppRoutes() {

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

        {/* Mobile player — public, no auth */}
        <Route path="/play/:questId" element={<PlayerRoute />} />

        {/* Public leaderboard — no auth */}
        <Route path="/leaderboard/:questId" element={<PublicLeaderboard />} />

        {/* Join a live session — public, no auth */}
        <Route path="/join" element={<JoinSession />} />
        <Route path="/join/:code" element={<JoinSession />} />

        {/* Host a live session — Pro+, protected */}
        <Route path="/host/:questId" element={<ProtectedRoute><LiveSessionHost /></ProtectedRoute>} />

        {/* Protected dashboard */}
        <Route path="/*" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <AnalyticsConsentBanner />
      <InstallPrompt />
    </BrowserRouter>
  );
}
