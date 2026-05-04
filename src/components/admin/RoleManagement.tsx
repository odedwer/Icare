import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext.tsx';
import type { RoleDefinition } from '../../types/index.ts';

export default function RoleManagement() {
  const dataService = useData();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [roleLabel, setRoleLabel] = useState('');

  const loadRoles = async () => {
    setLoading(true);
    const all = await dataService.getAllRoles();
    setRoles(all);
    setLoading(false);
  };

  useEffect(() => { loadRoles(); }, [dataService]);

  const resetForm = () => {
    setRoleId('');
    setRoleLabel('');
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const id = roleId.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id) {
      setError('יש להזין מזהה תפקיד');
      return;
    }

    try {
      await dataService.createRole(id, roleLabel.trim());
      setSuccess(`התפקיד "${roleLabel}" נוצר בהצלחה`);
      resetForm();
      await loadRoles();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת תפקיד');
    }
  };

  const handleDelete = async (role: RoleDefinition) => {
    if (!confirm(`למחוק את התפקיד "${role.label}"? משתמשים עם תפקיד זה יועברו ל"צופה".`)) return;
    setError('');
    setSuccess('');

    try {
      await dataService.deleteRole(role.id);
      setSuccess(`התפקיד "${role.label}" נמחק בהצלחה`);
      await loadRoles();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקת תפקיד');
    }
  };

  if (loading) return <div className="loading">טוען…</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2>ניהול תפקידים</h2>
        {!showForm && (
          <button className="btn-add" onClick={() => { resetForm(); setShowForm(true); }}>
            + הוספת תפקיד
          </button>
        )}
      </div>

      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h3>הוספת תפקיד חדש</h3>

          <label>מזהה תפקיד (באנגלית, ללא רווחים)</label>
          <input
            type="text"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="לדוגמה: nurse"
            required
            dir="ltr"
          />

          <label>שם תפקיד (בעברית)</label>
          <input
            type="text"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            placeholder="לדוגמה: אחות"
            required
          />

          <div className="admin-form-actions">
            <button type="submit" className="btn-save">יצירה</button>
            <button type="button" className="btn-cancel" onClick={resetForm}>ביטול</button>
          </div>
        </form>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>מזהה</th>
            <th>שם תפקיד</th>
            <th>סוג</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id}>
              <td dir="ltr" style={{ textAlign: 'right' }}>{r.id}</td>
              <td>{r.label}</td>
              <td>{r.isBuiltIn ? 'מובנה' : 'מותאם אישית'}</td>
              <td className="admin-actions">
                {r.isBuiltIn ? (
                  <span className="text-muted">—</span>
                ) : (
                  <button className="btn-delete" onClick={() => handleDelete(r)}>🗑️</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
