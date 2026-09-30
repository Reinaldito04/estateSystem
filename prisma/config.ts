import { defineConfig } from 'prisma/config'
export default defineConfig({
  schemas: ["./prisma/schema.prisma"],
  previewFeatures: {}
})