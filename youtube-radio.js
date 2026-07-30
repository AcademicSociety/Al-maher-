// ====== ملف youtube-radio.js ======

let ytPlayer = null;
let isYtPlaying = false;

function loadYoutubeApi() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-hidden-player', {
        height: '0',
        width: '0',
        videoId: '3dEBSElM57U', 
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'playsinline': 1 
        }
    });
}

function toggleYtAudio() {
    const btn = document.getElementById('ytSunnahBtn');
    const mainAudioPlayer = document.getElementById('audioPlayer'); 

    if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') {
        alert("جاري الاتصال بالبث، يرجى الانتظار لحظة والمحاولة...");
        return;
    }

    if (isYtPlaying) {
        ytPlayer.pauseVideo();
        btn.textContent = '▶ تشغيل البث';
        isYtPlaying = false;
    } else {

        if (mainAudioPlayer) mainAudioPlayer.pause();
        
        ytPlayer.playVideo();
        btn.textContent = '⏸ إيقاف البث';
        isYtPlaying = true;
    }
}

function setYtVolume(val) {
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(val);
    }
}

loadYoutubeApi();