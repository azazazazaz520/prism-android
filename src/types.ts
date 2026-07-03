export interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  due_date: string | null;
  tags: string[];
  important: boolean;
  pinned: boolean;
  is_daily: boolean;
  parent_id: string | null;
  /** 最后更新时间（ISO 8601），用于跨设备 LWW 同步 */
  updated_at: string;
  /** 软删除标记 */
  is_deleted: boolean;
}

export interface DailyCompletion {
  task_id: string;
  date: string;
}

/** 侧边栏导航的功能模块（Android 精简版仅保留必要模块） */
export type AppModule = 'tasks' | 'settings';
