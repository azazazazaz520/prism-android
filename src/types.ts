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
  /** 所属 profile，用于跨设备数据隔离；null 表示仅本地存储 */
  profile_id?: string | null;
}

export interface DailyCompletion {
  task_id: string;
  date: string;
  /** 所属 profile，用于跨设备数据隔离 */
  profile_id?: string | null;
}

/** 跨设备用户组 */
export interface SyncProfile {
  id: string;
  sync_code: string;
  created_at: string;
}

/** 匿名用户到 profile 的映射 */
export interface UserProfile {
  user_id: string;
  profile_id: string;
  joined_at: string;
}

/** 侧边栏导航的功能模块（Android 精简版仅保留必要模块） */
export type AppModule = 'tasks' | 'settings';
