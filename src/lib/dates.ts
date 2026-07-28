import { differenceInMinutes, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

export const iso = (date: Date) => format(date, 'yyyy-MM-dd')
export const monthDays = (value: string) => eachDayOfInterval({
  start: startOfWeek(startOfMonth(parseISO(value)), { weekStartsOn: 1 }),
  end: endOfWeek(endOfMonth(parseISO(value)), { weekStartsOn: 1 }),
})
export const weekDays = (value: string) => eachDayOfInterval({
  start: startOfWeek(parseISO(value), { weekStartsOn: 1 }),
  end: endOfWeek(parseISO(value), { weekStartsOn: 1 }),
})
export const dateLabel = (value: string, language: 'zh' | 'en') =>
  format(parseISO(value), language === 'zh' ? 'M月d日 EEEE' : 'EEEE, MMM d', { locale: language === 'zh' ? zhCN : enUS })
export const monthLabel = (value: string, language: 'zh' | 'en') =>
  format(parseISO(value), language === 'zh' ? 'yyyy年 M月' : 'MMMM yyyy', { locale: language === 'zh' ? zhCN : enUS })
export const duration = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, differenceInMinutes(new Date(2000, 0, 1, eh, em), new Date(2000, 0, 1, sh, sm)))
}
