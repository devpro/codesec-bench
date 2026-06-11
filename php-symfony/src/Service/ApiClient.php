<?php

declare(strict_types=1);

namespace App\Service;

use App\Configuration\Configuration;
use App\Exception\ApiException;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Intentionally vulnerable HTTP client for SAST demonstration purposes.
 *
 * Known issues (do NOT fix — these are the scan targets):
 *  - SSRF: $endpoint is concatenated into the URL without validation
 *  - Sensitive data leak: exception messages (which may contain tokens/keys) are logged
 *  - Overly broad catch: \Throwable catches Errors, masking programming bugs
 *  - No explicit TLS peer verification option
 *  - Dual-auth pattern: bearer token + raw API key both sent in headers
 */
class ApiClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
        private readonly string $languageCode = 'en',
    ) {
    }

    public function call(string $endpoint): string
    {
        $baseUrl = Configuration::getFromEnv('BASE_URL');
        $apiKey  = Configuration::getFromEnv('SERVICE_API_KEY');

        $options = [
            'headers' => [
                'header-key'      => $apiKey,
                'authorization'   => 'Bearer ' . $this->getToken(),
                'Accept-language' => $this->languageCode,
            ],
        ];

        try {
            $response = $this->httpClient->request('GET', $baseUrl . $endpoint, $options);

            if (200 !== $response->getStatusCode()) {
                throw new \RuntimeException(
                    sprintf('API response error (status code: %s)', $response->getStatusCode())
                );
            }

            return $response->getContent();
        } catch (\Throwable $e) {
            // VULN: $e->getMessage() may contain the API key or bearer token
            $this->logger->error(
                sprintf('API response error on %s: %s', $endpoint, $e->getMessage())
            );

            throw new ApiException(
                sprintf('API response error on %s: %s', $endpoint, $e->getMessage())
            );
        }
    }

    private function getToken(): string
    {
        // Stub — in a real service this would fetch/cache an OAuth token
        return 'stub-token';
    }
}
