import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient, PatientWidget } from '../types';
import { Role, WIDGET_META, ROLE_LABELS } from '../types';
import WidgetCard from '../components/WidgetCard';

export default function PatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const dataService = useData();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [widgets, setWidgets] = useState<PatientWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      dataService.getPatientById(patientId),
      dataService.getWidgetsForPatient(patientId),
    ]).then(([p, w]) => {
      setPatient(p);
      setWidgets(w);
      setLoading(false);
    });
  }, [patientId, dataService]);

  const handleWidgetSaved = (updated: PatientWidget) => {
    setWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  };

  if (loading) return <div className="loading">טוען…</div>;
  if (!patient) return <div className="loading">דייר לא נמצא</div>;

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  // Sort widgets by the WidgetType enum order
  const orderedTypes = Object.values(WIDGET_META);
  const sortedWidgets = [...widgets].sort(
    (a, b) =>
      orderedTypes.findIndex((_, i) => Object.keys(WIDGET_META)[i] === a.widgetType) -
      orderedTypes.findIndex((_, i) => Object.keys(WIDGET_META)[i] === b.widgetType),
  );

  return (
    <div className="patient-page">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>חזרה →</button>
          <h1>🏥 ICare</h1>
        </div>
        <div className="header-user">
          {user?.role === Role.Admin && (
            <button className="btn-admin" onClick={() => navigate('/admin')}>⚙️ ניהול</button>
          )}
          <span>{user?.name} ({user ? ROLE_LABELS[user.role] || user.role : ''})</span>
          <button className="btn-small" onClick={logout}>התנתקות</button>
        </div>
      </header>

      <div className="patient-header">
        <img src={patient.photoUrl} alt={patient.fullName} className="patient-photo" />
        <div className="patient-info">
          <h2>{patient.fullName}</h2>
          <p>ת.ז: {patient.idNumber} · קבוצה: {patient.group} · {patient.gender === 'male' ? 'זכר' : 'נקבה'} · גיל {age}</p>
        </div>
      </div>

      <div className="widget-grid">
        {sortedWidgets.map((w) => (
          <WidgetCard key={w.id} widget={w} onSaved={handleWidgetSaved} />
        ))}
      </div>
    </div>
  );
}
