import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext';
import { CommandPaletteProvider } from '../../contexts/CommandPaletteContext';
import { CommandPalette } from '../search/CommandPalette';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { CalendarSyncProvider } from '../../contexts/CalendarSyncContext';
import { AiIntakeProvider } from '../../contexts/AiIntakeContext';
import { cn } from '../../../lib/utils';

function MainLayoutShell() {
  const { mobileOpen, closeMobileNav } = useNavigation();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar variant="desktop" />
      <Sidebar variant="tablet" />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden animate-in fade-in duration-200"
          onClick={closeMobileNav}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-out safe-top safe-bottom',
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal={mobileOpen}
        aria-label="Navigation menu"
      >
        <Sidebar variant="mobile" onNavigate={closeMobileNav} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-[1920px] mx-auto safe-bottom page-enter">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <PwaInstallPrompt />
    </div>
  );
}

export const MainLayout = () => (
  <CommandPaletteProvider>
    <NavigationProvider>
      <CalendarSyncProvider>
        <AiIntakeProvider>
          <MainLayoutShell />
        </AiIntakeProvider>
      </CalendarSyncProvider>
    </NavigationProvider>
  </CommandPaletteProvider>
);
