import { config } from "./env.config.js";

export const corsOptions = {
  origin: config.corsOrigin === "*" 
    ? "*" 
    : config.corsOrigin.split(","),
  credentials: true,
  optionsSuccessStatus: 200,
};

export default corsOptions;
