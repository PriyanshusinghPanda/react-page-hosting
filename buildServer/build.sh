#!/bin/bash
set -e

echo "#step-1 \t cloning repo: $REPO_URL"
git clone --depth=1 "$REPO_URL" repo
cd repo 

echo "#step-2 \t installing dependencies"
npm install 

echo "#step-3 \t Building project"
npm run build

echo "#step-4 \t uploading the build server"

mc alias set minio $STORAGE_URL $STORAGE_ACCESS_KEY $STORAGE_SECRET_KEY
# check if it does not exist and create if not yaaa
mc mb -p minio/$BUCKET_NAME || echo "Bucket $BUCKET_NAME already exists, skipping creation"
# upload the build
mc cp -r ./${OUTPUT_DIR:-dist} minio/$BUCKET_NAME/$JOB_ID/

echo "#step-6 \t Cleaning up => exiting"