---
description: "Review a React component for adherence to the project's component structure and conventions"
argument-hint: "Path to the component folder or file"
---

Perform a code review of the React component located at the provided path or based on the active selection.
Ensure the component follows the rules defined in [.github/instructions/components.instructions.md](.github/instructions/components.instructions.md).

### Review Checklist:

#### Important

All these rules must be followed only if the component does have these parts. For example, if the component does not have a `utils.ts` file, then it is not a violation. If the component does not have styles defined in a CSS module, then it is not a violation. If the component does not have any constants, then it is not a violation.

1.  **Folder & File Structure**:
    - Verify if the component is in a dedicated folder.
    - Check for `types.ts`, `ComponentName.tsx`, `ComponentName.module.css`, and `index.ts`.
    - Ensure `index.ts` correctly exports the component and all types.
    - Check if `utils.ts` and `const.ts` are used for logic and constants instead of keeping them in the main component file.

2.  **React Component Code**:
    - Must be a functional component using React hooks.
    - Props must be defined using TypeScript interfaces or types in `types.ts`.
    - The component file should not contain utility functions or constants.
    - Do not create a utility function for a single use case, one line functions or simple conditions.

3.  **Styling (CSS Modules)**:
    - Styles must be defined in `ComponentName.module.css`.
    - The top-level wrapper class in CSS should ideally match the component name (e.g., `.myComponent` for `MyComponent`).
    - Verify that CSS classes are imported and used via the `s` or `styles` object (e.g., `import s from './ComponentName.module.css'`).

4.  **Naming Conventions**:
    - Use camelCase for constants and variables.
    - Ensure consistent naming between the folder, the main file, and the component itself.

### Output format:

- List any violations found.
- Provide clear instructions or snippets to fix each violation.
- If the component follows all rules, provide a brief confirmation.
