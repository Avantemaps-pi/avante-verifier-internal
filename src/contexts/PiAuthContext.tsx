import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PiAuthResult, PiPaymentData } from '@/types/pi-sdk';
import { toast } from 'sonner';

interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

interface PiAuthContextType {
  user: PiUser | null;
  isLoading: boolean;
  isSDKReady: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

// Check if running inside Pi Browser
const isPiBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.navigator.userAgent.includes('PiBrowser') || 
          typeof window.Pi !== 'undefined');
};

export const PiAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);

  // Handle incomplete payments (required by SDK)
  const handleIncompletePayment = useCallback((payment: PiPaymentData) => {
    console.log('Incomplete payment found:', payment);
  }, []);

  // Auto-authenticate function
  const autoAuthenticate = useCallback(async () => {
    if (!window.Pi || isLoading || user) return;
    
    setIsLoading(true);
    try {
      const authResult: PiAuthResult = await window.Pi.authenticate(
        ['username', 'payments', 'wallet_address'],
        handleIncompletePayment
      );

      const piUser: PiUser = {
        uid: authResult.user.uid,
        username: authResult.user.username,
        accessToken: authResult.accessToken,
      };

      setUser(piUser);
      console.log('Pi auto-authentication successful:', piUser.username);
    } catch (error) {
      console.error('Pi auto-authentication failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, handleIncompletePayment]);

  // Initialize Pi SDK and auto-authenticate when script loads
  useEffect(() => {
    const initAndAuth = async () => {
      if (window.Pi) {
        try {
          window.Pi.init({ version: '2.0', sandbox: false });
          setIsSDKReady(true);
          console.log('Pi SDK initialized successfully');
          // Auto-authenticate immediately after SDK init
          await autoAuthenticate();
        } catch (error) {
          console.error('Failed to initialize Pi SDK:', error);
        }
      }
    };

    // Check if SDK is already loaded
    if (window.Pi) {
      initAndAuth();
    } else {
      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (window.Pi) {
          initAndAuth();
          clearInterval(checkInterval);
        }
      }, 100);

      // Cleanup after 10 seconds if SDK doesn't load
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.Pi) {
          console.warn('Pi SDK not available - not running in Pi Browser');
        }
      }, 10000);

      return () => clearInterval(checkInterval);
    }
  }, [autoAuthenticate]);


  // Manual login kept for edge cases but typically not needed
  const login = useCallback(async () => {
    await autoAuthenticate();
  }, [autoAuthenticate]);

  const logout = useCallback(() => {
    setUser(null);
    toast.info('Logged out successfully');
  }, []);

  return (
    <PiAuthContext.Provider value={{ user, isLoading, isSDKReady, login, logout }}>
      {children}
    </PiAuthContext.Provider>
  );
};

export const usePiAuth = (): PiAuthContextType => {
  const context = useContext(PiAuthContext);
  if (context === undefined) {
    throw new Error('usePiAuth must be used within a PiAuthProvider');
  }
  return context;
};

export { isPiBrowser };
