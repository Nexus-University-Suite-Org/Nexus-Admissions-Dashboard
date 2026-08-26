package org.nexus.admissions.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.nexus.admissions.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Optional<Application> findByPrn(String prn);

    List<Application> findTopBySubmittedAtIsNotNullOrderBySubmittedAtDesc(Pageable pageable);

    long countByStatus(String status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT a FROM Application a WHERE (:status = 'ALL' OR a.status = :status) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.prn) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.programChoice1) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Application> findFiltered(@Param("status") String status,
                                   @Param("search") String search,
                                   Pageable pageable);
}
