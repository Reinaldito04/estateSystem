import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma-generated files
    "src/generated/prisma/**",
    "migrations/snapshots/**",
    "src/prisma/contract.d.ts",
  ]),
  {
    // The project uses classic useEffect + fetch data loading, which the
    // experimental rule flags across many pages. Disable it project-wide to
    // avoid suppressing the standard data-fetching pattern in every page.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      // shadcn-style components commonly forward React.ComponentProps with no
      // extra members; this is intentional and harmless.
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      // Type declaration files for third-party libs without types need any.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
