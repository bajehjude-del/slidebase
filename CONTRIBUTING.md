# Contributing to Slidebase 🚀

Thank you for your interest in contributing to **Slidebase** — AI-powered financial automation on the Stellar Network! We welcome contributions from everyone, whether it's a bug fix, a new feature, or a documentation improvement.

Please read this guide carefully before you start.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Architecture](#project-architecture)
- [Getting Started — Local Dev Setup](#getting-started--local-dev-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Install](#1-clone--install)
  - [2. Set Up Environment Variables](#2-set-up-environment-variables)
  - [3. Run the Frontend](#3-run-the-frontend)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it. Please report unacceptable behavior to the maintainers.

---

## Project Architecture

```
slidebase/
├── src/
│   ├── app/              # Next.js App Router pages
│   └── components/       # Reusable UI components
├── prisma/               # Prisma schema
├── public/               # Static assets (logo, etc.)
└── # Talks to the separate Slidebase backend service via /api/*
```

**Tech Stack:**
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Freighter Wallet API
- **Blockchain:** Stellar Network, Stellar SDK
- **Infra:** Vercel (frontend)

---

## Getting Started — Local Dev Setup

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18 | `node --version` |
| npm | >= 9 | `npm --version` |
| Slidebase backend | — | Running on `http://localhost:3001` |

> The backend and the Soroban smart contract (`AutopilotVault`) live in the original AutoPilot monorepo.

### 1. Clone & Install

```bash
git clone <this-repo-url> slidebase
cd slidebase

# Install frontend dependencies
npm install
```

### 2. Set Up Environment Variables

**Frontend** — copy and fill in `.env`:
```bash
cp .env.example .env
```

Key variables to configure:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run the Frontend

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

> **Note:** Install the [Freighter Wallet](https://www.freighter.app/) browser extension and switch it to **Testnet** mode.

---

## Development Workflow

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-number-short-description
   ```

2. **Make your changes** — keep commits small and focused.

3. **Test your changes** locally before pushing.

4. **Push** your branch and open a Pull Request.

---

## Code Style

We use the following formatters — please run them before committing:

```bash
npm run lint      # ESLint
npm run build     # TypeScript + Next.js build
```

**Commit Messages:** Use [Conventional Commits](https://www.conventionalcommits.org/) format:
```
feat: add vault balance widget
fix: resolve wallet disconnect race condition
docs: update CONTRIBUTING.md with build steps
```

---

## Submitting a Pull Request

1. Ensure your branch is up to date with `main`.
2. Fill out the PR template completely.
3. Link the related issue (e.g., `Closes #12`).
4. Add screenshots or test output where relevant.
5. Request a review from a maintainer.

PRs that fail CI checks (lint, build) will not be merged.

---

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Please include:
- A clear description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Your environment (OS, Node version, network: testnet/mainnet)

---

## Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). Please describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

---

Thank you for making Slidebase better! 🌟