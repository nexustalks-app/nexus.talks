package com.nexustalks.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.net.URI

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "NexusMainActivity"
        private const val PREFS_NAME = "nexus_talks_prefs"
        private const val KEY_SERVER_URL = "configured_server_url"
    }

    private lateinit var prefs: SharedPreferences
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var setupContainer: ScrollView
    private lateinit var editServerUrl: TextInputEditText
    private lateinit var urlInputLayout: TextInputLayout
    private lateinit var btnConnect: MaterialButton
    private lateinit var btnEmulatorPreset: MaterialButton

    private lateinit var errorContainer: View
    private lateinit var textErrorTitle: TextView
    private lateinit var textErrorMessage: TextView
    private lateinit var btnRetry: MaterialButton

    private var activeServerUrl: String? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        setupContainer = findViewById(R.id.setupContainer)
        editServerUrl = findViewById(R.id.editServerUrl)
        urlInputLayout = findViewById(R.id.urlInputLayout)
        btnConnect = findViewById(R.id.btnConnect)
        btnEmulatorPreset = findViewById(R.id.btnEmulatorPreset)

        errorContainer = findViewById(R.id.errorContainer)
        textErrorTitle = findViewById(R.id.textErrorTitle)
        textErrorMessage = findViewById(R.id.textErrorMessage)
        btnRetry = findViewById(R.id.btnRetry)

        if (savedInstanceState != null) {
            activeServerUrl = savedInstanceState.getString(KEY_SERVER_URL)
        }

        registerFileChooser()
        setupBackNavigation()
        setupWebView()
        setupActions()

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            resolveAndLaunchUrl()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(KEY_SERVER_URL, activeServerUrl)
        webView.saveState(outState)
    }

    private fun registerFileChooser() {
        fileChooserLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                val results: Array<Uri>? = when {
                    data?.data != null -> arrayOf(data.data!!)
                    data?.clipData != null -> {
                        val clip = data.clipData!!
                        Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    }
                    else -> null
                }
                fileUploadCallback?.onReceiveValue(results)
            } else {
                fileUploadCallback?.onReceiveValue(null)
            }
            fileUploadCallback = null
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (errorContainer.visibility == View.VISIBLE) {
                    hideErrorScreen()
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        webView.reload()
                    }
                } else if (webView.visibility == View.VISIBLE && webView.canGoBack()) {
                    webView.goBack()
                } else if (setupContainer.visibility == View.VISIBLE) {
                    finish()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Security best practice: restrict file/content access
        settings.allowFileAccess = false
        settings.allowContentAccess = false

        // Enable cookie synchronization across sessions
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                return handleUrlNavigation(uri, isForMainFrame = request.isForMainFrame)
            }

            @Suppress("DEPRECATION")
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url.isNullOrBlank()) return false
                val uri = Uri.parse(url)
                return handleUrlNavigation(uri, isForMainFrame = true)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
                hideErrorScreen()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Only show recoverable error screen for main frame failures
                if (request?.isForMainFrame == true) {
                    val errorCode = error?.errorCode ?: 0
                    val description = error?.description?.toString() ?: "Connection error"
                    Log.w(TAG, "WebView main frame error: $errorCode - $description for ${request.url}")

                    // Check for network connectivity or server unreachable issues
                    when (errorCode) {
                        ERROR_CONNECT,
                        ERROR_HOST_LOOKUP,
                        ERROR_TIMEOUT,
                        ERROR_FAILED_SSL_HANDSHAKE -> {
                            showErrorScreen(description)
                        }
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "File chooser launch failed", e)
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    false
                }
            }
        }

        // Long press on WebView with two fingers in debug builds allows changing server URL
        if (BuildConfig.DEBUG) {
            webView.setOnLongClickListener {
                showServerSwitchDialog()
                true
            }
        }
    }

    private fun handleUrlNavigation(uri: Uri, isForMainFrame: Boolean): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase()

        // 1. Telephone, email, and SMS application links
        if (scheme == "tel" || scheme == "mailto" || scheme == "sms") {
            return try {
                val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch intent for $uri", e)
                false
            }
        }

        // 2. Internal browser schemes (about:blank, data:, blob:) must stay in WebView
        if (scheme != "http" && scheme != "https") {
            return false
        }

        // 3. Subframe / iframe requests must never launch external browser
        if (!isForMainFrame) {
            return false
        }

        // 4. In-messenger navigation (same host, subdomain, Render domain, or Supabase Auth)
        if (isInternalHost(host)) {
            return false
        }

        // 5. Genuine external links (e.g. GitHub APK downloads, external documentation)
        return try {
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch external browser for $uri", e)
            false
        }
    }

    private fun isInternalHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return true // Relative navigations stay internal

        // Compare against active configured server URL
        val activeHost = try {
            URI(activeServerUrl ?: "").host?.lowercase()
        } catch (e: Exception) {
            null
        }
        if (activeHost != null && (host == activeHost || host.endsWith(".$activeHost"))) {
            return true
        }

        // Compare against compile-time DEFAULT_SERVER_URL
        val defaultHost = try {
            URI(BuildConfig.DEFAULT_SERVER_URL.trim()).host?.lowercase()
        } catch (e: Exception) {
            null
        }
        if (defaultHost != null && (host == defaultHost || host.endsWith(".$defaultHost"))) {
            return true
        }

        // Canonical Nexus.talks domains and Render hostnames
        if (host == "nexus-talks.onrender.com" || host.endsWith(".onrender.com")) {
            return true
        }

        // Supabase Auth and API infrastructure
        if (host == "supabase.co" || host.endsWith(".supabase.co")) {
            return true
        }

        // Development hosts in debug mode
        if (BuildConfig.DEBUG && (host == "10.0.2.2" || host == "localhost" || host == "127.0.0.1")) {
            return true
        }

        return false
    }

    private fun showErrorScreen(details: String) {
        Log.w(TAG, "Showing recoverable connection screen: $details")
        textErrorMessage.text = getString(R.string.error_message)
        errorContainer.visibility = View.VISIBLE
    }

    private fun hideErrorScreen() {
        errorContainer.visibility = View.GONE
    }

    private fun setupActions() {
        btnConnect.setOnClickListener {
            val raw = editServerUrl.text?.toString()?.trim() ?: ""
            val validated = validateAndNormalizeUrl(raw)
            if (validated != null) {
                saveAndLaunchUrl(validated)
            }
        }

        btnEmulatorPreset.setOnClickListener {
            editServerUrl.setText("http://10.0.2.2:3000")
        }

        btnRetry.setOnClickListener {
            hideErrorScreen()
            if (webView.url != null) {
                webView.reload()
            } else if (activeServerUrl != null) {
                webView.loadUrl(activeServerUrl!!)
            } else {
                resolveAndLaunchUrl()
            }
        }
    }

    private fun resolveAndLaunchUrl() {
        // 1. Check stored URL in SharedPreferences
        val stored = prefs.getString(KEY_SERVER_URL, null)?.trim()
        if (!stored.isNullOrEmpty()) {
            val validated = validateAndNormalizeUrl(stored)
            if (validated != null) {
                launchWebView(validated)
                return
            }
        }

        // 2. Check compile-time BuildConfig default
        val compileTimeDefault = BuildConfig.DEFAULT_SERVER_URL.trim()
        if (compileTimeDefault.isNotEmpty()) {
            val validated = validateAndNormalizeUrl(compileTimeDefault)
            if (validated != null) {
                launchWebView(validated)
                return
            }
        }

        // 3. No URL configured — display branded setup screen
        showSetupScreen()
    }

    private fun validateAndNormalizeUrl(input: String): String? {
        urlInputLayout.error = null

        if (input.isBlank()) {
            urlInputLayout.error = getString(R.string.setup_invalid_url)
            return null
        }

        val trimmed = if (!input.startsWith("http://") && !input.startsWith("https://")) {
            "https://$input"
        } else {
            input
        }

        return try {
            val uri = URI(trimmed)
            val scheme = uri.scheme?.lowercase()
            val host = uri.host

            if (scheme == null || host == null) {
                urlInputLayout.error = getString(R.string.setup_invalid_url)
                return null
            }

            // Security constraint: enforce HTTPS except for local development in debug builds
            if (scheme == "http") {
                val isLocalHost = host == "10.0.2.2" ||
                        host == "localhost" ||
                        host == "127.0.0.1" ||
                        host.startsWith("192.168.") ||
                        host.startsWith("10.")

                if (!BuildConfig.DEBUG || !isLocalHost) {
                    urlInputLayout.error = getString(R.string.setup_insecure_url)
                    return null
                }
            } else if (scheme != "https") {
                urlInputLayout.error = getString(R.string.setup_invalid_url)
                return null
            }

            trimmed
        } catch (e: Exception) {
            urlInputLayout.error = getString(R.string.setup_invalid_url)
            null
        }
    }

    private fun showSetupScreen() {
        webView.visibility = View.GONE
        hideErrorScreen()
        setupContainer.visibility = View.VISIBLE
        val current = prefs.getString(KEY_SERVER_URL, "")
        if (!current.isNullOrEmpty()) {
            editServerUrl.setText(current)
        }
    }

    private fun saveAndLaunchUrl(url: String) {
        prefs.edit().putString(KEY_SERVER_URL, url).apply()
        launchWebView(url)
    }

    private fun launchWebView(url: String) {
        activeServerUrl = url
        setupContainer.visibility = View.GONE
        hideErrorScreen()
        webView.visibility = View.VISIBLE

        webView.loadUrl(url)

        // Run non-intrusive update check foundation
        UpdateChecker.checkForUpdates(this, url)
    }

    private fun showServerSwitchDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.change_server)
            .setMessage("Current: ${activeServerUrl ?: "Not connected"}")
            .setPositiveButton("Change URL") { _, _ ->
                showSetupScreen()
            }
            .setNeutralButton(R.string.clear_cache) { _, _ ->
                webView.clearCache(true)
                CookieManager.getInstance().removeAllCookies(null)
                prefs.edit().remove(KEY_SERVER_URL).apply()
                Toast.makeText(this, "Cache and settings cleared.", Toast.LENGTH_SHORT).show()
                showSetupScreen()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }
}
