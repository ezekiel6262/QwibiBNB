export type ScheduleInterval = "daily" | "weekly";

const INTERVAL_MS: Record<ScheduleInterval, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export function isScheduleInterval(value: string): value is ScheduleInterval {
  return value === "daily" || value === "weekly";
}

export function computeNextRun(interval: ScheduleInterval, from: Date = new Date()): Date {
  return new Date(from.getTime() + INTERVAL_MS[interval]);
}
