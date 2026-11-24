package com.image.website;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.image.website.entity.User;
import com.image.website.repository.UserRepository;
import com.image.website.service.CaptchaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 应用集成测试：验证注册/登录流程，以及上传签名、创建图片等接口的鉴权保护。
 */
@SpringBootTest
@AutoConfigureMockMvc
class ImageWebsiteApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** 模拟验证码服务，让登录流程无需真实图形验证码即可通过。 */
    @MockBean
    private CaptchaService captchaService;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        when(captchaService.validate(anyString(), anyString())).thenReturn(true);
    }

    @Test
    void contextLoads() {
    }

    @Test
    void registerAndLogin() throws Exception {
        // Register
        String registerBody = """
            {"username":"testuser","password":"testpass123","email":"test@example.com"}
            """.stripIndent();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("注册成功"));

        // Login（验证码由 mock 服务放行）
        String loginBody = """
            {"username":"testuser","password":"testpass123","captchaId":"mock-id","captchaCode":"mock"}
            """.stripIndent();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value("testuser"));

        // Wrong password
        String wrongPasswordBody = """
            {"username":"testuser","password":"wrongpass","captchaId":"mock-id","captchaCode":"mock"}
            """.stripIndent();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(wrongPasswordBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void uploadSignatureRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/oss/upload-signature"))
                .andExpect(status().isUnauthorized()); // 自定义认证入口点返回 401
    }

    @Test
    void createImageRequiresAuth() throws Exception {
        String body = """
            {"objectKey":"images/test.jpg","width":100,"height":100,"fileSize":1024,"format":"jpg","title":"Test"}
            """.stripIndent();

        mockMvc.perform(post("/api/images")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }
}