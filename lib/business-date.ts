const businessDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function businessDate(value = new Date()) {
  const parts = Object.fromEntries(businessDateFormatter.formatToParts(value).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function businessDateUnix(value = new Date()) {
  return Math.floor(new Date(`${businessDate(value)}T12:00:00Z`).getTime() / 1000);
}
