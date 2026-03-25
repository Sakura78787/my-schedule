import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

type TabName = 'schedule' | 'calendar' | 'todos' | 'course';

interface BottomNavProps {
  active: TabName;
}

const tabs: { name: TabName; label: string; icon: string; route: string }[] = [
  { name: 'schedule', label: '微观', icon: '📖', route: '/schedule' },
  { name: 'calendar', label: '宏观', icon: '📆', route: '/calendar' },
  { name: 'todos',    label: '思绪', icon: '💭', route: '/todos' },
  { name: 'course',   label: '课表', icon: '📚', route: '/course' },
];

export default function BottomNav({ active }: BottomNavProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-20 ${
      theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95'
    } backdrop-blur-lg border-t ${
      theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
    } px-4 py-2 pb-5`}>
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.name}
            onClick={() => { if (tab.name !== active) navigate(tab.route); }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              tab.name === active
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className={`text-xs ${tab.name === active ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
