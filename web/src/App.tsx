import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/Primitives';

const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const BlogIndexPage = lazy(() => import('./pages/BlogPage').then((module) => ({ default: module.BlogIndexPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPage').then((module) => ({ default: module.BlogPostPage })));
const CertificatePage = lazy(() => import('./pages/CertificatePage').then((module) => ({ default: module.CertificatePage })));
const CorrelationsPage = lazy(() => import('./pages/CorrelationsPage').then((module) => ({ default: module.CorrelationsPage })));
const DemoPage = lazy(() => import('./pages/DemoPage').then((module) => ({ default: module.DemoPage })));
const DriftPage = lazy(() => import('./pages/DriftPage').then((module) => ({ default: module.DriftPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const MeasurementsPage = lazy(() => import('./pages/MeasurementsPage').then((module) => ({ default: module.MeasurementsPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ProofPage = lazy(() => import('./pages/ProofPage').then((module) => ({ default: module.ProofPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const RankingPage = lazy(() => import('./pages/RankingPage').then((module) => ({ default: module.RankingPage })));
const SetupPage = lazy(() => import('./pages/SetupPage').then((module) => ({ default: module.SetupPage })));
const StaticPage = lazy(() => import('./pages/StaticPage').then((module) => ({ default: module.StaticPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

export function App() {
  const [lambda, setLambda] = useState(5);
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:postSlug" element={<BlogPostPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/proof" element={<ProofPage />} />
          <Route path="/auth/sign-in" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/app/:workspaceId/:projectId" element={<AppShell lambda={lambda} onLambdaChange={setLambda} />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage lambda={lambda} />} />
            <Route path="ranking" element={<RankingPage lambda={lambda} />} />
            <Route path="co-failure" element={<CorrelationsPage lambda={lambda} />} />
            <Route path="measurements" element={<MeasurementsPage lambda={lambda} />} />
            <Route path="certificate" element={<CertificatePage lambda={lambda} />} />
            <Route path="drift" element={<DriftPage lambda={lambda} />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="/:pageSlug" element={<StaticPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return null;
}
