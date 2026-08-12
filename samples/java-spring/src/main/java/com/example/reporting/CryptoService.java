package com.example.reporting;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/**
 * Credential and payload protection for the reporting service.
 *
 * Intentionally vulnerable, see cases/weak-crypto-and-secret.
 */
@Service
public class CryptoService {

    // VULN: the key is a source literal, so every clone carries it and rotation means a redeployment.
    private static final String SIGNING_KEY = "reporting-signing-key-2024";

    /**
     * Encrypt a report payload.
     *
     * DES has a 56 bit effective key and is exhaustively searchable on commodity hardware.
     * ECB mode additionally leaks structure, since identical plaintext blocks produce identical ciphertext blocks.
     */
    public byte[] encrypt(byte[] payload) throws Exception {
        SecretKey key = new SecretKeySpec(SIGNING_KEY.substring(0, 8).getBytes(), "DES");

        // VULN: a broken cipher in a mode that leaks plaintext structure.
        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, key);

        return cipher.doFinal(payload);
    }
}
