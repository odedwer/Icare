import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient } from '../types';

export default function ConfirmPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dataService = useData();
  const { logout } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(
    (location.state as { patient?: Patient })?.patient ?? null,
  );

  useEffect(() => {
    if (!patient && patientId) {
      dataService.getPatientById(patientId).then(setPatient);
    }
  }, [patientId, patient, dataService]);

  if (!patient) return <div className="loading">טוען…</div>;

  return (
    <div className="confirm-page">
      <header className="app-header">
        <button className="btn-back" onClick={() => navigate('/')}>חזרה ←</button>
        <h1>🏥 ICare</h1>
        <button className="btn-small" onClick={logout}>התנתקות</button>
      </header>

      <div className="confirm-container">
        <div className="confirm-card">
          <img src={patient.photoUrl} alt={patient.fullName} className="confirm-photo" />
          <h2 className="confirm-name">{patient.fullName}</h2>
          <p className="confirm-id">ת.ז: {patient.idNumber}</p>
          <button
            className="btn-confirm"
            onClick={() => navigate(`/patient/${patient.id}`)}
          >
            ✓ אישור
          </button>
          <button className="btn-back-link" onClick={() => navigate('/')}>
            חזרה לחיפוש
          </button>
        </div>
      </div>
    </div>
  );
}
