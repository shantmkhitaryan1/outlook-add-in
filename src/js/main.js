(function () {
    var RootElement = document.querySelector('rectrace-container').shadowRoot;
    var RootWrapper = $(RootElement).find('.rectraceExtWrapper');
    var default_domain, defaults;
    var app = {
        loginUrl: "https://www.cincopa.com/login_ajax.aspx",
        registerUrl: "https://www.cincopa.com/register_ajax.aspx",
        socialLinksUrl: "https://www.cincopa.com/rectrace/getsocials?disable_editor=y&continue=" + encodeURIComponent('https://www.cincopa.com/rectrace/chrome_setup?afc=rectrace,post'),
        loginStatusUrl: "https://www.cincopa.com/rectrace/getislogin?affdata=rectrace,rectrace-ext&disable_editor=y",
        isInsertPage: false,
        loggedIn:false,
        maxRecordMin:null,
        init: function () {
            if(!RootElement){
                RootElement = document.querySelector('rectrace-container').shadowRoot;
                RootWrapper = $(RootElement).find('.rectraceExtWrapper');
            }
            app.setDefaultState();
            app.checkUploadIframeExist();
            app.bindListeners();
            app.bindEvents();
        },

        checkingGmailPage: function () {
            if (
            ~window.location.href.indexOf('mail.google.com') ||
            ~window.location.href.indexOf('.ariticapp.com') ||
            ~window.location.href.indexOf('.pipedrive.com') ||
            ~window.location.href.indexOf('.hubspot.com') ||
            ~window.location.href.indexOf('.close.com') ||
            ~window.location.href.indexOf('.sugarcrm.com') ||
            ~window.location.href.indexOf('.zoho.com')
            ) {
                app.isInsertPage = true;
            } else {
                app.isInsertPage = false;
            }
        },

        bindEvents: function () {
            app.bindAuthEvents();
            app.bindDeviceEvents();
            app.bindRecordEvents();
            app.bindTabsEvents();
            app.bindPopupEvents();
            app.bindSettingsEvents();
        },

        bindAuthEvents: function () {
            $(RootElement).find('.logIn').on('click', function (e) {
                $(RootElement).find("#register").hide();
                $(RootElement).find("#login").show();
                $(RootElement).find(".header").show();
                $(RootElement).find(".register-header").hide();
                $(RootElement).find(".login-header").show();
            });

            $(RootElement).find('.register').on('click', function (e) {
                $(RootElement).find("#login").hide();
                $(RootElement).find("#register").show();
                $(RootElement).find(".header").show();
                $(RootElement).find(".register-header").show();
                $(RootElement).find(".login-header").hide();
            });

            $(RootElement).find('#loginBtn').on('click', function (e) {
                app.validate("#login");
            });

            $(RootElement).find('#registerBtn').on('click', function (e) {
                app.validate("#register");
            });

            $(RootElement).find('.openSignUp a').on('click', function (e) {
                e.preventDefault();
                var href = $(this).attr("data-href");
                if (href) {
                    // to background.js
                    chrome.extension.sendMessage({
                        action: 'createTab',
                        url: href
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                }
            })


            $(RootElement).on("click", '.upgrade_link', function () {

                var url = $(this).attr("data-href");
                // to background.js
                chrome.extension.sendMessage({
                    action: 'createTab',
                    url: url
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            })

            $(RootWrapper).on("click", ".logout", function () {
                app.logout();
            })
        },

        bindDeviceEvents: function () {
            $(RootElement).find('.mic').on('click', function (e) {
                if ($(this).hasClass("disabled")) return;
                var icon = $(this).find("i");
                var enabled = icon.hasClass("rt-icon-mic-on");
                if (enabled) {
                    icon.removeClass("rt-icon-mic-on").addClass("rt-icon-mic-off");
                    $(RootElement).find("#audio-inputs").attr("disabled", true);	
					app.removeEqualiser();								
                    
                } else {
                    icon.removeClass("rt-icon-mic-off").addClass("rt-icon-mic-on");
					app.appendEqualiser();
                    $(RootElement).find("#audio-inputs").attr("disabled", false);
                };

                app.setStorage("microphoneEnabled", !enabled);
            });

            $(RootElement).find('.camera').on('click', function (e) {
                // debugger
                if ($(this).hasClass("disabled")) return;
                var icon = $(this).find("i");
                var enabled = icon.hasClass("rt-icon-webcam-on");
                
                if (enabled) {
                    icon.removeClass("rt-icon-webcam-on").addClass("rt-icon-webcam-off");
                    $(RootElement).find("#video-inputs").attr("disabled", true);
                    if($(RootElement).find('.webcam').hasClass('active')  ){
                        $(RootElement).find('.record-popup-wrap-inner').addClass('btnDisabled');
                        $(RootElement).find('.recorder button.record').addClass('btnDisabled');
                    }
                } else  {
                    icon.removeClass("rt-icon-webcam-off").addClass("rt-icon-webcam-on");
                    $(RootElement).find("#video-inputs").attr("disabled", false);
                    if($(RootElement).find('.webcam') && !app.disabledRecBtn){
                        $(RootElement).find('.record-popup-wrap-inner').removeClass('btnDisabled');
                        $(RootElement).find('.recorder button.record').removeClass('btnDisabled');
                    }
                }
 
                app.setStorage("cameraEnabled", !enabled);
                setTimeout(function () {
                    if(enabled == true){
                        app.clearBigCam()
                    } 
                    var tab = $(RootElement).find('.tab-action.active').attr("data-action");
                    chrome.extension.sendMessage({
                        action: 'camera_clicked',
                        enabled: !enabled,
                        tab: tab
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                }, 300)
            });

            $(RootElement).find("#video-inputs").on("change", function () {
                app.setStorage("video-input", $(this).val());
                chrome.extension.sendMessage({
                    action: 'video_input_changed'
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            })

            $(RootElement).find("#audio-inputs").on("change", function () {
                app.setStorage("audio-input", $(this).val());
            })

            $(RootElement).find("#video-resolution").on("change", function () {
                app.setStorage("video-resolution", $(this).val());
            })

            $(RootElement).find(".allow-perm").on("click", function () {
                window.open(chrome.extension.getURL("html/permission.html"), "_blank");
            })
        },

        bindRecordEvents: function () {
            $(RootElement).find('.record-popup').on('click', function (e) {
                chrome.storage.sync.get(null, function (items) {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    var type = $(RootElement).find('.source .tab-action.active').attr("data-action");

                    var gotIt = items["gotIt"] === true ? true : false;
                    if (gotIt || type == "webcam" || (items.cameraPermitted && items.microphonePermitted)) {
                        var audioEnabled =  $(RootElement).find(".mic").hasClass("disabled") ? false : true;
						chrome.runtime.sendMessage({
                            action: 'capture',
                            type: type,
                            audio: audioEnabled,
                            maxRecordMin:app.maxRecordMin
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                            app.closePopup();
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            action: 'gotIt'
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        });
                        app.closePopup();
                    }
                })
            });

        },

        bindTabsEvents: function () {
            $(RootElement).find('.tab-action').on('click', function (e) {
                var old_active = $(RootElement).find('.tab-action.active').attr("data-action");
                if ($(RootElement).find(this).hasClass("active")) return;
                $(RootElement).find('.tab-action').removeClass("active");
                $(this).addClass("active");
                var tab = $(this).attr("data-action");
                var bigtab = $(this).parents('.rectraceExtWrapper').find('.big-tab-action.active').attr("data-actionbig");
                app.setStorage("tab", tab);
                if (old_active == tab || (old_active === "tab" && tab === "screen") || (old_active === "screen" && tab === "tab")) return;
                var webcamEnabled = !$(RootElement).find('.camera').hasClass("disabled") && $(RootElement).find('.camera i').hasClass("rt-icon-webcam-on");
                chrome.extension.sendMessage({
                    action: 'tab_clicked',
                    bigtab: bigtab,
                    tab: tab,
                    webCam: webcamEnabled
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            });

            $(RootElement).find('.big-tab-action').on('click', function () {
                var tab = $(RootElement).find('.tab-action.active').attr("data-action");
                var bigtab = $(this).attr("data-actionbig");
                if(bigtab === 'assets'){
                    app.removeEqualiser()
                }else{
                    chrome.storage.sync.get(null, function (items) {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                        var microphoneEnabled = items["microphoneEnabled"] === false ? false : true;
                        var icon = $(RootElement).find('.mic').find("i");
                        if(microphoneEnabled){
                            app.appendEqualiser();
                            icon.removeClass("rt-icon-mic-off").addClass("rt-icon-mic-on");
                        }else{
                            app.removeEqualiser()
                            icon.removeClass("rt-icon-mic-on").addClass("rt-icon-mic-off");
                        }
                    })
                }
                if ($(this).hasClass("active")) return;
                $(RootElement).find('.big-tab-action').removeClass("active");
                $(this).addClass("active");
                $(RootElement).find('.big_tab').removeClass('active');
                $(RootElement).find('.big_tab[data-actionbig=' + bigtab + ']').addClass('active');
                app.setStorage("bigtab", bigtab);
                var webcamEnabled = !$(RootElement).find('.camera').hasClass("disabled") && $(RootElement).find('.camera i').hasClass("rt-icon-webcam-on");
                chrome.extension.sendMessage({
                    action: 'tab_clicked',
                    bigtab: bigtab,
                    tab: tab,
                    webCam: webcamEnabled
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            })
        },

        bindPopupEvents: function () {            
            $(document).on('click', function (e) {
                var targetEl = e.target
                if (targetEl.tagName === 'RECTRACE-CONTAINER' || targetEl.classList[0] === 'rectrace-app-camera-big' || targetEl.id === 'rectrace-app-camera') return
                app.closePopup();
                
                if(window.cp_record_start == false) {
                    window.cp_rectrace_bigCam = false
                    app.clearBigCam()
                }

                
            })
        },

        clearBigCam: function () {
            if($(document.body).hasClass('rectrace-scale') == true) {
                document.body.classList.remove('rectrace-scale')
            }
            if($('#rectrace-app-camera-iframe').hasClass('clearRadius')){
                document.getElementById('rectrace-app-camera-iframe').classList.remove("clearRadius")
            }
            if($('#rectrace-app-camera').hasClass('bigCamera')){
                document.getElementById('rectrace-app-camera').classList.remove("bigCamera")
            }
        },

        bindSettingsEvents: function () {

            $(RootElement).find('.settings_btn').on('click', function (e) {
                app.showSettingsBox();
            });

            $(RootElement).find('.back_btn').on('click', function (e) {
                app.showRecordingBlock();
            });

            $(RootElement).find(".settings-box input[type='checkbox']").on("change", function () {
                var checked = $(this).is(":checked");
                app.setStorage($(this).attr("name"), checked);
            });

            $(RootElement).find(".settings-box input[name='highlightCursor']").on("change", function () {
                var checked = $(RootElement).find(".settings-box input[name='highlightCursor']:checked").val();
                app.setStorage("highlightCursor", checked);
            });

            $(RootElement).find(".settings-box input[type='text']").on("change", function () {
                app.setStorage($(this).attr("name"), $(this).val());
            });
        },

        bindListeners: function () {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (request.key == "setDevicePermissions") {
                    var perm = {};
                    perm.hasMicrophone = request.permissions.hasMicrophone;
                    perm.isWebsiteHasMicrophonePermissions = request.permissions.isWebsiteHasMicrophonePermissions;
                    perm.hasWebcam = request.permissions.hasWebcam;
                    perm.isWebsiteHasWebcamPermissions = request.permissions.isWebsiteHasWebcamPermissions;
                    perm.audioInputs = request.permissions.audioInputs;
                    perm.videoInputs = request.permissions.videoInputs;
                    app.setDevicePermissions(perm)
                } else if (request.key == 'checkUploadIframeExistSuccess') {
                    if (request.response && request.response.iframeCount) {
                        $(RootElement).find(".loading").hide();
                        app.showRecordingBlock();
                    } else {
                        // to background js 
                        chrome.extension.sendMessage({
                            action: 'checkAssetsIframeExist'
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        });
                    }
                } else if (request.key == 'checkAssetsIframeExistSuccess') {
                    if (request.r && request.r.iframeCount) {
                        $(RootElement).find(".loading").hide();
                        app.showRecordingBlock();
                    } else {
                        chrome.extension.sendMessage({
                            action: 'checkUserStatusAjax',
                            ajax_url: app.loginStatusUrl
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        })
                    }
                } else if (request.key == 'showIncognitoBox') {
                    $(RootElement).find(".loading").hide();
                    app.showIncognitoBox();
                    return;
                }else if (request.key == 'sendedUserStatus') {
                    app.checkUserStatus(request.data);
                    return;
                } else if (request.key == 'showExtensionBox') {
                    $(RootElement).find(".loading").hide();
                    app.showExtensionBox();
                    return;
                } else if (request.key == 'showRecordingBlock') {
                    $(RootElement).find(".loading").hide();
                    app.showRecordingBlock();
                } else if (request.key == 'sendIfWpPage') {
                    app.sendIfWpPage(request.upload_url);
                } else if (request.key == 'appendPopup'){
                    if($(RootElement).find('.rectraceExtWrapper').hasClass('fadeOut')){
                        app.closePopup();
                        
                        window.cp_rectrace_bigCam = false
                        app.clearBigCam()
                        
                    }else{
                        if($(RootElement).find('.big-tab-action.active').data('actionbig') === 'record'){
							app.showWebCamPreview();
                        }
                    }
                } else if (request.key == 'checkUserStatus'){
                    chrome.extension.sendMessage({
                        action: 'checkUserStatusAjax',
                        ajax_url: app.loginStatusUrl
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    })
                    // app.checkUserStatus();
                } else if(request.key == 'closePopup'){
                    app.closePopup();
                }else if( request.key === "appendEqualiser") {
                    app.appendEqualiser();
                }
            });
        },

        login: function () {
            var name = $.trim($(RootElement).find("#login input[name='login']").val());
            var password = $.trim($(RootElement).find("#login input[name='password']").val());
            app.ajaxLogin(name, password);
        },

        ajaxLogin: function (login, pass) {
            $(RootElement).find('.loading').show();
            $.ajax({
                url: app.loginUrl + "?password=" + encodeURIComponent(pass) + "&login=" + encodeURIComponent(login),
                method: "GET",
                cache: false,
                dataType: 'json',
                success: function (data) {
                    if (data.status == "error") {
                        $(RootElement).find(".errorContainer").text(data.error);
                        app.loggedIn = false;
                    } else if (data.status == 'ok') {
                        $(RootElement).find(".errorContainer").text("");
                        app.loggedIn = true;
						app.setDefaultState();
                        // window.location.reload();
                    }
                },
                error: function (err) {
                    console.log('err');
                },
                complete:function(){
                    chrome.extension.sendMessage({
                        action: 'checkUserStatusAjax',
                        ajax_url: app.loginStatusUrl
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    })
                    // app.checkUserStatus();
                }
            });
        },

        register: function () {
            var lastName, firstName;
            var nameString = $.trim($(RootElement).find("#register_name").val().replace(/\s{2,}/g, ' '));
            var lastSpaceIndex = nameString.lastIndexOf(" ");
            if (lastSpaceIndex == -1) {
                firstName = nameString;
                lastName = '';
            } else {
                lastName = nameString.slice(lastSpaceIndex + 1);
                firstName = $.trim(nameString.slice(0, lastSpaceIndex));
            }
            var plan = "&plan=30plustrial";
            var params = "password=" + encodeURIComponent($(RootElement).find("#register_password").val()) + "&email=" + encodeURIComponent($.trim($(RootElement).find("#register_email").val())) + "&first=" + encodeURIComponent(firstName) + "&last=" + encodeURIComponent(lastName) + plan;
            $.ajax({
                url: app.registerUrl + "?" + params,
                method: "GET",
                cache: false,
                dataType: 'json',
                success: function (data) {
                    if (data.status == "error") {
                        $(RootElement).find("#register_" + data.field).parent("p").removeClass('valid').addClass('error');
                        app.showError($(RootElement).find("#register_" + data.field), undefined, data.error);
                    } else if (data.status == 'ok') {
                        $(RootElement).find(".errorContainer").text("");
                        window.location.reload();
                    }
                },
                error: function (err) {
                    console.log(err);
                }
            });
        },

        logout: function () {
            $(RootElement).find('.loading').show();
            $.ajax("https://www.cincopa.com/?logout=true", {
                success:function(){
                    app.loggedIn = false;
                    app.removeEqualiser()
                },
                complete: function () {
                    chrome.extension.sendMessage({
                        action: 'checkUserStatusAjax',
                        ajax_url: app.loginStatusUrl
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    })
                    // app.checkUserStatus();
                }
            })
        },

        validate: function (selector) {
            var inputs = $(RootElement).find(selector + " input.required");
            var requiredLength = $(RootElement).find(selector + " input.required").length;

            for (i = 0; i < inputs.length; i++) {
                if ($.trim($(inputs[i]).val()) == "") {
                    $(inputs[i]).parent("p").removeClass('valid').addClass('error');
                    app.showError(inputs[i], "required");
                    continue;
                } else {
                    if (selector == "#login") {
                        $(inputs[i]).parent("p").removeClass('error').addClass('valid');
                        app.hideError(inputs[i]);
                    }
                }
                if (selector == "#register") {
                    if ($(inputs[i]).hasClass('email')) {
                        type = 'email';
                    } else if ($(inputs[i]).hasClass('password')) {
                        type = 'password';
                    }
                    if (app.validateByType(inputs[i], type)) {
                        $(inputs[i]).parent("p").removeClass('error').addClass('valid');
                        app.hideError(inputs[i]);
                    } else {
                        $(inputs[i]).parent("p").removeClass('valid').addClass('error');
                        app.showError(inputs[i], type);
                    }
                }

            }
            if (requiredLength != inputs.length) {
                console.log(':)))')
            } else {
                if (inputs.length == $(RootElement).find(selector + " .valid input.required").length) {
                    if (selector == "#register")
                        app.register()
                    else if (selector == "#login")
                        app.login()
                }
            }
        },

        validateByType: function (target, type) {
            if (type == 'email') {
                var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return regex.test($.trim($(RootElement).find(target).val()));
            } else if (type == 'password') {
                if ($.trim($(RootElement).find(target).val()).length < 5)
                    return false;
                else
                    return true;
            }

        },

        showError: function (target, type, errmsg) {
            app.hideError(target);
            var errorText;
            if (type == 'email') {
                errorText = "Invalid email"
            } else if (type == "password") {
                errorText = "Incorrect password";
            } else if (type == 'required') {
                errorText = "Required";
            } else if (type == undefined) {
                errorText = errmsg;
            }
            $(RootElement).find(target).before('<div class="fb-msg danger">' + errorText + '</div>')
        },

        hideError: function (target) {
            $(RootElement).find(target).prev('.danger').remove()
        },

        checkUploadIframeExist: function () {
            // to background js
            chrome.extension.sendMessage({
                action: 'checkUploadIframeExist'
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        },

        checkUserStatus: function (data) {
            if (window.location.search.indexOf("unregistered=y") > -1) {
                // to background js
                chrome.extension.sendMessage({
                    action: 'unregisteredUserStatus'
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                })
            } else {
                var data = JSON.parse(data)
                if(data.error){
                    chrome.extension.sendMessage({
                        action: 'showNotification',
                        message:'Something went wrong. Please reload the page.',
                        title: 'Oops!'
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                    alert('Something went wrong please refresh page');
                    console.log(err);
                }else {
                    
                    default_domain = data.default_domain;
                    defaults = data.defaults;

                    chrome.extension.sendMessage({
                        action: 'setDefaultDomain',
                        default_domain:default_domain,
                        defaults:defaults
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    })
                    var status = data.status == "True" ? true : false;
                    app.setEmail(data.email);
                    app.setUserName(data.user_short_name);
                    var upload_url = data.upload_url;
                    var videoCount = parseInt(data.video_count);
                    var maxVideos = parseInt(data.max_videos);
                    var max_record_min = parseInt(data['max-record-min']);
                    app.maxRecordMin = max_record_min;
                    if (( (maxVideos - videoCount) <= 0 && maxVideos != '-1')  ||  app.maxRecordMin <= 0) {   
                        app.disabledRecBtn = true;
                        upload_url = null;
                        app.showUpgrade();
                        app.hideLimitMin();
                    }else{
                        app.disabledRecBtn = false;                      
                        app.hideUpgrade();
                        app.showLimitMin('You can record up to '+(app.maxRecordMin <= 0 ? '0': app.maxRecordMin )+'min videos, <br /><a href="https://www.cincopa.com/pricing" target="_blank" class="upgrade_link">Upgrade</a> to record longer videos');
                    }
                    
                    if (status) {
                        // to background.js 

                        chrome.extension.sendMessage({
                            action: 'checkUserStatus',
                            upload_url: upload_url
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        })
                        $(RootElement).find(".loading").hide();
                        $(RootElement).find('.big_tabs').removeClass('hide');
                        app.checkingGmailPage();
                        if(!app.assetsTabIsActivated){
                            app.activateAssetsTab();
                            app.assetsTabIsActivated = true;
                        }
                    } else {

                        $(RootElement).find(".loading").hide();
                        $(RootElement).find('.big-tab-action[data-actionbig="record"]').addClass('active');
                        $(RootElement).find('.big-tab-action[data-actionbig="assets"]').removeClass('active');
                        $(RootElement).find('.reacord_tab_big').addClass('active');
                        $(RootElement).find('.assets_tab_big').removeClass('active');
                        $(RootElement).find('.big_tabs').addClass('hide');
                        chrome.extension.sendMessage({
                            action: 'removeAllCamPreviews',
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        })
                        app.showLoginButton();
                    }

                }
                
                       



            }

        },

        showRecordingBlock: function () {
            $(RootElement).find('.login-box').addClass("hide");
            $(RootElement).find(".capture-box").removeClass("hiddenRecorder");
            $(RootElement).find(".settings-box").addClass("hide");
            $(RootElement).find(".header").hide();
            $(RootElement).find(".login-header").hide();
            $(RootElement).find(".register-header").hide();
            $(RootElement).find(".settings-header").hide();
			app.checkDevicePermissions();
        },

        showLoginButton: function () {
            $(RootElement).find(".login-box").removeClass("hide");
            $(RootElement).find(".capture-box").addClass("hiddenRecorder");
            $(RootElement).find(".settings-header").hide();
            $(RootElement).find(".header").show();
            $(RootElement).find(".register-header").hide();
            $(RootElement).find(".settings-box").addClass("hide");
            $(RootElement).find(".login-header").show();
            app.getSocialLinks();
        },

        showIncognitoBox: function () {
            $(RootElement).find(".incognito-box").removeClass("hide");
            $(RootElement).find(".capture-box").addClass("hide");
            $(RootElement).find(".big_tabs").addClass("hide");
        },

        showExtensionBox: function () {
            chrome.extension.sendMessage({
                action: 'showNotification',
                message:'We are not able to record the current tab you are in. Try recording a different web page.'
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        },

        showSettingsBox: function () {
            $(RootElement).find(".header").show();
            $(RootElement).find(".settings-header").show();
            $(RootElement).find(".capture-box").addClass("hiddenRecorder");
            $(RootElement).find(".settings-box").removeClass("hide");
        },

        showUpgrade: function (text) {
            if(typeof text == 'undefined'){
                text = `<span class="upgrade-warning">You can't upload video, because your account is out of storage<br></span>
                        <a href="https://www.cincopa.com/pricing" target="_blank"class="upgrade_link">Upgrade</a> <span>to get more storage</span>`;
            }
            $(RootElement).find(".upgrade").show();
            $(RootWrapper).find(".record-popup").prop('disabled', true)
            $(RootWrapper).find('.record-popup-wrap-inner').addClass('btnDisabled')
            $(RootWrapper).find('.record-popup').addClass('btnDisabled');
            $(RootElement).find(".upgrade").html(text);
        },
        hideUpgrade:function(){
            $(RootWrapper).find(".record-popup").prop('disabled', false);
            if(!$(RootElement).find('.webcam').hasClass('active')){
                $(RootWrapper).find('.record-popup-wrap-inner').removeClass('btnDisabled');
                $(RootWrapper).find('.record-popup').removeClass('btnDisabled');
            }

            $(RootElement).find(".upgrade").hide();
        },
        showLimitMin: function (text) {
            if(typeof text == 'undefined'){
                text = "<span class='upgrade-warning'>You've exceeded your recording quota. Please check your account for more details<br></span>";
            }else{
                text =  "<span class='upgrade-warning'>"+text+"<br></span>";
            }
            $(RootElement).find(".record-limit-error").html(text);
            $(RootElement).find(".limit-record-min").show();
        },
        hideLimitMin: function () {
            $(RootElement).find(".limit-record-min").hide();
        },

        getSocialLinks: function () {
            $.ajax({
                url: app.socialLinksUrl,
                method: "GET",
                dataType: 'json',
                success: function (data) {
                    for (var social in data) {
                        $(RootElement).find("a." + social + "_button").attr("data-href", data[social])
                    }
                },
                error: function (err) {
                    console.log(err);
                }
            });
        },

        checkDevicePermissions: function () {
            chrome.extension.sendMessage({
                action: 'checkDevicePermissions'
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        },

        setDevicePermissions: function (perm) {
            if (!perm) return;
            if (typeof perm.hasMicrophone != "undefined") {
                app.disableMicrophone(perm.hasMicrophone);
            }
            if (typeof perm.hasWebcam != "undefined") {
                app.disableWebCam(perm.hasWebcam);
            }
            if (typeof perm.isWebsiteHasMicrophonePermissions != "undefined") {
                app.disableMicrophone(perm.isWebsiteHasMicrophonePermissions);
            }
            if (typeof perm.isWebsiteHasWebcamPermissions != "undefined") {
                app.disableWebCam(perm.isWebsiteHasWebcamPermissions);
            }
            var videoDeviceExist = false;
            if (typeof perm.videoInputs != "undefined") {
                if (perm.videoInputs.length) {
                    var htm = "";
                    for (var i = 0; i < perm.videoInputs.length; i++) {
                        if (perm.videoInputs[i].label.toLowerCase().indexOf("https") === -1) {
                            videoDeviceExist = true;
                            htm += "<option value='" + perm.videoInputs[i].id + "'>" + perm.videoInputs[i].label + "</option>"
                        }
                    }
                    $(RootElement).find("#video-inputs").html(htm);
                    if (!perm.hasWebcam || !perm.isWebsiteHasWebcamPermissions) {
                        $(RootElement).find("#video-inputs").attr('disabled', true);
                        if($(RootElement).find('.webcam').hasClass('active')){
                            $(RootElement).find('.record-popup-wrap-inner').addClass('btnDisabled');
                            $(RootElement).find('.recorder button.record').addClass('btnDisabled');
                        }
                    }
                } else {
                    $(RootElement).find("#video-inputs").html("<option>No video source</option>").attr("disabled", true);
                    if($(RootElement).find('.webcam').hasClass('active')){
                        $(RootElement).find('.record-popup-wrap-inner').addClass('btnDisabled');
                        $(RootElement).find('.recorder button.record').addClass('btnDisabled');
                    }
                }
                if (!videoDeviceExist) {
                    var icon = $(RootElement).find('.camera').find("i");
                    icon.removeClass("rt-icon-webcam-on").addClass("rt-icon-webcam-off");
                    $(RootElement).find('.camera').attr("disabled", true);
                    $(RootElement).find("#video-inputs").html("<option>No video source</option>").attr("disabled", true);
                    if($(RootElement).find('.webcam').hasClass('active')){
                        $(RootElement).find('.record-popup-wrap-inner').addClass('btnDisabled');
                        $(RootElement).find('.recorder button.record').addClass('btnDisabled');
                    }
                }
            }
            var audioDeviceExist = false;
            if (typeof perm.audioInputs != "undefined") {
                if (perm.audioInputs.length) {
                    var htm = "";
                    for (var i = 0; i < perm.audioInputs.length; i++) {
                        if (perm.audioInputs[i].label.toLowerCase().indexOf("https") === -1) {
                            audioDeviceExist = true;
                            htm += "<option value='" + perm.audioInputs[i].id + "'>" + perm.audioInputs[i].label + "</option>"
                        }
                    }
                    $(RootElement).find("#audio-inputs").html(htm);
                    if (!perm.hasMicrophone || !perm.isWebsiteHasMicrophonePermissions) {
                        $(RootElement).find("#audio-inputs").attr('disabled', true)
                    }
                } else {
                    $(RootElement).find("#audio-inputs").html("<option>No audio source</option>").attr("disabled", true);
                }

                if (!audioDeviceExist) {
                    var icon = $(RootElement).find('.mic').find("i");
                    icon.removeClass("rt-icon-mic-on").addClass("rt-icon-mic-off");
                    app.removeEqualiser();
                    $(RootElement).find('.mic').off('click');
                    $(RootElement).find("#audio-inputs").html("<option>No audio source</option>").attr("disabled", "disabled");
                }
            }

            setTimeout(function () {
                var cameraIsOn = $(RootElement).find('.camera .rt-icon-webcam-on');
                if (perm.hasWebcam && perm.isWebsiteHasWebcamPermissions && cameraIsOn.length) {
                    if($(RootElement).find('.big-tab-action.active').data('actionbig') === 'record'){
                        app.showWebCamPreview();
                    }
                }
            }, 200)
            if ((perm.isWebsiteHasWebcamPermissions || !perm.hasWebcam) && (perm.isWebsiteHasMicrophonePermissions || !perm.hasMicrophone)) {
                $(RootElement).find(".allow-perm").hide();
            }

            chrome.storage.sync.get(null, function (items) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if (items["video-input"] && videoDeviceExist) {
                    $(RootElement).find("#video-inputs").val(items["video-input"])
                }

                if (items["audio-input"] && audioDeviceExist) {
                    $(RootElement).find("#audio-inputs").val(items["audio-input"])
                }

                if (items["video-resolution"]) {
                    $(RootElement).find("#video-resolution").val(items["video-resolution"])
                }
            })

        },

        requestDeviceAccess: function () {
            // to background.js 
            chrome.extension.sendMessage({
                action: 'requestDeviceAccess',
                upload_url: upload_url
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            })
        },

        disableMicrophone: function (enable) {
            app.setStorage("microphonePermitted", enable ? enable : false);
            if (enable) {
                $(RootElement).find('.mic').removeClass("disabled");
                if( $(RootElement).find('.mic').find('.rt-icon-mic-on').length > 0 && !$(RootElement).find('.rectraceExtWrapper').hasClass('fadeOut')){
                    app.appendEqualiser();
                }
            } else {
                $(RootElement).find('.mic').addClass("disabled");
            }

            // if (!enable ) {
            //     app.removeEqualiser()
            // } else {
            //     app.appendEqualiser();
            // }
        },

        disableWebCam: function (enable) {
            app.setStorage("cameraPermitted", enable ? enable : false);
            if (enable) {
                $(RootElement).find('.camera').removeClass("disabled");
            } else {
                $(RootElement).find('.camera').addClass("disabled");
            }
        },

        showWebCamPreview: function () {
			if(  $(RootElement).find('.hiddenRecorder').length > 0  || $(RootElement).find('.rectraceExtWrapper').hasClass('fadeOut') ){
				return ;
			}
            chrome.storage.sync.get(null, function (items) {
                if (chrome.runtime.lastError) {
                    return;
                }
                var activeTab = items["tab"] || "tab";
                var cameraEnabled = items["cameraEnabled"] === false ? false : true;
                if (activeTab === "webcam") {
                    if(cameraEnabled) {
                        chrome.extension.sendMessage({
                            action: 'webcamPreview'
                        }, function () {
                            if (chrome.runtime.lastError) {
                                return;
                            }
                        });
                    }

                } else if (cameraEnabled && items.cameraPermitted) {
                    chrome.extension.sendMessage({
                        action: 'smallwebcamPreview',
                        type: activeTab
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                }
            })
        },

        setStorage: function (key, value) {
            var params = {};
            params[key] = value;
            chrome.storage.sync.set(params, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        },

        setDefaultState: function () { 
            chrome.storage.sync.get(null, function (items) {
                if (chrome.runtime.lastError) {
                    return;
                }
                if(typeof items["cameraEnabled"] == "undefined" ){
                    app.setStorage("cameraEnabled", true);
                }
                if(typeof items["microphoneEnabled"] == "undefined"  ){
                    app.setStorage("microphoneEnabled", true);
                }
                app.setStorage('isPaused',false);
                var microphoneEnabled = items["microphoneEnabled"] === false ? false : true;
                var cameraEnabled = items["cameraEnabled"] === false ? false : true;
                var activeTab = items["tab"] || "tab";
                var highlightCursor = items["highlightCursor"] || "off";
                var realtimeMarker = items["realtimeMarker"] === false ? false : true;
                var recordingControls = items["recordingControls"] === false ? false : true;
                var pagesName = items["pagesName"] || "";
                var bigtab = items['bigtab'] || "record"
                $(RootElement).find(".tab-action").removeClass("active");
                $(RootElement).find(".tab-action[data-action='" + activeTab + "']").addClass("active");
                $(RootElement).find(".big-tab-action").removeClass("active");
                $(RootElement).find(".big-tab-action[data-actionbig='" + bigtab + "']").addClass("active");
                $(RootElement).find(".big_tab").removeClass("active");
                $(RootElement).find(".big_tab[data-actionbig='" + bigtab + "']").addClass("active");
                var icon = $(RootElement).find(".mic").find("i");

                if(bigtab === 'assets'){
                    app.removeEqualiser();
                }else{

                    if (microphoneEnabled) {
                        icon.removeClass("rt-icon-mic-off").addClass("rt-icon-mic-on");	
                        if(app.loggedIn){
                        app.appendEqualiser();
                        }
                    } else {
                        app.removeEqualiser();
                        icon.removeClass("rt-icon-mic-on").addClass("rt-icon-mic-off");
                        $(RootElement).find("#audio-inputs").attr("disabled", true);
                    }
                }

                icon = $(RootElement).find(".camera").find("i");
                

                if (cameraEnabled) {
                    icon.removeClass("rt-icon-webcam-off").addClass("rt-icon-webcam-on");
                    if(bigtab === 'record'){
                        app.showWebCamPreview();
                    }
                } else {
                    icon.removeClass("rt-icon-webcam-on").addClass("rt-icon-webcam-off");
                    $(RootElement).find("#video-inputs").attr("disabled", true);
                    if($(RootElement).find('.webcam').hasClass('active')){
                        $(RootElement).find('.record-popup-wrap-inner').addClass('btnDisabled');
                        $(RootElement).find('.recorder button.record').addClass('btnDisabled');
                    }
                }


                $(RootElement).find("input[name='highlightCursor']").prop("checked", true);
                $(RootElement).find("input[name='highlightCursor'][value='" + highlightCursor + "']").prop("checked", true);
                $(RootElement).find("#realtime-marker").prop("checked", realtimeMarker);
                $(RootElement).find("#recording-controls").prop("checked", recordingControls);
                $(RootElement).find("#pages-name").val(pagesName);
              })
            },
            
        sendIfWpPage: function (upload_url) {
            // to background.js 
            chrome.extension.sendMessage({
                action: 'checkWordpressPage',
                upload_url: upload_url
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            })
        },

        closePopup: function () {
            if( $(RootElement).find('.rectraceExtWrapper').hasClass('fadeOut')){
                return;
            }
            $(RootElement).find('.rectraceExtWrapper').addClass('fadeOut');
			app.removeEqualiser();
            chrome.extension.sendMessage({
                action: 'removeAllCamPreviews',
            }, function () {
                if (chrome.runtime.lastError) {
                    return;
                }
            })
        },

        setEmail: function (email) {
            if (!email) return;
            if (!$(RootElement).find(".settings-box .email-box").length) {
                $(RootElement).find(".settings-box").append(
                    "<div class='email-box checkBox'><b>Account</b><span style='color: rgb(153,153,153);font-size: 13px; display: block'>" + email + "</span><a class='logout' style='text-decoration:underline; cursor:pointer; font-size: 14px; margin-top: 8px;'>Logout</a></div>")
            }
            
        },

        setUserName: function(user_short_name) {
          if (!user_short_name) return;
          if(!$(RootElement).find(".topMenu .accountName").length) {
            $(RootElement).find('.topMenu').append("<p class='accountName'>" + user_short_name + "</p>")
          }else{
            $(RootElement).find('.accountName').text(user_short_name);
          }
        },

		appendEqualiser:function(){
			$(RootElement).find('.audio-indicator').html(`<iframe class="rectrace-visualizer-iframe" scrolling="no" style="height: 28px; width: 10px; vertical-align: top; border: none;" allow="microphone" src="${chrome.extension.getURL('html/equalizer.html')}"></iframe>`);
		},
		removeEqualiser:function(){
			$(RootElement).find('.audio-indicator').html('');
        },
        activateAssetsTab: function () {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (chrome.runtime.lastError) {
                    return;
                } 
				if(request.key == "appendPopup"){
                    if($(RootElement).find('.rectraceExtWrapper').hasClass('fadeOut')){
                        app.removeEqualiser()
                    }else{
                        if($(RootElement).find('.mic .rt-icon-mic-on').length){
                            if($(RootElement).find('.big-tab-action.active').data('actionbig') === 'record'){
						        app.appendEqualiser();
                            }
					    }
                    }
					
				} else if (request.key == 'loadTagsSuccess') {
                    var res = request.res;
                    var data = res.tag_cloud,
                        tags = [];
                    tagsData = data;
                    for (var tag in data) {
                        tags.push(tag);
                    }
                    var urlTags = [];
                    if (tagsFromUrl) {
                        urlTags = tagsFromUrl.split(",");
                        allTags = intersect(tags, urlTags)
                    } else {
                        allTags = tags;
                    }
                    if (allTags.length) {
                        createTagsList(allTags);
                    } else {
                        $(RootElement).find("#dragAndDrop").show();
                        $(RootElement).find("#empty_state").show();
                        $(RootElement).find(".topMenuActionsList").addClass("topMenuActionsListEmpty");
                        createTagsList([])
                    }
                    hideLoader();
                } else if (request.key == 'loadByTagSuccess') {
                    allowGetTags = true;
                    loadingTags.remove();
                    var res = request.res;
                    var items = res.items;
                    if(res && res.tag){
                        res.tag = decodeURIComponent(res.tag);
                    }
                    if (items.length) {
                        mainJson[res.tag] = mainJson[res.tag].concat(items);
                        drawVideoLines(items);
                        playStoryBoardInit(items);
                        hideNoItems();
                        hideLoader();
                    } else {
                        allowGetTags = false;
                        if(mainJson && res && res.tag && mainJson[res.tag].length === 0){
                            showNoItems();
                        }
                        hideLoader();
                    }

                } else if (request.key == 'deleteFileSuccess') {
                    deleteFileRow({rid: request.rid, fid: request.fid});
                    chrome.extension.sendMessage({
                        action: 'checkUserStatusAjax',
                        ajax_url: app.loginStatusUrl
                    }, function () {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    })
                    // app.checkUserStatus();
                } else if (request.key == 'ajaxError'){
                    app.ajaxErrorHandler(request.error)
                } else if (request.key == 'loadGalleriesSuccess') {
                    var res = request.res.galleries;
                    var page = request.page;
                    drawGalleriesLines(res, page)
                    hideLoader();
                }
            })

            var allTags = [];
            var mediaItems = {};
            var tagsData;
            var activePageIndex = 1;
            var activeTag = "New-Uploads",
                activeItem = ""
            var new_guid = "skin-preview-container";

            var mainJson = {};
            var api_token = 'session';
            var tagsFromUrl = '';
            var currentTag,currentPage;
            var allowGetTags = true;
            var loadingTags = $('<span class="loading_tags"></span>');
            mainJson["New-Uploads"] = [];
            loadTags();
            goTo(1);
            
            $(RootWrapper).on("click", ".categoriesList ul li", function () {
                $(RootWrapper).find('.assetsGalleriesTabs').hide();
                $(RootWrapper).find('.categoriesList').hide();
                $(RootWrapper).find('.itemsList').show()
                var tag = $(this).attr("data-tag");
                currentTag = tag;
                currentPage = 1;
                
                activeTag = tag;
                $(RootElement).find(".itemsList").html("");
                goTo(2);
                showLoader();
                loadByTag(tag);
                mainJson[tag] = [];
            });


            $(RootWrapper).on("click", ".assetsTab", function () {
                if($(this).hasClass('activeTabName')) {
                    return
                }
                $(RootWrapper).find('.categoriesList').show()
                $(RootWrapper).find('.itemsList').hide()
                $(RootWrapper).find('.galleriesList').hide()
                $(this).addClass('activeTabName');
                $(RootWrapper).find('.galleriesTab').removeClass('activeTabName')
            
                loadTags();
            });

            var galleriesPage = 1;

            $(RootWrapper).on("click", ".galleriesTab", function () {
                if($(this).hasClass('activeTabName')) {
                    return
                }
                $(RootWrapper).find('.categoriesList').hide()
                $(RootWrapper).find('.itemsList').hide()
                $(RootWrapper).find('.galleriesList').show()
                $(this).addClass('activeTabName');
                $(RootWrapper).find('.assetsTab').removeClass('activeTabName')

                loadGalleries(galleriesPage);
            });

            var scrollTimer;
            $(RootWrapper).find('.galleriesList').on('scroll', function () {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function () {
                    obj = $(RootWrapper).find('.galleriesList')[0];
                    if (obj.scrollTop >= (obj.scrollHeight - obj.offsetHeight - 50)) {
                        galleriesPage++;
                        loadGalleries(galleriesPage);
                    }
                }, 300);
            })


            $(RootElement).find('.pageCont.itemsList').off('scroll').on('scroll',function(e){
                if(allowGetTags){
                    var scrollTop = this.scrollTop + this.offsetHeight;
                    var scrollHeight = this.scrollHeight;
                    if(scrollTop > scrollHeight - 50){
                        currentPage++;
                        loadByTag(currentTag,currentPage);
                        allowGetTags = false;
                    }
                }
            })
			
			$(RootWrapper).off('click','.btn_open_video').on('click', '.btn_open_video, .video-line .thumb ', function () {
                var rid = $(this).parents('.video-line').data('rid');
                var fid = $(this).parents('.video-line').data('fid');
                if(rid){
                    window.open('https://' + default_domain + '/watch/' + defaults.video + '!' + rid);
                }else if(fid){
                    window.open('https://' + default_domain + '/watch/' + fid);
                }
               
            })
            
            $(RootWrapper).off('click', '.btn_copy_gif').on('click', '.btn_copy_gif', function(){
                var rid = $(this).parents('.video-line').data('rid');
                var fid = $(this).parents('.video-line').data('fid');

                var url = 'https://' + default_domain + '/watch/' + (fid || '') + (rid ? defaults.video + '!' + rid : '') ;

                    let item = {
                        type: 'assets',
                        start: 0,
                        duration: 2,
                        link: url,
                        content_url: $(this).parents('.video-line').data('contenturl'),
                        title: $(this).parents('.video-line').data('title')
                     }
                let htm = createHTML(item);
                
                executeCopy(htm)
            })

          

            $(RootWrapper).off('click', '.btn_copy_embed').on('click', '.btn_copy_embed', function(){
                var fid = $(this).parents('.video-line').data('fid');

                var item = {
                    type: 'galleries',
                    fid,
                }
                let htm = createHTML(item);
                executeCopy(htm)
            })

            function createHTML(item) {
                let template;

                if(item.type == 'assets') {
                    template = `<a href="{link}"  target='_blank'><img src="{src}" width="400" height="225" alt="{title}" /></a>`;
                    let imageUrl;
                    if(item.content_url){
                        imageUrl  = item.content_url.slice(0, -4) + ".gif?t=y&force=y&args=start_sec," + item.start + ",duration," + item.duration + ",fps,10"
                    }
                    template = template
                            .replace("{src}", imageUrl)
                            .replace("{link}",item.link)
                            .replace("{title}",item.title || '');

                } else if(item.type == 'galleries') {
                    template = `<div id="{ID}">...</div><script type="text/javascript">
                                var cpo = []; cpo["_object"] ="{ID}"; cpo["_fid"] = "{FID}";
                                var _cpmp = _cpmp || []; _cpmp.push(cpo);
                                (function() { var cp = document.createElement("script"); cp.type = "text/javascript";
                                cp.async = true; cp.src = "https://rtcdn.cincopa.com/libasync.js";
                                var c = document.getElementsByTagName("script")[0];
                                c.parentNode.insertBefore(cp, c); })(); </script>`

                    template = template
                        .replaceAll("{ID}", `cincopa_${item.fid}`)
                        .replace("{FID}", item.fid)
                }
                return template
            }

            function executeCopy(text, onlyText) {    
                function onCopy(event) {
                    event.preventDefault();
                    clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
                    event.clipboardData.setData('text/plain', text);
                    if(!onlyText){
                        event.clipboardData.setData('text/html', text);    
                    }                    
                    document.removeEventListener('copy', onCopy,true);
                }; 
                document.addEventListener('copy', onCopy, true);               
                document.execCommand("copy");
            }
            
            $(RootWrapper).off('click','.btn_copy_link').on('click', '.btn_copy_link', function () {
                
                var rid = $(this).parents('.video-line').data('rid');
                var fid = $(this).parents('.video-line').data('fid');

                var url = 'https://' + default_domain + '/watch/' + (fid || '') + (rid ? defaults.video + '!' + rid : '') ;
                var copyInput = $('<input type="text"/>');
                copyInput.css('display:none');
                copyInput.val(url);
                $(document.body).append(copyInput);
                copyInput[0].select();
                copyInput[0].setSelectionRange(0, 99999);
                document.execCommand("copy");
                copyInput.remove();
                

                chrome.extension.sendMessage({
                action: 'showNotification',
                message:'Copied to clipboard!',
				title: 'Done',
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            })

			$(RootWrapper).off('click','.btn_insert_video').on('click', '.btn_insert_video', function () {
                var itemId = $(this).parents('.video-line').data('rid');
                var item = mediaItems[itemId];
                var galleryId = $(this).parents('.video-line').data('fid');

                var params = {
                    action:'set_embed_data_content',
                    default_domain:default_domain,
                    defaults:defaults
                }
                if(itemId){
                    params.item = item;
                }else if(galleryId){
                    params.fid = galleryId;
                }
                //HERE WE NEED TO SEND MESSAGE TO EMBED
                if(~window.location.href.indexOf('mail.google.com')){
                    sendEvent(params)
                }
                if(~window.location.href.indexOf('.ariticapp.com')){
                    params.page = 'ariticapp';
                     try {
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
                if(~window.location.href.indexOf('.pipedrive.com')){
                    params.page = 'pipedrive';
                    try{
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
                if(~window.location.href.indexOf('.hubspot.com')){
                    params.page = 'hubspot';
                    try{
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
                if(~window.location.href.indexOf('.close.com')){
                    params.page = 'close';
                    try{
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
                if(~window.location.href.indexOf('.sugarcrm.com')){
                    params.page = 'sugar';
                    try{
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
                if(~window.location.href.indexOf('.zoho.com')){
                    params.page = 'zoho';
                    try{
                        window.postMessage(params, '*');
                    } catch (ex) {}
                }
            })

            $(RootWrapper).off('click','.btn_delete_video').on('click', '.btn_delete_video', function () {
                var rid = $(this).parents('.video-line').data('rid');
                var fid = $(this).parents('.video-line').data('fid');
                
                var param = rid ? {rid} : {fid}
                showDeletePopup(param)
            })

            $(RootWrapper).off('click','.deleteFile_popup_button-no').on('click','.deleteFile_popup_button-no',function(){
                var popup = $(this).parents('.deleteFile_popup');
                popup.fadeOut(300);
                setTimeout(function(){
                    popup.remove();
                },300)
            })

            $(RootWrapper).off('click','.deleteFile_popup_button-yes').on('click','.deleteFile_popup_button-yes',function(){
                var popup = $(this).parents('.deleteFile_popup');
                var rid = popup.data('rid');
                var fid = popup.data('fid');
                popup.fadeOut(300);
                var el;
                el = rid ? {rid: rid} : {fid: fid}
                deleteFile(el);
                setTimeout(function(){
                    popup.remove();
                },300)
            })

            $(RootElement).find(".topMenuBack").off('click','.topmenu').on("click.topmenu", function () {
                if (activePageIndex > 1) {
                    if (activePageIndex == 2) {
                        $(RootElement).find('.itemsList').hide();
                        $(RootElement).find('.categoriesList ').show();
                        $(RootElement).find('.assetsGalleriesTabs').show();

                        if (!allTags.length) {
                            $(RootElement).find(".no_tag_info").fadeIn(200, function () {
                                setTimeout(function () {
                                    $(RootElement).find(".no_tag_info").fadeOut();
                                }, 3000)
                            })
                            return;
                        }
                    }
                    goTo(activePageIndex - 1);
                }
            });

            $(RootElement).find(".mainWrapper").addClass("list-view");
            $(RootElement).find(".list").on("click", function () {
                $(RootElement).find(".mainWrapper").removeClass("grid-view").addClass("list-view");
            })

            $(RootElement).find(".grid").on("click", function () {
                $(RootElement).find(".mainWrapper").removeClass("list-view").addClass("grid-view");
            })

            function showDeletePopup(param){

                var {rid, fid} = param
                var el = rid ? $(RootElement).find(`.rectraceExtWrapper .itemsList .video-line[data-rid='${rid}']`) :  $(RootElement).find(`.rectraceExtWrapper .galleriesList .video-line[data-fid='${fid}']`);
                var captionBlock = el.find('.caption');
                var popup = `
                    <div class="deleteFile_popup"  data-${rid ? 'rid' : 'fid'}=${rid || fid}>
                        <p>Are you sure?</p>
                        <div class="deleteFile_popup_buttons">
                            <button class="deleteFile_popup_button-no">Cancel</button>
                            <button class="deleteFile_popup_button-yes"><span>&#10006;</span> Delete</button>
                        </div>
                    </div>
                `;
                captionBlock.append(popup)
            }

            function showNoItems() {
                $(RootElement).find('.itemsList').html('<p class="no_items">No video items!</p>');
            }

            function hideNoItems() {
                $(RootElement).find('.itemsList').find('.no_items').remove();
            }

            function deleteFile(param) {

                var {rid, fid} = param
                var option = rid ?  {rid: rid} :  {fid: fid};

                chrome.extension.sendMessage({
                    action: 'deleteFile',
                    option: option
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            }
            
            function deleteFileRow(option) {
                var { rid, fid } = option
                var el = $(RootElement).find(`.rectraceExtWrapper ${rid ? '.itemsList' : '.galleriesList'} .video-line[data-${rid ? 'rid' : 'fid'}='${rid || fid}']`);
                el.fadeOut(200, function () {
                    el.remove();
                    if(rid) {
                        mainJson[activeTag] = mainJson[activeTag].filter(function (current) {
                            return current.rid !== rid;
                        })
                    }
                })
            }

            function loadTags() {
                if(($(RootWrapper).find('.categoriesList').children()).length <= 0) {
                    showLoader();
                } else {
                    return
                }
                chrome.extension.sendMessage({
                    action: 'loadTags'
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            };


            function loadGalleries(page) {
                if(($(RootWrapper).find('.galleriesList').children()).length <= 0) {
                    showLoader();
                }

                chrome.extension.sendMessage({
                    action: 'loadGalleries',
                    page: page ? page : 1
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            }

            function intersect(a, b) {
                var t;
                if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
                return a.filter(function (e) {
                    return b.indexOf(e) > -1;
                });
            }

            function createTagsList(tags) {
                var listCont = $(RootElement).find(".categoriesList");
                var htm = "";
                var lastTags = [];
                var firstTags = []

               
                if (tags && tags.length) {
                    $(RootElement).find("#empty_state").remove();
                    $(RootElement).find(".topMenuActionsList").removeClass("topMenuActionsListEmpty");
                    for (var i = 0; i < tags.length; i++) {
                        var t = tags[i];
                        if(t == 'no-tag'){
                            firstTags.push(t);
                        }else if(t == 'any-tag'){
                            lastTags.push(t);
                        }else{
                            htm += "<li data-tag='" + t + "' class='category-list-item'>"
                            htm += "<p class='category-list-name'>" + encodeXML(t) + "</p>";
                            htm += "<p class='category-list-count'>" + tagsData[t] + " item &#10230;</p>";
                            htm += "</li>";
                        }
                    };
                }


                var firstHtm ='';
                for(var j=0;j<firstTags.length;j++){
                    var t = firstTags[j];
                    firstHtm += "<li data-tag='" + t + "' class='category-list-item'>"
                    firstHtm += "<p class='category-list-name'>" + t + "</p>";
                    firstHtm += "<p class='category-list-count'>" + tagsData[t] + " item &#10230;</p>";
                    firstHtm += "</li>";
                }
                htm  =  "<ul>"+firstHtm + htm;

                for(var j=0;j<lastTags.length;j++){
                    var t = lastTags[j];
                    htm += "<li data-tag='" + t + "' class='category-list-item'>"
                    htm += "<p class='category-list-name'>" + t + "</p>";
                    htm += "<p class='category-list-count'>" + tagsData[t] + " item &#10230;</p>";
                    htm += "</li>";
                }
                
                htm += "<li data-tag='New-Uploads' class='category-list-item' style='display: none'></li>"
                htm += "</ul>";
                
                listCont.html(htm);
                
                // listCont.show();
            }

            function loadByTag(tag) {
                
                var url;
                chrome.extension.sendMessage({
                    action: 'loadByTag',
                    tag: tag,
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            }

            function drawVideoLines(items) {
                var videoLineCont = $(RootElement).find(".itemsList");
                var htm = "";
                if (items.length) {
                    hideNothing();
                    for (var i = 0; i < items.length; i++) {
                        htm += drawVideoLine(items[i]);
                    }
                }
                videoLineCont.append(htm);
             
                if (activeTag === "New Uploads") {
                    showGotIt();
                }

                $(window).trigger("resize");
            }


            function drawGalleriesLines(items, page) {
                var galleries = $(RootElement).find(".galleriesList");
                var htm = "";
                if (items.length) {
                    // hideNothing();
                    for (var i = 0; i < items.length; i++) {
                        htm += drawGalleriesLine(items[i])
                    }
                }
                page <= 1 ? galleries.html(htm) :  galleries.append(htm)
            }

            function drawGalleriesLine(item) {

                var htm = "";
                // mediaItems[item.fid] = item;

                var title = item.name || item.description;

                var modifiedDate = '';
                if (item.modified) {
                    var date = new Date(item.modified);
                    var month = date.getMonth() + 1;
                    month = "0" + month;
                    var day = date.getDate();
                    day = "0" + day;
                    var year = date.getFullYear();
                    var hour = date.getHours();
                    var minutes = date.getMinutes();
                    modifiedDate = month + "/" + day + "/" + year + " " + hour + ":" + minutes;
                }

                var url = `https://rtcdn.cincopa.com/thumb.aspx?fid=${item.fid}`

                htm += '<div class="video-line" data-fid="' + item.fid + '" data-id="' + item.fid + '" data-url="' + url + '" data-title="' + title + '">' +
                    '<div class="thumb" data-action="thumb">' +
                    '<div>' +
                    '<span class="thumb-time" style="display: block"></span>' +
                    '<img src="' + url + '">' +
                    '</div>' +
                    '</div>' +
                    '<div class="caption" >' +
                    '<div class="video_title"><div class="input-wrapper">' + title + '</div>' +
                    (modifiedDate ? '<div class="input-wrapper">Date: ' + modifiedDate + '</div>' : '') +
                    '<div class="textarea-wrapper">' + item.description + '</div></div>' +
                    '<div class="video_buttons">' +
                    '<button class="btn_open_video video_button"><span>&#10070;</span> <span>Open Gallery</span></button>' +
                    `${!app.isInsertPage ?
                        '<button class="btn_copy_link video_button"><span>&#10059;</span>  <span>Copy Link</span></button>' +
                        '<button class="btn_copy_embed video_button"><span>&#10059;</span>  <span>Copy Embed</span></button>':
                        '<button class="btn_insert_video video_button"><span>&#10059;</span> <span>Insert Gallery</span></button>'

                    }` +
                    '<button class="btn_delete_video video_button"><span>&#10006;</span> <span>Delete Gallery</span></button></div>' +
                    // tagHtml +
                    '</div>' +
                    '</div>';

                // loadImages(item.thumbnail.url);

                loadImages(url);

                return htm;
            }

            function secondsToMS(value, removeLeadingZero) {
                var sec_num = parseInt(value, 10); // don't forget the second param
                var minutes = Math.floor(sec_num / 60);
                var seconds = sec_num - (minutes * 60);
                if (minutes < 10 && !removeLeadingZero) {
                    minutes = "0" + minutes;
                }
                if (seconds < 10) {
                    seconds = "0" + seconds;
                }
                var time = minutes + ':' + seconds;
                return time;
            }

            function drawVideoLine(item) {
                var htm = "";
                mediaItems[item.rid] = item;
                var tagHtml = "";

                var title = item.caption || item.filename;
                var url = item.versions['jpg_600x450'] ? item.versions['jpg_600x450'].url : item.versions['original'].url;
                var xlargeUrl = item.versions['jpg_1200x900'] ? item.versions['jpg_1200x900'].url : item.versions['original'].url;
                if (item.type === "video") {
                    url = "https://www.cincopa.com/media-platform/api/thumb.aspx?size=large&fid=AoIAMJd_cbRb!" + item.rid + "&trs=play";
                    xlargeUrl = "https://www.cincopa.com/media-platform/api/thumb.aspx?size=xlarge&fid=AoIAMJd_cbRb!" + item.rid + "&trs=play";
                }

                var modifiedDate = '';
                if(item.modified){
                    var date = new Date(item.modified);
                    var month = date.getMonth() + 1;
                    month = "0" + month;
                    var day = date.getDate();
                    day = "0" + day;
                    var year = date.getFullYear();
                    var hour = date.getHours();
                    var minutes = date.getMinutes();
                    modifiedDate = month + "/" + day + "/" + year + " " + hour + ":" + minutes ;
                }

                function getContentUrl(item) {
                    var url = '';
                    if (item.versions && item.versions['mp4_hd'] && item.versions['mp4_hd'].url) {
                        url = item.versions['mp4_hd'].url;
                    }
                    return url || '';
                }

                htm += '<div class="video-line ' + item.type + ' ' + (activeTag == "New-Uploads" ? "new-upload" : "") + '" data-rid="' + item.rid + '" data-id="' + item.id + '" data-type="' + item.type + '" data-url="' + url + '" data-large="' + xlargeUrl + '" data-title="' + title + '" data-contenturl="'+getContentUrl(item)+'">' +
                    '<div class="thumb" data-action="thumb">' +
                    '<div>' +
                    '<span class="thumb-time" style="display: block">' + (item.exif.duration ? secondsToMS(hmsToSecondsOnly(item.exif.duration.split(".")[0])) : "") + '</span>'+
                    '<img src="' + item.thumbnail.url + '">' +
                    '</div>' +
                    '</div>' +
                    '<div class="caption" >' +
                    '<div class="video_title"><div class="input-wrapper">' + title + '</div>' +
                    ( modifiedDate ? '<div class="input-wrapper">Date: ' + modifiedDate + '</div>':'' ) +
                    '<div class="textarea-wrapper">' + item.description + '</div></div>' +
                    '<div class="video_buttons">' +
                    '<button class="btn_open_video video_button"><span>&#10070;</span> <span>Open Video</span></button>' +
                    `${!app.isInsertPage ?
                        '<button class="btn_copy_link video_button"><span>&#10059;</span>  <span>Copy Link</span></button>' + 
                        (getContentUrl(item) ? '<button class="btn_copy_gif video_button"><span>&#10059;</span>  <span>Copy Gif</span></button>' : '') :
                        '<button class="btn_insert_video video_button"><span>&#10059;</span> <span>Insert Video</span></button>'
                    }` +
                    '<button class="btn_delete_video video_button"><span>&#10006;</span> <span>Delete Video</span></button></div>' +
                   
                    tagHtml +
                    '</div>' +
                    '</div>';
                loadImages(item.thumbnail.url);

                return htm;
            }


            function goTo(number) {
                hideNothing();
                activePageIndex = number;
                $(RootElement).find(".pageCont").removeClass("active");
                $(RootElement).find(".pageCont.step" + number).addClass("active");
                if (number == 1) {
                    activeTag = "New-Uploads";
                    if ($(RootElement).find(".categoriesList ul").length > 0 && $(".categoriesList li").length <= 1) {
                        $(RootElement).find("#dragAndDrop").show();
                        preventDragOnBody = false;
                    } else {
                        $(RootElement).find("#dragAndDrop").hide();
                        preventDragOnBody = false;
                    }
                } else if (number == 3) {
                    $(RootElement).find(".search_clear").trigger("click")
                    $(RootElement).find("#dragAndDrop").hide();
                    preventDragOnBody = true;
                    hideNothing();
                } else if (number == 2) {
                    if (activeTag == "New-Uploads") {
                        $(RootElement).find("#dragAndDrop").show();
                        preventDragOnBody = false;
                    } else {
                        preventDragOnBody = false;
                    }

                }
                setHeader();

            }

            function loadImages(src) {
                var ni = new Image();
                src = decodeXMl(src);
                ni.onload = function () {
                    var ratio = this.width / this.height;
                    ratio = ratio.toFixed(2);
                    var src = $(this).attr('src');
                    if (ratio <= 1) {
                        $(RootElement).find('.video-line .thumb img[src="' + src + '"]').parents('.thumb').addClass('portrait').attr("data-ratio", ratio);
                    } else {
                        $(RootElement).find('.video-line .thumb img[src="' + src + '"]').parents('.thumb').addClass('landscape').attr("data-ratio", ratio);
                    }
                }
                ni.src = src;
            }

            function decodeXMl(string) {

                var escaped_one_to_xml_special_map = {
                    '&amp;': '&',
                    '&quot;': '"',
                    '&lt;': '<',
                    '&gt;': '>'
                };
                return string.replace(/(&quot;|&lt;|&gt;|&amp;)/g,
                    function (str, item) {
                        return escaped_one_to_xml_special_map[item];
                    });
            }

            function encodeXML(string){
                    
                var escaped_one_to_xml_special_map = {
                    '&': '&amp;',
                    '"':'&quot;',
                    '<':'&lt;',
                    '>':'&gt;'
                };
                return string.replace(/(&|"|<|>)/g,
                    function (str, item) {
                        return escaped_one_to_xml_special_map[item];
                    });

            }

            function setHeader() {
                if (activePageIndex == 1) {
                    $(RootElement).find(".mainHead").addClass("firstPage").removeClass("secondPage").removeClass("thirdPage");
                    $(RootElement).find(".leftMenuTitle").html('<img style="cursor:pointer; max-width:90px; width:100%; height:auto" itemprop="logo" src="https://wwwcdn.cincopa.com/_cms/media-platform/api/images/cincopa_logo_white.png" width="0" height="0" alt="cincopa" onclick="window.open(\'//cincopa.com\', \'_blank\')">');
                } else if (activePageIndex == 2) {
                    $(RootElement).find(".mainHead").addClass("secondPage").removeClass("firstPage").removeClass("thirdPage");
                    $(RootElement).find(".leftMenuTitle").text(activeTag);
                } else if (activePageIndex == 3) {
                    $(RootElement).find(".mainHead").addClass("thirdPage").removeClass("firstPage").removeClass("secondPage");
                    $(RootElement).find(".leftMenuTitle").text(activeItem)
                }
            }

            function updateItem(params, rid, callback) {
                var data = params;

                var cacheP = "";
                var queryString = "rid=" + rid + "&caption=" + params.caption + "&description=" + params.description;
                if (params.tags && params.tags != "New-Uploads") {
                    queryString += "&tags=" + params.tags;
                    cacheP = "cache=never&";
                }
                params.rid = rid;
                params.cmd = "updateid";
                $.ajax({
                    type: 'POST',
                    url: '//api.cincopa.com/v2/asset.set_meta.json?' + cacheP + 'api_token=' + api_token + '&' + queryString,
                    dataType: 'json',
                    success: function (res) {

                    },
                    error: function (err) {
                        console.log(err)
                    }
                });

            }

            function sendEvent(data) {
                // to background.js 
                chrome.extension.sendMessage({
                    action: 'sendEventGmail',
                    data: data
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                })
                var receiver = window.parent;
                var params = data;
                params["sender"] = "cincopa-assets-iframe";
                receiver.postMessage(params, '*');
            }

            function showLoader() {
                hideNothing();
                $(RootElement).find(".mainHead").addClass("prevented");
                $(RootElement).find("#loader").show();
            }

            function hideLoader() {
                $(RootElement).find(".mainHead").removeClass("prevented");
                $(RootElement).find("#loader").hide();
            }

            function hideNothing() {
                $(RootElement).find("#nothing").hide();
            }

            function playStoryBoardInit(items) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type == "video")
                        playStoryBoard(items[i])
                }
            }

            function playStoryBoard(item) {                
                if (getUrlVars().theme) return;
                var json = item;
                var w = json.exif.width;
                var h = json.exif.height;
                var aspect_ratio = w / h || 1.33;
                var lineElement = $(RootWrapper[0]).find(".itemsList .video-line[data-rid='" + item.rid + "']");
                if (lineElement.hasClass("stb_activated")) return;
                lineElement.addClass("stb_activated");
                var storyBoardUrl = "";
                
                if (json.versions && json.versions.jpg_sb_200x150 && json.versions.jpg_sb_200x150.url) {
                    storyBoardUrl = json.versions.jpg_sb_200x150.url;
                }
                if (!storyBoardUrl) return;


                var thumbDiv = lineElement.find(".thumb>div");
                var timeDiv = thumbDiv.find(".thumb-time");
                
                var initialSec = timeDiv.text();

                if (initialSec == '') {
                    timeDiv.hide();
                }

                var dur = hmsToSecondsOnly(json.exif.duration);
                var ni = new Image();
                ni.src = storyBoardUrl;

                ni.onload = function () {
                    var sb_interval = null;
                    thumbDiv.on("mouseenter", function (ev) {
                        thumbDiv.addClass("playing_story_board");
                        setTimeout(function () {
                            if (thumbDiv.hasClass("playing_story_board")) {
                                thumbDiv.addClass("flash_animation");
                                showInlineStoryboard(thumbDiv.find(".ze-inline-sb"), dur, ev, aspect_ratio, timeDiv);
                            }
                        }, 2500)

                        var sb_w = 200,
                            sb_h = 150;
                        var containerDiv = $("<div>").addClass("ze-inline-sb-wrap");
                        var padding = thumbDiv.css("padding");
                        containerDiv.css({
                            "width": "100%",
                            "height": "100%",
                            "background": "#ffffff",
                            "position": "absolute",
                            "margin": padding,
                            "top": 0,
                            "left": 0,
                            "z-index": 5000,
                            "overflow": "hidden"
                        });

                        var sbDiv = $("<div>").addClass("ze-inline-sb");

                        sbDiv.css({
                            'background-image': 'url(' + storyBoardUrl.replace(/\(|\)/g, "") + ')',
                            'background-repeat': 'no-repeat',
                            "width": sb_w + "px",
                            "height": sb_h + "px",
                            "position": "absolute",
                            "top": "0",
                            "bottom": "0",
                            "left": "0",
                            "right": "0",
                            "margin": "auto"
                        });

                        sbDiv.appendTo(containerDiv);
                        var index = 0;
                        if (thumbDiv.find(".ze-inline-sb-wrap").length == 0) {
                            containerDiv.appendTo(thumbDiv);
                            showInlineStoryboard(sbDiv, dur, ev, aspect_ratio, timeDiv);
                        }
                    });
                    
                    var mouseTimer;

                    thumbDiv.on("mouseleave", function () {
                        thumbDiv.removeClass("playing_story_board flash_animation");
                        clearTimeout(mouseTimer);
                        thumbDiv.find(".ze-inline-sb-wrap").remove();

                        timeDiv.text(initialSec);
                    });

                    thumbDiv.on("mousemove", function (ev) {
                        showInlineStoryboard(thumbDiv.find(".ze-inline-sb"), dur, ev, aspect_ratio, timeDiv);
                    });
                };
                ni.onerror = function () { }
            }

            function showInlineStoryboard(sbDiv, duration, ev, aspect_ratio, timeDiv) {
                var sb_w = 200,
                    sb_h = 150;
                var row, col;
                var frameC;
                if (duration <= 120) { // video duration < 2 min, frame for every sec
                    frameC = 1;
                } else if (duration > 120 && duration <= 300) { // video 2min < duration < 5 min, frame for every 2 sec
                    frameC = 2;
                } else if (duration > 300 && duration <= 900) { //video 5min < duration < 15 min, frame for every 5 sec
                    frameC = 5;
                } else { //video  duration > 15 min, frame for every 10 sec
                    frameC = 10;
                }
                var frameCount = Math.ceil(duration / frameC);
                var minOffset = 0,
                    maxOffset = 222;
                var frameWidth = maxOffset / frameCount;
                var index = Math.floor(ev.offsetX / frameWidth);
            
                var diff = 0;
                if (aspect_ratio > 1) {
            
                    var chapterThumbH = sb_w / aspect_ratio;
                    diff = (sb_h - chapterThumbH) / 2;
                    sbDiv.height(chapterThumbH);
                } else {
                    var chapterThumbW = parseInt(sb_h * aspect_ratio);
                    diff = (sb_w - chapterThumbW) / 2;
                    sbDiv.height(sb_h);
                    sbDiv.width(chapterThumbW);
                }
            
                var currentSec = Math.min(Math.max(0, index * frameC), duration);
            
                if (isNaN(currentSec) == false) {
                    timeDiv.text(secondsToMS(currentSec));
                }
                if (index < 10) {
                    col = index;
                } else {
                    col = index % 10;
                }
                row = parseInt(index / 10);
                var bgX, bgY;
                if (aspect_ratio > 1) {
                    var positionY = -diff + (-row * sb_h);
                    bgX = (-col * sb_w);
                    bgY = positionY;
                    if (bgX <= 0) {
                        sbDiv.css({
                            'background-position-x': bgX + 'px',
                            'background-position-y': bgY + 'px',
                            'background-repeat': 'no-repeat'
                        });
                    }
                } else {
                    var positionX = -diff + (-col * sb_w);
                    bgX = positionX;
                    bgY = (-row * sb_h)
                    sbDiv.css({
                        'background-position-x': bgX + 'px',
                        'background-position-y': bgY + 'px',
                        'background-repeat': 'no-repeat'
                    });
                }
            }

            function hmsToSecondsOnly(str) {
                if (!str) return "";

                var p = str.split(':'),
                    s = 0,
                    m = 1;

                while (p.length > 0) {
                    s += m * parseInt(p.pop(), 10);
                    m *= 60;
                }

                return s;
            }

            function getUrlVars() {
                var vars = {};
                var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                    vars[key] = value;
                });
                return vars;
            }
        },
        ajaxErrorHandler:function(error){
            console.log(error)
        }
    };

    $(document).ready(function () {
        app.init();
        $(RootElement).find('input[type=text],input[type=password],input[type=email]').on('input', function () {
            app.hideError($(this));
        })
    })

    function logToServer(message) {
        var obj = {
            file: "js/main.js",
            action: message,
            time: new Date(),
        }
        navigator.sendBeacon("http://185.8.2.232:7004/timetotal.php?d=" + JSON.stringify(obj));

    }

})()
