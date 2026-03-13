import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { PatientWidget, WidgetConfig } from '../types';
import { WIDGET_META } from '../types';

interface Props {
  widget: PatientWidget;
  onSaved: (updated: PatientWidget) => void;
}

export default function WidgetCard({ widget, onSaved }: Props) {
  const { user, canEdit } = useAuth();
  const dataService = useData();
  const meta = WIDGET_META[widget.widgetType];
  const editable = canEdit(widget.widgetType);

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(widget.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dataService.getWidgetConfigs().then((configs) => {
      const cfg = configs.find((c) => c.widgetType === widget.widgetType);
      if (cfg) setConfig(cfg);
    });
  }, [dataService, widget.widgetType]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const updated = await dataService.updateWidget(widget.id, draft, user.id);
      onSaved(updated);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'השמירה נכשלה');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setDraft(widget.value);
    setEditing(false);
    setError('');
  };

  return (
    <div className={`widget-card ${editing ? 'widget-editing' : ''}`}>
      <div className="widget-header">
        <span className="widget-icon">{meta.icon}</span>
        <span className="widget-label">{meta.label}</span>
      </div>

      {editing ? (
        <div className="widget-body">
          {config?.inputType === 'select' && config.options.length > 0 ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="widget-select"
              autoFocus
            >
              <option value="">— בחרו ערך —</option>
              {config.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
            />
          )}
          {error && <p className="widget-error">{error}</p>}
          <div className="widget-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'שומר…' : 'שמירה'}
            </button>
            <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <div className="widget-body">
          <p className="widget-value">{widget.value}</p>
          {editable && (
            <button className="btn-edit" onClick={() => setEditing(true)}>
              ✏️ עריכה
            </button>
          )}
        </div>
      )}
    </div>
  );
}
