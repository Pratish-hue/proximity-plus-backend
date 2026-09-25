import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Proximity+ Backend",
    version: "0.1.0",
    status: "online"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    service: "Proximity+ Backend"
  });
});

app.listen(PORT, () => {
  console.log(`Proximity+ backend listening on port ${PORT}`);
});
