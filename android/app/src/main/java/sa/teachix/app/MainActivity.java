package sa.teachix.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

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

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            cookieManager.setAcceptThirdPartyCookies(webView, false);
        }
        flushCookies();
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
