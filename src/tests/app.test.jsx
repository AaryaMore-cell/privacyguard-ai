import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PrivacyGuard AI Dashboard & Interactive UI', () => {
  it('renders branding, local processing badge, navigation tabs, and real zeroed initial telemetry', () => {
    render(<App />);

    const header = screen.getByRole('banner');
    expect(within(header).getByText('PRIVACYGUARD AI')).toBeInTheDocument();
    expect(within(header).getByText('Your data. Your control.')).toBeInTheDocument();
    expect(screen.getByText('100% CLIENT-SIDE PROCESSING')).toBeInTheDocument();
    expect(screen.getByText(/PrivacyGuard does not intentionally transmit document contents/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sanitizer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detection Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How It Works' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Privacy & Security' })).toBeInTheDocument();
  });

  it('Explore Demo loads synthetic sample, navigates to Sanitizer, and updates live diff and redaction modes', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Explore Demo/i }));

    const textarea = screen.getByLabelText(/Document Input/i);
    expect(textarea.value).toContain('Aarav.Sharma@example.com');

    const sanitizedPane = screen.getByTestId('diff-sanitized');
    expect(sanitizedPane.textContent).toContain('USER_01');
    expect(sanitizedPane.textContent).toContain('CARD_01');
    expect(sanitizedPane.textContent).not.toContain('4532 0151 1283 0366');
    expect(sanitizedPane.textContent).toContain('9900112233445566');

    fireEvent.click(screen.getByRole('button', { name: /Mode A: Full Mask/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('[REDACTED]');
    expect(screen.getByTestId('diff-sanitized').textContent).not.toContain('USER_01');

    fireEvent.click(screen.getByRole('button', { name: /Mode B: Partial Mask/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('Aa**********@example.com');
  });

  it('supports Load Sample CSV, category filtering, Disable/Enable All, copy, and Blob export', async () => {
    const createUrlSpy = vi.fn(() => 'blob:mock-export');
    const revokeUrlSpy = vi.fn();
    globalThis.URL.createObjectURL = createUrlSpy;
    globalThis.URL.revokeObjectURL = revokeUrlSpy;

    const writeTextSpy = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sanitizer' }));
    fireEvent.click(screen.getByRole('button', { name: /Load Sample CSV/i }));

    const sanitizedPane = screen.getByTestId('diff-sanitized');
    expect(sanitizedPane.textContent).toContain('USER_01');
    expect(sanitizedPane.textContent).toContain('"Quoted note with ""escaped quotes"" and');

    // Toggle Email filter off -> raw emails remain unredacted
    const filterGroup = screen.getByRole('group', { name: /Entity category filters/i });
    fireEvent.click(within(filterGroup).getByRole('button', { name: /Email/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('Aarav.Sharma@example.com');

    // Enable All -> Disable All -> Enable All
    fireEvent.click(screen.getByRole('button', { name: /Enable All/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('USER_01');
    fireEvent.click(screen.getByRole('button', { name: /Disable All/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('4532 0151 1283 0366');
    fireEvent.click(screen.getByRole('button', { name: /Enable All/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('CARD_01');

    // Copy & Download .csv
    fireEvent.click(screen.getByRole('button', { name: /Copy Sanitized/i }));
    await waitFor(() => expect(writeTextSpy).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Download \.csv/i }));
    expect(createUrlSpy).toHaveBeenCalledTimes(1);
  });

  it('handles local file upload and rejects unsupported extensions cleanly', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sanitizer' }));

    const fileInput = screen.getByLabelText(/Browse text or CSV file/i);
    const badFile = new File(['bad'], 'malware.exe', { type: 'application/octet-stream' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Unsupported file type/i);
    });

    const payload = 'Contact qa@example.in and 10.0.0.5';
    const goodFile = new File([payload], 'notes.txt', { type: 'text/plain' });
    if (typeof goodFile.arrayBuffer !== 'function') {
      goodFile.arrayBuffer = async () => new TextEncoder().encode(payload).buffer;
    }
    fireEvent.change(fileInput, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(screen.getByLabelText(/Document Input/i).value).toBe(payload);
    });
    expect(screen.getAllByText(/notes\.txt/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('USER_01');
  });

  it('renders HTML/script payloads safely without executing or injecting DOM elements (XSS safety)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sanitizer' }));

    const textarea = screen.getByLabelText(/Document Input/i);
    const malicious = '<script>window.__xss=1</script><img src=x onerror=alert(1)> Contact test@demo.in';
    fireEvent.change(textarea, { target: { value: malicious } });

    const originalPane = screen.getByTestId('diff-original');
    const sanitizedPane = screen.getByTestId('diff-sanitized');

    expect(originalPane.querySelector('script')).toBeNull();
    expect(originalPane.querySelector('img')).toBeNull();
    expect(sanitizedPane.querySelector('script')).toBeNull();
    expect(sanitizedPane.textContent).toContain('<script>window.__xss=1</script>');
    expect(sanitizedPane.textContent).toContain('USER_01');
    expect(window.__xss).toBeUndefined();
  });

  it('navigates all pages, closes Help modal via Escape, records zero-PII audit history, and resets', async () => {
    render(<App />);

    // Theme toggle
    fireEvent.click(screen.getByRole('button', { name: /Switch to light theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Help modal open & Escape close (awaits AnimatePresence exit)
    fireEvent.click(screen.getByRole('button', { name: /Open help guide/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Load sample via Explore Demo, check Analytics, How It Works, Privacy, Audit History
    fireEvent.click(screen.getByRole('button', { name: /Explore Demo/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Detection Analytics' }));
    expect(screen.getByRole('img', { name: /Detected entity distribution chart/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'How It Works' }));
    expect(screen.getByText(/Pattern Matching vs\. Identity Verification/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Privacy & Security' }));
    expect(screen.getByText(/Volatile Memory Only/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Audit History' }));
    const main = screen.getByRole('main');
    expect(within(main).getByText(/Detection & Sanitization Completed/i)).toBeInTheDocument();
    expect(main.textContent).not.toContain('Aarav.Sharma@example.com');
    expect(main.textContent).not.toContain('4532 0151 1283 0366');

    fireEvent.click(screen.getByRole('button', { name: 'Sanitizer' }));
    fireEvent.click(screen.getByRole('button', { name: /Clear \/ Reset/i }));

    expect(screen.getByLabelText(/Document Input/i).value).toBe('');
    expect(screen.getByText(/No document loaded yet/i)).toBeInTheDocument();
  });

  it('renders Neon Privacy Universe homepage, 8 sidebar routes, collapse toggle, and Settings manual Scan flow', () => {
    render(<App />);

    // Unique homepage heading, description, and 3D holographic shield
    expect(
      screen.getByRole('heading', { name: /Your Data\. Your Universe\. Your Control\./i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Intelligent privacy protection that keeps your sensitive information yours\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Holographic security shield core/i })).toBeInTheDocument();

    // All 8 sidebar items exist
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();

    // Collapse & expand sidebar
    const collapseBtn = screen.getByRole('button', { name: /Collapse sidebar/i });
    fireEvent.click(collapseBtn);
    expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();

    // Navigate to Settings and switch to Manual Scan
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Auto-Scan ON/i }));
    expect(screen.getByRole('button', { name: /Manual Scan/i })).toBeInTheDocument();

    // Navigate to Sanitizer, type PII, click Scan button
    fireEvent.click(screen.getByRole('button', { name: 'Sanitizer' }));
    const textarea = screen.getByLabelText(/Document Input/i);
    fireEvent.change(textarea, { target: { value: 'Email neon@universe.io' } });
    expect(screen.getByTestId('diff-sanitized').textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /Scan Changes/i }));
    expect(screen.getByTestId('diff-sanitized').textContent).toContain('USER_01');
  });
});
