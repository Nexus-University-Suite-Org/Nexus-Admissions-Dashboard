package org.nexus.admissions.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.nexus.admissions.configuration.NapBackendProperties;
import org.nexus.admissions.exception.UpstreamServiceException;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class NapBackendClient {

    private final NapBackendProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    public NapBackendClient(NapBackendProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newHttpClient();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NapApplication(
            Long id, String prn,
            String registrationNumber,
            String studentNumber,
            String firstName, String lastName, String otherNames,
            String email, String phoneNumber,
            String gender, String dateOfBirth,
            String maritalStatus,
            String nationality,
            String address, String postalAddress, String city, String postalCode, String country,
            String district, String subcounty, String village,
            String hasNationalIdOrPassport, String birthCertificateOrNationalIdDetails,
            Boolean passportPhotoUploaded, String passportPhotoUrl,
            String guardianName, String guardianType, String guardianPhone, String nextOfKinRelationship,
            String isUgandan, String applicationType, String entryScheme,
            String programChoice1, String programChoice2, String programChoice3,
            String programChoice4,
            String assignedProgramme,
            Double totalWeightScore,
            String qualificationResults,
            String startDate, String previousInstitution,
            String highestQualification, String academicCredentialLevel, String academicCredentialsDetails,
            String birthCertificateUrl,
            String studyMode, String academicYear, String semester,
            Boolean emailVerified,
            String status, String reviewStatus,
            String submittedAt, String reviewedAt, String reviewerNotes,
            String uceResult, String uaceResult,
            String documents, String extras,
            String uceIndexNumber, String uceYearOfSitting, Boolean uceSecondSitting,
            String uceSecondIndexNumber, String uceSecondYearOfSitting,
            String uceTotalAggregates, String uceDivision, String oLevelSchoolName,
            String uaceIndexNumber, String uaceYearOfSitting, Boolean uaceSecondSitting,
            String uaceSecondIndexNumber, String uaceSecondYearOfSitting,
            String uaceTotalPoints, String uacePrincipalSubjects,
            String uaceGeneralPaperGrade, String uaceIctOrSubMathSubject, String uaceIctOrSubMathGrade,
            String oLevelResultSlipUrl, String aLevelResultSlipUrl, String academicTranscriptUrl,
            String nationalIdOrPassportUrl, String countryIdDocumentUrl,
            String refereeLetterUrl, String personalStatementAttachmentUrl,
            String oLevelSubjects, String certificateSubjects,
            String gpa, String personalStatement,
            String howDidYouHear,
            Boolean documentsConfirmed, Boolean transcriptUploaded, Boolean idUploaded,
            Boolean countryIdUploaded, Boolean recommendationUploaded, Boolean statementUploaded,
            Boolean applicationFeePaid, String paymentMethod, String paymentReference,
            String interviewPreference, Boolean termsAccepted,
            BigDecimal feePaid, BigDecimal feeRequired, String feeCurrency,
            String createdAt, String updatedAt
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NapProgram(
            Long id,
            String programName,
            String programCode,
            String programType,
            String awardQualification,
            String programDescription,
            String programObjectives,
            String learningOutcomes,
            String careerOpportunities,
            String status,
            String facultySchool,
            String department,
            String programCoordinator,
            String campus,
            String durationUnit,
            Integer numberOfYears,
            Integer semestersPerYear,
            Integer totalCreditUnits,
            String studyMode,
            String academicCalendar,
            String fees,
            String admissionRequirements,
            String curriculum,
            String intakes,
            String studyOptions,
            String accreditation,
            String shortDescription,
            Double cutoffScore,
            String essentialSubjects,
            String relevantSubjects,
            String desirableSubjects,
            Integer minimumUcePasses,
            Integer capacity,
            String intakeYear
    ) {}

    public List<NapProgram> fetchProgrammes() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/programs"))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), NapProgram[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch programmes from NAP-Backend: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> fetchQualifications(Long applicationId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/programmes/application/" + applicationId + "/qualifications"))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch qualifications: " + e.getMessage(), e);
        }
    }

    public NapApplication overrideProgramme(Long applicationId, String programmeCode) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/programmes/application/" + applicationId + "/assign/" + programmeCode))
                    .header("Accept", "application/json")
                    .PUT(HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return fetchById(applicationId);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to override programme: " + e.getMessage(), e);
        }
    }

    public List<NapApplication> fetchAll() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/applications"))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), NapApplication[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch applications from NAP-Backend: " + e.getMessage(), e);
        }
    }

    public NapApplication fetchById(Long id) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/applications/" + id))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), NapApplication.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch application from NAP-Backend: " + e.getMessage(), e);
        }
    }

    public NapApplication reviewApplication(Long id, String status, String notes) {
        try {
            String url = properties.baseUrl() + "/api/v1/applications/" + id + "/review?status=" + status;
            if (notes != null && !notes.isBlank()) {
                url += "&notes=" + java.net.URLEncoder.encode(notes, java.nio.charset.StandardCharsets.UTF_8);
            }
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .PUT(HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), NapApplication.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to review application on NAP-Backend: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> fetchSiteSettingsAdmin() {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/site-settings"))
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), Map[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch site settings: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> updateSiteSetting(String settingKey, String settingValue) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(Map.of("settingKey", settingKey, "settingValue", settingValue));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/site-settings"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update site setting: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> fetchStudentStoriesAdmin() {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/student-stories"))
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), Map[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch student stories: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> createStudentStory(Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/student-stories"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201 && response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create student story: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> updateStudentStory(Long id, Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/student-stories/" + id))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update student story: " + e.getMessage(), e);
        }
    }

    public void deleteStudentStory(Long id) {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/student-stories/" + id))
                    .header("Authorization", "Bearer " + token)
                    .DELETE()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 && response.statusCode() != 204) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete student story: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> fetchGalleryAdmin() {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/gallery"))
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), Map[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch gallery items: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> createGalleryItem(Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/gallery"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201 && response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create gallery item: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> updateGalleryItem(Long id, Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/gallery/" + id))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update gallery item: " + e.getMessage(), e);
        }
    }

    public void deleteGalleryItem(Long id) {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/gallery/" + id))
                    .header("Authorization", "Bearer " + token)
                    .DELETE()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 && response.statusCode() != 204) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete gallery item: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> fetchPartners() {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/partners"))
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), Map[].class));
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch partners: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> createPartner(Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/partners"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201 && response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create partner: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> updatePartner(Long id, Map<String, Object> body) {
        try {
            String token = currentAdminToken();
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/partners/" + id))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .PUT(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), Map.class);
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update partner: " + e.getMessage(), e);
        }
    }

    public void deletePartner(Long id) {
        try {
            String token = currentAdminToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/admin/partners/" + id))
                    .header("Authorization", "Bearer " + token)
                    .DELETE()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 && response.statusCode() != 204) {
                throw new UpstreamServiceException("NAP-Backend returned " + response.statusCode());
            }
        } catch (UpstreamServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete partner: " + e.getMessage(), e);
        }
    }

    /**
     * Returns the bearer token of the administrator whose request is in flight,
     * so the call is made on their behalf rather than as a separate service
     * account.
     *
     * <p>NAD and NAP-Backend share one JWT secret ({@code JWT_SECRET}), so a
     * token minted by either is accepted by the other. That makes forwarding
     * possible and removes the need for this service to hold its own set of
     * NAP-Backend credentials - a hardcoded local-admin login that silently
     * rotted and broke every proxied admin call.
     *
     * <p>Only ever reached from /api/v1/admin/**, which is already gated on the
     * ADMIN role, so the forwarded token is always an administrator's.
     */
    private String currentAdminToken() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
            throw new UpstreamServiceException(
                    "No request in progress: cannot resolve the caller's bearer token for NAP-Backend");
        }
        String authorization = servletAttrs.getRequest().getHeader("Authorization");
        if (authorization == null || authorization.isBlank()) {
            throw new UpstreamServiceException(
                    "Missing Authorization header: cannot call NAP-Backend on the caller's behalf");
        }
        // Callers prepend "Bearer " themselves, so return the token only.
        String prefix = "Bearer ";
        if (authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
            String token = authorization.substring(prefix.length()).trim();
            if (!token.isEmpty()) {
                return token;
            }
        }
        throw new UpstreamServiceException(
                "Malformed Authorization header: expected 'Bearer <token>'");
    }
}
