InboxSDK.load('1', 'sdk_rectrace_f3ca8e7652').then(function (sdk) {

    // the SDK has been loaded, now do something with it!
    sdk.Compose.registerComposeViewHandler(function (composeView) {
        var default_domain,defaults;
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (chrome.runtime.lastError) {
                return;
            }
            if (request.key == 'sendEventGmailSuccess') {
                var data = request.data;
                var rid,fid;
                rid = data?.item?.rid;
                fid = data?.fid;
                default_domain = request.default_domain;
                defaults = request.defaults
                if(rid){
                    composeView.insertHTMLIntoBodyAtCursor(makeHtml( {rid:rid} ));
                }else if(fid){
                    composeView.insertHTMLIntoBodyAtCursor(makeHtml( {fid:fid} ));
                }
            }
        })

        function generateThumbnail(id,type = 'rid') {
            if(type == 'rid'){
                return "https://www.cincopa.com/media-platform/api/thumb.aspx?size=large&rid=" + id + "&trs=play"
            }else{
                return "https://www.cincopa.com/media-platform/api/thumb.aspx?size=large&fid=" + id;
            }
            
        }

        function makeHtml(options, recipient, firstPart) {
            var thumbnail,link;
            if(options.rid){
                thumbnail = generateThumbnail(options.rid);
                link = 'https://'+default_domain+'/watch/' + defaults.video + "!" + options.rid;
            }else if(options.fid){
                thumbnail = generateThumbnail(options.fid,'fid');
                link = 'https://'+default_domain+'/watch/' + options.fid;
            }

            if (recipient) {
                link += "#";
                if (recipient.emailAddress && recipient.name) {
                    link += "cpudemail=" + recipient.emailAddress + "&cpudname=" + recipient.name;
                } else if (recipient.emailAddress) {
                    link += "cpudemail=" + recipient.emailAddress
                } else {
                    link += "cpudname=" + recipient.name;
                }
            }
            var html = firstPart ? "<br><br>" + firstPart : "<br><br>";
            html += '<a rel="rectrace" href="' + link + '"><img src="' + thumbnail + '" width="400" height="225" alt="This video recorded with Rectrace" /></a><span><br><br>' +
                'Check out this '+ (options.rid?'video':'gallery') +' I made using RecTrace </span><a rel="rectrace" href="' + link + '"><span rel="rectrace">' + link + '</span></a>';
            return html;
        }

        function replaceRecipients(oldHtml, recipients) {
            var div = document.createElement("div");
            div.innerHTML = oldHtml;
            var anchors = div.querySelectorAll('a[rel="rectrace"]');
            for (var anchor = 0; anchor < anchors.length; anchor++) {
                anchors[anchor].href = replaceUrl(anchors[anchor].href, recipients);
            }
            var spans = div.querySelectorAll('span[rel="rectrace"]');

            for (var span = 0; span < spans.length; span++) {
                spans[span].innerText = replaceUrl(spans[span].innerText, recipients);
            }
            return div.innerHTML;
        }

        function replaceUrl(oldUrl, recipients) {
            var url = oldUrl;
            var path = "";
            if (url.indexOf("#") > -1) {
                path = url.substring(0, url.indexOf("#"))
            } else {
                path = url;
            }
            var recipient = null
            if (recipients.length === 1) {
                recipient = recipients[0];
            }

            if (recipient) {
                path += "#";
                if (recipient.emailAddress && recipient.name) {
                    path += "cpudemail=" + recipient.emailAddress + "&cpudname=" + recipient.name;
                } else if (recipient.emailAddress) {
                    path += "cpudemail=" + recipient.emailAddress
                } else {
                    path += "cpudname=" + recipient.name;
                }
            }
            return path;
        }

        // a compose view has come into existence, do something with it!
        composeView.addButton({
            title: "Insert Rectrace Videos",
            iconUrl: chrome.extension.getURL("img/logo_32.png"),
            onClick: function (event) {
                // to background .js
                chrome.extension.sendMessage({
                    action: 'appendPopupFromGmail'
                }, function () {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            },
        });

        composeView.on('recipientsChanged', function (event) {
            var recipients = composeView.getToRecipients();
            var recipient = null
            if (recipients.length === 1) {
                recipient = recipients[0];
            };
            var newHtml = replaceRecipients(composeView.getHTMLContent(), composeView.getToRecipients())
            composeView.setBodyHTML(newHtml);
        });
    });

});
