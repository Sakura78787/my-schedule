import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

const GUEST_USER_ID = 'guest';

export interface GuestScheduleItem {
  id: string;
  user_id: string;
  date: string;
  time_slot: string;
  content: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  source_template_id?: string | null;
}

export interface GuestTodoItem {
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

export interface GuestCourseTemplate {
  id: string;
  user_id: string;
  name: string;
  semester_start: string;
  total_weeks: number;
  is_imported: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestCourse {
  id: string;
  template_id: string;
  user_id: string;
  name: string;
  day_of_week: number;
  time_slot: string;
  start_week: number;
  end_week: number;
  week_type: 'all' | 'odd' | 'even';
  remark: string | null;
  created_at: string;
}

function formatDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function newId() {
  return crypto.randomUUID();
}

type GuestExperienceContextType = {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  clearGuestBecauseUserLoggedIn: () => void;

  schedules: GuestScheduleItem[];
  getGroupedSchedulesForDate: (
    date: string,
    allSlots: string[]
  ) => Record<string, GuestScheduleItem[]>;
  getScheduleCountsBetween: (startStr: string, endStr: string) => Record<string, number>;
  addGuestSchedule: (input: {
    date: string;
    time_slot: string;
    content: string;
  }) => void;
  updateGuestSchedule: (id: string, patch: { content?: string; is_completed?: boolean }) => void;
  deleteGuestSchedule: (id: string) => void;

  todos: GuestTodoItem[];
  getSortedGuestTodos: () => GuestTodoItem[];
  addGuestTodo: (input: {
    content: string;
    remark: string | null;
    priority: 'high' | 'medium' | 'low';
    type: 'task' | 'idea';
  }) => void;
  updateGuestTodo: (
    id: string,
    patch: { content?: string; priority?: 'high' | 'medium' | 'low' }
  ) => void;
  deleteGuestTodo: (id: string) => void;
  toggleGuestTodoComplete: (id: string) => void;

  courseTemplate: GuestCourseTemplate | null;
  courses: GuestCourse[];
  setGuestCourseTemplate: (t: GuestCourseTemplate | null) => void;
  createGuestCourseTemplate: (input: {
    name: string;
    semester_start: string;
    total_weeks: number;
  }) => GuestCourseTemplate;
  updateGuestCourseTemplate: (patch: {
    name: string;
    semester_start: string;
    total_weeks: number;
  }) => void;
  addGuestCourse: (input: {
    name: string;
    day_of_week: number;
    time_slot: string;
    start_week: number;
    end_week: number;
    week_type: 'all' | 'odd' | 'even';
    remark: string | null;
  }) => void;
  updateGuestCourse: (
    id: string,
    patch: Partial<
      Pick<
        GuestCourse,
        | 'name'
        | 'day_of_week'
        | 'time_slot'
        | 'start_week'
        | 'end_week'
        | 'week_type'
        | 'remark'
      >
    >
  ) => void;
  deleteGuestCourse: (id: string) => void;
  importGuestCoursesToSchedules: () => void;
};

const GuestExperienceContext = createContext<GuestExperienceContextType | undefined>(undefined);

function emptyGuestState() {
  return {
    schedules: [] as GuestScheduleItem[],
    todos: [] as GuestTodoItem[],
    courseTemplate: null as GuestCourseTemplate | null,
    courses: [] as GuestCourse[],
  };
}

export function GuestExperienceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isGuest, setIsGuest] = useState(false);
  const [schedules, setSchedules] = useState<GuestScheduleItem[]>([]);
  const [todos, setTodos] = useState<GuestTodoItem[]>([]);
  const [courseTemplate, setCourseTemplateState] = useState<GuestCourseTemplate | null>(null);
  const [courses, setCourses] = useState<GuestCourse[]>([]);

  const resetAll = useCallback(() => {
    const e = emptyGuestState();
    setSchedules(e.schedules);
    setTodos(e.todos);
    setCourseTemplateState(e.courseTemplate);
    setCourses(e.courses);
  }, []);

  const enterGuestMode = useCallback(() => {
    resetAll();
    setIsGuest(true);
    navigate('/schedule');
  }, [navigate, resetAll]);

  const exitGuestMode = useCallback(() => {
    resetAll();
    setIsGuest(false);
    navigate('/auth');
  }, [navigate, resetAll]);

  const clearGuestBecauseUserLoggedIn = useCallback(() => {
    resetAll();
    setIsGuest(false);
  }, [resetAll]);

  const getGroupedSchedulesForDate = useCallback(
    (date: string, allSlots: string[]) => {
      const grouped: Record<string, GuestScheduleItem[]> = {};
      allSlots.forEach((slot) => {
        grouped[slot] = [];
      });
      schedules.forEach((item) => {
        if (item.date === date && grouped[item.time_slot]) {
          grouped[item.time_slot].push(item);
        }
      });
      return grouped;
    },
    [schedules]
  );

  const getScheduleCountsBetween = useCallback(
    (startStr: string, endStr: string) => {
      const counts: Record<string, number> = {};
      schedules.forEach((item) => {
        if (item.date >= startStr && item.date <= endStr) {
          counts[item.date] = (counts[item.date] || 0) + 1;
        }
      });
      return counts;
    },
    [schedules]
  );

  const addGuestSchedule = useCallback(
    (input: { date: string; time_slot: string; content: string }) => {
      const now = new Date().toISOString();
      const item: GuestScheduleItem = {
        id: newId(),
        user_id: GUEST_USER_ID,
        date: input.date,
        time_slot: input.time_slot,
        content: input.content,
        is_completed: false,
        created_at: now,
        updated_at: now,
      };
      setSchedules((prev) => [...prev, item]);
    },
    []
  );

  const updateGuestSchedule = useCallback(
    (id: string, patch: { content?: string; is_completed?: boolean }) => {
      const now = new Date().toISOString();
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...patch,
                updated_at: now,
              }
            : s
        )
      );
    },
    []
  );

  const deleteGuestSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getSortedGuestTodos = useCallback(() => {
    const priorityMap = { high: 0, medium: 1, low: 2 };
    return [...todos].sort((a, b) => {
      if (priorityMap[a.priority] !== priorityMap[b.priority]) {
        return priorityMap[a.priority] - priorityMap[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [todos]);

  const addGuestTodo = useCallback(
    (input: {
      content: string;
      remark: string | null;
      priority: 'high' | 'medium' | 'low';
      type: 'task' | 'idea';
    }) => {
      const now = new Date().toISOString();
      const item: GuestTodoItem = {
        id: newId(),
        user_id: GUEST_USER_ID,
        content: input.content,
        remark: input.remark,
        priority: input.priority,
        is_completed: false,
        type: input.type,
        created_at: now,
        updated_at: now,
      };
      setTodos((prev) => [item, ...prev]);
    },
    []
  );

  const updateGuestTodo = useCallback(
    (
      id: string,
      patch: { content?: string; priority?: 'high' | 'medium' | 'low' }
    ) => {
      const now = new Date().toISOString();
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, updated_at: now } : t))
      );
    },
    []
  );

  const deleteGuestTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleGuestTodoComplete = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, is_completed: !t.is_completed, updated_at: now } : t
      )
    );
  }, []);

  const setGuestCourseTemplate = useCallback((t: GuestCourseTemplate | null) => {
    setCourseTemplateState(t);
  }, []);

  const createGuestCourseTemplate = useCallback(
    (input: { name: string; semester_start: string; total_weeks: number }) => {
      const now = new Date().toISOString();
      const t: GuestCourseTemplate = {
        id: newId(),
        user_id: GUEST_USER_ID,
        name: input.name,
        semester_start: input.semester_start,
        total_weeks: input.total_weeks,
        is_imported: false,
        created_at: now,
        updated_at: now,
      };
      setCourseTemplateState(t);
      setCourses([]);
      return t;
    },
    []
  );

  const updateGuestCourseTemplate = useCallback(
    (patch: { name: string; semester_start: string; total_weeks: number }) => {
      setCourseTemplateState((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          ...patch,
          updated_at: now,
        };
      });
    },
    []
  );

  const addGuestCourse = useCallback(
    (input: {
      name: string;
      day_of_week: number;
      time_slot: string;
      start_week: number;
      end_week: number;
      week_type: 'all' | 'odd' | 'even';
      remark: string | null;
    }) => {
      if (!courseTemplate) return;
      const course: GuestCourse = {
        id: newId(),
        template_id: courseTemplate.id,
        user_id: GUEST_USER_ID,
        name: input.name,
        day_of_week: input.day_of_week,
        time_slot: input.time_slot,
        start_week: input.start_week,
        end_week: input.end_week,
        week_type: input.week_type,
        remark: input.remark,
        created_at: new Date().toISOString(),
      };
      setCourses((prev) => [...prev, course]);
    },
    [courseTemplate]
  );

  const updateGuestCourse = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          GuestCourse,
          | 'name'
          | 'day_of_week'
          | 'time_slot'
          | 'start_week'
          | 'end_week'
          | 'week_type'
          | 'remark'
        >
      >
    ) => {
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    []
  );

  const deleteGuestCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const importGuestCoursesToSchedules = useCallback(() => {
    if (!courseTemplate || courses.length === 0) return;
    const template = courseTemplate;
    const semStart = new Date(template.semester_start + 'T00:00:00');

    setSchedules((prev) => {
      let next = prev;
      if (template.is_imported) {
        next = prev.filter((s) => s.source_template_id !== template.id);
      }
      const now = new Date().toISOString();
      const newRows: GuestScheduleItem[] = [];
      for (const course of courses) {
        for (let week = course.start_week; week <= course.end_week; week++) {
          if (course.week_type === 'odd' && week % 2 === 0) continue;
          if (course.week_type === 'even' && week % 2 !== 0) continue;

          const date = new Date(semStart);
          date.setDate(date.getDate() + (week - 1) * 7 + (course.day_of_week - 1));

          const content = course.remark
            ? `${course.name}（${course.remark}）`
            : course.name;

          newRows.push({
            id: newId(),
            user_id: GUEST_USER_ID,
            date: formatDateString(date),
            time_slot: course.time_slot,
            content,
            is_completed: false,
            created_at: now,
            updated_at: now,
            source_template_id: template.id,
          });
        }
      }
      return [...next, ...newRows];
    });

    setCourseTemplateState((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return { ...prev, is_imported: true, updated_at: now };
    });
  }, [courseTemplate, courses]);

  const value = useMemo(
    () => ({
      isGuest,
      enterGuestMode,
      exitGuestMode,
      clearGuestBecauseUserLoggedIn,
      schedules,
      getGroupedSchedulesForDate,
      getScheduleCountsBetween,
      addGuestSchedule,
      updateGuestSchedule,
      deleteGuestSchedule,
      todos,
      getSortedGuestTodos,
      addGuestTodo,
      updateGuestTodo,
      deleteGuestTodo,
      toggleGuestTodoComplete,
      courseTemplate,
      courses,
      setGuestCourseTemplate,
      createGuestCourseTemplate,
      updateGuestCourseTemplate,
      addGuestCourse,
      updateGuestCourse,
      deleteGuestCourse,
      importGuestCoursesToSchedules,
    }),
    [
      isGuest,
      enterGuestMode,
      exitGuestMode,
      clearGuestBecauseUserLoggedIn,
      schedules,
      getGroupedSchedulesForDate,
      getScheduleCountsBetween,
      addGuestSchedule,
      updateGuestSchedule,
      deleteGuestSchedule,
      todos,
      getSortedGuestTodos,
      addGuestTodo,
      updateGuestTodo,
      deleteGuestTodo,
      toggleGuestTodoComplete,
      courseTemplate,
      courses,
      setGuestCourseTemplate,
      createGuestCourseTemplate,
      updateGuestCourseTemplate,
      addGuestCourse,
      updateGuestCourse,
      deleteGuestCourse,
      importGuestCoursesToSchedules,
    ]
  );

  return (
    <GuestExperienceContext.Provider value={value}>{children}</GuestExperienceContext.Provider>
  );
}

export function useGuestExperience() {
  const ctx = useContext(GuestExperienceContext);
  if (!ctx) {
    throw new Error('useGuestExperience must be used within GuestExperienceProvider');
  }
  return ctx;
}
