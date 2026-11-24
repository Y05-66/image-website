package com.image.website.service;

import com.image.website.entity.Tag;
import com.image.website.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 标签服务：按名称查询或创建标签（忽略大小写）。
 */
@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    /** 按名称查询标签，不存在则创建并返回。 */
    public Tag getOrCreate(String name) {
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> tagRepository.save(new Tag(null, name.toLowerCase())));
    }

    /** 返回全部标签。 */
    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    /** 按名称（忽略大小写）查询标签。 */
    public Optional<Tag> findByName(String name) {
        return tagRepository.findByNameIgnoreCase(name);
    }
}