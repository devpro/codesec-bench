<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\ApiClient;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

class ApiClientTest extends TestCase
{
    private HttpClientInterface&MockObject $httpClient;
    private LoggerInterface&MockObject $logger;
    private ApiClient $client;

    protected function setUp(): void
    {
        $this->httpClient = $this->createMock(HttpClientInterface::class);
        $this->logger     = $this->createMock(LoggerInterface::class);
        $this->client     = new ApiClient($this->httpClient, $this->logger, 'en');

        // Minimal env setup so Configuration::getFromEnv() does not throw
        putenv('BASE_URL=https://api.example.com');
        putenv('SERVICE_API_KEY=test-api-key');
    }

    public function testCallReturnsBodyOn200(): void
    {
        $response = $this->createMock(ResponseInterface::class);
        $response->method('getStatusCode')->willReturn(200);
        $response->method('getContent')->willReturn('{"ok":true}');

        $this->httpClient
            ->expects($this->once())
            ->method('request')
            ->with('GET', 'https://api.example.com/v1/resource', $this->anything())
            ->willReturn($response);

        $result = $this->client->call('/v1/resource');
        $this->assertSame('{"ok":true}', $result);
    }

    public function testCallThrowsApiExceptionOnNon200(): void
    {
        $this->expectException(\App\Exception\ApiException::class);

        $response = $this->createMock(ResponseInterface::class);
        $response->method('getStatusCode')->willReturn(503);
        $response->method('getContent')->willReturn('');

        $this->httpClient->method('request')->willReturn($response);

        $this->client->call('/v1/resource');
    }

    public function testSsrfVectorIsAccepted(): void
    {
        // This test demonstrates the SSRF surface:
        // an attacker-controlled $endpoint can redirect requests to an internal host.
        $response = $this->createMock(ResponseInterface::class);
        $response->method('getStatusCode')->willReturn(200);
        $response->method('getContent')->willReturn('internal data');

        $this->httpClient
            ->expects($this->once())
            ->method('request')
            ->with('GET', 'https://api.example.com@169.254.169.254/latest/meta-data/', $this->anything())
            ->willReturn($response);

        // No error thrown — this is the bug
        $result = $this->client->call('@169.254.169.254/latest/meta-data/');
        $this->assertSame('internal data', $result);
    }
}
