import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ level: 'info' });
const pinoMiddleware = pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-trace-id'] || uuidv4(),
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    }
});

const app = express();
app.use(pinoMiddleware);
app.use(express.json());

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/incident-trigger';
const N8N_API_KEY = process.env['X-N8N-API-KEY'] || process.env.X_N8N_API_KEY || '';

app.use((req, res, next) => {
    req.traceId = req.headers['x-trace-id'] || uuidv4();
    next();
});

app.get('/api/data', (req, res) => {
    if (req.query.fail === 'true') {
        throw new Error("Database connection timeout simulated.");
    }
    res.status(200).json({ status: 'success', traceId: req.traceId });
});

app.use(async (err, req, res, next) => {
    const traceId = req.traceId;

    req.log.error({
        msg: "Critical Error Intercepted",
        error: err.message,
        stack: err.stack,
        traceId
    });

    axios.post(N8N_WEBHOOK_URL, {
        event: "SERVER_ERROR_500",
        service: "node-sample-app",
        message: err.message,
        traceId: traceId,
        timestamp: new Date().toISOString()
    }, {
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY
        }
    }).catch(e => console.error("Failed to notify n8n:", e.message));

    res.status(500).json({ error: "Internal Server Error", traceId });
});

app.listen(3000, () => logger.info("Server started on port 3000"));