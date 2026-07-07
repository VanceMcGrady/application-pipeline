import cors from "cors";
import express from "express";
import { settings } from "./config.js";
import { achievementsRouter } from "./routes/achievements.js";
import { boardsRouter } from "./routes/boards.js";
import { educationRouter } from "./routes/education.js";
import { healthRouter } from "./routes/health.js";
import { meRouter } from "./routes/me.js";
import { postingsRouter } from "./routes/postings.js";
import { rolesRouter } from "./routes/roles.js";
import { skillsRouter } from "./routes/skills.js";

export const app = express();

app.use(
  cors({
    origin: settings.frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.use(healthRouter);
app.use(meRouter);
app.use("/roles", rolesRouter);
app.use("/achievements", achievementsRouter);
app.use("/skills", skillsRouter);
app.use("/education", educationRouter);
app.use("/boards", boardsRouter);
app.use("/postings", postingsRouter);
