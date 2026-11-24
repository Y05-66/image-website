package com.image.website.repository;

import com.image.website.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 用户数据访问接口。
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /** 按用户名查询用户。 */
    Optional<User> findByUsername(String username);
    /** 判断用户名是否已存在。 */
    boolean existsByUsername(String username);
}