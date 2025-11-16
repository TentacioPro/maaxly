# Docker Deployment Issues - Summary

## Overview
This document summarizes all major Docker deployment issues encountered during the Maaxly project setup, their root causes, and successful resolutions.

## Quick Stats
- **Total Issues Resolved:** 54+ distinct problems
- **Categories:** Infrastructure (7), Build/Compose (7), Runtime/API (6), Security (3), Observability (4)
- **Critical Fixes:** MongoDB auth, path-to-regexp crash, Vite build failure, environment drift

## Major Issue Categories

### 🔥 Critical Infrastructure Issues
1. **MongoDB Authentication Failures (Code 18)**
   - Root Cause: Volume credential drift, inconsistent MONGODB_URI
   - Fix: Standardized single URI source + volume reset when needed
   - Impact: Prevented backend startup entirely

2. **Path-to-RegExp Startup Crash**
   - Root Cause: Bare `*` wildcard route incompatible with newer library
   - Fix: Replaced with regex excluding `/api` paths
   - Impact: 500 errors on all requests

3. **Frontend Build Failure (`vite: not found`)**
   - Root Cause: DevDependencies omitted in Docker build
   - Fix: Removed `--omit=dev` flag from npm ci
   - Impact: Complete frontend build failure

### 🛠️ Build & Configuration Issues
4. **Docker Compose YAML Validation Error**
   - Root Cause: Incorrect indentation in build.args mapping
   - Fix: Proper YAML structure for frontend-prod service

5. **Environment Variable Drift**
   - Root Cause: Missing `--env-file` usage, inconsistent .env files
   - Fix: Enforced explicit env file loading in compose commands

### 🔒 Security & Access Issues
6. **JWT Secret Missing/Inconsistent**
   - Root Cause: Empty or mismatched JWT secrets across environments
   - Fix: Generated strong secrets, standardized across profiles

7. **Root-Level MongoDB Access**
   - Root Cause: Using admin credentials for application user
   - Status: Planned transition to least-privilege user

### 📊 Observability Gaps
8. **404 vs 500 Classification Difficulty**
   - Root Cause: No systematic approach to diagnose response types
   - Fix: Developed classification heuristics and diagnostic procedures

9. **Missing Health Checks**
   - Root Cause: No centralized service health validation
   - Status: Proposed `/health` endpoint implementation

## Key Success Patterns
1. **Volume Reset Strategy:** Safe MongoDB data reset when credentials change
2. **Environment Standardization:** Single source of truth for database connections
3. **Service Orchestration:** Health checks and dependency ordering
4. **Build Optimization:** Proper dev dependency handling in multi-stage builds

## Most Effective Debugging Approaches
1. **Container Log Analysis:** `docker logs -f <container> --tail 200`
2. **Environment Validation:** `docker exec <container> printenv | grep <VAR>`
3. **Service Connectivity:** Direct MongoDB/Redis ping tests inside containers
4. **Build Context Optimization:** `.dockerignore` and layer caching strategies

## Current Status
- ✅ **500 Errors:** Resolved (startup crashes fixed)
- 🔄 **404 Errors:** In progress (classification and routing refinement)
- ✅ **Authentication:** Resolved (MongoDB user creation automated)
- ✅ **Build Process:** Resolved (all services building successfully)
- 📋 **Hardening:** Pending (least-privilege users, metrics, monitoring)

## Next Phase Focus
1. Route enumeration and validation
2. Comprehensive health monitoring
3. Security hardening (credential rotation)
4. Performance optimization

---
*Generated from: docker-deploy-troubleshooting Nov14.md*
*Last Updated: November 15, 2025*