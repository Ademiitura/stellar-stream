# Security Policy

## Supported Versions

The following versions of Stellar Stream are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Stellar Stream seriously. If you believe you have found a security vulnerability, please report it privately.

**Please do not open a public issue for security vulnerabilities.**

### Private Reporting Process

Please use the **[GitHub Security Advisory](https://github.com/stellar-stream/stellar-stream/security/advisories/new)** form to report vulnerabilities privately. 

This is the preferred method as it allows us to communicate with you privately and coordinate a fix before public disclosure.

### Our Commitment (SLA)

Once a report is received through the GitHub Security Advisory form, we commit to the following response timeline:

- **48 hours**: Acknowledgement of receipt of the report.
- **7 days**: Initial assessment and confirmation of the vulnerability.
- **30 days**: Target for providing a fix or public disclosure (depending on complexity).

## GitHub Security Advisories

Maintainers: Please ensure that **GitHub Security Advisories** are enabled for this repository to allow researchers to submit reports privately.

## Content Security Policy (CSP)

The frontend build injects a Content Security Policy to limit script execution and network connections, reducing the impact of cross-site scripting (XSS) against wallet connection state.

### Policy

```
default-src 'self';
connect-src 'self' https://rpc-futurenet.stellar.org
```

- **`default-src 'self'`** — Scripts, styles, images, and other subresources load only from the application origin.
- **`connect-src`** — `fetch`/XHR/WebSocket connections are limited to the app origin (API proxy) and the configured Stellar Futurenet RPC endpoint.

### Rollout

1. **Report-only (default)** — The Vite build sends `Content-Security-Policy-Report-Only` in development, preview, and production builds. Violations are logged by the browser but not blocked.
2. **Enforcement** — Set `VITE_CSP_ENFORCE=true` when building or serving the frontend to send `Content-Security-Policy` instead. Monitor the browser console for violations before enabling in production.

### Configuration

| Variable | Effect |
| -------- | ------ |
| (unset) | Report-only CSP via meta tag and HTTP headers |
| `VITE_CSP_ENFORCE=true` | Enforcing CSP |

Implementation: `frontend/vite.config.ts` (`content-security-policy` plugin and dev/preview headers).


