import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ScheduleItem {
  id: string;
  user_id: string;
  date: string;
  time_slot: string;
  content: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

const TIME_SLOTS = [
  '00:00-02:00', '02:00-04:00', '04:00-06:00', '06:00-08:00',
  '08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00',
  '16:00-18:00', '18:00-20:00', '20:00-22:00', '22:00-24:00'
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function SchedulePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [currentDate, setCurrentDate] = useState(dateParam || new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const navigateToTodos = useCallback(() => {
    navigate('/todos');
  }, [navigate]);

  const navigateToCalendar = useCallback(() => {
    navigate('/calendar');
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (dateParam) {
      setCurrentDate(dateParam);
    }
  }, [dateParam]);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', currentDate)
      .order('time_slot');

    if (!error && data) {
      const grouped: Record<string, ScheduleItem[]> = {};
      TIME_SLOTS.forEach(slot => { grouped[slot] = []; });
      data.forEach((item: ScheduleItem) => {
        if (grouped[item.time_slot]) {
          grouped[item.time_slot].push(item);
        }
      });
      setSchedules(grouped);
    }
    setLoading(false);
  }, [user, currentDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleAddSchedule = async (timeSlot: string) => {
    if (!user || !newContent[timeSlot]?.trim()) return;

    const tempId = Date.now().toString();
    const newItem: ScheduleItem = {
      id: tempId,
      user_id: user.id,
      date: currentDate,
      time_slot: timeSlot,
      content: newContent[timeSlot].trim(),
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setSchedules(prev => ({
      ...prev,
      [timeSlot]: [...(prev[timeSlot] || []), newItem]
    }));
    setNewContent(prev => ({ ...prev, [timeSlot]: '' }));

    const { error } = await supabase.from('schedule').insert({
      user_id: user.id,
      date: currentDate,
      time_slot: timeSlot,
      content: newItem.content,
      is_completed: false
    });

    if (error) {
      setSchedules(prev => ({
        ...prev,
        [timeSlot]: (prev[timeSlot] || []).filter(item => item.id !== tempId)
      }));
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    let originalContent = '';
    
    for (const slot of Object.keys(schedules)) {
      const item = schedules[slot]?.find(i => i.id === id);
      if (item) {
        originalContent = item.content;
        break;
      }
    }

    setSchedules(prev => {
      const newSchedules = { ...prev };
      for (const slot of Object.keys(newSchedules)) {
        newSchedules[slot] = newSchedules[slot].map(item => 
          item.id === id ? { ...item, content: editContent } : item
        );
      }
      return newSchedules;
    });
    setEditingId(null);
    setEditContent('');

    const { error } = await supabase
      .from('schedule')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error && originalContent) {
      setSchedules(prev => {
        const newSchedules = { ...prev };
        for (const slot of Object.keys(newSchedules)) {
          newSchedules[slot] = newSchedules[slot].map(item => 
            item.id === id ? { ...item, content: originalContent } : item
          );
        }
        return newSchedules;
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    let deletedSlot: string | null = null;
    let deletedItem: ScheduleItem | null = null;
    
    for (const slot of Object.keys(schedules)) {
      const item = schedules[slot]?.find(i => i.id === id);
      if (item) {
        deletedSlot = slot;
        deletedItem = item;
        break;
      }
    }

    setShowConfirm(null);
    if (deletedSlot) {
      setSchedules(prev => ({
        ...prev,
        [deletedSlot]: (prev[deletedSlot] || []).filter(item => item.id !== id)
      }));
    }

    const { error } = await supabase.from('schedule').delete().eq('id', id);

    if (error && deletedSlot && deletedItem) {
      setSchedules(prev => ({
        ...prev,
        [deletedSlot]: [...(prev[deletedSlot] || []), deletedItem]
      }));
    }
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    setSchedules(prev => {
      const newSchedules = { ...prev };
      for (const slot of Object.keys(newSchedules)) {
        newSchedules[slot] = newSchedules[slot].map(i => 
          i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
        );
      }
      return newSchedules;
    });

    const { error } = await supabase
      .from('schedule')
      .update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      setSchedules(prev => {
        const newSchedules = { ...prev };
        for (const slot of Object.keys(newSchedules)) {
          newSchedules[slot] = newSchedules[slot].map(i => 
            i.id === item.id ? { ...i, is_completed: item.is_completed } : i
          );
        }
        return newSchedules;
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const changeDate = (days: number) => {
    const newDate = new Date(new Date(currentDate).getTime() + days * 86400000);
    setCurrentDate(newDate.toISOString().split('T')[0]);
  };

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hour = now.getHours();
    return `${hour.toString().padStart(2, '0')}:00-${(hour + 2).toString().padStart(2, '0')}:00`;
  };

  const isPastSlot = (timeSlot: string) => {
    const now = new Date();
    const currentHour = now.getHours();
    const [start] = timeSlot.split('-').map(t => parseInt(t.split(':')[0]));
    return start < currentHour;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 pb-28">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
              aria-label="切换主题"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={handleSignOut}
              className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
            >
              退出登录
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
            >
              ←
            </button>
            <div className="text-center">
              <div className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
                {formatDate(currentDate)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentDate === new Date().toISOString().split('T')[0] ? '✨ 今天' : currentDate}
              </div>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200"
            >
              →
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-lg">加载中...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {TIME_SLOTS.map((timeSlot) => {
              const isCurrent = timeSlot === getCurrentTimeSlot() && currentDate === new Date().toISOString().split('T')[0];
              const isPast = isPastSlot(timeSlot);
              const items = schedules[timeSlot] || [];

              return (
                <div
                  key={timeSlot}
                  className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                    isCurrent ? 'ring-4 ring-amber-400/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' : ''
                  } ${isPast ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`px-4 py-1.5 rounded-2xl font-bold text-sm ${
                      isCurrent 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {timeSlot}
                    </div>
                    {isCurrent && (
                      <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-md shadow-green-500/30 animate-pulse">
                        🎯 当前时段
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${
                          item.is_completed 
                            ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800' 
                            : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-md'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleComplete(item)}
                          className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-sm ${
                            item.is_completed 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 text-white shadow-md shadow-green-500/30' 
                              : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-amber-400'
                          }`}
                        >
                          {item.is_completed && '✓'}
                        </button>

                        {editingId === item.id ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateSchedule(item.id)}
                              className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-xs font-medium bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={`flex-1 text-sm font-medium ${
                              item.is_completed 
                                ? 'line-through text-gray-400 dark:text-gray-500' 
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {item.content}
                            </span>
                            <button
                              onClick={() => { setEditingId(item.id); setEditContent(item.content); }}
                              className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setShowConfirm(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <input
                      type="text"
                      value={newContent[timeSlot] || ''}
                      onChange={(e) => setNewContent(prev => ({ ...prev, [timeSlot]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSchedule(timeSlot)}
                      placeholder="添加事项..."
                      className="flex-1 px-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => handleAddSchedule(timeSlot)}
                      className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-2xl shadow-md shadow-amber-500/30 hover:shadow-lg active:shadow-sm transition-all duration-200"
                    >
                      添加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 m-4 max-w-sm w-full shadow-2xl">
            <div className="text-5xl mb-4 text-center">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">确定要删除这个事项吗？</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 px-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-800 dark:text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteSchedule(showConfirm)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-md shadow-red-500/30 hover:shadow-lg active:shadow-sm transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => {}}
            className="flex-1 py-4 text-center text-amber-600 dark:text-amber-400 font-bold border-t-4 border-amber-500 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/20"
          >
            📖 微观
          </button>
          <button
            onClick={navigateToCalendar}
            className="flex-1 py-4 text-center text-gray-500 dark:text-gray-400 font-bold hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            📆 宏观
          </button>
          <button
            onClick={navigateToTodos}
            className="flex-1 py-4 text-center text-gray-500 dark:text-gray-400 font-bold hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            ✅ 待办灵感
          </button>
        </div>
      </nav>
    </div>
  );
}
