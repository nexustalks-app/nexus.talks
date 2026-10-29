package com.nexustalks.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.ScrollView
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

        registerFileChooser()
        setupBackNavigation()
        setupWebView()
        setupActions()

        resolveAndLaunchUrl()
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
                if (webView.visibility == View.VISIBLE && webView.canGoBack()) {
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
                val url = request?.url ?: return false
                val urlString = url.toString()

                val baseHost = try {
                    URI(activeServerUrl ?: "").host
                } catch (e: Exception) {
                    null
                }

                // If navigating within the same host or relative paths, keep in WebView
                if (baseHost != null && url.host.equals(baseHost, ignoreCase = true)) {
                    return false
                }

                // Open external links (or mailto/tel) in the user's default browser or application
                return try {
                    val intent = Intent(Intent.ACTION_VIEW, url)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    startActivity(intent)
                    true
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch external browser for $urlString", e)
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                CookieManager.getInstance().flush()
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
