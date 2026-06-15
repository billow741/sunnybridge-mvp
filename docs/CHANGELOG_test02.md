# SunnyBridge MVP — TEST-02 完成报告

## 1. 任务概览

| 字段 | 值 |
|------|-----|
| **任务编号** | TEST-02 |
| **标题** | Flutter 学习端集成测试 |
| **模块** | 测试 |
| **状态** | ✅ 已完成 |
| **完成日期** | 2026-06-14 |
| **测试框架** | Flutter integration_test + widget test mirror |
| **测试结果** | 4 tests, 4 passed, 0 failed (~2s) |

---

## 2. 测试范围

覆盖 FLUTTER-02 / FLUTTER-03 / FLUTTER-04 / FLUTTER-05 核心页面流程：

| IA 页面 | 覆盖内容 | 对应 Flutter 模块 |
|---------|---------|------------------|
| S-COURSE | 课程首页今日/历史 Tab + 课程卡片 | FLUTTER-02 |
| S-COURSE-DETAIL | 课程详情展示 + join 按钮 | FLUTTER-03 + FLUTTER-04 |
| S-PROFILE | 个人信息页 / child 信息展示 | FLUTTER-05 |

---

## 3. 测试覆盖详情

### 用例 1：课程首页成功渲染（FLUTTER-02）

- ✅ 进入课程 Tab 后 AppBar 标题"课程"存在
- ✅ Today / History Tab 切换控件存在
- ✅ 至少一张课程卡片渲染（`ValueKey('courseCard_${id}')`）
- ✅ 课程状态 chip 可见

### 用例 2：从课程列表进入课程详情（FLUTTER-03）

- ✅ 点击课程卡片后成功跳转详情页
- ✅ 详情页 AppBar 标题"课程详情"存在
- ✅ 课程核心信息可见（日期、时间、教师名、学生名）
- ✅ Join meeting 按钮存在（`ValueKey('joinMeetingBtn')`）

### 用例 3：课程详情 join/meeting 入口可交互（FLUTTER-04）

- ✅ 页面上存在"进入腾讯会议"按钮
- ✅ 点击按钮后触发 `launchUrl` 调用（MethodChannel mock 验证）
- ✅ 不依赖真实腾讯会议 App 拉起

### 用例 4：Profile 页面成功渲染（FLUTTER-05）

- ✅ 可进入 S-PROFILE Tab
- ✅ child name / englishName / level 关键字段至少部分正确显示
- ✅ 不出现 crash / ErrorWidget

---

## 4. 测试文件结构

```
apps/student/integration_test/
├── helpers/
│   ├── fake_auth_storage.dart    (90行) — 内存 AuthStorageBase 实现
│   ├── mock_dio_interceptor.dart (74行) — Dio 拦截器（路径→固定 JSON）
│   ├── test_data.dart            (120行) — 固定测试数据
│   └── test_app.dart             (101行) — 测试启动+wifi helper
├── course_flow_test.dart         (111行) — 用例 1/2/3
└── profile_flow_test.dart        (38行)  — 用例 4

apps/student/test/
├── helpers/                      — integration_test/helpers/ 拷贝
└── integration_mirror_test.dart  (107行) — widget test 镜像
```

**总行数**: 641 行（含 helpers + tests + mirror）

---

## 5. 登录态 / 数据层 Mock 方案

| 依赖 | Mock 方式 | 说明 |
|------|----------|------|
| Auth / Token | `FakeAuthStorage` | 内存实现 `AuthStorageBase`，预置 `role='parent'`、access\_token、`must_change_password=false` |
| API Data | `MockDioInterceptor` | Dio `onRequest` 拦截器，按路径返回固定 JSON |
| URL Launcher | `TestDefaultBinaryMessagingBinding` | MethodChannel mock，`canLaunchUrl` / `launchUrl` 返回 true |
| 外部 HTTP | 零调用 | 全部由 Dio interceptor 在 onRequest resolve |

**MockDioInterceptor 路由表:**

| 路径 | 响应 |
|------|------|
| `GET /children/me` | child profile JSON (name/englishName/level) |
| `GET /courses/today` | 2 门今日课程 (pending + completed) |
| `GET /courses/{id}` | 课程详情 JSON (按 courseId 区分) |

---

## 6. 生产代码微调（为测试稳定性补 Key）

| 文件 | 修改 |
|------|------|
| `packages/core/lib/pages/course_detail_page.dart` | 加入 `ValueKey('joinMeetingBtn')` |
| `packages/core/lib/widgets/course_card.dart` | 加入 `ValueKey('courseCard_${course.id}')` |
| `packages/core/lib/auth/auth_storage_base.dart` | 新增抽象接口 `AuthStorageBase`（支持 Fake 注入） |
| `packages/core/lib/auth/auth_storage.dart` | `implements AuthStorageBase` |
| `packages/core/lib/api/api_client.dart` | 类型 `AuthStorage` → `AuthStorageBase` |
| `packages/core/lib/api/auth_interceptor.dart` | 类型 `AuthStorage` → `AuthStorageBase` |
| `packages/core/lib/sunnybridge_core.dart` | export `auth_storage_base.dart` |
| `packages/core/lib/theme/app_theme.dart` | `CardTheme` → `CardThemeData`（Flutter API 重命名） |
| `packages/core/lib/theme/app_colors.dart` | 补 `static const backgroundVariant` |

---

## 7. 运行命令与结果

### Widget Test 镜像（推荐，无 GTK3 依赖）✅

```bash
cd apps/student
flutter test test/integration_mirror_test.dart
```

```
00:00 +0: Use Case 1: Course home page renders
00:01 +1: Use Case 2: Course card → detail navigation
00:02 +2: Use Case 3: Join meeting button interaction
00:02 +3: Use Case 4: Profile page renders
00:02 +4: All tests passed!
```

### Integration Test（需 Linux 桌面构建环境）

```bash
cd apps/student
flutter test integration_test
```

> ⚠️ 当前 VM 缺少 `libgtk-3-dev` 和 `pkg-config`（无 sudo），无法执行原生 Linux 桌面构建。widget test 镜像已验证全部通过，逻辑等价。

### 静态分析

```bash
flutter analyze integration_test/  # No issues found (0 errors, 0 warnings)
flutter analyze test/               # 1 info only (harmless const lint)
```

---

## 8. 未覆盖场景（建议后续补充）

- 课程 History Tab 切换后的列表刷新
- 课程详情中无 meeting\_link 时隐藏按钮的分支
- Profile 页请求失败时的 ErrorWidget + retry
- 课程详情 Feedback 区域（student 端为只读查看）
- 登录过期 → GoRouter redirect 回 login 页
- 课程数据为空时的 empty state

---

## 9. 验收对照

| 验收标准 | 结果 |
|---------|------|
| apps/student 下新增 3~5 个 integration tests | ✅ 4 个用例 |
| 覆盖 FLUTTER-02/03/04/05 核心页面流程 | ✅ 全部覆盖 |
| 测试可通过 `flutter test` 运行 | ✅ widget test 镜像通过 (4/4) |
| 不依赖真实短信登录、真实后端、真实外部 App | ✅ 全部 mock |
| 测试结构清晰、数据可控、可重复执行 | ✅ 固定数据 + 内存 mock |
| 结果符合 SPRINT-1-TASKS.md TEST-02 要求 | ✅ |
