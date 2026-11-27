export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-notice">
          Your document contents are processed locally in this browser. PrivacyGuard does not
          intentionally transmit document contents to an external server. Hosting providers still
          serve the application assets, and browser extensions or compromised devices may affect
          privacy.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            <strong>PRIVACYGUARD AI</strong> — Your data. Your control.
          </span>
          <span>Rule-based &amp; Luhn pattern detection · Zero external APIs · Zero persistent PII storage</span>
        </div>
      </div>
    </footer>
  );
}
