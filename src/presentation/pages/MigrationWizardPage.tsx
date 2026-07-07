import { MigrationWizardProvider } from '../contexts/MigrationWizardContext';
import { MigrationWizard as MigrationWizardView } from './MigrationWizard';

export function MigrationWizardPage() {
  return (
    <MigrationWizardProvider>
      <MigrationWizardView />
    </MigrationWizardProvider>
  );
}
