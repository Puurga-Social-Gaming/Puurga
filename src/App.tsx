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
import { NotificationProvider } from './context/NotificationContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { MessagesProvider } from './context/MessagesContext';
import Layout from './components/Layout';
import 'leaflet/dist/leaflet.css';

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

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
        <Route path="/super-admin" element={<SuperAdmin />} />
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