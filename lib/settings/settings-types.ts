export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'
  | 'midnight-wine'
  | 'arctic-porcelain'
  | 'graphite';
export type MessageTextSize = 'small' | 'medium' | 'large';
export type MessageSpacing = 'compact' | 'comfortable' | 'relaxed';
export type ChatDensity = 'compact' | 'comfortable';
export type BubbleStyle = 'standard' | 'soft';
export type SendOnEnter = 'enter' | 'ctrlEnter';
export type UnreadIndicator = 'badge' | 'dot';

export interface AppearanceSettings {
  theme: ThemeMode;
  messageTextSize: MessageTextSize;
  messageSpacing: MessageSpacing;
  chatDensity: ChatDensity;
  bubbleStyle: BubbleStyle;
}

export interface AccessibilitySettings {
  largerText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  disableAnimations: boolean;
  enhancedFocus: boolean;
}

export interface ChatSettings {
  sendOnEnter: SendOnEnter;
  showTimestamps: boolean;
  showMessagePreviews: boolean;
  unreadIndicator: UnreadIndicator;
  confirmClearDraft: boolean;
}

export interface NotificationSettings {
  inAppAlerts: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  includePreviewInNotification: boolean;
}

export interface PrivacySettings {
  appearOffline: boolean;
  hideLastSeen: boolean;
}

export interface NexusSettings {
  appearance: AppearanceSettings;
  accessibility: AccessibilitySettings;
  chat: ChatSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export const DEFAULT_SETTINGS: NexusSettings = {
  appearance: {
    theme: 'light',
    messageTextSize: 'medium',
    messageSpacing: 'comfortable',
    chatDensity: 'comfortable',
    bubbleStyle: 'standard',
  },
  accessibility: {
    largerText: false,
    highContrast: false,
    reduceMotion: false,
    disableAnimations: false,
    enhancedFocus: false,
  },
  chat: {
    sendOnEnter: 'enter',
    showTimestamps: false,
    showMessagePreviews: true,
    unreadIndicator: 'badge',
    confirmClearDraft: true,
  },
  notifications: {
    inAppAlerts: true,
    soundEnabled: true,
    desktopNotifications: false,
    includePreviewInNotification: true,
  },
  privacy: {
    appearOffline: false,
    hideLastSeen: false,
  },
};
