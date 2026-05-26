'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/auth';
import Header from '@/components/Header';
import EventForm from '../../_components/EventForm';

function EditEventContent() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/admin/events/${id}`)
      .then(r => r.json())
      .then(data => {
        setEvent(data.event || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: 'var(--text-muted)' }}>Événement introuvable</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Modifier l'événement"
        subtitle={String(event.title || '')}
      />
      <EventForm mode="edit" initialData={event as Parameters<typeof EventForm>[0]['initialData']} />
    </div>
  );
}

export default function EditEventPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    }>
      <EditEventContent />
    </Suspense>
  );
}
