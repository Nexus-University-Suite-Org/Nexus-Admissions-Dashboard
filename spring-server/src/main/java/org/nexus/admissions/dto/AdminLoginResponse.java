package org.nexus.admissions.dto;

public record AdminLoginResponse(
        String token,
        String email,
        String fullName
) {}
