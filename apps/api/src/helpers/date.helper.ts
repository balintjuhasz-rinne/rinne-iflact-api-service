import moment, { MomentInput } from 'moment-timezone';

export const formatDate = (date: string | Date, { tz }: { tz?: string } = {}) => {
  const momentDate = tz ? moment(date).tz(tz) : moment(date);
  return momentDate.format('DD MMM YYYY');
};

export const formatYMDHISDate = (date: string | Date, { tz }: { tz?: string } = {}) => {
  const momentDate = tz ? moment(date).tz(tz) : moment(date);
  return momentDate.format('YYYY-MM-DD HH:mm:ss');
};

export const getDaysBefore = (date: MomentInput, isRegular: boolean = false) => {
  const eventDate = moment(date).startOf('day');
  const today = moment().startOf('day');

  return isRegular
    ? regularDiff(eventDate, today)
    : eventDate.diff(today, 'days');
};

const regularDiff = (eventDate, today) => {
  let diff = eventDate.year(today.year()).diff(today, 'days');
  if (diff < 0) {
    diff = eventDate.year(today.year() + 1).diff(today, 'days');
  }
  return diff;
};
