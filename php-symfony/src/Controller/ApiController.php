<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Service\ApiClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Minimal controller that exposes ApiClient::call() over HTTP.
 * Intentionally passes user input directly — see ApiClient for SAST findings.
 */
class ApiController extends AbstractController
{
    public function __construct(
        private readonly ApiClient $apiClient,
    ) {
    }

    #[Route('/api/call', name: 'api_call', methods: ['GET'])]
    public function call(Request $request): JsonResponse
    {
        // VULN: user-supplied ?endpoint= flows unvalidated into ApiClient::call()
        $endpoint = $request->query->getString('endpoint', '/get');

        try {
            $body = $this->apiClient->call($endpoint);

            return $this->json(['status' => 'ok', 'data' => json_decode($body, true)]);
        } catch (ApiException $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }

    #[Route('/', name: 'home', methods: ['GET'])]
    public function home(): JsonResponse
    {
        return $this->json([
            'app'         => 'sast-samples / php-symfony',
            'description' => 'Intentionally vulnerable Symfony app for SAST demonstrations',
            'usage'       => 'GET /api/call?endpoint=/get',
        ]);
    }
}
