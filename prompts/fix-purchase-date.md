# Prompt log: Stranger test fix (future purchase dates)

## Why
In the stranger test, my tester saved an item with a purchase date in the future and wasn't sure if that was allowed.

## Prompt 1
Fix one bug found in user testing: users can save an item with a purchase date in the future. On the add/edit item form, don't allow future dates in the date picker, and show "Purchase date can't be in the future" beside the field if one is entered. Enforce the same rule on the server. Purchase date stays optional. Don't change anything else.

## Agent response (summary)
- The date picker now blocks future dates. Entering one shows "Purchase date can't be in the future" and blocks saving.
- The server enforces the same rule through the shared validation.
- Purchase date is still optional.
- One test passed, covering blank, past, today, and future dates.
