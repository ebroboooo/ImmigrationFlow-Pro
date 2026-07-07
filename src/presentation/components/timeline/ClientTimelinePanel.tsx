import { useEffect, useState } from 'react';
import { useRepositories } from '../../contexts/RepositoryContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Client } from '../../../domain/models/CRM';
import { buildClientTimeline, type TimelineEvent } from '../../../lib/entityTimeline';
import { EntityTimeline } from './EntityTimeline';
import { TableSkeleton } from '../ui/Skeleton';

interface ClientTimelinePanelProps {
  client: Client;
}

export function ClientTimelinePanel({ client }: ClientTimelinePanelProps) {
  const { tenantId } = useAuth();
  const repos = useRepositories();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cases, documents, invoices, deadlines, appointments, activities, notes] = await Promise.all([
          repos.cases.getByClient(tenantId, client.id),
          repos.documents.getByClient(tenantId, client.id),
          repos.invoices.getByClient(tenantId, client.id),
          repos.deadlines.getByClient(tenantId, client.id),
          repos.appointments.getByClient(tenantId, client.id),
          repos.activities.getByEntity(tenantId, client.id),
          repos.clientNotes.getAll(tenantId).then((all) => all.filter((n) => n.clientId === client.id)),
        ]);
        setEvents(buildClientTimeline({
          client, cases, documents, invoices, deadlines, appointments, activities, notes,
        }));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [client, tenantId, repos]);

  if (loading) return <TableSkeleton rows={4} />;
  return <EntityTimeline events={events} />;
}
