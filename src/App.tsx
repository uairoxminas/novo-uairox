import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

// Layouts Principais
import Layout from './components/layout/Layout'; // Visitantes
import AdminLayout from './components/layout/AdminLayout';
import JudgeLayout from './components/layout/JudgeLayout';

// Auth Gate — Autenticação por senha nos painéis
import PanelGate from './components/auth/PanelGate';

// Páginas Públicas (Visitantes)
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import SquadPage from './pages/SquadPage';
import ExperiencePage from './pages/ExperiencePage';
import GalleryPage from './pages/GalleryPage';
import LocationsPage from './pages/LocationsPage';
import StorePage from './pages/StorePage';
import NotFoundPage from './pages/NotFoundPage';

// Páginas Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLandingConfig from './pages/admin/AdminLandingConfig';
import AdminExperienceConfig from './pages/admin/AdminExperienceConfig';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventConfig from './pages/admin/AdminEventConfig';
import AdminRaceDayPage from './pages/admin/AdminRaceDayPage';
import AdminRaceDayControlPage from './pages/admin/AdminRaceDayControlPage';
import AdminRaceDayLiveMonitor from './pages/admin/AdminRaceDayLiveMonitor';
import AdminResultsEventsPage from './pages/admin/AdminResultsEventsPage';
import AdminResultsManagerPage from './pages/admin/AdminResultsManagerPage';
import AdminStore from './pages/admin/AdminStore';
import AdminPhotos from './pages/admin/AdminPhotos';
import AdminSquad from './pages/admin/AdminSquad';
import AdminLocations from './pages/admin/AdminLocations';
import PublicEventRegistration from './pages/PublicEventRegistration';
import PaymentPortal from './pages/PaymentPortal';

// Páginas Juiz
import JudgePassagesPanel from './pages/judge/JudgePassagesPanel';
import HeadJudgePenaltyPanel from './pages/judge/HeadJudgePenaltyPanel';
import FinalJudgePanel from './pages/judge/FinalJudgePanel';

// Utils
import ScrollToHash from './components/utils/ScrollToHash';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToHash />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--uairox-space-card)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e4e4e7',
            },
          }}
        />
        <Routes>
          {/* 1. Visitantes (Área Pública) */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/squad" element={<SquadPage />} />
            <Route path="/experience" element={<ExperiencePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/store" element={<StorePage />} />
          </Route>

          {/* Inscrição Pública em Eventos */}
          <Route path="/evento/:id" element={<PublicEventRegistration />} />

          {/* Portal de Pagamento (Parcelas PIX) */}
          <Route path="/pagamento/:registrationId" element={<PaymentPortal />} />

          {/* 2. Área do Admin — Acesso total com senha */}
          <Route path="/admin" element={
            <PanelGate panel="admin" title="Admin" subtitle="Acesso restrito ao organizador" accentColor="#EDAC02">
              <AdminLayout />
            </PanelGate>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="landing" element={<AdminLandingConfig />} />
            <Route path="experience" element={<AdminExperienceConfig />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="events/:id" element={<AdminEventConfig />} />
            <Route path="raceday" element={<AdminRaceDayPage />} />
            <Route path="raceday/:id" element={<AdminRaceDayControlPage />} />
            <Route path="raceday/:id/heat/:heatId" element={<AdminRaceDayLiveMonitor />} />
            <Route path="results" element={<AdminResultsEventsPage />} />
            <Route path="results/:id" element={<AdminResultsManagerPage />} />
            <Route path="store" element={<AdminStore />} />
            <Route path="photos" element={<AdminPhotos />} />
            <Route path="squad" element={<AdminSquad />} />
            <Route path="locations" element={<AdminLocations />} />
          </Route>

          {/* 3. Judge — Marcação de Passagens */}
          <Route path="/judge" element={
            <PanelGate panel="judge" title="Judge" subtitle="Painel de marcação de passagens" accentColor="#22c55e">
              <JudgeLayout />
            </PanelGate>
          }>
            <Route index element={<JudgePassagesPanel />} />
          </Route>

          {/* 4. Head Judge — Penalidades */}
          <Route path="/headjudge" element={
            <PanelGate panel="headjudge" title="Head Judge" subtitle="Painel de penalidades" accentColor="#ef4444">
              <JudgeLayout />
            </PanelGate>
          }>
            <Route index element={<HeadJudgePenaltyPanel />} />
          </Route>

          {/* 5. Final Judge — Validação de chegada */}
          <Route path="/finaljudge" element={
            <PanelGate panel="finaljudge" title="Final Judge" subtitle="Validação de tempo final" accentColor="#3b82f6">
              <JudgeLayout />
            </PanelGate>
          }>
            <Route index element={<FinalJudgePanel />} />
          </Route>

          {/* 404 Formato Geral */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
