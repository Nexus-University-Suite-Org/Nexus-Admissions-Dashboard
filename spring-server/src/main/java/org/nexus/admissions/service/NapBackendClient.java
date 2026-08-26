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
import org.nexus.admissions.configuration.NapBackendProperties;
import org.springframework.stereotype.Service;

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
            String firstName, String lastName, String otherNames,
            String email, String phoneNumber,
            String gender, String dateOfBirth,
            String nationality, String district, String subcounty, String village,
            String programChoice1, String programChoice2, String programChoice3,
            String studyMode, String academicYear, String semester,
            Boolean emailVerified,
            String status, String reviewStatus,
            String submittedAt, String reviewedAt, String reviewerNotes,
            String uceResult, String uaceResult,
            String documents, String extras,
            BigDecimal feePaid, BigDecimal feeRequired, String feeCurrency,
            String createdAt, String updatedAt
    ) {}

    public List<NapApplication> fetchAll() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(properties.baseUrl() + "/api/v1/applications"))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("NAP-Backend returned " + response.statusCode());
            }
            return List.of(objectMapper.readValue(response.body(), NapApplication[].class));
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
                throw new RuntimeException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), NapApplication.class);
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
                throw new RuntimeException("NAP-Backend returned " + response.statusCode());
            }
            return objectMapper.readValue(response.body(), NapApplication.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to review application on NAP-Backend: " + e.getMessage(), e);
        }
    }
}
