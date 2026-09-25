import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  phone: string;
  name: string;
  vehicleType?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load auth state from storage on startup
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@ematix_partner_token');
        const storedUser = await AsyncStorage.getItem('@ematix_partner_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      }
    };
    loadAuth();
  }, []);

  const login = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem('@ematix_partner_token', authToken);
    await AsyncStorage.setItem('@ematix_partner_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('@ematix_partner_token');
    await AsyncStorage.removeItem('@ematix_partner_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
