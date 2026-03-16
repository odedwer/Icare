import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { PatientWidget, EventLogEntry } from '../types';
import { WIDGET_META, WidgetType, parseEventLog } from '../types';

interface Props {
  widget: PatientWidget;
  onSaved: (updated: PatientWidget) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  );
}

export default function EventLogCard({ widget, onSaved }: Props) {
  const { user } = useAuth();
  const dataService = useData();
  const meta = WIDGET_META[WidgetType.ExceptionalEvents];

  const entries = parseEventLog(widget.value);
  const hasEntries = entries.length > 0;

  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!user || !newText.trim() || saving) return;
    setSaving(true);
    setError('');
    const entry: EventLogEntry = {
      text: newText.trim(),
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
    };
    try {
      const newEntries = [...entries, entry];
      const updated = await dataService.updateWidget(
        widget.id,
        JSON.stringify(newEntries),
        user.id,
      );
      onSaved(updated);
      setNewText('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'השמירה נכשלה');
    }
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={`widget-card event-log-card tl-${hasEntries ? 'red' : 'green'}`}>
      <div className="widget-header">
        <div className="widget-header-meta">
          <span className="widget-icon">{meta.icon}</span>
          <span className="widget-label">{meta.label}</span>
        </div>
      </div>

      {hasEntries && (
        <div className="event-log-entries">
          {[...entries].reverse().map((entry, i) => (
            <div key={i} className="event-entry">
              <span className="event-meta">
                {formatDate(entry.timestamp)} · {entry.userName}
              </span>
              <span className="event-text">{entry.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="event-add-row">
        <input
          type="text"
          placeholder="תיאור האירוע…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
        />
        <button className="btn-add-event" onClick={handleAdd} disabled={saving || !newText.trim()}>
          {saving ? '…' : '+ הוסף'}
        </button>
      </div>
      {error && <p className="widget-error">{error}</p>}
    </div>
  );
}
