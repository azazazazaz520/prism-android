# Prism Android

轻量级离线优先的待办事项应用，支持跨设备无感同步。基于 Tauri 2 构建，Android 端原生运行。

## 特性

- **离线优先** — 所有数据本地存储，无网络时完整可用
- **零配置同步** — 生成同步码即可跨设备配对，无需邮箱、密码、第三方登录
- **匿名认证** — 基于 Supabase Anonymous Sign-In，启动即自动登录
- **实时推送** — 配对后任务变更通过 Supabase Realtime 即时同步
- **每日任务** — 支持每日重复任务，按日期追踪完成状态
- **标签分类** — 自由标签，按标签筛选任务
- **深色模式** — 亮色 / 暗色 / 跟随系统

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Tauri 2 |
| 前端 | Vue 3 + TypeScript |
| 后端 | Rust |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Anonymous Sign-In |
| 实时 | Supabase Realtime |
| 安全 | Row-Level Security (RLS) |

## 架构

```
┌────────────────────────────────────────────┐
│              Vue 3 前端                      │
│  TasksView / SettingsView / Components      │
│  useTaskStore / useSync / useAuth           │
├────────────────────────────────────────────┤
│           Tauri IPC (invoke)                │
├────────────────────────────────────────────┤
│              Rust 后端                       │
│  commands/ — 任务 & 配置 CRUD               │
│  store.rs — JSON 文件持久化                  │
├────────────────────────────────────────────┤
│           Supabase (远端)                    │
│  tasks / daily_completions / profiles       │
│  RLS: profile_id ∈ user_profiles            │
│  Realtime: postgres_changes                 │
└────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js 18+
- Rust (stable)
- Android SDK + NDK 26+
- Supabase 项目

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入 Supabase 项目信息：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

### 3. 初始化 Supabase

在 Supabase Dashboard 中：

1. **启用匿名登录**：Authentication → Providers → 打开 Anonymous Sign-In
2. **执行数据库迁移**：SQL Editor 中依次执行以下文件：
   - `supabase/migrations/0001_init.sql` — 核心表 + RLS
   - `supabase/migrations/002_sync_refactor.sql` — profiles + 同步码配对
   - `supabase/migrations/003_profiles_rls.sql` — profiles 表 RLS 策略

### 4. 启动开发

**浏览器开发（纯前端调试）：**
```bash
npm run dev
```

**Android 开发（需要手机 USB 连接）：**
```bash
npm run tauri:android
```
> 自动检测 WiFi IP，手机和电脑连同一网络即可。

**桌面端开发：**
```bash
npm run tauri dev
```

### 5. 构建 APK

```bash
npm run tauri android build
```

## 跨设备同步

### 工作原理

1. 应用启动 → 自动匿名登录，获得 `auth.uid()`
2. 点击「生成同步码」→ 创建 profile + 本地持久化
3. 另一设备输入同步码 → 加入同一 profile → 数据自动合并
4. 后续所有任务变更通过 Supabase Realtime 实时推送

### 同步模型

| 概念 | 说明 |
|------|------|
| Profile | 跨设备用户组，由同步码唯一标识 |
| 同步码 | UUID v4，设备配对凭证，存储在 `config.json` |
| LWW 合并 | Last-Writer-Wins，基于 `updated_at` 时间戳解决冲突 |
| 软删除 | `is_deleted: true`，删除操作可跨设备传播 |
| 离线队列 | 无网络时操作暂存 localStorage，恢复后自动推送 |

### 数据隔离

所有数据通过 RLS 在数据库层面强制隔离。一个 profile 可关联多个匿名用户，用户只能访问所属 profile 的数据。

## 项目结构

```
src/
├── components/          # Vue 组件
│   ├── SyncSetup.vue    # 同步码生成与配对
│   ├── TaskInput.vue    # 任务输入
│   ├── TaskList.vue     # 任务列表
│   ├── DateStrip.vue    # 日期筛选条
│   ├── TagChipBar.vue   # 标签筛选栏
│   ├── ThemePicker.vue  # 主题选择
│   └── ConfirmDialog.vue # 确认对话框
├── composables/         # 组合式函数
│   ├── useAuth.ts       # 匿名认证
│   ├── useSync.ts       # Supabase 同步
│   ├── useSyncCode.ts   # 同步码配对
│   ├── useTaskStore.ts  # 任务状态管理
│   └── useTheme.ts      # 主题管理
├── views/               # 路由视图
│   ├── TasksView.vue    # 任务主页
│   └── SettingsView.vue # 设置页面
├── styles/              # 全局样式
│   ├── tokens.css       # 设计令牌
│   └── global.css       # 全局样式
└── types.ts             # TypeScript 类型定义

src-tauri/src/
├── lib.rs               # Tauri 应用入口
├── main.rs              # 桌面端入口
├── store.rs             # JSON 存储
└── commands/
    ├── tasks.rs         # 任务命令
    └── config.rs        # 配置命令

supabase/migrations/     # 数据库迁移
```

## 质量门禁

提交前必须通过以下检查：

| 检查项 | 命令 |
|--------|------|
| 前端格式化 | `npm run format` |
| 前端类型检查 | `npx vue-tsc --noEmit` |
| 前端测试 | `npx vitest run` |
| Rust 格式化 | `cargo fmt --all --check` |
| Rust Lint | `cargo clippy --all-targets -- -D warnings` |

## 许可

MIT
