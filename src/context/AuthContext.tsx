import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  createdAt?: string;
  dob?: string;
  city?: string;
  serviceArea?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  kycStatus?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isOnline: boolean;
  setIsOnline: (online: boolean) => Promise<void>;
  login: (userData: User, authToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isOnline, setIsOnlineState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, storedOnline] = await Promise.all([
          AsyncStorage.getItem('@ematix_partner_token'),
          AsyncStorage.getItem('@ematix_partner_user'),
          AsyncStorage.getItem('@ematix_partner_is_online'),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
        if (storedOnline === 'true') {
          setIsOnlineState(true);
        }
      } catch (error) {
        console.error('[Auth] Failed to restore session', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setIsOnline = async (online: boolean) => {
    setIsOnlineState(online);
    try {
      await AsyncStorage.setItem('@ematix_partner_is_online', online ? 'true' : 'false');
    } catch (e) {
      console.error('[Auth] Failed to set online state', e);
    }
  };

  const login = async (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem('@ematix_partner_token', authToken);
    await AsyncStorage.setItem('@ematix_partner_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setIsOnlineState(false);
    await Promise.all([
      AsyncStorage.removeItem('@ematix_partner_token'),
      AsyncStorage.removeItem('@ematix_partner_user'),
      AsyncStorage.removeItem('@ematix_partner_is_online'),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isOnline, setIsOnline, login, logout }}>
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
