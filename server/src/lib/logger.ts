import pino from "pino";
import { env } from "../config/env.js";

const options: pino.LoggerOptions = {
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    censor: "[redacted]",
    paths: ["req.headers.authorization", "req.headers.cookie"],
  },
};

if (env.NODE_ENV === "development") {
  options.transport = { target: "pino-pretty" };
}

export const logger = pino(options);
