// backend/src/logging/index.ts

import logger from "./winstonLogger";
import morganMiddleware from "./morganLogger";

export { logger, morganMiddleware };

export default logger;
