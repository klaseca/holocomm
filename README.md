# Holocomm

Holocomm provides small voice rooms without accounts or saved history. It combines
WebSocket-based presence, chat, and WebRTC signaling with peer-to-peer microphone and
screen-sharing streams. Profiles and saved room shortcuts stay in the browser; the
server does not persist rooms, messages, or users.

## Features

- Local profiles without accounts
- Saved room shortcuts in `localStorage`
- Room preview before joining
- Real-time chat and participant presence
- Peer-to-peer microphone audio
- Screen sharing with optional system audio
- Per-participant volume and local mute controls
- Light, dark, and system themes
- One production container serving both the API and the built frontend

## Requirements

- Node.js 24.18 or newer
- [Aube](https://aube.jdx.dev/) 2.2 or newer
- Docker with BuildKit, if building the production image

## Local development

Install dependencies:

```sh
aube install
```

Create local configuration files:

```sh
cp apps/backend/.env.example apps/backend/.env
```

Start the backend and frontend development servers:

```sh
aube run dev
```

Open <http://localhost:5173>. The frontend loads its public WebSocket URL from the
backend through `/api/config` and connects directly to the backend on port `3000`.

## Configuration

### Backend

The backend reads `apps/backend/.env` during local development. Values not marked as
required have schema defaults.

| Variable | Default | Description |
| --- | --- | --- |
| `WEBSOCKET_URL` | required | Public `ws://` or `wss://` URL returned to the frontend |
| `RTC_ICE_SERVERS` | `stun:stun.l.google.com:19302` | Comma-separated STUN/TURN URLs returned to the frontend |
| `ALLOWED_ORIGIN` | `*` | Browser origin accepted for WebSocket upgrades |
| `HOST` | `localhost` | Address listened to locally; the container overrides it with `0.0.0.0` |
| `PORT` | `3000` | HTTP and WebSocket port |
| `STATIC_FILES_PATH` | unset | Built frontend directory served by the backend |
| `EMPTY_ROOM_TTL_MS` | `60000` | Retention time for an empty in-memory room |
| `MAX_PARTICIPANTS` | `4` | Maximum joined participants in one room |
| `MAX_WEBSOCKET_PAYLOAD_BYTES` | `16384` | Maximum WebSocket message size |
| `MAX_WEBSOCKET_CONNECTIONS` | `1000` | Maximum simultaneous WebSocket connections |
| `HEARTBEAT_INTERVAL_MS` | `30000` | WebSocket ping interval |
| `WEBSOCKET_RATE_LIMIT_PER_SECOND` | `120` | Message limit for one connection |
| `MAX_CHAT_MESSAGE_LENGTH` | `2000` | Maximum chat message length |
| `SHUTDOWN_TIMEOUT_MS` | `8000` | Grace period before remaining connections are terminated |
| `LOG_LEVEL` | `info` | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` |

### WebRTC runtime configuration

`RTC_ICE_SERVERS` is a comma-separated list of STUN/TURN URLs:

```env
RTC_ICE_SERVERS=stun:stun1.example.com:3478,turn:turn.example.com:3478
```

The backend validates this setting and returns it to the frontend through `/api/config`.
Changing it requires restarting the container, but not rebuilding the image.

Only the `p2p` RTC mode is currently implemented. With the default room size of four,
every participant sends media directly to every other participant.

## Production with Docker and Caddy

Holocomm intentionally does not terminate TLS. Microphone and screen-capture APIs
require a secure browser context outside localhost, so production must be placed behind
an HTTPS reverse proxy such as Caddy, Traefik, nginx, or a platform ingress.

Create the Compose environment file:

```sh
cp .env.example .env
```

For a public deployment, configure at least:

```env
PUBLISHED_ADDRESS=0.0.0.0
PUBLISHED_PORT=3000
ALLOWED_ORIGIN=https://holocomm.example.com
WEBSOCKET_URL=wss://holocomm.example.com/ws
RTC_ICE_SERVERS=stun:stun.l.google.com:19302
```

Build and start the application:

```sh
docker compose up -d --build
```

A minimal Caddy configuration when Caddy runs on the host is:

```caddyfile
holocomm.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Caddy proxies WebSocket upgrades automatically. Compose publishes the application on
`0.0.0.0` by default so an external proxy can reach it. Restrict direct access to the
application port with a firewall. If the proxy runs in Docker, prefer placing both
services on a private Docker network and proxying to `holocomm:3000`.

Rebuild every layer without cache when necessary:

```sh
docker compose build --no-cache holocomm
docker compose up -d --force-recreate holocomm
```

## Operations

The container exposes `/health` and includes a Docker healthcheck. It runs as an
unprivileged user with a read-only filesystem and no Linux capabilities.

Application logs are newline-delimited Pino JSON written to stdout:

```sh
docker compose logs -f holocomm
```

HTTP logs contain request IDs, paths, statuses, and durations. Holocomm does not log
chat contents or display names. On `SIGINT` or `SIGTERM`, the backend stops accepting
HTTP requests, closes WebSocket clients with restart code `1012`, and waits up to
`SHUTDOWN_TIMEOUT_MS` before terminating remaining connections.

## Quality checks

```sh
aube run lint
aube run typecheck
aube run test
aube run build
docker build -t holocomm .
```

Tests live next to the code they cover. The backend suite includes real Node WebSocket
integration tests; browser media behavior should additionally be smoke-tested between
real browsers and networks before a public release.

## Security and privacy notes

- Use HTTPS and `wss://` in production.
- Set `ALLOWED_ORIGIN` to the exact public HTTPS origin; do not use `*` publicly.
- Prefer generated UUID room names for private invitations. Manually chosen room names
  may be guessable, and Holocomm does not currently authenticate room membership.
- WebRTC is peer-to-peer and may reveal network information to other room participants.
- Profiles, saved rooms, rooms, and chat messages are not persisted server-side. Only
  active presence is kept temporarily in process memory.
- Deploy a TURN service when clients must connect reliably across restrictive NATs and
  enterprise or mobile networks.

## Current scope

Holocomm is designed for small, temporary voice rooms. Accounts, persistent history,
moderation, end-to-end identity verification, and an SFU media topology are outside the
current release scope.
