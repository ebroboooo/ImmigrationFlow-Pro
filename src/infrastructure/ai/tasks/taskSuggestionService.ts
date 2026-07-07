import { generateId } from '../../../lib/utils';
import type { ITaskSuggestionService } from '../../../domain/ai/services';
import type { RecommendationInput, SuggestedTask } from '../../../domain/ai/IntakeRecommendations';

export class TaskSuggestionService implements ITaskSuggestionService {
  suggestTasks(input: RecommendationInput): SuggestedTask[] {
    const { fields, documentType } = input;
    const tasks: SuggestedTask[] = [];
    const name = fields.clientName?.value ?? 'client';

    tasks.push({
      id: generateId(),
      title: `Review ${documentType} for ${name}`,
      description: 'Verify AI-extracted fields and scan for missing information.',
      priority: 'High',
      selected: true,
    });

    if (fields.receiptNumber?.value) {
      tasks.push({
        id: generateId(),
        title: 'Check USCIS case status online',
        description: `Verify status for receipt ${fields.receiptNumber.value}.`,
        priority: 'Medium',
        selected: true,
      });
    }

    if (documentType === 'RFE') {
      tasks.push({
        id: generateId(),
        title: 'Prepare RFE response package',
        description: 'Gather evidence and draft response before deadline.',
        priority: 'High',
        dueDate: fields.noticeDate?.value,
        selected: true,
      });
    }

    if (documentType === 'Interview Notice') {
      tasks.push({
        id: generateId(),
        title: 'Send interview preparation checklist',
        description: 'Email client with documents to bring and interview tips.',
        priority: 'High',
        dueDate: fields.interviewDate?.value,
        selected: true,
      });
    }

    return tasks;
  }
}

export const taskSuggestionService = new TaskSuggestionService();
