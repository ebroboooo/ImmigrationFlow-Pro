import { ThemeProvider } from './presentation/contexts/ThemeContext';
import { RepositoryProvider } from './presentation/contexts/RepositoryContext';
import { SettingsProvider } from './presentation/contexts/SettingsContext';
import { AuthProvider } from './presentation/contexts/AuthContext';
import { ToastProvider } from './presentation/contexts/ToastContext';
import { AppRouter } from './presentation/routes/AppRouter';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <RepositoryProvider>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </RepositoryProvider>
    </ThemeProvider>
  );
}

export default App;
