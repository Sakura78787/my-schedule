import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

interface CourseTemplate {
  id: string;
  user_id: string;
  name: string;
  semester_start: string;
  total_weeks: number;
  is_imported: boolean;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: string;
  template_id: string;
  user_id: string;
  name: string;
  day_of_week: number;
  time_slot: string;
  start_week: number;
  end_week: number;
  created_at: string;
}

const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TIME_SLOTS = [
  '08:00-10:00', '10:00-12:00', '12:00-14:00',
  '14:00-16:00', '16:00-18:00', '18:00-20:00',
  '20:00-22:00', '22:00-24:00',
];

function formatDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CoursePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // 学期配置
  const [template, setTemplate] = useState<CourseTemplate | null>(null);
  const [semesterName, setSemesterName] = useState('');
  const [semesterStart, setSemesterStart] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [editingTemplate, setEditingTemplate] = useState(false);

  // 课程列表
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 添加课程表单
  const [showAddForm, setShowAddForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(18);

  // 编辑课程
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editDayOfWeek, setEditDayOfWeek] = useState(1);
  const [editTimeSlot, setEditTimeSlot] = useState(TIME_SLOTS[0]);
  const [editStartWeek, setEditStartWeek] = useState(1);
  const [editEndWeek, setEditEndWeek] = useState(18);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const fetchTemplate = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('course_template')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setTemplate(data[0]);
      setSemesterName(data[0].name);
      setSemesterStart(data[0].semester_start);
      setTotalWeeks(data[0].total_weeks);
    }
  }, [user]);

  const fetchCourses = useCallback(async () => {
    if (!user || !template) return;
    setLoading(true);
    const { data } = await supabase
      .from('course')
      .select('*')
      .eq('template_id', template.id)
      .order('day_of_week')
      .order('time_slot');
    if (data) setCourses(data);
    setLoading(false);
  }, [user, template]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleCreateTemplate = async () => {
    if (!user || !semesterName.trim() || !semesterStart) return;
    const { data, error } = await supabase
      .from('course_template')
      .insert({ user_id: user.id, name: semesterName.trim(), semester_start: semesterStart, total_weeks: totalWeeks })
      .select()
      .single();
    if (!error && data) {
      setTemplate(data);
      setEditingTemplate(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!template) return;
    const { error } = await supabase
      .from('course_template')
      .update({ name: semesterName.trim(), semester_start: semesterStart, total_weeks: totalWeeks, updated_at: new Date().toISOString() })
      .eq('id', template.id);
    if (!error) {
      setTemplate({ ...template, name: semesterName.trim(), semester_start: semesterStart, total_weeks: totalWeeks });
      setEditingTemplate(false);
    }
  };

  const handleAddCourse = async () => {
    if (!user || !template || !courseName.trim()) return;
    const { error } = await supabase.from('course').insert({
      template_id: template.id,
      user_id: user.id,
      name: courseName.trim(),
      day_of_week: dayOfWeek,
      time_slot: timeSlot,
      start_week: startWeek,
      end_week: endWeek,
    });
    if (!error) {
      setCourseName('');
      setShowAddForm(false);
      fetchCourses();
    }
  };

  const handleUpdateCourse = async (id: string) => {
    const { error } = await supabase.from('course')
      .update({ name: editCourseName.trim(), day_of_week: editDayOfWeek, time_slot: editTimeSlot, start_week: editStartWeek, end_week: editEndWeek })
      .eq('id', id);
    if (!error) {
      setEditingCourseId(null);
      fetchCourses();
    }
  };

  const handleDeleteCourse = async (id: string) => {
    await supabase.from('course').delete().eq('id', id);
    fetchCourses();
  };

  // 计算将要生成的日程总数
  const totalSchedules = courses.reduce((sum, c) => sum + (c.end_week - c.start_week + 1), 0);

  // 一键生成日程
  const handleImport = async () => {
    if (!user || !template || courses.length === 0) return;
    setImporting(true);

    // 如果已导入过，先删除旧的
    if (template.is_imported) {
      await supabase.from('schedule').delete().eq('source_template_id', template.id);
    }

    const semStart = new Date(template.semester_start + 'T00:00:00');
    const items: { user_id: string; date: string; time_slot: string; content: string; is_completed: boolean; source_template_id: string }[] = [];

    for (const course of courses) {
      for (let week = course.start_week; week <= course.end_week; week++) {
        const date = new Date(semStart);
        date.setDate(date.getDate() + (week - 1) * 7 + (course.day_of_week - 1));
        items.push({
          user_id: user.id,
          date: formatDateString(date),
          time_slot: course.time_slot,
          content: course.name,
          is_completed: false,
          source_template_id: template.id,
        });
      }
    }

    // 分批插入（每批500条）
    for (let i = 0; i < items.length; i += 500) {
      await supabase.from('schedule').insert(items.slice(i, i + 500));
    }

    // 更新模板状态
    await supabase.from('course_template')
      .update({ is_imported: true, updated_at: new Date().toISOString() })
      .eq('id', template.id);

    setTemplate({ ...template, is_imported: true });
    setImporting(false);
  };

  // 按星期分组
  const coursesByDay = courses.reduce((acc, c) => {
    if (!acc[c.day_of_week]) acc[c.day_of_week] = [];
    acc[c.day_of_week].push(c);
    return acc;
  }, {} as Record<number, Course[]>);

  if (!user) return null;

  const cardClass = `rounded-2xl p-5 shadow-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`;
  const inputClass = `w-full px-3 py-2 rounded-xl ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`;
  const labelClass = `block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`;

  return (
    <div className={`min-h-screen pb-48 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'}`}>
      <div className="p-4 max-w-lg mx-auto">
        {/* 顶部 */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={toggleTheme} className={`p-3 rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-700'}`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">课表管理</h1>
          <div className="w-10" />
        </div>

        {/* 学期配置 */}
        <div className={`${cardClass} mb-4`}>
          <h2 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📅 学期配置</h2>
          {template && !editingTemplate ? (
            <div>
              <div className={`space-y-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <p><span className="font-medium">学期：</span>{template.name}</p>
                <p><span className="font-medium">开始日期：</span>{template.semester_start}（第一周周一）</p>
                <p><span className="font-medium">总周数：</span>{template.total_weeks} 周</p>
              </div>
              <button onClick={() => setEditingTemplate(true)} className="mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                修改
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>学期名称</label>
                <input type="text" value={semesterName} onChange={e => setSemesterName(e.target.value)} placeholder="如：大二下学期" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>学期开始日期（第一周周一）</label>
                <input type="date" value={semesterStart} onChange={e => setSemesterStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>总周数</label>
                <input type="number" value={totalWeeks} onChange={e => setTotalWeeks(Math.max(1, Math.min(30, Number(e.target.value))))} min={1} max={30} className={inputClass} />
              </div>
              <div className="flex gap-2">
                <button onClick={template ? handleUpdateTemplate : handleCreateTemplate} className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm">
                  {template ? '保存' : '创建学期'}
                </button>
                {template && (
                  <button onClick={() => { setEditingTemplate(false); setSemesterName(template.name); setSemesterStart(template.semester_start); setTotalWeeks(template.total_weeks); }} className="px-4 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-700">
                    取消
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 课程列表 */}
        {template && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>📚 课程列表</h2>
              <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold">
                {showAddForm ? '收起' : '+ 添加课程'}
              </button>
            </div>

            {/* 添加课程表单 */}
            {showAddForm && (
              <div className={`${cardClass} mb-4 space-y-3`}>
                <div>
                  <label className={labelClass}>课程名</label>
                  <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="如：高等数学" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>星期</label>
                    <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className={inputClass}>
                      {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>时间段</label>
                    <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className={inputClass}>
                      {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>起始周</label>
                    <input type="number" value={startWeek} onChange={e => setStartWeek(Math.max(1, Number(e.target.value)))} min={1} max={totalWeeks} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>结束周</label>
                    <input type="number" value={endWeek} onChange={e => setEndWeek(Math.min(totalWeeks, Number(e.target.value)))} min={1} max={totalWeeks} className={inputClass} />
                  </div>
                </div>
                <button onClick={handleAddCourse} disabled={!courseName.trim()} className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                  添加课程
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin text-4xl">⏳</div></div>
            ) : courses.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📚</div>
                <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>还没有课程，点击上方添加</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(coursesByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, dayCourses]) => (
                  <div key={day}>
                    <h3 className={`text-sm font-bold mb-2 px-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      {DAY_LABELS[Number(day)]}
                    </h3>
                    <div className="space-y-2">
                      {dayCourses.map(course => (
                        <div key={course.id} className={cardClass}>
                          {editingCourseId === course.id ? (
                            <div className="space-y-3">
                              <input type="text" value={editCourseName} onChange={e => setEditCourseName(e.target.value)} className={inputClass} />
                              <div className="grid grid-cols-2 gap-2">
                                <select value={editDayOfWeek} onChange={e => setEditDayOfWeek(Number(e.target.value))} className={inputClass}>
                                  {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                                </select>
                                <select value={editTimeSlot} onChange={e => setEditTimeSlot(e.target.value)} className={inputClass}>
                                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={editStartWeek} onChange={e => setEditStartWeek(Number(e.target.value))} min={1} max={totalWeeks} className={inputClass} placeholder="起始周" />
                                <input type="number" value={editEndWeek} onChange={e => setEditEndWeek(Number(e.target.value))} min={1} max={totalWeeks} className={inputClass} placeholder="结束周" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleUpdateCourse(course.id)} className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm">保存</button>
                                <button onClick={() => setEditingCourseId(null)} className="flex-1 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-700">取消</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{course.name}</p>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {course.time_slot} · 第{course.start_week}-{course.end_week}周
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingCourseId(course.id); setEditCourseName(course.name); setEditDayOfWeek(course.day_of_week); setEditTimeSlot(course.time_slot); setEditStartWeek(course.start_week); setEditEndWeek(course.end_week); }} className="p-2 text-slate-400 hover:text-blue-500">✏️</button>
                                <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-slate-400 hover:text-red-500">🗑️</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部操作区 */}
      {template && courses.length > 0 && (
        <div className={`fixed bottom-[4.5rem] left-0 right-0 z-10 ${theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-lg border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} px-4 py-3`}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              共 <span className="font-bold text-amber-500">{courses.length}</span> 门课，将生成 <span className="font-bold text-amber-500">{totalSchedules}</span> 条日程
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className={`px-5 py-2 rounded-xl font-bold text-sm shadow-lg transition-all ${
                importing
                  ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105'
              }`}
            >
              {importing ? '导入中...' : template.is_imported ? '重新导入' : '一键生成日程'}
            </button>
          </div>
        </div>
      )}

      <BottomNav active="course" />
    </div>
  );
}
