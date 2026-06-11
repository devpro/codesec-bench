<?php

declare(strict_types=1);

namespace App\Configuration;

final class Configuration
{
    public static function getFromEnv(string $name): string
    {
        $value = $_ENV[$name] ?? $_SERVER[$name] ?? getenv($name);
        if (!is_string($value) || $value === '') {
            throw new \RuntimeException(sprintf('Missing required environment variable: %s', $name));
        }

        return $value;
    }
}
