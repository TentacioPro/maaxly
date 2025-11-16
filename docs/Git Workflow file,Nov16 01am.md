# Git Workflow file — Nov16 01am

Summary
-------
This repository now includes a GitHub Actions workflow (`.github/workflows/deploy-to-gcp.yml`) that deploys code to a GCP VM on every `git push`.

What the workflow does
- Trigger: on any `push` to any branch.
- Checkout: checks out the pushed commit on the runner.
- SSH: opens an SSH session to the GCP VM (using secrets) and runs a deploy script.
- Remote actions executed on the VM:
  - `git fetch` and `git reset --hard origin/<branch>` to sync the remote working copy to the pushed branch.
  - `docker compose -f docker-compose.kafka.yml build --no-cache backend frontend-prod` to build the backend and frontend-prod images without cache.
  - `docker compose -f docker-compose.kafka.yml up -d --no-deps --force-recreate backend frontend-prod` to recreate only the backend and frontend-prod containers.
  - `docker image prune -f` to clean up unused images (best-effort).

Files used from this repo
- `docker-compose.kafka.yml` — compose manifest used by the VM to build and run services.
- `Dockerfile.backend` — backend Dockerfile used to build backend image.
- `Dockerfile.frontend` — frontend Dockerfile used to build frontend-prod image.

Required GitHub secrets (set these in the repository Settings → Secrets and variables → Actions)
- `GCP_SSH_HOST` — public IP or DNS name of your GCP VM (e.g. `34.123.45.67`).
- `GCP_SSH_USER` — username to SSH as on the VM (e.g. `ubuntu` or `maaxly`).
- `SSH_PRIVATE_KEY` — private SSH key (PEM) for the user above (the public key must exist in `~/.ssh/authorized_keys` on the VM).
- `SSH_KNOWN_HOSTS` — OpenSSH `known_hosts` entry for your host (recommended to avoid interactive host verification).
- `REMOTE_REPO_DIR` — absolute path on the VM where the repo is checked out (e.g. `/home/ubuntu/maaxly`).

Remote VM prerequisites (one-time setup on the GCP VM)
1. Git and Docker Compose must be installed. Example commands for Debian/Ubuntu:

```bash
# install git, docker, and docker compose plugin
sudo apt update && sudo apt install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# install docker compose v2 (if not available):
sudo apt-get install -y docker-compose-plugin
```

2. Clone the repository and place it at `REMOTE_REPO_DIR`:

```bash
git clone <repo-url> /home/ubuntu/maaxly
cd /home/ubuntu/maaxly
```

3. Add the GitHub deploy key's public key (the public of `SSH_PRIVATE_KEY`) to `~/.ssh/authorized_keys` for `GCP_SSH_USER`.

4. Ensure `docker compose` is available and that the user can run `docker compose` (add to `docker` group or run with `sudo` inside workflow script if desired).

5. Ensure `.env.prod` or required env files are present on the VM and referenced in `docker-compose.kafka.yml` when you run in `prod` profile. The workflow does not transfer secrets or env files — keep them on the VM or use a secrets manager.

Notes & safety
- The workflow performs a `git reset --hard origin/<branch>` on the VM. Any uncommitted changes there will be lost. Keep the remote working copy dedicated to CI deploys or back it up.
- The action requires the remote path (`REMOTE_REPO_DIR`) to already exist. The workflow will exit with error if it doesn't.
- The workflow builds images without cache to ensure new code changes are included. This increases build time but avoids stale layers.
- The workflow recreates only `backend` and `frontend-prod` (service names from `docker-compose.kafka.yml`). If you need to update additional services, add them to the `docker compose` commands.

How to test manually
1. Add the required secrets in repository settings.
2. Ensure the VM prerequisites above are satisfied and that the repo is cloned to `REMOTE_REPO_DIR`.
3. Push a branch to trigger the workflow:

```bash
git add -A && git commit -m "test deploy" && git push origin main
```

4. Inspect the workflow run in GitHub Actions. Check VM logs via SSH and `docker compose ps` / `docker logs` to verify containers restarted and are healthy.

Troubleshooting
- If the workflow fails with SSH connection error: verify `GCP_SSH_HOST`, `GCP_SSH_USER`, `SSH_PRIVATE_KEY`, and `SSH_KNOWN_HOSTS` are correct.
- If the remote `docker compose` commands fail: verify docker & compose plugin installed and the user has permissions to run docker commands.
- If builds are slow or fail because of missing files (e.g., `.env`), ensure the necessary env files exist on the VM.

If you want, I can:
- extend the workflow to only deploy when pushing to specific branches (e.g., `main` or `release/*`),
- add an optional step to pull prebuilt images from a registry instead of building on the VM (faster), or
- add a healthcheck step that waits for containers to become healthy before finishing the job.

---

## KEY SUMMARY — Nov16 01am (embedded)

Summary
-------
- **Primary objectives:** Automate deploy from git pushes to a GCP VM (build & restart backend/frontend), harden frontend routing to stop repeated `/api/profile/me` calls, remove secrets from history and move to secure storage, and produce a single chronological KEY SUMMARY.
- **Deployment approach:** SSH-based GitHub Actions workflow that connects to the VM, resets the working copy to the pushed branch, builds images with `--no-cache`, and recreates `backend` and `frontend-prod` containers using `docker compose -f docker-compose.kafka.yml`.

Technical snapshot
------------------
- **Frontend:** `src/App.jsx` updated to set axios Authorization from `localStorage.token`, call `/api/profile/me` at startup to set role, and clear token + axios header on 401/403 to prevent circular requests.
- **Routing / Protection:** Employer/admin pages (e.g., `/create-opportunity`, `/analytics`, `/admin/analytics`) are now guarded by a `RequireRole` wrapper to enforce role-based access and avoid unauthenticated API flooding.
- **Docker / Compose:** `docker-compose.kafka.yml`, `Dockerfile.frontend`, and `Dockerfile.backend` are the build targets used by the VM. The workflow runs no-cache builds to avoid stale layers.

Problems addressed
------------------
- MongoDB authentication failures (code 18) caused by credential/volume drift — standardized `MONGODB_URI`, added `db-init` one-shot patterns and healthchecks.
- Frontend build failures (`vite: not found`) fixed by ensuring devDependencies are present in the builder stage (do not omit dev deps during build stage).
- Express `app.get('*')` wildcard caused `path-to-regexp` errors; replaced with a safe SPA fallback that excludes `/api` paths.
- Repeated `/api/profile/me` calls solved by adding `Protected` and `RequireRole` route guards and clearing tokens on 401/403.

Files and changes of interest
-----------------------------
- `src/App.jsx`: token handling, role fetch, and route guard adjustments.
- `.github/workflows/deploy-to-gcp.yml`: SSH deploy workflow (locked to `gcp-deploy-nov15` by branch configuration in workflow file).
- `docs/Git Workflow file,Nov16 01am.md` and `docs/Issue Tracker - Nov14.md`: documentation now contains the consolidated KEY SUMMARY.

Progress & next steps
---------------------
- **Completed:** deploy workflow added, workflow doc created, `src/App.jsx` patched for token/role handling, and this KEY SUMMARY embedded into docs.
- **Pending / recommended:** purge committed env files from git history (BFG/git-filter-repo), rotate secrets, add remote-side backup/restore for `.env.prod` around `git reset`, and optionally move to registry-based deployments (build in Actions, pull on VM) and add health-check steps after container restart.

Safety notes
------------
- The workflow runs `git reset --hard origin/<branch>` on the remote; back up any uncommitted files you care about. The workflow does not transfer env files — keep them on the VM or use a secrets manager.
- After purging secrets from history, rotate credentials and notify collaborators to re-clone.

If you want, I can: extend the workflow to specific branches, add a pre-reset backup/restore snippet, or change to registry-based deployments (build in Actions, pull on the VM).

---
