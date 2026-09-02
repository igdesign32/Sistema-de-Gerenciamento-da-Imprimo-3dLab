export const BUSINESS_TIME_ZONE = 'America/Fortaleza';

const businessDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
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

export function shiftBusinessDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function businessYearMonth(value = new Date()) {
  return businessDate(value).slice(0, 7);
}
