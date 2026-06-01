import React, { Suspense } from 'react';
import {
  Route,
  Navigate,
  Outlet,
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import RouteLoadingBar from './components/RouteLoadingBar';
import { retryableLazy } from './utils/retryableLazy';

const Home = retryableLazy(() => import('./pages/Home'));
const Profile = retryableLazy(() => import('./pages/Profile'));
const Notifications = retryableLazy(() => import('./pages/Notifications/Notifications'));
const Login = retryableLazy(() => import('./pages/Login'));
const Register = retryableLazy(() => import('./pages/Register'));
const ForgotPassword = retryableLazy(() => import('./pages/ForgotPassword'));
const ResetPassword = retryableLazy(() => import('./pages/ResetPassword'));
const TestResetUrl = retryableLazy(() => import('./pages/TestResetUrl'));
const Messages = retryableLazy(() => import('./pages/Messages'));
const PuurgaDashboard = retryableLazy(() => import('./pages/PuurgaDashboard'));
const Purgatory = retryableLazy(() => import('./pages/Purgatory'));
const PurgaGames = retryableLazy(() => import('./pages/PurgaGames/PurgaGames'));
const Settings = retryableLazy(() => import('./pages/Settings/Settings'));
const Groups = retryableLazy(() => import('./pages/Groups'));
const Security = retryableLazy(() => import('./pages/Security'));
const GroupDetail = retryableLazy(() => import('./pages/GroupDetail'));
const JoinGroup = retryableLazy(() => import('./pages/JoinGroup'));
const Help = retryableLazy(() => import('./pages/Help'));
const NewGameCode = retryableLazy(() => import('./pages/NewGameCode'));
const TheNextGame = retryableLazy(() => import('./pages/TheNextGame'));
const UserProfile = retryableLazy(() => import('./pages/UserProfile'));
const UserList = retryableLazy(() => import('./pages/Admin/UserList'));
const SuperAdmin = retryableLazy(() => import('./pages/SuperAdmin/SuperAdmin'));
import VideoScreen from './components/Onboarding/VideoScreen';
import AuthCallback from './pages/AuthCallback';
import LanguageScreen from './components/Onboarding/LanguageScreen';
import WelcomeScreenWrapper from './components/Onboarding/WelcomeScreenWrapper';

import ErrorBoundary from './components/ErrorBoundary';
import ConsoleGuard from './components/ConsoleGuard';
import DevDetector from './components/DevDetector';
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute/index.tsx';
import SuperAdminRoute from './components/SuperAdminRoute/index.tsx';
import RootLayout from './components/RootLayout';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { SurvivalProvider } from './context/SurvivalContext';
import { MessagesProvider } from './context/MessagesContext';
import { MessageNotificationProvider } from './components/MessageNotificationPopup';
import Layout from './components/Layout';

// Imports needed for RootRedirect
import { supabase } from './lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper component to preserve hash/search when redirecting
const RootRedirect: React.FC = () => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { hash, search } = window.location;

  if (!localStorage.getItem('hasSeenIntro')) {
    return <Navigate to="/onboarding/video" replace />;
  }

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
      }, 50);

      return () => {
        subscription.unsubscribe();
      };
    };

    checkAuthStatus();
  }, [navigate, isChecking]);

  if (isChecking) {
    return null;
  }

  // If we have an access token (other auth flows), go to login with the token
  if (hash && hash.includes('access_token')) {
    return <Navigate to={`/login${search}${hash}`} replace />;
  }

  return <Navigate to="/login" replace />;
};

const SuspenseWrapper: React.FC = () => (
  <Suspense fallback={<RouteLoadingBar />}>
    <Outlet />
  </Suspense>
);

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<SuspenseWrapper />}>
      {/* RootLayout wraps onboarding + login so OnboardingAudioManager persists across them */}
      <Route element={<RootLayout />}>
        {/* Onboarding Routes (Public) */}
        <Route path="/splash" element={<Navigate to="/onboarding/video" replace />} />
        <Route path="/onboarding/video" element={<VideoScreen />} />
        <Route path="/onboarding/language" element={<LanguageScreen />} />
        <Route path="/onboarding/welcome" element={<WelcomeScreenWrapper />} />
        {/* Login lives inside RootLayout so audio fades as it mounts */}
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Public Routes (outside audio scope) */}
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
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
        <Route path="/join/:inviteCode" element={<JoinGroup />} />
        <Route path="/puurga-games" element={<PurgaGames />} />
        <Route path="/puurga-dashboard" element={<PuurgaDashboard />} />
        <Route path="/purgatory" element={<Purgatory />} />
        <Route path="/help" element={<Help />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/security" element={<Security />} />
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[var(--bg)] text-[var(--fg)]">
      <ErrorBoundary>
        <ConsoleGuard />
        <DevDetector />
        <UserProvider>
          <SurvivalProvider>
          <NotificationProvider>
            <NotificationsProvider>
              <MessageNotificationProvider>
                <MessagesProvider>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: 'transparent',
                        color: 'rgb(var(--fg))',
                        border: 'none',
                        padding: '4px 8px',
                        fontSize: '12px',
                        boxShadow: 'none',
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
                </MessageNotificationProvider>
            </NotificationsProvider>
          </NotificationProvider>
          </SurvivalProvider>
        </UserProvider>
      </ErrorBoundary>
    </div>
  );
};

export default App;