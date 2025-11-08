# Maaxly "Plan F" Deployment Log & Guide

This document tracks the complete, step-by-step deployment of the Maaxly project onto the GCP Free Trial, following the "Plan F" architecture.

## Section 1: Initial Setup (Completed)

This section logs the initial setup of the local environment.

### 1.1: GCloud CLI Installation & Init

* **Status:** `COMPLETED`
* **Date:** 2025-11-02
* **Log:**
    ```
    Welcome to the Google Cloud CLI!
    ...
    You are signed in as: [maharajanabishekyt@gmail.com].
    Pick cloud project to use:
    [7] Create a new project
    Enter a Project ID: maaxly-deploy-trial
    ...
    Your current project has been set to: [maaxly-deploy-trial].
    The Google Cloud CLI is configured and ready to use!
    * Commands that require authentication will use maharajanabishekyt@gmail.com by default
    * Commands will reference project maaxly-deploy-trial by default
    ```

### 1.2: GitHub Deploy Key Creation

* **Status:** `COMPLETED`
* **Date:** 2025-11-02
* **Action:** Generated a new SSH key pair (`gcp_deploy_key` and `gcp_deploy_key.pub`) locally.
* **Log:** The public key was added to the `TentacioPro/maaxly` repository.
    ```
    GCP VM-1 App Server
    SHA256:RVALDVs90IWAh/dUPbEAL6a3EW8msn/ascAC78LH/M
    Added on Nov 2, 2025 by @TentacioPro
    Never used-Read-only
    ```

---

## Section 2: Git & Project File Setup (To-Do)

This is your next step. You must prepare your repository *before* you create the VMs.

### 2.1: Define Your Git Branching Strategy

You need to create the branch that the VM will deploy from.

* **`main`**: Your stable, primary branch.
* **`gcp-deploy-300`**: Your **production branch**. This is the branch VM-1 will clone.
* **`staging`**: Your **testing branch**. You will test changes here before merging them into `gcp-deploy-300`.
* **`feature/*`**: Your development branches (e.g., `feature/new-chat-ui`).

### 2.2: Create `gcp-deploy-300` Branch

On your local Windows machine, in your `maaxly` project folder:

powershell
# Make sure you are on your main branch and have the latest code
git checkout main
git pull

# Create the new deployment branch from main
git checkout -b gcp-deploy-300

# Push the new branch to GitHub
git push -u origin gcp-deploy-300

### 2.3: Add the Dockerfile
In the root of your maaxly project, create a new file named Dockerfile (no extension).

### Dockerfile

        # --- STAGE 1: Build the React Frontend ---
        FROM node:20-alpine AS builder
        WORKDIR /app

        # Copy all package.json and package-lock.json files
        COPY package.json package-lock.json* ./
        COPY server/package.json server/
        COPY src/package.json src/
        # (Add any other package.json files if they exist)

        # Install all dependencies for the entire monorepo
        RUN npm install

        # Copy the rest of the source code
        COPY . .

        # Build the frontend (Vite)
        RUN npm run build

        # --- STAGE 2: Build the Production Server ---
        FROM node:20-alpine AS runner
        WORKDIR /app

        ENV NODE_ENV=production

        # Copy only the production dependencies' package.json files
        COPY package.json package-lock.json* ./
        COPY server/package.json server/

        # Install *only* the production dependencies for the server
        RUN npm install --production

        # Copy the server source code
        COPY server/ ./server/

        # Copy the built React app from the 'builder' stage
        # Assumes Express serves static files from 'server/dist'
        COPY --from-builder /app/dist ./server/dist

        # Expose the port your server runs on (PORT 4000)
        EXPOSE 4000

        # The command to start your server (server/index.js)
        CMD [ "node", "server/index.js" ]

### 2.4: Commit and Push the Dockerfile
On your local Windows machine, commit the new Dockerfile to your gcp-deploy-300 branch.

PowerShell

# Add the new Dockerfile
git add Dockerfile

# Commit the change to your deployment branch
git commit -m "feat: Add production Dockerfile for GCP deployment"

# Push the commit
git push

## Section 3: Secure Private Key in GCP (In Progress)
Now you must upload the private deploy key (gcp_deploy_key) to GCP Secret Manager so the VM can access it securely.

### 3.1: Enable Secret Manager API & Link Billing
Status: COMPLETED

Log: Attempted to create the secret, which prompted to enable the Secret Manager API. The API enablement failed because the new project was not linked to the free trial billing account.

PS C:\Users\Abishek> gcloud secrets create maaxly-github-deploy-key --replication-policy="automatic"
ERROR: (gcloud.secrets.create) FAILED_PRECONDITION: Billing account for project '718338082823' is not found...
Resolution: Went to the GCP Billing Console, found the maaxly-deploy-trial project, selected "Change billing," and linked it to the active free trial billing account.

### 3.2: Create Secret Container
Status: COMPLETED

# Log:

PS E:\Other\Maaxly November GCP Deployment> gcloud secrets create maaxly-github-deploy-key --replication-policy="automatic"
(Success after linking billing)
### 3.3: Add Secret Version
# Status: COMPLETED

# Log:

PS E:\Other\Maaxly November GCP Deployment> gcloud secrets versions add maaxly-github-deploy-key --data-file="./gcp_deploy_key"
Created version [1] of the secret [maaxly-github-deploy-key].
### 3.4: Grant VM Access to the Secret
# Status: BLOCKED

# Log:
 The command to grant permissions failed because the default Compute Engine service account does not exist yet.

PS E:\Other\Maaxly November GCP Deployment> $PROJECT_NUMBER = gcloud projects describe maaxly-deploy-trial --format="value(projectNumber)"
PS E:\Other\Maaxly November GCP Deployment> echo $PROJECT_NUMBER
718338082823
PS E:\Other\Maaxly November GCP Deployment> $SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
PS E:\Other\Maaxly November GCP Deployment> gcloud secrets add-iam-policy-binding maaxly-github-deploy-key `
>>    --member="serviceAccount:$SERVICE_ACCOUNT" `
>>    --role="roles/secretmanager.secretAccessor"
ERROR: (gcloud.secrets.add-iam-policy-binding) Status code: 400. Service account 718338082823-compute@developer.gserviceaccount.com does not exist..
### 3.5: Enable Compute Engine API (To-Do)
This is the fix for the error in step 3.4. This command will create the missing service account.

#PowerShell

# 1. Enable the Compute Engine API
    gcloud services enable compute.googleapis.com
### 3.6: Re-run Grant VM Access (To-Do)
After step 3.5 is complete, run the failed command again.

PowerShell

# 2. Re-run the policy binding
    gcloud secrets add-iam-policy-binding maaxly-github-deploy-key `
        --member="serviceAccount:$SERVICE_ACCOUNT" `
        --role="roles/secretmanager.secretAccessor"