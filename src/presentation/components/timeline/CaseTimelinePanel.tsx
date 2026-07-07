import { useEffect, useState } from 'react';
import { useRepositories } from '../../contexts/RepositoryContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Case } from '../../../domain/models/Sales';
import { buildCaseTimeline, type TimelineEvent } from '../../../lib/entityTimeline';
import { EntityTimeline } from './EntityTimeline';
import { TableSkeleton } from '../ui/Skeleton';

interface CaseTimelinePanelProps {
  caseItem: Case;
  clientName?: string;
}

export function CaseTimelinePanel({ caseItem, clientName }: CaseTimelinePanelProps) {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [documents, invoices, deadlines, activities, appointments] = await Promise.all([
          repos.documents.getByCase(tenantId, caseItem.id),
          repos.invoices.getAll(tenantId).then((all) => all.filter((i) => i.caseId === caseItem.id)),
          repos.deadlines.getByCase(tenantId, caseItem.id),
          repos.activities.getByEntity(tenantId, caseItem.id),
          repos.appointments.getAll(tenantId).then((all) => all.filter((a) => a.caseId === caseItem.id)),
        ]);
        setEvents(buildCaseTimeline({
          caseItem, clientName, documents, invoices, deadlines, activities, appointments,
        }));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [caseItem, clientName, tenantId, repos]);

  if (loading) return <TableSkeleton rows={4} />;
  return <EntityTimeline events={events} />;
}
