package org.nexus.admissions.configuration;

import org.nexus.admissions.model.Admin;
import org.nexus.admissions.service.AdminService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "admissions.admin.bootstrap.enabled", havingValue = "true")
public class AdminBootstrap implements ApplicationRunner {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(AdminBootstrap.class);

    private final AdminService adminService;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String fullName;

    public AdminBootstrap(
            AdminService adminService,
            PasswordEncoder passwordEncoder,
            org.springframework.core.env.Environment environment) {
        this.adminService = adminService;
        this.passwordEncoder = passwordEncoder;
        this.email = environment.getProperty("admissions.admin.bootstrap.email", "");
        this.password = environment.getProperty("admissions.admin.bootstrap.password", "");
        this.fullName = environment.getProperty(
                "admissions.admin.bootstrap.full-name", "Admissions Administrator");
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            throw new IllegalStateException(
                    "Admin bootstrap is enabled but admissions.admin.bootstrap.email/password are not set");
        }

        if (adminService.count() > 0) {
            log.info("Admin bootstrap skipped because an administrator account already exists");
            return;
        }

        Admin admin = new Admin();
        admin.setEmail(email.trim());
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setFullName(fullName);
        adminService.create(admin);
        log.info("Bootstrapped the initial Admissions administrator account for {}", email.trim());
    }
}
