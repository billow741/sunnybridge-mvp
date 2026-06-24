# 3-C 权限系统 — 实施方案

> 状态：待确认 | 前置：无 | 阻塞：3-D(审批) 和 3-E(通知) 依赖此完成

---

## 1. Migration 顺序（5步，零停机）

### Step 1: 建表 + 种子（纯加法，无破坏）

```sql
-- 1a. roles 表
CREATE TABLE roles (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,
    label      VARCHAR(100),
    is_builtin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. permissions 表
CREATE TABLE permissions (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(100) UNIQUE NOT NULL,
    label      VARCHAR(200),
    module     VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1c. role_permissions 关联表
CREATE TABLE role_permissions (
    role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 1d. RLS + Policy
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_perms" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_rp" ON role_permissions FOR ALL USING (true) WITH CHECK (true);
```

**Step 1 纯 DDL，不影响任何现有代码。**

### Step 2: 种子数据

#### 2a. 内置角色（4个，映射现有 role 字段值 + 细分 admin）

| id | name | label | is_builtin |
|:--|:--|:--|:--|
| 1 | super_admin | 超级管理员 | true |
| 2 | admin | 管理员 | true |
| 3 | teacher | 教师 | true |
| 4 | parent | 家长 | true |

#### 2b. 权限码（按现有 endpoint 对照分类）

| module | code | label |
|:--|:--|:--|
| dashboard | dashboard:read | 查看工作台 |
| students | students:read | 查看学员 |
| students | students:write | 编辑学员 |
| students | students:delete | 删除学员 |
| courses | courses:read | 查看课程 |
| courses | courses:write | 编辑课程 |
| courses | courses:delete | 删除课程 |
| teachers | teachers:read | 查看教师 |
| teachers | teachers:write | 编辑教师 |
| finance | finance:read | 查看财务 |
| payments | payments:read | 查看收款 |
| payments | payments:write | 编辑收款 |
| settlements | settlements:read | 查看结算 |
| settlements | settlements:write | 编辑结算 |
| settlements | settlements:approve | 审批结算 ← 3-D用 |
| refunds | refunds:read | 查看退款 |
| refunds | refunds:write | 编辑退款 |
| refunds | refunds:approve | 审批退款 ← 3-D用 |
| settings | settings:read | 查看设置 |
| settings | settings:write | 编辑设置 |
| roles | roles:read | 查看权限 |
| roles | roles:write | 编辑权限 |
| resources | resources:read | 查看资源 |
| resources | resources:write | 编辑资源 |
| hours | hours:read | 查看课时 |
| hours | hours:write | 编辑课时 |
| export | export:read | 导出数据 |
| search | search:read | 全局搜索 |

**共 28 个权限码。**

#### 2c. role_permissions 映射

| 角色 | 权限 |
|:--|:--|
| **super_admin** | 全部 28 个 |
| **admin** | 除 roles:write 外 27 个 |
| **teacher** | dashboard:read, courses:read, teachers:read(限自己), resources:read |
| **parent** | dashboard:read, students:read(限自己孩子), payments:read(限自己), resources:read |

> 注：teacher/parent 的"限自己"逻辑不在 permission 层做，保持 endpoint 级别的
> 数据属主过滤（现有逻辑已实现）。permissions 只控制"能否访问这个功能入口"。

### Step 3: 后端 deps.py 双轨运行

**核心：`require_permission()` 新增，`require_role()` 保留，两道都查。**

```python
# deps.py 新增：

from app.core.database import get_supabase

# 内存缓存: role_name → set[permission_codes]
# 启动时预加载，变更时失效 (简单实现，暂不用 Redis)
_permission_cache: dict[str, set[str]] = {}
_cache_loaded_at: float = 0
_CACHE_TTL = 300  # 5min


async def _load_permissions_for_role(role_name: str) -> set[str]:
    """从 DB 查 role_permissions → permissions，返回权限码集合。"""
    import time
    global _permission_cache, _cache_loaded_at

    now = time.time()
    if now - _cache_loaded_at > _CACHE_TTL:
        _permission_cache.clear()

    if role_name in _permission_cache:
        return _permission_cache[role_name]

    sb = get_supabase()
    role_result = sb.table("roles").select("id").eq("name", role_name).limit(1).execute()
    if not role_result.data:
        _permission_cache[role_name] = set()
        return set()

    role_id = role_result.data[0]["id"]
    rp_result = sb.table("role_permissions").select("permission_id").eq("role_id", role_id).execute()
    if not rp_result.data:
        _permission_cache[role_name] = set()
        return set()

    perm_ids = [r["permission_id"] for r in rp_result.data]
    perm_result = sb.table("permissions").select("code").in_("id", perm_ids).execute()
    codes = {p["code"] for p in perm_result.data}
    _permission_cache[role_name] = codes
    _cache_loaded_at = now
    return codes


def require_permission(code: str):
    """细粒度权限检查 — 查 role_permissions 表。
    
    兼容旧逻辑：如果角色在 roles 表找不到，fallback 到 require_role("admin")。
    """

    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        perms = await _load_permissions_for_role(user.role)
        if code in perms:
            return user
        # fallback: admin 角色在 roles 表没配时，用旧 require_role 逻辑兜底
        if user.role == "admin":
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": f"需要权限: {code}"},
        )

    return _guard
```

**关键设计**：
- `require_permission("settlements:approve")` 先查 DB
- 查不到角色映射时 **fallback admin 放行** — 保证迁移期不锁任何人
- teacher/parent 继续用 `require_role()` 不变（他们的端点不做迁移）

### Step 4: 逐个 endpoint 替换（admin 端点 only）

**替换策略**：只改 `require_role("admin")` → `require_permission("xxx:yyy")`

| endpoint | 旧 | 新 |
|:--|:--|:--|
| GET /dashboard | require_role("admin") | require_permission("dashboard:read") |
| GET /children | require_role("admin") | require_permission("students:read") |
| POST /children | require_role("admin") | require_permission("students:write") |
| ... | ... | ... |
| GET /settings | require_role("admin") | require_permission("settings:read") |
| PUT /settings/{key} | require_role("admin") | require_permission("settings:write") |
| DELETE /settings/{key} | require_role("admin") | require_permission("settings:write") |

**替换顺序**：先改低风险（read-only endpoints），再改写操作，最后改删除。
每改一组保存→部署→测API→再改下一组。

**不改的**：auth.py 里的 `require_role("teacher")` / `require_role("parent")` — 这两个角色不在本轮迁移范围，保留 `require_role` 仍生效。

### Step 5: 删除 require_role（安全清理）

全部 admin endpoint 替换完成后：
1. `require_role()` 仍保留定义但不被任何新代码引用
2. 在 `get_current_user` 里去掉 `role not in ("parent", "teacher", "admin")` 的硬编码检查
3. CurrentUser 的 role pattern 从 `^(parent|teacher|admin)$` 改为 `^(parent|teacher|admin|super_admin)$`

---

## 2. users 表改造

现有 `users.role = 'admin'` 语义变成"查 roles 表的哪一行"：

```sql
-- users 表加 role_name 列，兼容旧 role 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_name VARCHAR(50);
UPDATE users SET role_name = role WHERE role_name IS NULL;
```

**JWT 不改**——JWT 里的 `role` 字段仍然存 `admin`/`teacher`/`parent`。
`role_name` 仅用于 admin 内部细分（super_admin 看全菜单，admin 看受限菜单）。

admin_login 改造：
```python
# auth service — admin_login 返回时附带 permissions
user_perms = await _load_permissions_for_role(user_role_name)
AdminLoginResponse(... , permissions=list(user_perms))
```

---

## 3. 前端改造点

### 3a. authStore 扩展

```typescript
interface AuthState {
  token: string | null;
  user: { username: string; role: string; permissions: string[] } | null;
  setAuth: (token: string, user: {...}) => void;
  hasPermission: (code: string) => boolean;  // 新增
}
```

`hasPermission` 实现：
```typescript
hasPermission: (code) => {
  const perms = get().user?.permissions || [];
  // super_admin / admin 在无 permissions 时放行（fallback）
  if (!perms.length && get().user?.role === 'admin') return true;
  return perms.includes(code);
}
```

### 3b. AdminLayout 菜单过滤

```typescript
const menuItems: MenuItem[] = [
  { key: '/', icon: ..., label: '工作台', permission: 'dashboard:read' },
  { key: '/students', icon: ..., label: '学员', permission: 'students:read' },
  { key: '/settings', icon: ..., label: '设置', permission: 'settings:read' },
  // ...
];

// 渲染时过滤
const visibleItems = menuItems.filter(i => !i.permission || hasPermission(i.permission));
```

### 3c. RequirePermission 组件

```tsx
// components/RequirePermission.tsx
export default function RequirePermission(
  { code, fallback, children }: { code: string; fallback?: ReactNode; children: ReactNode }
) {
  const { hasPermission } = useAuthStore();
  return hasPermission(code) ? <>{children}</> : <>{fallback}</>;
}
```

使用：
```tsx
<RequirePermission code="settlements:approve">
  <Button type="primary">审批</Button>
</RequirePermission>
```

### 3d. 设置页权限管理 Tab

仅 `roles:write` 权限可见。内容：
- 角色列表（Table）
- 选中角色 → 权限矩阵（Checkbox.Group by module）
- 保存 → PUT /api/v1/roles/{id}/permissions

---

## 4. 后端新增 API（CRUD）

| 方法 | 路径 | 权限 | 说明 |
|:--|:--|:--|:--|
| GET | /api/v1/roles | roles:read | 角色列表 |
| PUT | /api/v1/roles/{id}/permissions | roles:write | 设置角色权限 |
| GET | /api/v1/permissions | roles:read | 所有权限码列表 |
| GET | /api/v1/roles/me/permissions | 任何已认证用户 | 当前用户权限码列表 |

**不提供**：POST/DELETE roles（内置角色不可增删）。

---

## 5. 风险点与回滚方案

| # | 风险 | 概率 | 影响 | 缓解 | 回滚 |
|:--|:--|:--|:--|:--|:|
| R1 | require_permission 查 DB 慢 | 低 | 每请求多 ~20ms | 内存缓存 5min TTL | 去缓存改直查 |
| R2 | admin fallback 导致权限形同虚设 | 中 | admin 角色永远放行 | 这是**过渡期设计**——Step 4 全部替换后去掉 fallback | 去掉 admin fallback 分支 |
| R3 | JWT role 值 vs DB role_name 不匹配 | 低 | admin 细分后 JWT 仍写 "admin" | JWT 里新增 `role_name` claim | role_name 不进 JWT，login 时额外查 |
| R4 | 前端 permissions 为空时锁死 | 中 | 清 localStorage 后第一次登录无 permissions | admin 角色 fallback 放行；login API 必须返回 permissions | hasPermission 里 admin 角色兜底 |
| R5 | 种子数据 role_permissions 写错 | 低 | 新权限系统不生效 | Step 2 后手动验证 /roles/me/permissions | DROP 3 张表即可完全回滚到 require_role |
| R6 | teacher/parent endpoint 被误改 | 低 | 原有角色鉴权失效 | **明确不迁移** teacher/parent 的 require_role | git revert |

### 完整回滚方案

**任何阶段都可安全回滚**：

1. **Step 1-2 后**：3 张新表只加不改，`require_role` 仍然生效，删除新表即可
2. **Step 3 后**：`require_permission` 和 `require_role` 并行，去掉新函数即可
3. **Step 4 中**：正在替换的 endpoint，git revert 对应文件即可
4. **Step 5 后**：`require_role` 保留定义，随时启回

**最坏情况：一键回滚到 Step 1 之前 — 删3张表，0改动影响。**

---

## 6. 工期

| Step | 内容 | 预估 |
|:--|:--|:--|
| Step 1-2 | 建表+种子+验证 | 0.5天 |
| Step 3 | deps.py 双轨+缓存 | 0.5天 |
| Step 4 | 逐 endpoint 替换(30个) | 1天 |
| Step 5+前端 | login改+authStore+菜单过滤+权限组件+设置Tab | 1天 |
| **合计** | | **3天** |

---

## 7. 不做的事（明确排除）

- ❌ 不改 JWT 结构（JWT 仍存 role="admin"/"teacher"/"parent"）
- ❌ 不迁移 teacher/parent 端点的 require_role
- ❌ 不做自定义角色创建（内置 4 个足够）
- ❌ 不做行级数据权限（属主过滤已在 endpoint 实现）
- ❌ 不改 Supabase RLS（已有 policy 放通所有 admin）
