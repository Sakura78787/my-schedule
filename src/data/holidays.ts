export interface HolidayInfo {
  date: string;
  name: string;
  isWorkday: boolean; // true=调休上班, false=放假
}

const holidayList: HolidayInfo[] = [
  // ========== 2025年 ==========

  // 元旦 (1月1日，1天)
  { date: '2025-01-01', name: '元旦', isWorkday: false },

  // 春节 (1月28日-2月4日，8天)
  { date: '2025-01-26', name: '春节', isWorkday: true },  // 调休上班
  { date: '2025-01-28', name: '除夕', isWorkday: false },
  { date: '2025-01-29', name: '春节', isWorkday: false },
  { date: '2025-01-30', name: '春节', isWorkday: false },
  { date: '2025-01-31', name: '春节', isWorkday: false },
  { date: '2025-02-01', name: '春节', isWorkday: false },
  { date: '2025-02-02', name: '春节', isWorkday: false },
  { date: '2025-02-03', name: '春节', isWorkday: false },
  { date: '2025-02-04', name: '春节', isWorkday: false },
  { date: '2025-02-08', name: '春节', isWorkday: true },  // 调休上班

  // 清明节 (4月4日-6日，3天)
  { date: '2025-04-04', name: '清明节', isWorkday: false },
  { date: '2025-04-05', name: '清明节', isWorkday: false },
  { date: '2025-04-06', name: '清明节', isWorkday: false },

  // 劳动节 (5月1日-5日，5天)
  { date: '2025-04-27', name: '劳动节', isWorkday: true },  // 调休上班
  { date: '2025-05-01', name: '劳动节', isWorkday: false },
  { date: '2025-05-02', name: '劳动节', isWorkday: false },
  { date: '2025-05-03', name: '劳动节', isWorkday: false },
  { date: '2025-05-04', name: '劳动节', isWorkday: false },
  { date: '2025-05-05', name: '劳动节', isWorkday: false },

  // 端午节 (5月31日-6月2日，3天)
  { date: '2025-05-31', name: '端午节', isWorkday: false },
  { date: '2025-06-01', name: '端午节', isWorkday: false },
  { date: '2025-06-02', name: '端午节', isWorkday: false },

  // 国庆节+中秋节 (10月1日-8日，8天)
  { date: '2025-09-28', name: '国庆节', isWorkday: true },  // 调休上班
  { date: '2025-10-01', name: '国庆节', isWorkday: false },
  { date: '2025-10-02', name: '国庆节', isWorkday: false },
  { date: '2025-10-03', name: '国庆节', isWorkday: false },
  { date: '2025-10-04', name: '国庆节', isWorkday: false },
  { date: '2025-10-05', name: '国庆节', isWorkday: false },
  { date: '2025-10-06', name: '中秋节', isWorkday: false },
  { date: '2025-10-07', name: '国庆节', isWorkday: false },
  { date: '2025-10-08', name: '国庆节', isWorkday: false },
  { date: '2025-10-11', name: '国庆节', isWorkday: true },  // 调休上班

  // ========== 2026年 ==========

  // 元旦 (1月1日-3日，3天)
  { date: '2026-01-01', name: '元旦', isWorkday: false },
  { date: '2026-01-02', name: '元旦', isWorkday: false },
  { date: '2026-01-03', name: '元旦', isWorkday: false },
  { date: '2026-01-04', name: '元旦', isWorkday: true },  // 调休上班

  // 春节 (2月15日-23日，9天)
  { date: '2026-02-14', name: '春节', isWorkday: true },  // 调休上班
  { date: '2026-02-15', name: '除夕', isWorkday: false },
  { date: '2026-02-16', name: '春节', isWorkday: false },
  { date: '2026-02-17', name: '春节', isWorkday: false },
  { date: '2026-02-18', name: '春节', isWorkday: false },
  { date: '2026-02-19', name: '春节', isWorkday: false },
  { date: '2026-02-20', name: '春节', isWorkday: false },
  { date: '2026-02-21', name: '春节', isWorkday: false },
  { date: '2026-02-22', name: '春节', isWorkday: false },
  { date: '2026-02-23', name: '春节', isWorkday: false },
  { date: '2026-02-28', name: '春节', isWorkday: true },  // 调休上班

  // 清明节 (4月4日-6日，3天)
  { date: '2026-04-04', name: '清明节', isWorkday: false },
  { date: '2026-04-05', name: '清明节', isWorkday: false },
  { date: '2026-04-06', name: '清明节', isWorkday: false },

  // 劳动节 (5月1日-5日，5天)
  { date: '2026-05-01', name: '劳动节', isWorkday: false },
  { date: '2026-05-02', name: '劳动节', isWorkday: false },
  { date: '2026-05-03', name: '劳动节', isWorkday: false },
  { date: '2026-05-04', name: '劳动节', isWorkday: false },
  { date: '2026-05-05', name: '劳动节', isWorkday: false },
  { date: '2026-05-09', name: '劳动节', isWorkday: true },  // 调休上班

  // 端午节 (6月19日-21日，3天)
  { date: '2026-06-19', name: '端午节', isWorkday: false },
  { date: '2026-06-20', name: '端午节', isWorkday: false },
  { date: '2026-06-21', name: '端午节', isWorkday: false },

  // 中秋节 (9月25日-27日，3天)
  { date: '2026-09-25', name: '中秋节', isWorkday: false },
  { date: '2026-09-26', name: '中秋节', isWorkday: false },
  { date: '2026-09-27', name: '中秋节', isWorkday: false },

  // 国庆节 (10月1日-7日，7天)
  { date: '2026-09-20', name: '国庆节', isWorkday: true },  // 调休上班
  { date: '2026-10-01', name: '国庆节', isWorkday: false },
  { date: '2026-10-02', name: '国庆节', isWorkday: false },
  { date: '2026-10-03', name: '国庆节', isWorkday: false },
  { date: '2026-10-04', name: '国庆节', isWorkday: false },
  { date: '2026-10-05', name: '国庆节', isWorkday: false },
  { date: '2026-10-06', name: '国庆节', isWorkday: false },
  { date: '2026-10-07', name: '国庆节', isWorkday: false },
  { date: '2026-10-10', name: '国庆节', isWorkday: true },  // 调休上班
];

export const holidays: Map<string, HolidayInfo> = new Map(
  holidayList.map(h => [h.date, h])
);

export function getHoliday(dateStr: string): HolidayInfo | undefined {
  return holidays.get(dateStr);
}
