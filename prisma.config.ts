import "dotenv/config";
import { defineConfig } from "prisma/config";
import { urlBase } from "./src/lib/urlBase";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: urlBase(),
  },
});
