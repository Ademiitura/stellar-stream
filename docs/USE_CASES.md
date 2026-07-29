# StellarStream Use Cases & Integration Patterns

This document outlines 5 primary real-world use cases for payment streaming using StellarStream on the Stellar network. Each use case includes a business description, complete stream parameter specifications, API endpoint links, and copy-pasteable runnable code examples targeting the local backend API (`http://localhost:3001`).

---

## Table of Contents

1. [Payroll (Continuous Salary Streaming)](#1-payroll-continuous-salary-streaming)
2. [Contractor Vesting (Milestone & Cliff Streaming)](#2-contractor-vesting-milestone--cliff-streaming)
3. [DAO Contributor Payments (Governance Epochs)](#3-dao-contributor-payments-governance-epochs)
4. [Subscription Billing (Micro-Pay-As-You-Go SaaS)](#4-subscription-billing-micro-pay-as-you-go-saas)
5. [Grant Streaming (Ecosystem Development Grants)](#5-grant-streaming-ecosystem-development-grants)
6. [API Quick Reference](#api-quick-reference)

---

## 1. Payroll (Continuous Salary Streaming)

### Description
Traditional payroll operates on fixed bi-weekly or monthly payout schedules, creating liquidity friction for employees and administrative overhead for companies. With continuous salary streaming, employees earn funds per second as they work.

**Key Benefits:**
- **Instant Liquidity**: Employees can withdraw vested salary at any time to cover immediate living expenses.
- **Automated Lifecycle**: Employers set up a single stream per monthly cycle.
- **Flexible Management**: Stream can be paused during unpaid leave or canceled upon employment termination, automatically refunding unearned tokens to the employer.

### Stream Parameters

| Parameter | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `sender` | `string` | `GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYCZLYWBKHBGXI5AMST` | Employer Stellar G-Address (Vault/Payroll wallet) |
| `recipient` | `string` | `GDFX6B5YMQX2XN7QZ5N6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X` | Employee Stellar G-Address |
| `assetCode` | `string` | `USDC` | Payment token (USDC or XLM) |
| `totalAmount` | `number` | `5000` | Monthly gross salary (5,000 USDC) |
| `durationSeconds` | `number` | `2592000` | Stream duration (30 days = $30 \times 86,400$s) |
| `startAt` | `number` (optional) | `1770000000` | UNIX timestamp for start of pay period |
| `cliffSeconds` | `number` (optional) | `0` | Immediate linear vesting (no cliff) |

### Relevant API Endpoints
- **Create Payroll Stream**: [`POST /api/streams`](#post-apistreams)
- **Check Employee Vesting**: [`GET /api/streams/:id`](#get-apistreamsid)
- **List Employee Streams**: [`GET /api/streams/recipient/:address`](#get-apistreamsrecipientaddress)
- **Pause Salary (Leave)**: [`POST /api/streams/:id/pause`](#post-apistreamsidpause)
- **Resume Salary**: [`POST /api/streams/:id/resume`](#post-apistreamsidresume)
- **Cancel Stream (Offboarding)**: [`POST /api/streams/:id/cancel`](#post-apistreamsidcancel)

### Code Examples (Local Backend `http://localhost:3001`)

#### cURL Example
```bash
curl -X POST http://localhost:3001/api/streams \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYCZLYWBKHBGXI5AMST",
    "recipient": "GDFX6B5YMQX2XN7QZ5N6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X",
    "assetCode": "USDC",
    "totalAmount": 5000,
    "durationSeconds": 2592000
  }'
```

#### Node.js / JavaScript Example
```javascript
const response = await fetch("http://localhost:3001/api/streams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sender: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYCZLYWBKHBGXI5AMST",
    recipient: "GDFX6B5YMQX2XN7QZ5N6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X",
    assetCode: "USDC",
    totalAmount: 5000,
    durationSeconds: 2592000
  }),
});

const data = await response.json();
console.log("Payroll Stream Created:", data);
```

---

## 2. Contractor Vesting (Milestone & Cliff Streaming)

### Description
Project owners hire external contractors for multi-month deliverables. To protect both parties, funds are committed into a stream with a **cliff period**. The cliff ensures the contractor delivers initial groundwork before any funds vest, while giving the contractor confidence that project funds are secured in escrow.

**Key Benefits:**
- **Risk Mitigation**: The cliff period (`cliffSeconds`) delays initial claimable vesting until a initial milestone date.
- **Continuous Retention**: After the cliff, funds vest continuously per second.
- **Escrow Assurance**: Funds are locked upfront, removing client non-payment risks.

### Stream Parameters

| Parameter | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `sender` | `string` | `GBAF7W4L57O66K3OQ2K4J5J6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X` | Client / Project Treasury Stellar G-Address |
| `recipient` | `string` | `GCP3V89Z7Y6X5W4V3U2T1S0R9Q8P7O6N5M4L3K2J1I0H9G8F7E6D5C4B` | Contractor Stellar G-Address |
| `assetCode` | `string` | `USDC` | Settlement token |
| `totalAmount` | `number` | `12000` | Total contract value ($12,000) |
| `durationSeconds` | `number` | `7776000` | Total contract term (90 days = $90 \times 86,400$s) |
| `startAt` | `number` (optional) | `1770000000` | Start timestamp |
| `cliffSeconds` | `number` (optional) | `1209600` | 14-day cliff ($14 \times 86,400$s) before initial vesting begins |

### Relevant API Endpoints
- **Create Contractor Stream**: [`POST /api/streams`](#post-apistreams)
- **View Stream Details & Progress**: [`GET /api/streams/:id`](#get-apistreamsid)
- **Check Claimable Amount**: [`GET /api/streams/claimable/batch`](#post-apistreamsclaimablebatch)
- **Cancel Unvested Stream**: [`POST /api/streams/:id/cancel`](#post-apistreamsidcancel)

### Code Examples (Local Backend `http://localhost:3001`)

#### cURL Example
```bash
curl -X POST http://localhost:3001/api/streams \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GBAF7W4L57O66K3OQ2K4J5J6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X",
    "recipient": "GCP3V89Z7Y6X5W4V3U2T1S0R9Q8P7O6N5M4L3K2J1I0H9G8F7E6D5C4B",
    "assetCode": "USDC",
    "totalAmount": 12000,
    "durationSeconds": 7776000,
    "cliffSeconds": 1209600
  }'
```

#### Node.js / JavaScript Example
```javascript
const response = await fetch("http://localhost:3001/api/streams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sender: "GBAF7W4L57O66K3OQ2K4J5J6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6XQ5Z6X",
    recipient: "GCP3V89Z7Y6X5W4V3U2T1S0R9Q8P7O6N5M4L3K2J1I0H9G8F7E6D5C4B",
    assetCode: "USDC",
    totalAmount: 12000,
    durationSeconds: 7776000,
    cliffSeconds: 1209600
  }),
});

const data = await response.json();
console.log("Contractor Vesting Stream Created:", data);
```

---

## 3. DAO Contributor Payments (Governance Epochs)

### Description
DAOs compensate core contributors, working group leads, and delegates across governance epochs (e.g., quarterly 90-day cycles). Instead of executing manual multisig payout transactions every month, the DAO treasury sets up active streams per epoch.

**Key Benefits:**
- **Governance Overhead Reduction**: One governance vote per epoch streams compensation continuously.
- **Batch Visibility**: DAO administrators can inspect and simulate claimable balances across all contributors in a single API call.
- **Transparent Auditability**: Real-time progress tracking via event history endpoints.

### Stream Parameters

| Parameter | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `sender` | `string` | `GDAO4TREASURY3210X987V654U321T098S765R432Q109P876O543N` | DAO Treasury Multisig Stellar G-Address |
| `recipient` | `string` | `GCONTRIBUTOR1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234` | DAO Contributor Stellar G-Address |
| `assetCode` | `string` | `USDC` | DAO stablecoin asset |
| `totalAmount` | `number` | `3000` | Quarterly contributor stipend (3,000 USDC) |
| `durationSeconds` | `number` | `7776000` | Governance epoch (90 days = $90 \times 86,400$s) |
| `startAt` | `number` (optional) | `1770000000` | Epoch start timestamp |
| `cliffSeconds` | `number` (optional) | `0` | Immediate linear vesting |

### Relevant API Endpoints
- **Create DAO Stream**: [`POST /api/streams`](#post-apistreams)
- **Batch Query Claimable Amounts**: [`POST /api/streams/claimable/batch`](#post-apistreamsclaimablebatch)
- **List All Treasury Streams**: [`GET /api/streams/sender/:address`](#get-apistreamssenderaddress)
- **Export Streams CSV Report**: [`GET /api/streams/export.csv`](#get-apistreamsexportcsv)

### Code Examples (Local Backend `http://localhost:3001`)

#### cURL Example
```bash
# 1. Create stream for contributor
curl -X POST http://localhost:3001/api/streams \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GDAO4TREASURY3210X987V654U321T098S765R432Q109P876O543N",
    "recipient": "GCONTRIBUTOR1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
    "assetCode": "USDC",
    "totalAmount": 3000,
    "durationSeconds": 7776000
  }'

# 2. Batch check claimable amounts for DAO streams
curl -X POST http://localhost:3001/api/streams/claimable/batch \
  -H "Content-Type: application/json" \
  -d '{
    "streamIds": ["1", "2", "3"]
  }'
```

#### Node.js / JavaScript Example
```javascript
// Batch check claimable balances across DAO streams
const batchResponse = await fetch("http://localhost:3001/api/streams/claimable/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    streamIds: ["1", "2", "3"],
  }),
});

const batchData = await batchResponse.json();
console.log("DAO Claimable Batch Status:", batchData);
```

---

## 4. Subscription Billing (Micro-Pay-As-You-Go SaaS)

### Description
SaaS platforms, media streaming apps, and API services can replace rigid upfront monthly subscriptions with continuous per-second payment streams. Users fund a stream for a desired service window and can pause or cancel at any second without locked commitments or refund disputes.

**Key Benefits:**
- **Zero Lock-in**: Users only pay for the exact seconds they utilize the service.
- **Instant Pause/Resume**: Pause service stream when inactive and resume when needed.
- **Automated Termination**: Canceling the stream immediately cuts off service access and refunds unspent balance to the subscriber.

### Stream Parameters

| Parameter | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `sender` | `string` | `GSUBSCRIBER111222333444555666777888999000AAABBBCCCDDD` | Subscriber Stellar G-Address |
| `recipient` | `string` | `GSERVICEPROVIDER999888777666555444333222111AAABBBCCCD` | SaaS Provider Stellar G-Address |
| `assetCode` | `string` | `USDC` | Subscription asset |
| `totalAmount` | `number` | `100` | Total monthly budget ($100 USDC) |
| `durationSeconds` | `number` | `2592000` | 30-day service window ($30 \times 86,400$s) |
| `startAt` | `number` (optional) | `1770000000` | Subscription start time |
| `cliffSeconds` | `number` (optional) | `0` | Continuous pay-as-you-go |

### Relevant API Endpoints
- **Start Subscription Stream**: [`POST /api/streams`](#post-apistreams)
- **Check Subscription Progress**: [`GET /api/streams/:id`](#get-apistreamsid)
- **Pause Subscription**: [`POST /api/streams/:id/pause`](#post-apistreamsidpause)
- **Resume Subscription**: [`POST /api/streams/:id/resume`](#post-apistreamsidresume)
- **Cancel Subscription**: [`POST /api/streams/:id/cancel`](#post-apistreamsidcancel)

### Code Examples (Local Backend `http://localhost:3001`)

#### cURL Example
```bash
# Pause active subscription stream
curl -X POST http://localhost:3001/api/streams/1/pause \
  -H "Content-Type: application/json"

# Resume subscription stream
curl -X POST http://localhost:3001/api/streams/1/resume \
  -H "Content-Type: application/json"
```

#### Node.js / JavaScript Example
```javascript
// Pause subscription
const pauseRes = await fetch("http://localhost:3001/api/streams/1/pause", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
const pausedStream = await pauseRes.json();
console.log("Subscription Paused:", pausedStream);
```

---

## 5. Grant Streaming (Ecosystem Development Grants)

### Description
Ecosystem funds and foundations award grants to open-source project teams. Instead of disbursing 100% upfront (which carries abandonment risk) or making manual milestone transfers, foundations stream grant capital over 6 to 12 months with optional initial cliff periods.

**Key Benefits:**
- **Milestone Verification**: Foundations can review milestone progress before approving stream continuation.
- **Emergency Protection**: If a project is abandoned, the foundation can pause or cancel the stream, recovering unvested capital.
- **Audit Trails**: Full auditability via lifecycle events (`created`, `paused`, `resumed`, `canceled`, `claimed`).

### Stream Parameters

| Parameter | Type | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `sender` | `string` | `GFOUNDATION888777666555444333222111000AAABBBCCCDDDEEE` | Ecosystem Foundation Stellar G-Address |
| `recipient` | `string` | `GGRANTRECIPIENT777666555444333222111000AAABBBCCCDDDEF` | Grantee Team Stellar G-Address |
| `assetCode` | `string` | `XLM` | Grant asset (XLM or USDC) |
| `totalAmount` | `number` | `50000` | Total grant allocation (50,000 XLM) |
| `durationSeconds` | `number` | `15552000` | 6-month grant term ($180 \times 86,400$s) |
| `startAt` | `number` (optional) | `1770000000` | Grant start timestamp |
| `cliffSeconds` | `number` (optional) | `2592000` | 30-day initial milestone cliff ($30 \times 86,400$s) |

### Relevant API Endpoints
- **Create Grant Stream**: [`POST /api/streams`](#post-apistreams)
- **Estimate Network Fee**: [`POST /api/streams/fee-estimate`](#post-apistreamsfee-estimate)
- **Query Stream Lifecycle History**: [`GET /api/events?streamId=1`](#get-apievents)
- **Pause Grant Stream**: [`POST /api/streams/:id/pause`](#post-apistreamsidpause)
- **Resume Grant Stream**: [`POST /api/streams/:id/resume`](#post-apistreamsidresume)

### Code Examples (Local Backend `http://localhost:3001`)

#### cURL Example
```bash
# 1. Estimate creation fee for 50,000 XLM grant
curl -X POST http://localhost:3001/api/streams/fee-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GFOUNDATION888777666555444333222111000AAABBBCCCDDDEEE",
    "recipient": "GGRANTRECIPIENT777666555444333222111000AAABBBCCCDDDEF",
    "assetCode": "XLM",
    "totalAmount": 50000,
    "durationSeconds": 15552000,
    "cliffSeconds": 2592000
  }'

# 2. Query event history for grant stream
curl -X GET "http://localhost:3001/api/events?streamId=1"
```

#### Node.js / JavaScript Example
```javascript
// Query stream event audit history
const eventsRes = await fetch("http://localhost:3001/api/events?streamId=1");
const eventsData = await eventsRes.json();
console.log("Grant Stream Audit Events:", eventsData);
```

---

## API Quick Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/streams` | Create a new payment stream |
| `GET` | `/api/streams` | List streams with filters (`status`, `recipient`, `sender`, `assetCode`, `page`, `limit`) |
| `GET` | `/api/streams/:id` | Fetch single stream state and progress |
| `POST` | `/api/streams/:id/pause` | Pause an active stream (sender only) |
| `POST` | `/api/streams/:id/resume` | Resume a paused stream (sender only) |
| `POST` | `/api/streams/:id/cancel` | Cancel a stream and return unvested funds to sender |
| `POST` | `/api/streams/bulk-cancel` | Cancel multiple streams in a single call |
| `GET` | `/api/streams/sender/:address` | Fetch all streams created by a specific sender |
| `GET` | `/api/streams/recipient/:address` | Fetch all streams where address is recipient |
| `POST` | `/api/streams/claimable/batch` | Simulate and fetch claimable balances across multiple streams |
| `POST` | `/api/streams/fee-estimate` | Estimate network transaction fees for creating a stream |
| `GET` | `/api/events` | Query global or stream-specific lifecycle event history |
| `GET` | `/api/streams/export.csv` | Export stream data to CSV format |

---
