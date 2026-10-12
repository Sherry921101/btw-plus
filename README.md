# btw-plus

A Claude Code mod that replaces the built-in `/btw` popup with a larger pane and keeps a history of every side question.

- Answers show in a resizable pane (docked beside the transcript in fullscreen, inline otherwise).
- Older questions collapse to one line; click `▸` to expand, `▾` to collapse.
- Every Q&A is appended to `<project>/.claude/btw-history.md`.
- Like the built-in `/btw`, answers use the current conversation as context and are not added to it.

## Install

Type this at the Claude Code prompt in a terminal:

```
/plugin install btw-plus --marketplace Sherry921101/btw-plus
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

## Usage

```
/btw <question>   ask a side question
/btw              reopen the pane
```

Press `Esc` to close the pane. Mouse clicks on `▸` work in the fullscreen layout; otherwise focus the pane with `ctrl+x tab` and press `Enter`.

Tip: add `.claude/btw-history.md` to your project's `.gitignore` if you don't want the history tracked.

## Notes

- Waiting for an answer may block the prompt until the answer arrives.
- Interrupting the main turn also aborts a running `/btw`.
