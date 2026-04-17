import { useGuestExperience } from '../contexts/GuestExperienceContext';

export default function GuestBanner() {
  const { isGuest } = useGuestExperience();
  if (!isGuest) return null;
  return (
    <div
      className="mb-4 px-4 py-2 rounded-xl text-center text-sm font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-700/50"
      role="status"
    >
      游客体验：数据仅保存在本次会话，关闭或刷新页面后即清空
    </div>
  );
}
