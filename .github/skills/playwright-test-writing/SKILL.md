---
name: playwright-test-writing
description: Use this skill when refactoring, creating tests.
---

## Testing Strategy

### Incremental Test Development

- **One test at a time**: Add a single test, run it in isolation, fix if needed, then move to the next test.
- **Max 4 fix attempts**: If a test fails after 4 attempts, move on to the next test.

### Mock Management

- **Reuse base mocks**: Leverage existing `beforeEach` mocks from the test file.
- **Minimal overrides**: Only override mocks that are genuinely needed for the specific test case.
- **Reload after mock changes**: Always call `await page.reload()` after modifying mocks to ensure fresh state.

### Execution Discipline

- **Focused runs**: Run only the test being worked on (`npx playwright test -g "test name"`), not the entire suite.
- **Build after each change**: Run `npm run build` after every code change before testing.
- **Final smoke test**: After all tests are added, run all new tests together as a final validation.

### Selector Best Practices

- **No CSS selectors**: Never use CSS selectors in tests.
- **Use data-testid**: Use `data-testid` attributes for all element queries.
- **Add missing testids**: If a needed `data-testid` is missing, add it to the component code. But try to avoid adding new testids unless absolutely necessary.
