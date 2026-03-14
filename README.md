# n8n node code and sys prompts

## js node code to filter elastic search log query response from http node

```javascript
const items = $input.all();
const esResponse = items[0]?.json;

// Fix 1: Always return full_log_dump as a string, even on failure
if (!esResponse || !esResponse.hits || !esResponse.hits.hits) {
  return [{ json: { full_log_dump: "[]" } }];
}

const allHits = esResponse.hits.hits;
const relevantHits = allHits.filter(
  (h) => h._source && h._source.msg === "CRITICAL_SYSTEM_ERROR",
);
const logsToProcess = relevantHits.length > 0 ? relevantHits : allHits;

const cleanLogs = logsToProcess.map((h) => {
  const src = h._source;
  return {
    timestamp: src["@timestamp"] || new Date().toISOString(),
    traceId: src.traceId || "MISSING",
    requestId: src.requestId || src.req?.id || "MISSING",
    hostname: src.hostname || "Unknown Host",
    message: src.errorMessage || src.err?.message || src.msg || "Unknown Error",
    stack: src.errorStack
      ? src.errorStack
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [],
    request: {
      method: src.req?.method || "N/A",
      url: src.req?.url || "N/A",
      query: src.req?.query || {},
    },
  };
});

// Fix 2: JSON.stringify the array and assign to full_log_dump
return [
  {
    json: {
      full_log_dump: JSON.stringify(cleanLogs, null, 2),
    },
  },
];
```

## Notifier Agent SYS prompt

```bash
You are an SRE. Use the provided logs and stack trace to generate a GitHub Issue in JSON format.

**IMPORTANT only provide one most appropriate label

If the logs are unclear, just create an issue saying breaking issue and mention the filename dont try to guess
```

## Structured op parser json on notifier agent

```json
{
  "title": "A short descriptive title of the crash",
  "body": "Markdown formatted description of problem in plain english with necessary details included like related file name or other important info",
  "label": "bug"
}
```

## Slack node block message template

````json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Critical Server Error Intercepted"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*GitHub Issue:*\n<{{ $json.html_url }}|#{{ $json.number }} - {{ $json.title }}>"
        },
        {
          "type": "mrkdwn",
          "text": "*Trace ID:*\n`{{ $('HTTP Request').first().json.hits.hits[0]._source.traceId }}`"
        },
        {
          "type": "mrkdwn",
          "text": "*Endpoint:*\n`{{ $('HTTP Request').first().json.hits.hits[0]._source.req.method }} {{ $('HTTP Request').first().json.hits.hits[0]._source.req.url }}`"
        },
        {
          "type": "mrkdwn",
          "text": "*Host:*\n`{{ $('HTTP Request').first().json.hits.hits[0]._source.hostname }}`"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Raw Stack Trace:*\n```\n{{ JSON.stringify($('HTTP Request').item.json.hits.hits[2]._source.err.stack || 'No stack trace found').slice(1, -1) }}\n```"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "emoji": true,
            "text": "Investigate"
          },
          "style": "primary",
          "value": "dummy_click_1"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "emoji": true,
            "text": "Acknowledge"
          },
          "style": "danger",
          "value": "dummy_click_2"
        }
      ]
    }
  ]
}
````

## Healer agent sys prompt

```bash
you are a helpfull coding assistant
**Repository Context:**
- Repo: helloGourab/node-app-pino-logging-n8n
- Target Branch (Read-Only): main

**Your Objective:**
Analyze the provided error logs and stack traces, read the relevant code, and implement a fix via a new branch.

**Action (If Fixable):**
   - Create a new branch off `main`
   - Apply the exact code changes by updating or writing files in the new branch

**Action (If Unfixable):**
   - STOP. Do not modify any files. Do not create a branch. Do not guess. leave with a short response

**project file structure:**
├── docker-compose.yml
├── filebeat.yml
├── Makefile
├── package.json
├── package-lock.json
├── README.md
└── src
    ├── config
    │   └── logger.js
    ├── controllers
    │   ├── github.controller.js
    │   └── user.controller.js
    ├── index.js
    ├── lib
    │   ├── mongodb.js
    │   └── notifier.js
    ├── middlewares
    │   └── validate.js
    ├── models
    │   ├── github.model.js
    │   └── user.model.js
    ├── routes
    │   ├── github.route.js
    │   └── user.route.js
    ├── schemas
    │   ├── github.schema.js
    │   └── user.schema.js
    └── services
        ├── github.service.js
        └── user.service.js

```
