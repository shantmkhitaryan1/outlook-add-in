var log = "";
var app = {
    isCanceled: false,
    webCamType: null,
    pageIsLoaded:false,
    chromeMediaSourceID: null,
    desktopMediaRequestId: null,
    chunkedUploader: null,
    chunkes: [],
    chunkBlob: null,
    upload_url: null,
    rrid: null,
    appState: "default",
    recordingPageTitle: null,
    currentTabId: null,
    uploadTrigger: null,
    isWpPage: false,
    recorder: null,
    currentStream: null,
    recordedDuration:0,
    try_again_count:3, /* SETTING - how many time will try to upload after online state */
    loadContent: [],
    recordingInfo: {
        videoCodec: "videoCodec",
        alreadyHadGUMError: false,
        enableTabAudio: true
    },
    recordingState: {
        isRecording: false,
        isDesktopCapture: false,
        recordingType: null,
        startTime: null,
        tempTime: 0,
        isWebCamCapture: false,
        isFailed: false
    },
    init: function () {
        app.resetDefaults();
        app.bindChromeEvents();
    },

    loadPopupDependencies: function () {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (chrome.runtime.lastError) {
                return;
            }
            for (var i = 0; i < tabs.length; ++i) {
                if (tabs[i].id) {
                    chrome.tabs.executeScript(tabs[i].id, { file: "lib/jquery.min2.1.3.js" }, function (results) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });

                    chrome.tabs.executeScript(tabs[i].id, { file: "js/main.js" }, function (results) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                }
            }
        });
    },

    checkUploadIframeExist: function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                // to content.js 
                tabs[0] && chrome.tabs.sendMessage(tabs[0].id, { key: "checkUploadIframeExist" }, function (response) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    // to main.js 
                    app.sendMessage("checkUploadIframeExistSuccess", { response: response });
                });
            }
        );
    },

    checkAssetsIframeExist: function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                // to content.js 
                chrome.tabs.sendMessage(tabs[0].id, { key: "checkAssetsIframeExist" }, function (r) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    // to main.js 
                    app.sendMessage("checkAssetsIframeExistSuccess", { r: r });
                });
            }
        );
    },
    checkUserStatusAjax: function (ajax_url) {
        this.sendAjax('https://www.cincopa.com/rectrace/getislogin?affdata=rectrace,rectrace-ext&disable_editor=y',
        function(xhr){
            var data = xhr.response;
            app.sendMessage('sendedUserStatus',  {data:data})
        }, function(xhr){
            app.sendMessage('sendedUserStatus',  {data:{error:true}})

        });
    },

    checkUserStatus: function (upload_url) {
       
               // chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT },
        chrome.tabs.query({ 'active': true, currentWindow: true  },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (tabs && tabs[0] && tabs[0].url) {
                    if (tabs[0].incognito) {
                        // to main.js 
                        app.sendMessage('showIncognitoBox')
                    }
                    if (tabs[0].url.indexOf("view-source:") > -1) {
                        
                        
                        // to main.js 
                        app.sendMessage('showExtensionBox')
                    }

                    chrome.tabs.executeScript(tabs[0].id, {
                        file: 'js/content.js',
                    }, function (results) {
                        if (chrome.runtime.lastError || !results || !results.length) {
                            // to main.js 
                            
                            app.sendMessage('showExtensionBox')
                        } else {
                            var currentUrl = tabs[0].url, fid;
                            var splitted = currentUrl.split("?");
                            var domain = splitted[0];
                            var search = splitted[1];
                            if (domain.indexOf("/media-platform/upload-files") > -1 && search) {
                                var arr = search.split("&");
                                for (var i = 0; i < arr.length; i++) {
                                    if (arr[i].indexOf("fid=") === 0) {
                                        fid = arr[i].replace("fid=", "");
                                        break;
                                    }
                                }
                            }
                            if (fid && upload_url) {
                                upload_url = upload_url.replace("addtofid=0", "addtofid=" + fid);
                            }
                            // to main.js 
                            
                            app.sendMessage('showRecordingBlock')

                            var request = {
                                upload_url: upload_url,
                                rrid: ""
                            };
                            app.upload_url = request.upload_url;
                            app.rrid = request.rrid ? request.rrid : null;
                            app.uploadTrigger = request.uploadTrigger ? request.uploadTrigger : null;
                            // to main.js 
                            
                            app.sendMessage('sendIfWpPage', { upload_url: request.upload_url });
                        }
                    });

                }
            }
        );
    },

    checkDevicePermissions:function(){
        DetectRTC.load(function () {
            var permissions = app.detectDevicePermission();
            app.sendMessage('setDevicePermissions', { permissions: permissions });
        });
    },

    unregisteredUserStatus: function () {
        chrome.tabs.query({ 'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (tabs && tabs[0] && tabs[0].url) {
                    if (tabs[0].incognito) {
                        // to main.js 
                        app.sendMessage('showIncognitoBox')
                    }
                    if (tabs[0].url.indexOf("view-source:") > -1) {
                        // to main.js 
                        app.sendMessage('showExtensionBox')
                    }
                    chrome.tabs.executeScript(tabs[0].id, {
                        file: 'js/content.js',
                    }, function (results) {
                        if (chrome.runtime.lastError || !results || !results.length) {
                            // to main.js 
                            app.sendMessage('showExtensionBox')
                            return;
                        } else {
                            // to main.js 
                            app.sendMessage('showRecordingBlock')
                            chrome.extension.sendMessage({
                                action: 'upload_url',
                                upload_url: null,
                                rrid: null
                            });
                        }
                    });

                }
            })
    },

    checkWordpressPage: function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                // to content.js
                chrome.tabs.sendMessage(tabs[0].id, { key: "checkWordpressPage" }, function (r) {
                    if (r && r.ifWpPage) {
                        chrome.extension.sendMessage({
                            action: 'isWpPage'
                        });
                    }
                });
            }
        );
    },

    requestDeviceAccess: function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                // to content.js
                chrome.tabs.sendMessage(tabs[0].id, { key: "requestDeviceAccess" }, function (response) { });
            }
        );
    },

    createTab: function (url) {
        chrome.tabs.create({ url: url }, function (tab) {
            if (chrome.runtime.lastError) {
                return;
            }
        });
    },

    sendEventGmail: function (data) {
        app.sendMessage('sendEventGmailSuccess', { data: data,default_domain:app.default_domain,defaults:app.defaults })
    },

    loadTags: function () {
        app.sendAjax('https://api.cincopa.com/v2/asset.get_tags.json?cache=never&api_token=session',
        function(res){
            res = res.response 
            app.sendMessage('loadTagsSuccess', { res: res})
        },
        function(er){
            app.sendMessage('ajaxError',{error:er})
        },"GET",true,'json',false)
    },

    loadGalleries: function (page = 1) {
        app.sendAjax('https://api.cincopa.com/v2/gallery.list.json?api_token=session&page=' + page,
            function (res) {
                res = res.response
                app.sendMessage('loadGalleriesSuccess', { res: res, page: page })
            },
            function (er) {
                app.sendMessage('ajaxError', { error: er })
            }, "GET", true, 'json', false)
    },

    loadByTag: function (tag) {
		tag=encodeURIComponent(tag);
        app.sendAjax('https://api.cincopa.com/v2/asset.list.json?cache=never&api_token=session&type=video&search=tag=' + tag,
        function(res){
        res = res.response 
        res.tag = tag;
        app.sendMessage('loadByTagSuccess', { res: res});
        },function(er){
        app.sendMessage('ajaxError',{error:er})
        },"POST",true,'json',false)
    },

    bindChromeEvents: function () {
        app.bindOnMessage();
        app.bindOnClicked();
        app.bindOnActiveChanged();
        app.bindOnRemoved();
        app.bindOnConnect();
        app.bindOnUpdated();
        app.bindOnInstalled();
        app.bindOnActivated();
        app.bindNetworkState();
    },

    bindNetworkState:function(){
        window.addEventListener('offline', function(e) { 
            app.networkState = 'offline';
            console.log('network state offline')
    
        }, false);
        window.addEventListener('online', function(e) { 
            if(app.chunkedUploader){
                if((typeof app.chunkedUploader.percentComplete == 'undefined' || app.chunkedUploader.percentComplete < 100) && app.networkState == 'offline'){
                    if(app.chunkedUploader.try_again_count < app.try_again_count){
                        if(!app.recordingState.isRecording){
                            app.showNotification("Internet connection back!\nTrying to continue upload");
                        }                    
                        app.chunkedUploader.try_again_count++;
                        app.chunkedUploader._tryAgainUpload(app.chunkedUploader);                
                    }else{                
                        app.chunkedUploader._uploadFail(app.chunkedUploader, app.chunkedUploader.upload_request.responseText.toLowerCase())();
                    }
                }
            }
            app.networkState = 'online';    
         },false);
    },
    bindOnActivated() {


        chrome.tabs.onActivated.addListener(function(activeInfo) {
            if (chrome.runtime.lastError) {
                return;
            }
            chrome.tabs.getAllInWindow(null, function(tabs){
                if (chrome.runtime.lastError) {
                    return;
                }
               if(app.loadContent.length == 0 && tabs.length > 0){
                for(let i = 0; i < tabs.length; i++){
                    app.loadContent[i] = {id:  tabs[i].id,lodaedContent: false }
                }
               }
               if(app.loadContent.length > 0){
                   for(let i = 0; i < app.loadContent.length; i++){
                       if(app.loadContent[i].id == activeInfo.tabId && app.loadContent[i].lodaedContent !==true){
                           app.loadContent[i].lodaedContent = true;
                           chrome.tabs.executeScript(activeInfo.tabId, { file: "js/content.js" }, function (results) {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                           });
       
                       }
                   }
               }
            });
            chrome.tabs.get(activeInfo.tabId,function(tab) {
                if(tab.status == 'complete'){
                    app.pageIsLoaded = true;
                }
            })

            chrome.tabs.query({active: false}, function (tabs) {
               

            })

        });
    },

    deleteFile: function (option) {
        var { rid, fid } = option.option;
        var deletableoption = rid || fid
        app.sendAjax('https://api.cincopa.com/v2/' + (rid ? 'asset' : 'gallery')  +  '.' + 'delete.json?api_token=session&' + (rid ? 'rid=' : 'fid=') + deletableoption,
        function(res){
            if(res?.response?.success){
                app.sendMessage('deleteFileSuccess', { rid: rid, fid: fid });
            }else{
                app.showNotification(res?.response?.message || 'Something went wrong',"Can't delete");
                app.sendMessage('ajaxError',{error:res})
            }            
        },
        function(er){
            app.sendMessage('ajaxError',{error:er})
        },"GET",true,'json',false)
    },

    bindOnMessage: function () {
        chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
            if (chrome.runtime.lastError) {
                return;
            }

            switch (request.action) {
				case 'capture':
                    app.getRecordingPageTitle();
                    app.getCurrentTab();
                    app.recordingInfo.enableTabAudio = request.audio;
                    app.recordingInfo.maxRecordMin = request.maxRecordMin;
                    
                    if (request.type == "tab") {
                        app.activeTabId = sender.tab.id;
                        app.sourceType = "tab";
                        app.sendMessage("appendRecordingHtml", { type: request.type });
                        app.captureTab(app.recordingInfo.enableTabAudio);
                    } else if (request.type == "screen") {
                        app.sourceType = "screen";
                        app.captureDesktop(false);
                    } else if (request.type == "webcam") {
                        app.sourceType = 'webcam'
                        app.sendMessage("appendRecordingHtml", { type: request.type });
                    }
                    app.appState = "waiting";
                    sendResponse({ message: "done" });
                    break;

                case 'webcamPreview':
                    app.sendMessage("appendWebCamPreview");
                    app.webCamType = "appendWebCamPreview";
                    break;

                case 'smallwebcamPreview':
                    app.sendMessage("appendSmallWebCamPreview");
                    app.webCamType = "appendSmallWebCamPreview";
                    break;
                
                case 'removeAllCamPreviews':
                    app.sendMessage('removeSmallWebCamPreview');
                    
                    app.sendMessage('removeWebCamPreview');
                    app.webCamType = null;
                    break;
                case 'stopRecording':
                    app.stopScreenRecording();
                    break;

                case 'startCapture':
                    app.recordingState.recordingType = "capture";
                    if (request.type == "tab") {
                        app.startTabRecording();
                    } else if (request.type == "screen") {
                        app.startDesktopCapture(false);
                    } else {
                        app.startWebCamCapture()
                    }
                    break;

                case 'cancellRecording':
                    app.isCanceled = true;
                    app.sendMessage("removeSmallWebCamPreview");
                    app.resetDefaults(true);
                    break;
                    
                case 'pauseRecording':
                    app.pauseRecording();
                    break;
                case 'unmuteRecording':
                    app.unmuteRecording();
                    break;

                case 'muteRecording':
                    app.muteRecording();
                    break;
            

                case 'resumeRecording':
                    app.resumeRecording();
                    break;

                case 'refreshRecording':
                    app.refreshRecording();
                    break;

                case 'upload_url':

                    app.upload_url = request.upload_url;
                    app.rrid = request.rrid ? request.rrid : null;
                    app.uploadTrigger = request.uploadTrigger ? request.uploadTrigger : null
                    break;

                case 'checkDevicePermissions':
                    app.checkDevicePermissions();
                    break;

                case 'gotIt':
                    app.sendMessage("appendGotIt");
                    app.resetDefaults();
                    break;

                case 'tab_clicked':
                    if (request.bigtab && request.bigtab === 'record') {

                        if (request.tab === "webcam") {
                            
                            app.sendMessage("removeWebCamPreview");
                            app.sendMessage("appendWebCamPreview");
                            app.webCamType = "appendWebCamPreview";
                        } else {
                            app.sendMessage("removeWebCamPreview");
                            if (request.webCam) {
                                
                                app.sendMessage("appendSmallWebCamPreview");
                                app.webCamType = "appendSmallWebCamPreview";
                            }
                        }
                    } else {
                        app.sendMessage("removeWebCamPreview");
                        app.sendMessage("removeSmallWebCamPreview");
                        app.webCamType = null;
                    }
                    break;
                // case 'chackCameraPermission':
                //     if(app.recorder.state == 'recording'){
                //         if(request.type !== 'webcam'){
                //             chrome.storage.sync.get(null, function (items) {
                //                 if(items.cameraEnabled == true){
                //                     reload = {
                //                         reload: 'reloaded'
                //                     }
                //                     app.sendMessage('appendSmallWebCamPreview', reload)
                //                 }
                //             })
                            
                //         }
                        
                //     }
                //     break;
                case 'camera_clicked':
                    if (request.tab !== "webcam") {
                        if (request.enabled) {
                            app.sendMessage("appendSmallWebCamPreview");
                            app.webCamType = "appendSmallWebCamPreview";
                        } else {
                            
                            app.sendMessage("removeWebCamPreview");
                        }
                    }else {
                        if (request.enabled) {
                            app.sendMessage("appendWebCamPreview");
                        } else {
                            
                            app.sendMessage("removeWebCamPreview");
                        }
                    }
                    break;

                case 'video_input_changed':
                    app.sendMessage("reloadCameraIframe");
                    break;

                case 'abortUpload':

                    if (app.uploader.xhr)
                        app.uploader.xhr.abort();
                    break;

                case 'isWpPage':
                    app.isWpPage = true;
                    break;

                case 'loadPopupDependencies':
                    app.loadPopupDependencies();
                    break;

                case 'checkUploadIframeExist':
                    app.checkUploadIframeExist();
                    break;

                case 'checkAssetsIframeExist':
                    app.checkAssetsIframeExist();
                    break;

                case 'checkUserStatus':
                    app.checkUserStatus(request.upload_url);
                    break;
                case 'checkUserStatusAjax':
                    app.checkUserStatusAjax(request.ajax_url);
                    break;
                    

                case 'unregisteredUserStatus':
                    app.unregisteredUserStatus()
                    break;

                case 'checkWordpressPage':
                    app.checkWordpressPage()
                    break;

                case 'requestDeviceAccess':
                    app.requestDeviceAccess()
                    break;

                case 'createTab':
                    app.createTab(request.url);
                    break;

                case 'sendEventGmail':
                    app.sendEventGmail(request.data);
                    break;

                case 'appendPopupFromGmail':
                    app.sendMessage('appendPopup');
                    break;

                case 'loadTags':
                    app.loadTags();
                    break;

                case 'loadGalleries':
                    app.loadGalleries(request.page);
                    break;

                case 'loadByTag':
                    app.loadByTag(request.tag,request.page)
                    break;

                case 'deleteFile':
                    app.deleteFile(request);
                    break;

                case 'showNotification':
                    app.showNotification(request.message,request.title || '');
                    break;
                case 'setDefaultDomain':
                    app.default_domain = request.default_domain;
                    app.defaults = request.defaults;
                    break;
            }
        });
    },

    bindOnClicked: function () {
        chrome.browserAction.onClicked.addListener(function (tab) {
            if (chrome.runtime.lastError  ) {
                return;
            }
            app.isCanceled = false;
            if(app.pageIsLoaded){
                if(app.screenRecordingPopup && !app.recordingState.isRecording) {
                    app.showNotification("Screen share popup already opened.",'Warning');
                    return
                }
                if(tab.url.indexOf('chrome://') > -1){
                    app.showNotification("We are not able to record the current tab you are in. Try recording a different web page.");
                }

                if (app.appState != "recording") {
                    app.sendMessage('appendPopup');
                }
                
                if (app.appState == "recording") {
                    app.stopScreenRecording();
                } else if (app.appState == "waiting") {
                    app.sendMessage("stopWaiting");
                }
            }else{
                app.showNotification("Waiting for page loading!\nTry again after loading the page")
            }

        });
    },

    bindOnActiveChanged: function () {
        chrome.tabs.onActiveChanged.addListener(function (tabId, changeInfo, tab) {
            clearTimeout(injectContentScript);
            if (chrome.runtime.lastError || (app.sourceType != 'screen' && app.recordingState.isRecording)) {
                return;
            }

            
            app.sendMessage('checkUserStatus');
            if(!app.recordingState.isRecording){
                app.sendMessage('closePopup',null,function(){},'*'); /* close for all tabs*/
            }
           
            if(!app.recordingState.isRecording){
                app.sendMessage('removeSmallWebCamPreview',null,function(){},'*');                    
                app.sendMessage('removeWebCamPreview',null,function(){},'*');                
                app.webCamType = null;
            }
            if (app.recordingState.isRecording ) {
                // if(app.webCamType == 'appendSmallWebCamPreview'){
                       
                // }
                // if(app.recordingState.isDesktopCapture){
                    // chrome.tabs.query({}, function (tabs) {
                    //     if (chrome.runtime.lastError) {
                    //         return;
                    //     }
                    //     for (var i = 0; i < tabs.length; ++i) {
                    //         if (tabs[i].id != tabId) {
                    //             chrome.tabs.executeScript(tabs[i].id, { file: "js/removeHtml.js" }, function (results) {
                    //                 if (chrome.runtime.lastError) {
                    //                     return;
                    //                 } else {
                    //                 }
                    //             });
                    //         }

                    //     }
                        
                    // });
                    chrome.storage.sync.get(null, function (items) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                        chrome.tabs.query({}, function (tabs) {

                            if (chrome.runtime.lastError) {

                                return;
                            }
                            if(items.cameraEnabled == true && items.tab != 'webcam'){
                                app.sendMessage('appendRecortingSetings');
                            }else {
                                app.sendMessage('appendDrawer');
                            }
                            for (var i = 0; i < tabs.length; ++i) {
                                chrome.tabs.executeScript(tabs[i].id, { file: "js/removeHtml.js" }, function (results) {
                                    if (chrome.runtime.lastError) {
                                        return;
                                    } else {
                                    }
                                });
                            }
                        });
                            app.webCamType = null;
                        
                    })
                // }
                


            }

           var injectContentScript =  setTimeout(function () {
                app.askToInjectContentScript();
            }, 5000)
        });
    },

    bindOnRemoved: function () {
        chrome.tabs.onRemoved.addListener(function (tabid, removed) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (tabid === app.currentTabId && app.recordingState.isWebCamCapture && app.recordingState.isRecording) {
                app.stopScreenRecording();
            }
        })
    },

    bindOnConnect: function () {
        chrome.extension.onConnect.addListener(function (port) {
            if (chrome.runtime.lastError) {
                return;
            }
            port.onDisconnect.addListener(function (msg) {
                app.sendMessage("removeIframe");
            });
        });

        chrome.windows.onFocusChanged.addListener(function (window) {
            if (chrome.runtime.lastError) {
                return;
            }
            app.checkDevicePermissions();
            if(!app.recordingState.isRecording) {
                app.sendMessage("removeSmallWebCamPreview");
                app.sendMessage("removeWebCamPreview");
            }
        });
    },

    bindOnUpdated: function () {
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
          console.log({tabId}, {changeInfo}, {tab})
            if (chrome.runtime.lastError) {
                return;
            }
            if (changeInfo.status == "complete") {
                app.pageIsLoaded = true;
                if(app.recorder != null && app.recorder.state == 'recording' ){
                  
                        chrome.storage.sync.get(null, function (items) {
                            if(app.sourceType == 'screen'){
                                if(items.cameraEnabled == true && items.tab != 'webcam'){
                                    app.sendMessage('appendRecortingSetings', null, tabId);
                                }else {
                                    app.sendMessage('appendDrawer', null, tabId);
                                }
                            }else {
                                        if (app.activeTabId == tabId) {
                                            if(items.cameraEnabled == true && items.tab != 'webcam'){
                                                app.sendMessage('appendRecortingSetings', null, tabId);
                                            }else {
                                                app.sendMessage('appendDrawer', null, tabId);
                                            }
                                        }

                            }
                            
                        })
                }
                if(typeof tab.url != "undefined"){
                    if(tab.url.indexOf(".ariticapp.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'aritic'}, null, tabId)
                    }
                    if(tab.url.indexOf(".pipedrive.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'pipedrive'}, null, tabId)
                    }
                    
                    if(tab.url.indexOf(".hubspot.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'hubspot'}, null, tabId)
                    }
    
                    if(tab.url.indexOf(".close.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'close'}, null, tabId)
                    }
                    
                    if(tab.url.indexOf(".sugarcrm.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'sugar'}, null, tabId)
                    }
    
                    if(tab.url.indexOf(".zoho.com") > -1){
                        app.sendMessage("pageLoaded", {'source':'zoho'}, null, tabId)
                    }
                }
                
                if (typeof tab.openerTabId == "undefined") {
                    var ap = false;
                    if ((app.recordingState.isDesktopCapture || (app.currentTabId == tabId)) && app.recordingState.isRecording) {
                        ap = true;
                    }
                    app.askToInjectContentScript(ap);
                }
            }
        });
    },

    bindOnInstalled: function () {
        chrome.runtime.onInstalled.addListener(function (object) {
            if (chrome.runtime.lastError) {
                return;
            }

            chrome.tabs.query({}, function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                for (var i = 0; i < tabs.length; ++i) {
                        chrome.tabs.executeScript(tabs[i].id, { file: "js/removeHtml.js" }, function (results) {
                            if (chrome.runtime.lastError) {
                                return;
                            } else {
                            }
                        });
                }
            });
            chrome.tabs.create({ url: "https://www.cincopa.com/rectrace/chrome_setup?afc=rectrace,post" }, function (tab) {
                if (chrome.runtime.lastError) {
                    return;
                }

            });
            chrome.tabs.query({active: false}, function (tabs) {
                for(let i = 0; i < tabs.length; i++){
                    app.loadContent[i] = {id:  tabs[i].id,lodaedContent: false }
                }
            })
        });
    },

    getChromeVersion: function () {
        var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        return raw ? parseInt(raw[2], 10) : 52;
    },

    captureTab: function (isNoAudio) {
        var audioOptions = true;
        chrome.storage.sync.get(null, function (items) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (items['audio-input']) {
                audioOptions = {
                    optional: [
                        { sourceId: items['audio-input'] }
                    ]
                }
            }
            var resolution = items['video-resolution'] || "1080";
            var maxResolution = app.getMaxResolution(resolution);
            var constraints = {
                audio: isNoAudio === true ? false : true,
                video: true,
                videoConstraints: {
                    mandatory: {
                        minWidth: 16,
                        minHeight: 9,
                        maxWidth: maxResolution.width,
                        maxHeight: maxResolution.height,
                        maxFrameRate: 60,
                        minFrameRate: 25,
                        googLeakyBucket: true,
                        googNoiseReduction: true
                    },
                }
            };

            chrome.tabCapture.capture(constraints, function (stream) {
                
                if (chrome.runtime.lastError) {
                    return;
                }
                app.gotTabCaptureStream(stream, constraints);
            });
        })

    },

    gotTabCaptureStream: function (stream, constraints) {
        if (!stream) {
            if (constraints.audio === true) {
                app.captureTab(true);
                return;
            }
            setTimeout(function () {
                app.sendMessage("stopStream");
                app.resetDefaults();
            }, 50)
            console.log('Error starting tab capture: ' + (chrome.runtime.lastError.message || 'UNKNOWN'));
            return;
        }
        app.currentStream = stream;
    },

    startTabRecording: function () {
        app.gotStream(app.currentStream);
    },

    getMaxResolution: function (resolution) {
        switch (resolution) {
            case "1080":
                return {
                    width: 1920,
                    height: 1080
                };
            case "720":
                return {
                    width: 1280,
                    height: 720
                };
            case "480":
                return {
                    width: 896,
                    height: 504
                };
            case "360":
                return {
                    width: 640,
                    height: 360
                }
        }
    },

    gotStream: function (stream) {
        app.currentStream = stream;
        var constraints = {};
        if (app.recordingInfo.enableTabAudio) {
            var audioOptions = true;
            chrome.storage.sync.get(null, function (items) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (items['audio-input']) {
                    audioOptions = {
                        optional: [
                            { sourceId: items['audio-input'] }
                        ]
                    }
                } else {
                    audioOptions = {
                        mandatory: {
                            googAutoGainControl: !0,
                            googEchoCancellation: !0,
                            googHighpassFilter: !0,
                            googNoiseSuppression: !0
                        }
                    }
                }
                constraints.audio = audioOptions;
                constraints.video = false;
                navigator.webkitGetUserMedia(constraints, app.addtrack, app.getUserMediaError);
            })
            return;
        };

        app.record(stream);
    },

    addtrack: function (stream) {
        if (!app.currentStream) return;
        app.currentStream.addTrack(stream.getAudioTracks()[0]);
        app.record(app.currentStream);
    },

    stopScreenRecording: function () {
        app.recordingState.isRecording = false;
        //app.recorder.resume();
        clearInterval(app.requestDataInterval);
        try {
            app.recorder.stop();
        } catch (ex) {
            console.log(ex);
            if (app.recordingState.isFailed) {
                app.resetDefaults();
            }
        }

    },

    askToStopExternalStreams: function () {
        if (app.recordingState.isDesktopCapture) {
            app.sendMessage("stopStream", null, undefined, "*");
        } else {
            if (app.currentTabId) {
                app.sendMessage("stopStream", null, undefined, app.currentTabId);
            }
        }
    },

    askToStartStopWatch: function () {
        // if(app.recordingState.isDesktopCapture){
        // 	app.sendMessage("startStopWatch");
        // } else {
        // 	if(app.currentTabId){
        // 		sendMessage("startStopWatch", null, undefined, app.currentTabId);
        // 	}
        // }
    },
    captureDesktop: function () {
        if (app.recordingState.isRecording) {
            return;
        }
        if (app.recorder && app.recorder.stream && app.recorder.stream.onended) {
            app.recorder.stream.onended();
            return;
        }

        var screenSources = ['screen'];

        try {
            console.log(chrome.desktopCapture.chooseDesktopMedia(screenSources, app.onAccessApproved));
            app.screenRecordingPopup = true;
        } catch (e) {
            app.getUserMediaError();
        }
    },

    onAccessApproved: function (chromeMediaSourceId) {
        app.chromeMediaSourceID = chromeMediaSourceId;
        if (!app.chromeMediaSourceID || !app.chromeMediaSourceID.toString().length) {
            app.screenRecordingPopup = false;
            app.sendMessage("stopStream");
            app.resetDefaults();
            return;
        }
        if (app.currentTabId) {
            app.sendMessage("appendRecordingHtml", { type: "screen" }, undefined, app.currentTabId);
        } else {
            app.sendMessage("appendRecordingHtml", { type: "screen" });
        }
    },

    getUserMediaError: function (err) {
        if (!app.recordingInfo.alreadyHadGUMError) {
            app.recordingInfo.alreadyHadGUMError = true;
            app.recordingState.isRecording = false;
            app.resetDefaults();
            return;
        }
    },

    resetDefaults: function (stopTrack) {
        if (stopTrack && app.currentStream) {
            var tracks = app.currentStream.getTracks();
            if (tracks) {
                for (var i = 0; i < tracks.length; ++i) {
                    tracks[i].stop();
                }
            }
        }

        app.screenRecordingPopup = false;
        app.chunkedUploader = null,
        app.chunkes = [],
        app.chunkBlob = null,
        app.chunkIsWaiting = false;
        app.recordingState.startTime = null;
        app.recordingState.tempTime = null;
        app.recorder = app.chromeMediaSourceID = app.desktopMediaRequestId = null;
        app.currentStream = null;
        app.recordingState.recordingType = null;
        app.recordingState.isRecording = false;
        app.recordingState.isFailed = false;
        app.recordingPageTitle = "";
        app.appState = "default";
        app.recordingState.isDesktopCapture = app.recordingState.isWebCamCapture = false;
        app.rrid = app.uploadTrigger = null;
        app.isWpPage = false;
        app.recordedDuration = 0;
        chrome.browserAction.setBadgeText({ text: "" });
    },

    startDesktopCapture: function () {
        chrome.storage.sync.get(null, function (items) {
            if (chrome.runtime.lastError) {
                return;
            }
            var resolution = items['video-resolution'] || "1080";
            var maxResolution = app.getMaxResolution(resolution);
            var constraints = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: app.chromeMediaSourceID,
                        minWidth: 16,
                        minHeight: 9,
                        maxWidth: maxResolution.width,
                        maxHeight: maxResolution.height
                    },
                    optional: []
                }
            };


            app.recordingState.isDesktopCapture = true;
            navigator.webkitGetUserMedia(constraints, app.gotStream, app.getUserMediaError);
        })
    },

    startWebCamCapture: function () {
        app.recordingState.isWebCamCapture = true;
        var videoOptions = true;
        chrome.storage.sync.get(null, function (items) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (items['video-input']) {
                videoOptions = {
                    optional: [
                        { sourceId: items['video-input'] }
                    ]
                }
            }
            var resolution = items['video-resolution'] || "1080";
            var maxResolution = app.getMaxResolution(resolution);
            var constraints = {
                audio: false,
                video: videoOptions,
                videoConstraints: {
                    mandatory: {
                        minWidth: 16,
                        minHeight: 9,
                        maxWidth: maxResolution.width,
                        maxHeight: maxResolution.height,
                        maxFrameRate: 60,
                        minFrameRate: 25
                    },
                }
            };

            navigator.webkitGetUserMedia(constraints, app.gotStream, app.getUserMediaError);
        })
    },

    pauseRecording: function () {
        if (app.recorder) {

            app.recordingState.tempTime = app.recordingState.tempTime + ((Date.now() - app.recordingState.startTime) / 1000);
            app.recordingState.startTime = null;
            app.recorder.pause();
            app.sendMessage('recordPaused');
        }
    },
    muteRecording: function () {
        if (app.recorder && app.recorder.stream &&  app.recorder.stream.getAudioTracks()) {
            app.recorder.stream.getAudioTracks()[0].enabled = false;
        }
    },
    unmuteRecording: function () {
        if (app.recorder && app.recorder.stream &&  app.recorder.stream.getAudioTracks()) {
            app.recorder.stream.getAudioTracks()[0].enabled = true;
        }
    },

    resumeRecording: function () {
        if (app.recorder ) {
            app.recordingState.startTime = new Date();
            app.recorder.resume();
            app.sendMessage('recordResume');
        }
    },

    refreshRecording: function () {
        if (app.recorder) {

            clearInterval(app.requestDataInterval);
            app.resetDefaults();
            app.startWebCamCapture();
        }
    },

    record: function (stream) {
        chrome.storage.sync.get('microphoneEnabled', function (items) {
            


            var options = {
                disableLogs: false
            };
            if (app.recordingInfo.enableTabAudio) {
                options.audioBitsPerSecond = 128000;
                options.videoBitsPerSecond = 2200000;
            }
    
            options.mimeType = 'video/webm;codecs=vp8';
            app.recorder = new MediaRecorder(stream, options);
            app.recordingState.startTime = Date.now();
            try {
                app.recorder.start();
                app.requestData();
                app.recordingInfo.alreadyHadGUMError = false;
            } catch (e) {
                app.getUserMediaError();
            }
            app.recorder.stream = stream;
            if(!items.microphoneEnabled){
                if (  stream.getAudioTracks().length) {
                    app.recorder.stream.getAudioTracks()[0].enabled = false;
                }
            }else {
                if ( stream.getAudioTracks().length) {
                    app.recorder.stream.getAudioTracks()[0].enabled = true;
                }
            }
    
            app.recordingState.isRecording = true;
            app.recordingState.isFailed = false;
            app.appState = "recording";
            chrome.browserAction.setBadgeText({ text: "REC" });
            chrome.browserAction.setBadgeBackgroundColor({ color: [238, 31, 107, 1] });
            chrome.browserAction.setPopup({ popup: '' });
    
            app.askToStartStopWatch();
            app.onRecording();
            app.recorder.stream.onended = function () {
                if (app.recorder && app.recorder.stream) {
                    app.recorder.stream.onended = function () { };
                }
    
                app.stopScreenRecording();
            };
    
            if (app.recorder.stream.getVideoTracks()[0]) {
                app.recorder.stream.getVideoTracks()[0].onended = function () {
                    if (app.recorder && app.recorder.stream && app.recorder.stream.onended) {
                        app.recorder.stream.onended();
                    }
                };
            }
            if (app.recorder.stream.getAudioTracks()[0]) {
                app.recorder.stream.getAudioTracks()[0].onended = function () {
                    if (app.recorder && app.recorder.stream && app.recorder.stream.onended) {
                        app.recorder.stream.onended();
                    }
                };
            }
    
            app.recorder.ondataavailable = function (blob) {
                if (app.recordingState.isFailed || app.isCanceled) {
                    app.resetDefaults();
                    return;
                }
                app.chunkes.push(blob.data)
                app.chunkBlob = new Blob(app.chunkes, { type: 'video/webm;codecs=vp8' });
                var fileName = "Rectrace record " + Math.round(Math.random() * (9999999 - 1000000) + 1000000);
                var file = new File([app.chunkBlob], fileName + '.webm', {
                    type: 'video/webm;codecs=vp8'
                });
                
                if (app.upload_url) {
                    var isLast = !app.recordingState.isRecording;
                    file.isLast = isLast;
                    if (!app.chunkedUploader) {
                        app.chunkedUploader = new ChunkedUploader(file, {
                            fileName: fileName + '.webm',
                            url: app.upload_url
                        })
                    } else {
                        file.name = app.chunkedUploader.file.name;
                        app.chunkedUploader.file = file;
                    }
                    if (app.chunkIsWaiting) {
                        if (app.chunkedUploader.range_start + app.chunkedUploader.chunk_size < app.chunkedUploader.file.size) {
                            app.chunkedUploader.range_end = app.chunkedUploader.range_start + app.chunkedUploader.chunk_size;
                            app.chunkIsWaiting = false;
                            app.chunkedUploader._upload(app.chunkedUploader);
                        } else if (app.chunkedUploader.file.isLast && (app.chunkedUploader.range_start + app.chunkedUploader.chunk_size >= app.chunkedUploader.file.size)) {
                            app.chunkedUploader.range_end = app.chunkedUploader.file.size;
                            app.chunkIsWaiting = false;
                            app.chunkedUploader._upload(app.chunkedUploader);
                        } else {
                            app.chunkIsWaiting = true;
                        }
                    }
                } else {
                    if(!app.isCanceled) {
                        app.showNotification("Something went worng with upload!",'Error!')
                        app.disableShowNotification = true;
                        if(!app.recordingState.isRecording){
                            var now = Date.now();
                            var duration = 0;
                            if(app.recordingState.startTime){
                                duration = (now - app.recordingState.startTime) / 1000;
                            }
                            duration += app.recordingState.tempTime;
        
                            clearTimeout(app.sharePageTimer);
                            app.sharePageTimer = setTimeout(function(){
                                app.openUploadPage(file, "video", duration)
                            }, 1500);
                        }
                    }

                }
    
                
    
                var now = Date.now();
                var duration = 0;
    
                if(app.recordingState.startTime){
                    duration = (now - app.recordingState.startTime) / 1000;
                }
                duration += app.recordingState.tempTime; 
    
                if(duration >= app.recordingInfo.maxRecordMin * 60){ /* make seconds to compare */
                    app.stopScreenRecording();
                    app.showLimitNotification = true;
                }
            };
    
            app.recorder.onstop = function () {
                app.askToStopExternalStreams();
                if (!app.recorder) return;
    
    
                var tracks = app.recorder.stream.getTracks();
                for (var i = 0; i < tracks.length; ++i) {
                    tracks[i].stop();
                }
    
                if (app.recordingState.isFailed) {
                    app.resetDefaults();
                    return;
                }
    
    
                /* calculate duration on stop */
                var now = Date.now();
                var duration = 0;
                if(app.recordingState.startTime){
                    duration = (now - app.recordingState.startTime) / 1000;
                }
                duration += app.recordingState.tempTime;            
                app.recordedDuration = duration;
                /* end duration calculation */
    
                if (app.uploadTrigger != "assetsIframe" && !app.isWpPage) {
                    if(app.showLimitNotification){
                        app.showNotification("Your recording limit is expired.\nPreview page will appear shortly");
                        app.showLimitNotification = false;
                    }else{
                        if(!app.disableShowNotification){
                            app.disableShowNotification = false;
                            app.showNotification("Preview page will appear shortly");
                            if(app.chunkedUploader){
                                if(app.chunkedUploader.try_again_count >= app.try_again_count || navigator.onLine == false){
                                    app.chunkedUploader._uploadFail(app.chunkedUploader, app.chunkedUploader.upload_request.responseText.toLowerCase())();
                                }else if(app.chunkedUploader.uploadWaiting){
                                    app.chunkedUploader.try_again_count++;
                                    app.chunkedUploader._tryAgainUpload(app.chunkedUploader);  
                                }
                            }
                        }
                    }
                }
                if (app.upload_url) {
                    chrome.browserAction.setBadgeText({ text: "uploading" });
                    chrome.browserAction.setPopup({ popup: '' });
                }
            }
        })
        
    },

    requestData: function () {
        if (app.upload_url) {
            app.requestDataInterval = setInterval(function () {
                if(app.recorder && app.recorder.state && app.recorder.state != 'inactive'){
                    app.recorder.requestData();
                }
            }, 3000)
        }
    },

    onRecording: function () {
      if (app.recordingState.isRecording) {
            setTimeout(app.onRecording, 800);
            return;
        }
    },

    openRectracePage: function (resid, id) {
        var receiver;
        if (app.uploadTrigger == "assetsIframe" || app.isWpPage) {
            app.resetDefaults();
            return;
        } else {
            var currentPageTitle = encodeURIComponent(app.recordingPageTitle);
            app.sendAjax("https://www.cincopa.com/media-platform/wizard2/library_ajax.aspx?cmd=updateid&rid=" + id + "&caption=" + currentPageTitle, function () {
                chrome.storage.sync.get(null, function (items) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    receiver = window.open('https://'+app.default_domain+'/watch/' + app.defaults.video + "!" + resid + '?ext=true');
                    app.currentTabId = null;
                })
            }, function () {
                chrome.storage.sync.get(null, function (items) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    receiver = window.open('https://'+app.default_domain+'/watch/' + app.defaults.video + "!" + resid + '?ext=true');
                    app.currentTabId = null;
                })
            })
        }
        app.resetDefaults();
    },

    openUploadPage: function(file, type, duration){
        var receiver;
        var currentPageTitle = app.recordingPageTitle;
        chrome.storage.sync.get(null, function(items) {
            receiver = window.open('receiver/receiver.html');
            receiver.currentPageTitle = currentPageTitle;
            if(type == "video"){
                receiver.currentVideoFile = file;
                receiver.currentVideoDuration = duration;
            } else if (type == "image"){
                receiver.currentImageDataURI = file;
            }
            app.currentTabId = null;
        })
        app.resetDefaults();
    },

    sendAjax: function (url, cb, err,type,xhrFields,dataType,cache) {
        xhrFields = xhrFields || false;
        dataType = dataType || false;
        type = type || "GET"; 
        var xhr = new XMLHttpRequest();
        xhr.open(type, url);
        if(xhrFields){
            xhr.withCredentials = true;
        }
        if(dataType){
            xhr.responseType='json'
        }
        if(cache){
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        }
        xhr.onload = function () {
            if (xhr.status === 200) {
                if (typeof cb === "function") {
                    cb(xhr)
                }
            }
            else {
                if (typeof err === "function") {
                    err(xhr)
                }
            }
        };
        xhr.send();
    },

    sendMessage: function (key, additional, callback, tabId) {
        var options = tabId ? {} : { active: true, currentWindow: true };
        chrome.tabs.query(
            options,
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (!tabs[0]) return;
                var params = {};
                params.key = key;
                if (additional) {
                    for (var i in additional) {
                        params[i] = additional[i];
                    }
                }
                if (tabId !== "*") {
                    chrome.tabs.sendMessage(tabId ? tabId : tabs[0].id, params, function (response) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                        if (typeof callback != "undefined") {
                            callback(response);
                        }
                    });
                } else {
                    var cbDone = false;
                    for (var t = 0; t < tabs.length; t++) {

                        chrome.tabs.sendMessage(tabs[t].id, params, function (response) {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                            if (typeof callback != "undefined") {
                                if (!cbDone) {
                                    callback(response);
                                    cbDone = true;
                                }
                            }
                        });
                    }
                }



            }
        );
    },

    getRecordingPageTitle: function () {
        app.recordingPageTitle = "";
        app.sendMessage("getTitle", null, function (response) {
            app.recordingPageTitle = response ? response.title : "";
        });
    },

    getCurrentTab: function () {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (tabs && tabs[0]) app.currentTabId = tabs[0].id;
            }
        );
    },

    askToInjectContentScript: function (isReload) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { ping: true }, function (response) {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError)
                        return;
                    }
                    if(app.sourceType != 'screen'){
                        return
                    }
                    if (response && response.pong) {

                        if (app.recordingState.isRecording /*&& app.recordingState.isDesktopCapture*/) {
                            app.askToAppendRecordingHtml();
                        } else if (isReload) {
                            app.askToAppendRecordingHtml();
                        }

                    } else {
                        chrome.tabs.executeScript(tabs[0].id, { file: "js/content.js" }, function (results) {
                           
                            if (chrome.runtime.lastError) {
                                return;
                            } else {
                                if (app.recordingState.isRecording  /*&& app.recordingState.isDesktopCapture*/) {
                                    app.askToAppendRecordingHtml();
                                } else if (isReload) {
                                    app.askToAppendRecordingHtml();
                                }
                            }
                        });

                    }
                    chrome.tabs.executeScript(tabs[0].id, { file: "js/inject.js" }, function (results) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                });
                app.checkDevicePermissions();

                if (app.appState === "recording") {

                    if (app.webCamType === "appendSmallWebCamPreview") {
                        chrome.storage.sync.get(null, function (items) {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                            chrome.tabs.query(
                                { active: true, currentWindow: true },
                                function (tabs) {
                                    if (chrome.runtime.lastError) {
                                        return;
                                    }
                                    if (tabs && tabs[0] && app.currentTabId &&
                                        tabs[0].id === app.currentTabId &&
                                        items["cameraEnabled"] && items["cameraPermitted"]
                                    ) {
                                        app.sendMessage("appendSmallWebCamPreview");
                                    }
                                }
                            );
                        })
                    } else if (app.webCamType === "appendWebCamPreview") {
                        app.sendMessage("appendWebCamPreview");
                    }
                }
            }

        });
    },

    askToAppendRecordingHtml: function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (tabs[0]) {
                var now = Date.now();
                var time = 0;
                if (app.recordingState.startTime) {
                    time = (now - app.recordingState.startTime) / 1000;
                }
                time += app.recordingState.tempTime;
                chrome.tabs.sendMessage(tabs[0].id, {
                    appendHtml: true,
                    time: time,
                    isWebCamRecording: app.recordingState.isWebCamCapture
                }, function (response) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            }
        });
    },

    detectDevicePermission: function () {
        return {
            hasMicrophone: DetectRTC.hasMicrophone,
            isWebsiteHasMicrophonePermissions: DetectRTC.isWebsiteHasMicrophonePermissions,
            hasWebcam: DetectRTC.hasWebcam,
            isWebsiteHasWebcamPermissions: DetectRTC.isWebsiteHasWebcamPermissions,
            videoInputs: DetectRTC.videoInputDevices,
            audioInputs: DetectRTC.audioInputDevices,
        }
    },

    showNotification: function (message,title) {
		title  = title || 'processing';
        chrome.notifications.create(null, {
            type: "basic",
            title: title,
            message: message,
            iconUrl: "img/logo_32.png"
        }, function () {
            if (chrome.runtime.lastError) {
                return;
            }
        });
    },

    sendUploadInfoToPage: function (data) {
        var obj = {
            "data": data
        }
        if (app.currentTabId) {
            app.sendMessage("uploadProcess", obj, undefined, app.currentTabId);
        } else {
            app.sendMessage("uploadProcess", obj);
        }
    }
};

app.init();

function ChunkedUploader(file, options) {
    // options - {fileName : "", url: ""}
    var self = this;
    this.upload_request = new XMLHttpRequest();
    this.upload_request.onload = this._uploadSuccess(this);
    this.upload_error_count = 0;
    this.upload_failed_count = 0;
    this.file = file;
    this.upload_request.onerror = this._uploadFail(this);
    this.upload_request.onabort = this._uploadFail(this);
    this.upload_request.timeout = 2 * 60 * 1000;

    this.upload_request.ontimeout = this._uploadFail(this);

    var eventSource = this.upload_request.upload || this.upload_request;
    eventSource.onprogress = this._uploadProgress(this);
    this.options = options;
    this.chunk_size = (1024 * 100);
    this.slice_method = 'slice';
    this.range_start = 0;
    this.lastPosition = 0;
    this.try_again_count = 0;
    this.timer;
    if (this.range_start + this.chunk_size <= this.file.size) {
        this.range_end = this.range_start + this.chunk_size;
        this._upload(this);
    } else {
        app.chunkIsWaiting = true;
    }

    window.addEventListener('offline', function(e) { 
        self.networkState = 'offline';
        console.log('network state offline')

     });
    window.addEventListener('online', function(e) {
        if(app.chunkedUploader){
            if((typeof self.percentComplete == 'undefined' || self.percentComplete < 100) && self.networkState == 'offline'){
                if(self.try_again_count < 3){
                    app.showNotification("Internet connection back!\nTrying to continue upload");
                    self.try_again_count++;
                    self._tryAgainUpload(self);                
                }else{                
                    self._uploadFail(self, self.upload_request.responseText.toLowerCase())();
                    self.try_again_count = 0;
                    clearTimeout(app.sharePageTimer);
                    app.sharePageTimer = setTimeout(function(){
                        app.openUploadPage(self.file, "video", app.recordedDuration)
                    }, 1500);
                }
            }
        }
        self.networkState = 'online';

     });

};

ChunkedUploader.prototype = {

    _upload: function (r) {
        var self = r;
        chunk = r.file[r.slice_method](r.range_start, r.range_end);
        setTimeout(function () {

            var uploadOptions = Object.assign({}, r.options)

            r.upload_request.open('POST', r.options.url, true);
            r.upload_request.overrideMimeType('application/octet-stream');
            r.upload_request.setRequestHeader("Content-Type", "multipart/form-data");
            r.upload_request.setRequestHeader('X-FILE-NAME', encodeURIComponent(r.options.fileName));
            r.upload_request.setRequestHeader('Content-Range', 'bytes ' + r.range_start + '-' + r.range_end + (r.file.isLast ? '/' + r.file.size : ""));
            var reader = new FileReader();
            reader.onloadend = function (evt) {
                var blob = new Blob([reader.result], { type: chunk.type });
                r.upload_request.send(blob);
            };
            reader.readAsArrayBuffer(chunk);
        }, 20);
    },

    _uploadProgress: function (r) {
        var self = this;
        return function (e) {
            delete self.uploadWaiting;
            var position = e.position || e.loaded;
            if (typeof r.loaded == 'undefined') {
                r.loaded = 0;
            } else {
                r.loaded += (position - self.lastPosition);
            }
            self.lastPosition = position;
            if (!r.file.isLast) return true;

            var total = r.file.size;

            self.total = total;
            r.percentComplete = (r.loaded / total) * 99;
            var percent = Math.floor(r.percentComplete);
            chrome.browserAction.setBadgeText({ text: percent + "%" });
            chrome.browserAction.setPopup({ popup: '' });
        }
    },

    _uploadSuccess: function (r) {
        var self = r;
        return function () {
            if (r.upload_request.responseText.toLowerCase().indexOf('done') > -1) {
                r.upload_error_count = 0;
                r.upload_failed_count = 0;
                r.lastPosition = 0;
                var id = r._idFromResponse(r.upload_request.responseText);
                if (id) {
                    var resid = r._ridFromResponse(r.upload_request.responseText);
                    if (app.uploadTrigger == "assetsIframe" || app.isWpPage) {
                        app.sendUploadInfoToPage({
                            state: 'complete',
                            percentComplete: 100,
                            id: id,
                            resid: resid,
                            isWp: app.isWpPage
                        })
                        if (app.isWp)
                            app.showNotification("Upload has completed !")
                        app.currentTabId = null;
                        app.resetDefaults();
                    } else {
                        app.openRectracePage(resid, id);
                    }
                    return;
                }
                r.range_start = r.range_end;
                if (r.range_start + r.chunk_size < r.file.size) {
                    r.range_end = r.range_start + r.chunk_size;
                    app.chunkIsWaiting = false;
                    r._upload(r);
                } else if (r.file.isLast && r.range_start + r.chunk_size >= r.file.size) {
                    r.range_end = r.file.size;
                    r._upload(r);
                } else {
                    app.chunkIsWaiting = true;
                }
            } else {
                console.log(r.upload_request.responseText.toLowerCase(), "CHUNK ERROR CASE")
                r.upload_error_count++;      
                if(app.networkState != 'offline'){                             
                    if (r.upload_error_count <= 10) {
                        r._upload(r);
                    } else {
                        r._uploadFail(r, r.upload_request.responseText.toLowerCase())();
                        app.currentTabId = null;
                        app.resetDefaults();
                    }
                }
            }
        }

    },

    _uploadFail: function (r, resp) {
        var self = r;
        return function (e) {
            
            if(app.recordingState.isRecording){
                self.uploadWaiting = true;
                console.log('upload failed but recording still on');
                return;
            }

            if(self.try_again_count < app.try_again_count && self.upload_error_count <= 10){ /* when chunk already tried 10 times then no need to rettry anytghin */
                if(app.networkState == 'offline'){
                    console.log('waiting for connection');                    
                }else{
                    console.log('retrying to upload');
                    self.try_again_count++;
                    self._tryAgainUpload(self);
                }
                return ;
            }
          
            self.upload_error_count = 0;
            self.try_again_count = 0;


            if (resp && resp.indexOf('out of assets quota') > -1) {
                app.showNotification("You've reached your storage limit 🙂\nGet into your Cincopa account to free up room or upgrade!!");
            } else {
                app.showNotification("An error occurred during uploading !");
            }


            app.recordingState.isFailed = true;
            if(app.currentStream){
                var tracks = app.currentStream.getTracks();
                if (tracks) {
                    for (var i = 0; i < tracks.length; ++i) {
                        tracks[i].stop();
                    }
                }
            }

            /* open local file when upload failed */
            clearTimeout(app.sharePageTimer);
            var recordedDuration = app.recordedDuration;
            app.openUploadPage(self.file, "video", recordedDuration);

            app.stopScreenRecording();
        }
    },

    _cancelUpload: function (r) {
        var self = r;
        clearTimeout(self.timer);

        self.upload_failed_count = 0;
        self.upload_error_count = 0;
    },
    _abortUpload: function(r) {
        r.upload_request.onabort(r.file);

    },

    _tryAgainUpload: function (r) {
        var self = r;
        self._upload(r);
    },
    _ridFromResponse:function(resp){
        var rid = false;
        var resReg = resp.match(/new resource id (\d+) (.*)/); 
        if(resReg){
            rid = resReg[2];
        }	
        return rid;
    },
    _idFromResponse:function(resp){
        var id = false;
        var resReg = resp.match(/new resource id (\d+) (.*)/); 
        if(resReg){
            id = resReg[1];
        }
        return id;
    }
}