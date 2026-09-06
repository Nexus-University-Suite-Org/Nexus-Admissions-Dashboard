package org.nexus.admissions.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AdminUpdateRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email
) {}
