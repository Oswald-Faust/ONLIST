'use client';
import { Suspense } from 'react';
import Header from '@/components/Header';
import EventForm from '../_components/EventForm';

function NewEventContent() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Nouvel événement" subtitle="Remplir les informations en 3 étapes" />
      <EventForm mode="create" />
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(201,169,97,0.18)', borderTopColor: 'var(--primary)' }} />
      </div>
    }>
      <NewEventContent />
    </Suspense>
  );
}
