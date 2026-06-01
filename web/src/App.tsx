import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { BlogIndexPage, BlogPostPage } from './pages/BlogPage';
import { CertificatePage } from './pages/CertificatePage';
import { CorrelationsPage } from './pages/CorrelationsPage';
import { DemoPage } from './pages/DemoPage';
import { DriftPage } from './pages/DriftPage';
import { LandingPage } from './pages/LandingPage';
import { MeasurementsPage } from './pages/MeasurementsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProofPage } from './pages/ProofPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RankingPage } from './pages/RankingPage';
import { SetupPage } from './pages/SetupPage';
import { StaticPage } from './pages/StaticPage';

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
