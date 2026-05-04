import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ROLE_LABELS } from '../types/index.ts';
import UserManagement from '../components/admin/UserManagement.tsx';
import PatientForm from '../components/admin/PatientForm.tsx';
import PermissionsManager from '../components/admin/PermissionsManager.tsx';
import RoleManagement from '../components/admin/RoleManagement.tsx';
import WidgetConfigManager from '../components/admin/WidgetConfigManager.tsx';

type Tab = 'users' | 'patients' | 'permissions' | 'roles' | 'widget-config';

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'ניהול משתמשים' },
  { id: 'patients', label: 'הוספת דייר' },
  { id: 'permissions', label: 'ניהול הרשאות' },
  { id: 'roles', label: 'ניהול תפקידים' },
  { id: 'widget-config', label: 'הגדרות ווידג\'טים' },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="admin-page">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>חזרה →</button>
          <h1>🏥 ICare — ניהול</h1>
        </div>
        <div className="header-user">
          <span>{user?.name} ({user ? ROLE_LABELS[user.role] || user.role : ''})</span>
          <button className="btn-small" onClick={logout}>התנתקות</button>
        </div>
      </header>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-panel">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'patients' && <PatientForm />}
        {activeTab === 'permissions' && <PermissionsManager />}
        {activeTab === 'roles' && <RoleManagement />}
        {activeTab === 'widget-config' && <WidgetConfigManager />}
      </div>
    </div>
  );
}
