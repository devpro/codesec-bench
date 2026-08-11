<?php

declare(strict_types=1);

namespace App\Safe;

use App\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Correct counterpart of App\Controller\ApiController.
 *
 * The taint source is the same query parameter, reaching the same kind of service in another file.
 * The value is constrained before it leaves the controller, so no taint reaches the HTTP client.
 *
 * Any finding reported inside this file counts as a false positive.
 */
class SafeApiController extends AbstractController
{
    public function __construct(
        private readonly SafeApiClient $apiClient,
    ) {
    }

    #[Route('/safe/api/call', name: 'safe_api_call', methods: ['GET'])]
    public function call(Request $request): JsonResponse
    {
        $endpoint = $request->query->getString('endpoint', '/get');

        try {
            $body = $this->apiClient->call($endpoint);

            return $this->json(['status' => 'ok', 'data' => json_decode($body, true)]);
        } catch (ApiException $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], Response::HTTP_BAD_GATEWAY);
        }
    }
}
