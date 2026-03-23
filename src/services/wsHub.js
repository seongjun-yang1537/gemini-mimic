// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const { WebSocketServer } = require("ws");

class RunWebSocketHub {
  constructor(server) {
    this.server = new WebSocketServer({ noServer: true });
    this.runSubscribers = new Map();

    server.on("upgrade", (request, socket, head) => {
      const urlObject = new URL(request.url, "http://localhost");
      const runMatch = urlObject.pathname.match(/^\/ws\/run\/(.+)$/);
      if (!runMatch) {
        socket.destroy();
        return;
      }

      const runId = runMatch[1];
      this.server.handleUpgrade(request, socket, head, (webSocket) => {
        this.server.emit("connection", webSocket, request, runId);
      });
    });

    this.server.on("connection", (webSocket, _request, runId) => {
      if (!this.runSubscribers.has(runId)) {
        this.runSubscribers.set(runId, new Set());
      }
      const subscriberSet = this.runSubscribers.get(runId);
      subscriberSet.add(webSocket);

      webSocket.on("close", () => {
        subscriberSet.delete(webSocket);
      });
    });
  }

  publish(runId, eventPayload) {
    const subscribers = this.runSubscribers.get(runId);
    if (!subscribers) {
      return;
    }

    const messageText = JSON.stringify(eventPayload);
    for (const subscriber of subscribers) {
      if (subscriber.readyState === subscriber.OPEN) {
        subscriber.send(messageText);
      }
    }
  }
}

module.exports = { RunWebSocketHub };
