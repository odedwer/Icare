import { useState } from 'react';
import { useData } from '../../context/DataContext.tsx';

export default function PatientForm() {
  const dataService = useData();
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [group, setGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFullName('');
    setIdNumber('');
    setGroup('');
    setDateOfBirth('');
    setGender('male');
    setPhotoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await dataService.createPatient({
        fullName,
        idNumber,
        group,
        dateOfBirth,
        gender,
        photoUrl: photoUrl || `https://i.pravatar.cc/150?u=${idNumber}`,
      });
      setSuccess(`הדייר "${fullName}" נוסף בהצלחה`);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת דייר');
    }

    setSubmitting(false);
  };

  return (
    <div>
      <h2>הוספת דייר חדש</h2>

      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>שם מלא</label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

        <label>תעודת זהות</label>
        <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />

        <label>קבוצה</label>
        <input type="text" value={group} onChange={(e) => setGroup(e.target.value)} required />

        <label>תאריך לידה</label>
        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />

        <label>מין</label>
        <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
          <option value="male">זכר</option>
          <option value="female">נקבה</option>
        </select>

        <label>קישור לתמונה (אופציונלי)</label>
        <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />

        <div className="admin-form-actions">
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'שומר…' : 'הוספת דייר'}
          </button>
          <button type="button" className="btn-cancel" onClick={resetForm}>
            ניקוי
          </button>
        </div>
      </form>
    </div>
  );
}
