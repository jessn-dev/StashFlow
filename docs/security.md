# Security Policy

StashFlow is committed to ensuring the security and privacy of our users' financial data. We appreciate the work of security researchers in making the internet a safer place and encourage responsible disclosure of vulnerabilities found within our platform.

## 1. Reporting a Vulnerability

If you discover a security vulnerability in StashFlow, please **do not open a public GitHub issue**. Instead, report it privately to our security team.

*   **Reporting Method**: Email us at [jessengolab.dev@gmail.com](mailto:jessengolab.dev@gmail.com)
*   **Preferred Language**: English
*   **Essential Information**:
    *   A detailed description of the vulnerability.
    *   Step-by-step instructions to reproduce the issue.
    *   Potential impact of the vulnerability.
    *   Any suggested remediation or fix.

## 2. Response Timeline

We take every report seriously and aim to maintain the following response times:

*   **Initial Acknowledgment**: Within 48 hours of receipt.
*   **Status Update**: We will provide a status update every 5 business days during the triage and resolution phase.
*   **Patching**: We aim to resolve critical vulnerabilities within 30 days of confirmation.

## 3. Disclosure Policy

We follow the principles of **Coordinated Vulnerability Disclosure**. We ask that you:

*   Do not share findings publicly until a fix is available and has been released.
*   Allow us a reasonable amount of time to resolve the issue before disclosure.
*   Keep all communications regarding the vulnerability confidential.

## 4. Supported Versions

Only the following versions of StashFlow currently receive security updates:

| Version | Status |
|---|---|
| Main (v1.x) | Supported |
| Develop | Experimental (Use with caution) |

## 5. Scope

### In-Scope
*   Authentication and Authorization bypasses.
*   Data leakage or unauthorized access to other users' financial data.
*   Remote Code Execution (RCE).
*   Cross-Site Scripting (XSS) or Injection vulnerabilities.

### Out-of-Scope
*   Denial of Service (DoS) attacks.
*   Social engineering or Phishing attacks.
*   Issues requiring physical access to a user's unlocked device.
*   Vulnerabilities in 3rd party services (Supabase, Vercel, Expo) unless they are caused by our misconfiguration.

## 6. The "No-No" List

While we encourage testing, we strictly prohibit actions that:
*   Degrade the performance or availability of our services for other users.
*   Involve the theft or modification of real user data (please use test accounts).
*   Violate any local, national, or international laws.
*   Involve the use of automated scanners that generate high-volume traffic.

Thank you for helping us keep StashFlow secure!
