import React, {
  useState, useMemo, useRef, useCallback, useEffect,
} from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, Platform, ActivityIndicator, Dimensions, Image,
  StatusBar, Share, Animated, FlatList, BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyContent, fetchTMDBDetails, fetchTMDBSeason,
  fetchTMDBCredits, fetchTMDBSimilar,
  TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE,
} from "@/services/supabase";
import { addToRecentlyWatched } from "@/hooks/useRecentlyWatched";
import type { Temporada, Episodio } from "@/types";

const { width } = Dimensions.get("window");
const PLAYER_HEIGHT = Math.round(width * (9 / 16));
const CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36";

const FAV_KEY = "cx_favorites_v1";

// Ad network domains to block at the WebView network level
const AD_DOMAINS = [
  "doubleclick.net","googlesyndication.com","googleadservices.com","adnxs.com",
  "adsrvr.org","adform.net","openx.net","pubmatic.com","rubiconproject.com",
  "smartadserver.com","taboola.com","outbrain.com","revcontent.com",
  "popads.net","popcash.net","trafficjunky.net","exoclick.com","juicyads.com",
  "trafficstars.com","hilltopads.net","propellerads.com","adsterra.com",
  "clickadu.com","mgid.com","bidvertiser.com","yllix.com","a-ads.com",
  "medianet.com","criteo.com","zedo.com","advertising.com","yieldmo.com",
  "lijit.com","sovrn.com","appnexus.com","contextweb.com","33across.com",
  "sharethrough.com","indexexchange.com","triplelift.com","spotxchange.com",
  "undertone.com","flashtalking.com","adroll.com","servedbyopenx.com",
  "adsafeprotected.com","moatads.com","scorecardresearch.com",
];

// Injected BEFORE any page content loads (anti-detection + popup guard)
const PRE_INJECT = `
(function(){
  'use strict';
  // Anti-detection: make page think this is a real Chrome browser
  try{Object.defineProperty(navigator,'webdriver',{get:()=>undefined,configurable:true});}catch(e){}
  try{Object.defineProperty(navigator,'plugins',{get:()=>{var p={length:5};p[0]={name:'Chrome PDF Plugin'};p[1]={name:'Chrome PDF Viewer'};p[2]={name:'Native Client'};p[3]={name:'Widevine Content Decryption Module'};p[4]={name:'Microsoft Edge PDF Plugin'};return p;},configurable:true});}catch(e){}
  try{if(!window.chrome){window.chrome={runtime:{},loadTimes:function(){},csi:function(){},app:{}};}}catch(e){}
  try{Object.defineProperty(navigator,'languages',{get:()=>['es-ES','es','en-US','en'],configurable:true});}catch(e){}
  // Block all new window popups immediately
  window.open=function(){return{focus:function(){},blur:function(){},closed:false,location:{href:'about:blank'}};};
  // Override document.write - used by many ad scripts to inject content
  var _origWrite=document.write.bind(document);
  var _origWriteln=document.writeln.bind(document);
  document.write=function(html){
    if(!html)return;
    var h=String(html).toLowerCase();
    if(h.includes('googlesyndication')||h.includes('doubleclick')||h.includes('adnxs')||
       h.includes('adsense')||h.includes('popads')||h.includes('exoclick')||
       h.includes('trafficjunky')||h.includes('propellerads')){return;}
    _origWrite(html);
  };
  document.writeln=function(html){
    if(!html)return;
    var h=String(html).toLowerCase();
    if(h.includes('googlesyndication')||h.includes('doubleclick')||h.includes('adnxs')||
       h.includes('adsense')||h.includes('popads')||h.includes('exoclick')||
       h.includes('trafficjunky')||h.includes('propellerads')){return;}
    _origWriteln(html);
  };
  // Inject ad-blocking CSS immediately
  var style=document.createElement('style');
  style.id='cx-adblock';
  style.textContent=[
    '[class*="ad-"]:not([class*="add-"]):not([class*="adb-"])','[id*="ad-"]:not([id*="add-"])','[class*="-ads"]','[id*="-ads"]',
    '.ad','.ads','.advert','.advertisement','.adunit','.ad-banner','.ad-container',
    '.ad-wrapper','.ad-block','.ad-box','.ad-zone','.ad-slot','.ad-overlay','.ad-label',
    '.sponsored','.sponsor-box','.sponsoredContent','.promotion',
    '#ad','.adsense','ins.adsbygoogle',
    '.popup','.pop-up','.popunder','#popup','#pop-under','#overlay:not(#player-overlay)',
    '[id*="popup"]','[class*="popup"]','[id*="popunder"]','[class*="popunder"]',
    '.modal-ad','.interstitial','#interstitial',
    '.vast-container','.ima-ad-container','.ima-container',
    '[id*="preroll"]','[class*="preroll"]','[class*="midroll"]','[class*="postroll"]',
    '.video-ads','#video-ads','.preroll-ad',
    '[class*="banner-ad"]','[id*="banner-ad"]',
    '[class*="skyscraper"]','[class*="leaderboard"]',
    'div[style*="z-index: 99"]','div[style*="z-index:99"]',
    'div[style*="z-index: 999"]','div[style*="z-index:999"]',
    'div[style*="z-index: 9999"]','div[style*="z-index:9999"]',
    'div[style*="z-index: 99999"]','div[style*="z-index:99999"]',
  ].join(',')+'{ display:none!important; visibility:hidden!important; opacity:0!important; pointer-events:none!important; max-height:0!important; overflow:hidden!important; }';
  (document.head||document.documentElement).appendChild(style);
  true;
})();
`;

// Injected AFTER DOM is ready (URL extraction + deep ad removal + player fix)
const MAIN_INJECT = `
(function(){
  'use strict';
  var _detected=new Set();
  var _videoPatterns=['.m3u8','.mp4','.webm','.ts','manifest','playlist','/hls/','/dash/','/stream/','/video/','chunklist','index.m3u8'];
  var _skipPatterns=['analytics','tracking','pixel','beacon','stats','.gif','.png','.jpg','.svg','.css','.woff','font','favicon','thumbnail','poster'];

  function isVideoUrl(url){
    if(!url||typeof url!=='string'||url.length<10)return false;
    if(url.startsWith('blob:'))return true;
    var l=url.toLowerCase();
    if(_skipPatterns.some(function(p){return l.includes(p);}))return false;
    return _videoPatterns.some(function(p){return l.includes(p);});
  }

  function send(url){
    if(!url||_detected.has(url))return;
    _detected.add(url);
    try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'video_url',url:url}));}}catch(e){}
  }

  // XHR intercept
  var _xhrOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,url){
    try{if(isVideoUrl(url))send(url);}catch(e){}
    return _xhrOpen.apply(this,arguments);
  };

  // fetch intercept
  var _fetch=window.fetch;
  window.fetch=function(res,opts){
    try{var u=typeof res==='string'?res:(res&&res.url?res.url:'');if(isVideoUrl(u))send(u);}catch(e){}
    return _fetch.apply(window,arguments);
  };

  // HTMLMediaElement.src intercept
  try{
    var _srcDesc=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');
    if(_srcDesc&&_srcDesc.set){
      Object.defineProperty(HTMLMediaElement.prototype,'src',{
        set:function(v){try{if(isVideoUrl(v))send(v);}catch(e){}if(_srcDesc.set)_srcDesc.set.call(this,v);},
        get:function(){return _srcDesc.get?_srcDesc.get.call(this):'';},
        configurable:true
      });
    }
  }catch(e){}

  // MediaSource intercept
  try{
    var _origAddSB=MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer=function(mime){
      try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'media_source',mimeType:mime}));}}catch(e){}
      return _origAddSB.apply(this,arguments);
    };
  }catch(e){}

  // Block external link clicks
  document.addEventListener('click',function(e){
    var t=e.target;
    for(var i=0;i<5;i++){
      if(!t||t===document.body)break;
      if(t.tagName==='A'){
        var href=t.getAttribute('href')||'';
        var target=t.getAttribute('target')||'';
        if(target==='_blank'||target==='_top'){
          if(href&&!href.startsWith('#')&&!href.startsWith('javascript')){
            var same=false;
            try{same=new URL(href,window.location.href).hostname===window.location.hostname;}catch(ex){}
            if(!same){e.preventDefault();e.stopImmediatePropagation();return;}
          }
        }
        break;
      }
      t=t.parentElement;
    }
  },true);

  // Fix player to fill viewport
  function fixPlayer(){
    try{
      document.documentElement.style.setProperty('overflow','hidden','important');
      document.body.style.setProperty('margin','0','important');
      document.body.style.setProperty('padding','0','important');
      document.body.style.setProperty('background','#000','important');
      document.querySelectorAll('video').forEach(function(v){
        v.style.setProperty('width','100%','important');
        v.style.setProperty('height','100%','important');
        v.style.setProperty('object-fit','contain','important');
        v.style.setProperty('max-width','100vw','important');
        v.style.setProperty('max-height','100vh','important');
      });
      ['#player','#video-player','.player','.video-player','.jw-wrapper','.plyr','.flowplayer',
       '[class*="player-container"]','[id*="player-container"]','[class*="videoWrapper"]'
      ].forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){
          el.style.setProperty('width','100%','important');
          el.style.setProperty('height','100%','important');
          el.style.setProperty('max-width','100vw','important');
          el.style.setProperty('max-height','100vh','important');
        });
      });
    }catch(e){}
  }

  // Remove high z-index overlay ads that survived CSS
  function killOverlays(){
    try{
      var all=document.querySelectorAll('div,section,aside');
      all.forEach(function(el){
        var s=window.getComputedStyle(el);
        var z=parseInt(s.zIndex,10);
        if(z>1000&&s.position!=='static'){
          var tag=el.id||el.className||'';
          if(typeof tag==='string'&&(tag.toLowerCase().includes('ad')||tag.toLowerCase().includes('pop')||tag.toLowerCase().includes('over')||tag.toLowerCase().includes('modal'))){
            el.style.setProperty('display','none','important');
          }
        }
      });
    }catch(e){}
  }

  var _obs=new MutationObserver(function(){fixPlayer();killOverlays();});
  if(document.body){_obs.observe(document.body,{childList:true,subtree:true});}
  else{document.addEventListener('DOMContentLoaded',function(){_obs.observe(document.body,{childList:true,subtree:true});});}

  fixPlayer();killOverlays();
  [500,1500,3000,5000,8000].forEach(function(d){setTimeout(function(){fixPlayer();killOverlays();},d);});

  true;
})();
`;

// JS snippets injected on demand into WebView
function seekScript(seconds: number) {
  return `(function(){
    var v=document.querySelector('video');
    if(!v){var f=document.querySelector('iframe');try{v=f&&f.contentDocument&&f.contentDocument.querySelector('video');}catch(e){}}
    if(v){v.currentTime=Math.max(0,v.currentTime+(${seconds}));
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'seeked',to:v.currentTime}));}
    true;
  })();`;
}

function speedScript(rate: number) {
  return `(function(){
    var v=document.querySelector('video');
    if(!v){var f=document.querySelector('iframe');try{v=f&&f.contentDocument&&f.contentDocument.querySelector('video');}catch(e){}}
    if(v){v.playbackRate=${rate};v.defaultPlaybackRate=${rate};}
    true;
  })();`;
}

function playPauseScript() {
  return `(function(){
    var v=document.querySelector('video');
    if(!v){var f=document.querySelector('iframe');try{v=f&&f.contentDocument&&f.contentDocument.querySelector('video');}catch(e){}}
    if(v){if(v.paused){v.play();}else{v.pause();}
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'playpause',paused:v.paused}));}
    true;
  })();`;
}

interface WebViewMsg {
  type: "video_url" | "media_source" | "seeked" | "playpause";
  url?: string;
  mimeType?: string;
  to?: number;
  paused?: boolean;
}

// ─── NativePlayer ─────────────────────────────────────────────────────────────
interface NativePlayerProps {
  url: string;
  onVideoUrl: (u: string) => void;
  speed: number;
  onSpeedChange?: (s: number) => void;
  onNextEp?: () => void;
  onPrevEp?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  title: string;
  isSerie: boolean;
  epLabel?: string;
  isLocked: boolean;
  onLockToggle: () => void;
  isFav: boolean;
  onFavToggle: () => void;
}

function NativePlayer({
  url, onVideoUrl, speed, onNextEp, onPrevEp,
  hasNext, hasPrev, title, isSerie, epLabel,
  isLocked, onLockToggle, isFav, onFavToggle,
}: NativePlayerProps) {
  const { WebView } = require("react-native-webview");
  type WVRef = InstanceType<typeof WebView>;
  type NavState = { url: string };

  const ref = useRef<WVRef>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Overlay state
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-tap seek
  const lastTapRef = useRef<{ time: number; side: "left" | "right" } | null>(null);
  const seekAnim = useRef({ left: new Animated.Value(0), right: new Animated.Value(0) });

  const baseHost = useMemo(() => { try { return new URL(url).hostname; } catch { return ""; } }, [url]);

  function isBlocked(navUrl: string): boolean {
    if (!navUrl || navUrl === "about:blank" || navUrl.startsWith("blob:")) return false;
    try {
      const host = new URL(navUrl).hostname;
      if (host === baseHost) return false;
      if (AD_DOMAINS.some((d) => host.endsWith(d))) return true;
      const safe = ["jwplatform","jwpcdn","cloudflare","akamai","fastly","hls","cdn","stream","video","player","embed","media"];
      if (safe.some((s) => host.includes(s))) return false;
      return true;
    } catch { return false; }
  }

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setOverlayVisible(false));
    }, 3500);
  }, [overlayOpacity]);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    scheduleHide();
  }, [overlayOpacity, scheduleHide]);

  const toggleOverlay = useCallback(() => {
    if (overlayVisible) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setOverlayVisible(false));
    } else {
      showOverlay();
    }
  }, [overlayVisible, overlayOpacity, showOverlay]);

  function animateSeekFlash(side: "left" | "right") {
    const anim = seekAnim.current[side];
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleTap(side: "left" | "right") {
    if (isLocked) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.side === side && now - last.time < 350) {
      // Double tap → seek
      lastTapRef.current = null;
      const seconds = side === "left" ? -10 : 10;
      ref.current?.injectJavaScript(seekScript(seconds));
      animateSeekFlash(side);
    } else {
      lastTapRef.current = { time: now, side };
      setTimeout(() => {
        if (lastTapRef.current?.time === now) {
          lastTapRef.current = null;
          toggleOverlay();
        }
      }, 360);
    }
  }

  function handlePlayPause() {
    ref.current?.injectJavaScript(playPauseScript());
    setIsPaused(!isPaused);
    scheduleHide();
  }

  function handleReload() {
    setLoading(true);
    ref.current?.reload();
    scheduleHide();
  }

  // Apply speed when it changes
  useEffect(() => {
    if (ref.current) ref.current.injectJavaScript(speedScript(speed));
  }, [speed]);

  const onMsg = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const msg: WebViewMsg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "video_url" && msg.url) onVideoUrl(msg.url);
      if (msg.type === "playpause") setIsPaused(msg.paused ?? false);
    } catch {}
  }, [onVideoUrl]);

  return (
    <View style={{ width: "100%", height: PLAYER_HEIGHT, backgroundColor: "#000" }}>
      <WebView
        ref={ref}
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: "#000" }}
        userAgent={CHROME_UA}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={PRE_INJECT}
        injectedJavaScript={MAIN_INJECT}
        onNavigationStateChange={(s: NavState) => { if (isBlocked(s.url)) ref.current?.stopLoading(); }}
        onShouldStartLoadWithRequest={(r: { url: string }) => !isBlocked(r.url)}
        onMessage={onMsg}
        onLoadStart={() => setLoading(true)}
        onLoad={() => { setLoading(false); if (speed !== 1) ref.current?.injectJavaScript(speedScript(speed)); }}
        onError={() => setLoading(false)}
        mixedContentMode="always"
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        allowsProtectedMedia
      />

      {/* Loading spinner */}
      {loading && (
        <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]} pointerEvents="none">
          <ActivityIndicator color="#e50914" size="large" />
        </View>
      )}

      {/* Double-tap seek zones (always active, behind overlay) */}
      {!isLocked && (
        <>
          <TouchableWithoutFeedback onPress={() => handleTap("left")}>
            <View style={[styles.tapZone, { left: 0 }]} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={() => handleTap("right")}>
            <View style={[styles.tapZone, { right: 0 }]} />
          </TouchableWithoutFeedback>
        </>
      )}

      {/* Seek flash indicators */}
      <Animated.View style={[styles.seekFlash, { left: 12, opacity: seekAnim.current.left }]} pointerEvents="none">
        <Feather name="rewind" size={22} color="#fff" />
        <Text style={styles.seekFlashText}>-10s</Text>
      </Animated.View>
      <Animated.View style={[styles.seekFlash, { right: 12, opacity: seekAnim.current.right }]} pointerEvents="none">
        <Feather name="fast-forward" size={22} color="#fff" />
        <Text style={styles.seekFlashText}>+10s</Text>
      </Animated.View>

      {/* Lock screen overlay */}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <TouchableOpacity style={styles.unlockBtn} onPress={onLockToggle}>
            <Feather name="unlock" size={18} color="#fff" />
            <Text style={styles.unlockText}>Toca para desbloquear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls overlay */}
      {!isLocked && overlayVisible && (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: overlayOpacity }]} pointerEvents="box-none">

          {/* Top gradient + controls */}
          <LinearGradient colors={["rgba(0,0,0,0.8)", "transparent"]} style={styles.overlayTop} pointerEvents="box-none">
            <View style={styles.overlayTopRow} pointerEvents="box-none">
              <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
                <Feather name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.overlayTitleWrap}>
                <Text style={styles.overlayTitle} numberOfLines={1}>{title}</Text>
                {epLabel ? <Text style={styles.overlaySubtitle} numberOfLines={1}>{epLabel}</Text> : null}
              </View>
              <TouchableOpacity style={styles.overlayBtn} onPress={onFavToggle}>
                <Feather name="heart" size={18} color={isFav ? "#e50914" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.overlayBtn} onPress={onLockToggle}>
                <Feather name="lock" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Center controls */}
          <View style={styles.overlayCenter} pointerEvents="box-none">
            {isSerie && hasPrev && (
              <TouchableOpacity style={styles.centerBtn} onPress={onPrevEp}>
                <Feather name="skip-back" size={26} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.centerBtn, styles.centerBtnMain]} onPress={handlePlayPause}>
              <Feather name={isPaused ? "play" : "pause"} size={30} color="#fff" />
            </TouchableOpacity>
            {isSerie && hasNext && (
              <TouchableOpacity style={styles.centerBtn} onPress={onNextEp}>
                <Feather name="skip-forward" size={26} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom gradient + controls */}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.overlayBottom} pointerEvents="box-none">
            <View style={styles.overlayBottomRow} pointerEvents="box-none">
              <TouchableOpacity style={styles.overlayChip} onPress={handleReload}>
                <Feather name="refresh-cw" size={13} color="#fff" />
                <Text style={styles.overlayChipText}>Reiniciar</Text>
              </TouchableOpacity>
              {isSerie && hasNext && (
                <TouchableOpacity style={[styles.overlayChip, styles.overlayChipAccent]} onPress={onNextEp}>
                  <Feather name="skip-forward" size={13} color="#fff" />
                  <Text style={styles.overlayChipText}>Siguiente</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>

        </Animated.View>
      )}
    </View>
  );
}

// ─── Web fallback ─────────────────────────────────────────────────────────────
function WebPlayer({ url }: { url: string }) {
  return (
    <View style={{ width: "100%", height: PLAYER_HEIGHT, backgroundColor: "#000" }}>
      <iframe src={url} style={{ width: "100%", height: "100%", border: "none", background: "#000" }}
        allowFullScreen allow="autoplay; fullscreen; encrypted-media" />
    </View>
  );
}

// ─── Episode card ─────────────────────────────────────────────────────────────
interface TMDBEpisode {
  episode_number: number; name: string; overview: string; still_path: string | null; air_date?: string;
}

function EpisodeCard({ ep, tmdbEp, isActive, onPress }: {
  ep: Episodio; tmdbEp?: TMDBEpisode; isActive: boolean; onPress: () => void;
}) {
  const thumb = tmdbEp?.still_path ? `${TMDB_IMAGE_BASE}${tmdbEp.still_path}` : null;
  return (
    <TouchableOpacity style={[styles.epCard, isActive && styles.epCardActive]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.epThumb}>
        {thumb
          ? <Image source={{ uri: thumb }} style={styles.epThumbImg} resizeMode="cover" />
          : <View style={styles.epThumbPlaceholder}><Feather name="film" size={20} color="#2a2a2a" /></View>}
        {isActive && (
          <View style={[StyleSheet.absoluteFillObject, styles.epThumbActive]}>
            <View style={styles.playCircle}><Feather name="play" size={14} color="#fff" /></View>
          </View>
        )}
        <View style={styles.epNumBadge}><Text style={styles.epNumBadgeText}>{ep.numero}</Text></View>
      </View>
      <View style={styles.epInfo}>
        <Text style={[styles.epName, isActive && styles.epNameActive]} numberOfLines={2}>
          {tmdbEp?.name || ep.nombre || `Episodio ${ep.numero}`}
        </Text>
        {tmdbEp?.air_date && <Text style={styles.epDate}>{tmdbEp.air_date.slice(0, 4)}</Text>}
        {tmdbEp?.overview ? <Text style={styles.epOverview} numberOfLines={2}>{tmdbEp.overview}</Text> : null}
      </View>
      {isActive && <View style={styles.epActiveDot} />}
    </TouchableOpacity>
  );
}

// ─── Speed options ─────────────────────────────────────────────────────────────
const SPEEDS = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "Normal", value: 1 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

// ─── Cast card ────────────────────────────────────────────────────────────────
function CastCard({ person }: { person: { name: string; character: string; profile_path: string | null } }) {
  const photo = person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : null;
  return (
    <View style={styles.castCard}>
      <View style={styles.castPhoto}>
        {photo
          ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          : <View style={styles.castPhotoPlaceholder}><Feather name="user" size={20} color="#3a3a3a" /></View>}
      </View>
      <Text style={styles.castName} numberOfLines={2}>{person.name}</Text>
      <Text style={styles.castChar} numberOfLines={1}>{person.character}</Text>
    </View>
  );
}

// ─── Similar card ─────────────────────────────────────────────────────────────
function SimilarCard({ item }: { item: { id: number; title?: string; name?: string; poster_path: string | null; vote_average?: number } }) {
  const poster = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null;
  const t = item.title || item.name || "";
  return (
    <View style={styles.similarCard}>
      <View style={styles.similarPoster}>
        {poster
          ? <Image source={{ uri: poster }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          : <View style={styles.similarPlaceholder}><Feather name="film" size={18} color="#2a2a2a" /></View>}
        {item.vote_average ? (
          <View style={styles.similarRating}>
            <Feather name="star" size={8} color="#f59e0b" />
            <Text style={styles.similarRatingText}>{Number(item.vote_average).toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.similarTitle} numberOfLines={2}>{t}</Text>
    </View>
  );
}

// ─── Main PlayerScreen ────────────────────────────────────────────────────────
export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    iframeUrl?: string; contenidoId?: string; title?: string;
    isSerie?: string; tmdbId?: string; tipo?: string; poster?: string;
  }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isSerie = params.isSerie === "true";
  const tmdbId = params.tmdbId ? Number(params.tmdbId) : null;
  const tipo = (params.tipo as "pelicula" | "serie") ?? (isSerie ? "serie" : "pelicula");
  const title = params.title ?? "Reproduciendo";

  // Player state
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Series state
  const [selectedTemporada, setSelectedTemporada] = useState(0);
  const [selectedEpisodio, setSelectedEpisodio] = useState<Episodio | null>(null);

  // Load favorites
  useEffect(() => {
    if (!params.contenidoId) return;
    AsyncStorage.getItem(FAV_KEY).then((val) => {
      const favs: string[] = val ? JSON.parse(val) : [];
      setIsFav(favs.includes(params.contenidoId!));
    }).catch(() => {});
  }, [params.contenidoId]);

  async function toggleFav() {
    if (!params.contenidoId) return;
    const val = await AsyncStorage.getItem(FAV_KEY).catch(() => null);
    const favs: string[] = val ? JSON.parse(val) : [];
    const next = favs.includes(params.contenidoId)
      ? favs.filter((f) => f !== params.contenidoId)
      : [...favs, params.contenidoId];
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
    setIsFav(next.includes(params.contenidoId));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // Android back button — when locked, just show unlock hint
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isLocked]);

  // Series data
  const { data: content = [] } = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: () => fetchMyContent(user!.id),
    enabled: !!user && isSerie,
  });

  const serieData = useMemo(() => {
    if (!isSerie || !params.contenidoId) return null;
    return content.find((c) => String(c.id) === params.contenidoId) ?? null;
  }, [content, params.contenidoId, isSerie]);

  const temporadas: Temporada[] = serieData?.temporadas ?? [];
  const episodios: Episodio[] = useMemo(
    () => temporadas[selectedTemporada]?.episodios ?? [],
    [temporadas, selectedTemporada]
  );
  const activeEpisodio = selectedEpisodio ?? episodios[0] ?? null;
  const activeEpIdx = episodios.findIndex((e) => e.id === activeEpisodio?.id);
  const hasPrev = isSerie && activeEpIdx > 0;
  const hasNext = isSerie && activeEpIdx < episodios.length - 1;

  function goNextEp() {
    if (hasNext) { setSelectedEpisodio(episodios[activeEpIdx + 1]); setDetectedUrl(null); }
  }
  function goPrevEp() {
    if (hasPrev) { setSelectedEpisodio(episodios[activeEpIdx - 1]); setDetectedUrl(null); }
  }

  const iframeUrl = isSerie ? activeEpisodio?.iframe_url : params.iframeUrl;
  const epLabel = isSerie && activeEpisodio
    ? `T${(temporadas[selectedTemporada]?.numero ?? 1)} · E${activeEpisodio.numero} — ${activeEpisodio.nombre ?? ""}`
    : undefined;

  // Track recently watched
  useEffect(() => {
    if (!iframeUrl) return;
    const recentId = params.contenidoId
      ? `${tipo}_${params.contenidoId}`
      : `${tipo}_${iframeUrl.slice(-28)}`;
    addToRecentlyWatched({
      id: recentId, title, tipo,
      poster: params.poster ?? null,
      contenidoId: params.contenidoId,
      iframeUrl: params.iframeUrl ?? iframeUrl,
      tmdbId: params.tmdbId,
    });
  }, [iframeUrl]);

  // TMDB queries
  const { data: tmdb } = useQuery({
    queryKey: ["tmdb-details", tmdbId, tipo],
    queryFn: () => fetchTMDBDetails(tmdbId!, tipo),
    enabled: !!tmdbId,
  });
  const currentSeasonNumber = temporadas[selectedTemporada]?.numero ?? 1;
  const { data: tmdbSeason } = useQuery({
    queryKey: ["tmdb-season", tmdbId, currentSeasonNumber],
    queryFn: () => fetchTMDBSeason(tmdbId!, currentSeasonNumber),
    enabled: !!tmdbId && isSerie,
  });
  const { data: credits } = useQuery({
    queryKey: ["tmdb-credits", tmdbId, tipo],
    queryFn: () => fetchTMDBCredits(tmdbId!, tipo),
    enabled: !!tmdbId,
  });
  const { data: similar } = useQuery({
    queryKey: ["tmdb-similar", tmdbId, tipo],
    queryFn: () => fetchTMDBSimilar(tmdbId!, tipo),
    enabled: !!tmdbId,
  });

  const tmdbEpisodes: TMDBEpisode[] = useMemo(() => (tmdbSeason?.episodes ?? []) as TMDBEpisode[], [tmdbSeason]);
  function getTmdbEp(ep: Episodio) { return tmdbEpisodes.find((t) => t.episode_number === ep.numero); }

  const cast: { id: number; name: string; character: string; profile_path: string | null }[] =
    useMemo(() => (credits?.cast ?? []).slice(0, 20), [credits]);

  const similarList: { id: number; title?: string; name?: string; poster_path: string | null; vote_average?: number }[] =
    useMemo(() => (similar?.results ?? []).slice(0, 15), [similar]);

  // TMDB meta
  const backdropUrl = tmdb?.backdrop_path ? `${TMDB_BACKDROP_BASE}${tmdb.backdrop_path}` : null;
  const genres: string[] = (tmdb?.genres ?? []).slice(0, 3).map((g: { name: string }) => g.name);
  const rating = tmdb?.vote_average ? Number(tmdb.vote_average).toFixed(1) : null;
  const overview = tmdb?.overview ?? "";
  const year = (tmdb?.release_date || tmdb?.first_air_date || "").slice(0, 4);
  const runtime = tmdb?.runtime ? `${tmdb.runtime} min` : (tmdb?.number_of_seasons ? `${tmdb.number_of_seasons} temp.` : null);

  async function handleShare() {
    try {
      await Share.share({ message: `Mira "${title}" en Cine Xperience 🎬` });
    } catch {}
  }

  function handleReportError() {
    router.back();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Minimal top bar (only shown when no overlay) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={isLocked}>
          <Feather name="chevron-down" size={22} color={isLocked ? "#333" : "#e2e2e2"} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.topRight}>
          {isLocked && (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={11} color="#f59e0b" />
              <Text style={styles.lockedBadgeText}>Bloqueado</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        scrollEnabled={!isLocked}
      >
        {/* Player */}
        {iframeUrl ? (
          Platform.OS === "web"
            ? <WebPlayer url={iframeUrl} />
            : (
              <NativePlayer
                url={iframeUrl}
                onVideoUrl={setDetectedUrl}
                speed={speed}
                onNextEp={goNextEp}
                onPrevEp={goPrevEp}
                hasNext={hasNext}
                hasPrev={hasPrev}
                title={title}
                isSerie={isSerie}
                epLabel={epLabel}
                isLocked={isLocked}
                onLockToggle={() => { setIsLocked(!isLocked); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
                isFav={isFav}
                onFavToggle={toggleFav}
              />
            )
        ) : (
          <View style={[styles.noPlayer, { height: PLAYER_HEIGHT }]}>
            <ActivityIndicator color="#e50914" />
            <Text style={styles.noPlayerText}>{isSerie ? "Selecciona un episodio" : "Cargando..."}</Text>
          </View>
        )}

        {/* ── Quick action bar ── */}
        <View style={styles.actionBar}>
          {/* Favorite */}
          <TouchableOpacity style={[styles.actionBtn, isFav && styles.actionBtnActive]} onPress={toggleFav}>
            <Feather name="heart" size={18} color={isFav ? "#e50914" : "#8a8a8a"} />
            <Text style={[styles.actionLabel, isFav && { color: "#e50914" }]}>
              {isFav ? "Guardado" : "Favorito"}
            </Text>
          </TouchableOpacity>

          {/* Speed */}
          <TouchableOpacity style={[styles.actionBtn, speedOpen && styles.actionBtnActive]} onPress={() => setSpeedOpen(!speedOpen)}>
            <Feather name="zap" size={18} color={speed !== 1 ? "#f59e0b" : "#8a8a8a"} />
            <Text style={[styles.actionLabel, speed !== 1 && { color: "#f59e0b" }]}>
              {SPEEDS.find((s) => s.value === speed)?.label ?? "Velocidad"}
            </Text>
          </TouchableOpacity>

          {/* Lock */}
          <TouchableOpacity
            style={[styles.actionBtn, isLocked && styles.actionBtnLock]}
            onPress={() => { setIsLocked(!isLocked); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
          >
            <Feather name={isLocked ? "lock" : "unlock"} size={18} color={isLocked ? "#f59e0b" : "#8a8a8a"} />
            <Text style={[styles.actionLabel, isLocked && { color: "#f59e0b" }]}>
              {isLocked ? "Bloqueado" : "Bloquear"}
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Feather name="share-2" size={18} color="#8a8a8a" />
            <Text style={styles.actionLabel}>Compartir</Text>
          </TouchableOpacity>
        </View>

        {/* ── Speed selector panel ── */}
        {speedOpen && (
          <View style={styles.speedPanel}>
            <Text style={styles.speedPanelTitle}>Velocidad de reproducción</Text>
            <View style={styles.speedChips}>
              {SPEEDS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.speedChip, speed === s.value && styles.speedChipActive]}
                  onPress={() => { setSpeed(s.value); setSpeedOpen(false); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.speedChipText, speed === s.value && styles.speedChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.speedNote}>
              La velocidad se aplica al video HTML5 nativo dentro del reproductor.
            </Text>
          </View>
        )}

        {/* ── Detected URL indicator ── */}
        {detectedUrl && (
          <View style={styles.detectedPill}>
            <Feather name="shield" size={11} color="#22c55e" />
            <Text style={styles.detectedText}>Señal directa detectada</Text>
          </View>
        )}

        {/* ── Next episode card (series) ── */}
        {isSerie && hasNext && episodios[activeEpIdx + 1] && (
          <View style={styles.nextEpSection}>
            <Text style={styles.sectionHeader}>A CONTINUACIÓN</Text>
            <TouchableOpacity style={styles.nextEpCard} onPress={goNextEp} activeOpacity={0.8}>
              {(() => {
                const nextEp = episodios[activeEpIdx + 1];
                const nextTmdb = getTmdbEp(nextEp);
                const thumb = nextTmdb?.still_path ? `${TMDB_IMAGE_BASE}${nextTmdb.still_path}` : null;
                return (
                  <>
                    <View style={styles.nextEpThumb}>
                      {thumb
                        ? <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        : <View style={styles.epThumbPlaceholder}><Feather name="tv" size={22} color="#2a2a2a" /></View>}
                      <View style={styles.nextEpPlayOverlay}>
                        <Feather name="play" size={18} color="#fff" />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nextEpLabel}>Episodio {nextEp.numero}</Text>
                      <Text style={styles.nextEpTitle} numberOfLines={2}>
                        {nextTmdb?.name || nextEp.nombre || `Episodio ${nextEp.numero}`}
                      </Text>
                      {nextTmdb?.overview
                        ? <Text style={styles.nextEpDesc} numberOfLines={2}>{nextTmdb.overview}</Text>
                        : null}
                    </View>
                    <Feather name="chevron-right" size={20} color="#e50914" />
                  </>
                );
              })()}
            </TouchableOpacity>
          </View>
        )}

        {/* ── TMDB Info ── */}
        {tmdb && (
          <View style={styles.infoSection}>
            {backdropUrl && (
              <View style={styles.backdropContainer}>
                <Image source={{ uri: backdropUrl }} style={styles.backdropImg} resizeMode="cover" />
                <LinearGradient colors={["transparent", "rgba(3,3,3,0.85)", "#030303"]} style={StyleSheet.absoluteFillObject} />
              </View>
            )}
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{tmdb.title || tmdb.name}</Text>
              <View style={styles.infoMeta}>
                {year ? <Text style={styles.metaChip}>{year}</Text> : null}
                {runtime ? <Text style={styles.metaChip}>{runtime}</Text> : null}
                {rating ? (
                  <View style={styles.ratingChip}>
                    <Feather name="star" size={10} color="#f59e0b" />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                ) : null}
              </View>
              {genres.length > 0 && (
                <View style={styles.genreRow}>
                  {genres.map((g) => (
                    <View key={g} style={styles.genreChip}><Text style={styles.genreText}>{g}</Text></View>
                  ))}
                </View>
              )}
              {overview ? (
                <TouchableOpacity onPress={() => setInfoExpanded(!infoExpanded)} activeOpacity={0.8}>
                  <Text style={styles.overview} numberOfLines={infoExpanded ? undefined : 3}>{overview}</Text>
                  <Text style={styles.overviewToggle}>{infoExpanded ? "Leer menos ▲" : "Leer más ▼"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>REPARTO PRINCIPAL</Text>
            <FlatList
              data={cast}
              keyExtractor={(c) => String(c.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => <CastCard person={item} />}
            />
          </View>
        )}

        {/* ── Similar / Recomendaciones ── */}
        {similarList.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>TAMBIÉN PUEDE GUSTARTE</Text>
            <FlatList
              data={similarList}
              keyExtractor={(c) => String(c.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => <SimilarCard item={item} />}
            />
          </View>
        )}

        {/* ── Series: Season tabs + Episode list ── */}
        {isSerie && temporadas.length > 0 && (
          <View style={styles.seriesSection}>
            <Text style={styles.sectionHeader}>EPISODIOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonsRow}>
              {temporadas.map((t, idx) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.seasonTab, idx === selectedTemporada && styles.seasonTabActive]}
                  onPress={() => { setSelectedTemporada(idx); setSelectedEpisodio(null); setDetectedUrl(null); }}
                >
                  <Text style={[styles.seasonTabText, idx === selectedTemporada && styles.seasonTabTextActive]}>
                    {t.nombre ?? `Temporada ${t.numero}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.divider} />
            <View style={styles.episodesList}>
              {episodios.map((ep) => (
                <EpisodeCard
                  key={ep.id} ep={ep}
                  tmdbEp={getTmdbEp(ep)}
                  isActive={(activeEpisodio?.id ?? -1) === ep.id}
                  onPress={() => { setSelectedEpisodio(ep); setDetectedUrl(null); }}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Report error ── */}
        <View style={styles.reportRow}>
          <TouchableOpacity style={styles.reportBtn} onPress={handleReportError}>
            <Feather name="alert-triangle" size={14} color="#5a5a5a" />
            <Text style={styles.reportText}>¿El video no carga? Volver e intentar de nuevo</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030303" },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  backBtn: {
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
    borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)",
  },
  topTitle: {
    flex: 1, color: "#c0c0c0", fontSize: 13,
    fontFamily: "Inter_600SemiBold", textAlign: "center", marginHorizontal: 8,
  },
  topRight: { width: 80, alignItems: "flex-end" },
  lockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  lockedBadgeText: { color: "#f59e0b", fontSize: 9, fontFamily: "Inter_600SemiBold" },

  // Player overlay
  loadingOverlay: { backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  tapZone: { position: "absolute", top: 0, bottom: 0, width: "50%" },

  seekFlash: {
    position: "absolute", top: "50%", marginTop: -28,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  seekFlashText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center",
  },
  unlockBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12,
  },
  unlockText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  overlayTop: {
    position: "absolute", top: 0, left: 0, right: 0, paddingBottom: 28, paddingTop: 8,
  },
  overlayTopRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6,
  },
  overlayBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 10,
  },
  overlayTitleWrap: { flex: 1, paddingHorizontal: 4 },
  overlayTitle: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  overlaySubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },

  overlayCenter: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24,
  },
  centerBtn: {
    width: 48, height: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 24,
  },
  centerBtnMain: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(229,9,20,0.85)", borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
  },

  overlayBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 24, paddingBottom: 10,
  },
  overlayBottomRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8,
  },
  overlayChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  overlayChipAccent: { backgroundColor: "rgba(229,9,20,0.6)" },
  overlayChipText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Action bar
  actionBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#050505",
  },
  actionBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, gap: 4,
    borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.04)",
  },
  actionBtnActive: { backgroundColor: "rgba(229,9,20,0.05)" },
  actionBtnLock: { backgroundColor: "rgba(245,158,11,0.07)" },
  actionLabel: { color: "#5a5a5a", fontSize: 9, fontFamily: "Inter_500Medium" },

  // Speed panel
  speedPanel: {
    margin: 16, padding: 16, backgroundColor: "#0b0b0b",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  speedPanelTitle: { color: "#888", fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 12, letterSpacing: 0.5 },
  speedChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  speedChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  speedChipActive: { backgroundColor: "rgba(229,9,20,0.15)", borderColor: "rgba(229,9,20,0.4)" },
  speedChipText: { color: "#6a6a6a", fontSize: 13, fontFamily: "Inter_500Medium" },
  speedChipTextActive: { color: "#e50914", fontFamily: "Inter_700Bold" },
  speedNote: { color: "#333", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 14 },

  // Detected pill
  detectedPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", marginLeft: 16, marginTop: 12,
    backgroundColor: "rgba(34,197,94,0.08)", borderWidth: 1, borderColor: "rgba(34,197,94,0.2)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  detectedText: { color: "#22c55e", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // No player
  noPlayer: {
    width: "100%", backgroundColor: "#0a0a0a",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  noPlayerText: { color: "#5a5a5a", fontSize: 13, fontFamily: "Inter_400Regular" },

  // Next episode card
  nextEpSection: { paddingHorizontal: 16, marginTop: 20 },
  nextEpCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0d0d0d", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(229,9,20,0.2)", padding: 10, overflow: "hidden",
  },
  nextEpThumb: {
    width: 110, height: 62, borderRadius: 8, overflow: "hidden",
    backgroundColor: "#111", flexShrink: 0,
  },
  nextEpPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  nextEpLabel: { color: "#e50914", fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  nextEpTitle: { color: "#e2e2e2", fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  nextEpDesc: { color: "#555", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 14 },

  // TMDB info
  infoSection: { marginTop: 8 },
  backdropContainer: { height: 140, marginBottom: -70, overflow: "hidden" },
  backdropImg: { width: "100%", height: "100%" },
  infoContent: { paddingHorizontal: 16, paddingTop: 8 },
  infoTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26, marginBottom: 8 },
  infoMeta: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  metaChip: {
    color: "#888", fontSize: 12, fontFamily: "Inter_500Medium",
    backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  ratingText: { color: "#f59e0b", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  genreRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  genreChip: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  genreText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_500Medium" },
  overview: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  overviewToggle: { color: "#e50914", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 5 },

  // Sections
  sectionWrap: { marginTop: 24 },
  sectionHeader: {
    color: "#3a3a3a", fontSize: 10, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5, paddingHorizontal: 16, marginBottom: 12,
  },

  // Cast
  castCard: { width: 80, alignItems: "center" },
  castPhoto: {
    width: 68, height: 68, borderRadius: 34, overflow: "hidden",
    backgroundColor: "#111", marginBottom: 6,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.07)",
  },
  castPhotoPlaceholder: {
    width: "100%", height: "100%", backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
  },
  castName: { color: "#d0d0d0", fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 14 },
  castChar: { color: "#4a4a4a", fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2 },

  // Similar
  similarCard: { width: 100 },
  similarPoster: {
    width: 100, height: 148, borderRadius: 10, overflow: "hidden",
    backgroundColor: "#111", marginBottom: 6,
  },
  similarPlaceholder: {
    width: "100%", height: "100%", backgroundColor: "#111",
    alignItems: "center", justifyContent: "center",
  },
  similarRating: {
    position: "absolute", bottom: 6, right: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  similarRatingText: { color: "#f59e0b", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  similarTitle: { color: "#aaa", fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 14 },

  // Series
  seriesSection: { marginTop: 24 },
  seasonsRow: { paddingHorizontal: 16, gap: 0, marginBottom: 4 },
  seasonTab: {
    paddingHorizontal: 16, paddingVertical: 10, marginRight: 4,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  seasonTabActive: { borderBottomColor: "#e50914" },
  seasonTabText: { color: "#5a5a5a", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  seasonTabTextActive: { color: "#ffffff" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginBottom: 12 },
  episodesList: { paddingHorizontal: 16, gap: 4 },

  // Episode card
  epCard: {
    flexDirection: "row", alignItems: "flex-start", padding: 10,
    borderRadius: 10, gap: 12, marginBottom: 2,
  },
  epCardActive: { backgroundColor: "rgba(229,9,20,0.06)", borderWidth: 1, borderColor: "rgba(229,9,20,0.1)" },
  epThumb: {
    width: 120, height: 68, borderRadius: 8, overflow: "hidden",
    flexShrink: 0, backgroundColor: "#111",
  },
  epThumbImg: { width: "100%", height: "100%" },
  epThumbPlaceholder: {
    width: "100%", height: "100%", alignItems: "center",
    justifyContent: "center", backgroundColor: "#111",
  },
  epThumbActive: { backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(229,9,20,0.9)", alignItems: "center", justifyContent: "center",
  },
  epNumBadge: {
    position: "absolute", bottom: 4, left: 4,
    backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  epNumBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  epInfo: { flex: 1 },
  epName: { color: "#d0d0d0", fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 17, marginBottom: 2 },
  epNameActive: { color: "#ffffff", fontFamily: "Inter_600SemiBold" },
  epDate: { color: "#555", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 3 },
  epOverview: { color: "#555", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  epActiveDot: { width: 3, alignSelf: "stretch", backgroundColor: "#e50914", borderRadius: 2, marginLeft: 4 },

  // Report
  reportRow: { alignItems: "center", marginTop: 20 },
  reportBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  reportText: { color: "#2a2a2a", fontSize: 11, fontFamily: "Inter_400Regular" },
});
