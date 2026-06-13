import { memo, useState, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../i18n';
import { useDialogA11y } from '../hooks/useDialogA11y';
import { showToast } from '../domain/toast';
import { useTheme } from '../theme';
import { detectPlatform, detectDesktopOS } from '../domain/platform';
import { isPresentationApiAvailable, startPresentation } from '../domain/presentationApi';

interface Props {
  sessionId: string | null;
  secret?: string | undefined;
  displayCount: number;
  controllerCount: number;
  localTVActive: boolean;
  onOpenLocalTV: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

function buildShareUrl(sessionId: string, mode: 'display' | 'remote', secret?: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const origin = window.location.origin;
  if (mode === 'display') {
    return `${origin}${base}#display=${sessionId}`;
  }
  const hash = secret ? `#remote=${sessionId}&s=${secret}` : `#remote=${sessionId}`;
  return `${origin}${base}${hash}`;
}

type TFunc = ReturnType<typeof useTranslation>['t'];
type TKey = Parameters<TFunc>[0];

function ShareHubInner({
  sessionId,
  secret,
  displayCount,
  controllerCount,
  localTVActive,
  onOpenLocalTV,
  onToggleFullscreen,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y(onClose);
  const { resolved } = useTheme();

  const [showDisplayQR, setShowDisplayQR] = useState(false);
  const [showRemoteQR, setShowRemoteQR] = useState(false);
  const [copiedDisplay, setCopiedDisplay] = useState(false);
  const [copiedRemote, setCopiedRemote] = useState(false);

  const qrFg = resolved === 'dark' ? '#e5e7eb' : '#111827';
  const qrBg = resolved === 'dark' ? '#1f2937' : '#ffffff';

  const displayUrl = useMemo(
    () => (sessionId ? buildShareUrl(sessionId, 'display') : ''),
    [sessionId],
  );
  const remoteUrl = useMemo(
    () => (sessionId ? buildShareUrl(sessionId, 'remote', secret) : ''),
    [sessionId, secret],
  );
  const viewerUrl = useMemo(
    () => (remoteUrl ? remoteUrl + '&role=viewer' : ''),
    [remoteUrl],
  );

  const copyToClipboard = useCallback(async (url: string, type: 'display' | 'remote') => {
    try {
      await navigator.clipboard.writeText(url);
      if (type === 'display') {
        setCopiedDisplay(true);
        setTimeout(() => setCopiedDisplay(false), 2000);
      } else {
        setCopiedRemote(true);
        setTimeout(() => setCopiedRemote(false), 2000);
      }
    } catch {
      showToast(t('clipboard.copyFailed'));
    }
  }, [t]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sharehub-title"
        className="bg-white/95 dark:bg-gray-900/95 border border-gray-300 dark:border-gray-700/50 rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 id="sharehub-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t('shareHub.title' as TKey)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            aria-label={t('shareHub.close' as TKey)}
          >
            &times;
          </button>
        </div>

        {/* Session ID */}
        {sessionId ? (
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {t('shareHub.sessionId' as TKey)}
            </p>
            <p className="text-xl font-mono font-bold tracking-widest text-gray-900 dark:text-white select-all">
              {sessionId}
            </p>
          </div>
        ) : (
          <div className="text-center py-3 text-sm text-gray-500 dark:text-gray-400">
            {t('shareHub.noSession' as TKey)}
          </div>
        )}

        {/* Section: Display on another device */}
        <SectionCard
          icon={String.fromCodePoint(0x1F4FA)}
          title={t('shareHub.displayTitle' as TKey)}
          description={t('shareHub.displayDesc' as TKey)}
        >
          {sessionId ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDisplayQR((v) => !v)}
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {showDisplayQR
                    ? t('shareHub.hideQR' as TKey)
                    : t('shareHub.showQR' as TKey)}
                </button>
                <button
                  onClick={() => copyToClipboard(displayUrl, 'display')}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors min-w-[80px]"
                >
                  {copiedDisplay ? String.fromCodePoint(0x2713) : t('shareHub.copyLink' as TKey)}
                </button>
              </div>

              {showDisplayQR && (
                <div className="flex justify-center">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                    <QRCodeSVG
                      value={displayUrl}
                      size={200}
                      fgColor={qrFg}
                      bgColor={qrBg}
                      level="M"
                    />
                  </div>
                </div>
              )}

              {isPresentationApiAvailable() && sessionId && (
                <button
                  onClick={() => startPresentation(sessionId)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  <span>{String.fromCodePoint(0x1F5A5)}</span>
                  <span>{t('shareHub.presentationApi' as TKey)}</span>
                </button>
              )}

              <StatusDot
                connected={displayCount > 0}
                label={
                  displayCount > 0
                    ? t('shareHub.displaysConnected' as TKey, { n: displayCount })
                    : t('shareHub.displayNotConnected' as TKey)
                }
              />
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('shareHub.startFirst' as TKey)}
            </p>
          )}
        </SectionCard>

        {/* Section: Remote control */}
        <SectionCard
          icon={String.fromCodePoint(0x1F4F1)}
          title={t('shareHub.remoteTitle' as TKey)}
          description={t('shareHub.remoteDesc' as TKey)}
        >
          {sessionId ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRemoteQR((v) => !v)}
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {showRemoteQR
                    ? t('shareHub.hideQR' as TKey)
                    : t('shareHub.showQR' as TKey)}
                </button>
                <button
                  onClick={() => copyToClipboard(remoteUrl, 'remote')}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors min-w-[80px]"
                >
                  {copiedRemote ? String.fromCodePoint(0x2713) : t('shareHub.copyLink' as TKey)}
                </button>
              </div>

              {showRemoteQR && (
                <div className="flex justify-center">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl">
                    <QRCodeSVG
                      value={remoteUrl}
                      size={200}
                      fgColor={qrFg}
                      bgColor={qrBg}
                      level="M"
                    />
                  </div>
                </div>
              )}

              <StatusDot
                connected={controllerCount > 0}
                label={
                  controllerCount > 1
                    ? (t as (key: string, params?: Record<string, string | number>) => string)('remote.controllersConnected', { n: controllerCount })
                    : controllerCount === 1
                      ? t('shareHub.remoteConnected' as TKey)
                      : t('shareHub.remoteNotConnected' as TKey)
                }
              />

              {/* Viewer link */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700/40">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('remote.viewerLink' as TKey)}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(viewerUrl).catch(() => { showToast(t('clipboard.copyFailed')); }); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {t('shareHub.copyLink' as TKey)} ({t('remote.roleViewer' as TKey)})
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('shareHub.startFirst' as TKey)}
            </p>
          )}
        </SectionCard>

        {/* Section: This device */}
        <SectionCard
          icon={String.fromCodePoint(0x1F5A5)}
          title={t('shareHub.localTitle' as TKey)}
          description={t('shareHub.localDesc' as TKey)}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onOpenLocalTV}
                className="flex-1 text-sm px-3 py-2 rounded-lg btn-accent-gradient text-white font-medium transition-all active:scale-[0.97]"
              >
                {t('shareHub.openSecondWindow' as TKey)}
              </button>
              <button
                onClick={onToggleFullscreen}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors active:scale-[0.97]"
              >
                {t('shareHub.fullscreen' as TKey)}
              </button>
            </div>
            {localTVActive && (
              <StatusDot connected label={t('shareHub.localActive' as TKey)} />
            )}
          </div>
        </SectionCard>

        {/* Section: Cable & Wireless */}
        <SectionCard
          icon={String.fromCodePoint(0x1F4E1)}
          title={t('shareHub.cableTitle' as TKey)}
          description={t('shareHub.cableDesc' as TKey)}
        >
          <PlatformGuides />
        </SectionCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform-aware wireless guides
// ---------------------------------------------------------------------------

const PlatformGuides = memo(function PlatformGuides() {
  const { t } = useTranslation();
  const platform = useMemo(() => detectPlatform(), []);
  const desktopOS = useMemo(() => detectDesktopOS(), []);

  const guides = useMemo(() => {
    const list: { id: string; title: string; steps: string[]; defaultOpen: boolean }[] = [];

    if (platform === 'ios') {
      list.push({
        id: 'airplay',
        title: 'AirPlay / Screen Mirroring',
        steps: [
          t('shareHub.guide.airplay.step1' as TKey),
          t('shareHub.guide.airplay.step2' as TKey),
          t('shareHub.guide.airplay.step3' as TKey),
        ],
        defaultOpen: true,
      });
      list.push({
        id: 'chromecast',
        title: 'Chromecast / Google Cast',
        steps: [
          t('shareHub.guide.chromecast.step1' as TKey),
          t('shareHub.guide.chromecast.step2' as TKey),
          t('shareHub.guide.chromecast.step3' as TKey),
        ],
        defaultOpen: false,
      });
    } else if (platform === 'android') {
      list.push({
        id: 'chromecast',
        title: 'Chromecast / Google Cast',
        steps: [
          t('shareHub.guide.chromecast.step1' as TKey),
          t('shareHub.guide.chromecast.step2' as TKey),
          t('shareHub.guide.chromecast.step3' as TKey),
        ],
        defaultOpen: true,
      });
      list.push({
        id: 'airplay',
        title: 'AirPlay / Screen Mirroring',
        steps: [
          t('shareHub.guide.airplay.step1' as TKey),
          t('shareHub.guide.airplay.step2' as TKey),
          t('shareHub.guide.airplay.step3' as TKey),
        ],
        defaultOpen: false,
      });
    } else {
      // Desktop
      if (desktopOS === 'macos') {
        list.push({
          id: 'airplay',
          title: 'AirPlay / Screen Mirroring',
          steps: [
            t('shareHub.guide.airplayMac.step1' as TKey),
            t('shareHub.guide.airplayMac.step2' as TKey),
            t('shareHub.guide.airplayMac.step3' as TKey),
          ],
          defaultOpen: true,
        });
      }
      list.push({
        id: 'chromecast',
        title: 'Chromecast / Google Cast',
        steps: [
          t('shareHub.guide.chromecastDesktop.step1' as TKey),
          t('shareHub.guide.chromecastDesktop.step2' as TKey),
          t('shareHub.guide.chromecastDesktop.step3' as TKey),
        ],
        defaultOpen: desktopOS !== 'macos',
      });
    }

    // HDMI always last, never auto-open
    list.push({
      id: 'hdmi',
      title: `HDMI / ${t('shareHub.cable' as TKey)}`,
      steps: [
        t('shareHub.guide.hdmi.step1' as TKey),
        t('shareHub.guide.hdmi.step2' as TKey),
        t('shareHub.guide.hdmi.step3' as TKey),
      ],
      defaultOpen: false,
    });

    return list;
  }, [platform, desktopOS, t]);

  return (
    <div className="space-y-1">
      {guides.map((g) => (
        <details key={g.id} className="group" open={g.defaultOpen || undefined}>
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 py-1.5 hover:text-gray-900 dark:hover:text-white transition-colors">
            {g.title}
          </summary>
          <ol className="text-xs text-gray-500 dark:text-gray-400 pl-4 pb-2 space-y-1 list-decimal list-inside">
            {g.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700/40 bg-gray-50/80 dark:bg-gray-800/40 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">{icon}</span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusDot({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${connected ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: connected ? 'var(--accent-500)' : '#9ca3af',
        }}
      />
      <span
        className="text-xs font-medium"
        style={{
          color: connected ? 'var(--accent-500)' : undefined,
        }}
      >
        <span className={connected ? '' : 'text-gray-400 dark:text-gray-500'}>{label}</span>
      </span>
    </div>
  );
}

export const ShareHub = memo(ShareHubInner);
