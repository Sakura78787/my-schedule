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

interface TimeBlock {
  name: string;
  slots: string[];
  color: string;
}

const TIME_BLOCKS: TimeBlock[] = [
  {
    name: '早上',
    slots: ['08:00-12:00'],
    color: 'from-yellow-400 to-amber-500'
  },
  {
    name: '中午',
    slots: ['12:00-14:00'],
    color: 'from-orange-400 to-orange-600'
  },
  {
    name: '下午',
    slots: ['14:00-18:00'],
    color: 'from-amber-400 to-yellow-600'
  },
  {
    name: '晚上',
    slots: ['18:00-24:00'],
    color: 'from-indigo-500 to-purple-600'
  },
  {
    name: '凌晨',
    slots: ['00:00-08:00'],
    color: 'from-blue-600 to-indigo-700'
  }
];

const ALL_SLOTS = TIME_BLOCKS.flatMap(block => block.slots);
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

  useEffect(() => {
    if (!dateParam) {
      const checkDate = () => {
        const today = new Date().toISOString().split('T')[0];
        if (currentDate !== today) {
          setCurrentDate(today);
        }
      };
      const interval = setInterval(checkDate, 60000);
      return () => clearInterval(interval);
    }
  }, [currentDate, dateParam]);

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
      ALL_SLOTS.forEach(slot => { grouped[slot] = []; });
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

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    const dateStr = newDate.toISOString().split('T')[0];
    setCurrentDate(dateStr);
    navigate(`/schedule?date=${dateStr}`);
  };

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hours = now.getHours();
    for (const slot of ALL_SLOTS) {
      const [start] = slot.split('-');
      const startHour = parseInt(start.split(':')[0]);
      const endHour = startHour + (parseInt(slot.split('-')[1].split(':')[0]) - startHour);
      if (hours >= startHour && hours < endHour) {
        return slot;
      }
    }
    return null;
  };

  const isPastTimeSlot = (slot: string) => {
    if (!isToday) return false;
    const now = new Date();
    const [start] = slot.split('-');
    const startHour = parseInt(start.split(':')[0]);
    const endHour = startHour + (parseInt(slot.split('-')[1].split(':')[0]) - startHour);
    return now.getHours() >= endHour;
  };

  const isCurrentTimeSlot = (slot: string) => {
    if (!isToday) return false;
    return getCurrentTimeSlot() === slot;
  };

  const handleAddSchedule = async (timeSlot: string) => {
    if (!user || !newContent[timeSlot]?.trim()) return;
    const content = newContent[timeSlot].trim();
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      user_id: user.id,
      date: currentDate,
      time_slot: timeSlot,
      content,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSchedules(prev => ({
      ...prev,
      [timeSlot]: [...(prev[timeSlot] || []), newItem]
    }));
    setNewContent(prev => ({ ...prev, [timeSlot]: '' }));
    const { data, error } = await supabase
      .from('schedule')
      .insert([{
        user_id: user.id,
        date: currentDate,
        time_slot: timeSlot,
        content,
        is_completed: false
      }])
      .select();
    if (error) {
      fetchSchedules();
    }
  };

  const handleToggleComplete = async (id: string, timeSlot: string, currentState: boolean) => {
    setSchedules(prev => ({
      ...prev,
      [timeSlot]: prev[timeSlot].map(item => 
        item.id === id ? { ...item, is_completed: !currentState } : item
      )
    }));
    const { error } = await supabase
      .from('schedule')
      .update({ is_completed: !currentState })
      .eq('id', id);
    if (error) {
      fetchSchedules();
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    let originalContent = '';
    let timeSlot = '';
    for (const slot of ALL_SLOTS) {
      const item = schedules[slot]?.find(i => i.id === id);
      if (item) {
        originalContent = item.content;
        timeSlot = slot;
        break;
      }
    }
    setSchedules(prev => ({
      ...prev,
      [timeSlot]: prev[timeSlot].map(item => 
        item.id === id ? { ...item, content: editContent } : item
      )
    }));
    setEditingId(null);
    const { error } = await supabase
      .from('schedule')
      .update({ content: editContent })
      .eq('id', id);
    if (error) {
      fetchSchedules();
    }
  };

  const handleDeleteSchedule = async (id: string, timeSlot: string) => {
    const originalItems = [...(schedules[timeSlot] || [])];
    setSchedules(prev => ({
      ...prev,
      [timeSlot]: prev[timeSlot].filter(item => item.id !== id)
    }));
    setShowConfirm(null);
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('id', id);
    if (error) {
      setSchedules(prev => ({ ...prev, [timeSlot]: originalItems }));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  const getTimeBlockBySlot = (slot: string) => {
    return TIME_BLOCKS.find(block => block.slots.includes(slot));
  };

  return (
    <div className={`min-h-screen pb-56 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-2xl shadow-lg ${
              theme === 'dark' 
                ? 'bg-slate-800 text-yellow-400' 
                : 'bg-white text-slate-700'
            }`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={signOut}
            className={`px-4 py-2 rounded-xl font-medium ${
              theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            退出登录
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => changeDate(-1)}
            className={`p-4 rounded-3xl shadow-xl ${
              theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white'
            }`}
          >
            ←
          </button>
          <div className="text-center">
            <h1 className={`text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent`}>
              {formatDate(currentDate)}
            </h1>
            {isToday && (
              <p className="text-amber-500 mt-2 font-medium">✨ 今天</p>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className={`p-4 rounded-3xl shadow-xl ${
              theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white'
            }`}
          >
            →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : (
          <div className="space-y-6">
            {TIME_BLOCKS.map((block) => (
              <div key={block.name} className="space-y-3">
                <h2 className={`text-xl font-bold px-2 ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  {block.name}
                </h2>
                {block.slots.map((timeSlot) => {
                  const timeBlock = getTimeBlockBySlot(timeSlot);
                  return (
                    <div
                      key={timeSlot}
                      className={`p-6 rounded-3xl shadow-xl transition-all ${
                        isCurrentTimeSlot(timeSlot)
                          ? 'ring-4 ring-amber-400 scale-[1.02] bg-gradient-to-r from-amber-100 to-orange-100'
                          : isPastTimeSlot(timeSlot)
                          ? 'opacity-60'
                          : ''
                      } ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-xl font-bold bg-gradient-to-r ${timeBlock?.color} bg-clip-text text-transparent`}>
                          {timeSlot}
                        </span>
                        {isCurrentTimeSlot(timeSlot) && (
                          <span className="px-4 py-1 bg-green-400 text-green-900 rounded-full text-sm font-bold">
                            🎯 当前时段
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 mb-4">
                        {schedules[timeSlot]?.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl flex items-center gap-3 ${
                              item.is_completed
                                ? 'bg-green-100 text-green-700'
                                : theme === 'dark'
                                ? 'bg-slate-700'
                                : 'bg-slate-50'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleComplete(item.id, timeSlot, item.is_completed)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                item.is_completed
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white border-2 border-slate-300'
                              }`}
                            >
                              {item.is_completed && '✓'}
                            </button>
                            {editingId === item.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onBlur={() => handleUpdateSchedule(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateSchedule(item.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  autoFocus
                                  className={`flex-1 px-3 py-2 rounded-xl ${
                                    theme === 'dark' ? 'bg-slate-600 text-white' : 'bg-white'
                                  }`}
                                />
                              </>
                            ) : (
                              <span className={`flex-1 ${item.is_completed ? 'line-through' : ''}`}>
                                {item.content}
                              </span>
                            )}
                            {!item.is_completed && editingId !== item.id && (
                              <button
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditContent(item.content);
                                }}
                                className="text-slate-500 hover:text-blue-500"
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              onClick={() => setShowConfirm(item.id)}
                              className="text-slate-500 hover:text-red-500"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newContent[timeSlot] || ''}
                          onChange={(e) => setNewContent(prev => ({ ...prev, [timeSlot]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSchedule(timeSlot);
                          }}
                          placeholder="添加事项..."
                          className={`flex-1 px-4 py-3 rounded-2xl shadow-inner ${
                            theme === 'dark'
                              ? 'bg-slate-700 text-white placeholder-slate-400'
                              : 'bg-slate-50 placeholder-slate-400'
                          }`}
                        />
                        <button
                          onClick={() => handleAddSchedule(timeSlot)}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                          添加
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl w-full max-w-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2">确认删除</h2>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                确定要删除这个事项吗？
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(null)}
                className={`flex-1 py-3 rounded-2xl font-bold ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                }`}
              >
                取消
              </button>
              <button
                onClick={() => {
                  let timeSlot = '';
                  for (const slot of ALL_SLOTS) {
                    if (schedules[slot]?.find(i => i.id === showConfirm)) {
                      timeSlot = slot;
                      break;
                    }
                  }
                  handleDeleteSchedule(showConfirm, timeSlot);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl font-bold"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} px-4 py-3 pb-8`}>
        <div className="flex justify-around max-w-md mx-auto">
          <button
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          >
            <span className="text-2xl">📖</span>
            <span className="font-bold">微观</span>
          </button>
          <button
            onClick={navigateToCalendar}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all ${
              theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-2xl">📆</span>
            <span className="font-medium">宏观</span>
          </button>
          <button
            onClick={navigateToTodos}
            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all ${
              theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-2xl">✅</span>
            <span className="font-medium">待办灵感</span>
          </button>
        </div>
      </div>
    </div>
  );
}
