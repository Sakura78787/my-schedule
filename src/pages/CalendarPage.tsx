import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGuestExperience } from '../contexts/GuestExperienceContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import GuestBanner from '../components/GuestBanner';
import { getHoliday } from '../data/holidays';

interface ScheduleCount {
  [date: string]: number;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const FULL_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const formatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { isGuest, getScheduleCountsBetween } = useGuestExperience();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [scheduleCounts, setScheduleCounts] = useState<ScheduleCount>({});

  const navigateToSchedule = useCallback((date: string) => {
    navigate(`/schedule?date=${date}`);
  }, [navigate]);

  useEffect(() => {
    if (!user && !isGuest) {
      navigate('/auth');
    }
  }, [user, isGuest, navigate]);

  const fetchScheduleCounts = useCallback(async (startDate: Date, endDate: Date) => {
    const startStr = formatDateString(startDate);
    const endStr = formatDateString(endDate);

    if (isGuest) {
      setScheduleCounts(getScheduleCountsBetween(startStr, endStr));
      return;
    }
    if (!user) return;

    const { data, error } = await supabase
      .from('schedule')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr);

    if (!error && data) {
      const counts: ScheduleCount = {};
      data.forEach(item => {
        counts[item.date] = (counts[item.date] || 0) + 1;
      });
      setScheduleCounts(counts);
    }
  }, [user, isGuest, getScheduleCountsBetween]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, dateStr: formatDateString(d) });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, dateStr: formatDateString(d) });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, dateStr: formatDateString(d) });
    }

    return days;
  }, [currentMonth]);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    fetchScheduleCounts(
      new Date(year, month - 1, 15),
      new Date(year, month + 2, 15)
    );
  }, [currentMonth, fetchScheduleCounts]);

  const weekData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({ date: d, dateStr: formatDateString(d) });
    }

    return days;
  }, []);

  useEffect(() => {
    if (weekData.length > 0) {
      fetchScheduleCounts(weekData[0].date, weekData[6].date);
    }
  }, [weekData, fetchScheduleCounts]);

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatMonthYear = () => {
    return `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
  };

  if (!user && !isGuest) return null;

  return (
    <div className={`min-h-screen pb-16 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'}`}>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <GuestBanner />
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
              aria-label="切换主题"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  view === 'month'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                📅 月视图
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  view === 'week'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                📆 周视图
              </button>
            </div>
          </div>

          {view === 'month' && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
                {formatMonthYear()}
              </h1>
              <button
                onClick={() => changeMonth(1)}
                className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
              >
                →
              </button>
            </div>
          )}

          {view === 'week' && (
            <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
              本周视图
            </h1>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === 'month' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {WEEKDAYS.map((day, i) => (
                <div
                  key={day}
                  className={`text-center text-sm font-bold py-2 ${
                    i === 0 || i === 6
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarData.map(({ date, isCurrentMonth, dateStr }) => {
                const count = scheduleCounts[dateStr] || 0;
                const today = isToday(date);
                const holiday = getHoliday(dateStr);
                const isHoliday = holiday && !holiday.isWorkday;
                const isWorkday = holiday && holiday.isWorkday;

                return (
                  <button
                    key={dateStr}
                    onClick={() => navigateToSchedule(dateStr)}
                    className={`relative aspect-square rounded-2xl p-1.5 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-1 ${
                      !isCurrentMonth
                        ? 'bg-gray-50 dark:bg-gray-700/50 opacity-40'
                        : today
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                        : isHoliday
                        ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30'
                    }`}
                    title={holiday ? holiday.name + (isWorkday ? '（调休上班）' : '') : undefined}
                  >
                    {/* 节日名/班 标记 */}
                    {isHoliday && !today && isCurrentMonth && (
                      <span className="absolute top-0 left-0 right-0 text-center text-[9px] font-bold text-red-500 dark:text-red-400 leading-tight">
                        {holiday.name.slice(0, 2)}
                      </span>
                    )}
                    {isWorkday && !today && isCurrentMonth && (
                      <span className="absolute top-0.5 left-1 text-[9px] font-bold text-gray-400 dark:text-gray-500">班</span>
                    )}
                    <span className={`text-sm font-bold ${
                      today ? 'text-white'
                        : isHoliday ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {date.getDate()}
                    </span>
                    {count > 0 && (
                      <div className={`mt-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold ${
                        today
                          ? 'bg-white/30 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      }`}>
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="space-y-3">
            {weekData.map(({ date, dateStr }) => {
              const count = scheduleCounts[dateStr] || 0;
              const today = isToday(date);
              const holiday = getHoliday(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => navigateToSchedule(dateStr)}
                  className={`w-full bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
                    today ? 'ring-4 ring-amber-400/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-xl font-bold ${
                        today
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {FULL_WEEKDAYS[date.getDay()]}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {date.getMonth() + 1}月{date.getDate()}日
                        {today && <span className="ml-2 text-amber-500">✨ 今天</span>}
                        {holiday && (
                          <span className={`ml-2 ${holiday.isWorkday ? 'text-gray-400' : 'text-red-500'}`}>
                            {holiday.isWorkday ? `📋 ${holiday.name}调休` : `🎉 ${holiday.name}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {count > 0 && (
                        <div className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-md">
                          {count} 个日程
                        </div>
                      )}
                      <div className="text-2xl">→</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav active="calendar" />
    </div>
  );
}
