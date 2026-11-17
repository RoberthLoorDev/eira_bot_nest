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

## 5. Mini Spec-Driven Workflow
- **Small changes or bugfixes**: go straight to code, no spec document needed.
- **New features** (new API/dependency, database change, or touching more than ~3 files):
  1. Clarify ambiguous requirements first, then research and write `docs/specs/<feature>.md` with `Estado: investigando`.
  2. Wait for explicit user approval (`Estado: aprobada`) before writing implementation code.
  3. Implement following the `Spec` section (`Investigación` is context and learning, not direct implementation instructions).
  4. If something changes while implementing, update that exact line in `Plan` directly (do not add a separate deviations section).
  5. When finished: update the file to `Estado: completada` and add a short entry in `docs/HISTORY.md`.
- If the user explicitly says `"directo"` or `"con spec"`, follow that instruction over the size rule.
- Write `docs/specs/*.md` and `docs/HISTORY.md` in **Spanish** (for easy reading and learning), while keeping code, comments, and Git commits in English.

## 6. Research Rules
- Prioritize sources from the **current year and the previous year**.
- **Never claim** a tool, SDK, or model "supports X" or "allows X" without seeing it verified in the research.
- Always compare options **against this project's real stack** (`NestJS`, `Telegraf`, `Prisma`, current dependencies), never in the abstract.
- Keep each `docs/specs/<feature>.md` concise (**~70–120 lines** total as an upper guide, shorter if the feature is clear—never 500-line walls of text or filler).
- Explain **how** options work, trade-offs (cost, limits, fit), **why** one option is chosen, and **why** others are rejected so the user learns from reading it. Add 1-line `Conceptos clave` definitions when introducing unfamiliar technical terms.
- Only compare `Opción A` vs `Opción B` when there is a real technical choice; if there is one obvious approach, summarize it briefly.

## 7. Spec Template (`docs/specs/<feature>.md`)
```markdown
# <Feature>
Estado: investigando | aprobada | completada

## Requisitos
- <Confirmed requirement>
- Fuera de alcance: <What is explicitly excluded>

## Investigación
Conceptos clave (1 línea cada uno, solo si hacen falta).

### Opción A: <nombre>
Cómo funciona. Costo/límites. Encaje con este proyecto.

### Opción B: <nombre>
Cómo funciona. Costo/límites. Encaje con este proyecto.

### Decisión
Elegida: <X>. Por qué conviene en este proyecto y por qué se descartan las demás.

## Spec
### Flujo
Telegram → ... → BD → IA

### Casos borde
- [ ] <Edge case> → <expected behavior>

### Plan
- [ ] <Concrete step 1>
- [ ] <Concrete step 2>
```
