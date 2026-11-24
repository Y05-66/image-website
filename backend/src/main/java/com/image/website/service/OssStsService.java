package com.image.website.service;

import com.image.website.config.EnvLoader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * OSS 临时上传凭证服务：通过 RAM 角色 AssumeRole 获取 STS 临时凭证（或直接使用 AK/SK），
 * 生成浏览器直传 OSS 所需的 POST Policy 与签名。
 */
@Slf4j
@Service
public class OssStsService {

    @Value("${oss.bucket}")
    private String bucket;

    @Value("${oss.region}")
    private String region;

    @Value("${oss.host}")
    private String host;

    @Value("${oss.upload-dir}")
    private String uploadDir;

    private static final long EXPIRE_SECONDS = 900L;
    private static final String STS_ENDPOINT = "sts.%s.aliyuncs.com";
    private static final Pattern CRED_PATTERN = Pattern.compile(
            "<AccessKeyId>([^<]+)</AccessKeyId>" +
            "<AccessKeySecret>([^<]+)</AccessKeySecret>" +
            "<SecurityToken>([^<]+)</SecurityToken>" +
            "<Expiration>([^<]+)</Expiration>");
    // 有效 RAM 角色 ARN 形如 acs:ram::<账号ID>:role/<角色名>
    private static final Pattern ROLE_ARN_PATTERN = Pattern.compile("^acs:ram::\\d+:role/.+$");

    /** 生成 OSS 直传所需的 Policy、签名及凭证参数。 */
    public Map<String, String> generatePostSignature() throws Exception {
        StsCredential cred = getStsCredential();

        String accessKeyId = cred.accessKeyId;
        String accessKeySecret = cred.accessKeySecret;
        String securityToken = cred.securityToken;

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String date = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String xOssDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String expiration = now.plusSeconds(EXPIRE_SECONDS)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

        String xOssCredential = accessKeyId + "/" + date + "/" + region + "/oss/aliyun_v4_request";

        List<Object> conditions = new ArrayList<>();
        conditions.add(Map.of("bucket", bucket));
        conditions.add(Map.of("x-oss-signature-version", "OSS4-HMAC-SHA256"));
        conditions.add(Map.of("x-oss-credential", xOssCredential));
        if (securityToken != null) {
            conditions.add(Map.of("x-oss-security-token", securityToken));
        }
        conditions.add(Map.of("x-oss-date", xOssDate));
        conditions.add(List.of("content-length-range", 1, 10 * 1024 * 1024));
        conditions.add(List.of("eq", "$success_action_status", "200"));
        conditions.add(List.of("starts-with", "$key", uploadDir));

        Map<String, Object> policyMap = new LinkedHashMap<>();
        policyMap.put("expiration", expiration);
        policyMap.put("conditions", conditions);

        String policyJson = new com.fasterxml.jackson.databind.ObjectMapper()
                .writeValueAsString(policyMap);
        String policyBase64 = Base64.getEncoder().encodeToString(policyJson.getBytes(StandardCharsets.UTF_8));

        byte[] signingKey = buildSigningKey(accessKeySecret, date, region);
        byte[] signatureBytes = hmacSha256(signingKey, policyBase64);
        String signature = bytesToHex(signatureBytes);

        Map<String, String> result = new LinkedHashMap<>();
        result.put("host", host);
        result.put("policy", policyBase64);
        result.put("x_oss_credential", xOssCredential);
        result.put("x_oss_date", xOssDate);
        result.put("x_oss_signature_version", "OSS4-HMAC-SHA256");
        result.put("signature", signature);
        if (securityToken != null) {
            result.put("security_token", securityToken);
        }
        result.put("dir", uploadDir);
        result.put("access_key_id", accessKeyId);
        return result;
    }

    /** 获取上传凭证：优先通过 RAM 角色换取 STS 临时凭证，否则回退为 AK/SK 直传。 */
    private StsCredential getStsCredential() throws Exception {
        String akId = EnvLoader.get("OSS_ACCESS_KEY_ID");
        String akSecret = EnvLoader.get("OSS_ACCESS_KEY_SECRET");
        String roleArn = EnvLoader.get("OSS_STS_ROLE_ARN");

        if (akId == null || akSecret == null) {
            throw new RuntimeException("OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET 未配置，无法生成上传凭证");
        }

        if (roleArn != null && ROLE_ARN_PATTERN.matcher(roleArn.trim()).matches()) {
            return assumeRole(akId, akSecret, roleArn.trim());
        }

        log.info("未配置有效的RAM角色ARN，改用RAM用户AK/SK直传签名（不携带security_token）");
        StsCredential cred = new StsCredential();
        cred.accessKeyId = akId;
        cred.accessKeySecret = akSecret;
        cred.securityToken = null;
        return cred;
    }

    /** 调用 STS AssumeRole 接口换取临时访问凭证。 */
    private StsCredential assumeRole(String akId, String akSecret, String roleArn) throws Exception {
        String endpoint = String.format(STS_ENDPOINT, region);
        Map<String, String> params = buildStsParams(akId, roleArn);
        String signedUrl = signStsRequest(endpoint, params, akSecret);

        String xmlResponse = doHttpGet(signedUrl);
        Matcher m = CRED_PATTERN.matcher(xmlResponse);
        if (!m.find()) {
            throw new RuntimeException("解析STS响应失败: " + xmlResponse);
        }

        StsCredential cred = new StsCredential();
        cred.accessKeyId = m.group(1);
        cred.accessKeySecret = m.group(2);
        cred.securityToken = m.group(3);
        cred.expiration = m.group(4);
        return cred;
    }

    /** 构造 STS AssumeRole 请求参数。 */
    private Map<String, String> buildStsParams(String akId, String roleArn) {
        Map<String, String> params = new TreeMap<>();
        params.put("Action", "AssumeRole");
        params.put("Version", "2015-04-01");
        params.put("AccessKeyId", akId);
        params.put("RoleArn", roleArn);
        params.put("RoleSessionName", "image-upload-" + UUID.randomUUID());
        params.put("DurationSeconds", String.valueOf(EXPIRE_SECONDS));
        params.put("Format", "XML");
        params.put("SignatureMethod", "HMAC-SHA1");
        params.put("SignatureVersion", "1.0");
        params.put("SignatureNonce", UUID.randomUUID().toString());
        params.put("Timestamp", ZonedDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")));
        return params;
    }

    /** 对 STS 请求做 RPC 签名 v1.0，返回带签名的完整 URL。 */
    private String signStsRequest(String endpoint, Map<String, String> params, String akSecret) {
        List<String> sortedKeys = new ArrayList<>(params.keySet());
        Collections.sort(sortedKeys);

        StringBuilder canonical = new StringBuilder();
        boolean first = true;
        for (String key : sortedKeys) {
            if (!first) canonical.append('&');
            canonical.append(percentEncode(key)).append('=').append(percentEncode(params.get(key)));
            first = false;
        }

        // RPC 签名 v1.0：StringToSign = HTTPMethod + "&" + percentEncode("/") + "&" + percentEncode(canonicalizedQueryString)
        String stringToSign = "GET&%2F&" + percentEncode(canonical.toString());
        String signature = hmacSha1Base64(akSecret + "&", stringToSign);
        return "https://" + endpoint + "/?" + canonical + "&Signature=" + percentEncode(signature);
    }

    /** 发起 HTTP GET 请求并返回响应体文本。 */
    private String doHttpGet(String url) throws Exception {
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .GET()
                .build();
        java.net.http.HttpResponse<String> response = client.send(request,
                java.net.http.HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    /** 依据 OSS V4 签名规则逐级派生签名密钥。 */
    private byte[] buildSigningKey(String secret, String date, String region) {
        byte[] dateKey = hmacSha256(("aliyun_v4" + secret).getBytes(StandardCharsets.UTF_8), date);
        byte[] dateRegionKey = hmacSha256(dateKey, region);
        byte[] dateRegionServiceKey = hmacSha256(dateRegionKey, "oss");
        return hmacSha256(dateRegionServiceKey, "aliyun_v4_request");
    }

    /** 计算 HMAC-SHA256。 */
    private byte[] hmacSha256(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256签名失败", e);
        }
    }

    /** 计算 HMAC-SHA1 并 Base64 编码。 */
    private String hmacSha1Base64(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(raw);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA1签名失败", e);
        }
    }

    /** 对字符串做 URL 百分号编码（遵循阿里云签名规范）。 */
    private String percentEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.toString())
                    .replace("+", "%20")
                    .replace("*", "%2A")
                    .replace("%7E", "~");
        } catch (Exception e) {
            return value;
        }
    }

    /** 将字节数组转为十六进制字符串。 */
    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /** STS 临时凭证数据载体。 */
    private static class StsCredential {
        String accessKeyId;
        String accessKeySecret;
        String securityToken;
        String expiration;
    }
}