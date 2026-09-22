<div align="center">

# DailyModule

## 面向每周执行的个人操作系统

*把固定安排、长期优先级与可自由分配的时间，统一放进一个轻量级执行面板。*

<br>

**少做计划，看清容量，在现实变化时重新分配时间。**

<br>

[![Live App](https://img.shields.io/badge/Live%20App-Open-1f6feb?style=flat&logo=githubpages&logoColor=white)](https://rooney-yan.github.io/DailyModule/)
![Stars](https://img.shields.io/github/stars/Rooney-YAN/DailyModule?style=flat&logo=github)
![Forks](https://img.shields.io/github/forks/Rooney-YAN/DailyModule?style=flat&logo=github)
![React](https://img.shields.io/badge/React-Latest-61DAFB?style=flat&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=flat&logo=vite&logoColor=white)

<br>

[**English**](README.md) · **中文**

<br><br>

**Rooney YAN · 2026**

---

</div>

## 项目简介

**DailyModule** 是一个围绕“每周可用时间有限”这一事实构建的个人规划 Dashboard。

它不希望把效率管理变成一个庞大的任务数据库，而是通过少量稳定模块、最低投入时间和可自由调度时间，帮助用户看清一周到底能做多少事。

它的核心思想是：

> **你的每周容量是有限的，所以计划必须显式体现这个约束。**

## 核心模型

DailyModule 把一周分成三个层级：

```text
固定安排
   │
   ▼
每周可用容量
   │
   ├──► Floor
   │      必须保护的最低投入
   │
   └──► Flex
          可以重新分配的弹性时间
```

### Floor

**Floor** 是某个模块每周最低应该获得的投入时间。

例如：

```text
GPA        5h
Research   3h
Project    2h
```

它的意义不是精确安排每一个小时，而是确保真正重要的事情不会被完全挤掉。

### Flex

**Flex** 是扣除 Floor 和固定安排后剩余的可调度时间。

Flex 可以根据当周的真实情况重新分配给最需要的模块。

### Capacity

系统会显式显示每周容量，避免把不现实的计划伪装成“积极”。

如果计划总量超过可用时间，Dashboard 应该直接告诉你发生了 overcommit。

## 自适应规划

DailyModule 默认接受一个事实：

**现实会变化，计划也应该变化。**

### Done Early

如果一个模块提前完成目标：

```text
未使用 Floor → Flex
```

这部分时间会重新释放，而不是继续被僵化占用。

### Opportunity Override

当突然出现：

- 高价值机会
- 紧急 Deadline
- 临时研究想法
- 重要任务

用户可以主动占用部分原有分配，把时间重新分配。

这被视为有意识的 trade-off，而不是“计划失败”。

## 每周工作流

```text
周日
 ↓
设定各模块 Floor
 ↓
自动计算 Flex
 ↓
安排本周
 ↓
周三检查
 ↓
根据现实重新分配
 ↓
完成 / 释放未使用容量
```

整个系统的目标是：

> **规划本身不能比执行更耗时间。**

## 模块设计

DailyModule 故意采用少量高层级模块，而不是无限增加标签、分类和项目。

典型模块可以包括：

- GPA / 课程
- Research
- 技术学习
- 语言学习
- Personal Project
- Fitness

具体名字可以变化，但产品原则不变：

> **模块要少、容量要清楚、维护成本要低。**

## 日历整合

DailyModule 的目标不是假设“一周所有时间都可自由分配”。

课程、会议等固定安排应该先从总时间中扣除，再计算真实可用容量。

因此项目支持把日历数据纳入规划流程，让固定安排与自由时间分开处理。

## Task Layer

项目还保留一个小型任务 / Deadline 区域，用于管理必须明确追踪的事项。

但任务列表并不是系统核心。

DailyModule 更强调：

> 任务描述 **要做什么**，模块描述 **这一周的时间到底流向哪里**。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| UI | React |
| 语言 | TypeScript |
| 构建工具 | Vite |
| 日期处理 | date-fns |
| 图标 | Lucide React |
| 测试 | Node test runner |
| 部署 | Static Web App / GitHub Pages |

## 本地开发

```bash
git clone https://github.com/Rooney-YAN/DailyModule.git
cd DailyModule

pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

类型检查 / Lint：

```bash
pnpm lint
```

## 项目结构

```text
.
├── public/
├── scripts/
├── src/
├── tests/
├── .github/workflows/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 设计原则

### 1. 先看容量，再谈 ambition

忽视可用时间的计划并不是计划。

### 2. 先保护最低投入，再优化剩余时间

先用 Floor 保证重要任务，再用 Flex 优化其余资源。

### 3. 重新分配是正常行为

计划应该随着新信息变化，而不是因为一次调整就全部失效。

### 4. 低维护成本

这个 Dashboard 本身不能成为新的效率负担。

### 5. 执行优先于装饰

DailyModule 的目标是帮助用户做每周决策，而不是变成另一个“研究生产力工具”的爱好。

## Roadmap

- [ ] 优化 Calendar / ICS 导入
- [ ] 改进容量可视化
- [ ] 强化 Floor → Flex 的释放逻辑
- [ ] 完善 Opportunity Override
- [ ] 改进 Deadline / Assignment 区域
- [ ] 优化移动端布局
- [ ] 增加用户数据导入 / 导出

## 当前状态

DailyModule 仍然是一个持续演化中的个人效率系统。

它刻意保持“有观点”的产品设计：服务于少量高层级优先事项，而不是试图成为一个通用型项目管理平台。

---

<div align="center">

**守住 Floor，分配 Flex，让计划服从现实。**

</div>
