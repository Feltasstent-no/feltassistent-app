import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ActiveSetupProvider } from './contexts/ActiveSetupContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { TrainingList } from './pages/TrainingList';
import { NewTraining } from './pages/NewTraining';
import { TrainingDetail } from './pages/TrainingDetail';
import { TrainingSessionCreate } from './pages/TrainingSessionCreate';
import { TrainingSessionActive } from './pages/TrainingSessionActive';
import { TrainingSessionSummary } from './pages/TrainingSessionSummary';
import { FieldClock } from './pages/FieldClock';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Competitions } from './pages/Competitions';
import { CompetitionStart } from './pages/CompetitionStart';
import { CompetitionRun } from './pages/CompetitionRun';
import { CompetitionSummary } from './pages/CompetitionSummary';
import { ClickTables } from './pages/ClickTables';
import { NewClickTable } from './pages/NewClickTable';
import { ClickTableDetail } from './pages/ClickTableDetail';
import { NewCompetition } from './pages/NewCompetition';
import { CompetitionStages } from './pages/CompetitionStages';
import { CompetitionDetail } from './pages/CompetitionDetail';
import CompetitionConfigure from './pages/CompetitionConfigure';
import { Rifles } from './pages/Rifles';
import { Weapons } from './pages/Weapons';
import { Ballistics } from './pages/Ballistics';
import { NewBallisticProfile } from './pages/NewBallisticProfile';
import { EditBallisticProfile } from './pages/EditBallisticProfile';
import { BallisticProfileDetail } from './pages/BallisticProfileDetail';
import { ShotAssistant } from './pages/ShotAssistant';
import { MatchHome } from './pages/MatchHome';
import { MatchSetup } from './pages/MatchSetup';
import { MatchConfigure } from './pages/MatchConfigure';
import { MatchActive } from './pages/MatchActive';
import { MatchSummary } from './pages/MatchSummary';
import { MatchPreview } from './pages/MatchPreview';
import { MatchHistory } from './pages/MatchHistory';
import { RangeMatchSetup } from './pages/RangeMatchSetup';
import { RangeMatchRun } from './pages/RangeMatchRun';
import { WindTest } from './pages/WindTest';
import { FocusPoints } from './pages/FocusPoints';
import { OfflineBanner } from './components/OfflineBanner';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <OfflineBanner />
        <SyncStatusIndicator />
        <OnboardingProvider>
          <ActiveSetupProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <TrainingList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training/new"
              element={
                <ProtectedRoute>
                  <NewTraining />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training/session/new"
              element={
                <ProtectedRoute>
                  <TrainingSessionCreate />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training/session/:id/summary"
              element={
                <ProtectedRoute>
                  <TrainingSessionSummary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training/session/:id"
              element={
                <ProtectedRoute>
                  <TrainingSessionActive />
                </ProtectedRoute>
              }
            />

            <Route
              path="/training/:id"
              element={
                <ProtectedRoute>
                  <TrainingDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/field-clock"
              element={
                <ProtectedRoute>
                  <FieldClock />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions"
              element={
                <ProtectedRoute>
                  <Competitions />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/new"
              element={
                <ProtectedRoute>
                  <NewCompetition />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/:competitionId"
              element={
                <ProtectedRoute>
                  <CompetitionDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/:competitionId/stages"
              element={
                <ProtectedRoute>
                  <CompetitionStages />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/:id/configure"
              element={
                <ProtectedRoute>
                  <CompetitionConfigure />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/:competitionId/start"
              element={
                <ProtectedRoute>
                  <CompetitionStart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/:competitionId/run/:entryId"
              element={
                <ProtectedRoute>
                  <CompetitionRun />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competitions/entry/:entryId/summary"
              element={
                <ProtectedRoute>
                  <CompetitionSummary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/click-tables"
              element={
                <ProtectedRoute>
                  <ClickTables />
                </ProtectedRoute>
              }
            />

            <Route
              path="/click-tables/new"
              element={
                <ProtectedRoute>
                  <NewClickTable />
                </ProtectedRoute>
              }
            />

            <Route
              path="/click-tables/:id"
              element={
                <ProtectedRoute>
                  <ClickTableDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/rifles"
              element={
                <ProtectedRoute>
                  <Rifles />
                </ProtectedRoute>
              }
            />

            <Route
              path="/weapons"
              element={
                <ProtectedRoute>
                  <Weapons />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ballistics"
              element={
                <ProtectedRoute>
                  <Ballistics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ballistics/new"
              element={
                <ProtectedRoute>
                  <NewBallisticProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ballistics/:id"
              element={
                <ProtectedRoute>
                  <BallisticProfileDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ballistics/:id/edit"
              element={
                <ProtectedRoute>
                  <EditBallisticProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/shot-assistant"
              element={
                <ProtectedRoute>
                  <ShotAssistant />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match"
              element={
                <ProtectedRoute>
                  <MatchHome />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/setup"
              element={
                <ProtectedRoute>
                  <MatchSetup />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/:id/configure"
              element={
                <ProtectedRoute>
                  <MatchConfigure />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/:id/preview"
              element={
                <ProtectedRoute>
                  <MatchPreview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/:id"
              element={
                <ProtectedRoute>
                  <MatchActive />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/:id/summary"
              element={
                <ProtectedRoute>
                  <MatchSummary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/range/:id/setup"
              element={
                <ProtectedRoute>
                  <RangeMatchSetup />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/range/:id/run"
              element={
                <ProtectedRoute>
                  <RangeMatchRun />
                </ProtectedRoute>
              }
            />

            <Route
              path="/match/history"
              element={
                <ProtectedRoute>
                  <MatchHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/focus-points"
              element={
                <ProtectedRoute>
                  <FocusPoints />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wind-test"
              element={
                <ProtectedRoute>
                  <WindTest />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/match" replace />} />
            </Routes>
          </ActiveSetupProvider>
        </OnboardingProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
