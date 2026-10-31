package org.nexus.admissions.configuration;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.nexus.admissions.controller.AdminController;
import org.nexus.admissions.facade.AdminFacade;
import org.nexus.admissions.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, JwtAuthFilter.class, AdminAuthorizationTest.ProtectedProbeController.class})
class AdminAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private AdminService adminService;

    @MockitoBean
    private AdminFacade adminFacade;

    @MockitoBean
    private NexusIdentityTokenVerifier identityTokenVerifier;

    @Test
    void adminEndpointsRejectAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/v1/admin/probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpointsRejectNonAdminRoles() throws Exception {
        mockMvc.perform(get("/api/v1/admin/probe").with(user("student").roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminRoleCanReachProtectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/probe").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void identityExchangeRemainsPublicToLocalSecurity() throws Exception {
        mockMvc.perform(post("/api/v1/admin/auth/sso")
                        .header("Authorization", "Bearer identity-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @RestController
    static class ProtectedProbeController {

        @GetMapping("/api/v1/admin/probe")
        String probe() {
            return "ok";
        }
    }
}
