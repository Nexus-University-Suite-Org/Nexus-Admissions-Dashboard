package org.nexus.admissions.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "programmes")
@Getter
@Setter
public class Programme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 200)
    private String faculty;

    @Column(name = "minimum_uce_passes")
    private Integer minimumUcePasses;

    @Column(name = "cutoff_score")
    private Double cutoffScore;

    @Column(name = "essential_subjects", columnDefinition = "text")
    private String essentialSubjects;

    @Column(name = "relevant_subjects", columnDefinition = "text")
    private String relevantSubjects;

    @Column(name = "desirable_subjects", columnDefinition = "text")
    private String desirableSubjects;

    @Column(name = "entry_requirements", columnDefinition = "text")
    private String entryRequirements;

    @Column(name = "intake_year", length = 10)
    private String intakeYear;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column
    private Integer capacity;
}