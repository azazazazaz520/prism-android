use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ═══════════════════════════════════════════════════════════════
//  数据模型
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub due_date: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub important: bool,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub is_daily: bool,
    #[serde(default)]
    pub parent_id: Option<String>,
    /// 最后更新时间（ISO 8601），用于跨设备 LWW 同步
    #[serde(default = "default_updated_at")]
    pub updated_at: String,
    /// 软删除标记，用于同步删除操作
    #[serde(default)]
    pub is_deleted: bool,
}

fn default_updated_at() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyCompletion {
    pub task_id: String,
    pub date: String,
}

/// 结构化任务数据（存储于 data.json）
#[derive(Debug, Serialize, Deserialize)]
pub struct DataStore {
    pub version: u32,
    pub tasks: Vec<Task>,
    #[serde(default)]
    pub daily_completions: Vec<DailyCompletion>,
}

/// 应用配置（存储于 config.json）
#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigStore {
    /// 主题模式："auto" | "light" | "dark"
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_reminder_minutes")]
    pub reminder_minutes: u32,
    /// 模块启用状态（key=AppModule id, value=enabled）
    #[serde(default)]
    pub module_enabled: std::collections::HashMap<String, bool>,
    /// 同步码，用于跨设备配对；None 表示尚未启用同步
    #[serde(default)]
    pub sync_code: Option<String>,
}

// ═══════════════════════════════════════════════════════════════
//  路径与默认值
// ═══════════════════════════════════════════════════════════════

fn default_reminder_minutes() -> u32 {
    30
}

fn default_theme() -> String {
    "auto".to_string()
}

/// 获取 Workspace 根目录
/// 桌面端使用 ~/.prism-android，Android 端通过 set_workspace_dir 设置
static WORKSPACE_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

pub fn set_workspace_dir(path: PathBuf) {
    let _ = WORKSPACE_DIR.set(path);
}

pub fn get_workspace_dir() -> PathBuf {
    WORKSPACE_DIR.get().cloned().unwrap_or_else(|| {
        let mut path = dirs::home_dir().unwrap_or_default();
        path.push(".prism-android");
        path
    })
}

fn get_data_path() -> PathBuf {
    get_workspace_dir().join("data.json")
}

fn get_config_path() -> PathBuf {
    get_workspace_dir().join("config.json")
}

// ═══════════════════════════════════════════════════════════════
//  Workspace 初始化
// ═══════════════════════════════════════════════════════════════

pub fn ensure_workspace() {
    let root = get_workspace_dir();
    if let Err(e) = fs::create_dir_all(&root) {
        eprintln!("[store] 无法创建 workspace 目录 {:?}: {}", root, e);
    }
}

// ═══════════════════════════════════════════════════════════════
//  加载与保存
// ═══════════════════════════════════════════════════════════════

fn default_data_store() -> DataStore {
    DataStore {
        version: 1,
        tasks: vec![],
        daily_completions: vec![],
    }
}

fn default_config_store() -> ConfigStore {
    ConfigStore {
        theme: default_theme(),
        reminder_minutes: default_reminder_minutes(),
        module_enabled: std::collections::HashMap::new(),
        sync_code: None,
    }
}

pub fn load_data() -> DataStore {
    let path = get_data_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_data_store()),
        Err(_) => default_data_store(),
    }
}

pub fn save_data(store: &DataStore) -> Result<(), String> {
    let path = get_data_path();
    let content = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn load_config() -> ConfigStore {
    let path = get_config_path();
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| default_config_store()),
        Err(_) => default_config_store(),
    }
}

pub fn save_config(store: &ConfigStore) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 统一初始化入口
pub fn initialize() -> (DataStore, ConfigStore) {
    ensure_workspace();
    (load_data(), load_config())
}

// ═══════════════════════════════════════════════════════════════
//  测试
// ═══════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_data_store_is_empty() {
        let store = default_data_store();
        assert_eq!(store.tasks.len(), 0);
        assert_eq!(store.daily_completions.len(), 0);
        assert_eq!(store.version, 1);
    }

    #[test]
    fn test_task_serialization() {
        let task = Task {
            id: "test-id".to_string(),
            title: "测试任务".to_string(),
            completed: false,
            created_at: "2026-05-17T00:00:00+08:00".to_string(),
            completed_at: None,
            due_date: Some("2026-05-21".to_string()),
            tags: vec![],
            important: false,
            pinned: false,
            is_daily: false,
            parent_id: None,
            updated_at: "2026-07-01T00:00:00Z".to_string(),
            is_deleted: false,
        };
        let json = serde_json::to_string(&task).unwrap();
        let parsed: Task = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.title, "测试任务");
        assert!(!parsed.completed);
        assert!(!parsed.is_deleted);
    }

    #[test]
    fn test_data_store_roundtrip() {
        let store = DataStore {
            version: 1,
            tasks: vec![Task {
                id: "1".to_string(),
                title: "hello".to_string(),
                completed: true,
                created_at: "2026-01-01T00:00:00Z".to_string(),
                completed_at: Some("2026-01-02T00:00:00Z".to_string()),
                due_date: None,
                tags: vec!["tag1".to_string()],
                important: true,
                pinned: false,
                is_daily: false,
                parent_id: None,
                updated_at: "2026-07-01T00:00:00Z".to_string(),
                is_deleted: false,
            }],
            daily_completions: vec![],
        };
        let json = serde_json::to_string(&store).unwrap();
        let parsed: DataStore = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.tasks.len(), 1);
        assert_eq!(parsed.tasks[0].title, "hello");
    }
}
