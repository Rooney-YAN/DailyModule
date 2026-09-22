<div align="center">

# DailyModule

## A Personal Operating System for Weekly Execution

*Turn fixed commitments, weekly priorities, and flexible time into a lightweight execution dashboard.*

<br>

**Plan less. See capacity clearly. Reallocate time when reality changes.**

<br>

[![Live App](https://img.shields.io/badge/Live%20App-Open-1f6feb?style=flat&logo=githubpages&logoColor=white)](https://rooney-yan.github.io/DailyModule/)
![Stars](https://img.shields.io/github/stars/Rooney-YAN/DailyModule?style=flat&logo=github)
![Forks](https://img.shields.io/github/forks/Rooney-YAN/DailyModule?style=flat&logo=github)
![React](https://img.shields.io/badge/React-Latest-61DAFB?style=flat&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-Latest-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=flat&logo=vite&logoColor=white)

<br>

**Rooney YAN · 2026**

---

</div>

## Overview

**DailyModule** is a lightweight personal planning dashboard built around one idea:

> **Your week has a finite capacity. Plans should make that constraint visible.**

Instead of turning productivity into a giant task database, DailyModule separates work into a few stable modules, gives each module a minimum weekly commitment, and keeps the remaining capacity flexible.

The result is a planning system that can adapt when work finishes early, deadlines appear, or priorities change.

## Core Model

DailyModule organizes a week around three layers:

```text
Fixed Commitments
      │
      ▼
Available Weekly Capacity
      │
      ├──► Floor Hours
      │      Minimum protected effort
      │
      └──► Flex Hours
             Reallocatable capacity
```

### Floor

A **Floor** is the minimum amount of time a module should receive during the week.

Examples:

```text
GPA        5h
Research   3h
Project    2h
```

### Flex

**Flex** is the capacity left after floors and fixed commitments are accounted for.

It can move toward whichever module needs it most.

### Capacity

The dashboard makes overcommitment visible instead of hiding it behind an endless task list.

If the total plan exceeds the available week, the system should say so.

## Adaptive Planning

DailyModule is designed for plans that change during execution.

### Done Early

If a module finishes its required work earlier than expected:

```text
unused Floor → Flex
```

The time becomes available again instead of remaining artificially locked.

### Opportunity Override

When a high-value opportunity, deadline, or unexpected task appears, part of the weekly allocation can be deliberately overridden and reallocated.

The system treats this as a conscious trade-off, not as a failure of planning.

## Weekly Workflow

```text
Sunday
  ↓
Set module Floors
  ↓
Calculate available Flex
  ↓
Plan the week
  ↓
Wednesday Check
  ↓
Reallocate if needed
  ↓
Finish / release unused capacity
```

The goal is to keep planning overhead low enough that the system remains useful during busy weeks.

## Modules

DailyModule is intentionally built around a small module library rather than hundreds of tags and categories.

A typical setup may include areas such as:

- GPA / coursework
- research
- technical learning
- language learning
- personal projects
- fitness

The exact labels can evolve, but the product philosophy stays the same: **few modules, clear capacity, low maintenance**.

## Calendar Integration

The project is designed to coexist with a real schedule rather than pretending every hour is free.

Calendar data can be imported so that recurring commitments such as classes and meetings are separated from discretionary planning time.

## Task Layer

DailyModule also keeps a compact task / deadline area for items that need explicit tracking.

This is intentionally secondary to the capacity model:

> tasks describe **what** must be done; modules describe **where the week goes**.

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React |
| Language | TypeScript |
| Build tool | Vite |
| Date utilities | date-fns |
| Icons | Lucide React |
| Testing | Node test runner |
| Deployment | Static web app / GitHub Pages |

The current project uses React, Vite, TypeScript, `date-fns`, and `lucide-react`, with build, test, and static-app scripts defined in `package.json`.

## Local Development

```bash
git clone https://github.com/Rooney-YAN/DailyModule.git
cd DailyModule

pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Type-check / lint:

```bash
pnpm lint
```

## Project Structure

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

The repository already contains dedicated source, script, test, public asset, and GitHub Actions directories.

## Design Principles

### 1. Capacity before ambition

A plan that ignores available hours is not a plan.

### 2. Minimums before optimization

Protect the important work first with Floors, then optimize the remaining Flex.

### 3. Reallocation is expected

Plans should adapt to new information without requiring a complete rebuild.

### 4. Low maintenance

The dashboard should take less time to maintain than the planning problems it solves.

### 5. Execution over decoration

DailyModule is meant to help make weekly decisions, not become another productivity hobby.

## Roadmap

- [ ] Refine calendar / ICS import
- [ ] Improve capacity visualization
- [ ] Make Floor → Flex release more explicit
- [ ] Expand opportunity override controls
- [ ] Improve deadline / assignment tracking
- [ ] Polish mobile layout
- [ ] Add import / export for user data

## Status

DailyModule is an evolving personal productivity experiment.

The product is intentionally opinionated and optimized for a small number of high-level priorities rather than general-purpose project management.

---

<div align="center">

**Protect the floor. Allocate the flex. Make the week fit reality.**

</div>
