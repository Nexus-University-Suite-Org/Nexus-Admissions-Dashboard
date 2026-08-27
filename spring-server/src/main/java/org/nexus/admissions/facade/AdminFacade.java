package org.nexus.admissions.facade;

import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.nexus.admissions.configuration.JwtUtil;
import org.nexus.admissions.dto.AdminLoginRequest;
import org.nexus.admissions.dto.AdminLoginResponse;
import org.nexus.admissions.dto.ApplicationResponse;
import org.nexus.admissions.dto.DashboardStatsResponse;
import org.nexus.admissions.dto.PaginatedApplicationsResponse;
import org.nexus.admissions.dto.ReviewRequest;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.service.AdminService;
import org.nexus.admissions.service.NapBackendClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminFacade {

    private final AdminService adminService;
    private final NapBackendClient napClient;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AdminFacade(AdminService adminService,
                       NapBackendClient napClient,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.adminService = adminService;
        this.napClient = napClient;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AdminLoginResponse login(AdminLoginRequest request) {
        Admin admin = adminService.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Invalid administrator credentials."));

        if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
            throw new RuntimeException("Invalid administrator credentials.");
        }

        String token = jwtUtil.generateToken(admin.getId(), admin.getEmail());
        return new AdminLoginResponse(token, admin.getEmail(), admin.getFullName());
    }

    @Transactional
    public AdminLoginResponse me(Long adminId) {
        System.out.println("[ADMIN-FACADE] me() looking up adminId=" + adminId);
        Admin admin = adminService.findById(adminId)
                .orElseThrow(() -> {
                    System.out.println("[ADMIN-FACADE] Admin NOT FOUND for id=" + adminId);
                    return new RuntimeException("Admin not found");
                });
        System.out.println("[ADMIN-FACADE] Admin found: email=" + admin.getEmail() + ", fullName=" + admin.getFullName());
        return new AdminLoginResponse(null, admin.getEmail(), admin.getFullName());
    }

    @Transactional
    public DashboardStatsResponse getDashboardStats() {
        List<NapBackendClient.NapApplication> all = napClient.fetchAll();

        long total = all.size();
        long pending = countByStatus(all, "SUBMITTED");
        long admitted = countByStatus(all, "ADMITTED");
        long rejected = countByStatus(all, "REJECTED");
        long waitlisted = countByStatus(all, "WAITLISTED");
        long draft = countByStatus(all, "DRAFT");

        Map<String, Long> monthlyTrend = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i).toLocalDate();
            String key = month.format(DateTimeFormatter.ofPattern("MMM yyyy"));
            long count = all.stream()
                    .filter(a -> {
                        if (a.createdAt() == null || a.createdAt().isBlank()) return false;
                        try {
                            LocalDate created = LocalDate.parse(a.createdAt().substring(0, 10));
                            return created.getMonth() == month.getMonth() && created.getYear() == month.getYear();
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .count();
            monthlyTrend.put(key, count);
        }

        return new DashboardStatsResponse(total, pending, admitted, rejected, waitlisted, draft, monthlyTrend);
    }

    @Transactional
    public PaginatedApplicationsResponse getApplications(String status, String search, int page, int size) {
        List<NapBackendClient.NapApplication> all = napClient.fetchAll();

        List<NapBackendClient.NapApplication> filtered = all.stream()
                .filter(a -> (status == null || "ALL".equalsIgnoreCase(status) || status.equalsIgnoreCase(a.status())))
                .filter(a -> (search == null || search.isBlank()
                        || matchesSearch(a, search)))
                .sorted(Comparator.comparing(
                        (NapBackendClient.NapApplication a) -> a.createdAt() != null ? a.createdAt() : "")
                        .reversed())
                .toList();

        long totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, filtered.size());

        List<ApplicationResponse> content = filtered.subList(fromIndex, toIndex).stream()
                .map(this::toDto)
                .toList();

        return new PaginatedApplicationsResponse(content, page, size, totalElements, totalPages);
    }

    @Transactional
    public List<ApplicationResponse> getRecentApplications(int limit) {
        List<NapBackendClient.NapApplication> all = napClient.fetchAll();

        return all.stream()
                .filter(a -> a.submittedAt() != null)
                .sorted(Comparator.comparing(NapBackendClient.NapApplication::submittedAt).reversed())
                .limit(Math.min(limit, 10))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ApplicationResponse getApplicationById(Long id) {
        NapBackendClient.NapApplication app = napClient.fetchById(id);
        return toDto(app);
    }

    @Transactional
    public ApplicationResponse reviewApplication(Long id, ReviewRequest request) {
        String reviewStatus = request.reviewStatus();
        String notes = request.notes() != null ? request.notes() : null;

        NapBackendClient.NapApplication updated = napClient.reviewApplication(id, reviewStatus, notes);
        return toDto(updated);
    }

    private boolean matchesSearch(NapBackendClient.NapApplication a, String search) {
        String lower = search.toLowerCase();
        return (a.firstName() != null && a.firstName().toLowerCase().contains(lower))
                || (a.lastName() != null && a.lastName().toLowerCase().contains(lower))
                || (a.email() != null && a.email().toLowerCase().contains(lower))
                || (a.prn() != null && a.prn().toLowerCase().contains(lower))
                || (a.programChoice1() != null && a.programChoice1().toLowerCase().contains(lower));
    }

    private long countByStatus(List<NapBackendClient.NapApplication> all, String status) {
        return all.stream().filter(a -> status.equalsIgnoreCase(a.status())).count();
    }

    private ApplicationResponse toDto(NapBackendClient.NapApplication a) {
        return new ApplicationResponse(
                a.id(), a.prn(), a.firstName(), a.lastName(), a.otherNames(),
                a.email(), a.phoneNumber(), a.gender(), a.dateOfBirth(),
                a.maritalStatus(),
                a.nationality(),
                a.address(), a.postalAddress(), a.city(), a.postalCode(), a.country(),
                a.district(), a.subcounty(), a.village(),
                a.hasNationalIdOrPassport(), a.birthCertificateOrNationalIdDetails(),
                a.passportPhotoUploaded(), a.passportPhotoUrl(),
                a.guardianName(), a.guardianType(), a.guardianPhone(), a.nextOfKinRelationship(),
                a.isUgandan(), a.applicationType(), a.entryScheme(),
                a.programChoice1(), a.programChoice2(), a.programChoice3(),
                a.programChoice4(), a.assignedProgramme(), a.totalWeightScore(), a.qualificationResults(),
                a.startDate(), a.previousInstitution(),
                a.highestQualification(), a.academicCredentialLevel(), a.academicCredentialsDetails(),
                a.birthCertificateUrl(),
                a.studyMode(), a.academicYear(), a.semester(),
                a.emailVerified(), a.status(), a.reviewStatus(),
                a.submittedAt(), a.reviewedAt(), a.reviewerNotes(),
                a.uceResult(), a.uaceResult(), a.documents(), a.extras(),
                a.uceIndexNumber(), a.uceYearOfSitting(), a.uceSecondSitting(),
                a.uceSecondIndexNumber(), a.uceSecondYearOfSitting(),
                a.uceTotalAggregates(), a.uceDivision(), a.oLevelSchoolName(),
                a.uaceIndexNumber(), a.uaceYearOfSitting(), a.uaceSecondSitting(),
                a.uaceSecondIndexNumber(), a.uaceSecondYearOfSitting(),
                a.uaceTotalPoints(), a.uacePrincipalSubjects(),
                a.uaceGeneralPaperGrade(), a.uaceIctOrSubMathSubject(), a.uaceIctOrSubMathGrade(),
                a.oLevelResultSlipUrl(), a.aLevelResultSlipUrl(), a.academicTranscriptUrl(),
                a.nationalIdOrPassportUrl(), a.countryIdDocumentUrl(),
                a.refereeLetterUrl(), a.personalStatementAttachmentUrl(),
                a.oLevelSubjects(), a.certificateSubjects(),
                a.gpa(), a.personalStatement(), a.howDidYouHear(),
                a.documentsConfirmed(), a.transcriptUploaded(), a.idUploaded(),
                a.countryIdUploaded(), a.recommendationUploaded(), a.statementUploaded(),
                a.applicationFeePaid(), a.paymentMethod(), a.paymentReference(),
                a.interviewPreference(), a.termsAccepted(),
                a.feePaid(), a.feeRequired(), a.feeCurrency(),
                a.createdAt(), a.updatedAt()
        );
    }
}
