import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  PORT: z.string().default("8000"),
});

const env = envSchema.parse(process.env);

export const settings = {
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  frontendOrigin: env.FRONTEND_ORIGIN,
  port: Number(env.PORT),
};
