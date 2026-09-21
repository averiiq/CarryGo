import { detectAlertType } from '@/template/ui/utils';

describe('Alert System - detectAlertType', () => {
  it('detects destructive alerts when a button has destructive style', () => {
    const type = detectAlertType('Confirmation', 'Do you want to proceed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive' },
    ]);
    expect(type).toBe('destructive');
  });

  it('detects destructive alerts from keywords in title or message', () => {
    expect(detectAlertType('Delete Account?')).toBe('destructive');
    expect(detectAlertType('Cancel Trip?')).toBe('destructive');
    expect(detectAlertType('Are you sure?', 'This will remove your item.')).toBe('destructive');
  });

  it('detects error alerts from error keywords', () => {
    expect(detectAlertType('Error', 'Could not send request.')).toBe('error');
    expect(detectAlertType('Verification Failed')).toBe('error');
    expect(detectAlertType('Invalid Route', 'Origin and destination must be different.')).toBe('error');
  });

  it('detects success alerts from success keywords', () => {
    expect(detectAlertType('Success', 'Profile updated successfully')).toBe('success');
    expect(detectAlertType('Accepted!', 'Chat opened to coordinate details.')).toBe('success');
    expect(detectAlertType('Alert Created!', 'You will receive updates.')).toBe('success');
  });

  it('detects warning alerts from warning or required keywords', () => {
    expect(detectAlertType('KYC Required', 'Please verify your identity.')).toBe('warning');
    expect(detectAlertType('Permission Needed', 'Camera access is required.')).toBe('warning');
    expect(detectAlertType('Sign In Required')).toBe('warning');
  });

  it('defaults to info when no specialized keywords or button styles match', () => {
    expect(detectAlertType('Notice', 'Here is general information.')).toBe('info');
  });

  it('respects explicit type override', () => {
    expect(detectAlertType('Delete Account?', undefined, undefined, 'info')).toBe('info');
    expect(detectAlertType('Hello', undefined, undefined, 'success')).toBe('success');
  });
});
