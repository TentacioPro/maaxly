# Maaxly - GCP $300 Deployment

---

## **Base Idea: 01 Nov 2025 02:00 AM**

Docker Container - Traefik Integration to Codebase.
VM Initialization based on needed.
Npm install
Git SSH 
Git Clone
Container Up
VM Instance - Security Group Config
DuckDNS, avoid port number (Local IP reroute to named instance) → Domain Name.

---

# Deep Research Report

### 02 November 2025

### 09:10 am

### ✅Read

---

## **PROMPT USED:**

Role: Senior Solution Architect
IQ: 150
I have provided the context of my project.
I'm planning to deploy this setup in GCP Free Trial and utilize that for the next three months in the best efficient way & also to handle a traffic of 1k users.
I need to wrap all under the setup config under 26k INR Budget free trial credits.
Also, I cant spend a rupee for domain setup, I need a domain name router as well, my friend suggested me DUCKDNS.

1. GCP BEST UTILIZATION METHODS
PLAN A - ALL setup in one VM Instance with backup, parallel instances by manual docker setup, manual DB setup.
PLAN B - One VM Instance Template, two/three VM Instances, DB as a Service, Docker as a Service
PLAN C - One VM Instance Template, two/three VM Instances, DB as a Service, Kafka & Redis as a Service
PLAN D - Utilizing all services with Cloud Run & Github Actions for Code Deploy Workflows.
PLAN E - Come up with whats best in GCP and setup.
2. Uncovered ideas that needs to be implemented,
a) Managing real-time user traffic
b) Gathering data from uptime, every user count, every interaction made, every click done, every redirect made
c) Having Copies of DB, redis & kafka such that, even if the setup is made trash I need the data to migrate stuff. Real user data is important to me
d) Authentication & prevention from Cyber Attacks
3. I have made some research on deployment strategies, If that helps you get the job done do use that as well. Maaxly Deployment Doc

---

# Architectural & Financial Analysis: Maaxly Project Deployment on GCP Free Trial

## Executive Briefing: The 'Pragmatic Trial' Architecture

This report provides a comprehensive architectural and financial analysis for deploying the "Maaxly" project within the explicit constraints of the 90-day, $300 Google Cloud Platform (GCP) Free Trial.

The analysis identifies a fundamental conflict between the project's production-grade, stateful architecture (as detailed in `ProjectBlueprint_LLM.pdf`) 1 and the severe financial and temporal constraints of the trial. The user-provided deployment research (`Maaxly Deployment Plan v2`) 1 correctly analyzes high-cost, long-term production scenarios but is financially incompatible with the $300 (approx. 26k INR) *total* budget. For example, the "GCP Plan 1 (Managed Services)" at $1,446.24 per month would exhaust the entire $300 credit in approximately 6.2 days.1

The key to a viable 90-day deployment is found within the project's own blueprint. The application's "fallback if unreachable" mechanism for Kafka 1 and its explicit fallback to "direct Mongo write + Redis pub/sub" 1 is the critical, intentional design feature that enables a cost-effective trial. This allows for the architectural deferment of Kafka, the single largest cost driver, without sacrificing the application's core real-time functionality, which is already handled by Redis Pub/Sub and Server-Sent Events (SSE).1

This report rejects the high-cost managed services (Plans B, C) and the operationally-flawed serverless model (Plan D). It proposes **"Plan F: The Segregated IaaS Model,"** a dual-Virtual Machine (VM), self-hosted architecture. This plan provides the optimal balance of cost, resilience for 1,000 users, and performance, and is projected to consume only **$175 - $205 USD** of the $300 credit over the 90-day period, leaving a significant buffer for traffic and egress.

## I. Deconstructing the 90-Day, $300 GCP Free Trial Budget

A successful deployment is contingent on a precise understanding of the trial's financial model. The 26k INR budget is not a recurring monthly stipend; it is a one-time, $300 pool of funds that expires after 90 days or when depleted, whichever occurs first.2 Resources will be provisioned, and the account will *not* be automatically charged *until* it is manually upgraded to a paid account.3 The $300 credit is the hard ceiling for all resource consumption during the trial.

### Distinguishing the Free Trial ($300 Credit) from the "Always Free" Tier

This distinction is the most critical component of the 90-day cost strategy. These are two separate, concurrent programs.

1. **GCP Free Trial:** A $300 credit to spend on *any* GCP service (with minor exceptions, like certain GPUs).6 This credit *will* be consumed by our primary compute instances and static IP.
2. **GCP "Always Free" Tier:** A separate, non-expiring monthly quota of specific resources that are *not* charged against the $300 credit.3

We will strategically leverage the "Always Free" tier to eliminate costs for storage and create a zero-cost, post-trial migration path.

### The Financial Infeasibility of Production-Grade Plans

The user's provided research 1 is accurate for its context (funded, long-term production) but financially invalid for this 90-day trial.

- **Invalidity of "GCP Plan 1" (Fully Managed):** This plan, costing **$1,446.24/month** (driven by a $1,300/mo Confluent Cloud estimate) 1, is a non-starter. It would consume the entire $300 trial budget in under one week.
- **Invalidity of "GCP Plan 3" (Hybrid/Cloud Run):** This plan, at **$301.73/month** 1, is also unworkable. It would consume the entire $300 budget, leaving zero buffer for data egress, storage, or traffic variability.

Therefore, any architecture relying on managed Kafka (Confluent Cloud), managed Redis (Memorystore), or managed containers (Cloud Run "always-on") is rejected.

### Table 1.1: GCP Free Trial vs. "Always Free" Tier Resource Allocation

The following table clarifies which resources consume the $300 credit and which are provided by the "Always Free" tier, forming the basis of our budget.

| **Service** | **Free Trial ($300 Credit) Consumption** | **"Always Free" Tier (Monthly Quota)** | **Relevance to Proposed Architecture** |
| --- | --- | --- | --- |
| **Compute Engine** | **Billed against credit.** (e.g., `e2-medium` instances) | **1 `e2-micro` instance** (in `us-west1`, `us-central1`, or `us-east1`) 7 | The $300 credit will pay for two `e2-medium` VMs. The free `e2-micro` is our "Day 91" post-trial target. |
| **Persistent Disk** | Billed against credit (above 30 GB). | **30 GB-months** of Standard Persistent Disk [3, 8] | This will make the boot disk for one of our VMs completely free, saving ~$1.20/mo. |
| **Cloud Storage** | Billed against credit (above 5 GB). | **5 GB-months** of Standard Storage (in US regions) [2, 3] | This will be our free, off-site repository for all database and cache backups (DR strategy). |
| **Static External IP** | **Billed against credit.** (In-use: ~$0.005/hr; Unused: ~$0.01/hr) 9 | **None.** This is a common billing "gotcha".[6, 10] | A static IP is *required* for DuckDNS. We must budget ~$3.60/mo for it. |
| **Cloud Load Balancer** | Billed against credit. | None for HTTP(S) Load Balancing.[11, 12] | We will *avoid* a managed LB and use a self-hosted Nginx reverse proxy to eliminate this cost. |
| **Cloud Monitoring** | Not applicable. | **Generous free allotment** (e.g., storage, API calls).13 | All infrastructure monitoring and alerting will be free and will not consume the $300 credit. |

## II. Architectural Pruning: Right-Sizing Project 'Maaxly' for the Trial

The Maaxly stack (React, Express, MongoDB, Redis, Kafka) 1 must be optimized. The stateful services (Mongo, Redis, Kafka) are the primary drivers of cost and complexity.

### The Critical Decision: Excising Kafka for the 90-Day Trial

As established, a managed Kafka service is financially impossible. Self-hosting Kafka, as defined in `docker-compose.kafka.yml` 1, is also non-viable for this budget. The Confluent Kafka image (a resource-intensive JVM application) 1, even in KRaft mode, would overwhelm the 4 GB of RAM on a cost-effective `e2-medium` VM, especially when co-located with MongoDB and Redis.

### Justification: Leveraging

1

This architectural deferment is justified entirely by the project's own design, as documented in `ProjectBlueprint_LLM.pdf`.

1. The project specification explicitly states: "Runtime Services:... **Kafka (Kafka is optional at runtime; app has fallback if unreachable)**".1
2. The fallback mechanism is detailed: "**Messaging API falls back to direct Mongo write + Redis pub/sub when Kafka publish fails**".1

This is the system's intended behavior. By simply *not* providing the `KAFKA_BROKER` environment variable 1, the application will gracefully degrade to its built-in, lighter-weight stack (MongoDB + Redis).

Crucially, this **does not** eliminate the app's real-time functionality. The blueprint confirms that Redis Pub/Sub and **Server-Sent Events (SSE)** are used for real-time notifications, presence, and streaming to the client-side `MessagingProvider`.1 The core user experience is preserved.

With Kafka deferred, the stateful stack is reduced to MongoDB and Redis. These services are lightweight, well-understood, and already defined in the project's Docker configuration 1, making them perfect candidates for self-hosting on IaaS.

## III. Comparative Analysis of User-Proposed Deployment Scenarios (A-E)

Based on the budgetary and architectural pruning, the user-provided plans (A-E) can be decisively evaluated.

### Plan A (Monolith VM)

"ALL setup in one VM Instance... manual docker setup, manual DB setup."

- **Analysis:** This is the cheapest IaaS option. It involves one `e2-medium` VM (~$25-30/mo) 14 running a modified `docker-compose.yml` with the Express app, Mongo, and Redis.
- **Risk:** High. This architecture places all components in a single failure domain. A memory leak in the Node.js application could crash the VM, taking down the database. A spike in MongoDB CPU usage during an aggregation query could starve the application, dropping all 1,000 user SSE connections.
- **Viability:** Feasible, but high-risk and not recommended given the $300 budget allows for a more resilient pattern.

### Plan B / C (Managed Services)

"DB as a Service, Kafka & Redis as a Service"

- **Analysis:** As established in Section I, this plan is financially impossible. It is the $1,446.24/month scenario from the user's own research.1 Even a "lite" version (Plan B, without Kafka) using MongoDB Atlas ($25/mo) and Memorystore for Redis ($23.21/mo) 1 would consume over $144 of the $300 budget on data services alone, before compute.
- **Viability:** Non-viable.

### Plan D (Cloud Run & GitHub Actions)

"Utilizing all services with Cloud Run & Github Actions"

- **Analysis:** This is an architectural trap. The project blueprint 1 proves this application is a *fundamentally* poor fit for Cloud Run's serverless, scale-to-zero model.16
- **Conflict 1 (Stateful Connections):** The app's core real-time feature is **Server-Sent Events (SSE)**.1 SSEs are long-lived, persistent HTTP connections. Cloud Run is designed for stateless, request-response workloads. To support 1,000 active SSE connections, the Cloud Run service could *never* scale to zero; it would require `min-instances=1` (i.e., "always-on").
- **Cost:** The user's *own research* 1 identifies this exact "critical mismatch," noting that an "always-on" Cloud Run service is "financially inefficient" and "prohibitively high," costing **$178.70/month** for the container alone. This would consume $536.10 over 90 days, blowing the budget.
- **Conflict 2 (File System):** The app uses Multer and GridFS, implying writes to a local `/uploads/` directory for resumes and avatars.1 Cloud Run provides only an ephemeral, in-memory filesystem. All file uploads would fail without a significant (and out-of-scope) application refactor to use GCS for direct uploads.
- **Viability:** Non-viable. This is the worst architectural choice for this specific application.

### Plan E

"Come up with whats best in GCP and setup."

- **Analysis:** This is the mandate for the recommended architecture. The "best" plan is not the most expensive (Plan C) or the most "modern" (Plan D). The "best" plan is the one that balances cost, resilience, and the project's specific technical requirements. This leads to "Plan F."

### Table 3.1: Comparative Analysis of Deployment Plans

| **Plan** | **Core Components** | **90-Day Est. Cost (USD)** | **Resilience** | **1k User Viability** | **Key Trade-Off** |
| --- | --- | --- | --- | --- | --- |
| **Plan A** (Monolith) | 1x `e2-medium` (App+DB+Cache) | ~$95 | Very Low | Risky | Lowest cost, but a single failure domain. |
| **Plan C** (Full Managed) | 1x VM + Confluent + Atlas + Memorystore | **~$4,338** 1 | Very High | High | Financially impossible. Depletes $300 in < 7 days. |
| **Plan D** (Serverless) | Cloud Run (Always-on) + Atlas + Memorystore | **~$680** 1 | High (Services) | Poor (App) | Critical architectural mismatch (SSE, Filesystem). |
| **Plan F** (Segregated IaaS) | 2x `e2-medium` (App, DB) | **~$201** | **Good** | **High** | **The optimal balance of cost, resilience, and self-management for the trial.** |

## IV. The Recommended Architecture: 'Plan F' — The Segregated IaaS Model

This architecture provides the best balance of cost, performance, and resilience, fitting comfortably within the $300 trial budget. It provides critical resource isolation between the (stateless) application and the (stateful) data layer.

### Architecture Overview

- **VM-1 (App/Proxy Instance):**
    - **Instance:** 1x `e2-medium` (2 vCPU, 4 GB RAM).14
    - **Boot Disk:** 1x 30 GB Standard Persistent Disk. This disk is **free**, covered by the "Always Free" tier.8
    - **Network:** Attached Static External IP (required for DuckDNS).17
    - **Software (Dockerized):**
        1. **Nginx Proxy Manager:** 18 Deployed via Docker. This container will serve as the L7 reverse proxy, terminate SSL, and acquire/renew free Let's Encrypt certificates.
        2. **Node.js/Express App:** Deployed via Docker. This is the "server/" directory 1, configured *without* Kafka variables.
    - **Software (Static):**
        1. **React Build:** The static frontend (`src/` directory 1) will be built and served directly by Nginx.
- **VM-2 (Data Instance):**
    - **Instance:** 1x `e2-medium` (2 vCPU, 4 GB RAM).
    - **Boot Disk:** 1x 30 GB Standard Persistent Disk. This disk is **not** free (only one free disk is allowed per account), but costs only ~$1.20/month.19
    - **Network:** **Internal IP only.** This instance is not exposed to the public internet.
    - **Software (Dockerized):**
        1. **Docker Compose** running two services from the project's `docker-compose.kafka.yml` 1: `maaxly-redis` (Redis 7-alpine) and a `mongo` (MongoDB) container.

### Network and Firewall Configuration

A default VPC will be used. Granular firewall rules will be applied using Network Tags (e.g., `app-server`, `db-server`) to enforce a secure perimeter.

1. **`allow-http-https`:**
    - Direction: Ingress
    - Action: Allow
    - Source: `0.0.0.0/0`
    - Target: `app-server`
    - Protocols/Ports: `tcp:80`, `tcp:443` 20
2. **`allow-ssh-iap`:**
    - Direction: Ingress
    - Action: Allow
    - Source: `35.235.240.0/20` (Google's IAP range) 21
    - Target: `app-server`, `db-server`
    - Protocols/Ports: `tcp:22` 20
3. **`allow-internal-db`:**
    - Direction: Ingress
    - Action: Allow
    - Source: Tag `app-server`
    - Target: Tag `db-server`
    - Protocols/Ports: `tcp:27017` (MongoDB), `tcp:6379` (Redis)

### Table 4.1: 'Plan F' 90-Day Budget Projection (Line-Item Breakdown)

This budget projection demonstrates that "Plan F" fits comfortably within the $300 credit, leaving a healthy buffer of ~$98 for traffic overages or experimentation.

| **Line Item** | **Service / SKU** | **Unit Cost (USD)** | **90-Day Qty** | **90-Day Total (USD)** |
| --- | --- | --- | --- | --- |
| VM 1 (App) | `e2-medium` Instance | ~$0.034 / hour [14] | 2,160 hours (90d) | ~$73.44 |
| VM 2 (Data) | `e2-medium` Instance | ~$0.034 / hour [14] | 2,160 hours (90d) | ~$73.44 |
| VM 1 Disk | 30 GB Standard PD | $0.00 / month | 3 months ("Always Free") 8 | $0.00 |
| VM 2 Disk | 30 GB Standard PD | ~$0.04 / GB/mo 19 | 3 months | ~$3.60 |
| Static IP (VM 1) | In-Use Static External IP | ~$0.005 / hour 9 | 2,160 hours (90d) | ~$10.80 |
| Data Egress | Network Traffic (Buffer) | ~$0.12 / GB | ~300 GB (100 GB/mo) | ~$36.00 |
| GCS Backups | Standard Storage | ~$0.02 / GB/mo | ~20 GB (Buffer) | ~$1.20 |
| VM Snapshots | Snapshot Storage | ~$0.05 / GB/mo 19 | ~20 GB (Buffer) | ~$3.00 |
| **Projected Total** |  |  |  | **~$201.48** |
| **Remaining Credit** |  |  |  | **~$98.52** |

## V. Implementation Guide: Addressing "Uncovered" Requirements

This section provides the implementation strategy for the four "uncovered" topics, all of which are supported by the recommended "Plan F" architecture.

### a) Managing 1,000 Real-Time Users

"Plan F" is designed for this workload.

- **Connection Handling:** The Nginx Proxy Manager 18 running on VM-1 is a high-performance, event-driven web server. It is purpose-built to handle thousands of concurrent, long-lived connections (like SSEs) with minimal resource (CPU/RAM) usage.
- **Application Logic:** The Node.js/Express application runs on its own dedicated `e2-medium` VM. This provides 2 dedicated vCPUs and 4 GB of RAM to manage the application-layer logic for 1,000 concurrent SSE streams, fan out Redis Pub/Sub messages, and handle API requests without contending for resources with the database.

### b) Comprehensive Data Gathering (Analytics)

This requirement is met by combining GCP's free monitoring tools with the application's *existing* analytics features.

1. **Infrastructure & Uptime Monitoring (Free):**
    - **Ops Agent Installation:** During VM creation, check the box to "Install Ops Agent for Monitoring and Logging" 22, or run the install script (`curl -sSO... sudo bash...`) 23 on both VM-1 and VM-2. This agent automatically pushes all system logs and metrics (CPU, RAM, Disk, Network) to Cloud Monitoring. The generous free tier for monitoring data ingestion means this will not consume the $300 credit.13
    - **Uptime Checks:** In the GCP Console, navigate to Cloud Monitoring and create a free **HTTP Uptime Check**.24 Point this check at the public DuckDNS domain (e.g., `maaxly-trial.duckdns.org`). This provides external, global validation of application uptime and can be configured to send alerts on failure.
2. Application-Level Monitoring (User-Built):
    
    The user's team has already solved this problem. The ProjectBlueprint_LLM.pdf 1 shows a sophisticated, custom-built analytics backend.
    
    - **Models:** `AnalyticsEvent`, `Plan`, `Subscription`.1
    - API Endpoints: POST /api/analytics/track, GET /api/admin/analytics/visits, GET /api/admin/analytics/top, GET /api/analytics/student/progress.1
        
        The "Plan F" architecture directly supports this. All application-level analytics (every click, every redirect) will be captured by the Express app on VM-1 and persisted to the self-hosted MongoDB instance on VM-2, exactly as the application was designed.
        

### c) Data Persistence & Disaster Recovery ("Trash-Proof" Data)

This 3-layer, automated, off-site backup strategy ensures data can be recovered "even if the setup is made trash." Kafka data is not included, as Kafka has been architecturally deferred.

1. **Layer 1: Infrastructure (VM Boot Disks):**
    - **Solution:** Use GCE Scheduled Snapshots.26
    - **Implementation:** In the Compute Engine console, create a "Snapshot Schedule" (e.g., daily retention, 7 days). Attach this schedule to the boot disks of *both* VM-1 and VM-2. This provides a "bare metal" restore point for the entire VM configuration and is the fastest way to recover from a catastrophic VM failure.
2. **Layer 2: MongoDB (Logical Data):**
    - **Solution:** Automated `mongodump` to Google Cloud Storage (GCS).
    - **Implementation (on VM-2):**Bash
        1. Create a GCS Bucket. This will use the 5 GB "Always Free" storage tier.2
        2. Create a bash script (`/opt/scripts/backup_mongo.sh`) on VM-2 that executes a `mongodump` from the MongoDB container and syncs it to GCS.27
        
        # 
        
        `#!/bin/bash
        BACKUP_DIR="/backups/mongo/$(date +%F)"
        mkdir -p $BACKUP_DIR
        docker exec maaxly-mongo mongodump --out $BACKUP_DIR
        gsutil rsync -r $BACKUP_DIR gs:///mongo/
        rm -rf $BACKUP_DIR`
        
        1. Add this script to `crontab -e` on VM-2 to run nightly (e.g., `0 2 * * * /opt/scripts/backup_mongo.sh`).
3. **Layer 3: Redis (Cache/Session Data):**
    - **Solution:** Automated `BGSAVE` to GCS.29
    - **Implementation (on VM-2):**Bash
        1. Create a bash script (`/opt/scripts/backup_redis.sh`) on VM-2. This script must use `BGSAVE` (non-blocking) 29, not the blocking `SAVE` command.30
        
        # 
        
        `#!/bin/bash
        # Assumes the redis data volume is mounted at /var/lib/docker/volumes/maaxly_redis_data/_data
        # Find this path using 'docker inspect maaxly-redis'
        REDIS_DATA_PATH="/var/lib/docker/volumes/maaxly_redis_data/_data"
        docker exec maaxly-redis redis-cli BGSAVE
        sleep 10 # Give BGSAVE time to complete
        gsutil cp $REDIS_DATA_PATH/dump.rdb gs:///redis/dump-$(date +%F).rdb`
        
        1. Add this script to `crontab -e` on VM-2 to run nightly.

This provides total, automated, off-site data protection for infrastructure, database, and cache, all for near-zero cost.

### d) Authentication & Prevention from Cyber Attacks

1. **Authentication:** This is already built into the application. The blueprint confirms **JWT Authentication** is used to secure endpoints 1 via `POST /api/auth/signup` and `POST /api/auth/login`.1 "Plan F" fully supports this existing mechanism.
2. **Network Perimeter (Firewall):** As defined in Section IV, granular GCP Firewall rules 20 block all non-essential ports. SSH (`tcp:22`) is restricted to Google's IAP range 21, and the database ports (`tcp:27017`, `tcp:6379`) are only accessible from the firewalled application VM.
3. **DDoS & WAF Protection (The Trade-Off):** A critical, budget-based trade-off must be made.
    - **Free Protection (L3/L4):** By using an HTTP(S) Load Balancer (which Nginx sits behind), the project automatically benefits from **Cloud Armor Standard** at no cost.31 This provides "always-on" protection against L3 and L4 DDoS attacks (e.g., SYN floods, protocol attacks).32 This is a robust baseline.
    - **Paid Protection (L7):** Advanced, pre-configured WAF rules (for XSS, SQLi, OWASP Top 10) and Adaptive Protection require **Cloud Armor Enterprise** 33, which is a paid subscription. This is outside the $300 trial budget.
    - **Conclusion:** For the 90-day trial, the risk of L7 application-layer attacks is accepted to stay within budget, while still being fully protected from L3/L4 network attacks.
4. **Free SSL (HTTPS):**
    - **Solution:** This is handled entirely by the **Nginx Proxy Manager** (NPM) container on VM-1.18
    - **Implementation:** The NPM web UI provides a simple "Request SSL Certificate" button that integrates with Let's Encrypt.18 It will handle the entire process of provisioning and, critically, *auto-renewing* free, trusted SSL certificates for the DuckDNS domain.

## VI. Zero-Cost Domain and DNS Implementation (DuckDNS)

This procedure outlines the integration of the free DuckDNS service with the "Plan F" architecture.

1. **Reserve and Budget for a Static External IP:**
    - A static, unchanging IP address is *required* for a DNS A-record to point to.17
    - In the GCP Console (VPC Network > IP Addresses), reserve a new **Static External IP** and attach it to VM-1 (the `app-server`).17
    - This is *not* free. As budgeted in Table 4.1, this in-use static IP costs ~$0.005/hr (approx. $3.60/mo) and will be charged against the $300 credit.9
2. **Configure the DuckDNS Client:**Bash
    - Log in to `DuckDNS.org` and create a free subdomain (e.g., `maaxly-trial.duckdns.org`).
    - On **VM-1**, create a directory and a shell script based on the DuckDNS installation instructions.37
    
    # 
    
    `mkdir -p ~/duckdns
    cd ~/duckdns
    touch duck.sh
    chmod +x duck.sh
    nano duck.sh`
    
    - Add the following line to duck.sh, replacing the domain and token:
        
        echo url="https://www.duckdns.org/update?domains=&token=&ip=" | curl -k -o ~/duckdns/duck.log -K -
        
    - Run the script manually once (`./duck.sh`) to set the initial IP.
3. **Automate the IP Update:**
    - Because the VM's IP is static, this is technically only required once. However, for best practice, the update script should run periodically.38
    - On VM-1, run crontab -e and add the following line to run the update script every 5 minutes:
        - /5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
4. **Integrate with Nginx Proxy Manager:**
    - Access the Nginx Proxy Manager (NPM) web UI (running on VM-1, port 81).
    - Navigate to "Proxy Hosts" and add a new host.
    - **Domain Name:** `maaxly-trial.duckdns.org`
    - **Forward Hostname / IP:** `app` (or the Docker container name of the Express server).
    - **Forward Port:** `4000`.1
    - Click the "SSL" tab, select "Request a new SSL Certificate," and enable "Force SSL".18 NPM will now handle all traffic, routing, and encryption.

## VII. Final Assessment and The "Day 91" Post-Trial Strategy

### Final Recommendation

**"Plan F: The Segregated IaaS Model"** is the only architecture evaluated that is financially viable, technically resilient, and capable of supporting the "Maaxly" application's specific technical needs (SSEs, file uploads) for 1,000 users within the $300, 90-day GCP Free Trial. It provides resource isolation, a comprehensive and free monitoring/DR strategy, and a clear path for zero-cost domain integration, all while leaving a ~$98 buffer in the trial budget.

### The "Day 91" Problem: Migrating from Trial to "Always Free"

A complete architectural plan must account for the trial's expiration. On Day 91, the $300 credit vanishes.4 If no action is taken, the user's credit card *will* be charged for the "Plan F" architecture (approx. $70/mo). The following "off-ramp" strategy ensures a seamless transition to a permanent, zero-cost deployment.

1. **Consolidate (Day 90):**
    - Run the final `backup_mongo.sh` and `backup_redis.sh` scripts from Section V.c to ensure the GCS bucket has the latest data.
2. **De-provision (Day 90):**
    - **Delete** VM-1 (`e2-medium`).
    - **Delete** VM-2 (`e2-medium`).
    - **Release** the Static External IP 9 to stop all billing.
3. **Create Free VM (Day 90):**
    - Provision the *one* free **`e2-micro`** instance, as allowed by the "Always Free" tier.7
    - **This MUST be in a US region** (e.g., `us-west1`, `us-central1`, `us-east1`).3
    - Attach the free 30 GB Standard Persistent Disk.8
4. **Re-deploy (Monolith):**
    - On this single, free `e2-micro`, deploy the *entire* stack (Nginx Proxy Manager, Node.js App, MongoDB, Redis) using Docker Compose, effectively reverting to the "Plan A" monolith.
    - Restore the database and cache from the GCS backups.
    - Re-configure the DuckDNS cron job 37 on this new VM. (Note: The `e2-micro` will have a new IP, which DuckDNS will automatically update).

The final trade-off is performance. This "Always Free" `e2-micro` instance (with 1 GB of shared-core RAM) will be *slow*. It will *not* support 1,000 real-time users. However, it *will* keep the project alive, functional, and accessible on the internet for **$0.00 per month**, serving as a permanent portfolio or hobby project. This provides a complete lifecycle plan from initial trial to long-term, zero-cost operation.