# Prompt log: Feature 4 (Validation)

## Prompt 1
Read PLAN.md. Build ONLY feature 4 (validation) on the add/edit item form.
- Name, category, and size are required. Price is optional, but if entered it can't be negative.
- Show a friendly message next to each field with a problem (for example, "Please add a name"), and don't save the item until it's fixed.
- Enforce the same rules on the server, so bad data can't be saved even if the form is bypassed.
- Keep the existing styling. Don't build any other features.
- Stay on the current branch. Do not switch branches, push, or merge.
When done, tell me what you changed and how you tested it.

## Agent response (summary)
- Added messages beside invalid fields: "Please add a name," "Please choose a category," "Please add a size," and "Price can't be negative."
- Blank or whitespace-only names and sizes are rejected. Price is optional; zero and positive prices are allowed.
- The server enforces the same rules and also rejects categories that don't exist.
- Tested with 5 automated validation tests, plus 14 invalid create and 14 invalid edit requests sent directly to the server. Failed edits left the original item unchanged.
- The Agent's preview browser couldn't sign in, so I checked the messages manually in the preview.