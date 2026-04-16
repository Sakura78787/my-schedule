# 个人日程助手

一个带课表一键导入的日程规划工具，帮我把课程安排、待办事项和灵感记录都管起来。

在线体验：[my-schedule-rose.vercel.app](https://my-schedule-rose.vercel.app)

## 它能干什么

**微观 — 每日日程**

把一天切成早上、中午、下午、晚上、凌晨几个时段，每个时段可以添加多条日程。自动高亮当前时段，过了的半透明显示，一目了然。

**宏观 — 日历视图**

月视图看全局，周视图看细节。日历格子上标了日程数量，点一下就跳到那天的微观页。还内置了 2025-2026 年的中国法定节假日和调休标记。

**思绪 — 待办 & 灵感**

待办事项和奇思妙想分开放，支持高/中/低三级优先级、备注、完成标记。按优先级或状态筛选。

**课表 — 课程管理**

录入学期的课程信息（星期、时段、起止周、单双周、教室），一键把整学期的课全部展平到日历上。改了课表也能重新导入，之前的日程会先清掉再重新生成。

## 技术栈

- React 19 + TypeScript
- Tailwind CSS
- Supabase（认证 + 数据库）
- React Router v7
- Vite
- Vercel 部署

## 快速开始

需要 Node.js 18+ 和一个 Supabase 项目。

```bash
git clone https://github.com/Sakura78787/my-schedule.git
cd my-schedule
npm install
```

复制环境变量模板并填上你的 Supabase 信息：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入：

```
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase anon key
```

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173` 就能看到了。

### Supabase 数据库表

你需要在 Supabase 里创建这几张表：

- `schedule` — user_id, date, time_slot, content, is_completed, source_template_id
- `todo` — user_id, content, remark, priority, type, is_completed
- `course_template` — user_id, name, semester_start, total_weeks, is_imported
- `course` — template_id, user_id, name, day_of_week, time_slot, start_week, end_week, week_type, remark

所有表开启 RLS（Row Level Security），策略是用户只能操作自己的数据。

## 项目结构

```
src/
├── components/
│   ├── auth/          # 登录注册相关组件
│   └── BottomNav.tsx  # 底部导航栏
├── contexts/
│   ├── AuthContext.tsx # 认证上下文
│   └── ThemeContext.tsx # 主题切换
├── data/
│   └── holidays.ts   # 法定节假日数据（2025-2026）
├── lib/
│   └── supabase.ts   # Supabase 客户端
├── pages/
│   ├── AuthPage.tsx      # 登录/注册/找回密码
│   ├── SchedulePage.tsx  # 每日日程
│   ├── CalendarPage.tsx  # 日历视图
│   ├── TodosPage.tsx     # 待办 & 灵感
│   └── CoursePage.tsx    # 课表管理
├── App.tsx
├── main.tsx
└── index.css
```

## 已知问题

- 节假日数据只覆盖到 2026 年底，之后的需要手动往 `holidays.ts` 里加
- 注册只允许 QQ 邮箱和 163 邮箱，这是我当初为了简单做的限制，后面可以放开
- 课表一键生成日程的时候如果课程特别多（比如加上了凌晨时段），批量插入是 500 条一批做的，理论上没问题但没做过压测
- 暗黑模式切换在登录页和内容页各有一套，有点冗余但懒得合并了
- 删除日程的确认弹窗是全局共用一个 state，快速连点的话可能会有 edge case

## 许可证

[MIT](LICENSE)，署名 Sakura。