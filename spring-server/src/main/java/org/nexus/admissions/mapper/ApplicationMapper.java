package org.nexus.admissions.mapper;

import org.nexus.admissions.dto.ApplicationResponse;
import org.nexus.admissions.model.Application;

public final class ApplicationMapper {

    private ApplicationMapper() {}

    public static ApplicationResponse toDto(Application entity) {
        return new ApplicationResponse(
                entity.getId(),
                entity.getPrn(),
                entity.getFirstName(),
                entity.getLastName(),
                entity.getOtherNames(),
                entity.getEmail(),
                entity.getPhoneNumber(),
                entity.getGender(),
                entity.getDateOfBirth() != null ? entity.getDateOfBirth().toString() : null,
                entity.getNationality(),
                entity.getDistrict(),
                entity.getSubcounty(),
                entity.getVillage(),
                entity.getProgramChoice1(),
                entity.getProgramChoice2(),
                entity.getProgramChoice3(),
                entity.getStudyMode(),
                entity.getAcademicYear(),
                entity.getSemester(),
                entity.getEmailVerified(),
                entity.getStatus(),
                entity.getReviewStatus(),
                entity.getSubmittedAt() != null ? entity.getSubmittedAt().toString() : null,
                entity.getReviewedAt() != null ? entity.getReviewedAt().toString() : null,
                entity.getReviewerNotes(),
                entity.getUceResult(),
                entity.getUaceResult(),
                entity.getDocuments(),
                entity.getExtras(),
                entity.getFeePaid(),
                entity.getFeeRequired(),
                entity.getFeeCurrency(),
                entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null,
                entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}
