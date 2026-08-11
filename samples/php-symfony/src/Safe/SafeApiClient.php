<?php

declare(strict_types=1);

namespace App\Safe;

use App\Configuration\Configuration;
use App\Exception\ApiException;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Correct counterpart of App\Service\ApiClient.
 *
 * Deliberately identical in shape: same client, same request call, same variable names.
 * The only differences are the guards, so a tool that reports this file is pattern matching on syntax rather than tracking data.
 *
 * Any finding reported inside this file counts as a false positive.
 * See cases/ssrf-crossfile/case.yaml.
 */
class SafeApiClient
{
    /**
     * Allowlist of the endpoints this service is permitted to reach.
     * An attacker controlled value cannot leave this set, which closes CWE-918.
     */
    private const ALLOWED_ENDPOINTS = [
        '/get',
        '/headers',
        '/status/200',
    ];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
        private readonly string $languageCode = 'en',
    ) {
    }

    public function call(string $endpoint): string
    {
        if (!in_array($endpoint, self::ALLOWED_ENDPOINTS, true)) {
            throw new ApiException('Endpoint is not allowed');
        }

        $baseUrl = Configuration::getFromEnv('BASE_URL');
        $apiKey  = Configuration::getFromEnv('SERVICE_API_KEY');

        $options = [
            'headers' => [
                'header-key'      => $apiKey,
                'authorization'   => 'Bearer ' . $this->getToken(),
                'Accept-language' => $this->languageCode,
            ],
            'verify_peer' => true,
            'verify_host' => true,
        ];

        try {
            $response = $this->httpClient->request('GET', $baseUrl . $endpoint, $options);

            if (200 !== $response->getStatusCode()) {
                throw new ApiException(
                    sprintf('API response error (status code: %s)', $response->getStatusCode())
                );
            }

            return $response->getContent();
        } catch (TransportExceptionInterface $e) {
            // Only the exception class is logged, never the message, which can carry the URL, the API key or the bearer token.
            $this->logger->error(sprintf('API transport failure on %s: %s', $endpoint, $e::class));

            throw new ApiException('Upstream API is unreachable');
        }
    }

    private function getToken(): string
    {
        return 'stub-token';
    }
}
