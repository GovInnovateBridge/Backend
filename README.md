# 🏛️ GovInnovateBridge (Sahyog) - Backend API

> **Empowering Startups, Eliminating Red Tape.**
> Sahyog is a government startup funding platform designed to bring transparency, speed, and bureaucratic efficiency to B2G (Business-to-Government) interactions.

Welcome to the backend repository of Sahyog! This scalable Node.js API powers our two-envelope proposal parsing, ML-driven matchmaking, and simulated Smart Escrow disbursements.

---

## 🌟 Overview & Vision

Sahyog aims to bridge the gap between government bodies (Nodal Officers) and innovative Startups. Traditionally, government funding is slowed down by bureaucratic delays. Sahyog solves this by introducing **Smart Escrows** and **Automated Deemed-Approvals**. If a Nodal Officer fails to approve a valid milestone within 7 days, the system automatically steps in, approves it, and disburses the funds, protecting startups from unnecessary red tape.

---

## 🚀 Core Features

Here is a breakdown of the core systems driving the platform (including the latest features implemented by our team):

- **Secure JWT Authentication & Role-Based Access Control (RBAC)**: Fine-grained access for `STARTUP_FOUNDER`, `NODAL_OFFICER`, `JURY_MEMBER`, and `VIEWER`.
- **DPIIT Startup India Integration**: Instantly fetches and verifies Startup credentials during registration.
- **Zero-Trust TRL Validation**: Python-based AI engine verifies Software TRL (Pitch Deck Analysis) and Hardware TRL (CAD/Hostage Video analysis) to detect fraud before evaluation.
- **Push Matchmaking & Notifications**: ML vector-search automatically matches published challenges with startup profiles and sends targeted email/in-app notifications.
- **Escrow State Machine & Parallel Sandboxing**: Securely locks Trial Budgets for the Top 3 shortlisted startups. Funds are divided into 15-35-50% milestones.
- **Automated 3-Day Deemed-Approval Watchdog**: A background cron job that automatically approves overdue milestones if the Nodal Officer doesn't respond in 3 days.
- **Eviction & Partial Payments**: Officers can reject unsatisfactory milestone work, pay up to 50%, and officially evict the startup from the Sandbox.
- **Mock PFMS Gateway**: Simulates instant financial disbursements to the Public Financial Management System.
- **Two-Envelope Proposal System**: Startups submit proposals separated into a Technical Envelope (with ML PII masking for blind Jury evaluation) and a Financial Envelope (Vault encrypted).
- **Two-Stage Weighted Evaluation (60/40)**: 
  - **Jury**: Scores out of 70 on Technical Criteria and sets the **Milestone Timeline** (e.g., M1=30 Days).
  - **Nodal Officer**: Scores out of 30 on Financial/Administrative Criteria (Envelope B).
  - Backend calculates the `(Jury/70 * 60) + (Officer/30 * 40)` formula and generates **Immutable Cryptographic Scorecards**.
- **Automated Top-3 Shortlisting**: Nodal Officers fetch the Top 3 highest-scoring proposals instantly for Parallel Sandboxing.
- **QCBS Final Winner Selection**: After completing all 3 milestones, startups undergo a background API Sandbox test (Speed/Latency). The Nodal Officer selects the final single winner based on Quality-and-Cost Based Selection (QCBS).

---

## 🔄 Architecture & Workflows

### 1. 💰 Escrow State Machine Lifecycle

Our Smart Escrow system ensures secure transfers of trial budgets based on milestone completions (15%, 35%, 50%) during the Parallel Sandboxing phase. 

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> PENDING : Smart Escrow Frozen (M1, M2, M3)
    PENDING --> CLAIMED : Startup Claims Milestone
    
    CLAIMED --> APPROVED : Manual Approval
    CLAIMED --> DEEMED_APPROVED : Auto-Approval (3 Days)
    CLAIMED --> DISPUTED : Nodal Officer Rejects (Eviction)
    
    APPROVED --> RELEASED : PFMS Simulation Triggered
    DEEMED_APPROVED --> RELEASED : PFMS Simulation Triggered
    DISPUTED --> RELEASED : Partial PFMS Payment
    
    RELEASED --> [*]
```

### 2. ⏳ Bureaucratic "Deemed-Approval" Automation

To prevent startups from being blocked by delays, our automated watchdog steps in after the Jury-defined timeline (3-day grace period) passes.

```mermaid
sequenceDiagram
    participant Cron as node-cron (Hourly)
    participant DB as MongoDB
    participant PFMS as Mock PFMS Gateway

    Cron->>DB: Scan for "CLAIMED" milestones
    
    loop For each claim
        alt If 3-Day Auto-Approval Deadline has passed
            Cron->>DB: Update state to DEEMED_APPROVED
            Cron->>PFMS: Trigger processPFMSDisbursement()
            PFMS-->>Cron: Return Transaction Ref
            Cron->>DB: Update state to RELEASED & save Ref
        end
    end
```

---

## 📡 API Reference

Our API is organized and secured. Below are the key endpoints:

### 🔑 Authentication
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | *None* | Register a new user (`NODAL_OFFICER`, `STARTUP_FOUNDER`, etc.). |
| `POST` | `/api/auth/login` | *None* | Authenticate and retrieve JWT token. |
| `GET` | `/api/auth/me` | *Authenticated* | Retrieve the logged-in user's profile. |

### 💳 Escrows & Financials
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/escrow/` | *Authenticated*| Fetch active escrows and milestone states. |
| `POST` | `/api/escrow/claim-milestone` | `STARTUP_FOUNDER` | Submit a claim for a completed milestone. |
| `POST` | `/api/escrow/approve` | `NODAL_OFFICER` | Manually approve a claimed milestone. |

### 🏦 Mock PFMS Gateway
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/mock/pfms/disburse` | *Internal / Test* | Directly test the Mock PFMS disbursement logic. |

### 📝 Proposals & Grants
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/proposals/submit` | `STARTUP_FOUNDER` | Submit a Two-Envelope proposal. |
| `PATCH` | `/api/proposals/:id/jury/accept` | `JURY_MEMBER` | Accept an ML-matched proposal assignment. |
| `PATCH` | `/api/proposals/:id/jury/decline` | `JURY_MEMBER` | Decline assignment (Triggers instant auto-reassign). |
| `GET` | `/api/proposals/challenge/:id`| `JURY_MEMBER` / `NODAL` | Fetch proposals (Envelope B locked for Jury). |
| `PATCH` | `/api/proposals/:id/evaluate` | `JURY_MEMBER` | Score proposal out of 70 (Generates Hash). |
| `PATCH` | `/api/proposals/:id/officer/evaluate` | `NODAL_OFFICER` | Score proposal out of 30 & calc final weight. |
| `POST` | `/api/proposals/:id/agreement/generate`| `NODAL_OFFICER` | Generate B2G Smart Escrow Agreement. |

### 🎯 Challenges & Discovery
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/challenges/public` | *None* | Paginated listing of published challenges. |
| `POST` | `/api/challenges/create` | `NODAL_OFFICER` | Create a new challenge (auto-extracts KPIs). |
| `PATCH` | `/api/challenges/:id/shortlist-top-3` | `NODAL_OFFICER` | Shortlist Top 3 evaluated proposals automatically. |

---

## 🛠️ Getting Started / Setup Instructions

Follow these quick steps to get the backend running locally:

### 1. Prerequisites
- **Node.js** (v16+ recommended)
- **MongoDB** (Local instance or MongoDB Atlas)

### 2. Installation
Clone the repository and install the required dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root backend directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/govinnovatebridge
JWT_SECRET=your_super_secret_jwt_key
```

### 4. Running the Server
Start the development server with hot-reloading:
```bash
npm run dev
```
> The server will connect to MongoDB, boot up the background cron jobs, and expose the API on port `5000`.

### 5. Testing via Postman / cURL
You can easily test if the server is running by hitting the public challenge API:
```bash
curl -X GET http://localhost:5000/api/challenges/public
```
