import { sha256, hashAadhaarNumber, hashPanNumber } from '../../lib/crypto';

describe('Cryptographic Identity Hashing', () => {
  it('produces standard 64-character SHA-256 hex string', () => {
    // SHA-256 of "hello"
    const hash = sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('handles empty string correctly', () => {
    // SHA-256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = sha256('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('deterministically hashes Aadhaar numbers regardless of spacing/formatting', () => {
    const raw1 = '1234 5678 9012';
    const raw2 = '123456789012';
    const raw3 = '1234-5678-9012';

    const hash1 = hashAadhaarNumber(raw1);
    const hash2 = hashAadhaarNumber(raw2);
    const hash3 = hashAadhaarNumber(raw3);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);

    // Different Aadhaar must produce different hash
    const differentHash = hashAadhaarNumber('9999 8888 7777');
    expect(differentHash).not.toBe(hash1);
  });

  it('deterministically hashes PAN numbers regardless of casing or whitespace', () => {
    const pan1 = 'ABCDE1234F';
    const pan2 = 'abcde1234f';
    const pan3 = '  ABCDE1234F  ';

    const hash1 = hashPanNumber(pan1);
    const hash2 = hashPanNumber(pan2);
    const hash3 = hashPanNumber(pan3);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);

    // Different PAN must produce different hash
    const differentHash = hashPanNumber('XYZPK9876Q');
    expect(differentHash).not.toBe(hash1);
  });
});
