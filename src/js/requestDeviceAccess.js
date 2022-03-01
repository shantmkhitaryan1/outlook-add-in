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

                window.parent.postMessage({
                    sender: "rectrace",
                    type: "rectrace-AccessibleDevices",
                    devices: options
                }, "*");
            
                window.parent.postMessage({
                    sender: "rectrace",
                    key: "removeIframe",
                }, "*");

            }, function(err) {
                if(err.name === "PermissionDeniedError" || err.name === "NotAllowedError"){
                    window.parent.postMessage({
                        sender: "rectrace",
                        type: "rectrace-AccessibleDevices",
                        devices: {
                            microphone: 0,
                            camera: 0
                        }
                    }, "*")
                };
                window.parent.postMessage({
                    sender: "rectrace",
                    key: "removeIframe",
                }, "*");
            })
    })
    .catch(function(e) {});