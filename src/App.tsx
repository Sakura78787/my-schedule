import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GuestExperienceProvider, useGuestExperience } from './contexts/GuestExperienceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './pages/AuthPage';
import SchedulePage from './pages/SchedulePage';
import TodosPage from './pages/TodosPage';
import CalendarPage from './pages/CalendarPage';
import CoursePage from './pages/CoursePage';

function ClearGuestWhenLoggedIn() {
  const { user } = useAuth();
  const { clearGuestBecauseUserLoggedIn } = useGuestExperience();
  useEffect(() => {
    if (user) clearGuestBecauseUserLoggedIn();
  }, [user, clearGuestBecauseUserLoggedIn]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isGuest } = useGuestExperience();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, isRecoveryMode } = useAuth();
  const { isGuest } = useGuestExperience();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user && !isRecoveryMode ? <Navigate to="/schedule" replace /> : <AuthPage />}
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <TodosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course"
        element={
          <ProtectedRoute>
            <CoursePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user || isGuest ? "/schedule" : "/auth"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GuestExperienceProvider>
            <ClearGuestWhenLoggedIn />
            <AppRoutes />
          </GuestExperienceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;