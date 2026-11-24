package com.image.website.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * 用户实体，对应数据库 users 表。
 */
@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    /** 主键，自增。 */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 用户名，唯一，用于登录。 */
    @Column(nullable = false, unique = true, length = 100)
    private String username;

    /** 密码（BCrypt 加密后的密文）。 */
    @Column(nullable = false, length = 255)
    private String password;

    /** 邮箱，用于找回密码等场景。 */
    @Column(length = 100)
    private String email;

    /** 头像地址。 */
    @Column(length = 500)
    private String avatar = "";

    /** 是否启用（禁用账号无法登录）。 */
    @Column(nullable = false)
    private Boolean enabled = true;

    /** 角色：ADMIN 管理员 / USER 普通用户。 */
    private String role = "USER";
}