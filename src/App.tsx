import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { AmplifyDataService } from './api/index.ts';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AdminRoute from './components/AdminRoute.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import ConfirmPage from './pages/ConfirmPage.tsx';
import PatientPage from './pages/PatientPage.tsx';
import AdminPage from './pages/AdminPage.tsx';

const dataService = new AmplifyDataService();

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider dataService={dataService}>
        <AuthProvider dataService={dataService}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/:patientId/confirm"
              element={
                <ProtectedRoute>
                  <ConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/:patientId"
              element={
                <ProtectedRoute>
                  <PatientPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}
