// backend/src/logging/winstonLogger.ts

import winston from "winston";
import fse from "fs-extra";
import logform from "logform";

const { combine, metadata, label, timestamp, colorize, align, errors, json } =
    logform.format;

// Make sure the logging directory exits
fse.ensureDirSync("tmp/logs");

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            format: combine(
                errors({ stack: true }),
                timestamp({
                    format: "YYYY-MM-DDTHH:mm:ssZ"
                }),
                label({ label: "service:backend" }),
                metadata()
            ),
            handleExceptions: true,
            level: process.env.LOG_LEVEL || "debug"
        })
    ]
});

export default logger;
