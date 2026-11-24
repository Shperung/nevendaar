---
name: commit
description: Generates a Conventional Commits message from staged changes only and commits them. Use when the user invokes /commit or asks to commit staged files.
disable-model-invocation: true
---

# Commit

Пише повідомлення коміту **лише за застейдженими змінами** і комітить їх.

## Кроки

1. Зібрати контекст (паралельно):
   ```bash
   git diff --cached --stat
   git diff --cached
   git log -n 10 --oneline
   ```
2. Якщо `git diff --cached` порожній — сказати "Немає застейджених змін" і зупинитися.
3. Скласти повідомлення за форматом нижче, спираючись тільки на staged diff.
4. Закомітити через heredoc:
   ```bash
   git commit -F - <<'EOF'
   <повідомлення>
   EOF
   ```
5. Показати `git log -1 --stat` і коротко підсумувати.

## Заборонено

- `git add`, `git commit -a`, `git stash` або будь-які зміни в робочому дереві / індексі.
- Описувати незастейджені чи untracked файли.
- `--no-verify`, `--amend`, push. Якщо pre-commit hook впав — показати помилку й зупинитися.

## Формат повідомлення

```
<type>(<scope>): <summary>

<body — опційно>
```

- `type` — один із префіксів проєкту: `feat`, `fix`, `refactor`, `data`, `tools`, `docs`, `test`, `chore`.
- `scope` — опційно, тека/модуль: `ecs`, `map`, `core`, `ui`, `gameplay`, `save`, `tools`.
- `summary` — англійською, наказовий спосіб, з малої літери, без крапки, ≤ 72 символи.
- `body` — лише якщо зміна неочевидна: 1–3 рядки *чому*, а не перелік файлів.
- Нова залежність → у body обґрунтування (вимога AGENTS.md §6).
- Якщо staged зміни охоплюють кілька непов'язаних задач — запропонувати розбити коміт і не комітити без підтвердження.

## Приклади

```
feat(map): add A* pathfinding around obstacles

Uses easystarjs on the tile grid; corner cutting disabled so the
hero never clips block corners.
```

```
fix(ecs): stop hero jitter when reaching the last waypoint
```
