export interface WhatsNewFeature {
  key: string;
  icon: string;
}

export interface WhatsNewRelease {
  version: string;
  features: WhatsNewFeature[];
}

export const WHATS_NEW: WhatsNewRelease[] = [
  {
    version: '6.13.0',
    features: [
      { key: 'whatsNew.undoToast', icon: '↩️' },
      { key: 'whatsNew.updateBanner', icon: '🔄' },
      { key: 'whatsNew.remoteSync', icon: '📱' },
    ],
  },
  {
    version: '6.12.0',
    features: [
      { key: 'whatsNew.gameInfoBar', icon: '📊' },
      { key: 'whatsNew.controlsRedesign', icon: '🎮' },
      { key: 'whatsNew.settingsModal', icon: '⚙️' },
    ],
  },
];

const VERSION_KEY = 'poker-timer-last-version';

export function shouldShowWhatsNew(): boolean {
  try {
    const lastSeen = localStorage.getItem(VERSION_KEY);
    if (!lastSeen) {
      markVersionSeen();
      return false;
    }
    return lastSeen !== __APP_VERSION__;
  } catch {
    return false;
  }
}

export function markVersionSeen(): void {
  try {
    localStorage.setItem(VERSION_KEY, __APP_VERSION__);
  } catch { /* ignore */ }
}

export function getUnseenReleases(): WhatsNewRelease[] {
  try {
    const lastSeen = localStorage.getItem(VERSION_KEY) || '0.0.0';
    return WHATS_NEW.filter(r => r.version > lastSeen).slice(0, 3);
  } catch {
    return [];
  }
}
