import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Bell, Shield, Eye, Globe, Moon, Sun, Loader2, Maximize2, Minimize2, Ban, VolumeX,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import api from '../../lib/axios';
import { useFontSizeStore, type FontSizeOption } from '../../store/fontSizeStore';
import { useDesktopWidthStore } from '../../store/desktopWidthStore';
import { SUPPORTED_LANGUAGES } from '../../i18n/detectLocaleLanguage';
import { updateUserLanguage } from '../../services/languageService';
import Avatar from '../../components/Avatar';
import ProfileLink from '../../components/Profile/ProfileLink';

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'sw', label: 'Kiswahili' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'zu', label: 'isiZulu' },
  { value: 'ss', label: 'SiSwati' },
  { value: 'zh', label: '中文' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
];

interface SettingsState {
  dataCollection: boolean;
  analyticsTracking: boolean;
  crashReporting: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  language: string;
  fontSize: string;
  highContrast: boolean;
  alwaysTranslateMessages: boolean;
  liveTypingPreview: boolean;
  autoplayVideos: boolean;
  showSensitiveContent: boolean;
  dataUsage: string;
  canModerate?: boolean;
  canBanUsers?: boolean;
  canManageGroups?: boolean;
  canViewAnalytics?: boolean;
  canManageSettings?: boolean;
  adminNotifications?: boolean;
  systemAlerts?: boolean;
}

const TEXT_SIZE_OPTIONS: { value: FontSizeOption; label: string; sampleSize: string }[] = [
  { value: 'small', label: 'Small', sampleSize: 'text-xs' },
  { value: 'medium', label: 'Medium', sampleSize: 'text-sm' },
  { value: 'large', label: 'Large', sampleSize: 'text-base' },
];

/** Stable row — labels never fade on hover */
const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border/50 last:border-0 last:pb-0 first:pt-0">
    <div className="min-w-0 flex-1 pr-2">
      <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
      {description && (
        <p className="text-xs text-foreground/60 mt-1 leading-relaxed">{description}</p>
      )}
    </div>
    <div className="shrink-0 pt-0.5">{children}</div>
  </div>
);

const SettingsSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, badge, children }) => (
  <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-2.5 mb-1 pb-3 border-b border-border/60">
      <span className="text-accent shrink-0">{icon}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {badge}
    </div>
    <div className="pt-1">{children}</div>
  </section>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  label: string;
}> = ({ checked, onChange, name, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    name={name}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
      checked
        ? 'bg-accent border-accent'
        : 'bg-background-secondary border-border'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const TextSizeSelector: React.FC = () => {
  const { fontSize, setFontSize } = useFontSizeStore();

  return (
    <div className="space-y-2 w-full">
      <div className="flex gap-1 bg-background-secondary rounded-xl p-1 border border-border">
        {TEXT_SIZE_OPTIONS.map((opt) => {
          const active = fontSize === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFontSize(opt.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-colors ${
                active
                  ? 'bg-card text-foreground border border-border shadow-sm'
                  : 'text-foreground/70 hover:bg-card/80 hover:text-foreground border border-transparent'
              }`}
            >
              <span className={`font-bold leading-none text-foreground ${opt.sampleSize}`}>A</span>
              <span className="text-[10px] leading-none font-medium text-foreground/80">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-foreground/60">
        Preview: <span className="text-foreground">This is how your text will look.</span>
      </p>
    </div>
  );
};

const selectClass =
  'w-full px-3 py-2.5 rounded-xl bg-background-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 appearance-none';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const { i18n, t } = useTranslation();
  const { mode, toggleMode } = useDesktopWidthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const activeLanguage = (i18n.language || 'en').split('-')[0];
  const [appSettings, setAppSettings] = useState<SettingsState>({
    dataCollection: true,
    analyticsTracking: false,
    crashReporting: true,
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    darkMode: true,
    language: activeLanguage,
    fontSize: 'large',
    highContrast: false,
    alwaysTranslateMessages: true,
    liveTypingPreview: true,
    autoplayVideos: true,
    showSensitiveContent: false,
    dataUsage: 'standard',
  });

  useEffect(() => {
    const loadLists = async () => {
      if (!user) return;
      setListsLoading(true);
      try {
        const [blockedRes, mutedRes] = await Promise.all([
          api.get('/social/blocked').catch(() => ({ data: [] })),
          api.get('/social/muted').catch(() => ({ data: [] })),
        ]);
        setBlockedUsers(blockedRes.data || []);
        setMutedUsers(mutedRes.data || []);
      } finally {
        setListsLoading(false);
      }
    };
    loadLists();
  }, [user]);

  const handleUnblock = async (userId: string) => {
    try {
      await api.delete(`/social/block/${userId}`);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User unblocked');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unblock');
    }
  };

  const handleUnmute = async (userId: string) => {
    try {
      await api.delete(`/social/mute/${userId}`);
      setMutedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User unmuted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unmute');
    }
  };

  useEffect(() => {
    const lang = (i18n.language || 'en').split('-')[0];
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
      setAppSettings((prev) => (prev.language === lang ? prev : { ...prev, language: lang }));
    }
  }, [i18n.language]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const response = await api.get('/settings');
        const serverSettings = response.data.settings;
        const currentLang = (i18n.language || 'en').split('-')[0];
        setAppSettings((prev) => ({
          ...prev,
          ...serverSettings,
          alwaysTranslateMessages: serverSettings.alwaysTranslateMessages !== false,
          liveTypingPreview: serverSettings.liveTypingPreview !== false,
          // Prefer live i18n language over stale server default
          language: currentLang,
          // Local theme wins — never force dark from server defaults
          darkMode: theme === 'dark',
        }));
        try {
          localStorage.setItem(
            'appSettings',
            JSON.stringify({
              ...appSettings,
              ...serverSettings,
              alwaysTranslateMessages: serverSettings.alwaysTranslateMessages !== false,
              liveTypingPreview: serverSettings.liveTypingPreview !== false,
              language: currentLang,
              darkMode: theme === 'dark',
            })
          );
          localStorage.setItem(
            'puurga_always_translate',
            serverSettings.alwaysTranslateMessages === false ? '0' : '1'
          );
        } catch {
          /* ignore */
        }
        if (serverSettings.darkMode !== undefined && serverSettings.darkMode !== (theme === 'dark')) {
          // Sync local preference to server so it stops fighting light mode
          try {
            await api.put('/settings', {
              settings: { ...serverSettings, darkMode: theme === 'dark' },
            });
          } catch {
            /* non-fatal */
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      setAppSettings((prev) => ({
        ...prev,
        canModerate: true,
        canBanUsers: user?.role === 'super_admin',
        canManageGroups: true,
        canViewAnalytics: true,
        canManageSettings: user?.role === 'super_admin',
        adminNotifications: true,
        systemAlerts: true,
      }));
    }
  }, [user]);

  const setBool = (name: keyof SettingsState, value: boolean) => {
    setAppSettings((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'alwaysTranslateMessages') {
        try {
          localStorage.setItem('puurga_always_translate', value ? '1' : '0');
        } catch {
          /* ignore */
        }
        void api.put('/settings', { settings: next }).catch(() => null);
      }
      if (name === 'liveTypingPreview') {
        try {
          localStorage.setItem('appSettings', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        void api.put('/settings', { settings: next }).catch(() => null);
      }
      return next;
    });
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAppSettings((prev) => ({ ...prev, [name]: value }));

    if (name === 'language' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)) {
      try {
        await i18n.changeLanguage(value);
        localStorage.setItem('i18nextLng', value);
        try {
          await updateUserLanguage(value);
        } catch {
          // Local change is enough if backend save fails
        }
      } catch (error) {
        console.error('Failed to change language:', error);
        toast.error('Failed to change language');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings', { settings: appSettings });
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground/70 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-6"
    >
      <header className="page-header">
        <h1 className="page-title">App Settings</h1>
        <p className="page-subtitle">
          Manage your preferences, privacy, and notifications.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SettingsSection
          icon={theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          title="Appearance"
        >
          <SettingRow title="Theme" description="Switch between light and dark mode">
            <Toggle
              name="darkMode"
              label="Toggle theme"
              checked={theme === 'dark'}
              onChange={async () => {
                const nextDark = theme !== 'dark';
                toggleTheme();
                setAppSettings((prev) => ({ ...prev, darkMode: nextDark }));
                try {
                  await api.put('/settings', {
                    settings: { ...appSettings, darkMode: nextDark },
                  });
                } catch (error) {
                  console.error('Error updating theme setting:', error);
                }
              }}
            />
          </SettingRow>

          <SettingRow
            title="Desktop layout width"
            description="80% compact view or full width (desktop only)"
          >
            <button
              type="button"
              onClick={toggleMode}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background-secondary text-foreground text-xs font-medium hover:bg-card transition-colors"
              title={mode === 'compact' ? 'Switch to 100%' : 'Switch to 80%'}
            >
              {mode === 'compact' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              <span className="text-foreground">{mode === 'compact' ? '80%' : '100%'}</span>
            </button>
            <span className="lg:hidden text-xs text-foreground/50">Desktop only</span>
          </SettingRow>
        </SettingsSection>

        <SettingsSection icon={<Shield className="w-5 h-5" />} title="Privacy & Security">
          <SettingRow
            title={t('settings.liveTypingPreview', 'Share live typing preview')}
            description={t(
              'settings.liveTypingPreviewDesc',
              'Let people in your conversation see your draft in real time before you send it.'
            )}
          >
            <Toggle
              name="liveTypingPreview"
              label={t('settings.liveTypingPreview', 'Share live typing preview')}
              checked={appSettings.liveTypingPreview !== false}
              onChange={(v) => setBool('liveTypingPreview', v)}
            />
          </SettingRow>
          <SettingRow title="Data Collection" description="Allow usage data for improvements">
            <Toggle
              name="dataCollection"
              label="Data Collection"
              checked={appSettings.dataCollection}
              onChange={(v) => setBool('dataCollection', v)}
            />
          </SettingRow>
          <SettingRow title="Analytics Tracking" description="Anonymous analytics to improve the app">
            <Toggle
              name="analyticsTracking"
              label="Analytics Tracking"
              checked={appSettings.analyticsTracking}
              onChange={(v) => setBool('analyticsTracking', v)}
            />
          </SettingRow>
          <SettingRow title="Crash Reporting" description="Send crash reports to help fix bugs">
            <Toggle
              name="crashReporting"
              label="Crash Reporting"
              checked={appSettings.crashReporting}
              onChange={(v) => setBool('crashReporting', v)}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection icon={<Ban className="w-5 h-5" />} title="Blocked & Muted">
          {listsLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Ban size={14} className="text-muted" />
                  Blocked ({blockedUsers.length})
                </p>
                {blockedUsers.length === 0 ? (
                  <p className="text-xs text-foreground/50">No blocked users</p>
                ) : (
                  <ul className="space-y-2">
                    {blockedUsers.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-3 py-2 px-2 rounded-xl bg-background-secondary/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ProfileLink username={u.username} className="rounded-full shrink-0">
                            <Avatar src={u.avatar_url || ''} alt={u.full_name} size="sm" userId={u.id} />
                          </ProfileLink>
                          <div className="min-w-0">
                            <ProfileLink username={u.username} className="text-sm text-foreground truncate hover:text-accent block">
                              {u.full_name}
                            </ProfileLink>
                            <ProfileLink username={u.username} className="text-xs text-muted truncate hover:text-accent block">
                              @{u.username}
                            </ProfileLink>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblock(u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-card"
                        >
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <VolumeX size={14} className="text-muted" />
                  Muted ({mutedUsers.length})
                </p>
                {mutedUsers.length === 0 ? (
                  <p className="text-xs text-foreground/50">No muted users</p>
                ) : (
                  <ul className="space-y-2">
                    {mutedUsers.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between gap-3 py-2 px-2 rounded-xl bg-background-secondary/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ProfileLink username={u.username} className="rounded-full shrink-0">
                            <Avatar src={u.avatar_url || ''} alt={u.full_name} size="sm" userId={u.id} />
                          </ProfileLink>
                          <div className="min-w-0">
                            <ProfileLink username={u.username} className="text-sm text-foreground truncate hover:text-accent block">
                              {u.full_name}
                            </ProfileLink>
                            <ProfileLink username={u.username} className="text-xs text-muted truncate hover:text-accent block">
                              @{u.username}
                            </ProfileLink>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnmute(u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-card"
                        >
                          Unmute
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SettingsSection>

        <SettingsSection icon={<Bell className="w-5 h-5" />} title="Notifications">
          <SettingRow title="Push Notifications" description="Receive notifications on your device">
            <Toggle
              name="pushNotifications"
              label="Push Notifications"
              checked={appSettings.pushNotifications}
              onChange={(v) => setBool('pushNotifications', v)}
            />
          </SettingRow>
          <SettingRow title="Email Notifications" description="Receive notifications via email">
            <Toggle
              name="emailNotifications"
              label="Email Notifications"
              checked={appSettings.emailNotifications}
              onChange={(v) => setBool('emailNotifications', v)}
            />
          </SettingRow>
          <SettingRow title="Sound" description="Play sounds for notifications">
            <Toggle
              name="soundEnabled"
              label="Sound"
              checked={appSettings.soundEnabled}
              onChange={(v) => setBool('soundEnabled', v)}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection icon={<Eye className="w-5 h-5" />} title="Display & Accessibility">
          <div className="py-3.5 border-b border-border/50">
            <p className="text-sm font-medium text-foreground mb-2">Language</p>
            <select
              name="language"
              value={
                LANGUAGE_OPTIONS.some((o) => o.value === appSettings.language)
                  ? appSettings.language
                  : activeLanguage
              }
              onChange={handleSelect}
              className={selectClass}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <SettingRow
            title={t('settings.alwaysTranslateMessages', 'Always translate messages')}
            description={t(
              'settings.alwaysTranslateMessagesDesc',
              'Incoming messages appear in your language. Tap to view the original anytime.'
            )}
          >
            <Toggle
              name="alwaysTranslateMessages"
              label={t('settings.alwaysTranslateMessages', 'Always translate messages')}
              checked={appSettings.alwaysTranslateMessages !== false}
              onChange={(v) => setBool('alwaysTranslateMessages', v)}
            />
          </SettingRow>

          <div className="py-3.5 border-b border-border/50">
            <p className="text-sm font-medium text-foreground mb-2">Text Size</p>
            <TextSizeSelector />
          </div>

          <SettingRow title="High Contrast" description="Improve readability with higher contrast">
            <Toggle
              name="highContrast"
              label="High Contrast"
              checked={appSettings.highContrast}
              onChange={(v) => setBool('highContrast', v)}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection icon={<Globe className="w-5 h-5" />} title="Content & Feed">
          <SettingRow title="Autoplay Videos" description="Automatically play videos in the feed">
            <Toggle
              name="autoplayVideos"
              label="Autoplay Videos"
              checked={appSettings.autoplayVideos}
              onChange={(v) => setBool('autoplayVideos', v)}
            />
          </SettingRow>
          <SettingRow title="Show Sensitive Content" description="Display content marked as sensitive">
            <Toggle
              name="showSensitiveContent"
              label="Show Sensitive Content"
              checked={appSettings.showSensitiveContent}
              onChange={(v) => setBool('showSensitiveContent', v)}
            />
          </SettingRow>
          <div className="py-3.5">
            <p className="text-sm font-medium text-foreground mb-2">Data Usage</p>
            <select
              name="dataUsage"
              value={appSettings.dataUsage}
              onChange={handleSelect}
              className={selectClass}
            >
              <option value="low">Low (Save Data)</option>
              <option value="standard">Standard</option>
              <option value="high">High Quality</option>
            </select>
          </div>
        </SettingsSection>

        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <SettingsSection
            icon={<Shield className="w-5 h-5" />}
            title="Admin Settings"
            badge={
              <span className="text-[10px] font-semibold bg-accent/15 text-foreground px-2 py-0.5 rounded-full border border-border">
                {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            }
          >
            <SettingRow title="Can Moderate" description="Moderate posts and comments">
              <Toggle name="canModerate" label="Can Moderate" checked={!!appSettings.canModerate} onChange={(v) => setBool('canModerate', v)} />
            </SettingRow>
            <SettingRow title="Can Manage Groups" description="Create and manage groups">
              <Toggle name="canManageGroups" label="Can Manage Groups" checked={!!appSettings.canManageGroups} onChange={(v) => setBool('canManageGroups', v)} />
            </SettingRow>
            <SettingRow title="Can View Analytics" description="Access platform analytics">
              <Toggle name="canViewAnalytics" label="Can View Analytics" checked={!!appSettings.canViewAnalytics} onChange={(v) => setBool('canViewAnalytics', v)} />
            </SettingRow>
            <SettingRow title="Admin Notifications" description="Receive admin alerts">
              <Toggle name="adminNotifications" label="Admin Notifications" checked={!!appSettings.adminNotifications} onChange={(v) => setBool('adminNotifications', v)} />
            </SettingRow>
            {user?.role === 'super_admin' && (
              <>
                <SettingRow title="Can Ban Users" description="Ban and unban users">
                  <Toggle name="canBanUsers" label="Can Ban Users" checked={!!appSettings.canBanUsers} onChange={(v) => setBool('canBanUsers', v)} />
                </SettingRow>
                <SettingRow title="Can Manage Settings" description="Modify global platform settings">
                  <Toggle name="canManageSettings" label="Can Manage Settings" checked={!!appSettings.canManageSettings} onChange={(v) => setBool('canManageSettings', v)} />
                </SettingRow>
              </>
            )}
          </SettingsSection>
        )}

        {user?.role === 'super_admin' && (
          <SettingsSection
            icon={<Globe className="w-5 h-5 text-red-400" />}
            title="Global Platform Settings"
            badge={
              <span className="text-[10px] font-semibold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">
                Super Admin Only
              </span>
            }
          >
            <p className="text-xs text-foreground/65 py-3 leading-relaxed">
              These settings affect the entire platform and all users. Changes take effect immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
              <button
                type="button"
                onClick={() => toast('Global settings management coming soon', { icon: 'ℹ️' })}
                className="p-4 rounded-xl border border-border bg-background-secondary text-left transition-colors hover:bg-card"
              >
                <h3 className="font-medium text-foreground text-sm mb-1">Platform Rules</h3>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Registration, moderation, and user limits
                </p>
              </button>
              <button
                type="button"
                onClick={() => toast('System maintenance tools coming soon', { icon: 'ℹ️' })}
                className="p-4 rounded-xl border border-border bg-background-secondary text-left transition-colors hover:bg-card"
              >
                <h3 className="font-medium text-foreground text-sm mb-1">System Maintenance</h3>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Database cleanup, cache, and system tools
                </p>
              </button>
            </div>
          </SettingsSection>
        )}

        <div className="pt-1">
          <Button
            variant="primary"
            type="submit"
            isLoading={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving…' : 'Save App Settings'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default Settings;
