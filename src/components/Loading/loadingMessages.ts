type LoadingContext = 
  | 'messages'
  | 'notifications' 
  | 'groups'
  | 'dashboard'
  | 'super-admin'
  | 'games'
  | 'global';

interface LoadingMessageConfig {
  [key: string]: string[];
}

const loadingMessages: LoadingMessageConfig = {
  messages: [
    'Reading Echoes',
    'Listening Carefully', 
    'Hidden Messages'
  ],
  notifications: [
    'Signals Detected',
    'Stay Alert',
    'Observe Everything'
  ],
  groups: [
    'Gathering Minds',
    'Choose Wisely',
    'Trust Silence'
  ],
  dashboard: [
    'Filtering Truth',
    'Build Relentlessly',
    'Stay Focused'
  ],
  'super-admin': [
    'Removing Corruption',
    'Access Restricted',
    'System Override'
  ],
  games: [
    'Loading Challenge',
    'Adapt Quickly',
    'No Mercy'
  ],
  global: [
    'Purging Noise',
    'Filtering Truth',
    'Removing Corruption'
  ]
};

export const getLoadingMessages = (context: LoadingContext): string[] => {
  return loadingMessages[context] || loadingMessages.global;
};

export type { LoadingContext };
