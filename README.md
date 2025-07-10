# 🛠️ Realtime AWS WebSocket Setup (Hono + Serverless + DynamoDB)

This guide will help you set up a realtime layer on AWS using:

- API Gateway WebSocket
- Lambdas with Serverless Framework
- Hono (HTTP + WebSocket microframework)
- DynamoDB to store `connectionId` by `room`
- ServiceFactory with classes (ConnectionService, RoomService)
- TypeScript 🧠

---

## 🧱 Initial Project Structure

```bash
my-app-realtime/
├── serverless.yml
├── tsconfig.json
├── package.json
├── src/
│   ├── handlers/
│   │   ├── connect.ts
│   │   ├── disconnect.ts
│   │   └── message.ts
│   ├── lib/
│   │   ├── dynamo.ts
│   │   └── apigw.ts
│   ├── services/
│   │   ├── ConnectionService.ts
│   │   ├── RoomService.ts
│   │   └── ServiceFactory.ts
│   └── types/
│       └── RoomEvent.ts
```

---

## 📦 Install Dependencies

```bash
pnpm init
pnpm add hono @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-apigatewaymanagementapi
pnpm add -D typescript esbuild @types/aws-lambda serverless
```

---

## 🧪 Expected Environment Variables

Serverless will inject these automatically:

```env
AWS_REGION=
CONNECTIONS_TABLE=Connections
ROOMS_TABLE=Rooms
```

---

## 🚀 Deploy with Serverless

```bash
pnpm exec serverless deploy
```

The `serverless.yml` defines the WebSocket routes:

```yaml
functions:
  connect:
    handler: src/handlers/connect.handler
    events:
      - websocket:
          route: $connect

  disconnect:
    handler: src/handlers/disconnect.handler
    events:
      - websocket:
          route: $disconnect

  message:
    handler: src/handlers/message.handler
    events:
      - websocket:
          route: $default
```

---

## 🧪 Client Testing

You can use this snippet in your browser:

```ts
const socket = new WebSocket(
  "wss://<your-api-id>.execute-api.<region>.amazonaws.com/dev?roomId=test-room&slot=a"
);

socket.onopen = () => {
  console.log("✅ Connected");
  socket.send(JSON.stringify({ type: "ping", slot: "a" }));
};

socket.onmessage = (e) => console.log("📨", e.data);
```

---

## ✅ Next Steps

- [x] `$connect`: store connectionId
- [x] `$disconnect`: remove connectionId
- [ ] `$default`: handle events (roomId, type)
- [x] Client helper `useRoomSocket`
- [x] Store in DynamoDB with `roomId` as partition key (use GSI if needed)
