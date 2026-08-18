package sa.teachix.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Canvas;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.pdf.PrintedPdfDocument;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Locale;

@CapacitorPlugin(name = "TeachixPdf")
public class TeachixPdfPlugin extends Plugin {
    private static final String TEACHIX_HOST = "teachix.sa";

    private static final class OutputTarget {
        final Uri uri;
        final File file;
        final boolean pendingMediaStore;
        final String fileName;

        OutputTarget(Uri uri, File file, boolean pendingMediaStore, String fileName) {
            this.uri = uri;
            this.file = file;
            this.pendingMediaStore = pendingMediaStore;
            this.fileName = fileName;
        }
    }

    @PluginMethod
    public void savePdf(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "report.pdf");
        saveBytes(call, data, ensureExtension(fileName, ".pdf"), "application/pdf");
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName", "download.bin");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        saveBytes(call, data, fileName, mimeType);
    }

    private void saveBytes(PluginCall call, String data, String requestedName, String mimeType) {

        if (data == null || data.trim().isEmpty()) {
            call.reject("File data is missing");
            return;
        }

        OutputTarget target = null;
        try {
            target = createOutputTarget(requestedName, mimeType);
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            try (OutputStream output = openOutputStream(target)) {
                if (output == null) throw new IllegalStateException("Unable to open file output");
                output.write(bytes);
            }
            finishOutputTarget(target);
            resolveSaved(call, target);
        } catch (Exception error) {
            if (target != null) deleteOutputTarget(target);
            call.reject("Unable to save file", error);
        }
    }

    @PluginMethod
    public void renderHtmlToPdf(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "report.pdf");

        if (!isAllowedTeachixUrl(url)) {
            call.reject("Only authenticated Teachix URLs are allowed");
            return;
        }

        getActivity().runOnUiThread(() -> renderAuthenticatedPage(call, url, fileName));
    }

    private boolean isAllowedTeachixUrl(String value) {
        if (value == null || value.trim().isEmpty()) return false;
        Uri uri = Uri.parse(value);
        return "https".equalsIgnoreCase(uri.getScheme()) && TEACHIX_HOST.equalsIgnoreCase(uri.getHost());
    }

    private void renderAuthenticatedPage(PluginCall call, String url, String fileName) {
        final OutputTarget target;
        try {
            target = createOutputTarget(ensureExtension(fileName, ".pdf"), "application/pdf");
        } catch (Exception error) {
            call.reject("Unable to prepare PDF output", error);
            return;
        }

        WebView webView = new WebView(getActivity());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setDefaultTextEncodingName("utf-8");
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
        webView.setBackgroundColor(Color.WHITE);
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, false);
        cookieManager.flush();

        FrameLayout root = getActivity().findViewById(android.R.id.content);
        float density = getContext().getResources().getDisplayMetrics().density;
        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(
            Math.round(794f * density),
            Math.round(1123f * density)
        );
        layoutParams.gravity = Gravity.TOP | Gravity.START;
        layoutParams.leftMargin = -2000;
        layoutParams.topMargin = 0;
        root.addView(webView, layoutParams);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String finishedUrl) {
                view.postDelayed(() -> writeWebViewPdf(call, view, root, target), 700);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                cleanupWebView(view, root);
                deleteOutputTarget(target);
                call.reject("Unable to load the authenticated print view");
            }
        });

        webView.loadUrl(url);
    }

    private void writeWebViewPdf(PluginCall call, WebView webView, FrameLayout root, OutputTarget target) {
        PrintAttributes attributes = new PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setResolution(new PrintAttributes.Resolution("teachix_pdf", "Teachix PDF", 300, 300))
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .build();
        PrintedPdfDocument document = new PrintedPdfDocument(getContext(), attributes);

        try {
            float density = getContext().getResources().getDisplayMetrics().density;
            int pageWidth = document.getPageWidth();
            int pageHeight = document.getPageHeight();
            int viewWidth = Math.max(webView.getWidth(), Math.round(794f * density));
            int contentHeight = Math.max(
                pageHeight,
                Math.round(Math.max(1, webView.getContentHeight()) * density)
            );

            webView.measure(
                View.MeasureSpec.makeMeasureSpec(viewWidth, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(contentHeight, View.MeasureSpec.EXACTLY)
            );
            webView.layout(0, 0, viewWidth, contentHeight);

            float scale = pageWidth / (float) viewWidth;
            int scaledHeight = Math.round(contentHeight * scale);
            int pageCount = Math.max(1, (int) Math.ceil(scaledHeight / (double) pageHeight));

            for (int index = 0; index < pageCount; index++) {
                android.graphics.pdf.PdfDocument.Page page = document.startPage(index);
                Canvas canvas = page.getCanvas();
                canvas.save();
                canvas.clipRect(0, 0, pageWidth, pageHeight);
                canvas.scale(scale, scale);
                canvas.translate(0, -(index * pageHeight) / scale);
                webView.draw(canvas);
                canvas.restore();
                document.finishPage(page);
            }

            try (OutputStream output = openOutputStream(target)) {
                document.writeTo(output);
            }
            finishOutputTarget(target);
            resolveSaved(call, target);
        } catch (Exception error) {
            deleteOutputTarget(target);
            call.reject("Unable to generate PDF", error);
        } finally {
            document.close();
            cleanupWebView(webView, root);
        }
    }

    private OutputTarget createOutputTarget(String requestedName, String mimeType) throws Exception {
        String fileName = sanitizeFileName(requestedName);
        ContentResolver resolver = getContext().getContentResolver();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType == null || mimeType.trim().isEmpty()
                ? "application/octet-stream"
                : mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Teachix");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri uri = resolver.insert(collection, values);
            if (uri == null) throw new IllegalStateException("Unable to create Downloads entry");
            return new OutputTarget(uri, null, true, fileName);
        }

        File directory = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Teachix");
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IllegalStateException("Unable to create app download directory");
        }
        return new OutputTarget(Uri.fromFile(new File(directory, fileName)), new File(directory, fileName), false, fileName);
    }

    private OutputStream openOutputStream(OutputTarget target) throws Exception {
        if (target.file != null) return new FileOutputStream(target.file, false);
        return getContext().getContentResolver().openOutputStream(target.uri, "w");
    }

    private void finishOutputTarget(OutputTarget target) {
        if (!target.pendingMediaStore) return;
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContext().getContentResolver().update(target.uri, values, null, null);
    }

    private void deleteOutputTarget(OutputTarget target) {
        if (target.file != null) {
            //noinspection ResultOfMethodCallIgnored
            target.file.delete();
        } else if (target.uri != null) {
            getContext().getContentResolver().delete(target.uri, null, null);
        }
    }

    private void resolveSaved(PluginCall call, OutputTarget target) {
        JSObject result = new JSObject();
        result.put("fileName", target.fileName);
        result.put("uri", target.uri == null ? "" : target.uri.toString());
        call.resolve(result);
    }

    private void cleanupWebView(WebView webView, FrameLayout root) {
        root.removeView(webView);
        webView.stopLoading();
        webView.destroy();
    }

    private String sanitizeFileName(String requestedName) {
        String value = requestedName == null ? "download.bin" : requestedName.trim();
        value = value.replaceAll("[\\\\/:*?\"<>|]+", "-");
        if (value.isEmpty()) value = "download.bin";
        return value.length() > 150 ? value.substring(0, 150) : value;
    }

    private String ensureExtension(String value, String extension) {
        String safe = value == null ? "" : value.trim();
        return safe.toLowerCase(Locale.ROOT).endsWith(extension)
            ? safe
            : safe + extension;
    }
}
