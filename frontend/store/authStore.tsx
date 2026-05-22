'use client';

import { createContext, useContext, useEffect, useReducer, ReactNode, useCallback } from 'react';
import { AUTH_TOKEN_KEY } from '@/lib/axios';
import { getMeRequest } from '@/lib/auth-api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  // True until the initial /me rehydration finishes, so guards can wait
  // instead of flashing the login page for an already-authed user.
  isLoading: boolean;
}

type Action =
  | { type: 'SET_USER'; user: User }
  | { type: 'CLEAR_USER' }
  | { type: 'STOP_LOADING' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.user, isLoading: false };
    case 'CLEAR_USER':
      return { user: null, isLoading: false };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, isLoading: true });

  // On mount: if a token is stored, fetch the current user to rehydrate
  // the session. A failed request (expired/invalid token) clears it.
  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      dispatch({ type: 'STOP_LOADING' });
      return;
    }

    getMeRequest()
      .then((user) => dispatch({ type: 'SET_USER', user }))
      .catch(() => {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        dispatch({ type: 'CLEAR_USER' });
      });
  }, []);

  const login = useCallback((user: User, token: string) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    dispatch({ type: 'SET_USER', user });
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  const setUser = useCallback((user: User) => {
    dispatch({ type: 'SET_USER', user });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: state.user !== null,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
