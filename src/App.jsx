import { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { Footer } from './components/Footer.jsx';
import { Header } from './components/Header.jsx';
import { HelpModal } from './components/HelpModal.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { UniverseBackdrop } from './components/UniverseBackdrop.jsx';
import { useSanitizer } from './hooks/useSanitizer.js';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { AuditPage } from './pages/AuditPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { HowItWorks } from './pages/HowItWorks.jsx';
import { Privacy } from './pages/Privacy.jsx';
import { Sanitizer } from './pages/Sanitizer.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

export function App() {
  const [activePage, setActivePage] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const sanitizer = useSanitizer();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleExploreDemo = () => {
    sanitizer.loadSampleData('txt');
    setActivePage('sanitizer');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <UniverseBackdrop />

        <Header
          onNavigate={setActivePage}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          isOnline={isOnline}
        />

        <div className="universe-workspace-frame">
          <Sidebar
            activePage={activePage}
            onNavigate={setActivePage}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          <div className="universe-content-col">
            <main className="app-main">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {activePage === 'home' ? (
                    <HomePage
                      onStartSanitizing={() => setActivePage('sanitizer')}
                      onExploreDemo={handleExploreDemo}
                      onNavigate={setActivePage}
                      isOnline={isOnline}
                    />
                  ) : null}

                  {activePage === 'dashboard' ? (
                    <Dashboard
                      stats={sanitizer.stats}
                      enabledTypes={sanitizer.enabledTypes}
                      onToggleCategory={sanitizer.toggleCategory}
                      auditEvents={sanitizer.auditEvents}
                      onStartSanitizing={() => setActivePage('sanitizer')}
                      onExploreDemo={handleExploreDemo}
                      onNavigate={setActivePage}
                    />
                  ) : null}

                  {activePage === 'sanitizer' ? <Sanitizer sanitizer={sanitizer} /> : null}

                  {activePage === 'analytics' ? (
                    <AnalyticsPage
                      stats={sanitizer.stats}
                      enabledTypes={sanitizer.enabledTypes}
                      onToggleCategory={sanitizer.toggleCategory}
                      auditEvents={sanitizer.auditEvents}
                      onLoadSample={() => sanitizer.loadSampleData('txt')}
                      onOpenSanitizer={() => setActivePage('sanitizer')}
                    />
                  ) : null}

                  {activePage === 'audit' ? (
                    <AuditPage
                      auditEvents={sanitizer.auditEvents}
                      onExportAuditJSON={sanitizer.handleExportAuditJSON}
                    />
                  ) : null}

                  {activePage === 'how-it-works' ? <HowItWorks /> : null}

                  {activePage === 'privacy' ? <Privacy isOnline={isOnline} /> : null}

                {activePage === 'settings' ? (
                  <SettingsPage
                    theme={theme}
                    onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                    sanitizer={sanitizer}
                  />
                ) : null}
              </motion.div>
            </main>

            <Footer />
          </div>
        </div>

        <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </MotionConfig>
  );
}

export default App;
