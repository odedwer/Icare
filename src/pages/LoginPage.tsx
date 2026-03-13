import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (ok) {
      navigate('/');
    } else {
      setError('שם משתמש או סיסמה שגויים');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">🏥 ICare</h1>
        <p className="login-subtitle">פורטל מטפלים</p>

        <label htmlFor="username">שם משתמש</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label htmlFor="password">סיסמה</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'מתחבר…' : 'התחברות'}
        </button>

        <p className="login-hint">
          הדגמה: השתמשו ב-<strong>sarah</strong>, <strong>david</strong>, <strong>noa</strong>, או <strong>yossi</strong> עם סיסמה <strong>1234</strong>
        </p>
      </form>
    </div>
  );
}
