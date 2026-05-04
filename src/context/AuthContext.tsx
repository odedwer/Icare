import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, WidgetType, WidgetPermission } from '../types/index.ts';
import type { DataService } from '../api/DataService.ts';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  canEdit: (widgetType: WidgetType) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, dataService }: { children: ReactNode; dataService: DataService }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<WidgetPermission[]>([]);

  useEffect(() => {
    dataService.getCurrentSession().then(async (sessionUser) => {
      if (sessionUser) {
        setUser(sessionUser);
        const perms = await dataService.getWidgetPermissions();
        setPermissions(perms);
      }
      setLoading(false);
    });
  }, [dataService]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await dataService.login(username, password);
    if (result) {
      setUser(result);
      const perms = await dataService.getWidgetPermissions();
      setPermissions(perms);
      return true;
    }
    return false;
  }, [dataService]);

  const logout = useCallback(() => {
    setUser(null);
    setPermissions([]);
    dataService.logout();
  }, [dataService]);

  const canEdit = useCallback((widgetType: WidgetType) => {
    if (!user) return false;
    const perm = permissions.find((p) => p.widgetType === widgetType);
    return perm ? perm.rolesAllowedToEdit.includes(user.role) : false;
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
