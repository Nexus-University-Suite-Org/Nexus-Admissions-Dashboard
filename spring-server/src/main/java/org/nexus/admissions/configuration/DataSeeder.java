package org.nexus.admissions.configuration;

import java.time.LocalDateTime;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedEmail;
    private final String seedPassword;
    private final String seedFullName;

    public DataSeeder(AdminRepository adminRepository,
                      PasswordEncoder passwordEncoder,
                      @Value("${nap.seed.admin.email:}") String seedEmail,
                      @Value("${nap.seed.admin.password:}") String seedPassword,
                      @Value("${nap.seed.admin.full-name:System Administrator}") String seedFullName) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedEmail = seedEmail;
        this.seedPassword = seedPassword;
        this.seedFullName = seedFullName;
    }

    @Override
    public void run(String... args) {
        if (seedEmail.isBlank() || seedPassword.isBlank()) {
            log.warn("No bootstrap admin configured (NAP_SEED_ADMIN_EMAIL / NAP_SEED_ADMIN_PASSWORD). "
                    + "Set them on first boot to create the initial administrator account.");
            return;
        }

        if (adminRepository.existsByEmail(seedEmail)) {
            log.info("Bootstrap admin already present: {}", seedEmail);
            return;
        }

        Admin admin = new Admin();
        admin.setEmail(seedEmail);
        admin.setPasswordHash(passwordEncoder.encode(seedPassword));
        admin.setFullName(seedFullName);
        admin.setCreatedAt(LocalDateTime.now());
        adminRepository.save(admin);
        log.info("Created bootstrap admin user: {}", seedEmail);
    }
}
