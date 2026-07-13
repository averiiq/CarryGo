import { captureException, captureMessage, getLogBuffer, flushLogBuffer, initMonitoring, shipLogs } from '@/lib/monitoring';

describe('monitoring', () => {
  beforeEach(() => {
    flushLogBuffer();
    initMonitoring({ enabled: true, environment: 'test', appVersion: '1.0.0' });
  });

  describe('captureException', () => {
    it('captures Error instances', () => {
      captureException(new Error('test error'));
      const buffer = getLogBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('error');
      expect(buffer[0].message).toBe('test error');
    });

    it('captures string errors', () => {
      captureException('string error');
      const buffer = getLogBuffer();
      expect(buffer[0].message).toBe('string error');
    });

    it('includes context', () => {
      captureException(new Error('fail'), { userId: '123' });
      const buffer = getLogBuffer();
      expect(buffer[0].context).toMatchObject({ userId: '123' });
    });
  });

  describe('captureMessage', () => {
    it('captures messages with level', () => {
      captureMessage('test info', 'info');
      const buffer = getLogBuffer();
      expect(buffer[0].level).toBe('info');
      expect(buffer[0].message).toBe('test info');
    });

    it('defaults to info level', () => {
      captureMessage('hello');
      const buffer = getLogBuffer();
      expect(buffer[0].level).toBe('info');
    });
  });

  describe('log buffer', () => {
    it('limits buffer to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        captureMessage(`msg ${i}`);
      }
      const buffer = getLogBuffer();
      expect(buffer.length).toBe(100);
    });

    it('flushLogBuffer clears and returns entries', () => {
      captureMessage('a');
      captureMessage('b');
      const flushed = flushLogBuffer();
      expect(flushed).toHaveLength(2);
      expect(getLogBuffer()).toHaveLength(0);
    });
  });

  describe('shipLogs', () => {
    it('does nothing when buffer is empty', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response());
      await shipLogs();
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('sends logs to configured DSN', async () => {
      initMonitoring({ enabled: true, dsn: 'https://logs.example.com/ingest' });
      captureMessage('test');

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response());
      await shipLogs();

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://logs.example.com/ingest',
        expect.objectContaining({ method: 'POST' })
      );
      expect(getLogBuffer()).toHaveLength(0);
      fetchSpy.mockRestore();
    });

    it('restores entries on network failure', async () => {
      initMonitoring({ enabled: true, dsn: 'https://logs.example.com/ingest' });
      captureMessage('important');

      const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
      await shipLogs();

      expect(getLogBuffer().length).toBeGreaterThan(0);
      fetchSpy.mockRestore();
    });
  });
});
