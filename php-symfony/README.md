# PHP Symfony

## php-symfony — `ApiClient::call()`

### What it does

A thin Symfony 7.4 HTTP client wrapper that reads credentials from env vars and forwards GET requests to an external API.
`ApiController` exposes it over HTTP, passing user-supplied query parameters directly — extending the SSRF surface to the network layer.

### Expected SAST findings

Severity | CWE     | Location                | Finding
---------|---------|-------------------------|------------------------------------------------------------------------------
High     | CWE-918 | `ApiClient::call()`     | **SSRF** — `$endpoint` concatenated into URL without validation
High     | CWE-918 | `ApiController::call()` | **SSRF source** — `?endpoint=` query param flows unvalidated into `ApiClient`
Medium   | CWE-532 | `ApiClient::call()`     | **Sensitive data in logs** — `$e->getMessage()` may contain tokens/keys
Medium   | CWE-396 | `ApiClient::call()`     | **Overly broad catch** — `\Throwable` masks programming errors
Low      | CWE-297 | `ApiClient::call()`     | **No explicit TLS peer verification** option on the HTTP client

## Prerequisites

- PHP 8.3+ with extensions

```bash
sudo apt update
sudo apt install -y php8.3-cli php8.3-common php8.3-curl php8.3-mbstring php8.3-xml php8.3-zip php8.3-bcmath php8.3-intl php8.3-opcache
php --version
```

- Composer 2.x

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
HASH=$(curl -sS https://composer.github.io/installer.sig)
php -r "if (hash_file('sha384', 'composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
php -r "unlink('composer-setup.php');"
composer --version
```

- Symfony

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | sudo -E bash
sudo apt install symfony-cli
symfony version
symfony check:requirements
```

- (optional) Docker — for Symfony CLI, SonarQube, or containerised scanning

## Run the app

### 1. Install dependencies

```bash
cd php-symfony
composer install
```

### 2. Start the web server

**Option A — Symfony CLI (recommended)**

The Symfony CLI automatically loads `.env` and handles routing correctly.

```bash
# Install once: https://symfony.com/download
symfony server:start
```

**Option B — Shell env export + PHP built-in server**

The PHP built-in server does not load `.env` on its own. Export the variables
in your shell first, then start the server.

```bash
export APP_ENV=dev
export APP_SECRET=changeme
export BASE_URL=https://httpbin.org
export SERVICE_API_KEY=demo-api-key

php -S localhost:8000 public/index.php
```

> Note: `php -S localhost:8000 -t public/` alone will fail with
> "Missing required environment variable" because `.env` is never loaded.

### 3. Hit the endpoints

```bash
# Home / description
curl http://localhost:8000/

# Normal use — proxies to https://httpbin.org/get
curl "http://localhost:8000/api/call?endpoint=/get"
```

<!--
The response shows what httpbin.org echoes back the headers:

- Authorization: Bearer stub-token — the bearer token is visible
- Header-Key: demo-api-key-change-me — the API key is visible in plain text

Exactly the kind of sensitive data exposure that would flow into logs on an error, which is what CWE-532 is about.
-->

### 4. Run unit tests

```bash
vendor/bin/phpunit
```

## SAST scanning

### Semgrep OSS (free, no account needed)

Semgrep is the fastest way to get findings locally. No signup required for OSS rules.

```bash
# Install (pick one)
pip install semgrep                         # via pip
brew install semgrep                        # macOS
docker pull semgrep/semgrep                 # Docker

cd php-symfony

# Run the OWASP / security-audit rule packs against the project
semgrep scan --config "p/owasp-top-ten" --config "p/php" src/

# Run custom rules from this repo
semgrep scan --config .semgrep/rules.yaml src/

# Run both together
semgrep scan --config "p/owasp-top-ten" --config "p/php" --config .semgrep/rules.yaml src/

# Output as SARIF (for GitHub Code Scanning upload)
semgrep scan --config "p/owasp-top-ten" --config "p/php" --sarif --output semgrep.sarif src/

# Docker alternative (no local install)
docker run --rm -v "$(pwd):/src" semgrep/semgrep \
  semgrep scan --config "p/owasp-top-ten" --config "p/php" /src/src
```

Expected key findings from Semgrep:

- `php.lang.security.curl.ssrf` or similar — SSRF in `ApiClient`
- `php.lang.security.audit.sqli` suite — may flag string concatenation patterns

### Bearer CLI (free, data-flow focus — best for CWE-532 log leaks)

Bearer is particularly strong at detecting sensitive data flowing into logs and
external calls. It requires a one-time binary download but no account.

```bash
# Install
curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sh

# Or via Homebrew
brew install bearer/tap/bearer

# Or via Docker
docker pull bearer/bearer

cd php-symfony

# Full scan — security + privacy findings
bearer scan src/

# Security findings only, quiet output
bearer scan --scanner=secrets,sast src/ --quiet

# SARIF output
bearer scan src/ --format sarif --output bearer.sarif

# Docker alternative
docker run --rm -v "$(pwd)/src:/tmp/scan" bearer/bearer scan /tmp/scan
```

Expected key findings from Bearer:

- `php_lang_logger` — `$e->getMessage()` passed to logger (CWE-532)
- `php_lang_http_insecure` — unvalidated URL parameter (CWE-918)

### Psalm with taint analysis (free, PHP-native data-flow)

Psalm traces taint sources through the call graph, making it the clearest tool for explaining to developers _why_ the SSRF exists.

```bash
cd php-symfony

# Add Psalm as a dev dependency (one-time)
composer require --dev vimeo/psalm

# Initialise — or use the psalm.xml already in this repo
vendor/bin/psalm --init src/ 3

# Run taint analysis (this is the important flag)
vendor/bin/psalm --taint-analysis

# Run with output grouped by issue type
vendor/bin/psalm --taint-analysis --show-info=true
```

Psalm will produce a `TaintedInput` or `TaintedSSRF`-class finding tracing the data flow from `$endpoint` → `$baseUrl . $endpoint` → `httpClient->request()`.

### SonarQube Community (free, self-hosted)

```bash
# Start SonarQube locally via Docker
docker run -d --name sonarqube \
  -p 9000:9000 \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  sonarqube:community

# Wait ~60 s, then open http://localhost:9000
# Default credentials: admin / admin (change on first login)

# Run the scanner from the php-symfony directory
cd php-symfony
docker run --rm \
  --network host \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=<paste-token-from-ui> \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

The `sonar-project.properties` in this directory is pre-configured.

### GitHub Advanced Security / CodeQL (free for public repos)

No local setup needed — just push to a public GitHub repo.
The CI workflow at `.github/workflows/php.yml` includes a SonarCloud job.

To add CodeQL:

1. Enable **GitHub Advanced Security** on the repository (free for public repos).
2. Go to **Settings → Code security → Code scanning → Set up → Default**.
3. CodeQL will auto-detect PHP and run the SSRF + injection query suite on every push.

## Tool comparison

Tool                    | Install               | PHP support | Highlights for this sample
------------------------|-----------------------|-------------|-------------------------------------------------------
**Semgrep OSS**         | `pip install semgrep` | Yes         | Fastest local feedback; custom rules as YAML
**Bearer CLI**          | one binary            | Yes         | Best at CWE-532 log-leak detection
**Psalm**               | `composer require`    | PHP-only    | Full data-flow trace for SSRF (taint source → sink)
**SonarQube Community** | Docker                | Yes         | Broadest OWASP coverage; PR decoration
**SonarCloud**          | SaaS                  | Yes         | Zero infra; integrates with GitHub Actions
**GitHub CodeQL**       | SaaS (GHAS)           | Yes         | Deep SSRF/injection queries; free for public repos
**PHPStan**             | `composer require`    | PHP-only    | Level 9 + `phpstan-security-advisories` for known CVEs
