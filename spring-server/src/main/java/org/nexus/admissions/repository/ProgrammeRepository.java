package org.nexus.admissions.repository;

import java.util.List;
import org.nexus.admissions.model.Programme;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgrammeRepository extends JpaRepository<Programme, Long> {

    List<Programme> findAllByOrderByCodeAsc();
}