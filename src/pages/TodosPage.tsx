import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGuestExperience } from '../contexts/GuestExperienceContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import GuestBanner from '../components/GuestBanner';

interface TodoItem {
  id: string;
  user_id: string;
  content: string;
  remark: string | null;
  priority: 'high' | 'medium' | 'low';
  is_completed: boolean;
  type: 'task' | 'idea';
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'pending' | 'completed' | 'high' | 'medium' | 'low';
type TabType = 'task' | 'idea';

export default function TodosPage() {
  const { user } = useAuth();
  const {
    isGuest,
    getSortedGuestTodos,
    addGuestTodo,
    updateGuestTodo,
    deleteGuestTodo,
    toggleGuestTodoComplete,
  } = useGuestExperience();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [tab, setTab] = useState<TabType>('task');
  const [newContent, setNewContent] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showRemark, setShowRemark] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !isGuest) {
      navigate('/auth');
    }
  }, [user, isGuest, navigate]);

  const fetchTodos = useCallback(async () => {
    if (isGuest) {
      setTodos(getSortedGuestTodos() as TodoItem[]);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('todo')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const priorityMap = { high: 0, medium: 1, low: 2 };
      const processed = data
        .map((item: TodoItem & { type?: string }) => ({ ...item, type: item.type || 'task' }))
        .sort((a: TodoItem, b: TodoItem) => {
          if (priorityMap[a.priority] !== priorityMap[b.priority]) {
            return priorityMap[a.priority] - priorityMap[b.priority];
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      setTodos(processed);
    }
    setLoading(false);
  }, [user, isGuest, getSortedGuestTodos]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async () => {
    if (!newContent.trim()) return;
    if (isGuest) {
      addGuestTodo({
        content: newContent.trim(),
        remark: newRemark.trim() || null,
        priority: newPriority,
        type: tab,
      });
      setNewContent('');
      setNewRemark('');
      setNewPriority('medium');
      return;
    }
    if (!user) return;

    const tempId = Date.now().toString();
    const newItem: TodoItem = {
      id: tempId,
      user_id: user.id,
      content: newContent.trim(),
      remark: newRemark.trim() || null,
      priority: newPriority,
      is_completed: false,
      type: tab,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTodos(prev => [newItem, ...prev]);
    setNewContent('');
    setNewRemark('');
    setNewPriority('medium');

    const { error } = await supabase.from('todo').insert({
      user_id: user.id,
      content: newItem.content,
      remark: newItem.remark,
      priority: newItem.priority,
      is_completed: false,
      type: tab
    });

    if (error) {
      setTodos(prev => prev.filter(item => item.id !== tempId));
    } else {
      fetchTodos();
    }
  };

  const handleUpdateTodo = async (id: string) => {
    if (isGuest) {
      updateGuestTodo(id, { content: editContent, priority: editPriority });
      setEditingId(null);
      return;
    }
    const originalItem = todos.find(t => t.id === id);

    setTodos(prev => prev.map(item =>
      item.id === id ? { ...item, content: editContent, priority: editPriority } : item
    ));
    setEditingId(null);

    const { error } = await supabase
      .from('todo')
      .update({ content: editContent, priority: editPriority, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error && originalItem) {
      setTodos(prev => prev.map(item =>
        item.id === id ? { ...item, content: originalItem.content, priority: originalItem.priority } : item
      ));
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (isGuest) {
      deleteGuestTodo(id);
      setShowConfirm(null);
      return;
    }
    const deletedItem = todos.find(t => t.id === id);

    setShowConfirm(null);
    setTodos(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase.from('todo').delete().eq('id', id);

    if (error && deletedItem) {
      setTodos(prev => [...prev, deletedItem]);
    }
  };

  const handleToggleComplete = async (item: TodoItem) => {
    if (isGuest) {
      toggleGuestTodoComplete(item.id);
      return;
    }
    setTodos(prev => prev.map(t =>
      t.id === item.id ? { ...t, is_completed: !t.is_completed } : t
    ));

    const { error } = await supabase
      .from('todo')
      .update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      setTodos(prev => prev.map(t =>
        t.id === item.id ? { ...t, is_completed: item.is_completed } : t
      ));
    }
  };

  const currentTodos = todos.filter(todo => todo.type === tab);
  const filteredTodos = currentTodos.filter(todo => {
    if (filter === 'pending') return !todo.is_completed;
    if (filter === 'completed') return todo.is_completed;
    if (filter === 'high') return todo.priority === 'high' && !todo.is_completed;
    if (filter === 'medium') return todo.priority === 'medium' && !todo.is_completed;
    if (filter === 'low') return todo.priority === 'low' && !todo.is_completed;
    return true;
  });

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = { high: '高', medium: '中', low: '低' };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      medium: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
      low: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    };
    return colors[priority] || '';
  };

  if (!user && !isGuest) return null;

  return (
    <div className={`min-h-screen pb-48 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'}`}>
      <div className="p-4">
        <GuestBanner />
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            {tab === 'task' ? '待办事项' : '奇思妙想'}
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="flex gap-3 mb-6">
          {(['task', 'idea'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 rounded-2xl text-lg font-bold transition-all duration-200 ${
                tab === t
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600'
              }`}
            >
              {t === 'task' ? '📋 待办事项' : '💡 奇思妙想'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {(['all', 'pending', 'completed', 'high', 'medium', 'low'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600'
              }`}
            >
              {{ all: '全部', pending: '未完成', completed: '已完成', high: '高优先', medium: '中优先', low: '低优先' }[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">✨</div>
                <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {filter === 'all' 
                    ? `暂无${tab === 'task' ? '待办事项' : '奇思妙想'}，开始添加吧！` 
                    : '没有符合筛选条件的内容'}
                </p>
              </div>
            ) : (
              filteredTodos.map(todo => (
                <div
                  key={todo.id}
                  className={`p-5 rounded-3xl shadow-xl transition-all ${
                    todo.is_completed ? 'opacity-70' : ''
                  } ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(todo)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        todo.is_completed
                          ? 'bg-green-500 text-white'
                          : 'bg-white border-2 border-slate-300'
                      }`}
                    >
                      {todo.is_completed && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getPriorityColor(todo.priority)}`}>
                          {getPriorityLabel(todo.priority)}
                        </span>
                      </div>
                      {editingId === todo.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTodo(todo.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className={`w-full px-3 py-2 rounded-xl ${
                              theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50'
                            }`}
                          />
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>优先级：</span>
                            <div className="flex gap-1">
                              {(['high', 'medium', 'low'] as const).map(p => (
                                <button
                                  key={p}
                                  onClick={() => setEditPriority(p)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    editPriority === p
                                      ? getPriorityColor(p)
                                      : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {getPriorityLabel(p)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateTodo(todo.id)}
                              className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={`flex-1 py-2 rounded-xl font-medium text-sm ${
                                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                              }`}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={`text-base ${
                            todo.is_completed
                              ? 'line-through text-slate-400'
                              : theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                          }`}>
                            {todo.content}
                          </p>
                          {todo.remark && (
                            <p
                              className={`text-sm mt-2 cursor-pointer ${
                                theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                              }`}
                              onClick={() => setShowRemark(todo.id)}
                            >
                              📝 点击查看备注
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!todo.is_completed && editingId !== todo.id && (
                        <button
                          onClick={() => { setEditingId(todo.id); setEditContent(todo.content); setEditPriority(todo.priority); }}
                          className="p-2 text-slate-400 hover:text-blue-500"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={() => setShowConfirm(todo.id)}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className={`fixed bottom-[4.5rem] left-0 right-0 z-10 ${theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} px-4 py-3`}>
        <div className="max-w-md mx-auto space-y-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
            placeholder={`添加${tab === 'task' ? '待办事项' : '奇思妙想'}...`}
            className={`w-full px-4 py-2 rounded-xl shadow-inner ${
              theme === 'dark'
                ? 'bg-slate-800 text-white placeholder-slate-500'
                : 'bg-slate-50 placeholder-slate-400'
            }`}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="备注（可选）"
              className={`flex-1 px-3 py-1.5 rounded-lg ${
                theme === 'dark' ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white placeholder-slate-400'
              }`}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
              className={`px-3 py-1.5 rounded-lg font-medium ${
                theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white'
              }`}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <button
              onClick={handleAddTodo}
              disabled={!newContent.trim()}
              className="px-5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl w-full max-w-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2">确认删除</h2>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                确定要永久删除吗？
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
                onClick={() => handleDeleteTodo(showConfirm)}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl font-bold"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`p-8 rounded-3xl w-full max-w-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-2">备注</h2>
            </div>
            <p className={`mb-8 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {todos.find(t => t.id === showRemark)?.remark}
            </p>
            <button
              onClick={() => setShowRemark(null)}
              className={`w-full py-3 rounded-2xl font-bold ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
              }`}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <BottomNav active="todos" />
    </div>
  );
}
