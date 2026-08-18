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
    protected void onPause() {
        flushCookies();
        super.onPause();
    }

    @Override
    protected void onStop() {
        flushCookies();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        flushCookies();
        super.onDestroy();
    }
}
