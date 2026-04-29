const express = require("express");
const path = require("path");
const app = express();

// Serve CI/CD page as default home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "cicd-page.html"));
});

// Health check for Kubernetes
app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});