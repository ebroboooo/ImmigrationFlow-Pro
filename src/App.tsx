import { ThemeProvider } from './presentation/contexts/ThemeContext';
import { RepositoryProvider } from './presentation/contexts/RepositoryContext';
import { SettingsProvider } from './presentation/contexts/SettingsContext';
import { AuthProvider } from './presentation/contexts/AuthContext';
import { AppRouter } from './presentation/routes/AppRouter';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <RepositoryProvider>
        <SettingsProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </SettingsProvider>
      </RepositoryProvider>
    </ThemeProvider>
  );
}

export default App;
