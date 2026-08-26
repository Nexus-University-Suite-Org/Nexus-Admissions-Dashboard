package org.nexus.admissions.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "applications")
@Getter
@Setter
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 50)
    private String prn;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "other_names", length = 100)
    private String otherNames;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(length = 20)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDateTime dateOfBirth;

    @Column(length = 200)
    private String nationality;

    @Column(length = 200)
    private String district;

    @Column(length = 200)
    private String subcounty;

    @Column(length = 200)
    private String village;

    @Column(name = "program_choice_1", length = 200)
    private String programChoice1;

    @Column(name = "program_choice_2", length = 200)
    private String programChoice2;

    @Column(name = "program_choice_3", length = 200)
    private String programChoice3;

    @Column(name = "study_mode", length = 50)
    private String studyMode;

    @Column(name = "academic_year", length = 20)
    private String academicYear;

    @Column(length = 20)
    private String semester;

    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "review_status", length = 50)
    private String reviewStatus;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewer_notes")
    private String reviewerNotes;

    @Column(name = "uce_result", columnDefinition = "text")
    private String uceResult;

    @Column(name = "uace_result", columnDefinition = "text")
    private String uaceResult;

    @Column(columnDefinition = "text")
    private String documents;

    @Column(columnDefinition = "text")
    private String extras;

    @Column(name = "fee_paid", precision = 14, scale = 2)
    private BigDecimal feePaid;

    @Column(name = "fee_required", precision = 14, scale = 2)
    private BigDecimal feeRequired;

    @Column(name = "fee_currency", length = 3)
    private String feeCurrency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
