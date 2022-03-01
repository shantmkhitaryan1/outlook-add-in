navigator.mediaDevices.enumerateDevices()
    .then(function(e) {
        var t = !1,
            o = !1;
        for (var i in e) "audioinput" == e[i].kind && (t = !0), "videoinput" == e[i].kind && (o = !0);
        
        navigator.getUserMedia({
                audio: t,
                video: o
            }, function(e) {
                var options = {
                    microphone: t ? 0 : 1,
                    camera: o ? 0 : 1
                };
                var tracks = e.getTracks();
                for(var i = 0; i < tracks.length; i++){
                    tracks[i].stop();
                    if("audio" === tracks[i].kind)
                        options.microphone = 1
                    if("video" === tracks[i].kind)
                        options.camera = 1
                }
                if(options.camera && options.microphone){
                    document.getElementById("wizard").style.display = "none";
                    document.getElementById("wizard-ready").style.display = "block"
                } else {
                    document.getElementById("wizard").style.display = "none";
                    var title = "You disabled your microphone and camera!"
                    if(options.camera){
                        title = "You disabled your microphone !";
                    } else if ( options.microphone){
                        title = "You disabled your camera !";
                    }
                    document.getElementById("disableTitle").innerText = title;
                    document.getElementById("wizard-not-ready").style.display = "block";
                }
            }, function(err) {
                if(err.name === "PermissionDeniedError" || err.name === "NotAllowedError"){
                    document.getElementById("wizard").style.display = "none";
                    var title = "You disabled your microphone and camera!";
                    document.getElementById("disableTitle").innerText = title;
                    document.getElementById("wizard-not-ready").style.display = "block";
                };
            })
    })
    .catch(function(e) {});

var closeBtns = document.getElementsByClassName("okey");
for(var i = 0; i < closeBtns.length; i++){
    closeBtns[i].addEventListener("click", function(){
        window.close();
    });
}
