import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

// Layouts Principais (As 4 Áreas da Aplicação)
import Layout from './components/layout/Layout'; // Visitantes
import AthleteLayout from './components/layout/AthleteLayout';
import AdminLayout from './components/layout/AdminLayout';
import JudgeLayout from './components/layout/JudgeLayout';

// Páginas Públicas (Visitantes)
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import SquadPage from './pages/SquadPage';
import ExperiencePage from './pages/ExperiencePage';
import GalleryPage from './pages/GalleryPage';
import LocationsPage from './pages/LocationsPage';
import StorePage from './pages/StorePage';
import NotFoundPage from './pages/NotFoundPage';

// Páginas Auth
import LoginPage from './pages/auth/LoginPage';

// Páginas Atletas
import AthleteDashboard from './pages/athlete/AthleteDashboard';

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

// Páginas Juiz
import JudgeDashboard from './pages/judge/JudgeDashboard';

// Auth
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
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
      <AuthProvider>
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

          {/* Área de Autenticação */}
          <Route path="/login" element={<LoginPage />} />

          {/* Inscrição Pública em Eventos */}
          <Route path="/evento/:id" element={<PublicEventRegistration />} />

          {/* 2. Área do Atleta Cadastrado */}
          <Route path="/athlete" element={
            <ProtectedRoute allowedRoles={['athlete']}>
              <AthleteLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AthleteDashboard />} />
            {/* <Route path="events/:id" element={<AthleteEventDetails />} /> */}
          </Route>

          {/* 3. Área do Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
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

          {/* 4. Área do Juiz */}
          <Route path="/judge" element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgeLayout />
            </ProtectedRoute>
          }>
            <Route index element={<JudgeDashboard />} />
          </Route>

          {/* 404 Formato Geral */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
