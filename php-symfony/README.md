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
sudo add-apt-repository ppa:ondrej/php
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

**Option A** — Symfony CLI (recommended):

Create and update `.env` file:

```bash
cp .env.dist .env
```

Start the server (Symfony CLI automatically loads `.env` and handles routing correctly):

```bash
rm -rf var/log/ var/cache/
php bin/console cache:clear
symfony server:start
```

**Option B** — Shell env export + PHP built-in server:

The PHP built-in server does not load `.env` on its own.
Export the variables in the shell first, then start the server.

```bash
export APP_ENV=dev
export APP_SECRET=changeme
export BASE_URL=https://httpbin.org
export SERVICE_API_KEY=demo-api-key

php -S localhost:8000 public/index.php
```

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

### Semgrep OSS

Semgrep is the fastest way to get findings locally (see [Quickstart](https://docs.semgrep.dev/getting-started/quickstart)).
No signup required for OSS rules.

```bash
# install through pipx (https://pipx.pypa.io/stable/how-to/install-pipx/)
sudo apt install pipx
pipx ensurepath
pipx install semgrep

# confirm installation succeeded by printing the currently installed version
semgrep --version

# Run the OWASP / security-audit rule packs against the project
semgrep scan --config "p/owasp-top-ten" --config "p/php" src/

# Run custom rules from this repo
semgrep scan --config .semgrep/rules.yaml src/

# Output as SARIF
semgrep scan --config "p/owasp-top-ten" --config "p/php" --config .semgrep/rules.yaml --sarif --output semgrep.sarif src/
```

**Actual findings on this sample:**

Rules                                  | CWE-918 SSRF | CWE-532 log leak | CWE-396 broad catch
---------------------------------------|--------------|------------------|--------------------
Community (`p/owasp-top-ten`, `p/php`) | No           | No               | No
Custom (`.semgrep/rules.yaml`)         | Yes          | Yes              | No

Community rules find nothing — SSRF detection requires cross-file taint tracking, which is behind the Semgrep paid tier.
Custom rules catch inline concatenation only — assigning the concatenated URL to an intermediate variable defeats detection entirely.
This is a fundamental Semgrep OSS limitation: it matches syntax, not data flow.
Real SSRF detection requires taint-aware analysis across statements, which requires Semgrep Pro.

### Bearer CLI

Bearer is particularly strong at detecting sensitive data flowing into logs and external calls.
It requires a one-time binary download but no account.

```bash
# Install (https://docs.bearer.com/reference/installation/)
curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sudo sh -s -- -b /usr/bin

# Full scan — security + privacy findings
bearer scan src/

# Security findings only, quiet output
bearer scan --scanner=secrets,sast src/ --quiet

# SARIF output
bearer scan src/ --format sarif --output bearer.sarif
```

**Actual findings on this sample:** 0 finding — Bearer ran 70 checks and detected nothing on this sample.

### Psalm with taint analysis

Psalm traces taint sources through the call graph, making it the clearest tool for explaining to developers _why_ the SSRF exists.

```bash
# Add Psalm as a dev dependency (one-time)
composer require --dev vimeo/psalm

# Initialise — or use the psalm.xml already in this repo
vendor/bin/psalm --init src/ 3

# Run taint analysis (this is the important flag)
vendor/bin/psalm --taint-analysis

# Run with output grouped by issue type
vendor/bin/psalm --taint-analysis --show-info=true
```

**Known issue:** Psalm requires PHP >= 8.3.16 but Ubuntu 24.04 ships PHP 8.3.6.
This can be worked around by updating PHP via the ondrej/php PPA.

**Actual findings on this sample:** 0 finding — Psalm taint analysis ran successfully but detected nothing.
Despite being one of the few free tools with genuine inter-procedural taint analysis, it did not trace the SSRF or log-leak paths in this sample.

### SonarQube Community (free, self-hosted)

Start SonarQube locally via Docker:

```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  sonarqube:community
```

Wait ~60 seconds, then once SonarQube is running:

- Open [localhost:9000](http://localhost:9000)
- Log in with admin / admin (it will ask to change the password, e.g. AdminAdmin1%)
- Go to My Account (top right avatar) → Security tab
- Under Generate Tokens, give it a name (e.g. codesec-bench), click Generate
- Copy the token immediately — it's only shown once

Run the scanner from the php-symfony directory:

```bash
docker run --rm \
  --network host \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=<paste-token-from-ui> \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli
```

The `sonar-project.properties` in this directory is pre-configured.

**Actual findings on this sample:** Only flagged a generic `RuntimeException` (code smell, not a security finding). CWE-918 and CWE-532 were not detected.

### GitHub Advanced Security / CodeQL (free for public repos)

No local setup needed — just push to a public GitHub repo.

To add CodeQL:

1. Enable **GitHub Advanced Security** on the repository (free for public repos).
2. Go to **Settings → Code security → Code scanning → Set up → Default**.

> CodeQL does not support PHP.
> Per the [official GitHub documentation](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning#about-codeql), supported languages are C/C++, C#, Go, Java/Kotlin, JavaScript/TypeScript, Python, Ruby, Rust, Swift, and GitHub Actions workflows.

## Tool comparison

Tool                    | Install                | PHP support | CWE-918 | CWE-532 | CWE-396 | Notes
------------------------|------------------------|-------------|---------|---------|---------|--------------------------------------------------------------------
**Semgrep OSS**         | `pipx install semgrep` | Yes         | No      | No      | No      | 0 findings with community rules; custom rules required
**Bearer CLI**          | `apt install bearer`   | Yes         | No      | No      | No      | 0 findings (70 checks run)
**Psalm**               | `composer require`     | PHP-only    | No      | No      | No      | 0 findings — taint analysis ran but detected nothing on this sample
**SonarQube Community** | Docker                 | Yes         | No      | No      | No      | Only flagged generic RuntimeException (code smell)
**SonarCloud**          | SaaS                   | Yes         | ?       | ?       | ?       | Not yet tested
**GitLab Ultimate**     | SaaS                   | Yes         | ?       | ?       | ?       | Not yet tested
**GitHub CodeQL**       | SaaS (GHAS)            | No          | —       | —       | —       | PHP explicitly not supported — see section above
**PHPStan**             | `composer require`     | PHP-only    | No      | No      | No      | Type checker, not a security SAST — will not find these CWEs

## Other leads investigated

### PHPStan

Investigated as a potential SAST tool.
Discarded for security scanning purposes: PHPStan is a type checker, not a security scanner.
It does not perform taint analysis, does not run CWE-based pattern matching, and will not detect SSRF, sensitive data in logs, or injection vulnerabilities.
Useful for code quality but out of scope for this bench.

### GitLab SAST analyzers

Investigated to reproduce what GitLab uses under the hood, rather than using GitLab itself.

- **Free tier (all plans):** GitLab's PHP SAST is the Semgrep-based analyzer with GitLab-managed rules — the same Semgrep OSS engine already tested here. No additional coverage.
- **GitLab Advanced SAST (Ultimate only):** Provides cross-file and cross-function taint analysis.
Built on technology acquired from Oxeye — a proprietary closed-source engine. PHP is not supported; PHP falls back to the Semgrep analyzer.
Cannot be reproduced independently.
- **Former PHP-specific analyzer (`phpcs-security-audit`):** Reached End of Support in GitLab 17.0 and was replaced by the Semgrep-based analyzer.
No longer maintained.

**Conclusion:** nothing in GitLab's free PHP SAST stack goes beyond what Semgrep OSS already provides.
The paid taint analysis engine does not cover PHP.

### MegaLinter (security flavor)

Investigated as a meta-tool that orchestrates multiple scanners in a single Docker run.
The security flavor (`oxsecurity/megalinter-security`) was reviewed.

For PHP it includes phpcs, phpstan, psalm, and phplint — but the security flavor specifically only covers bash (shellcheck), Python (bandit), and repository-level tools: trivy, semgrep, gitleaks, trufflehog, checkov, devskim, osv-scanner.
No PHP application SAST in the security flavor.

The repository-level tools (trivy, gitleaks, trufflehog) are relevant for SCA and secrets scanning — a different category worth exploring in a dedicated sample. Discarded for this PHP SAST sample.

### Commercial tools (not tested)

The following tools were identified as capable of PHP cross-file taint analysis but were not tested as they require paid licenses:

- **Snyk Code** — AI-assisted SAST with PHP support; free tier limited
- **Checkmarx One** — enterprise SAST with broad language coverage
- **Veracode** — long-standing enterprise SAST platform
- **GitLab Advanced SAST** — Ultimate tier only; does not support PHP (falls back to Semgrep)

**Key finding:** there is no free, open source PHP SAST tool that performs cross-file taint analysis.
The capability gap between free tools (0 finding on CWE-918) and commercial tools is real and significant.
This is itself a valuable result for the bench.
