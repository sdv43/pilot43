# React component folder and file structure

```plaintext
ComponentName/
  types.ts
  ComponentName.tsx
  ComponentName.module.css
  index.ts
  utils.ts
  hooks/
    useHookName.ts
  assets/
    image.png
  components/
    SubComponentName/
      ... // same structure as above
```

# React component code

- Use functional components and React hooks for state management and side effects.
- Define prop types using TypeScript interfaces or types in a separate `types.ts` file.
- Use CSS Modules for styling, with styles defined in a `ComponentName.module.css` file.
- Export the main component from an `index.ts` file for easier imports.

```tsx
// ComponentName.tsx
import s from "./ComponentName.module.css"

// Do not write any utility functions or constants in this file. Use `utils.ts` and `const.ts` for that purpose.

export function ComponentName(props: ComponentNameProps) {
  // component logic and JSX
}
```

```ts
// types.ts
// Must contain only type definitions or interfaces
export interface ComponentNameProps {
  // define prop types here
}
```

```ts
// index.ts
export { ComponentName } from "./ComponentName"
export * from "./types"
```

```ts
// const.ts
// use camelCase for constants and variables
export const someConstant = "value"
```

```css
/* ComponentName.module.css */
.componentName {
  /* this css class should be used as top level wrapper for the component */
  /* styles for the component */
}
```
