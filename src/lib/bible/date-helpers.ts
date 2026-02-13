import {
  format,
  formatDistanceToNow,
  getDaysInMonth,
  getDay,
  startOfWeek,
  addDays,
} from "date-fns";

export const daysInMonth = (year: number, month: number) => {
  return getDaysInMonth(new Date(year, month));
};

export const indexOfWeekday = (
  year: number,
  month: number,
  date: number
) => {
  return getDay(new Date(year, month, date));
};

export const weekFromDate = (
  year: number,
  month: number,
  date: number
) => {
  const referenceDate = new Date(year, month, date);
  const sunday = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const result: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(sunday, i);
    result.push(format(day, "yyyy-MM-dd"));
  }
  return result;
};

export const getWeekStartAndEnd = (
  year: number,
  month: number,
  date: number
) => {
  const week = weekFromDate(year, month, date);
  return {
    startDate: week[0],
    endDate: week[6],
  };
};

export const displayDate = (dateString: string) => {
  const date = new Date(dateString + "T00:00:00");
  return format(date, "EEEE, MMMM d, yyyy");
};

export const displayTimeSince = (dateTimeString: string) => {
  return formatDistanceToNow(new Date(dateTimeString), { addSuffix: true });
};

export const formatDateForInput = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

export const todayString = (): string => {
  return format(new Date(), "yyyy-MM-dd");
};
