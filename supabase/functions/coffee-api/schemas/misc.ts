import { z } from "zod";
import { optionalEmailSchema } from "./email.ts";

export const testEmailSchema = z.object({
  to: optionalEmailSchema,
});
