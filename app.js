const express = require("express");
const path = require("path");
const app = express();

app.get("/", (req, res) => {
    res.send("App is running");
});

app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});

app.get("/cicd", (req, res) => {
    res.sendFile(path.join(__dirname, "cicd-page.html"));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));