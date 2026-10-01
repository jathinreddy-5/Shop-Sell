# Shop:Sell

### A Scalable Multi-Vendor Marketplace

<p align="center">
  <strong>Discover. Shop. Sell. Manage.</strong>
</p>

<p align="center">
  A full-stack multi-vendor marketplace connecting customers, sellers, and administrators through a unified shopping platform.
</p>

<p align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?style=for-the-badge&logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay-3395FF?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)

</p>

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [How Shop:Sell Works](#how-shopsell-works)
- [Customer Experience](#customer-experience)
- [Seller Experience](#seller-experience)
- [Admin Experience](#admin-experience)
- [Smart Search](#smart-search)
- [Personalized Recommendations](#personalized-recommendations)
- [Cart and Checkout](#cart-and-checkout)
- [Order and Inventory Flow](#order-and-inventory-flow)
- [System Architecture](#system-architecture)
- [Role Architecture](#role-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Deployment](#deployment)
- [Scalability](#scalability)
- [Project Vision](#project-vision)

---

# Overview

**Shop:Sell** is a multi-vendor e-commerce marketplace where multiple independent sellers can list and sell their products while customers can discover, purchase, and manage orders from a single platform.

The platform is designed around three major experiences:

```mermaid
mindmap
  root((Shop:Sell))
    Customer
      Discover Products
      Search
      Recommendations
      Cart
      Checkout
      Payments
      Orders
    Seller
      Store
      Products
      Inventory
      Orders
      Sales
      Payouts
    Admin
      Sellers
      Products
      Categories
      Disputes
      Analytics
      Moderation
```

### The Marketplace in One View

```mermaid
flowchart LR
    C[Customer] --> D[Discover Products]
    D --> S[Search & Explore]
    S --> P[Product Details]
    P --> Cart[Shopping Cart]
    Cart --> CO[Checkout]
    CO --> Pay[Razorpay Payment]
    Pay --> O[Order Created]

    O --> Seller[Seller]
    Seller --> Inv[Inventory]
    Seller --> Fulfill[Order Fulfilment]

    Admin[Admin] --> Manage[Marketplace Management]
    Manage --> Seller
    Manage --> Products[Products]
    Manage --> Dispute[Disputes]
```

---

# Technology Stack

Shop:Sell uses a cloud-native architecture designed to keep the frontend, backend, database, search, payments, storage, and background processing independently scalable.

## Technology Map

```mermaid
mindmap
  root((Shop:Sell))
    Frontend
      Next.js 15
      React
      TypeScript
      Tailwind CSS
      shadcn/ui
      Motion
    Backend
      NestJS
      Node.js
      REST API
      GraphQL Foundation
      Zod
    Database
      PostgreSQL
      Supabase
      pgvector
      JSONB
      RLS
    Search
      Typesense
      Autocomplete
      Typo Tolerance
      Faceted Search
    Performance
      Upstash Redis
      BullMQ
      Rate Limiting
      Caching
    Payments
      Razorpay
      HMAC Verification
      Webhooks
    Storage
      Cloudflare R2
      CDN
    Deployment
      Vercel
      Railway
      Render
      GitHub Actions
```

## Stack Breakdown

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 | Marketplace web application |
| UI | React + TypeScript | Interactive and type-safe UI |
| Styling | Tailwind CSS | Responsive styling |
| Components | shadcn/ui | Reusable UI system |
| Animation | Motion | UI transitions and interactions |
| Backend | NestJS | Modular API |
| Runtime | Node.js | Backend execution |
| Database | PostgreSQL | Core marketplace data |
| Database Platform | Supabase | Hosted PostgreSQL and authentication |
| Vector Search | pgvector | Product similarity |
| Search | Typesense | Fast product search |
| Cache | Upstash Redis | Caching and rate limiting |
| Queue | BullMQ | Background jobs |
| Payments | Razorpay | Online payments |
| Storage | Cloudflare R2 | Product media |
| Frontend Hosting | Vercel | Web deployment |
| API Hosting | Railway / Render | Backend deployment |
| CI | GitHub Actions | Automated checks |

> **Docker is not required** for the application architecture.

---

# How Shop:Sell Works

The marketplace connects the complete shopping lifecycle.

```mermaid
flowchart TD
    Start([Customer Visits Shop:Sell])

    Start --> Home[Marketplace Homepage]

    Home --> Browse[Browse Categories]
    Home --> Search[Search Products]
    Home --> Recommend[Personalized Recommendations]

    Browse --> Product[Product Page]
    Search --> Product
    Recommend --> Product

    Product --> Cart[Add to Cart]

    Cart --> Checkout[Checkout]

    Checkout --> Payment[Razorpay Payment]

    Payment --> Verify{Payment Verified?}

    Verify -->|No| Failed[Payment Failed]
    Verify -->|Yes| Order[Create Order]

    Order --> Inventory[Update Inventory]
    Inventory --> Seller[Seller Order Management]

    Seller --> Fulfilment[Order Fulfilment]

    Order --> CustomerOrder[Customer Order History]

    Admin[Admin] --> Manage[Marketplace Management]
    Manage --> Seller
    Manage --> Product
```

---

# Customer Experience

The customer side of Shop:Sell is focused on product discovery, shopping, payment, and order management.

```mermaid
mindmap
  root((Customer))
    Discover
      Homepage
      Categories
      Trending Products
      Featured Products
    Search
      Autocomplete
      Typo Tolerance
      Filters
      Seller Search
    Product
      Images
      Price
      Description
      Specifications
      Seller
      Stock
    Shopping
      Cart
      Quantity
      Availability
    Checkout
      Address
      Order Summary
      Payment
    Orders
      Order History
      Order Details
      Payment Status
      Order Status
    Recommendations
      Similar Products
      User Activity
      Recent Interactions
```

## Homepage

The homepage acts as the main product discovery interface.

Customers can explore:

- Featured products
- Trending products
- Recommended products
- Popular categories
- Products from different sellers
- Recently viewed products

---

## Product Discovery

Customers can discover products through multiple paths:

```text
                 Product Discovery
                        |
        +---------------+---------------+
        |               |               |
        v               v               v
    Categories        Search       Recommendations
        |               |               |
        +---------------+---------------+
                        |
                        v
                 Product Details
```

---

# Smart Search

Shop:Sell uses **Typesense** to provide fast and typo-tolerant product discovery.

```mermaid
flowchart LR
    User[Customer] --> Input[Search Query]

    Input --> Typesense[Typesense Search]

    Typesense --> Typo[Typo Tolerance]
    Typesense --> Auto[Autocomplete]
    Typesense --> Prefix[Prefix Matching]
    Typesense --> Filter[Filters & Facets]

    Typo --> Results[Relevant Products]
    Auto --> Results
    Prefix --> Results
    Filter --> Results

    Results --> User
```

### Example

```text
Customer enters:

"iphon 15 pro"

        ↓

Search understands the query

        ↓

iPhone 15 Pro
iPhone 15 Pro Max
iPhone 15
...
```

Search supports:

- Autocomplete
- Typo tolerance
- Prefix matching
- Category filters
- Seller filters
- Product filters
- Faceted search

---

# Personalized Recommendations

Shop:Sell includes a product recommendation system designed to improve product discovery.

```mermaid
flowchart TD
    User[Customer Activity]

    User --> Viewed[Viewed Products]
    User --> Interactions[Product Interactions]
    User --> Recent[Recent Activity]

    Viewed --> Signals[Recommendation Signals]
    Interactions --> Signals
    Recent --> Signals

    Products[Product Embeddings] --> Similarity[Vector Similarity]
    Signals --> Scoring[Recommendation Scoring]
    Similarity --> Scoring

    Scoring --> Diversity[Diversity Control]
    Diversity --> Recommendations[Recommended Products]

    Recommendations --> User
```

The recommendation system can consider:

- Previous product interactions
- Recently viewed products
- Product similarity
- Product embeddings
- Recency of activity

The architecture uses **pgvector** for vector-based product similarity.

A time-decay component can also reduce the influence of older interactions.

---

# Seller Experience

Sellers operate their own stores within the marketplace.

```mermaid
mindmap
  root((Seller))
    Store
      Store Profile
      Product Catalogue
      Store Identity
    Products
      Add Product
      Edit Product
      Product Images
      Categories
      Pricing
    Inventory
      Stock Levels
      Availability
      Low Stock
      Stock Updates
    Orders
      New Orders
      Order Items
      Order Status
      Fulfilment
    Business
      Sales
      Payouts
      Store Activity
```

---

# Seller Dashboard

The seller dashboard provides a centralized view of store activity.

Example:

```text
+------------------------------------------------+
|              SELLER DASHBOARD                  |
+------------------------------------------------+
|                                                |
|   Products       Orders        Sales           |
|      128           342        ₹2,45,000        |
|                                                |
+------------------------------------------------+
|                                                |
|   Low Stock Products: 7                        |
|   Pending Orders: 18                           |
|                                                |
+------------------------------------------------+
```

Seller functionality includes:

- Product management
- Inventory management
- Order management
- Store management
- Sales information
- Payout calculations
- Low-stock monitoring

---

# Product Management

Sellers can manage their own product catalogue.

```mermaid
flowchart LR
    Seller[Seller] --> Add[Add Product]
    Seller --> Edit[Edit Product]
    Seller --> Media[Upload Media]
    Seller --> Category[Assign Category]
    Seller --> Price[Update Price]
    Seller --> Stock[Update Stock]

    Add --> Catalogue[Seller Catalogue]
    Edit --> Catalogue
    Media --> Catalogue
    Category --> Catalogue
    Price --> Catalogue
    Stock --> Catalogue
```

---

# Inventory Management

Inventory consistency is important in a multi-vendor marketplace.

```mermaid
flowchart TD
    Customer[Customer Checkout]
    Customer --> Check[Check Product Stock]

    Check --> Available{Stock Available?}

    Available -->|No| Unavailable[Product Unavailable]

    Available -->|Yes| Transaction[Database Transaction]

    Transaction --> Update[Update Inventory]
    Update --> Create[Create Order]
    Create --> Commit[Commit Transaction]

    Commit --> Success[Order Confirmed]
```

The transactional approach helps reduce overselling during concurrent purchases.

---

# Cart and Checkout

The customer purchase flow is:

```mermaid
flowchart LR
    Product[Product] --> Cart[Cart]
    Cart --> Review[Review Cart]
    Review --> Address[Delivery Information]
    Address --> Summary[Order Summary]
    Summary --> Payment[Razorpay]
    Payment --> Verify[Server Verification]
    Verify --> Confirm[Order Confirmation]
```

The cart can contain products from multiple sellers.

Customers can:

- Add products
- Remove products
- Change quantities
- Review prices
- Check availability
- View seller information
- Proceed to checkout

---

# Payment Architecture

Payments are processed through Razorpay.

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Next.js
    participant A as NestJS API
    participant R as Razorpay
    participant DB as PostgreSQL

    C->>W: Start Checkout
    W->>A: Create Payment Order
    A->>R: Create Razorpay Order
    R-->>A: Payment Order
    A-->>W: Payment Details

    C->>R: Complete Payment
    R-->>W: Payment Response

    W->>A: Payment Verification
    A->>A: HMAC SHA256 Verification

    A->>DB: Create / Confirm Order
    DB-->>A: Order Created

    A-->>W: Payment Confirmed
```

Payment security includes:

- Server-side payment verification
- HMAC SHA256 signature verification
- Razorpay webhook processing
- Server-side secret management

---

# Order and Inventory Flow

```mermaid
flowchart TD
    Checkout[Customer Checkout]

    Checkout --> Payment[Payment]
    Payment --> Verification[Payment Verification]

    Verification --> Transaction[Database Transaction]

    Transaction --> Validate[Validate Inventory]
    Validate --> Reduce[Update Stock]
    Reduce --> Order[Create Order]
    Order --> Items[Create Order Items]

    Items --> SellerQueue[Seller Order Queue]
    Items --> CustomerHistory[Customer Order History]

    SellerQueue --> Fulfilment[Seller Fulfilment]
```

This ensures that payment, order creation, and inventory operations are handled as a coordinated workflow.

---

# Admin Experience

Administrators manage the overall marketplace.

```mermaid
mindmap
  root((Admin))
    Seller Management
      Seller Applications
      Seller Accounts
      Seller Activity
    Product Management
      Product Moderation
      Product Availability
    Categories
      Create
      Update
      Organize
    Marketplace
      Analytics
      Activity
      Orders
    Disputes
      Customer Issues
      Seller Issues
      Resolution
```

Admin capabilities include:

- Seller management
- Product moderation
- Category management
- Marketplace analytics
- Dispute management
- Platform-level controls

---

# Role Architecture

Shop:Sell uses role-based access control.

```mermaid
flowchart TD
    User((User))

    User --> Customer[Customer]
    User --> Seller[Seller]
    User --> Admin[Admin]

    Customer --> C1[Browse]
    Customer --> C2[Cart]
    Customer --> C3[Checkout]
    Customer --> C4[Orders]

    Seller --> S1[Store]
    Seller --> S2[Products]
    Seller --> S3[Inventory]
    Seller --> S4[Seller Orders]

    Admin --> A1[Sellers]
    Admin --> A2[Products]
    Admin --> A3[Categories]
    Admin --> A4[Disputes]
    Admin --> A5[Analytics]
```

Authorization is enforced through backend guards and database security policies.

---

# System Architecture

```mermaid
flowchart TB

    Customer[Customer]
    Seller[Seller]
    Admin[Admin]

    Customer --> Web
    Seller --> Web
    Admin --> Web

    Web[Next.js 15 Web Application]

    Web --> API[NestJS API]

    API --> Auth[Supabase Auth]
    API --> DB[(PostgreSQL / Supabase)]
    API --> Redis[(Upstash Redis)]
    API --> Search[Typesense]
    API --> Razorpay[Razorpay]
    API --> R2[Cloudflare R2]

    DB --> Vector[pgvector]

    Redis --> Queue[BullMQ]
    Queue --> Worker[Background Worker]

    Worker --> DB
    Worker --> Search
```

---

# Infrastructure Architecture

```mermaid
mindmap
  root((Shop:Sell Infrastructure))
    Vercel
      Next.js
      Customer Web
      Seller Web
      Admin Web
    Supabase
      PostgreSQL
      Authentication
      pgvector
      RLS
    Upstash
      Redis
      Cache
      Rate Limiting
      Queue
    Typesense
      Search
      Autocomplete
      Typo Tolerance
      Facets
    Razorpay
      Payments
      Verification
      Webhooks
    Cloudflare
      R2
      Product Media
      CDN
    Railway / Render
      NestJS API
      BullMQ Worker
```

---

# Background Processing

Shop:Sell uses **Redis + BullMQ** for asynchronous processing.

```mermaid
flowchart LR
    API[NestJS API] --> Redis[(Upstash Redis)]
    Redis --> Queue[BullMQ Queue]
    Queue --> Worker[Worker Service]

    Worker --> Search[Typesense]
    Worker --> DB[(PostgreSQL)]
    Worker --> Events[Marketplace Events]
```

This allows operations that do not need to block the customer-facing request to run asynchronously.

---

# Security

Shop:Sell includes multiple security layers.

```mermaid
flowchart TD
    Request[Incoming Request]

    Request --> Auth[Authentication]
    Auth --> JWT[JWT Validation]
    JWT --> Role[Role Authorization]
    Role --> Rate[Rate Limiting]
    Rate --> API[API Logic]
    API --> RLS[Database RLS]
    RLS --> DB[(PostgreSQL)]
```

Security mechanisms include:

- Supabase authentication
- JWT validation
- Role-based authorization
- Row Level Security
- API rate limiting
- Server-side payment verification
- Razorpay webhook verification
- Environment-based secret management
- Transactional database operations
- Seller data isolation

---

# Project Structure

```text
Shop:Sell/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (customer)/
│   │   │   │   ├── (seller)/
│   │   │   │   └── admin/
│   │   │   │
│   │   │   └── middleware.ts
│   │   │
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── common/
│       │   ├── database/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── products/
│       │   │   ├── sellers/
│       │   │   ├── search/
│       │   │   ├── cart/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── events/
│       │   │   ├── recommendations/
│       │   │   ├── admin/
│       │   │   └── payouts/
│       │   │
│       │   └── worker.ts
│       │
│       └── package.json
│
├── packages/
│   └── shared/
│
├── scripts/
│   ├── seed.ts
│   └── reindex.ts
│
├── supabase/
│   ├── migrations/
│   └── seeds/
│
├── test/
│   └── k6/
│       └── load-test.js
│
├── docs/
│   └── architecture.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .env.example
├── package.json
└── README.md
```

---

# Getting Started

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git

No Docker installation is required.

---

## Clone the Repository

```bash
git clone https://github.com/jathinreddy-5/Shop-Sell.git

cd Shop-Sell

npm install
```

---

## Environment Configuration

Create your environment file:

```bash
cp .env.example .env
```

Configure the required services:

```text
Supabase
PostgreSQL
Upstash Redis
Typesense
Razorpay
Cloudflare R2
```

Keep all secret keys inside `.env`.

Do not commit `.env` to GitHub.

---

# Database Setup

Shop:Sell uses hosted PostgreSQL through Supabase.

The database includes:

- Marketplace tables
- Product data
- Seller data
- Orders
- Inventory
- Authentication-related data
- Row Level Security
- Database indexes
- pgvector
- Transactional operations

Run the seed process:

```bash
npm run seed
```

The seed process can populate sample marketplace data including:

- Categories
- Sellers
- Stores
- Products
- Product embeddings

---

# Search Index Setup

Synchronize products with Typesense:

```bash
npm run reindex
```

This creates the searchable product catalogue used by the marketplace search interface.

---

# Run the Application

Start the frontend and backend together:

```bash
npm run dev
```

The development environment runs:

```text
Frontend
http://localhost:3000

Backend
http://localhost:4000
```

Run individual services:

```bash
npm run dev:web
```

```bash
npm run dev:api
```

```bash
npm run worker
```

---

# Testing

Run the complete test suite:

```bash
npm run test
```

The test suite covers areas such as:

- Authentication
- Role authorization
- Database migrations
- Product validation
- Search filters
- Order placement
- Inventory management
- Payment verification
- Recommendation scoring
- Seller payouts
- Rate limiting
- Middleware routing

---

# Load Testing

Shop:Sell includes a k6 load-testing configuration.

Run:

```bash
k6 run test/k6/load-test.js
```

The load test covers scenarios such as:

- Homepage requests
- Product discovery
- Search autocomplete
- Product pages
- Checkout requests

---

# Deployment

## Frontend

Deploy the Next.js application using Vercel.

```text
Platform: Vercel
Application: Next.js
Root Directory: apps/web
```

---

## Backend

Deploy the NestJS API using Railway or Render.

```text
Platform: Railway / Render
Application: NestJS
Runtime: Node.js
```

Build:

```bash
npm run build
```

Start:

```bash
npm run start:prod
```

---

## Background Worker

Deploy the BullMQ worker as a separate Node.js service.

```bash
npm run start:worker
```

The worker shares the same:

- Redis
- PostgreSQL
- Typesense

infrastructure as the backend.

---

# Scalability

The architecture is designed so individual components can scale independently.

```mermaid
flowchart LR
    Traffic[Growing Traffic]
    
    Traffic --> CDN[CDN / Edge]
    Traffic --> API[Horizontal API Scaling]

    API --> Pool[Connection Pooling]
    Pool --> DB[(PostgreSQL)]

    API --> Cache[Redis Cache]
    API --> Search[Typesense]

    Queue[BullMQ] --> Workers[Multiple Workers]

    DB --> Replica[Read Replicas]
```

Future scaling strategies can include:

- PostgreSQL connection pooling
- Read replicas
- CDN caching
- Redis caching
- Horizontal API scaling
- Multiple background workers
- Search infrastructure scaling
- Database partitioning
- Catalogue sharding

---

# Key Features

| Feature | Description |
|---|---|
| Multi-Vendor Marketplace | Multiple independent sellers can sell through one platform |
| Customer Marketplace | Browse and purchase products from multiple sellers |
| Smart Search | Typo-tolerant search with autocomplete |
| Personalized Recommendations | Product discovery based on user activity and similarity |
| Product Categories | Structured product discovery |
| Product Pages | Detailed product and seller information |
| Shopping Cart | Manage products before checkout |
| Secure Payments | Razorpay-powered payments |
| Payment Verification | Server-side signature verification |
| Customer Orders | Order history and order details |
| Seller Stores | Individual stores within the marketplace |
| Seller Dashboard | Store-level business overview |
| Product Management | Seller-controlled product catalogue |
| Inventory Management | Stock tracking and low-stock monitoring |
| Transactional Orders | Reliable order and inventory processing |
| Seller Orders | Seller-specific order management |
| Seller Payouts | Seller-specific payout calculations |
| Admin Panel | Marketplace administration |
| Seller Management | Seller application and account management |
| Product Moderation | Marketplace product management |
| Category Management | Marketplace catalogue organization |
| Dispute Management | Marketplace dispute handling |
| Role-Based Access | Customer, seller, and admin permissions |
| Product Media | Cloud-based media storage |
| Background Processing | Asynchronous marketplace operations |
| Rate Limiting | Redis-based API protection |
| Vector Similarity | pgvector-powered product similarity |

---

# Project Vision

Shop:Sell brings the complete marketplace lifecycle into one platform.

```mermaid
flowchart LR
    Discover[Discover] --> Search[Search]
    Search --> Explore[Explore]
    Explore --> Cart[Add to Cart]
    Cart --> Checkout[Checkout]
    Checkout --> Pay[Pay]
    Pay --> Order[Order]
    Order --> Fulfil[Seller Fulfilment]
    Fulfil --> Manage[Marketplace Management]
    Manage --> Discover
```

### The goal

```text
                 SHOP:SELL

        ┌───────────────────────────┐
        │                           │
        │       DISCOVER            │
        │           ↓               │
        │        SEARCH             │
        │           ↓               │
        │        EXPLORE            │
        │           ↓               │
        │       PURCHASE            │
        │           ↓               │
        │         ORDER             │
        │           ↓               │
        │       FULFILMENT          │
        │           ↓               │
        │       MANAGEMENT          │
        │                           │
        └───────────────────────────┘
```

Shop:Sell combines **customer shopping, seller management, marketplace administration, intelligent search, recommendations, secure payments, inventory management, and scalable cloud infrastructure** into a unified multi-vendor marketplace.
