package com.example.reporting.safe;

import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Correct counterpart of CryptoService.
 *
 * Same class shape, same method, same call sequence.
 * The key is injected from configuration and the cipher is authenticated AES.
 *
 * Any finding reported in this file is a false positive.
 */
@Service
public class SafeCryptoService {

    private final String signingKey;

    public SafeCryptoService(@Value("${reporting.signing-key}") String signingKey) {
        this.signingKey = signingKey;
    }

    public byte[] encrypt(byte[] payload) throws Exception {
        SecretKey key = new SecretKeySpec(signingKey.substring(0, 32).getBytes(), "AES");

        byte[] nonce = new byte[12];
        new SecureRandom().nextBytes(nonce);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));

        return cipher.doFinal(payload);
    }
}
