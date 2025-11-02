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
    * Commands will reference project `maaxly-deploy-trial` by default
    ```

### 1.2: GitHub Deploy Key Creation

* **Status:** `COMPLETED`
* **Date:** 2025-11-02
* **Action:** Generated a new SSH key pair (`gcp_deploy_key` and `gcp_deploy_key.pub`) locally.
* **Log:** The public key was added to the `TentacioPro/maaxly` repository.
    ```
    GCP VM-1 App Server
    SHA256:RVeALbVs9DiWAh/dUPbEAL6a3EW8msn/ascAC76Lh/M
    Added on Nov 2, 2025 by @TentacioPro
    Never used — Read-only
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

```powershell
# Make sure you are on your main branch and have the latest code
git checkout main
git pull

# Create the new deployment branch from main
git checkout -b gcp-deploy-300

# Push the new branch to GitHub
git push -u origin gcp-deploy-300