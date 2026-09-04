# GovInnovateBridge - Backend API

Backend server for the **GovInnovateBridge** platform built with Node.js, Express, and MongoDB.

---

## 🚀 Features (Phase 1, 2, 3, 4, 4B & 5)

- **Modular Architecture**: Clean separation between server setup (`server.js`), Express configuration (`app.js`), controllers, routes, models, and middlewares.
- **Role-Based Access Control (RBAC)**: Custom middlewares for authentication and fine-grained role authorization (`NODAL_OFFICER`, `STARTUP_FOUNDER`, `JURY_MEMBER`).
- **Challenge Ingestion**: Government Nodal Officers can create and publish problem statements with auto-extracted KPIs.
- **Two-Envelope Proposal System**: Startups submit proposals separated into a Technical Envelope (with ML PII masking for blind Jury evaluation) and a Financial Envelope (Vault encrypted).
- **ML Adapter Layer**: Seamless integration with ML microservices (`/extract-kpis` and `/mask-pii`) with built-in zero-crash fallback mechanisms.
- **Jury Matchmaking Dashboard**: Fetch proposals securely sorted by ML scores. Vault Lock middleware automatically scrubs financial data to guarantee unbiased blind evaluation.
- **Smart Escrow & Agreements (Phase 4B)**: Nodal Officers generate B2G Pilot Agreements. Startup signatures automatically freeze their Trial Budget into a simulated Smart Escrow.
- **Sandbox & Grant Management**: Startups simulate ML sandbox validations (only possible if Escrow is FROZEN). Nodal officers automatically unlock financial envelopes during the Sandbox phase to award grants securely.
- **Rich JSON Payloads (Phase 5)**: Supports deep, highly complex GovTech-grade JSON structures for proposals and agreements (e.g., DPDP compliance, infrastructure dependencies, IP rights).
- **Public Challenge Discovery APIs**: Paginated listing, detailed public challenge briefs with whitelisted fields, and lifecycle stage tracking.

---

## 📁 Project Structure

```text
Backend/
├── .env.example            # Environment variables template
├── package.json            # Project dependencies & scripts
├── README.md               # Backend documentation
└── src/
    ├── app.js              # Express app initialization & route mounting
    ├── server.js           # Server startup & Database connection logic
    ├── config/             # Database & app configuration
    ├── controllers/
    │   ├── authController.js    # Authentication logic (Register, Login)
    │   └── publicController.js  # Public Challenge APIs (Fetch, Detail, Status)
    ├── middlewares/
    │   └── authMiddleware.js    # RBAC Middlewares (verifyToken, verifyNodal, etc.)
    ├── models/
    │   ├── Challenge.js         # Mongoose schema for Challenges
    │   └── User.js              # Mongoose schema for Users
    ├── routes/
    │   ├── authRoutes.js        # Auth routes (/api/auth)
    │   └── publicRoutes.js      # Public routes (/api/challenges/public)
    └── utils/                   # Helper functions & utilities
```

---

## 🔐 Authentication & Role-Based Access Control (RBAC)

Middlewares defined in `src/middlewares/authMiddleware.js`:

| Middleware | Description | Access Level |
| :--- | :--- | :--- |
| `verifyToken` | Validates JWT token from `Authorization: Bearer <token>` header and attaches `req.user`. | Authenticated Users |
| `verifyNodal` | Restricts access to Nodal Officers (`NODAL_OFFICER`). | Nodal Officers |
| `verifyStartup` | Restricts access to Startups (`STARTUP_FOUNDER`). | Startup Founders |
| `verifyJury` | Restricts access to Jury Members (`JURY_MEMBER`). | Jury Members |

---

## 📡 API Endpoints

### 1. Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user with a specific role | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |

---

### 2. Public Challenge Routes (`/api/challenges/public`)

| Method | Endpoint | Query / URL Params | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/challenges/public` | `?page=1&limit=10` | Fetch paginated list of published challenges | No |
| `GET` | `/api/challenges/public/:challengeId` | `:challengeId` | Fetch public brief of a published challenge | No |
| `GET` | `/api/challenges/public/:challengeId/status` | `:challengeId` | Fetch the current lifecycle status of a challenge | No |

---

### 3. Challenge Ingestion & Management Routes (`/api/challenges`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/challenges/create` | Create a new DRAFT challenge (auto-extracts KPIs) | `NODAL_OFFICER` |
| `PATCH` | `/api/challenges/:id/publish` | Publish a drafted challenge | `NODAL_OFFICER` |
| `PATCH` | `/api/challenges/:id/evaluate` | Start evaluation phase (close submissions) | `NODAL_OFFICER` |
| `PATCH` | `/api/challenges/:id/sandbox` | Activate sandbox phase (unlocks Envelope B) | `NODAL_OFFICER` |

---

### 4. Proposal & Evaluation Routes (`/api/proposals`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/proposals/submit` | Submit a Two-Envelope proposal (Complex JSON) | `STARTUP_FOUNDER` |
| `GET` | `/api/proposals/challenge/:challengeId` | Fetch proposals for dashboard (Financials locked) | `JURY_MEMBER`, `NODAL_OFFICER` |
| `PATCH` | `/api/proposals/:id/evaluate` | Change proposal status (`SHORTLISTED` / `REJECTED`) | `JURY_MEMBER` |
| `POST` | `/api/proposals/:id/agreement/generate`| Generate B2G Smart Escrow Agreement (Rich JSON) | `NODAL_OFFICER` |
| `PATCH` | `/api/proposals/:id/agreement/sign` | Sign Agreement & Auto-Freeze Smart Escrow | `STARTUP_FOUNDER` |
| `POST` | `/api/proposals/:id/sandbox-run` | Run Sandbox simulation on shortlisted proposal | `STARTUP_FOUNDER` |
| `PATCH` | `/api/proposals/:id/award` | Finalize & Award the Grant | `NODAL_OFFICER` |

#### Example Response (`GET /api/challenges/public`):
```json
{
  "challenges": [
    {
      "_id": "66d81234abcd5678ef901234",
      "title": "Smart Traffic Optimization",
      "problemStatementRaw": "Detailed problem statement text...",
      "publishedAt": "2026-09-01T10:00:00.000Z",
      "evaluationDeadline": "2026-10-01T23:59:59.000Z"
    }
  ],
  "currentPage": 1,
  "totalPages": 1,
  "total": 1
}
```

---

## 🛠️ Setup & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/govinnovatebridge
JWT_SECRET=your_jwt_secret_key_here
```

### Installation
```bash
# Install dependencies
npm install
```

### Running the Server
```bash
# Run in development mode (with nodemon)
npm run dev

# Run in production mode
npm start
```

---

## 🧪 Testing the APIs

You can test the APIs using `curl`, Postman, or PowerShell:

```bash
# Test server health / public challenge listing
curl -X GET http://localhost:5000/api/challenges/public

# Test challenge status by ID
curl -X GET http://localhost:5000/api/challenges/public/66d81234abcd5678ef901234/status
```
