import { z } from "zod";

export async function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): Promise<z.infer<T>> {
  try {
    return await schema.parseAsync(data);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const issues = (error as z.ZodError).issues.map((i: z.ZodIssue) =>
        `${i.path.join(".")}: ${i.message}`
      ).join(", ");
      throw new Error(`資料驗證失敗: ${issues}`);
    }
    throw error;
  }
}
