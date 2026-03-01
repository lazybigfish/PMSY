# @dnd-kit 依赖缺失修复记录

## 问题描述

拉取最新代码后，前端启动报错：

```
Failed to resolve import "@dnd-kit/core" from "src/pages/tasks/components/TaskKanban.tsx"
```

## 问题原因

`package.json` 中新增了 `@dnd-kit` 相关依赖，但本地 `node_modules` 中未安装这些包。

## 涉及依赖

- `@dnd-kit/core`: ^6.3.1
- `@dnd-kit/modifiers`: ^9.0.0
- `@dnd-kit/sortable`: ^10.0.0
- `@dnd-kit/utilities`: ^3.2.2

## 解决方案

运行 `npm install` 安装缺失的依赖包。

## 修复时间

2026-02-24
