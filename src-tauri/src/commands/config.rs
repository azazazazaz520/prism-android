use crate::store;
use crate::AppState;

/// 获取当前主题设置
#[tauri::command]
pub fn get_theme(state: tauri::State<AppState>) -> String {
    state.config.lock().unwrap().theme.clone()
}

/// 设置主题模式并持久化
#[tauri::command]
pub fn set_theme(state: tauri::State<AppState>, theme: String) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.theme = theme;
    store::save_config(&config)
}

/// 获取当前提醒设置（分钟数）
#[tauri::command]
pub fn get_reminder_minutes(state: tauri::State<AppState>) -> u32 {
    state.config.lock().unwrap().reminder_minutes
}

/// 设置任务到期提醒的提前分钟数（0 表示关闭提醒）
#[tauri::command]
pub fn set_reminder_minutes(state: tauri::State<AppState>, minutes: u32) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.reminder_minutes = minutes;
    store::save_config(&config)
}

/// 获取所有模块的启用状态
#[tauri::command]
pub fn get_module_enabled(
    state: tauri::State<AppState>,
) -> std::collections::HashMap<String, bool> {
    state.config.lock().unwrap().module_enabled.clone()
}

/// 设置单个模块的启用状态
#[tauri::command]
pub fn set_module_enabled(
    state: tauri::State<AppState>,
    module_id: String,
    enabled: bool,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.module_enabled.insert(module_id, enabled);
    store::save_config(&config)
}

/// 获取当前同步码
#[tauri::command]
pub fn get_sync_code(state: tauri::State<AppState>) -> Option<String> {
    state.config.lock().unwrap().sync_code.clone()
}

/// 设置同步码并持久化
#[tauri::command]
pub fn set_sync_code(state: tauri::State<AppState>, code: String) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.sync_code = Some(code);
    store::save_config(&config)
}
