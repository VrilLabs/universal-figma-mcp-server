# Figma MCP Access

Pipe Figma MCP through Cloudflare so it's available everywhere and to any agent (local or cloud-based). A Cloudflare Worker-based MCP (Model Context Protocol) server that wraps the Figma REST API, enabling **GitHub Copilot Cloud Agent** and other MCP clients to access Figma design data.

Save precious development time instead of authenticating to Figma's MCP over-and-over.

## Why This Exists

Figma's official MCP server (`mcp.figma.com`) requires browser-based OAuth and restricts access to an allowlisted set of MCP clients. The GitHub Copilot Cloud Agent is not on this allowlist and cannot complete OAuth flows. This worker provides the same design data through the Figma REST API with simple Bearer token authentication.

## Features

- **7 Figma tools** exposed as MCP tools via JSON-RPC 2.0
- **Bearer token authentication** — no OAuth required
- **Cloudflare Worker** deployment — serverless, global edge
- **Standalone Bun server** — local development without Cloudflare
- **Browser test client** — interactive testing UI
- **CORS support** — works with browser-based clients
- **Rate limit awareness** — parses Figma API rate limit headers

## MCP Tools

| Tool | Description | Figma API Endpoint |
|------|-------------|-------------------|
| `get_figma_file` | Get full file document tree | `GET /v1/files/:file_key` |
| `get_figma_node` | Get a specific node by ID | `GET /v1/files/:file_key/nodes` |
| `get_figma_components` | List published components | `GET /v1/files/:file_key/components` |
| `get_figma_variables` | Get design tokens/variables | `GET /v1/files/:file_key/variables/local` |
| `get_figma_comments` | Read file comments | `GET /v1/files/:file_key/comments` |
| `get_team_components` | Search team components | `GET /v1/teams/:team_id/components` |
| `get_figma_styles` | Get shared styles | `GET /v1/files/:file_key/styles` |

## Quick Start

### Prerequisites

1. **Figma Personal Access Token (PAT)** — Generate at [figma.com/settings](https://www.figma.com/settings) → Security → Personal access tokens
   - Required scopes: File content (Read only), Variables (Read only), Comments (Read only)

2. **Service Bearer Token** — Generate with:
   ```bash
   openssl rand -hex 32
   ```

### Local Development (Bun)

```bash
# Install dependencies
npm install

# Set environment variables
export FIGMA_PAT="your_figma_pat"
export SERVICE_BEARER_TOKEN="your_generated_token"

# Start the standalone server
npm start
```

Server runs at `http://localhost:8788`.

### Local Development (Cloudflare Wrangler)

```bash
# Install dependencies
npm install

# Configure local secrets
cat <<'EOF' > .dev.vars
FIGMA_PAT=your_figma_pat
SERVICE_BEARER_TOKEN=your_generated_token
EOF

# Start dev server
npm run dev
```

### Deploy to Cloudflare

```bash
# Set production secrets
wrangler secret put FIGMA_PAT
wrangler secret put SERVICE_BEARER_TOKEN

# Deploy
npm run deploy
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/mcp` | POST | Bearer token | MCP JSON-RPC 2.0 endpoint |
| `/health` | GET | None | Health check |
| `/` | GET | None | Server info |

## MCP Protocol Examples

### Initialize

```bash
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

### List Tools

```bash
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Call a Tool

```bash
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_figma_file",
      "arguments": {
        "file_key": "YOUR_FILE_KEY",
        "depth": 2
      }
    }
  }'
```

## GitHub Copilot Cloud Agent Configuration

Add to your repository's MCP configuration (Settings → Copilot → Coding agent):

```json
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "https://figma-mcp-proxy.<your-subdomain>.workers.dev/mcp",
      "tools": [
        "get_figma_file",
        "get_figma_node",
        "get_figma_components",
        "get_figma_variables",
        "get_figma_comments",
        "get_team_components",
        "get_figma_styles"
      ],
      "headers": {
        "Authorization": "Bearer $COPILOT_MCP_SERVICE_BEARER_TOKEN"
      }
    }
  }
}
```

Store `COPILOT_MCP_SERVICE_BEARER_TOKEN` in the repository's `copilot` environment secrets.

## Browser Test Client

Open `http://localhost:8788/test-client` (standalone Bun server) or use the `public/test-client.html` file directly. The test client provides:

- Input fields for server URL and Bearer token
- One-click buttons for `initialize`, `tools/list`, `ping`
- Tool-specific parameter forms for all 7 tools
- JSON-formatted response display with syntax highlighting

## Project Structure

```
tools/figma-mcp-access/
├── package.json
├── tsconfig.json
├── wrangler.jsonc
├── src/
│   ├── index.ts                 # Cloudflare Worker entry
│   ├── server.ts                # Standalone Bun server
│   ├── mcp-handler.ts           # MCP JSON-RPC 2.0 handler
│   ├── figma-api.ts             # Figma REST API client
│   ├── tools/
│   │   ├── get-figma-file.ts
│   │   ├── get-figma-node.ts
│   │   ├── get-figma-components.ts
│   │   ├── get-figma-variables.ts
│   │   ├── get-figma-comments.ts
│   │   ├── get-team-components.ts
│   │   └── get-figma-styles.ts
│   ├── auth.ts                  # Bearer token authentication
│   ├── types.ts                 # TypeScript interfaces
│   └── utils.ts                 # Utility functions
├── public/
│   └── test-client.html         # Browser test client
├── .dev.vars.example
└── README.md
```

## Error Codes

| Code | Meaning |
|------|---------|
| `-32700` | Parse error — invalid JSON |
| `-32600` | Invalid Request — malformed JSON-RPC |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error |

## Security

- All MCP requests require a valid Bearer token
- Figma PAT is stored as a server-side secret (never exposed to clients)
- CORS headers allow cross-origin access (adjust for production)
- No write operations — this is a read-only proxy
