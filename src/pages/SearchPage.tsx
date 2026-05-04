import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient } from '../types/index.ts';
import { Role, ROLE_LABELS } from '../types/index.ts';

export default function SearchPage() {
  const { user, logout } = useAuth();
  const dataService = useData();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await dataService.searchPatients(query);
      setResults(r);
      setShowResults(true);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, dataService]);

  const selectPatient = (p: Patient) => {
    setShowResults(false);
    setQuery('');
    navigate(`/patient/${p.id}/confirm`, { state: { patient: p } });
  };

  return (
    <div className="search-page">
      <header className="app-header">
        <h1>🏥 ICare</h1>
        <div className="header-user">
          {user?.role === Role.Admin && (
            <button className="btn-admin" onClick={() => navigate('/admin')}>⚙️ ניהול</button>
          )}
          <span>{user?.name} ({user ? ROLE_LABELS[user.role] || user.role : ''})</span>
          <button className="btn-small" onClick={logout}>התנתקות</button>
        </div>
      </header>

      <main className="search-main">
        <h2>חיפוש דייר</h2>
        <p>חיפוש לפי שם או מספר תעודת זהות</p>

        <div className="search-box">
          <input
            type="text"
            placeholder="הקלידו שם או מספר ת.ז…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {showResults && (
          <div className="search-results">
            {results.length === 0 ? (
              <p className="no-results">לא נמצאו דיירים</p>
            ) : (
              <ul>
                {results.map((p) => (
                  <li key={p.id}>
                    <button className="result-item" onClick={() => selectPatient(p)}>
                      <img src={p.photoUrl} alt="" className="result-avatar" />
                      <div>
                        <strong>{p.fullName}</strong>
                        <span className="result-meta">ת.ז: {p.idNumber} · קבוצה: {p.group}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
