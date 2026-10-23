package com.noor.islamic;
import android.app.Activity;import android.os.Bundle;import android.webkit.WebView;import android.webkit.WebSettings;import android.webkit.WebViewClient;import android.webkit.WebChromeClient;
public class MainActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(android.graphics.Color.rgb(7,59,45));getWindow().setNavigationBarColor(android.graphics.Color.rgb(4,23,17));
 WebView w=new WebView(this);w.setBackgroundColor(android.graphics.Color.rgb(6,31,25));WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(true);s.setLoadsImagesAutomatically(true);w.setWebViewClient(new WebViewClient());w.setWebChromeClient(new WebChromeClient());setContentView(w);w.loadUrl("file:///android_asset/index.html");}
 @Override public void onBackPressed(){super.onBackPressed();}
}