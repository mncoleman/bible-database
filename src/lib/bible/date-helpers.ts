import { format } from "date-fns";

export const todayString = (): string => {
  return format(new Date(), "yyyy-MM-dd");
};
