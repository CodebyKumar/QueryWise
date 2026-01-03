import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DatabaseChatPage } from './pages/DatabaseChatPage';
import { DatabaseVisualizationPage } from './pages/DatabaseVisualizationPage';
import { AccountPage } from './pages/AccountPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ROUTES } from './utils/constants';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <DatabaseProvider>
              <Routes>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.LOGIN} element={<AuthPage />} />
              <Route path={ROUTES.SIGNUP} element={<AuthPage />} />
              <Route
                path={ROUTES.CHAT}
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.DOCUMENTS_LIST}
                element={
                  <ProtectedRoute>
                    <DocumentsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.DOCUMENTS}
                element={
                  <ProtectedRoute>
                    <DocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.DATABASE_CHAT}
                element={
                  <ProtectedRoute>
                    <DatabaseChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/database-visualization"
                element={
                  <ProtectedRoute>
                    <DatabaseVisualizationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.ACCOUNT}
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </DatabaseProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
