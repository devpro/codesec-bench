# php-symfony

A minimal Symfony 7.4 application wrapping an outbound HTTP client, carrying three planted cases.

The service reads credentials from environment variables and forwards GET requests to an external API.
A controller exposes it, passing a query parameter straight through, which extends the attack surface to the network layer.

## Cases

Case                                                    | Difficulty | CWE
--------------------------------------------------------|------------|------------------
[ssrf-crossfile](cases/ssrf-crossfile/)                 | 4          | CWE-918
[sensitive-data-in-logs](cases/sensitive-data-in-logs/) | 2          | CWE-532, CWE-209
[broad-exception-catch](cases/broad-exception-catch/)   | 1          | CWE-396

Measured detection results are in [docs/matrix.md](../../docs/matrix.md), generated from the SARIF files under `results/php-symfony/`.
Tool specific limitations found while measuring this sample are in [docs/tool-notes.md](../../docs/tool-notes.md).

Note that CWE-297, listed here previously as a missing TLS peer verification finding, has been dropped.
Symfony's HTTP client verifies peers by default, so there was no defect to detect and no tool should have been marked down for missing it.

## Layout

```text
src/
  Controller/ApiController.php    # taint source, vulnerable
  Service/ApiClient.php           # taint sink, vulnerable
  Safe/SafeApiController.php      # safe counterpart
  Safe/SafeApiClient.php          # safe counterpart
.semgrep/rules.yaml               # custom rules, measured as semgrep-custom
cases/                            # case manifests and their documentation
```

`src/Safe/` is the correct counterpart of `src/Controller/` and `src/Service/`.
Anything reported inside it is a false positive.

## Scanning

From the repository root:

```bash
task scan:sample SAMPLE=php-symfony
task score
```

Individual tools:

```bash
task scan:one SAMPLE=php-symfony TOOL=semgrep-custom
```

## Prerequisites for running the app

Scanning needs only the scanners themselves, installed locally per [docs/tool-notes.md](../../docs/tool-notes.md).
Running the application needs PHP 8.3 and Composer.

```bash
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install -y php8.3-cli php8.3-common php8.3-curl php8.3-mbstring php8.3-xml php8.3-zip php8.3-bcmath php8.3-intl php8.3-opcache
```

Composer 2.x, verified against the published installer signature:

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
HASH=$(curl -sS https://composer.github.io/installer.sig)
php -r "if (hash_file('sha384', 'composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
php -r "unlink('composer-setup.php');"
```

Optionally the Symfony CLI, which loads `.env` and handles routing without extra setup:

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | sudo -E bash
sudo apt install symfony-cli
```

## Running the app

```bash
composer install
cp .env.dist .env
rm -rf var/log/ var/cache/
php bin/console cache:clear
symfony server:start
```

Without the Symfony CLI, the built-in server does not load `.env`, so the variables have to be exported first:

```bash
export APP_ENV=dev APP_SECRET=changeme BASE_URL=https://httpbin.org SERVICE_API_KEY=demo-api-key
php -S localhost:8000 public/index.php
```

## Endpoints

```bash
curl http://localhost:8000/                                  # description
curl "http://localhost:8000/api/call?endpoint=/get"          # vulnerable path
curl "http://localhost:8000/safe/api/call?endpoint=/get"     # safe counterpart
curl "http://localhost:8000/safe/api/call?endpoint=/evil"    # rejected by the allowlist
```

The httpbin response echoes the request headers back, showing the bearer token and the API key in plain text.
Those are the values that reach the log file when the request fails, which is what `sensitive-data-in-logs` is about.

## Tests

```bash
vendor/bin/phpunit
```
