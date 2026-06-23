# zcode-proxy

A reverse proxy for Z.AI / Bigmodel.cn coding-plan APIs that exposes both OpenAI-compatible and Anthropic-format endpoints.

## Quick Start

```bash
# Install dependencies
bun install

# Copy and edit config
cp config.example.yaml config.yaml
# Edit config.yaml — set your API key

# Start the proxy
bun run src/index.ts

# Or specify a config path
bun run src/index.ts /path/to/config.yaml
```

## Authentication

### Option 1: Direct API Key (simplest)

1. Get an API key from [Z.AI](https://z.ai) or [Bigmodel](https://bigmodel.cn)
2. For Z.AI you need `{apiKey}.{secretKey}` format
3. For Bigmodel you need `{apiKey}` format
4. Set it in `config.yaml`:

```yaml
auth:
  mode: apikey
  apiKey: "yourApiKey.yourSecretKey"
provider: zai  # or bigmodel
```

### Option 2: OAuth Login (browser-based, both providers)

```bash
# Z.AI device/poll flow
bun run src/index.ts auth login zai

# Bigmodel auth-code flow (via zcode.z.ai proxy)
bun run src/index.ts auth login bigmodel

# This will:
# 1. Print an authorize URL and open your browser
# 2. Exchange the auth code for upstream credentials
# 3. Resolve your coding-plan API key automatically
# 4. Save encrypted credentials to ~/.zcode-proxy/credentials.json

# Then set config.yaml:
auth:
  mode: oauth
provider: zai  # or bigmodel
```

### Option 3: Import from ZCode Config (skip OAuth)

If you already use the ZCode desktop app, import the API key directly:

```bash
bun run src/index.ts auth login bigmodel --import
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | OpenAI-compatible chat completions (streaming + non-streaming) |
| `POST` | `/v1/messages` | Anthropic-format messages (streaming + non-streaming) |
| `GET` | `/v1/models` | List available models |
| `GET` | `/health` | Health check |

## Usage Examples

### OpenAI Format

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer your-proxy-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Anthropic Format

```bash
curl http://localhost:8080/v1/messages \
  -H "x-api-key: your-proxy-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer your-proxy-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Write a poem"}],
    "stream": true
  }'
```

### List Models

```bash
curl http://localhost:8080/v1/models \
  -H "Authorization: Bearer your-proxy-secret"
```

## Configuration

| Field | Env Var | Default | Description |
|-------|---------|---------|-------------|
| `server.port` | `ZCODE_PROXY_PORT` | `8080` | Listen port |
| `auth.apiKey` | `ZCODE_API_KEY` | — | Upstream API key |
| `auth.proxyApiKey` | `ZCODE_PROXY_API_KEY` | — | Client auth key |
| `provider` | `ZCODE_PROVIDER` | `zai` | Upstream provider |
| `plan` | — | `coding-plan` | Plan tier: `coding-plan` (direct upstream) or `start-plan` (zcode.z.ai gateway + JWT + captcha) |
| `providers.<p>.credential` | — | — | Per-provider credential override (else uses `auth.apiKey`) |
| `identity.appVersion` | `ZCODE_APP_VERSION` | `3.1.1` | `User-Agent: ZCode/{version}` |
| `identity.sourceTitle` | `ZCODE_SOURCE_TITLE` | `cli` | `X-Title: Z Code@{title}` |
| `identity.refererOrigin` | `ZCODE_REFERER_ORIGIN` | `https://zcode.z.ai` | `HTTP-Referer` URL |
| config file path | `ZCODE_PROXY_CONFIG` | `config.yaml` | Config file to load on `serve` |

Start-plan captcha tunables (env only): `ZCODE_CAPTCHA_RETRIES`, `ZCODE_CAPTCHA_TIMEOUT_MS`, `ZCODE_CAPTCHA_SDK_LOAD_MS`.

## Architecture

```
Client Request
      │
      ▼
Proxy API Key Auth (shared secret)
      │
      ▼
Route Detection + Plan-aware Routing
  /v1/chat/completions (OpenAI client format)
    ├─ coding-plan → TRANSLATE to Anthropic → provider's anthropic endpoint
    └─ start-plan  → TRANSLATE to Anthropic → zcode.z.ai gateway (JWT + captcha)
  /v1/messages     (Anthropic client format)
    ├─ coding-plan → passthrough to provider's anthropic endpoint
    └─ start-plan  → passthrough to zcode.z.ai gateway (JWT + captcha)
      │
      ▼
Body Transformation (ZCode-equivalent mutations)
  OpenAI streaming    → inject stream_options.include_usage
  Anthropic           → add cache_control to last user message
  Anthropic + OAuth   → inject metadata.user_id
      │
      ▼
[Translation mode only] OpenAI request → Anthropic request body
      │
      ▼
Auth + Identity Header Injection
  Translation/coding-plan:  x-api-key: {credential} + anthropic-version
  Translation/start-plan:   Authorization: Bearer {jwt} + anthropic-version
  Passthrough/start-plan:   Authorization: Bearer {jwt} + anthropic-version
  Passthrough/coding-plan:  x-api-key: {credential} + anthropic-version
  Both:                     User-Agent: ZCode/{version} + X-ZCode-* + trace headers
      │
      ▼
Upstream Forward (Bun.fetch)
  Translation mode:   decompress enabled (proxy reads + translates body)
  Passthrough:        decompress disabled (raw gzip bytes stream through)
      │
      ▼
Response Handling
  Passthrough:              raw bytes → client (content-encoding preserved)
  Translation batch:        Anthropic JSON → OpenAI JSON → gzip if client accepts
  Translation SSE stream:   Anthropic SSE → OpenAI SSE chunks → client
```

## Development

```bash
# Run tests
bun test

# Type check
bun x tsc --noEmit

# Run in dev mode
bun run src/index.ts config.yaml

# Compile a single-file binary (→ zcode-proxy.exe, gitignored)
bun run build
```

## Deployment — Hugging Face Spaces (via Docker)

[![Deploy to HF Spaces](https://huggingface.co/front/assets/huggingface_logo-noborder.svg)](https://huggingface.co/new-space?template=Yan-0001/zcode-api)

### Prerequisites

1. A [Hugging Face](https://huggingface.co) account (free, **no credit card needed**)
2. An API key from [Z.AI](https://z.ai) or [Bigmodel](https://bigmodel.cn)

### Step-by-Step

#### 1. Create a Space

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. **Space Name**: `zcode-api` (or whatever you like)
3. **License**: MIT
4. **Space SDK**: **Docker**
5. **Docker Template**: **Custom Docker** (blank)
6. Click **Create Space**

#### 2. Push Code to the Space

```bash
# Add HF Space as a remote
cd zcode-api
git remote add hf https://huggingface.co/spaces/Yan-0001/zcode-api

# Push the master branch
git push hf master
```

#### 3. Set Environment Secrets

Di halaman Space Anda:
- **Settings → Repository Secrets**
- Tambahkan:
  - `ZCODE_API_KEY` → API key Z.AI (`apiKey.secretKey`) atau Bigmodel
  - `ZCODE_PROXY_API_KEY` → secret key untuk client auth (opsional)
  - `ZCODE_PROVIDER` → `zai` atau `bigmodel`

#### 4. Build & Run

HF Spaces otomatis build dari Dockerfile. Setelah selesai, Space Anda aktif di:
`https://yan-0001-zcode-api.hf.space`

> Build pertama butuh ~2-3 menit karena pull image `oven/bun`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZCODE_PROVIDER` | Yes | Upstream provider: `zai` or `bigmodel` |
| `ZCODE_API_KEY` | Yes* | Upstream API key (`yourKey.yourSecret` for Z.AI) |
| `ZCODE_PROXY_API_KEY` | No | Client auth key (recommended) |
| `ZCODE_APP_VERSION` | No | Identity header version (default `3.1.1`) |
| `ZCODE_LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error` |

> *Required only in `apikey` auth mode. For OAuth mode, run `bun run src/index.ts auth login` locally first, then switch `auth.mode` to `oauth` in config.

> **Note:** HF Spaces free tier akan *spin down* setelah ~48 jam tanpa aktivitas. Kenaikan pertama setelah idle agak lambat (~30 detik).

### Testing Your Deployment

```bash
curl https://yan-0001-zcode-api.hf.space/health
# {"status":"ok","provider":"zai"}

curl https://yan-0001-zcode-api.hf.space/v1/models \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"
```

---

## Available Models

The proxy lists these models on `GET /v1/models` (pinned to the GLM coding-plan tier):

| Model | Context | Max Output |
|-------|---------|------------|
| `glm-4.5-air` | 200K | 128K |
| `glm-4.6` | 200K | 128K |
| `glm-4.6v` | 200K | 128K |
| `glm-4.7` | 200K | 128K |
| `glm-5` | 200K | 128K |
| `glm-5-turbo` | 200K | 128K |
| `glm-5v-turbo` | 200K | 128K |
| `glm-5.1` | 200K | 128K |
| `glm-5.2` | 1M | 128K |

Requests for models not in this list are still forwarded upstream — the listing is informational, not a gate.

## License

MIT
