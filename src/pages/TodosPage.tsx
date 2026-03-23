import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface TodoItem {
  id: string;
  user_id: string;
  content: string;
  remark: string | null;
  priority: 'high' | 'medium' | 'low';
  is_completed: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'pending' | 'completed' | 'high';
type TabType = 'active' | 'archived';

export default function TodosPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [archivedTodos, setArchivedTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [tab, setTab] = useState<TabType>('active');
  const [newContent, setNewContent] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showRemark, setShowRemark] = useState<string | null>(null);

  const navigateToSchedule = useCallback(() => {
    navigate('/schedule');
  }, [navigate]);

  const navigateToCalendar = useCallback(() => {
    navigate('/calendar');
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [activeRes, archivedRes] = await Promise.all([
      supabase
        .from('todo')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('todo')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })
    ]);

    if (!activeRes.error) setTodos(activeRes.data || []);
    if (!archivedRes.error) setArchivedTodos(archivedRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async () => {
    if (!user || !newContent.trim()) return;

    const tempId = Date.now().toString();
    const newItem: TodoItem = {
      id: tempId,
      user_id: user.id,
      content: newContent.trim(),
      remark: newRemark.trim() || null,
      priority: newPriority,
      is_completed: false,
      is_archived: false,
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
      is_archived: false
    });

    if (error) {
      setTodos(prev => prev.filter(item => item.id !== tempId));
    } else {
      fetchTodos();
    }
  };

  const handleUpdateTodo = async (id: string) => {
    const originalContent = todos.find(t => t.id === id)?.content;

    setTodos(prev => prev.map(item => 
      item.id === id ? { ...item, content: editContent } : item
    ));
    setEditingId(null);
    setEditContent('');

    const { error } = await supabase
      .from('todo')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error && originalContent) {
      setTodos(prev => prev.map(item => 
        item.id === id ? { ...item, content: originalContent } : item
      ));
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const deletedItem = todos.find(t => t.id === id) || archivedTodos.find(t => t.id === id);
    const isArchived = archivedTodos.some(t => t.id === id);

    setShowConfirm(null);
    if (isArchived) {
      setArchivedTodos(prev => prev.filter(item => item.id !== id));
    } else {
      setTodos(prev => prev.filter(item => item.id !== id));
    }

    const { error } = await supabase.from('todo').delete().eq('id', id);

    if (error && deletedItem) {
      if (isArchived) {
        setArchivedTodos(prev => [...prev, deletedItem]);
      } else {
        setTodos(prev => [...prev, deletedItem]);
      }
    }
  };

  const handleToggleComplete = async (item: TodoItem) => {
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

  const handleArchive = async (id: string) => {
    const archivedItem = todos.find(t => t.id === id);
    if (!archivedItem) return;

    setTodos(prev => prev.filter(item => item.id !== id));
    setArchivedTodos(prev => [{ ...archivedItem, is_archived: true }, ...prev]);

    const { error } = await supabase
      .from('todo')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setTodos(prev => [...prev, archivedItem]);
      setArchivedTodos(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleRestore = async (id: string) => {
    const restoredItem = archivedTodos.find(t => t.id === id);
    if (!restoredItem) return;

    setArchivedTodos(prev => prev.filter(item => item.id !== id));
    setTodos(prev => [{ ...restoredItem, is_archived: false }, ...prev]);

    const { error } = await supabase
      .from('todo')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setArchivedTodos(prev => [...prev, restoredItem]);
      setTodos(prev => prev.filter(item => item.id !== id));
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return !todo.is_completed;
    if (filter === 'completed') return todo.is_completed;
    if (filter === 'high') return todo.priority === 'high' && !todo.is_completed;
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 pb-40">
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
              待办灵感
            </h1>
            <div className="w-10"></div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'completed', 'high'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  filter === f
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {{ all: '全部', pending: '未完成', completed: '已完成', high: '高优先级' }[f]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTab('active')}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                tab === 'active'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              活跃 ({todos.filter(t => !t.is_completed).length})
            </button>
            <button
              onClick={() => setTab('archived')}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                tab === 'archived'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              归档 ({archivedTodos.length})
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
          <>
            {tab === 'active' && (
              <div className="space-y-4">
                {filteredTodos.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">✨</div>
                    <div className="text-lg">
                      {filter === 'all' ? '暂无待办，开始添加吧！' : '没有符合筛选条件的待办'}
                    </div>
                  </div>
                ) : (
                  filteredTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                        todo.is_completed ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className={`w-7 h-7 rounded-2xl border-3 flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-sm ${
                            todo.is_completed
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 text-white shadow-md shadow-green-500/30'
                              : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-amber-400'
                          }`}
                        >
                          {todo.is_completed && '✓'}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-2xl text-xs font-bold ${getPriorityColor(todo.priority)} shadow-md`}>
                              {getPriorityLabel(todo.priority)}
                            </span>
                          </div>

                          {editingId === todo.id ? (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateTodo(todo.id)}
                                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-2 text-xs font-bold bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className={`text-base font-medium ${
                                todo.is_completed
                                  ? 'line-through text-gray-400 dark:text-gray-500'
                                  : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {todo.content}
                              </p>
                              {todo.remark && (
                                <p
                                  className="text-sm text-gray-500 dark:text-gray-400 mt-2 cursor-pointer hover:text-amber-500 transition-colors"
                                  onClick={() => setShowRemark(todo.id)}
                                >
                                  📝 点击查看备注
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingId(todo.id); setEditContent(todo.content); }}
                            className="p-2.5 text-gray-400 hover:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-2xl transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleArchive(todo.id)}
                            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => setShowConfirm(todo.id)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl transition-all"
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

            {tab === 'archived' && (
              <div className="space-y-4">
                {archivedTodos.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">📦</div>
                    <div className="text-lg">暂无归档</div>
                  </div>
                ) : (
                  archivedTodos.map(todo => (
                    <div
                      key={todo.id}
                      className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 transition-all duration-300 opacity-70"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-2xl border-2 border-gray-300 dark:border-gray-500 flex-shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-2xl text-xs font-bold ${getPriorityColor(todo.priority)} shadow-md`}>
                              {getPriorityLabel(todo.priority)}
                            </span>
                          </div>
                          <p className="text-base font-medium line-through text-gray-400 dark:text-gray-500">
                            {todo.content}
                          </p>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(todo.id)}
                            className="p-2.5 text-gray-400 hover:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition-all"
                          >
                            ↩️
                          </button>
                          <button
                            onClick={() => setShowConfirm(todo.id)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl transition-all"
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
          </>
        )}
      </main>

      {tab === 'active' && (
        <div className="fixed bottom-20 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50 p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              placeholder="添加待办或灵感..."
              className="w-full px-4 py-3 text-base rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="备注（可选）"
                className="flex-1 px-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="px-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <button
                onClick={handleAddTodo}
                disabled={!newContent.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white text-base font-bold rounded-2xl shadow-md shadow-amber-500/30 hover:shadow-lg active:shadow-sm transition-all duration-200"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 m-4 max-w-sm w-full shadow-2xl">
            <div className="text-5xl mb-4 text-center">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">确定要永久删除这个待办吗？</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 px-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-800 dark:text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTodo(showConfirm)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-md shadow-red-500/30 hover:shadow-lg active:shadow-sm transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemark && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 m-4 max-w-sm w-full shadow-2xl">
            <div className="text-5xl mb-4 text-center">📝</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">备注</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center leading-relaxed">
              {todos.find(t => t.id === showRemark)?.remark}
            </p>
            <button
              onClick={() => setShowRemark(null)}
              className="w-full py-3 px-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-800 dark:text-white font-bold rounded-2xl shadow-md hover:shadow-lg active:shadow-sm transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={navigateToSchedule}
            className="flex-1 py-4 text-center text-gray-500 dark:text-gray-400 font-bold hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            📅 日程规划
          </button>
          <button
            onClick={navigateToCalendar}
            className="flex-1 py-4 text-center text-gray-500 dark:text-gray-400 font-bold hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            📆 日历视图
          </button>
          <button
            onClick={() => {}}
            className="flex-1 py-4 text-center text-amber-600 dark:text-amber-400 font-bold border-t-4 border-amber-500 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/20"
          >
            ✅ 待办灵感
          </button>
        </div>
      </nav>
    </div>
  );
}