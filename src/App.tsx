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
import RegulamentoPage from './pages/RegulamentoPage';
import LinkPage from './pages/LinkPage';
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
import AdminRaceDayAllHeats from './pages/admin/AdminRaceDayAllHeats';
import AdminResultsEventsPage from './pages/admin/AdminResultsEventsPage';
import AdminResultsManagerPage from './pages/admin/AdminResultsManagerPage';
import AdminStore from './pages/admin/AdminStore';
import AdminPhotos from './pages/admin/AdminPhotos';
import AdminSquad from './pages/admin/AdminSquad';
import AdminLocations from './pages/admin/AdminLocations';
import AdminMarketingPage from './pages/admin/AdminMarketingPage';
import PublicEventRegistration from './pages/PublicEventRegistration';
import ComboJunhoPage from './pages/ComboJunhoPage';
import PaymentPortal from './pages/PaymentPortal';
import RaffleLivePage from './pages/RaffleLivePage';
import SquadPortalPage from './pages/SquadPortalPage';
import SquadRankingPage from './pages/SquadRankingPage';
import PartnerViewPage from './pages/PartnerViewPage';
import PublicEventSchedule from './pages/PublicEventSchedule';
import EventLivePhases from './pages/EventLivePhases';
import ChallengePortalPage from './pages/ChallengePortalPage';
import ComprovanteUploadPage from './pages/ComprovanteUploadPage';

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
            <Route path="/regulamento" element={<RegulamentoPage />} />
          </Route>

          {/* Link da Bio do Instagram */}
          <Route path="/link" element={<LinkPage />} />

          {/* Combo Junho */}
          <Route path="/combo-junho" element={<ComboJunhoPage />} />

          {/* Inscrição Pública em Eventos */}
          <Route path="/evento/:id" element={<PublicEventRegistration />} />
          <Route path="/evento/:id/cronograma" element={<PublicEventSchedule />} />
          <Route path="/evento/:id/ao-vivo" element={<EventLivePhases />} />

          {/* Sorteio Público ao Vivo */}
          <Route path="/sorteio/:slug" element={<RaffleLivePage />} />

          {/* Portal pessoal Squad/Parceiro */}
          <Route path="/squad/:token" element={<SquadPortalPage />} />

          {/* Ranking público de indicadores */}
          <Route path="/ranking-squad" element={<SquadRankingPage />} />

          {/* Portal de Pagamento (Parcelas PIX) */}
          <Route path="/pagamento/:registrationId" element={<PaymentPortal />} />
          <Route path="/comprovante/:registrationId" element={<ComprovanteUploadPage />} />

          {/* Painel do Parceiro — Visualização read-only via token */}
          <Route path="/parceiro/:token" element={<PartnerViewPage />} />

          {/* Portal do atleta — Desafio (GymRats-like) */}
          <Route path="/desafio/:slug/:registrationId" element={<ChallengePortalPage />} />

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
            <Route path="raceday/:id/todas" element={<AdminRaceDayAllHeats />} />
            <Route path="results" element={<AdminResultsEventsPage />} />
            <Route path="results/:id" element={<AdminResultsManagerPage />} />
            <Route path="store" element={<AdminStore />} />
            <Route path="photos" element={<AdminPhotos />} />
            <Route path="squad" element={<AdminSquad />} />
            <Route path="locations" element={<AdminLocations />} />
            <Route path="marketing" element={<AdminMarketingPage />} />
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
