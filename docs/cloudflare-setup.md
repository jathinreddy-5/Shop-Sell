# Cloudflare Security & Infrastructure Setup Guide

This guide details the production hardening checklist for **Shop:Sell** using Cloudflare edge services, Cloudflare Turnstile, and edge security policies.

---

## 1. Cloudflare Turnstile Bot Protection

Cloudflare Turnstile replaces traditional CAPTCHAs with privacy-preserving, friction-free challenges.

### Step-by-Step Dashboard Setup
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Turnstile**.
2. Click **Add Widget**:
   - **Widget Name**: `Shop:Sell Production Authentication`
   - **Domains**: Add your production domain (e.g. `shopsell.com`, `*.shopsell.com`) and staging domains.
   - **Widget Mode**: **Managed** (Cloudflare determines when to present an interactive challenge).
3. Copy the generated keys:
   - **Site Key** &rarr; Set in your web environment as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
   - **Secret Key** &rarr; Set in your backend and web server environments as `TURNSTILE_SECRET_KEY`.
4. Configure in `.env.production`:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAA...
   ```

### Implementation Vectors in Shop:Sell
- **Login Screen** (`/login`): Gated on both Email OTP and Email Password flows.
- **Send OTP Endpoint** (`/api/auth/request-otp`): Requires valid Turnstile token before dispatching SMS/SMTP emails.
- **Merchant Onboarding** (`/become-a-seller`): Requires Turnstile verification prior to KYC submission.
- **Verification Endpoint**: Server validates against `https://challenges.cloudflare.com/turnstile/v0/siteverify` using `CF-Connecting-IP`.

---

## 2. Web Application Firewall (WAF) & Rate Limiting Rules

Navigate to **Security** &rarr; **WAF** in the Cloudflare dashboard.

### A. Authentication Rate Limiting
- **Rule Name**: `Auth Endpoints Rate Limit`
- **Expression**:
  ```text
  (http.request.uri.path matches "^/api/auth/(login|request-otp|verify-otp)")
  ```
- **Threshold**: 5 requests per 1 minute per IP address.
- **Action**: **Managed Challenge** or **Block** for 15 minutes.

### B. Seller Onboarding Rate Limit
- **Rule Name**: `Seller Application Rate Limit`
- **Expression**:
  ```text
  (http.request.uri.path matches "^/api/sellers/apply" and http.request.method eq "POST")
  ```
- **Threshold**: 3 requests per 10 minutes per IP address.
- **Action**: **Block** for 1 hour.

### C. Bot & Threat Score Mitigation
- **Rule Name**: `Block High Risk Threats`
- **Expression**:
  ```text
  (cf.threat_score gt 30) or (cf.client.bot and not cf.bot_management.verified_bot)
  ```
- **Action**: **Managed Challenge**.

---

## 3. Origin Protection & Network Restrictions

Ensure no traffic can bypass Cloudflare to hit the origin servers directly.

### A. Restrict Traffic to Cloudflare IP Ranges
Configure your cloud security groups / firewall (AWS Security Group, GCP VPC Firewall, or iptables/Nginx) to only allow ingress on port `443` from official Cloudflare IP ranges:
- **IPv4**:
  ```
  173.245.48.0/20
  103.21.244.0/22
  103.22.200.0/22
  103.31.4.0/22
  141.101.64.0/18
  108.162.192.0/18
  190.93.240.0/20
  188.114.96.0/20
  197.234.240.0/22
  198.41.128.0/17
  162.158.0.0/15
  104.16.0.0/13
  104.24.0.0/14
  172.64.0.0/13
  131.0.72.0/22
  ```
- **IPv6**:
  ```
  2400:cb00::/32
  2606:4700::/32
  2803:f800::/32
  2405:b500::/32
  2405:8100::/32
  2a06:98c0::/29
  2c0f:f248::/32
  ```

### B. Authenticated Origin Pulls (AOP)
1. In Cloudflare Dashboard, go to **SSL/TLS** &rarr; **Origin Server**.
2. Enable **Authenticated Origin Pulls**.
3. Download the official Cloudflare Origin CA certificate and install it in your Nginx / reverse proxy configuration:
   ```nginx
   ssl_client_certificate /etc/ssl/cloudflare.crt;
   ssl_verify_client on;
   ```
This guarantees that only Cloudflare edge nodes with valid client certificates can negotiate TLS connections with your origin.

---

## 4. SSL/TLS Configuration

- **Encryption Mode**: **Full (Strict)**.
- **Edge Certificates**:
  - Minimum TLS Version: **TLS 1.3**.
  - Opportunistic Encryption: **Enabled**.
  - TLS 1.3 0-RTT: **Disabled** (prevents replay attacks on state-changing API requests).
  - Always Use HTTPS: **Enabled**.
  - HTTP Strict Transport Security (HSTS):
    - Max Age: `63072000` (2 years).
    - Include subdomains: `true`.
    - Preload: `true`.

---

## 5. Nonce-Based Content Security Policy (CSP)

The Next.js edge middleware automatically generates a unique cryptographically random cryptographic nonce per request (`crypto.randomUUID()`) and injects it into:
- The request header `x-nonce`.
- The `Content-Security-Policy` header.

Cloudflare Turnstile domains (`https://challenges.cloudflare.com`) are explicitly whitelisted in `script-src`, `frame-src`, and `connect-src` directives.
