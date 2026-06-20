# SunnyBridge MVP — 贡献指南

## 分支保护规则

`main` 分支已启用 GitHub 分支保护，**禁止直接 push**。所有改动必须走 PR 流程：

1. 从 `main` 创建 feature 分支
2. 提交改动并推送
3. 创建 Pull Request
4. 至少 **1 个 approval** 才能合并
5. 新 commit 推送后，旧 approval 自动 dismiss

## 课时/财务敏感改动

以下字段视为**敏感改动**，任何 PR 涉及这些字段必须标注 `sensitive` label：

- `hours` / `hourly_rate` / `usedhours` / `totalhours` / `remaining_hours`
- `payments` / `teacherpayments` 表结构变更

## Commit 规范

```
type: 简短描述

type 可选: feat / fix / refactor / docs / chore / ci
```

## 分支命名

```
feat/功能描述
fix/问题描述
refactor/重构描述
```
