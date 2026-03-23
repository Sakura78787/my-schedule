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

    const { error } = await supabase.from('todo').insert({
      user_id: user.id,
      content: newContent.trim(),
      remark: newRemark.trim() || null,
      priority: newPriority,
      is_completed: false,
      is_archived: false
    });

    if (!error) {
      setNewContent('');
      setNewRemark('');
      setNewPriority('medium');
      fetchTodos();
    }
  };

  const handleUpdateTodo = async (id: string) => {
    const { error } = await supabase
      .from('todo')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      setEditContent('');
      fetchTodos();
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await supabase.from('todo').delete().eq('id', id);
    setShowConfirm(null);
    fetchTodos();
  };

  const handleToggleComplete = async (item: TodoItem) => {
    await supabase
      .from('todo')
      .update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    fetchTodos();
  };

  const handleArchive = async (id: string) => {
    await supabase
      .from('todo')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchTodos();
  };

  const handleRestore = async (id: string) => {
    await supabase
      .from('todo')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchTodos();
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
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    };
    return colors[priority] || '';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">待办灵感</h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="切换主题"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'completed', 'high'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {{ all: '全部', pending: '未完成', completed: '已完成', high: '高优先级' }[f]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTab('active')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              活跃 ({todos.filter(t => !t.is_completed).length})
            </button>
            <button
              onClick={() => setTab('archived')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'archived'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              归档 ({archivedTodos.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">加载中...</div>
        ) : (
          <>
            {tab === 'active' && (
              <div className="space-y-3">
                {filteredTodos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {filter === 'all' ? '暂无待办' : '没有符合筛选条件的待办'}
                  </div>
                ) : (
                  filteredTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${
                        todo.is_completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            todo.is_completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}
                        >
                          {todo.is_completed && '✓'}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${getPriorityColor(todo.priority)} px-2 py-0.5 rounded`}>
                              {getPriorityLabel(todo.priority)}
                            </span>
                          </div>

                          {editingId === todo.id ? (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateTodo(todo.id)}
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
                              <p className={`text-gray-900 dark:text-white ${todo.is_completed ? 'line-through' : ''}`}>
                                {todo.content}
                              </p>
                              {todo.remark && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 cursor-pointer" onClick={() => setShowRemark(todo.id)}>
                                  📝 点击查看备注
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingId(todo.id); setEditContent(todo.content); }}
                            className="p-2 text-gray-400 hover:text-blue-500"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleArchive(todo.id)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => setShowConfirm(todo.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
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
              <div className="space-y-3">
                {archivedTodos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">暂无归档</div>
                ) : (
                  archivedTodos.map(todo => (
                    <div
                      key={todo.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${getPriorityColor(todo.priority)} px-2 py-0.5 rounded`}>
                              {getPriorityLabel(todo.priority)}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white line-through">{todo.content}</p>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(todo.id)}
                            className="p-2 text-gray-400 hover:text-green-500"
                          >
                            ↩️
                          </button>
                          <button
                            onClick={() => setShowConfirm(todo.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
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
        <div className="fixed bottom-20 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              placeholder="添加待办或灵感..."
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="备注（可选）"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <button
                onClick={handleAddTodo}
                disabled={!newContent.trim()}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">确定要永久删除这个待办吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTodo(showConfirm)}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">备注</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {todos.find(t => t.id === showRemark)?.remark}
            </p>
            <button
              onClick={() => setShowRemark(null)}
              className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={navigateToSchedule}
            className="flex-1 py-3 text-center text-gray-500 dark:text-gray-400 font-medium"
          >
            📅 日程规划
          </button>
          <button
            onClick={() => {}}
            className="flex-1 py-3 text-center text-blue-600 dark:text-blue-400 font-medium border-b-2 border-blue-500"
          >
            ✅ 待办灵感
          </button>
        </div>
      </nav>
    </div>
  );
}