import { z } from "zod";
import {
  EMAIL_FORMAT_ERROR,
  isBlankOrValidEmail,
  isValidEmail,
  normalizeEmail,
} from "../utils/email-validation.ts";

export const emailSchema = z.string()
  .transform((value) => normalizeEmail(value))
  .refine((value) => isValidEmail(value), EMAIL_FORMAT_ERROR);

export const optionalEmailSchema = z.string()
  .transform((value) => normalizeEmail(value))
  .refine((value) => isBlankOrValidEmail(value), EMAIL_FORMAT_ERROR)
  .optional();
