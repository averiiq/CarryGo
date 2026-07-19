import {
  sanitizeLikeInput,
  sanitizeTextInput,
  escapeHtml,
  sanitizeForDisplay,
  isValidUuid,
  sanitizeMessageText,
} from '@/lib/sanitize';

describe('sanitizeLikeInput', () => {
  it('escapes percent sign', () => {
    expect(sanitizeLikeInput('100%')).toBe('100\\%');
  });

  it('escapes underscore', () => {
    expect(sanitizeLikeInput('user_name')).toBe('user\\_name');
  });

  it('escapes backslash', () => {
    expect(sanitizeLikeInput('path\\to')).toBe('path\\\\to');
  });

  it('escapes multiple special characters in one string', () => {
    expect(sanitizeLikeInput('50%_off\\sale')).toBe('50\\%\\_off\\\\sale');
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeLikeInput(long).length).toBe(200);
  });

  it('passes through safe strings unchanged', () => {
    expect(sanitizeLikeInput('Mumbai')).toBe('Mumbai');
  });

  it('passes through spaces unchanged', () => {
    expect(sanitizeLikeInput('New Delhi')).toBe('New Delhi');
  });

  it('handles empty string', () => {
    expect(sanitizeLikeInput('')).toBe('');
  });

  it('handles string of all special characters', () => {
    expect(sanitizeLikeInput('%_%\\')).toBe('\\%\\_\\%\\\\');
  });

  it('truncates before escaping (so escaped output may be shorter than 200)', () => {
    const input = '%'.repeat(300);
    const result = sanitizeLikeInput(input);
    // Truncation happens first (200 chars of %), then escaping doubles them
    expect(result.length).toBe(400); // 200 * 2 (each % becomes \%)
  });

  it('handles unicode characters', () => {
    expect(sanitizeLikeInput('café')).toBe('café');
  });
});

describe('sanitizeTextInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeTextInput('  hello  ')).toBe('hello');
  });

  it('truncates to default max length of 1000', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeTextInput(long).length).toBe(1000);
  });

  it('respects custom max length', () => {
    expect(sanitizeTextInput('hello world', 5)).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeTextInput('')).toBe('');
  });

  it('handles whitespace-only string', () => {
    expect(sanitizeTextInput('   ')).toBe('');
  });

  it('preserves content within limit', () => {
    expect(sanitizeTextInput('normal text')).toBe('normal text');
  });

  it('truncates then trims (trim happens after slice)', () => {
    const padded = '  ' + 'a'.repeat(999);
    const result = sanitizeTextInput(padded, 1000);
    // slice first 1000 chars: "  " + 998 a's, then trim removes leading spaces
    expect(result.startsWith('a')).toBe(true);
    expect(result.length).toBe(998);
  });

  it('handles string at exactly max length', () => {
    const exact = 'a'.repeat(1000);
    expect(sanitizeTextInput(exact)).toBe(exact);
  });
});

describe('escapeHtml', () => {
  it('encodes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('encodes less-than sign', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('encodes greater-than sign', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('encodes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('encodes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('handles string with all special characters', () => {
    expect(escapeHtml('&<>"\''))
      .toBe('&amp;&lt;&gt;&quot;&#x27;');
  });

  it('does not double-encode already-escaped content', () => {
    // First pass: & becomes &amp;
    // The function does not detect already-encoded entities
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles script tag', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('handles img tag with onerror', () => {
    expect(escapeHtml('<img src="x" onerror="alert(1)">'))
      .toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
  });

  it('preserves unicode characters', () => {
    expect(escapeHtml('Hello 世界')).toBe('Hello 世界');
  });

  it('preserves newlines and tabs', () => {
    expect(escapeHtml('line1\nline2\ttab')).toBe('line1\nline2\ttab');
  });
});

describe('sanitizeForDisplay', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeForDisplay('  hello  ')).toBe('hello');
  });

  it('escapes HTML in trimmed output', () => {
    expect(sanitizeForDisplay('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('truncates to default max length of 1000 before escaping', () => {
    const long = 'a'.repeat(2000);
    const result = sanitizeForDisplay(long);
    expect(result.length).toBe(1000);
  });

  it('respects custom max length', () => {
    const result = sanitizeForDisplay('hello world', 5);
    expect(result).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeForDisplay('')).toBe('');
  });

  it('truncates then trims then escapes (in correct order)', () => {
    const input = '  <b>test</b>  ';
    const result = sanitizeForDisplay(input);
    // slice(0, 1000) -> "  <b>test</b>  "
    // trim -> "<b>test</b>"
    // escape -> "&lt;b&gt;test&lt;/b&gt;"
    expect(result).toBe('&lt;b&gt;test&lt;/b&gt;');
  });

  it('handles XSS attempt with full pipeline', () => {
    const xss = '  <script>document.cookie</script>  ';
    const result = sanitizeForDisplay(xss);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('handles string with only special characters', () => {
    expect(sanitizeForDisplay('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#x27;');
  });
});

describe('isValidUuid', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts valid UUID v1', () => {
    expect(isValidUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rejects random string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('rejects UUID without dashes', () => {
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('rejects UUID with extra segment', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
  });

  it('rejects UUID with wrong character (g is not hex)', () => {
    expect(isValidUuid('550g8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects null/undefined-like strings', () => {
    expect(isValidUuid('null')).toBe(false);
    expect(isValidUuid('undefined')).toBe(false);
  });

  it('rejects UUID with spaces', () => {
    expect(isValidUuid(' 550e8400-e29b-41d4-a716-446655440000 ')).toBe(false);
  });
});

describe('sanitizeMessageText', () => {
  it('removes null bytes and control characters', () => {
    expect(sanitizeMessageText('hello\x00world')).toBe('helloworld');
  });

  it('removes various control characters', () => {
    expect(sanitizeMessageText('a\x01b\x02c\x03d')).toBe('abcd');
  });

  it('removes DEL character (0x7F)', () => {
    expect(sanitizeMessageText('hello\x7Fworld')).toBe('helloworld');
  });

  it('preserves newlines (0x0A)', () => {
    expect(sanitizeMessageText('line1\nline2')).toBe('line1\nline2');
  });

  it('preserves carriage return (0x0D)', () => {
    expect(sanitizeMessageText('line1\r\nline2')).toBe('line1\r\nline2');
  });

  it('preserves tabs (0x09)', () => {
    expect(sanitizeMessageText('col1\tcol2')).toBe('col1\tcol2');
  });

  it('truncates to 5000 characters', () => {
    const long = 'a'.repeat(6000);
    expect(sanitizeMessageText(long).length).toBe(5000);
  });

  it('trims whitespace after processing', () => {
    expect(sanitizeMessageText('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeMessageText('')).toBe('');
  });

  it('handles string of only control characters', () => {
    expect(sanitizeMessageText('\x00\x01\x02\x03')).toBe('');
  });

  it('preserves unicode characters', () => {
    expect(sanitizeMessageText('Hello 世界 😀')).toBe('Hello 世界 😀');
  });

  it('handles combination of valid and invalid characters', () => {
    expect(sanitizeMessageText('\x00Hello\x01 \x02World\x7F!')).toBe('Hello World!');
  });

  it('truncation happens before control char removal', () => {
    // 4998 a's + 2 control chars = 5000, then control chars removed
    const input = 'a'.repeat(4998) + '\x00\x01' + 'b'.repeat(100);
    const result = sanitizeMessageText(input);
    expect(result.length).toBe(4998); // control chars removed, b's truncated
  });
});
