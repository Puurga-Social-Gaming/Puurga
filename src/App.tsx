import React from 'react';
import {
  Route,
  Navigate,
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications/Notifications';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TestResetUrl from './pages/TestResetUrl';
import Messages from './pages/Messages';
import PuurgaDashboard from './pages/PuurgaDashboard';
import PurgaGames from './pages/PurgaGames/PurgaGames';
import ErrorBoundary from './components/ErrorBoundary';
import Settings from './pages/Settings/Settings';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Help from './pages/Help';
import NewGameCode from './pages/NewGameCode';
import TheNextGame from './pages/TheNextGame';
import { UserProvider } from './context/UserContext';
import UserProfile from './pages/UserProfile';
import UserList from './pages/Admin/UserList';
import SuperAdmin from './pages/SuperAdmin/SuperAdmin';
import ProtectedRoute from './components/ProtectedRoute/index.tsx';
import SuperAdminRoute from './components/SuperAdminRoute/index.tsx';

import { NotificationProvider } from './context/NotificationContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { MessagesProvider } from './context/MessagesContext';
import Layout from './components/Layout';
import 'leaflet/dist/leaflet.css';

// Imports needed for RootRedirect
import { supabase } from './lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper component to preserve hash/search when redirecting
const RootRedirect: React.FC = () => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { hash, search } = window.location;

  // 1. Immediate synchronous check for recovery token
  // If we see it, don't wait for effects or auth states, just go there.
  if ((hash && hash.includes('type=recovery')) || (search && search.includes('type=recovery'))) {
    console.log('✅ Recovery token detected synchronously! Redirecting to /reset-password');
    // Pass the hash and search params along so Supabase on the destination page can verify it
    return <Navigate to={`/reset-password${search}${hash}`} replace />;
  }

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔐 RootRedirect - checking auth status...');

      // 2. Listen for Supabase Auth Events (fires if Supabase client consumes the hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        console.log('🔐 RootRedirect - Auth Event:', event);

        if (event === 'PASSWORD_RECOVERY') {
          console.log('✅ PASSWORD_RECOVERY event detected! Redirecting to /reset-password');
          navigate('/reset-password', { replace: true });
        } else if (event === 'SIGNED_IN') {
          // User is signed in. Check if we should be on a specific page?
          // For now, let the fallback redirect to login (which will auto-redirect to app) handle it
          setIsChecking(false);
        } else {
          setIsChecking(false);
        }
      });

      // 3. Fallback: If no event fires quickly, we proceed
      setTimeout(() => {
        if (isChecking) setIsChecking(false);
      }, 2000);

      return () => {
        subscription.unsubscribe();
      };
    };

    checkAuthStatus();
  }, [navigate]);

  if (isChecking) {
    // Show a minimal loading state while we check for auth events
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If we have an access token (other auth flows), go to login with the token
  if (hash && hash.includes('access_token')) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  return <Navigate to="/login" replace />;
};

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/test-reset-url" element={<TestResetUrl />} />

      {/* Redirect root to login, preserving auth params if present */}
      <Route path="/" element={<RootRedirect />} />


      {/* Protected Routes - Wrapped with Layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/puurga-games" element={<PurgaGames />} />
        <Route path="/puurga-dashboard" element={<PuurgaDashboard />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile/:username" element={<UserProfile />} />
        <Route path="/admin/users" element={<UserList />} />
        <Route path="/super-admin" element={
          <SuperAdminRoute>
            <SuperAdmin />
          </SuperAdminRoute>
        } />

        {/* Temporary route for new game code integration */}
        <Route path="/new-game" element={<NewGameCode />} />
        <Route path="/next-game" element={<TheNextGame />} />
      </Route>

      {/* Catch all other routes and redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Route>
  )
);

const App: React.FC = () => {
  console.log('App rendering...');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <ErrorBoundary>
        <UserProvider>
          <NotificationProvider>
            <NotificationsProvider>
              <MessagesProvider>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'var(--card)',
                      color: 'var(--fg)',
                      border: '1px solid var(--border)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
                <RouterProvider router={router} />
              </MessagesProvider>
            </NotificationsProvider>
          </NotificationProvider>
        </UserProvider>
      </ErrorBoundary>
    </div>
  );
};

export default App;