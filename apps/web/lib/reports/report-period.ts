/**
 * Report periods — every boundary is midnight in India (IST, UTC+5:30), so a
 * sale at 00:30 IST counts on the day Sarita saw it happen.
 *
 * A period is a half-open range [from, to): `from` is the first instant
 * included, `to` the first instant after it. Weeks run Monday to Sunday; the
 * financial year runs 1 April to 31 March.
 */

export const REPORT_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this-week', label: 'This week' },
  { key: 'last-week', label: 'Last week' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-fy', label: 'This financial year' },
  { key: 'last-fy', label: 'Last financial year' },
] as const;

export type ReportPreset = (typeof REPORT_PRESETS)[number]['key'];

export interface ReportPeriod {
  from: Date;
  to: Date;
  /** e.g. "This month (1 Oct – 31 Oct 2026)". */
  label: string;
  /** e.g. "2026-10-01_to_2026-10-31" — for download file names. */
  slug: string;
}

/** The longest custom range accepted — two financial years. */
const MAX_CUSTOM_DAYS = 731;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar date in India, with no time. Months are 1–12. */
interface IstDate {
  year: number;
  month: number;
  day: number;
}

function istDateOf(instant: Date): IstDate {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** The UTC instant of midnight IST at the start of a date (day may overflow; Date normalises it). */
function istMidnight(date: IstDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day) - IST_OFFSET_MS);
}

/** `YYYY-MM-DD` of the IST date an instant falls on — the key for day-by-day rows. */
export function istDateKey(instant: Date): string {
  const { year, month, day } = istDateOf(instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const rangeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function describe(from: Date, to: Date, name: string): ReportPeriod {
  const lastDay = new Date(to.getTime() - 1);
  const first = rangeFormatter.format(from);
  const last = rangeFormatter.format(lastDay);
  return {
    from,
    to,
    label: first === last ? `${name} (${first})` : `${name} (${first} – ${last})`,
    slug: `${istDateKey(from)}_to_${istDateKey(lastDay)}`,
  };
}

export function presetPeriod(preset: ReportPreset, now = new Date()): ReportPeriod {
  const today = istDateOf(now);
  const startOfToday = istMidnight(today);
  // Monday = 0 … Sunday = 6, read from the IST calendar date.
  const weekday = (new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay() + 6) % 7;
  const fyStartYear = today.month >= 4 ? today.year : today.year - 1;
  const name = REPORT_PRESETS.find((item) => item.key === preset)?.label ?? preset;

  switch (preset) {
    case 'today':
      return describe(startOfToday, new Date(startOfToday.getTime() + DAY_MS), name);
    case 'yesterday':
      return describe(new Date(startOfToday.getTime() - DAY_MS), startOfToday, name);
    case 'this-week': {
      const monday = istMidnight({ ...today, day: today.day - weekday });
      return describe(monday, new Date(monday.getTime() + 7 * DAY_MS), name);
    }
    case 'last-week': {
      const monday = istMidnight({ ...today, day: today.day - weekday - 7 });
      return describe(monday, new Date(monday.getTime() + 7 * DAY_MS), name);
    }
    case 'this-month':
      return describe(
        istMidnight({ year: today.year, month: today.month, day: 1 }),
        istMidnight({ year: today.year, month: today.month + 1, day: 1 }),
        name,
      );
    case 'last-month':
      return describe(
        istMidnight({ year: today.year, month: today.month - 1, day: 1 }),
        istMidnight({ year: today.year, month: today.month, day: 1 }),
        name,
      );
    case 'this-fy':
      return describe(
        istMidnight({ year: fyStartYear, month: 4, day: 1 }),
        istMidnight({ year: fyStartYear + 1, month: 4, day: 1 }),
        `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`,
      );
    case 'last-fy':
      return describe(
        istMidnight({ year: fyStartYear - 1, month: 4, day: 1 }),
        istMidnight({ year: fyStartYear, month: 4, day: 1 }),
        `FY ${fyStartYear - 1}-${String(fyStartYear % 100).padStart(2, '0')}`,
      );
  }
}

/** Parse `YYYY-MM-DD` as an IST date; null if it is not a real date. */
function parseIstDate(value: string): IstDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = istDateOf(istMidnight(date));
  return check.year === date.year && check.month === date.month && check.day === date.day ? date : null;
}

/**
 * A custom range, both days inclusive. Returns an error message instead of a
 * period when the dates are invalid, reversed or too far apart.
 */
export function customPeriod(fromDay: string, toDay: string): ReportPeriod | string {
  const first = parseIstDate(fromDay);
  const last = parseIstDate(toDay);
  if (!first || !last) return 'Enter two valid dates.';
  const from = istMidnight(first);
  const to = istMidnight({ ...last, day: last.day + 1 });
  if (to <= from) return 'The end date is before the start date.';
  if ((to.getTime() - from.getTime()) / DAY_MS > MAX_CUSTOM_DAYS) {
    return 'Choose a range of two years or less.';
  }
  return describe(from, to, 'Custom');
}

/** Every IST date key in a period, in order — so days with no sales still get a row. */
export function daysIn(period: ReportPeriod): string[] {
  const keys: string[] = [];
  for (let t = period.from.getTime(); t < period.to.getTime(); t += DAY_MS) {
    keys.push(istDateKey(new Date(t)));
  }
  return keys;
}

/**
 * The period a request asks for: `?from=YYYY-MM-DD&to=YYYY-MM-DD` for a
 * custom range, otherwise `?period=<preset>` (default: this month). Returns
 * an error message instead of a period when a custom range is invalid.
 */
export function resolvePeriod(params: { period?: string | null; from?: string | null; to?: string | null }):
  | ReportPeriod
  | string {
  if (params.from || params.to) {
    return customPeriod(params.from ?? '', params.to ?? '');
  }
  const preset = REPORT_PRESETS.find((item) => item.key === params.period)?.key ?? 'this-month';
  return presetPeriod(preset);
}
