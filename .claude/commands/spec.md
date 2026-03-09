When the user provides a feature idea, follow these steps in order:

## Step 1 – Ask clarifying questions
Before doing anything, ask the user the following questions one by one (wait for answers):
1. What problem does this feature solve? Who is the user?
2. What are the main actions the user should be able to do?
3. Are there any constraints or things this feature should NOT do?
4. Should this connect to any external service (e.g. OneDrive, an API)?
5. Any UI preferences or flows in mind?

## Step 2 – Build the architecture together
Based on the answers, propose:
- The files/components that will be created or modified
- The data flow (frontend → backend → external service if any)
- Any new API endpoints needed
- Confirm with the user before moving on

## Step 3 – Document it
Create a spec file at `.claude/specs/<feature-name>.md` with:
- Feature name and description
- User stories
- Architecture overview (files, endpoints, data flow)
- Open questions / decisions made
- Date created

## Step 4 – Create a git branch
Run:
```bash
git checkout -b feature/<feature-name>
```
Confirm the branch was created and tell the user they are now on it.

respect everything from the .claude.md file as well.
Do NOT write implementation code until Step 2 is approved and you finished all the steps.

Prefer the simplest architecture possible.
Avoid unnecessary frameworks or complexity.
Never modify more files than necessary.