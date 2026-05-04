import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext.tsx';
import type { User, RoleDefinition } from '../../types/index.ts';

export default function UserManagement() {
  const dataService = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('caregiver');

  const roleLabel = (roleId: string) => {
    const found = roles.find((r) => r.id === roleId);
    return found ? found.label : roleId;
  };

  const loadUsers = async () => {
    setLoading(true);
    const [all, allRoles] = await Promise.all([
      dataService.getAllUsers(),
      dataService.getAllRoles(),
    ]);
    setUsers(all);
    setRoles(allRoles);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [dataService]);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('caregiver');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        const updates: Record<string, string> = { name, username, role };
        if (password) updates.password = password;
        await dataService.updateUser(editingId, updates);
        setSuccess('המשתמש עודכן בהצלחה');
      } else {
        if (!password) {
          setError('יש להזין סיסמה');
          return;
        }
        await dataService.createUser({ name, username, password, role });
        setSuccess('המשתמש נוצר בהצלחה');
      }
      resetForm();
      await loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    }
  };

  const startEdit = (user: User) => {
    setName(user.name);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setEditingId(user.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`למחוק את המשתמש "${user.name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await dataService.deleteUser(user.id);
      setSuccess('המשתמש נמחק בהצלחה');
      await loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    }
  };

  if (loading) return <div className="loading">טוען…</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2>ניהול משתמשים</h2>
        {!showForm && (
          <button className="btn-add" onClick={() => { resetForm(); setShowForm(true); }}>
            + הוספת משתמש
          </button>
        )}
      </div>

      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</h3>

          <label>שם מלא</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label>שם משתמש</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label>{editingId ? 'סיסמה חדשה (השאירו ריק לללא שינוי)' : 'סיסמה'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingId} />

          <label>תפקיד</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>

          <div className="admin-form-actions">
            <button type="submit" className="btn-save">{editingId ? 'עדכון' : 'יצירה'}</button>
            <button type="button" className="btn-cancel" onClick={resetForm}>ביטול</button>
          </div>
        </form>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>שם</th>
            <th>שם משתמש</th>
            <th>תפקיד</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.username}</td>
              <td>{roleLabel(u.role)}</td>
              <td className="admin-actions">
                <button className="btn-edit-small" onClick={() => startEdit(u)}>✏️</button>
                <button className="btn-delete" onClick={() => handleDelete(u)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
