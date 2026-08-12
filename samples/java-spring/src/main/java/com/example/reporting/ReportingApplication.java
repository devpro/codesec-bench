package com.example.reporting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point.
 *
 * Present so the sample is a real, buildable Spring Boot application rather than a folder of files.
 * Tools that analyse bytecode, and CodeQL when not using build-mode none, need the build to succeed.
 */
@SpringBootApplication
public class ReportingApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReportingApplication.class, args);
    }
}
