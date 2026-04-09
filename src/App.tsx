import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ActiveSetupProvider } from './contexts/ActiveSetupContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { TrainingList } from './pages/TrainingList';
import { NewTraining } from './pages/NewTraining';
import { TrainingDetail } from './pages/TrainingDetail';
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
import { WindTest } from './pages/WindTest';

function App() {
  return (
    <AuthProvider>
      <ActiveSetupProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
            path="/match/history"
            element={
              <ProtectedRoute>
                <MatchHistory />
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
        </BrowserRouter>
      </ActiveSetupProvider>
    </AuthProvider>
  );
}

export default App;
