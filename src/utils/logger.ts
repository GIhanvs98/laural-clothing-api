import winston from 'winston';
import LokiTransport from 'winston-loki';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Format for local console debugging
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message} `;
    if (Object.keys(metadata).length > 0) {
      msg += JSON.stringify(metadata);
    }
    return msg;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
];

// If Grafana Loki is configured, attach the transport
if (process.env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      basicAuth: process.env.LOKI_AUTH, // e.g., "username:password"
      labels: { app: 'laural-clothing-backend', env: process.env.NODE_ENV || 'development' },
      json: true,
      format: combine(timestamp(), json()),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('[Loki Error]', err)
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports,
  exitOnError: false,
});
