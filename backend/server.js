// libraries
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const { getSystemInfo, checkDockerInstalled,} = require("./utils/systemUtils.js");

const { authUser } = require("./middlewares/auth.js")

require("dotenv").config();

const port = process.env.PORT || 7830;
const app = express();

// connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/deployDash";
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
connectDB();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001", 
      "http://localhost:3002",
      "https://deploydash-pandaincode.nstsdc.org"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cookieParser())

// routes
const deployRoute = require("./routes/deploy.js");
const viewRoute = require("./routes/view.js");
const userRoute = require("./routes/user.js");
const projectRoute = require("./routes/project.js");

// mount routes
app.use("/deploy", authUser ,deployRoute);
app.use("/user", userRoute);
app.use("/project", authUser, projectRoute);

// app.use("/view", viewRoute);
const RESERVED_NAMES = [
  'api', 'backend', 'frontend', 'dash', 'dashboard', 'www', 
  'minio', 'amazon', 'mongodb', 'postgres', 'redis', 
  'auth', 'login', 'admin', 'status', 'health', 'api-deploydash'
];

app.use((req, res, next) => {
  const hostname = req.hostname;
  // If we are on the base domain with no subdomain, or purely on localhost, skip
  if (hostname === "api-deploydash.nstsdc.org" || hostname === "localhost" || hostname === "127.0.0.1") {
    return next();
  }

  const subdomain = hostname.split(".")[0].toLowerCase();
  
  // If it's a reserved platform name, don't treat it as a project site
  if (subdomain && !RESERVED_NAMES.includes(subdomain)) {
    console.log(`[Routing] Request for project site: ${subdomain}`);
    return viewRoute(req, res, next);
  }
  
  next();
});

app.get("/health", (req, res) => {
  let systemInfo = {};
  const promise = {
    sysInfo: new Promise((resolve, reject) => {
      getSystemInfo((err, info) => {
        if (err) {
          console.error("Error fetching system info:", err);
          return reject(new Error("Unable to fetch system info"));
        } else {
          systemInfo.info = info;
          resolve();
        }
      });
    }),
    dockerCheck: new Promise((resolve, reject) => {
      checkDockerInstalled((err, dockerVersion) => {
        if (err) {
          console.error("Docker check error:", err);
          return reject(
            new Error("Docker is not installed or not found in PATH.")
          );
        } else {
          systemInfo.dockerVersion = dockerVersion;
          resolve();
        }
      });
    }),
  };

  Promise.all([promise.sysInfo, promise.dockerCheck])
    .then(() => {
      res.status(200).json({
        status: "OK",
        systemInfo: systemInfo,
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: "ERROR",
        message: error.message,
      });
    });
});

app.listen(port, (err) => {
  if (err) {
    console.error("Error starting server:", err);
    return;
  }
  console.log(`Server is running on port http://localhost:${port}`);
});
