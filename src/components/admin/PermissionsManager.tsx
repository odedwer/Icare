import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext.tsx';
import type { WidgetPermission, RoleDefinition } from '../../types/index.ts';
import { WidgetType, WIDGET_META } from '../../types/index.ts';

const ALL_WIDGET_TYPES = Object.values(WidgetType);

export default function PermissionsManager() {
  const dataService = useData();
  const [permissions, setPermissions] = useState<WidgetPermission[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      dataService.getWidgetPermissions(),
      dataService.getAllRoles(),
    ]).then(([p, r]) => {
      setPermissions(p);
      setRoles(r);
      setLoading(false);
    });
  }, [dataService]);

  const isChecked = (widgetType: WidgetType, roleId: string): boolean => {
    const perm = permissions.find((p) => p.widgetType === widgetType);
    return perm ? perm.rolesAllowedToEdit.includes(roleId) : false;
  };

  const handleToggle = async (widgetType: WidgetType, roleId: string) => {
    setSaving(widgetType);
    setSuccess('');
    const perm = permissions.find((p) => p.widgetType === widgetType);
    if (!perm) return;

    let newRoles: string[];
    if (perm.rolesAllowedToEdit.includes(roleId)) {
      newRoles = perm.rolesAllowedToEdit.filter((r) => r !== roleId);
    } else {
      newRoles = [...perm.rolesAllowedToEdit, roleId];
    }

    const updated = await dataService.updateWidgetPermissions(widgetType, newRoles);
    setPermissions((prev) =>
      prev.map((p) => (p.widgetType === widgetType ? updated : p)),
    );
    setSaving(null);
    setSuccess('ההרשאות עודכנו');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) return <div className="loading">טוען…</div>;

  return (
    <div>
      <h2>ניהול הרשאות עריכה</h2>
      <p className="admin-subtitle">סמנו אילו תפקידים רשאים לערוך כל סוג מידע</p>

      {success && <p className="success-message">{success}</p>}

      <div className="permissions-table-wrapper">
        <table className="admin-table permissions-table">
          <thead>
            <tr>
              <th>סוג מידע</th>
              {roles.map((r) => (
                <th key={r.id}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_WIDGET_TYPES.map((wt) => (
              <tr key={wt}>
                <td>
                  <span className="widget-icon-small">{WIDGET_META[wt].icon}</span>
                  {WIDGET_META[wt].label}
                </td>
                {roles.map((r) => (
                  <td key={r.id} className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={isChecked(wt, r.id)}
                      onChange={() => handleToggle(wt, r.id)}
                      disabled={saving === wt}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
