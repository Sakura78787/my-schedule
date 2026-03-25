import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return '请输入邮箱地址';
  const emailRegex = /^[^\s@]+@(qq\.com|163\.com)$/i;
  if (!emailRegex.test(trimmed)) {
    return '仅支持 QQ邮箱(@qq.com) 和 163邮箱(@163.com)';
  }
  return null;
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, updatePassword, isRecoveryMode } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<AuthView>(() => {
    const urlView = searchParams.get('view');
    if (urlView === 'reset-password') return 'reset-password';
    return 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 当 Supabase 触发 PASSWORD_RECOVERY 事件时自动切换视图
  useEffect(() => {
    if (isRecoveryMode) {
      setView('reset-password');
      setError(null);
      setSuccess(null);
    }
  }, [isRecoveryMode]);

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (view === 'login') {
      setLoading(true);
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/schedule');
      }
      return;
    }

    if (view === 'register') {
      const emailError = validateEmail(email);
      if (emailError) { setError(emailError); return; }
      if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
      if (password.length < 6) { setError('密码长度至少为 6 位'); return; }

      setLoading(true);
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/schedule');
      }
      return;
    }

    if (view === 'forgot-password') {
      const emailError = validateEmail(email);
      if (emailError) { setError(emailError); return; }

      setLoading(true);
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        setSuccess('重置链接已发送到您的邮箱，请查收');
      }
      return;
    }

    if (view === 'reset-password') {
      if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
      if (password.length < 6) { setError('密码长度至少为 6 位'); return; }

      setLoading(true);
      const { error } = await updatePassword(password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/schedule');
      }
      return;
    }
  };

  const viewTitles: Record<AuthView, string> = {
    'login': '欢迎回来',
    'register': '创建账号',
    'forgot-password': '忘记密码',
    'reset-password': '重置密码',
  };

  const submitLabels: Record<AuthView, string> = {
    'login': '登录',
    'register': '注册',
    'forgot-password': '发送重置链接',
    'reset-password': '重置密码',
  };

  return (
    <AuthLayout>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {viewTitles[view]}
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          {view === 'login' && '登录以管理你的日程'}
          {view === 'register' && '注册一个新账号开始使用'}
          {view === 'forgot-password' && '输入邮箱，我们将发送重置链接'}
          {view === 'reset-password' && '请设置您的新密码'}
        </p>

        {/* 登录/注册 Tab 切换 */}
        {(view === 'login' || view === 'register') && (
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => switchView('login')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                view === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchView('register')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                view === 'register'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              注册
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱输入 - 登录/注册/忘记密码 */}
          {view !== 'reset-password' && (
            <AuthInput
              label="邮箱"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder=""
              hint={view !== 'login' ? '仅支持 QQ邮箱 和 163邮箱' : undefined}
            />
          )}

          {/* 密码输入 - 登录/注册/重置密码 */}
          {view !== 'forgot-password' && (
            <AuthInput
              label={view === 'reset-password' ? '新密码' : '密码'}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder=""
              hint={view !== 'login' ? '至少 6 位字符' : undefined}
            />
          )}

          {/* 确认密码 - 注册/重置密码 */}
          {(view === 'register' || view === 'reset-password') && (
            <AuthInput
              label="确认密码"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder=""
            />
          )}

          {/* 忘记密码链接 - 仅登录视图 */}
          {view === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchView('forgot-password')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                忘记密码？
              </button>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? '处理中...' : submitLabels[view]}
          </button>
        </form>

        {/* 底部链接 */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {view === 'login' && (
            <span>
              没有账号？{' '}
              <button onClick={() => switchView('register')} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                去注册
              </button>
            </span>
          )}
          {view === 'register' && (
            <span>
              已有账号？{' '}
              <button onClick={() => switchView('login')} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                去登录
              </button>
            </span>
          )}
          {(view === 'forgot-password' || view === 'reset-password') && (
            <button onClick={() => switchView('login')} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              返回登录
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
