const express = require("express");
const { DefaultAzureCredential } = require("@azure/identity");
const { ContainerAppsAPIClient } = require("@azure/arm-appcontainers");
const exce = require("child_process").exec;
const spawn = require("child_process").spawn;
const router = express.Router();


const RUN_ENV = process.env.RUN_ENV || "development";

// Azure Container App Job configuration
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const jobName = process.env.AZURE_JOB_NAME_DEPLOY;
let client
if (RUN_ENV === "production" && subscriptionId) {
  client = new ContainerAppsAPIClient(new DefaultAzureCredential(), subscriptionId);
}

// --- API Endpoint to trigger container job ---
router.post("/staticSite", async (req, res) => {
  const { gitURL, slug } = req.body;
  const projectSlug = slug || `proj-${Date.now()}`;
  console.log("hi")

  // bucket name
  // to-do:- get the bucket name if slug provided 
  if (RUN_ENV == "production") {
    console.log("hi")
    const BUCKET_NAME = process.env.BUCKET_NAME;

    const params = {
      name: jobName,
      triggerType: "Manual",
      template: {
        containers: [{
            name: "builder-image",
            image: `deloydashimage.azurecr.io/buildserver:slim`,
            env: [
              { name: "REPO_URL", value: gitURL },
              { name: "JOB_ID", value: projectSlug },
              { name: "STORAGE_URL", value: process.env.STORAGE_ENDPOINT },
              { name: "STORAGE_ACCESS_KEY", value: process.env.STORAGE_ACCESS_KEY },
              { name: "STORAGE_SECRET_KEY", value: process.env.STORAGE_SECRET_KEY },
              { name: "BUCKET_NAME", value: BUCKET_NAME },
            ]
          }]
      }};

    // await client.jobs.beginStartAndWait(resourceGroup, jobName, params);
    // res.json({
    //   status: "queued",
    //   data: { projectSlug, url: `http://localhost:443/view/${projectSlug}` }
      
    // })
  } else if (RUN_ENV == "development") {
    console.log("Development mode: Simulating deployment...");

    // run the deployemnt 
    // exce(`docker run --rm --link minio \
    //   -e REPO_URL=${gitURL} \
    //   -e JOB_ID=${projectSlug} \
    //   -e STORAGE_URL=${process.env.STORAGE_ENDPOINT} \
    //   -e STORAGE_ACCESS_KEY=${process.env.STORAGE_ACCESS_KEY} \
    //   -e STORAGE_SECRET_KEY=${process.env.STORAGE_SECRET_KEY} \
    //   -e BUCKET_NAME=${process.env.BUCKET_NAME} \
    //   buildserver:latest`, (error, stdout, stderr) => {
    //     if (error) {
    //       console.error(`Error executing deploy script: ${error.message}`);
    //       return res.status(500).send("Deployment failed");
    //     }
    //     // if (stderr) {
    //     //   console.error(`Deploy script stderr: ${stderr}`);
    //     //   return res.status(500).send("Deployment encountered issues");
    //     // }
    //     console.log(`Deploy script output: ${stdout}`);
    //     res.status(200).json({
    //       status: "queued",
    //       data: { projectSlug, url: `http://localhost:443/view/${projectSlug}` }
    //     });
    //   });
    const child = spawn(`docker run --rm --link minio \
      -e REPO_URL=${gitURL} \
      -e JOB_ID=${projectSlug} \
      -e STORAGE_URL=${process.env.STORAGE_ENDPOINT} \
      -e STORAGE_ACCESS_KEY=${process.env.STORAGE_ACCESS_KEY} \
      -e STORAGE_SECRET_KEY=${process.env.STORAGE_SECRET_KEY} \
      -e BUCKET_NAME=${process.env.BUCKET_NAME} \
      buildserver:latest`, { shell: true })
    child.stdout.on('data', (data) => {
      console.log(`stdout (real time): ${data}`);
    })
    child.stderr.on('data', (data) => {
      console.error(`stderr (real time): ${data}`);
    });
    child.on('close', (code) => {
      console.log(`child process closed with code ${code}`);
      res.status(200).json({
          status: "queued",
          data: { projectSlug, url: `http://${projectSlug}.localhost:7830/` }
        });
    });
    child.on('error', (err) => {
      console.error('Failed to start child process:', err);
    });



  } else {
    console.log("Invalid RUN_ENV configuration.");
    res.status(500).send("Server configuration not set.");
  }
});

module.exports = router;