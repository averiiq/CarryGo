import React from 'react';
import { useAppUpdates } from '@/hooks/useAppUpdates';

export interface UpdateBannerProps {
  testID?: string;
  forceVisible?: boolean;
}

export function getUpdateDialogMeta(params: {
  isUpdateReady: boolean;
  isDownloading: boolean;
  updateMessage?: string | null;
  channel?: string | null;
  runtimeVersion?: string | null;
}) {
  const statusTitle = params.isUpdateReady ? 'New Version Ready!' : 'Downloading Update...';
  const chipLabel = params.isUpdateReady ? 'UPDATE READY TO INSTALL' : 'STREAMING UPDATE (OTA)';
  const primaryActionText = params.isUpdateReady ? 'Restart & Apply Update' : 'Continue in Background';
  const subtitle = params.isUpdateReady
    ? 'CaryGoo has downloaded a fresh performance & feature bundle. Restart now to experience the latest improvements.'
    : 'Streaming new enhancements silently in the background. You can continue using the app while this completes.';

  return {
    statusTitle,
    chipLabel,
    primaryActionText,
    subtitle,
    releaseNotes: params.updateMessage ? `"${params.updateMessage}"` : null,
    channelLabel: params.channel || 'preview',
    runtimeLabel: params.runtimeVersion || '1.0.0',
  };
}

/**
 * UpdateBanner
 * Per user requirements, modal popups and download overlays are completely removed.
 * Updates download and apply seamlessly and unnoticeably in the background.
 * Mounts useAppUpdates at the root of the app to continuously manage
 * silent background checks, downloads, and app-state reload lifecycle.
 */
export function UpdateBanner(_props: UpdateBannerProps): React.ReactElement | null {
  useAppUpdates();
  return null;
}
