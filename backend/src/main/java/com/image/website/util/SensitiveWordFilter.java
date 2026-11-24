package com.image.website.util;

import java.util.Set;

/**
 * 敏感词过滤工具：对用户公开输入的文本做违禁词检测（命中即拦截）。
 * 词表覆盖辱骂、色情低俗、暴力违法等类别，并收录常见谐音与拼音缩写变体；可按需增删。
 */
public final class SensitiveWordFilter {

    /**
     * 子串匹配词表：中文词与英文长词，直接按包含关系检测。
     * 统一小写存储，检测时文本已转小写，不区分大小写。
     */
    private static final Set<String> CONTAINS_WORDS = Set.of(
            // 辱骂 / 人身攻击（含谐音）
            "傻逼", "煞笔", "傻b", "傻x", "傻叉", "沙雕", "沙比",
            "草泥马", "草你妈", "艹你妈", "操你妈", "操你",
            "尼玛", "尼玛币", "麻痹", "妈蛋", "马勒戈壁", "你妹",
            "贱人", "婊子", "绿茶婊", "心机婊",
            "白痴", "脑残", "智障", "弱智", "废物", "辣鸡", "腊鸡",
            "狗屎", "狗逼", "狗东西", "滚蛋", "滚粗", "去死",
            "混蛋", "混账", "二逼",
            "fuck", "shit", "bitch", "asshole",
            // 色情 / 低俗（含谐音）
            "色情", "淫秽", "裸照", "裸体", "全裸", "露点",
            "性爱", "做爱", "啪啪啪", "约炮", "约p", "打炮", "炮友",
            "叫床", "呻吟", "强奸", "强暴", "迷奸", "卖淫", "嫖娼",
            "性交", "口交", "肛交", "自慰", "手淫", "射精", "精液",
            "淫荡", "骚货", "骚逼", "福利姬",
            "口爆", "口暴", "插逼", "狂插", "射一脸", "porn",
            // 暴力 / 违法 / 自残
            "杀人", "砍人", "炸弹", "恐怖袭击", "分尸", "血腥",
            "赌博", "毒品", "吸毒", "贩毒", "枪支", "诈骗",
            "自杀", "割腕"
    );

    /**
     * 词边界匹配词表：短拼音/字母缩写（如 sb、cnm），
     * 要求前后不是英文字母，避免把 usb、analysis 等正常词误伤。
     */
    private static final Set<String> BOUNDARY_WORDS = Set.of(
            "sb", "cnm", "tmd", "nmb", "woc", "mlgb", "nmsl", "jb", "zz"
    );

    private SensitiveWordFilter() {
    }

    /**
     * 检测文本是否包含敏感词，返回命中的第一个词；未命中返回 null。
     * 检测前会去掉空格与符号（仅保留字母、数字、中文），防止用分隔符夹字绕过。
     */
    public static String find(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String normalized = text.toLowerCase().replaceAll("[^a-z0-9\u4e00-\u9fa5]", "");
        for (String word : CONTAINS_WORDS) {
            if (normalized.contains(word)) {
                return word;
            }
        }
        for (String word : BOUNDARY_WORDS) {
            if (matchesBoundary(normalized, word)) {
                return word;
            }
        }
        return null;
    }

    /** 判断短缩写是否以独立成词的方式出现（前后不紧邻英文字母）。 */
    private static boolean matchesBoundary(String text, String word) {
        int idx = text.indexOf(word);
        while (idx >= 0) {
            boolean beforeOk = idx == 0 || !isEnglishLetter(text.charAt(idx - 1));
            boolean afterOk = idx + word.length() == text.length()
                    || !isEnglishLetter(text.charAt(idx + word.length()));
            if (beforeOk && afterOk) {
                return true;
            }
            idx = text.indexOf(word, idx + 1);
        }
        return false;
    }

    private static boolean isEnglishLetter(char c) {
        return (c >= 'a' && c <= 'z');
    }
}