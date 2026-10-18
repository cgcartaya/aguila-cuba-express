package com.example.shareapp

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** No service-role key belongs in this app. Session credentials stay in memory. */
class ShareApi {
    private val base = "https://perlamarketplace.com"
    private var authUrl = ""
    private var publicKey = ""
    private var accessToken = ""
    private var refreshToken = ""
    private var expiresAt = 0L

    private suspend fun http(url: String, method: String = "GET", body: JSONObject? = null, headers: Map<String, String> = emptyMap()): JSONObject = withContext(Dispatchers.IO) {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            connection.setRequestProperty("Accept", "application/json")
            headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val result = runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
            if (status !in 200..299) throw IllegalStateException(result.optString("error_description", result.optString("error", "No se pudo conectar ($status).")))
            result
        } finally { connection.disconnect() }
    }
    private fun remember(session: JSONObject) {
        accessToken = session.getString("access_token")
        refreshToken = session.getString("refresh_token")
        expiresAt = System.currentTimeMillis() + session.getLong("expires_in") * 1000 - 60000
    }
    private suspend fun loadConfig() {
        val config = http("$base/api/shareapp/config")
        authUrl = config.getString("authUrl")
        publicKey = config.getString("anonKey")
        require(authUrl.startsWith("https://")) { "Configuración de acceso inválida." }
    }
    suspend fun recover(email: String) {
        require(email.contains("@")) { "Escribe tu correo para recuperar la contraseña." }
        loadConfig()
        http("$authUrl/auth/v1/recover?redirect_to=${encode("https://perlamarketplace.com/gestores/recuperar")}", "POST", JSONObject().put("email", email.trim()), mapOf("apikey" to publicKey))
    }
    suspend fun login(email: String, password: String) {
        loadConfig()
        remember(http("$authUrl/auth/v1/token?grant_type=password", "POST", JSONObject().put("email", email.trim()).put("password", password), mapOf("apikey" to publicKey)))
    }
    suspend fun call(path: String, body: JSONObject? = null, method: String? = null): JSONObject {
        if (System.currentTimeMillis() >= expiresAt) remember(http("$authUrl/auth/v1/token?grant_type=refresh_token", "POST", JSONObject().put("refresh_token", refreshToken), mapOf("apikey" to publicKey)))
        return http("$base/api/shareapp/$path", method ?: (if (body == null) "GET" else "POST"), body, mapOf("Authorization" to "Bearer $accessToken"))
    }
    suspend fun logout() {
        try { if (accessToken.isNotBlank()) http("$authUrl/auth/v1/logout?scope=local", "POST", JSONObject(), mapOf("apikey" to publicKey, "Authorization" to "Bearer $accessToken")) }
        finally { accessToken = ""; refreshToken = ""; expiresAt = 0 }
    }
    companion object { fun encode(value: String): String = URLEncoder.encode(value, "UTF-8") }
}
