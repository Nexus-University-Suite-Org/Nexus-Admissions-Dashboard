package org.nexus.admissions.mapper;

import org.nexus.admissions.dto.ApplicationResponse;
import org.nexus.admissions.model.Application;

public final class ApplicationMapper {

    private ApplicationMapper() {}

    public static ApplicationResponse toDto(Application entity) {
        throw new UnsupportedOperationException("Use AdminFacade.toDto(NapApplication) instead.");
    }
}
