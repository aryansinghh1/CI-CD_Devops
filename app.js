const express = require("express");
const path = require("path");
const client = require("prom-client");

const app = express();

// 1. Initialize Prometheus metrics
const register = client.register;
client.collectDefaultMetrics({ register });

// Serve CI/CD page as default home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "cicd-page.html"));
});

// 2. Optimized Metrics Endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

// Health check for Kubernetes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// 3. Explicit Port Management
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});