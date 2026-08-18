package sa.teachix.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewParent;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.coordinatorlayout.widget.CoordinatorLayout;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void flushCookies() {
        CookieManager.getInstance().flush();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TeachixPdfPlugin.class);
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            cookieManager.setAcceptThirdPartyCookies(webView, false);

            ViewParent parent = webView.getParent();
            if (parent instanceof CoordinatorLayout) {
                configureWindowInsets((CoordinatorLayout) parent);
            }
        }
        flushCookies();
    }

    private void configureWindowInsets(CoordinatorLayout root) {
        final int originalPaddingLeft = root.getPaddingLeft();
        final int originalPaddingTop = root.getPaddingTop();
        final int originalPaddingRight = root.getPaddingRight();
        final int originalPaddingBottom = root.getPaddingBottom();

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets statusBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets displayCutoutInsets = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
            int topInset = Math.max(statusBarInsets.top, displayCutoutInsets.top);
            int paddingTopBefore = view.getPaddingTop();

            // The existing dashboard/mobile CSS reserves the bottom gesture area
            // through env(safe-area-inset-bottom). Apply only the native top
            // inset here to avoid double spacing.
            view.setPadding(
                    originalPaddingLeft,
                    originalPaddingTop + topInset,
                    originalPaddingRight,
                    originalPaddingBottom
            );

            Log.d(
                    "TeachixInsets",
                    "TEACHIX_INSETS_DEBUG listenerFired=true topInset=" + topInset
                            + " rootPaddingTopBefore=" + paddingTopBefore
                            + " rootPaddingTopAfter=" + view.getPaddingTop()
                            + " target=" + view.getClass().getSimpleName()
            );
            return windowInsets;
        });

        ViewCompat.requestApplyInsets(root);
    }

    @Override
    public void onPause() {
        flushCookies();
        super.onPause();
    }

    @Override
    public void onStop() {
        flushCookies();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        flushCookies();
        super.onDestroy();
    }
}
