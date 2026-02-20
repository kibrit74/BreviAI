# MCP Pilot (v0.1) - BreviAI

BreviAI backend now exposes a pilot MCP gateway endpoint:

- `GET /api/mcp` -> list capabilities and available tools
- `POST /api/mcp` -> list tools or call a tool

## Authentication

All MCP requests require:

- Header: `x-app-secret: <APP_SECRET>`

## Actions

### 1) List tools

```json
{
  "action": "list_tools"
}
```

### 2) Call a tool

```json
{
  "action": "call_tool",
  "toolName": "breviai.web_search",
  "arguments": {
    "query": "istanbul hava durumu",
    "limit": 5
  }
}
```

## Pilot tools

1. `breviai.web_search`
- Read-only web search wrapper.
- Args:
`query` (string, required)
`limit` (number, optional, 1-20)

2. `breviai.list_templates`
- Read-only template listing wrapper.
- Args:
`category` (string, optional)
`limit` (number, optional, 1-50)

## Example curl

```bash
curl -X POST "https://<your-backend>/api/mcp" \
  -H "Content-Type: application/json" \
  -H "x-app-secret: <APP_SECRET>" \
  -d '{"action":"list_tools"}'
```
