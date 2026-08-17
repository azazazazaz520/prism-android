use serde::Deserialize;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::Manager;

pub mod commands;
pub mod store;

use store::{ConfigStore, DataStore};

/// 应用全局状态，由 Tauri 托管，可在所有命令中访问
pub struct AppState {
    /// 任务数据存储（受 Mutex 保护）
    pub data: Mutex<DataStore>,
    /// 应用配置（主题、提醒等）
    pub config: Mutex<ConfigStore>,
    /// 当天已通知的任务 ID 集合
    pub notified_today: Mutex<HashSet<String>>,
}

/// 新增任务的请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTaskArgs {
    pub title: String,
    pub due_date: Option<String>,
    pub tags: Option<Vec<String>>,
    pub important: Option<bool>,
    pub pinned: Option<bool>,
    pub is_daily: Option<bool>,
    pub parent_id: Option<String>,
}

/// 更新任务的请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskArgs {
    pub id: String,
    pub title: String,
    pub due_date: Option<String>,
    pub tags: Vec<String>,
    pub important: bool,
    pub pinned: bool,
    pub is_daily: bool,
}

/// 统一入口：初始化存储 → 构建 Tauri App
/// 桌面端通过 main.rs 调用，Android 端通过 android_init 自动调用
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Android 上使用 app 专属数据目录，而非只读的 home_dir()
            let workspace = app
                .handle()
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| store::get_workspace_dir());
            store::set_workspace_dir(workspace);

            let (data, config) = store::initialize();
            app.manage(AppState {
                data: Mutex::new(data),
                config: Mutex::new(config),
                notified_today: Mutex::new(HashSet::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 任务命令
            commands::tasks::get_tasks,
            commands::tasks::add_task,
            commands::tasks::toggle_task,
            commands::tasks::set_task_completed,
            commands::tasks::toggle_daily_task,
            commands::tasks::add_daily_completion,
            commands::tasks::remove_daily_completion,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::clear_completed,
            commands::tasks::get_tasks_by_date,
            commands::tasks::get_all_tags,
            commands::tasks::delete_tag,
            commands::tasks::get_daily_completions,
            // 配置命令
            commands::config::get_theme,
            commands::config::set_theme,
            commands::config::get_reminder_minutes,
            commands::config::set_reminder_minutes,
            commands::config::get_module_enabled,
            commands::config::set_module_enabled,
            commands::config::get_sync_code,
            commands::config::set_sync_code,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
