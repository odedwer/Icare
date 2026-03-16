import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient, PatientWidget } from '../types';
import { Role, WIDGET_META, ROLE_LABELS, WidgetType } from '../types';
import WidgetCard from '../components/WidgetCard';
import EventLogCard from '../components/EventLogCard';

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

  // Sort widgets by the WidgetType enum order
  const orderedTypes = Object.keys(WIDGET_META);
  const sortedWidgets = [...widgets].sort(
    (a, b) => orderedTypes.indexOf(a.widgetType) - orderedTypes.indexOf(b.widgetType),
  );

  return (
    <div className="patient-page">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate(`/patient/${patient.id}/confirm`)}>חזרה ←</button>
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

      <div className="patient-title-bar">
        <strong>{patient.fullName}</strong>
        <span className="patient-title-sep">·</span>
        <span>ת.ז: {patient.idNumber}</span>
        <span className="patient-title-sep">·</span>
        <span>קבוצה: {patient.group}</span>
      </div>

      <div className="widget-grid">
        {sortedWidgets.map((w) =>
          w.widgetType === WidgetType.ExceptionalEvents ? (
            <EventLogCard key={w.id} widget={w} onSaved={handleWidgetSaved} />
          ) : (
            <WidgetCard key={w.id} widget={w} onSaved={handleWidgetSaved} />
          ),
        )}
      </div>
    </div>
  );
}
