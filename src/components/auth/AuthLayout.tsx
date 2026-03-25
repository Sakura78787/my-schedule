import type { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 - 仅桌面端可见 */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
        {/* 装饰光斑 */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-400 dark:bg-blue-600 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-32 right-10 w-56 h-56 bg-indigo-400 dark:bg-indigo-600 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-purple-400 dark:bg-purple-600 rounded-full opacity-15 blur-3xl" />

        {/* 品牌内容 */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-bold mb-4">📅 个人日程助手</h1>
          <p className="text-lg text-blue-100 dark:text-gray-300 mb-10">
            轻松管理你的每一天
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">日程管理</h3>
                <p className="text-sm text-blue-100 dark:text-gray-400">按时段规划每一天，高效安排生活与工作</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">待办清单</h3>
                <p className="text-sm text-blue-100 dark:text-gray-400">支持优先级分类，灵感随时记录</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">📆</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">日历视图</h3>
                <p className="text-sm text-blue-100 dark:text-gray-400">月视图与周视图切换，全局掌控日程安排</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between p-4">
          {/* 移动端品牌 */}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white md:invisible">
            📅 个人日程助手
          </h2>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="切换主题"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* 表单内容居中 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fadeInUp">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
