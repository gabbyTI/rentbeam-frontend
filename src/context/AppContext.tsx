import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, UserRole } from '../types';
import { initialMockData } from '../mock/data';
import { initializeApi } from '../services/api';

const STORAGE_KEY = 'renttrack-app-state';

interface AppContextType extends AppState {
  updateState: (updates: Partial<AppState>) => void;
  login: (role: UserRole, id: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialMockData;
      }
    }
    return initialMockData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Initialize API service with updateState function
  useEffect(() => {
    initializeApi(updateState);
  }, []);

  const login = (role: UserRole, id: string) => {
    setState((prev) => ({
      ...prev,
      currentUser: { role, id },
    }));
  };

  const logout = () => {
    setState((prev) => ({
      ...prev,
      currentUser: null,
    }));
  };

  return (
    <AppContext.Provider value={{ ...state, updateState, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
