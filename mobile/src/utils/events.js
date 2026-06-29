function parseEventTime(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return null;

  const normalized = timeValue.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (!meridiem && hours > 23) return null;
  if (hours > 23) return null;

  return { hours, minutes };
}

export function getEventCutoffDate(event) {
  if (!event?.date) return null;

  const baseDate = new Date(event.date);
  if (Number.isNaN(baseDate.getTime())) return null;

  const parsedTime = parseEventTime(event.startTime || event.requiredArrivalTime);
  if (parsedTime) {
    baseDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    return baseDate;
  }

  // Sans heure explicite, on garde l'événement visible jusqu'à la fin du jour local.
  baseDate.setHours(23, 59, 59, 999);
  return baseDate;
}

export function isUpcomingEvent(event, now = new Date()) {
  const cutoffDate = getEventCutoffDate(event);
  if (!cutoffDate) return false;
  return cutoffDate.getTime() >= now.getTime();
}

export function filterUpcomingEvents(events, now = new Date()) {
  return (events || []).filter((event) => isUpcomingEvent(event, now));
}

export function filterUpcomingApplications(applications, now = new Date()) {
  return (applications || []).filter((application) => isUpcomingEvent(application?.event, now));
}
