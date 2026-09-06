package org.nexus.admissions.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "programs")
@Getter
@Setter
public class Program {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "program_name", nullable = false, length = 300)
    private String programName;

    @Column(name = "program_code", length = 50)
    private String programCode;

    @Column(name = "program_type", length = 50)
    private String programType;

    @Column(name = "award_qualification", length = 200)
    private String awardQualification;

    @Column(name = "program_description", columnDefinition = "text")
    private String programDescription;

    @Column(name = "program_objectives", columnDefinition = "text")
    private String programObjectives;

    @Column(name = "learning_outcomes", columnDefinition = "text")
    private String learningOutcomes;

    @Column(name = "career_opportunities", columnDefinition = "text")
    private String careerOpportunities;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "faculty_school", length = 200)
    private String facultySchool;

    @Column(length = 200)
    private String department;

    @Column(name = "program_coordinator", length = 200)
    private String programCoordinator;

    @Column(length = 200)
    private String campus;

    @Column
    private Integer duration;

    @Column(name = "duration_unit", length = 20)
    private String durationUnit;

    @Column(name = "number_of_years")
    private Integer numberOfYears;

    @Column(name = "number_of_semesters")
    private Integer numberOfSemesters;

    @Column(name = "semesters_per_year")
    private Integer semestersPerYear;

    @Column(name = "total_credit_units")
    private Integer totalCreditUnits;

    @Column(name = "study_mode", length = 50)
    private String studyMode;

    @Column(name = "academic_calendar", length = 50)
    private String academicCalendar;

    @Column(columnDefinition = "text")
    private String fees;

    @Column(name = "admission_requirements", columnDefinition = "text")
    private String admissionRequirements;

    @Column(columnDefinition = "text")
    private String curriculum;

    @Column(columnDefinition = "text")
    private String intakes;

    @Column(name = "study_options", columnDefinition = "text")
    private String studyOptions;

    @Column(columnDefinition = "text")
    private String accreditation;

    @Column(name = "short_description", columnDefinition = "text")
    private String shortDescription;

    @Column(name = "cutoff_score")
    private Double cutoffScore;

    @Column(name = "essential_subjects", columnDefinition = "text")
    private String essentialSubjects;

    @Column(name = "relevant_subjects", columnDefinition = "text")
    private String relevantSubjects;

    @Column(name = "desirable_subjects", columnDefinition = "text")
    private String desirableSubjects;

    @Column(name = "minimum_uce_passes")
    private Integer minimumUcePasses;

    @Column
    private Integer capacity;

    @Column(name = "intake_year", length = 10)
    private String intakeYear;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}