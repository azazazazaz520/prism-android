use crate::store;
use crate::{AddTaskArgs, AppState, UpdateTaskArgs};

/// 获取所有任务列表（排除已软删除的）
#[tauri::command]
pub fn get_tasks(state: tauri::State<AppState>) -> Vec<store::Task> {
    state
        .data
        .lock()
        .unwrap()
        .tasks
        .iter()
        .filter(|t| !t.is_deleted)
        .cloned()
        .collect()
}

/// 新增任务
#[tauri::command]
pub fn add_task(state: tauri::State<AppState>, args: AddTaskArgs) -> Result<store::Task, String> {
    let mut data = state.data.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let task = store::Task {
        id: uuid::Uuid::new_v4().to_string(),
        title: args.title,
        completed: false,
        created_at: now.clone(),
        completed_at: None,
        due_date: args.due_date,
        tags: args.tags.unwrap_or_default(),
        important: args.important.unwrap_or(false),
        pinned: args.pinned.unwrap_or(false),
        is_daily: args.is_daily.unwrap_or(false),
        parent_id: args.parent_id,
        updated_at: now,
        is_deleted: false,
    };
    data.tasks.push(task.clone());
    store::save_data(&data)?;
    Ok(task)
}

/// 切换任务完成状态（自动记录完成/取消时间，更新 updated_at）
#[tauri::command]
pub fn toggle_task(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    if let Some(task) = data.tasks.iter_mut().find(|t| t.id == id) {
        task.completed = !task.completed;
        task.completed_at = if task.completed {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };
        task.updated_at = chrono::Utc::now().to_rfc3339();
    }
    store::save_data(&data)
}

/// 切换每日任务的完成状态（按日期记录）
/// 同时同步更新 task.completed，确保 Supabase tasks 表能感知完成状态变更
#[tauri::command]
pub fn toggle_daily_task(
    state: tauri::State<AppState>,
    id: String,
    date: String,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(pos) = data
        .daily_completions
        .iter()
        .position(|dc| dc.task_id == id && dc.date == date)
    {
        // 取消完成：移除 daily_completion
        data.daily_completions.remove(pos);
        // 若该任务当天不再有完成记录，则设 completed = false
        let still_completed = data
            .daily_completions
            .iter()
            .any(|dc| dc.task_id == id && dc.date == date);
        if !still_completed {
            if let Some(task) = data.tasks.iter_mut().find(|t| t.id == id) {
                task.completed = false;
                task.completed_at = None;
                task.updated_at = now;
            }
        }
    } else {
        // 完成：添加 daily_completion
        data.daily_completions.push(store::DailyCompletion {
            task_id: id.clone(),
            date,
        });
        // 同步更新 task.completed，使 Supabase tasks 表反映完成状态
        if let Some(task) = data.tasks.iter_mut().find(|t| t.id == id) {
            if !task.completed {
                task.completed = true;
                task.completed_at = Some(now.clone());
                task.updated_at = now;
            }
        }
    }
    store::save_data(&data)
}

/// 更新任务的所有字段
#[tauri::command]
pub fn update_task(state: tauri::State<AppState>, args: UpdateTaskArgs) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    if let Some(task) = data.tasks.iter_mut().find(|t| t.id == args.id) {
        task.title = args.title;
        task.due_date = args.due_date;
        task.tags = args.tags;
        task.important = args.important;
        task.pinned = args.pinned;
        task.is_daily = args.is_daily;
        task.updated_at = chrono::Utc::now().to_rfc3339();
    }
    store::save_data(&data)
}

/// 软删除任务（标记 is_deleted，同步时按此标记传播删除）
#[tauri::command]
pub fn delete_task(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    // 软删除目标任务及其子任务
    for task in data.tasks.iter_mut() {
        if task.id == id || task.parent_id.as_deref() == Some(&id) {
            task.is_deleted = true;
            task.updated_at = now.clone();
        }
    }
    // 清理孤儿 daily_completions
    data.daily_completions.retain(|dc| dc.task_id != id);
    store::save_data(&data)
}

/// 一键软删除所有已完成任务（标记 is_deleted，同步传播删除）
#[tauri::command]
pub fn clear_completed(state: tauri::State<AppState>) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();
    let completed_ids: Vec<String> = data
        .tasks
        .iter()
        .filter(|t| t.completed && !t.is_deleted)
        .map(|t| t.id.clone())
        .collect();
    // 软删除所有已完成任务
    for task in data.tasks.iter_mut() {
        if task.completed && !task.is_deleted {
            task.is_deleted = true;
            task.updated_at = now.clone();
        }
    }
    // 清理已软删除任务的 daily_completions
    for id in &completed_ids {
        data.daily_completions.retain(|dc| &dc.task_id != id);
    }
    store::save_data(&data)
}

/// 按截止日期筛选任务
#[tauri::command]
pub fn get_tasks_by_date(state: tauri::State<AppState>, date: String) -> Vec<store::Task> {
    state
        .data
        .lock()
        .unwrap()
        .tasks
        .iter()
        .filter(|t| !t.is_deleted && t.due_date.as_deref() == Some(&date))
        .cloned()
        .collect()
}

/// 获取所有标签（去重排序，排除已删除任务）
#[tauri::command]
pub fn get_all_tags(state: tauri::State<AppState>) -> Vec<String> {
    let data = state.data.lock().unwrap();
    let mut tags: Vec<String> = data
        .tasks
        .iter()
        .filter(|t| !t.is_deleted)
        .flat_map(|t| t.tags.clone())
        .collect();
    tags.sort();
    tags.dedup();
    tags
}

/// 删除指定标签（从所有任务中移除）
#[tauri::command]
pub fn delete_tag(state: tauri::State<AppState>, tag: String) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    for task in data.tasks.iter_mut() {
        task.tags.retain(|t| t != &tag);
    }
    store::save_data(&data)
}

/// 获取指定日期已完成的每日任务 ID 列表
#[tauri::command]
pub fn get_daily_completions(state: tauri::State<AppState>, date: String) -> Vec<String> {
    state
        .data
        .lock()
        .unwrap()
        .daily_completions
        .iter()
        .filter(|dc| dc.date == date)
        .map(|dc| dc.task_id.clone())
        .collect()
}

/// 合并远端每日完成记录到本地（按 task_id + date 去重）
#[tauri::command]
pub fn sync_remote_daily_completions(
    state: tauri::State<AppState>,
    remote_completions: Vec<store::DailyCompletion>,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    for remote in remote_completions {
        let exists = data
            .daily_completions
            .iter()
            .any(|dc| dc.task_id == remote.task_id && dc.date == remote.date);
        if !exists {
            data.daily_completions.push(remote);
        }
    }
    store::save_data(&data)
}

/// 从本地删除指定每日完成记录（Realtime DELETE 事件时调用）
#[tauri::command]
pub fn delete_daily_completion(
    state: tauri::State<AppState>,
    task_id: String,
    date: String,
) -> Result<(), String> {
    let mut data = state.data.lock().unwrap();
    data.daily_completions
        .retain(|dc| !(dc.task_id == task_id && dc.date == date));
    store::save_data(&data)
}
