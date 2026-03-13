import { createContext, useContext, type ReactNode } from 'react';
import type { DataService } from '../api/DataService';

const DataContext = createContext<DataService | null>(null);

export function DataProvider({ children, dataService }: { children: ReactNode; dataService: DataService }) {
  return <DataContext.Provider value={dataService}>{children}</DataContext.Provider>;
}

export function useData(): DataService {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
