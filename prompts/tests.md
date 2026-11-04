# Prompt log: Tests

## Prompt 1: write the tests
Read PLAN.md section 4. Write exactly the 2 tests described there, as two clearly named tests in one test file: (1) "data isolation" and (2) "dashboard average cost per wear." Make sure `npm test` runs both and prints a clear pass/fail for each.

Agent: added both tests in tests/plan.test.js using Node's built-in test runner. 2 passed, 0 failed.

## Prompt 2: red
Temporarily break two things so I can show each test failing: remove the user_id check from the items list and detail queries, and change average cost per wear to total price ÷ total wears.

Agent: changed only server/index.js. Both tests failed: User B could see "Black slip dress," and the dashboard returned $45.00 instead of $50.00.

## Prompt 3: green
Undo both temporary breaks exactly, restoring the original code. Both tests pass again.