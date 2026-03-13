import { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import type { WidgetConfig, WidgetInputType } from '../../types';
import { WidgetType, WIDGET_META } from '../../types';

const ALL_WIDGET_TYPES = Object.values(WidgetType);

export default function WidgetConfigManager() {
  const dataService = useData();
  const [configs, setConfigs] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWidget, setEditingWidget] = useState<WidgetType | null>(null);
  const [editInputType, setEditInputType] = useState<WidgetInputType>('freetext');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    dataService.getWidgetConfigs().then((c) => {
      setConfigs(c);
      setLoading(false);
    });
  }, [dataService]);

  const getConfig = (wt: WidgetType): WidgetConfig | undefined =>
    configs.find((c) => c.widgetType === wt);

  const startEdit = (wt: WidgetType) => {
    const cfg = getConfig(wt);
    setEditingWidget(wt);
    setEditInputType(cfg?.inputType ?? 'freetext');
    setEditOptions(cfg?.options ? [...cfg.options] : []);
    setNewOption('');
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingWidget(null);
    setNewOption('');
    setError('');
  };

  const addOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (editOptions.includes(val)) {
      setError('אפשרות זו כבר קיימת');
      return;
    }
    setEditOptions([...editOptions, val]);
    setNewOption('');
    setError('');
  };

  const removeOption = (idx: number) => {
    setEditOptions(editOptions.filter((_, i) => i !== idx));
  };

  const moveOption = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editOptions.length) return;
    const arr = [...editOptions];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEditOptions(arr);
  };

  const handleSave = async () => {
    if (!editingWidget) return;
    setError('');
    setSuccess('');

    if (editInputType === 'select' && editOptions.length === 0) {
      setError('יש להוסיף לפחות אפשרות אחת');
      return;
    }

    try {
      const updated = await dataService.updateWidgetConfig(
        editingWidget,
        editInputType,
        editInputType === 'select' ? editOptions : [],
      );
      setConfigs((prev) =>
        prev.map((c) => (c.widgetType === editingWidget ? updated : c)),
      );
      setEditingWidget(null);
      setSuccess('הגדרות הווידג\'ט עודכנו בהצלחה');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בעדכון');
    }
  };

  if (loading) return <div className="loading">טוען…</div>;

  return (
    <div>
      <h2>הגדרות ווידג'טים</h2>
      <p className="admin-subtitle">הגדירו לכל ווידג'ט האם הערך הוא טקסט חופשי או בחירה מתוך רשימה</p>

      {success && <p className="success-message">{success}</p>}

      {editingWidget && (
        <div className="admin-form widget-config-form">
          <h3>
            {WIDGET_META[editingWidget].icon} עריכת הגדרות — {WIDGET_META[editingWidget].label}
          </h3>

          <label>סוג קלט</label>
          <select
            value={editInputType}
            onChange={(e) => setEditInputType(e.target.value as WidgetInputType)}
          >
            <option value="freetext">טקסט חופשי</option>
            <option value="select">בחירה מרשימה</option>
          </select>

          {editInputType === 'select' && (
            <div className="options-editor">
              <label>אפשרויות</label>
              <ul className="options-list">
                {editOptions.map((opt, idx) => (
                  <li key={idx} className="option-item">
                    <span className="option-text">{opt}</span>
                    <div className="option-actions">
                      <button type="button" className="btn-icon" onClick={() => moveOption(idx, -1)} disabled={idx === 0}>▲</button>
                      <button type="button" className="btn-icon" onClick={() => moveOption(idx, 1)} disabled={idx === editOptions.length - 1}>▼</button>
                      <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeOption(idx)}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="option-add-row">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="הקלידו אפשרות חדשה…"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                />
                <button type="button" className="btn-add-small" onClick={addOption}>הוספה</button>
              </div>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <div className="admin-form-actions">
            <button className="btn-save" onClick={handleSave}>שמירה</button>
            <button className="btn-cancel" onClick={cancelEdit}>ביטול</button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ווידג'ט</th>
            <th>סוג קלט</th>
            <th>אפשרויות</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {ALL_WIDGET_TYPES.map((wt) => {
            const cfg = getConfig(wt);
            return (
              <tr key={wt}>
                <td>
                  <span className="widget-icon-small">{WIDGET_META[wt].icon}</span>
                  {WIDGET_META[wt].label}
                </td>
                <td>{cfg?.inputType === 'select' ? 'בחירה מרשימה' : 'טקסט חופשי'}</td>
                <td>
                  {cfg?.inputType === 'select' && cfg.options.length > 0
                    ? cfg.options.join(', ')
                    : '—'}
                </td>
                <td>
                  <button className="btn-edit-small" onClick={() => startEdit(wt)}>✏️</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
