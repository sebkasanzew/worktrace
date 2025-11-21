/**
 * @type {import('ts-to-zod').TsToZodConfig}
 */
const config = [
  {
    name: "bindings",
    input: "src/types/bindings.ts",
    output: "src/types/bindings.zod.ts",
    nameFilter: (name) => {
      const excludedTypes = ["__EventObj__", "Result"]
      for (const excluded of excludedTypes) {
        if (name === excluded) return false
      }
      return true
    },
  },
];

export default config;
