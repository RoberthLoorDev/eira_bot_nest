# Agent Guidelines (`eira_bot`)

Follow these rules for all future work in this repository.

## 1. Scope
- **Do not refactor existing code** just to match these rules unless explicitly asked.
- Apply all rules below **from now on** to all new code and future changes.

## 2. TypeScript & Naming
- Always define and use explicit `interface` types (or strict types).
- **Never use `any`.**
- All code identifiers (variables, functions, methods, classes, interfaces, enums, file names) must be written in **English**.

## 3. Comments
- **Only comment non-obvious logic.** Do not add comments to self-descriptive functions or code (for example, a function named `createUser` does not need a comment saying it creates a user).
- Add comments only when there is complex or non-obvious logic that needs explanation.
- All comments must be written in **basic, simple, easy-to-read English**, regardless of length (2, 3, or 5 lines).

## 4. Git Commits
Apply these rules both when asked to **suggest a commit message** ("dame el commit") and when asked to **create a commit** ("haz el commit"):
- Always use a **summary line + bulleted description**:
  - First line: short, clear summary message.
  - Blank line.
  - Body: bullet points using `-` describing the key changes.
- Write all commit titles and bullet points in **basic, simple, easy-to-read English**.
- **NEVER include `Co-Authored-By`, `Author`, or any AI model attribution** in the commit message or metadata.

### Commit Example
```text
feat: add user registration middleware

- Add middleware to check if a Telegram user already exists
- Ask new users for their name before continuing
- Save the user with default categories in the database
```
