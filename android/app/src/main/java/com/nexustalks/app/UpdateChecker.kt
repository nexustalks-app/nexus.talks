package com.nexustalks.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Nexus.talks In-App Version & Update Checking Foundation
 *
 * Safety & Security Design:
 * 1. Disabled by default: No fake update endpoints or download URLs are called.
 * 2. User-Approved Updates: Never installs APKs silently. Always delegates to the
 *    official Android Package Installer via user-approved Intent.ACTION_VIEW.
 * 3. Harmless Failure: All network or parsing exceptions are swallowed cleanly,
 *    never disrupting chat operations.
 */
object UpdateChecker {

    private const val TAG = "NexusUpdateChecker"

    // Kept disabled until a production/staging version manifest endpoint is officially provisioned
    var isEnabled: Boolean = false

    data class UpdateInfo(
        val versionCode: Int,
        val versionName: String,
        val apkUrl: String,
        val releaseNotes: String,
        val isMandatory: Boolean
    )

    fun checkForUpdates(activity: Activity, serverBaseUrl: String?) {
        if (!isEnabled || serverBaseUrl.isNullOrBlank()) {
            Log.d(TAG, "Update check skipped: updates disabled or server URL is not configured.")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Version manifest endpoint convention: /api/version
                val manifestUrl = if (serverBaseUrl.endsWith("/")) {
                    "${serverBaseUrl}api/version"
                } else {
                    "${serverBaseUrl}/api/version"
                }

                val updateInfo = fetchUpdateInfo(manifestUrl) ?: return@launch

                val currentVersionCode = try {
                    val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        pInfo.longVersionCode.toInt()
                    } else {
                        @Suppress("DEPRECATION")
                        pInfo.versionCode
                    }
                } catch (e: Exception) {
                    1
                }

                if (updateInfo.versionCode > currentVersionCode) {
                    withContext(Dispatchers.Main) {
                        showUpdateDialog(activity, updateInfo)
                    }
                }
            } catch (e: Exception) {
                Log.d(TAG, "Update check harmless error: ${e.message}")
            }
        }
    }

    private fun fetchUpdateInfo(urlString: String): UpdateInfo? {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "GET"
            conn.setRequestProperty("Accept", "application/json")

            if (conn.responseCode != HttpURLConnection.HTTP_OK) {
                return null
            }

            val reader = BufferedReader(InputStreamReader(conn.inputStream))
            val sb = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                sb.append(line)
            }
            reader.close()

            val json = JSONObject(sb.toString())
            val versionCode = json.optInt("versionCode", 0)
            val versionName = json.optString("versionName", "")
            val apkUrl = json.optString("apkUrl", "")
            val notes = json.optString("releaseNotes", "A new version of nexus.talks is available.")
            val mandatory = json.optBoolean("mandatory", false)

            if (versionCode > 0 && apkUrl.isNotBlank() && apkUrl.startsWith("https://")) {
                UpdateInfo(versionCode, versionName, apkUrl, notes, mandatory)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }

    private fun showUpdateDialog(activity: Activity, update: UpdateInfo) {
        if (activity.isFinishing || activity.isDestroyed) return

        val builder = MaterialAlertDialogBuilder(activity)
            .setTitle("nexus.talks Update Available (${update.versionName})")
            .setMessage(update.releaseNotes)
            .setPositiveButton("Download & Update") { _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(update.apkUrl)).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch installer intent", e)
                }
            }

        if (!update.isMandatory) {
            builder.setNegativeButton("Later", null)
        } else {
            builder.setCancelable(false)
        }

        builder.show()
    }
}
