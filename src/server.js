const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/sessions", require("./routes/sessionRoutes"));
app.use("/api/yjs", require("./routes/yjsTestRoutes"));

app.get("/", (req, res) => {
    res.json({
        message: "SyncSpace Server Running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});