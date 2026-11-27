import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, X } from 'lucide-react';

export function HelpModal({ isOpen, onClose }) {
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="glass-card modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="panel-title-row" style={{ marginBottom: '1rem' }}>
              <h2 id="help-modal-title" className="panel-title">
                <ShieldCheck size={19} aria-hidden="true" />
                <span>PrivacyGuard AI — Quick Guide</span>
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label="Close help dialog"
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gap: '0.9rem',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  1. Load or Paste Text / CSV
                </strong>
                <p style={{ margin: '0.25rem 0 0' }}>
                  Paste raw logs or drag-and-drop <code>.txt</code> or <code>.csv</code> files (up
                  to 5 MB). Click <strong>Load Sample TXT</strong> or{' '}
                  <strong>Load Sample CSV</strong> to inspect a synthetic noisy log containing
                  repeated identities, valid/invalid Luhn cards, and non-card 16-digit numbers.
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>2. Choose a Redaction Mode</strong>
                <p style={{ margin: '0.25rem 0 0' }}>
                  <strong>Full Mask</strong> replaces entities with <code>[REDACTED]</code>.{' '}
                  <strong>Partial Mask</strong> keeps safe context like the last 4 digits or email
                  domain. <strong>Consistent Pseudonymization</strong> maps repeated identical
                  entities to the same in-memory placeholder (e.g., <code>USER_01</code>,{' '}
                  <code>CARD_01</code>) without exposing or storing the mapping table.
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  3. Pattern Matching Disclaimer
                </strong>
                <p style={{ margin: '0.25rem 0 0' }}>
                  Detection uses deterministic rules, structural checks, and the Luhn checksum—it
                  does not query external databases or prove real-world identity or Aadhaar/card
                  issuance.
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>4. Reset &amp; Privacy</strong>
                <p style={{ margin: '0.25rem 0 0' }}>
                  Clicking <strong>Clear / Reset</strong> wipes input text, output, detections, and
                  in-memory pseudonym mappings immediately.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
