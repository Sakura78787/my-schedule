import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

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

export default function SchedulePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const navigateToTodos = useCallback(() => {
    navigate('/todos');
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

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

    const { error } = await supabase.from('schedule').insert({
      user_id: user.id,
      date: currentDate,
      time_slot: timeSlot,
      content: newContent[timeSlot].trim(),
      is_completed: false
    });

    if (!error) {
      setNewContent(prev => ({ ...prev, [timeSlot]: '' }));
      fetchSchedules();
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    const { error } = await supabase
      .from('schedule')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      setEditContent('');
      fetchSchedules();
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    await supabase.from('schedule').delete().eq('id', id);
    setShowConfirm(null);
    fetchSchedules();
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    await supabase
      .from('schedule')
      .update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    fetchSchedules();
  };

  const handleCopyFromYesterday = async () => {
    if (!user) return;
    const yesterday = new Date(new Date(currentDate).getTime() - 86400000).toISOString().split('T')[0];
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', yesterday);

    if (data && data.length > 0) {
      const itemsToInsert = data.map((item: ScheduleItem) => ({
        user_id: user.id,
        date: currentDate,
        time_slot: item.time_slot,
        content: item.content,
        is_completed: false
      }));
      await supabase.from('schedule').insert(itemsToInsert);
      fetchSchedules();
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
    return `${date.getMonth() + 1}月${date.getDate()}日 ${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="切换主题"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
            >
              退出登录
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              ←
            </button>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDate(currentDate)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {currentDate === new Date().toISOString().split('T')[0] ? '今天' : currentDate}
              </div>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              →
            </button>
          </div>

          <button
            onClick={handleCopyFromYesterday}
            className="mt-4 w-full py-2 px-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            复制昨日日程
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">加载中...</div>
        ) : (
          <div className="space-y-3">
            {TIME_SLOTS.map((timeSlot) => {
              const isCurrent = timeSlot === getCurrentTimeSlot() && currentDate === new Date().toISOString().split('T')[0];
              const isPast = isPastSlot(timeSlot);
              const items = schedules[timeSlot] || [];

              return (
                <div
                  key={timeSlot}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm transition-all ${
                    isCurrent ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-sm font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {timeSlot}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">当前</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${item.is_completed ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                      >
                        <button
                          onClick={() => handleToggleComplete(item)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            item.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-500'
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
                              className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateSchedule(item.id)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                              {item.content}
                            </span>
                            <button
                              onClick={() => { setEditingId(item.id); setEditContent(item.content); }}
                              className="p-1 text-gray-400 hover:text-blue-500"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setShowConfirm(item.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newContent[timeSlot] || ''}
                      onChange={(e) => setNewContent(prev => ({ ...prev, [timeSlot]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSchedule(timeSlot)}
                      placeholder="添加事项..."
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddSchedule(timeSlot)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      添加
                    </button>
                  </div>

                  {showConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">确认删除</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">确定要删除这个事项吗？</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(showConfirm)}
                            className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => {}}
            className="flex-1 py-3 text-center text-blue-600 dark:text-blue-400 font-medium border-b-2 border-blue-500"
          >
            📅 日程规划
          </button>
          <button
            onClick={navigateToTodos}
            className="flex-1 py-3 text-center text-gray-500 dark:text-gray-400 font-medium"
          >
            ✅ 待办灵感
          </button>
        </div>
      </nav>
    </div>
  );
}