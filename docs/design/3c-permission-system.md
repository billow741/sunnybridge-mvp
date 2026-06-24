# 3-C 权限系统设计文档

> 状态：设计稿，未实施 | 优先级：P2 高风险 | 预估：3-4天

## 1. 目标

将现有硬编码三角色(parent/teacher/admin)升级为**RBAC细粒度权限系统**：
- admin 角色内部可区分权限级别（超级管理员 vs 运营 vs 财务只读）
- 每个 API endpoint 基于权限码（permission code）鉴权
- 前端按权限码控制菜单/按钮可见性

## 2. 数据模型

### 2.1 新增3张表

```sql
-- 角色（内置 + 自定义）
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,  -- admin, operations, finance_readonly, teacher, parent
    label       VARCHAR(100),                  -- 显示名
    is_builtin  BOOLEAN DEFAULT false,         -- 内置角色不可删除
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 权限码
CREATE TABLE permissions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(100) UNIQUE NOT NULL,  -- e.g. "courses:read", "settlements:approve"
    label       VARCHAR(200),
    module      VARCHAR(50),                    -- courses, payments, settlements, settings...
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 角色-权限关联
CREATE TABLE role_permissions (
    role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### 2.2 权限码命名规范

格式：`{module}:{action}`

| 模块 | 权限码 | 说明 |
|:--|:--|:--|
| courses | courses:read, courses:write, courses:delete | 课程管理 |
| payments | payments:read, payments:write, payments:delete | 收款管理 |
| settlements | settlements:read, settlements:write, settlements:approve | 结算管理 |
| students | students:read, students:write | 学员管理 |
| teachers | teachers:read, teachers:write | 教师管理 |
| settings | settings:read, settings:write | 系统设置 |
| roles | roles:read, roles:write | 权限管理（仅超级管理员） |
| refunds | refunds:read, refunds:approve | 退款审批（关联3-D） |

### 2.3 内置角色与权限映射

| 角色 | 权限 |
|:--|:--|
| super_admin | 全部权限 + roles:read/write |
| admin | 全部权限，不含 roles:write |
| operations | courses/students/teachers/teachers 的 read+write，其他 read only |
| finance_readonly | payments/settlements/refunds:read only |
| teacher | teachers:read(限于自己), courses:read(限于自己) |
| parent | students:read(限于自己孩子), payments:read(限于自己) |

## 3. 后端改造

### 3.1 deps.py 扩展

```python
# 新增依赖：require_permission
def require_permission(code: str):
    """细粒度权限检查 — 从JWT的role查数据库的role_permissions"""
    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        cached = await get_cached_permissions(user.role)
        if code not in cached:
            raise HTTPException(403, {"code": "FORBIDDEN", "message": f"需要权限: {code}"})
        return user
    return _guard
```

### 3.2 权限缓存

- Redis 缓存 `role:{name} → set[permission_codes]`，TTL=5min
- 角色权限变更时主动失效

### 3.3 迁移策略（零停机）

1. **Phase 1**：建表 + 种子数据，不改现有代码
2. **Phase 2**：新增 `require_permission()` 并行运行，现有 `require_role()` 保留
3. **Phase 3**：逐个 endpoint 替换为 `require_permission()`，全部替换后删除 `require_role()`

## 4. 前端改造

### 4.1 权限上下文

```tsx
// AuthContext 扩展
interface AuthContext {
  user: CurrentUser;
  permissions: string[];  // ["courses:read", "payments:write", ...]
}
```

登录时 `/auth/admin/login` 返回 `permissions[]`，前端存入 localStorage。

### 4.2 权限组件

```tsx
// <RequirePermission code="settlements:approve">
//   <Button>审批</Button>
// </RequirePermission>
```

### 4.3 菜单过滤

`AdminLayout.tsx` 的 menuItems 按 `hasPermission(item.requiredPermission)` 过滤。

### 4.4 设置页新增权限管理Tab

- 角色列表 + 权限矩阵（Checkbox组）
- 仅 `roles:write` 权限可见

## 5. 风险与缓解

| 风险 | 缓解 |
|:--|:--|
| 迁移期双重鉴权复杂 | Phase 2 并行期，require_role 先查，require_permission 后查，两道任一通过 |
| 权限缓存不一致 | TTL=5min + 变更主动失效 |
| 前端permission列表过大 | 按模块分组，只下发当前角色的权限码（~20条） |
| 内置角色被误删 | is_builtin=true 的角色 DELETE 时拒绝 |

## 6. API 端点

| 方法 | 路径 | 权限 | 说明 |
|:--|:--|:--|:--|
| GET | /api/v1/roles | roles:read | 角色列表 |
| POST | /api/v1/roles | roles:write | 创建自定义角色 |
| GET | /api/v1/permissions | roles:read | 权限码列表 |
| PUT | /api/v1/roles/{id}/permissions | roles:write | 设置角色权限 |
| GET | /api/v1/roles/me/permissions | (any authenticated) | 当前用户权限列表 |

## 7. 工作量

- 后端：3张表 + CRUD API + deps改造 + 缓存 = **2天**
- 前端：AuthContext扩展 + 权限组件 + 菜单过滤 + 权限Tab = **1.5天**
- 迁移+测试：**0.5天**
- **合计：~4天**
