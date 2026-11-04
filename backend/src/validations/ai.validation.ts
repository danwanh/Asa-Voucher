import { z } from "zod";

export const voucherChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(500, "Tin nhắn không được vượt quá 500 ký tự")
      })
    )
    .min(1)
    .max(20)
    .refine((messages) => messages[messages.length - 1].role === "user", { message: "Tin nhắn cuối phải của người dùng" })
});
