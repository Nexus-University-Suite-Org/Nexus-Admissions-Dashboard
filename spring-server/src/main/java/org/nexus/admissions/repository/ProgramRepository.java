package org.nexus.admissions.repository;

import java.util.List;
import org.nexus.admissions.model.Program;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramRepository extends JpaRepository<Program, Long> {

    List<Program> findByDeletedAtIsNull();
}