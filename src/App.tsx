import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AmplifyDataService } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import PatientPage from './pages/PatientPage';
import AdminPage from './pages/AdminPage';

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
