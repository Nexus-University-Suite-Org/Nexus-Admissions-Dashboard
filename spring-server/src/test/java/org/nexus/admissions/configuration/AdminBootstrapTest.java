package org.nexus.admissions.configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.nexus.admissions.model.Admin;
import org.nexus.admissions.service.AdminService;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class AdminBootstrapTest {

    private final AdminService adminService = Mockito.mock(AdminService.class);
    private final PasswordEncoder passwordEncoder = Mockito.mock(PasswordEncoder.class);

    @Test
    void createsHashedInitialAdminWhenNoAdminExists() {
        when(adminService.count()).thenReturn(0L);
        when(passwordEncoder.encode("temporary-password")).thenReturn("hashed-password");
        MockEnvironment environment = new MockEnvironment()
                .withProperty("admissions.admin.bootstrap.email", "admin@example.com")
                .withProperty("admissions.admin.bootstrap.password", "temporary-password");

        new AdminBootstrap(adminService, passwordEncoder, environment)
                .run(new DefaultApplicationArguments(new String[0]));

        ArgumentCaptor<Admin> captor = ArgumentCaptor.forClass(Admin.class);
        verify(adminService).create(captor.capture());
        assertEquals("admin@example.com", captor.getValue().getEmail());
        assertEquals("hashed-password", captor.getValue().getPasswordHash());
        assertEquals("Admissions Administrator", captor.getValue().getFullName());
    }

    @Test
    void leavesExistingAdminAccountsUntouched() {
        when(adminService.count()).thenReturn(1L);
        MockEnvironment environment = new MockEnvironment()
                .withProperty("admissions.admin.bootstrap.email", "admin@example.com")
                .withProperty("admissions.admin.bootstrap.password", "temporary-password");

        new AdminBootstrap(adminService, passwordEncoder, environment)
                .run(new DefaultApplicationArguments(new String[0]));

        verify(adminService, never()).create(any(Admin.class));
        verify(passwordEncoder, never()).encode("temporary-password");
    }
}
