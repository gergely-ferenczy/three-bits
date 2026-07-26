# Contributing to three-bits

Thank you for your interest in contributing! This document outlines the process for contributing to three-bits and helps you get started quickly.

## Reporting Bugs

Before opening a bug report, please search the [existing issues](https://github.com/gergely-ferenczy/three-bits/issues) to avoid duplicates.

When filing a bug report, include:

- A clear and descriptive title.
- Steps to reproduce the issue.
- What you expected to happen and what actually happened.
- Your environment: browser/Node.js version, Three.js version, and three-bits version.
- A minimal reproduction (a CodeSandbox or similar is ideal).

## Suggesting Features

Feature requests are welcome. Open a [GitHub issue](https://github.com/gergely-ferenczy/three-bits/issues) and use the **Feature request** label. Describe:

- The problem you are trying to solve.
- Your proposed solution or API.
- Any alternatives you have considered.

For significant changes, please open a discussion issue **before** writing code, so the direction can be agreed on first.

## Development Setup

**Prerequisites**

- Node.js >= 24.0.0
- npm >= 11.10.0

**Steps**

```sh
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/three-bits.git
cd three-bits

# 2. Install dependencies (git hooks are set up automatically via husky)
npm install

# 3. Verify everything works
npm test
```

**Useful scripts**

| Script                  | Description                    |
| ----------------------- | ------------------------------ |
| `npm run build`         | Compile the library            |
| `npm test`              | Run the test suite once        |
| `npm run test:watch`    | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck`     | Type-check without emitting    |
| `npm run lint`          | Lint with ESLint               |
| `npm run format`        | Format with Prettier           |

## Making Changes

1. **Create a branch** from `main` with a short, descriptive name:

   ```
   git checkout -b fix/orbit-control-wheel-delta
   git checkout -b feat/add-pan-limits
   ```

2. **Write your code.** Keep changes focused — one logical change per pull request.

3. **Add or update tests** for any changed behavior. All existing tests must continue to pass.

4. **Run the full check suite** before pushing:

   ```sh
   npm run typecheck
   npm run lint
   npm test
   ```

## Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are enforced automatically by commitlint on every commit.

**Format**

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

**Allowed types**

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | A new feature                                   |
| `fix`      | A bug fix                                       |
| `docs`     | Documentation changes only                      |
| `test`     | Adding or correcting tests                      |
| `refactor` | Code change that is neither a fix nor a feature |
| `perf`     | A performance improvement                       |
| `style`    | Formatting, whitespace — no logic change        |
| `chore`    | Maintenance tasks (deps, config, etc.)          |
| `ci`       | Changes to CI configuration or scripts          |
| `revert`   | Reverts a previous commit                       |

**Examples**

```
feat(orbit-control): add pan speed option
fix(event-dispatcher): prevent duplicate pointer-enter events
docs: add CONTRIBUTING guide
test(trackball-control): cover edge case for zero delta
```

Breaking changes must be indicated with `!` after the type and explained in the commit footer:

```
feat!: rename OrbitControl option dampingFactor to damping

BREAKING CHANGE: The `dampingFactor` option has been renamed to `damping`.
```

## Pull Request Process

1. Push your branch to your fork and [open a pull request](https://github.com/gergely-ferenczy/three-bits/pulls) against the `main` branch.

2. Fill in the pull request description:
   - Describe **what** changed and **why**.
   - Reference any related issues.

3. Ensure all CI checks pass (tests, type-checking, linting).

4. A maintainer will review your PR.

5. Once approved, a maintainer will squash and rebase-merge the pull request into `main`.
