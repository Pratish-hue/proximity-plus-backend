import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/*
 * Proximity+ Session System
 *
 * PSK = Proximity+ Sync Key
 *
 * The PSK is a 100-character secret shared between
 * the physical Proximity+ device and the server.
 *
 * This prototype stores sessions in memory.
 * Persistent database storage will be added later.
 */

const sessions = new Map();

const PSK_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz" +
  "0123456789" +
  "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";

function generatePSK() {
  let psk = "";

  while (psk.length < 100) {
    const bytes = crypto.randomBytes(100);

    for (const byte of bytes) {
      psk += PSK_CHARACTERS[byte % PSK_CHARACTERS.length];

      if (psk.length === 100) {
        break;
      }
    }
  }

  return psk;
}

function hashPSK(psk) {
  return crypto
    .createHash("sha256")
    .update(psk)
    .digest("hex");
}

/*
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    name: "Proximity+ Backend",
    version: "0.1.0",
    status: "online"
  });
});

/*
 * API status
 */
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    service: "Proximity+ Backend",
    sessions: sessions.size
  });
});

/*
 * Create a new Proximity+ session.
 *
 * The server generates a brand-new PSK.
 */
app.post("/api/session/create", (req, res) => {
  const sessionId = crypto.randomUUID();
  const psk = generatePSK();

  sessions.set(hashPSK(psk), {
    sessionId,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    sessionId,
    psk
  });
});

/*
 * Restore an existing session using its PSK.
 */
app.post("/api/session/connect", (req, res) => {
  const { psk } = req.body;

  if (typeof psk !== "string" || psk.length !== 100) {
    return res.status(400).json({
      success: false,
      error: "Invalid Proximity+ Sync Key"
    });
  }

  const session = sessions.get(hashPSK(psk));

  if (!session) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired Proximity+ Sync Key"
    });
  }

  res.json({
    success: true,
    sessionId: session.sessionId,
    status: "session_restored"
  });
});

/*
 * Close a session.
 *
 * A new PSK is generated before the old one is invalidated.
 */
app.post("/api/session/close", (req, res) => {
  const { psk } = req.body;

  if (typeof psk !== "string" || psk.length !== 100) {
    return res.status(400).json({
      success: false,
      error: "Invalid Proximity+ Sync Key"
    });
  }

  const oldKey = hashPSK(psk);
  const session = sessions.get(oldKey);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired Proximity+ Sync Key"
    });
  }

  /*
   * Generate the replacement PSK BEFORE deleting
   * the old session credential.
   */
  let newPSK;
  let newKey;

  do {
    newPSK = generatePSK();
    newKey = hashPSK(newPSK);
  } while (sessions.has(newKey));

  sessions.delete(oldKey);

  sessions.set(newKey, {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    rotatedAt: new Date().toISOString()
  });

  res.json({
    success: true,
    status: "session_closed",
    newPSK
  });
});

app.listen(PORT, () => {
  console.log(`Proximity+ backend listening on port ${PORT}`);
});
