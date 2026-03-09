import { z } from "zod";

// This is a frontend-only mockup, so we don't need real database tables.
// Leaving a dummy schema to satisfy the build system.
export const dummySchema = z.object({
  id: z.string(),
});
