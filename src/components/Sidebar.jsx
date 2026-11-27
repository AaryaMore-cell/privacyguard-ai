import { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const SIDEBAR_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, accent: 'cyan' },
  { id: 'dashboard', label: 'Dashboard', icon: Activity, accent: 'blue' },
  { id: 'sanitizer', label: 'Sanitizer', icon: Sparkles, accent: 'cyan' },
  { id: 'analytics', label: 'Detection Analytics', icon: BarChart3, accent: 'violet' },
  { id: 'audit', label: 'Audit History', icon: ClipboardList, accent: 'teal' },
  { id: 'how-it-works', label: 'How It Works', icon: BookOpen, accent: 'blue' },
  { id: 'privacy', label: 'Privacy & Security', icon: Lock, accent: 'emerald' },
  { id: 'settings', label: 'Settings', icon: Settings, accent: 'violet' },
];

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const handleSelect = (id) => {
    onNavigate(id);
    onCloseMobile();
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen ? (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      ) : null}

      <motion.aside
        className={`universe-sidebar glass-card ${collapsed ? 'is-collapsed' : ''} ${
          mobileOpen ? 'is-mobile-open' : ''
        }`}
        aria-label="Primary Sidebar"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        initial={false}
        animate={{ width: collapsed ? 82 : 258 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-brand-btn"
            onClick={() => handleSelect('home')}
            aria-label="PrivacyGuard AI Home"
          >
            <span className="brand-mark-holo" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            {!collapsed ? (
              <span className="sidebar-brand-text">
                <strong>NEON UNIVERSE</strong>
                <span>Privacy Engine v1</span>
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className="icon-btn sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                onClick={() => handleSelect(item.id)}
              >
                {isActive ? (
                  <motion.span
                    layoutId="sidebar-active-glow"
                    className="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  />
                ) : null}

                <span className={`sidebar-icon-badge tone-${item.accent}`} aria-hidden="true">
                  <Icon size={16} />
                </span>

                <span className={`sidebar-item-label ${collapsed ? 'sr-only' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status-box">
            <span className="status-dot-live" aria-hidden="true" />
            {!collapsed ? (
              <div>
                <strong>RAM-Only Sandbox</strong>
                <span>Zero server uploads</span>
              </div>
            ) : null}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
