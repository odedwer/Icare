import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient } from '../types/index.ts';
import { Role } from '../types/index.ts';

const PHOTO_UPLOAD_ROLES = new Set<string>([Role.Admin, Role.HeadNurse]);

function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function ConfirmPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dataService = useData();
  const { user, logout } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(
    (location.state as { patient?: Patient })?.patient ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!patient && patientId) {
      dataService.getPatientById(patientId).then(setPatient);
    }
  }, [patientId, patient, dataService]);

  const canUploadPhoto = user && PHOTO_UPLOAD_ROLES.has(user.role);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient) return;
    setUploading(true);
    setUploadError('');
    try {
      const newUrl = await dataService.uploadPatientPhoto(patient.id, file);
      setPatient({ ...patient, photoUrl: newUrl });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'שגיאה בהעלאת התמונה');
    }
    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!patient) return <div className="loading">טוען…</div>;

  const genderLabel = patient.gender === 'male' ? 'זכר' : 'נקבה';
  const age = calcAge(patient.dateOfBirth);

  return (
    <div className="confirm-page">
      <header className="app-header">
        <button className="btn-back" onClick={() => navigate('/')}>חזרה ←</button>
        <h1>🏥 ICare</h1>
        <button className="btn-small" onClick={logout}>התנתקות</button>
      </header>

      <div className="confirm-container">
        <div className="confirm-card">
          <div className="confirm-photo-wrapper">
            <img src={patient.photoUrl} alt={patient.fullName} className="confirm-photo" />
            {canUploadPhoto && (
              <button
                className="btn-photo-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="החלפת תמונה"
              >
                {uploading ? '…' : '📷'}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>
          {uploadError && <p className="upload-error">{uploadError}</p>}
          <h2 className="confirm-name">{patient.fullName}</h2>
          <p className="confirm-id">ת.ז: {patient.idNumber}</p>
          <p className="confirm-meta">{genderLabel} · גיל {age} · קבוצה: {patient.group}</p>
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
