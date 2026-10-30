package com.nexustalks.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.os.Message
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
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
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.net.URI

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "NexusMainActivity"
        private const val PREFS_NAME = "nexus_talks_prefs"
        private const val KEY_SERVER_URL = "configured_server_url"

        /**
         * Privacy-safe URL sanitizer: extracts and formats only scheme, host, and path.
         * Never logs query strings, tokens, credentials, fragments, or session data.
         */
        fun sanitizeUrlForLog(uri: Uri?): String {
            if (uri == null) return "<null>"
            val scheme = uri.scheme ?: ""
            val host = uri.host ?: ""
            val path = uri.path ?: ""
            return "$scheme://$host$path"
        }
    }

    private lateinit var prefs: SharedPreferences
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var splashLoadingContainer: View
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
    private var isInitialPageLoaded = false
    private var lastBackPressTime = 0L
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.i(TAG, "[LIFECYCLE] onCreate - savedInstanceState: ${savedInstanceState != null}")

        // Diagnostic uncaught exception handler
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e(TAG, "[FATAL_CRASH] Uncaught exception on thread '${thread.name}'", throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }

        super.onCreate(savedInstanceState)

        // Native Edge-to-Edge System Bar Integration
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = true
        insetsController.isAppearanceLightNavigationBars = true

        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.rootContainer)) { view, insets ->
            val statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())

            val bottomInset = if (imeInsets.bottom > 0) imeInsets.bottom else navBarInsets.bottom
            view.setPadding(statusBarInsets.left, statusBarInsets.top, statusBarInsets.right, bottomInset)
            insets
        }

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        splashLoadingContainer = findViewById(R.id.splashLoadingContainer)
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
            Log.i(TAG, "[LIFECYCLE] Restored activeServerUrl from savedInstanceState: ${sanitizeUrlForLog(activeServerUrl?.let { Uri.parse(it) })}")
        }

        registerFileChooser()
        setupBackNavigation()
        setupWebView()
        setupActions()

        if (savedInstanceState != null) {
            Log.i(TAG, "[LIFECYCLE] Restoring WebView state from savedInstanceState")
            webView.restoreState(savedInstanceState)
        } else {
            resolveAndLaunchUrl()
        }
    }

    override fun onStart() {
        super.onStart()
        Log.i(TAG, "[LIFECYCLE] onStart")
    }

    override fun onResume() {
        super.onResume()
        Log.i(TAG, "[LIFECYCLE] onResume - webView.url: ${sanitizeUrlForLog(webView.url?.let { Uri.parse(it) })}")
    }

    override fun onPause() {
        super.onPause()
        Log.i(TAG, "[LIFECYCLE] onPause")
        CookieManager.getInstance().flush()
    }

    override fun onStop() {
        super.onStop()
        Log.i(TAG, "[LIFECYCLE] onStop")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "[LIFECYCLE] onDestroy")
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        Log.i(TAG, "[LIFECYCLE] onSaveInstanceState - saving activeServerUrl: ${sanitizeUrlForLog(activeServerUrl?.let { Uri.parse(it) })}")
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
                Log.i(TAG, "[BACK_NAV] Back pressed - canGoBack: ${webView.canGoBack()}, errorVisible: ${errorContainer.visibility == View.VISIBLE}")
                if (errorContainer.visibility == View.VISIBLE) {
                    hideErrorScreen()
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        webView.reload()
                    }
                    return
                }

                if (setupContainer.visibility == View.VISIBLE) {
                    finish()
                    return
                }

                if (webView.visibility == View.VISIBLE) {
                    val currentUrl = webView.url
                    val currentPath = currentUrl?.let { try { Uri.parse(it).path } catch (e: Exception) { null } } ?: ""

                    // Root messenger destinations: confirm exit instead of cycling backwards into auth redirects
                    val isRootDestination = currentPath == "/conversations" ||
                            currentPath == "/login" ||
                            currentPath.isEmpty() ||
                            currentPath == "/"

                    if (isRootDestination) {
                        if (System.currentTimeMillis() - lastBackPressTime < 2000L) {
                            finish()
                        } else {
                            lastBackPressTime = System.currentTimeMillis()
                            Toast.makeText(this@MainActivity, getString(R.string.press_back_again_to_exit), Toast.LENGTH_SHORT).show()
                        }
                        return
                    }

                    // If in a sub-route (e.g. inside a specific conversation /conversations/123, /settings, /people, /profile), navigate back
                    if (webView.canGoBack()) {
                        webView.goBack()
                        return
                    }
                }

                // Fallback exit confirmation
                if (System.currentTimeMillis() - lastBackPressTime < 2000L) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                } else {
                    lastBackPressTime = System.currentTimeMillis()
                    Toast.makeText(this@MainActivity, getString(R.string.press_back_again_to_exit), Toast.LENGTH_SHORT).show()
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

        // Native app chrome elimination: disable scrollbars & over-scroll glow
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.overScrollMode = View.OVER_SCROLL_NEVER

        // Set Porcelain background to prevent white flashes
        webView.setBackgroundColor(getColor(R.color.nexus_porcelain))

        // Set custom User-Agent identifying the native container
        val defaultUa = settings.userAgentString
        settings.userAgentString = "$defaultUa NexusTalksApp/${BuildConfig.VERSION_NAME} (Android; NativeContainer)"

        // Enable cookie synchronization across sessions
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url
                val isForMainFrame = request?.isForMainFrame ?: false
                val isRedirect = request?.isRedirect ?: false
                val hasGesture = request?.hasGesture() ?: false
                val method = request?.method ?: "UNKNOWN"
                val sanitized = sanitizeUrlForLog(uri)

                Log.i(
                    TAG,
                    "[NAV_REQUEST] shouldOverrideUrlLoading(request) - url: $sanitized, mainFrame: $isForMainFrame, redirect: $isRedirect, gesture: $hasGesture, method: $method"
                )

                if (uri == null) {
                    Log.i(TAG, "[NAV_DECISION] uri is null -> staying in WebView (return false)")
                    return false
                }
                val decision = handleUrlNavigation(uri, isForMainFrame = isForMainFrame)
                Log.i(TAG, "[NAV_DECISION] url: $sanitized -> decision: ${if (decision) "OVERRIDE_EXTERNAL" else "STAY_IN_WEBVIEW"}")
                return decision
            }

            @Suppress("DEPRECATION")
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                val uri = url?.let { Uri.parse(it) }
                val sanitized = sanitizeUrlForLog(uri)
                Log.i(TAG, "[NAV_REQUEST_LEGACY] shouldOverrideUrlLoading(String) - url: $sanitized")
                if (url.isNullOrBlank() || uri == null) return false
                val decision = handleUrlNavigation(uri, isForMainFrame = true)
                Log.i(TAG, "[NAV_DECISION_LEGACY] url: $sanitized -> decision: ${if (decision) "OVERRIDE_EXTERNAL" else "STAY_IN_WEBVIEW"}")
                return decision
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                val sanitized = sanitizeUrlForLog(url?.let { Uri.parse(it) })
                Log.i(TAG, "[PAGE_LIFECYCLE] onPageStarted - url: $sanitized")
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
                hideErrorScreen()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                val sanitized = sanitizeUrlForLog(url?.let { Uri.parse(it) })
                Log.i(TAG, "[PAGE_LIFECYCLE] onPageFinished - url: $sanitized, activeServerUrl: ${sanitizeUrlForLog(activeServerUrl?.let { Uri.parse(it) })}")
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                CookieManager.getInstance().flush()

                if (!isInitialPageLoaded) {
                    isInitialPageLoaded = true
                    webView.visibility = View.VISIBLE
                    splashLoadingContainer.animate()
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction {
                            splashLoadingContainer.visibility = View.GONE
                            splashLoadingContainer.alpha = 1f
                        }
                        .start()
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                val sanitized = sanitizeUrlForLog(request?.url)
                val errorCode = error?.errorCode ?: 0
                val description = error?.description?.toString() ?: "Connection error"
                val isForMainFrame = request?.isForMainFrame ?: false

                Log.w(
                    TAG,
                    "[WEBVIEW_ERROR] onReceivedError - url: $sanitized, mainFrame: $isForMainFrame, errorCode: $errorCode, desc: $description"
                )

                if (isForMainFrame) {
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

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                super.onReceivedHttpError(view, request, errorResponse)
                val sanitized = sanitizeUrlForLog(request?.url)
                val statusCode = errorResponse?.statusCode ?: 0
                Log.w(
                    TAG,
                    "[WEBVIEW_HTTP_ERROR] onReceivedHttpError - url: $sanitized, mainFrame: ${request?.isForMainFrame}, statusCode: $statusCode"
                )
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
            ) {
                val sanitized = sanitizeUrlForLog(error?.url?.let { Uri.parse(it) })
                val primary = error?.primaryError ?: -1
                Log.e(TAG, "[WEBVIEW_SSL_ERROR] onReceivedSslError - url: $sanitized, primaryError: $primary")
                super.onReceivedSslError(view, handler, error)
            }

            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                val crashed = detail?.didCrash() ?: false
                val priority = detail?.rendererPriorityAtExit() ?: 0
                Log.e(TAG, "[RENDERER_CRASH] onRenderProcessGone - didCrash: $crashed, priorityAtExit: $priority")
                return super.onRenderProcessGone(view, detail)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress == 25 || newProgress == 50 || newProgress == 75 || newProgress == 100) {
                    Log.d(TAG, "[PROGRESS] Loading progress: $newProgress%")
                }
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    val msg = consoleMessage.message()
                    val source = consoleMessage.sourceId()
                    val line = consoleMessage.lineNumber()
                    Log.d("NexusWebConsole", "[$source:$line] $msg")
                }
                return super.onConsoleMessage(consoleMessage)
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                Log.i(TAG, "[WEBCHROME] onCreateWindow requested - isDialog: $isDialog, isUserGesture: $isUserGesture")
                return super.onCreateWindow(view, isDialog, isUserGesture, resultMsg)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                Log.i(TAG, "[FILE_CHOOSER] onShowFileChooser invoked")
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
        val scheme = uri.scheme?.lowercase()
        val host = uri.host?.lowercase()
        val sanitized = sanitizeUrlForLog(uri)

        Log.d(TAG, "[ROUTING_CHECK] Evaluating url: $sanitized, scheme: $scheme, host: $host, isForMainFrame: $isForMainFrame")

        // 1. Telephone, email, and SMS application links
        if (scheme == "tel" || scheme == "mailto" || scheme == "sms") {
            Log.i(TAG, "[INTENT_TRIGGER] Special protocol ($scheme) -> dispatching ACTION_VIEW for $sanitized")
            return try {
                val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch intent for $sanitized", e)
                false
            }
        }

        // 2. Internal browser schemes (about:blank, data:, blob:) must stay in WebView
        if (scheme != "http" && scheme != "https") {
            Log.d(TAG, "[ROUTING_CHECK] Non-HTTP(S) internal scheme ($scheme) -> staying in WebView")
            return false
        }

        // 3. Subframe / iframe requests must never launch external browser
        if (!isForMainFrame) {
            Log.d(TAG, "[ROUTING_CHECK] Not for main frame -> staying in WebView")
            return false
        }

        // 4. In-messenger navigation (same host, subdomain, Render domain, or Supabase Auth)
        val isInternal = isInternalHost(host)
        Log.d(TAG, "[ROUTING_CHECK] Host '$host' isInternalHost: $isInternal")
        if (isInternal) {
            Log.i(TAG, "[ROUTING_CHECK] Internal host -> staying in WebView")
            return false
        }

        // 5. Genuine external links (e.g. GitHub APK downloads, external documentation)
        Log.w(
            TAG,
            "[INTENT_TRIGGER] EXTERNAL BROWSER INTENT FIRED! Reason: host '$host' is not internal. URL: $sanitized. Call stack:\n" +
                    Log.getStackTraceString(Throwable())
        )
        return try {
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch external browser for $sanitized", e)
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
        Log.w(TAG, "[ERROR_SCREEN] Showing recoverable connection screen: $details")
        splashLoadingContainer.visibility = View.GONE
        textErrorMessage.text = getString(R.string.error_message)
        errorContainer.visibility = View.VISIBLE
    }

    private fun hideErrorScreen() {
        errorContainer.visibility = View.GONE
    }

    private fun setupActions() {
        btnConnect.setOnClickListener {
            val raw = editServerUrl.text?.toString()?.trim() ?: ""
            Log.i(TAG, "[SETUP_ACTION] btnConnect clicked")
            val validated = validateAndNormalizeUrl(raw)
            if (validated != null) {
                saveAndLaunchUrl(validated)
            }
        }

        btnEmulatorPreset.setOnClickListener {
            editServerUrl.setText("http://10.0.2.2:3000")
        }

        btnRetry.setOnClickListener {
            Log.i(TAG, "[ERROR_RETRY] btnRetry clicked - webView.url: ${sanitizeUrlForLog(webView.url?.let { Uri.parse(it) })}")
            hideErrorScreen()
            if (!isInitialPageLoaded) {
                splashLoadingContainer.visibility = View.VISIBLE
                splashLoadingContainer.alpha = 1f
            }
            if (webView.url != null) {
                webView.reload()
            } else if (activeServerUrl != null) {
                webView.loadUrl(getAppLaunchUrl(activeServerUrl!!))
            } else {
                resolveAndLaunchUrl()
            }
        }
    }

    /**
     * Resolves the proper messaging application entry point.
     * Directs native app users to '/conversations' (or '/login' via auth middleware)
     * instead of loading the public marketing landing page '/'.
     */
    private fun getAppLaunchUrl(baseUrl: String): String {
        val trimmed = baseUrl.trimEnd('/')
        val uri = try { Uri.parse(trimmed) } catch (e: Exception) { null }
        val path = uri?.path ?: ""
        return if (path.isEmpty() || path == "/") {
            "$trimmed/conversations"
        } else {
            trimmed
        }
    }

    private fun resolveAndLaunchUrl() {
        Log.i(TAG, "[URL_RESOLVE] Starting URL resolution process")
        // 1. Check stored URL in SharedPreferences
        val stored = prefs.getString(KEY_SERVER_URL, null)?.trim()
        if (!stored.isNullOrEmpty()) {
            val validated = validateAndNormalizeUrl(stored)
            if (validated != null) {
                val targetUrl = getAppLaunchUrl(validated)
                Log.i(TAG, "[URL_RESOLVE] Target resolved from SharedPreferences: ${sanitizeUrlForLog(Uri.parse(targetUrl))}")
                launchWebView(targetUrl)
                return
            }
        }

        // 2. Check compile-time BuildConfig default
        val compileTimeDefault = BuildConfig.DEFAULT_SERVER_URL.trim()
        if (compileTimeDefault.isNotEmpty()) {
            val validated = validateAndNormalizeUrl(compileTimeDefault)
            if (validated != null) {
                val targetUrl = getAppLaunchUrl(validated)
                Log.i(TAG, "[URL_RESOLVE] Target resolved from BuildConfig.DEFAULT_SERVER_URL: ${sanitizeUrlForLog(Uri.parse(targetUrl))}")
                launchWebView(targetUrl)
                return
            }
        }

        // 3. No URL configured — display branded setup screen
        Log.i(TAG, "[URL_RESOLVE] No configured URL available -> showing native setup screen")
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
        Log.i(TAG, "[VIEW_SWITCH] Displaying setupContainer screen")
        splashLoadingContainer.visibility = View.GONE
        webView.visibility = View.GONE
        hideErrorScreen()
        setupContainer.visibility = View.VISIBLE
        val current = prefs.getString(KEY_SERVER_URL, "")
        if (!current.isNullOrEmpty()) {
            editServerUrl.setText(current)
        }
    }

    private fun saveAndLaunchUrl(url: String) {
        val targetUrl = getAppLaunchUrl(url)
        Log.i(TAG, "[CONFIG_SAVE] Saving base URL: ${sanitizeUrlForLog(Uri.parse(url))} and launching: ${sanitizeUrlForLog(Uri.parse(targetUrl))}")
        prefs.edit().putString(KEY_SERVER_URL, url).apply()
        launchWebView(targetUrl)
    }

    private fun launchWebView(url: String) {
        val sanitized = sanitizeUrlForLog(Uri.parse(url))
        Log.i(TAG, "[WEBVIEW_DISPATCH] launchWebView called with $sanitized")
        activeServerUrl = url
        setupContainer.visibility = View.GONE
        hideErrorScreen()
        if (isInitialPageLoaded) {
            webView.visibility = View.VISIBLE
        } else {
            splashLoadingContainer.visibility = View.VISIBLE
            splashLoadingContainer.alpha = 1f
        }

        webView.loadUrl(url)

        // Run non-intrusive update check foundation
        UpdateChecker.checkForUpdates(this, url)
    }

    private fun showServerSwitchDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.change_server)
            .setMessage("Current: ${sanitizeUrlForLog(activeServerUrl?.let { Uri.parse(it) })}")
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
}
