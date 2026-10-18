package com.example.shareapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { ShareApp() } }
    }
}
private fun JSONObject.rows(key: String): List<JSONObject> {
    val array = optJSONArray(key) ?: return emptyList()
    return (0 until array.length()).map { array.getJSONObject(it) }
}
@Composable
private fun ShareApp() {
    val api = remember { ShareApi() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var signedIn by remember { mutableStateOf(false) }
    var accountEmail by remember { mutableStateOf("") }
    var accountName by remember { mutableStateOf("") }
    var passwordPending by remember { mutableStateOf(false) }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var invite by remember { mutableStateOf("") }
    var stores by remember { mutableStateOf(emptyList<JSONObject>()) }
    var storeId by remember { mutableStateOf("") }
    var catalog by remember { mutableStateOf(emptyList<JSONObject>()) }
    var results by remember { mutableStateOf(emptyList<JSONObject>()) }
    var kind by remember { mutableStateOf("product") }
    var query by remember { mutableStateOf("") }
    var page by remember { mutableIntStateOf(0) }
    var more by remember { mutableStateOf(false) }
    var publication by remember { mutableStateOf("") }
    var link by remember { mutableStateOf("") }
    var publicationId by remember { mutableStateOf("") }
    var campaignResults by remember { mutableStateOf(emptyList<JSONObject>()) }

    fun action(work: suspend () -> Unit) {
        if (busy) return
        busy = true; error = ""
        scope.launch { try { work() } catch (e: Exception) { error = e.message ?: "No se pudo completar." } finally { busy = false } }
    }
    suspend fun loadStores() {
        stores = api.call("stores").rows("memberships")
        if (stores.none { it.getString("store_id") == storeId }) storeId = stores.firstOrNull()?.getString("store_id").orEmpty()
    }
    suspend fun loadCatalog() {
        catalog = emptyList()
        val data = if (kind == "campaign") api.call("campaigns?storeId=$storeId&page=$page") else api.call("catalog?storeId=$storeId&kind=$kind&q=${ShareApi.encode(query)}&page=$page")
        catalog = data.rows(if (kind == "campaign") "campaigns" else "items"); more = data.optBoolean("hasMore")
        campaignResults = if (kind == "campaign") api.call("campaign-results?storeId=$storeId").rows("campaigns") else emptyList()
        results = api.call("results?storeId=$storeId").rows("results")
    }
    fun prepare(item: JSONObject?) = action {
        val campaign = item != null && kind == "campaign"
        publication = if (campaign) item!!.optString("body") else if (item == null) "Descubre los productos de nuestra tienda." else "${item.getString("name")}\nPrecio: ${String.format(java.util.Locale.US, "%.2f", item.optDouble("price"))} USD\n${item.optString("description", "")}"
        val body = JSONObject().put("storeId", storeId).put("kind", if (campaign) item!!.getString("kind") else if (item == null) "store" else kind).put("network", "other").put("title", if (campaign) item!!.getString("title") else item?.getString("name") ?: "Mi tienda").put("body", publication)
        if (campaign) body.put("campaignId", item!!.getString("id")) else if (item != null) body.put("itemId", item.getString("id"))
        val saved = api.call("links", body)
        link = saved.getString("url"); publicationId = saved.getString("id")
    }
    LaunchedEffect(storeId) {
        if (storeId.isNotEmpty()) { page = 0; publication = ""; link = ""; publicationId = ""; campaignResults = emptyList(); action { loadCatalog() } }
    }
    Surface(modifier = Modifier.fillMaxSize()) {
        LazyColumn(modifier = Modifier.fillMaxSize().safeDrawingPadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item { Text("ShareAPP", style = MaterialTheme.typography.headlineLarge); Text("Perla Marketplace · Gestores") }
            if (error.isNotBlank()) item { Text(error, color = MaterialTheme.colorScheme.error) }
            if (notice.isNotBlank()) item { Text(notice) }
            if (busy) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            if (!signedIn) {
                item { Text("Entra con tu cuenta de Perla Marketplace.") }
                item { OutlinedTextField(email, { email = it }, label = { Text("Correo") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedTextField(password, { password = it }, label = { Text("Contraseña") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth()) }
                item { Button(enabled = !busy && email.isNotBlank() && password.isNotEmpty(), onClick = { action { api.login(email, password); password = ""; val me = api.call("me"); accountEmail = me.optString("email"); accountName = me.optString("fullName"); passwordPending = me.optBoolean("passwordPending"); signedIn = true; if (!passwordPending) loadStores() } }, modifier = Modifier.fillMaxWidth()) { Text("Entrar") } }
                item { TextButton(enabled = !busy, onClick = { action { api.recover(email); notice = "Si el correo tiene una cuenta, recibirás un enlace para definir una contraseña nueva." } }) { Text("Olvidé mi contraseña") } }
            } else {
                item { Text("${accountName.ifBlank { "Gestor" }}\nCuenta conectada: $accountEmail") }
                item { OutlinedButton(enabled = !busy, onClick = { action { try { api.logout() } finally { signedIn = false; stores = emptyList(); storeId = ""; catalog = emptyList(); results = emptyList(); publication = ""; link = ""; publicationId = ""; campaignResults = emptyList() } } }) { Text("Cerrar sesión") } }
                if (passwordPending) {
                    item { Text("Define tu contraseña personal", style = MaterialTheme.typography.titleLarge); Text("Usa mínimo 12 caracteres, letras y números. Debe ser diferente a la temporal.") }
                    item { OutlinedTextField(newPassword, { newPassword = it }, label = { Text("Nueva contraseña") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()) }
                    item { OutlinedTextField(confirmPassword, { confirmPassword = it }, label = { Text("Repite la contraseña") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth()) }
                    item { Button(enabled = !busy, onClick = { action { require(newPassword == confirmPassword) { "Las contraseñas no coinciden." }; api.call("password", JSONObject().put("password", newPassword)); newPassword = ""; confirmPassword = ""; passwordPending = false; loadStores(); notice = "Contraseña personal guardada." } }) { Text("Guardar y continuar") } }
                } else {
                item { Text("Invitación del dueño", style = MaterialTheme.typography.titleMedium); OutlinedTextField(invite, { invite = it }, label = { Text("Pega el enlace de invitación") }, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedButton(enabled = !busy && invite.isNotBlank(), onClick = { action { val code = if (invite.contains("invite=")) android.net.Uri.parse(invite.trim()).getQueryParameter("invite").orEmpty() else invite.trim(); api.call("join", JSONObject().put("code", code)); invite = ""; loadStores() } }) { Text("Aceptar invitación") } }
                if (stores.isEmpty()) item { Text("No tienes tiendas habilitadas. Pide al dueño una invitación y que active ShareAPP."); OutlinedButton(enabled = !busy, onClick = { action { loadStores() } }) { Text("Actualizar tiendas") } }
                items(stores, key = { it.getString("id") }) { membership ->
                    val id = membership.getString("store_id")
                    OutlinedButton(enabled = !busy, onClick = { if (id == storeId) action { loadCatalog() } else storeId = id }, modifier = Modifier.fillMaxWidth()) { Text((if (id == storeId) "✓ " else "") + membership.getJSONObject("stores").getString("name")) }
                }
                if (storeId.isNotEmpty()) {
                    items(results) { stats -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Tus resultados · últimos 30 días", style = MaterialTheme.typography.titleMedium); Text("Visitas: ${stats.optLong("visits")} · Productos vistos: ${stats.optLong("product_views")}"); Text("Pedidos: ${stats.optLong("orders")} · Pagados: ${stats.optLong("paid_orders")}"); Text("Ventas pagadas: ${String.format(java.util.Locale.US, "%.2f", stats.optDouble("paid_total"))} USD") } } }
                    item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("product" to "Productos", "combo" to "Combos", "campaign" to "Campañas").forEach { (value, label) -> FilterChip(selected = kind == value, enabled = !busy, onClick = { kind = value; page = 0; action { loadCatalog() } }, label = { Text(label) }) } } }
                    item { OutlinedTextField(query, { query = it }, label = { Text("Buscar productos") }, modifier = Modifier.fillMaxWidth()); Button(enabled = !busy, onClick = { page = 0; action { loadCatalog() } }) { Text("Buscar") } }
                    item { OutlinedButton(enabled = !busy, onClick = { prepare(null) }) { Text("Compartir tienda completa") } }
                    if (link.isNotEmpty()) item { Card { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("Tu publicación", style = MaterialTheme.typography.titleMedium); OutlinedTextField(publication, { publication = it }, modifier = Modifier.fillMaxWidth()); Text(link); Text("Conserva el enlace para atribuir visitas y pedidos. El precio se confirma en la tienda."); Button(enabled = !busy, onClick = { action { api.call("links", JSONObject().put("storeId", storeId).put("id", publicationId).put("body", publication), "PATCH"); val intent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "$publication\n$link") }; context.startActivity(Intent.createChooser(intent, "Compartir publicación")) } }) { Text("Compartir en redes…") } } } }
                    items(campaignResults) { stats -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(stats.optString("title"), style = MaterialTheme.typography.titleMedium); Text("Tus visitas del enlace: ${stats.optLong("visits")} · Pedidos pagados: ${stats.optLong("paid_orders")}"); Text("Tus ventas: ${String.format(java.util.Locale.US, "%.2f", stats.optDouble("paid_total"))} USD · Últimos 30 días") } } }
                    items(catalog, key = { it.getString("id") }) { item ->
                        if (kind == "campaign") {
                            Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { ProductPicture(JSONObject().put("name", item.getString("title")).put("image_url", item.getString("image_url"))); Text(item.getString("title"), style = MaterialTheme.typography.titleMedium); Text(item.optString("body")); Button(enabled = !busy, onClick = { prepare(item) }) { Text("Crear mi publicación") } } }
                        } else {
                        val comboRows = item.rows("combo_items")
                        val available = if (kind == "product") item.optInt("stock") > 0 else comboRows.isNotEmpty() && comboRows.all { row -> val product = row.optJSONObject("products"); val quantity = row.optInt("quantity"); product != null && product.optBoolean("is_active") && product.isNull("deleted_at") && product.optString("store_id") == storeId && quantity > 0 && product.optInt("stock") >= quantity }
                        Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { ProductPicture(item); Text(item.getString("name"), style = MaterialTheme.typography.titleMedium); Text("${String.format(java.util.Locale.US, "%.2f", item.optDouble("price"))} USD · ${if (available) "Disponible" else "Agotado"}"); Button(enabled = !busy && available, onClick = { prepare(item) }) { Text("Preparar publicación") } } }
                    }
                    }
                    item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(enabled = !busy && page > 0, onClick = { page--; action { loadCatalog() } }) { Text("Anterior") }; Text("${page + 1}", Modifier.padding(top = 12.dp)); OutlinedButton(enabled = !busy && more, onClick = { page++; action { loadCatalog() } }) { Text("Siguiente") } } }
                }
                }
            }
        }
    }
}

@Composable
private fun ProductPicture(item: JSONObject) {
    val images = item.rows("product_images")
    val primary = item.optString("image_url").takeIf { it.isNotBlank() && it != "null" }
        ?: (images.firstOrNull { it.optBoolean("is_main") } ?: images.firstOrNull())?.optString("image_url")
    val bitmap by produceState<Bitmap?>(initialValue = null, primary) {
        value = withContext(Dispatchers.IO) {
            if (primary == null || !primary.startsWith("https://")) return@withContext null
            runCatching {
                val connection = URL(primary).openConnection() as HttpURLConnection
                try { connection.connectTimeout = 10000; connection.readTimeout = 10000; connection.inputStream.use { BitmapFactory.decodeStream(it) } }
                finally { connection.disconnect() }
            }.getOrNull()
        }
    }
    bitmap?.let { Image(bitmap = it.asImageBitmap(), contentDescription = item.optString("name"), modifier = Modifier.fillMaxWidth().height(140.dp), contentScale = ContentScale.Fit) }
}
