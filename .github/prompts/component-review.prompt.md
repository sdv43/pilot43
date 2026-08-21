---
description: "Review a React component for adherence to the project's component structure and conventions"
argument-hint: "Path to the component folder or file"
---

Perform a code review of the React component located at the provided path or based on the active selection.
Ensure the component follows the rules defined in [.github/instructions/components.instructions.md](.github/instructions/components.instructions.md).

### Review Checklist:

#### Important

All these rules must be followed only if the component does have these parts. For example, if the component does not have a `utils.ts` file, then it is not a violation. If the component does not have styles defined in a CSS module, then it is not a violation. If the component does not have any constants, then it is not a violation.

Additional anti-pattern rules:

- Do not invent missing files or folders. Do not require `ComponentName.module.css`, `types.ts`, `utils.ts`, `const.ts`, or `index.ts` unless they are actually needed by the current implementation.
- Do not require a CSS file when the component has no styles or the styling is handled elsewhere.
- Do not require a `utils.ts` file for tiny helpers, one-off logic, or conditions that are only used in the component file.
- Do not require `types.ts` if the component has no props or if the props are already simple and local to the file.
- Do not relocate a root-level or bootstrap component such as `App` into a nested `components/App` folder just to satisfy a generic folder convention unless the project clearly treats it as a normal reusable component.
- Do not convert a valid class-based component such as an `ErrorBoundary` into a function just because the generic rule prefers function components. Only flag it if there is a concrete defect or a project requirement that is being violated.
- Do not give vague instructions like "ensure the component folder structure follows the convention". Replace them with a specific action that is directly supported by the code, such as "move this helper to utils.ts" or "keep this component at its current root location".
- If a component already satisfies the project requirements, do not add synthetic issues.

1.  **Folder & File Structure**:
    - Verify if the component is in a dedicated folder.
    - Check for `types.ts`, `ComponentName.tsx`, `ComponentName.module.css`, and `index.ts` only when the component actually contains the corresponding logic or styles.
    - Ensure `index.ts` correctly exports the component and all types when such exports exist.
    - Check if `utils.ts` and `const.ts` are used for logic and constants instead of keeping them in the main component file, but only when those files already exist or clearly belong there.

2.  **React Component Code**:
    - Prefer functional components using React hooks when the current implementation is consistent with the project pattern, but do not force conversion when the component is intentionally implemented as a class-based boundary or another valid pattern.
    - Props must be defined using TypeScript interfaces or types in `types.ts` only when the props are a real reusable contract.
    - The component file should not contain utility functions or constants when those belong in separate files.
    - Do not create a utility function for a single use case, one-line functions, or simple conditions.
    - React types should be imported from the 'react' package and not from global 'React.'.
    - The primary component file `ComponentName.tsx` must contain only the component logic and JSX, with no additional JSX components or logic that should be in separate files.

3.  **Styling (CSS Modules)**:
    - Styles must be defined in `ComponentName.module.css` only when styles exist and are actually used by the component.
    - The top-level wrapper class in CSS should ideally match the component name (for example, `.myComponent` for `MyComponent`).
    - Verify that CSS classes are imported and used via the `s` or `styles` object (for example, `import s from './ComponentName.module.css'`).

4.  **Naming Conventions**:
    - Use camelCase for constants and variables.
    - Ensure consistent naming between the folder, the main file, and the component itself.

### Output format:

- List any violations found.
- Provide clear, concrete instructions to fix each violation.
- Keep every issue action-oriented and tied to the real code. Do not suggest missing files, impossible refactors, or conversions without a concrete reason.
- If the component follows all rules, do not write any extra review text. Only mark it as reviewed without issues.
- In other words: success should be represented by a clean status, not by a positive summary paragraph.
