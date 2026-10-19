import { getUpdateDialogMeta } from '@/components/feature/UpdateBanner';

describe('UpdateBanner - getUpdateDialogMeta', () => {
  it('returns proper metadata when update is ready to install', () => {
    const meta = getUpdateDialogMeta({
      isUpdateReady: true,
      isDownloading: false,
      updateMessage: 'fix: creat trip header fix',
      channel: 'preview',
      runtimeVersion: '1.0.0',
    });

    expect(meta.statusTitle).toBe('New Version Ready!');
    expect(meta.chipLabel).toBe('UPDATE READY TO INSTALL');
    expect(meta.primaryActionText).toBe('Restart & Apply Update');
    expect(meta.releaseNotes).toBe('"fix: creat trip header fix"');
    expect(meta.channelLabel).toBe('preview');
    expect(meta.runtimeLabel).toBe('1.0.0');
    expect(meta.subtitle).toContain('Restart now');
  });

  it('returns proper metadata when update is actively downloading in background', () => {
    const meta = getUpdateDialogMeta({
      isUpdateReady: false,
      isDownloading: true,
      updateMessage: null,
      channel: null,
      runtimeVersion: null,
    });

    expect(meta.statusTitle).toBe('Downloading Update...');
    expect(meta.chipLabel).toBe('STREAMING UPDATE (OTA)');
    expect(meta.primaryActionText).toBe('Continue in Background');
    expect(meta.releaseNotes).toBeNull();
    expect(meta.channelLabel).toBe('preview');
    expect(meta.runtimeLabel).toBe('1.0.0');
    expect(meta.subtitle).toContain('silently in the background');
  });

  it('handles production channel with custom runtime version and developer release notes', () => {
    const meta = getUpdateDialogMeta({
      isUpdateReady: true,
      isDownloading: false,
      updateMessage: 'Performance improvements and instant checkout',
      channel: 'production',
      runtimeVersion: '1.2.0',
    });

    expect(meta.statusTitle).toBe('New Version Ready!');
    expect(meta.releaseNotes).toBe('"Performance improvements and instant checkout"');
    expect(meta.channelLabel).toBe('production');
    expect(meta.runtimeLabel).toBe('1.2.0');
  });
});
