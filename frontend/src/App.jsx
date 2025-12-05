import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ChatPage } from './pages/ChatPage';
import { DocumentsListPage } from './pages/DocumentsListPage';
import { DatabaseChatPage } from './pages/DatabaseChatPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ROUTES } from './utils/constants';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
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
                path={ROUTES.DATABASE_CHAT}
                element={
                  <ProtectedRoute>
                    <DatabaseChatPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
