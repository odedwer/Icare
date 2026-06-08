import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient } from '../types/index.ts';
import PhotoSourceModal from '../components/PhotoSourceModal.tsx';
import PhotoCropModal from '../components/PhotoCropModal.tsx';

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
  const [canUploadPhoto, setCanUploadPhoto] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  useEffect(() => {
    if (!patient && patientId) {
      dataService.getPatientById(patientId).then(setPatient);
    }
  }, [patientId, patient, dataService]);

  useEffect(() => {
    if (user) {
      dataService.canEditWidget('photo_upload', user.role).then(setCanUploadPhoto);
    }
  }, [user, dataService]);

  const handleFileSelected = (file: File) => {
    setSourceModalOpen(false);
    setCropFile(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null);
    if (!patient) return;
    setUploading(true);
    setUploadError('');
    try {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const newUrl = await dataService.uploadPatientPhoto(patient.id, file);
      setPatient({ ...patient, photoUrl: `${newUrl}?t=${Date.now()}` });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'שגיאה בהעלאת התמונה');
    }
    setUploading(false);
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
            <img
              src={patient.photoUrl}
              alt={patient.fullName}
              className="confirm-photo"
              crossOrigin="anonymous"
            />
            {canUploadPhoto && (
              <button
                className="btn-photo-upload"
                onClick={() => setSourceModalOpen(true)}
                disabled={uploading}
                title="החלפת תמונה"
              >
                {uploading ? '…' : '📷'}
              </button>
            )}
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

      {sourceModalOpen && (
        <PhotoSourceModal
          onFileSelected={handleFileSelected}
          onCancel={() => setSourceModalOpen(false)}
        />
      )}

      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
