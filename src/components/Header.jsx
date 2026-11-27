import { motion } from 'motion/react';
import {
  HelpCircle,
  Menu,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  WifiOff,
} from 'lucide-react';

export function Header({
  onNavigate,
  theme,
  onToggleTheme,
  onOpenHelp,
  onOpenMobileSidebar,
  isOnline = true,
  processingEngine = 'local',
}) {
  const isServer = processingEngine === 'server';
  return (
    <header className="site-header">
      <div className="header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>

          <button
            type="button"
            className="brand-group"
            onClick={() => onNavigate('home')}
            aria-label="PrivacyGuard AI Home"
          >
            <span className="brand-mark" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <span>
              <span className="brand-title">PRIVACYGUARD AI</span>
              <span className="brand-tagline">Your data. Your control.</span>
            </span>
          </button>
        </div>

        <div className="header-controls">
          <span
            className="privacy-status-pill"
            title={
              isServer
                ? 'Documents are sent to your configured FastAPI /api backend for ephemeral processing.'
                : 'Zero network calls for document processing. All detection and masking run inside your browser.'
            }
          >
            <span className="status-dot-live" aria-hidden="true" />
            <span>{isServer ? 'FastAPI Server API' : 'Local Processing'}</span>
          </span>

          <span className="badge-pill offline-pill" title="Runs locally in browser RAM without external APIs">
            {isOnline ? <Shield size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
            <span>{isOnline ? 'Offline-Ready' : 'Offline Mode Active'}</span>
          </span>

          <motion.button
            type="button"
            className="icon-btn"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </motion.button>

          <motion.button
            type="button"
            className="icon-btn"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onOpenHelp}
            aria-label="Open help guide"
            title="Help & Quick Start"
          >
            <HelpCircle size={17} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
