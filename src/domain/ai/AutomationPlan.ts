export type AutomationActionType =
  | 'create_client'
  | 'create_case'
  | 'attach_document'
  | 'generate_tasks'
  | 'generate_calendar_events'
  | 'generate_deadlines'
  | 'prepare_email'
  | 'create_internal_note';

export interface AutomationAction {
  type: AutomationActionType;
  label: string;
  description: string;
  selected: boolean;
  enabled: boolean;
}

export interface AutomationExecutionResult {
  action: AutomationActionType;
  success: boolean;
  entityId?: string;
  message: string;
}

export const DEFAULT_AUTOMATION_ACTIONS: Omit<AutomationAction, 'selected' | 'enabled'>[] = [
  { type: 'create_client', label: 'Create Client', description: 'Add a new client record from extracted information' },
  { type: 'create_case', label: 'Create Case', description: 'Open a new immigration case' },
  { type: 'attach_document', label: 'Attach Document', description: 'Save the uploaded file to the firm document library' },
  { type: 'generate_tasks', label: 'Generate Tasks', description: 'Create selected recommended tasks' },
  { type: 'generate_calendar_events', label: 'Generate Calendar Events', description: 'Create selected calendar appointments' },
  { type: 'generate_deadlines', label: 'Generate Deadlines', description: 'Create selected deadline entries' },
  { type: 'prepare_email', label: 'Prepare Email Draft', description: 'Save email draft for review (does not send)' },
  { type: 'create_internal_note', label: 'Create Internal Note', description: 'Add AI summary as an internal client note' },
];
