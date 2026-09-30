---
description: "Inspect staged changes and create a git commit in this repository's style"
argument-hint: "Optional extra context for the commit message"
agent: "agent"
---

Create a git commit for the current staged changes only.

Rules:

- Work only from staged state. Use `git diff --cached`, `git diff --cached --stat`, and `git diff --cached --name-only` rather than unstaged diffs.
- If nothing is staged, stop and reply with `No staged changes to commit.`
- Inspect recent commit subjects with `git log --format=%s -n 30` before writing the message, and match the existing repository style.
- Prefer a conventional commit subject in the form `<type>: <summary>`.
- Choose the most accurate type from the patterns already used in this repository, especially `feat`, `fix`, `refactor`, `chore`, and `test`.
- Keep the subject concise, lowercase, and without a trailing period.
- Use a scope only when it is clearly justified by the staged changes.
- Do not use release-specific subjects such as `chore(release): ... [skip ci]` unless the staged changes are actually a release/version bump.
- Base the summary on the primary behavior change or maintenance outcome, not on a file list.
- If the staged changes contain multiple unrelated concerns that cannot be described honestly in one concise commit subject, stop and explain that the commit should be split instead of guessing.
- If the prompt input contains extra context, use it only when it improves the subject and still matches the repository's style.

Execution steps:

1. Inspect the staged files and staged diff.
2. Inspect recent commit subjects to calibrate the wording.
3. Draft one commit subject that matches the repository's style.
4. Run `git commit -m "<subject>"`.
5. Report the result.

Response format:

- On success: `Committed <short-sha> with: <subject>`
- On no staged changes: `No staged changes to commit.`
- On commit failure: briefly report the reason and do not invent a success.
- On ambiguous staged work: explain why the staged changes should be split before committing.
