(function() {
	if (window.hasSharpspringExtRun)
        return true; 
    window.hasSharpspringExtRun = true;

    var app = {
        init: function(){
            app.bindEvents();
        },
        bindEvents: function(){
            app.bindOnMessage();
        },
		expando:function(item){
			return Object.keys(item).filter(function(key) {
					return key.match(/^jQuery/);
				}).map(function(key) {
					return item[key];
				});
		},
		data:function(item, name) {
			return app.expando(item).map(function get(expando) {
				return expando[name];
			}).filter(Boolean);
		},
        bindOnMessage: function(){
            window.addEventListener("message", function(event){
                if(event.data){					
                    if(event.data.action === "set_embed_data_content"){
                        var params = event.data;
                        var page  = params.page;                        
                        var default_domain = params.default_domain;
                        var defaults = params.defaults;
                        var rid,fid,thumbnail,link;
                        var title;
                        if(params.item && params.item.rid){
                            rid = params.item.rid;
                            thumbnail = "https://www.cincopa.com/media-platform/api/thumb.aspx?size=large&rid=" + rid + "&trs=play"
                            link = 'https://'+default_domain+'/watch/'+defaults.video+'!'+rid;
                            title = 'Check out this video I made using RecTrace <a rel="rectrace" href="'+link+'">'+link+'</a>';
                        }else if(params.fid){
                            fid = params.fid;
                            thumbnail = "https://www.cincopa.com/media-platform/api/thumb.aspx?size=large&rid=" + fid;
                            link = 'https://'+default_domain+'/watch/'+fid;
                            title = 'Check out this gallery I made using cincopa <a rel="rectrace gallery" href="'+link+'">'+link+'</a>';
                        }
                        if(page){
                            var video;
                            if(page == 'sharpspring'){
                                video = '<div style="margin: auto; width: 400px;display: inline-block"><a href="' + link + "&recipient_email={$emailAddress}&recipient_name={$firstName}" + '"><br /><img src="' + thumbnail + '" width="400" height="225"/></a><span>' + title + '</span><div>';
                                tinymce.activeEditor.insertContent(video, {format: 'raw'});
                            }else if(page == 'pipedrive'){
                                var editor = document.getElementsByClassName('bodyEditor body')[0];
                                var video = '<div style="width: 400px;display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/><br /></a><span>' + title + '</span></div>';
                                app.embedTheImage(editor, video);
                            }else if(page == 'close'){
                                var editor = document.getElementsByClassName('fr-view')[0];
                                var video = '<div style="width: 400px;display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/></a><br/><span>' + title + '</span></div>';
                                app.embedTheImage(editor, video);
                            }else if(page == 'sugar'){
                                video = '<div class="rectrace-iframe-video" style="width: 400px;display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/></a><br/><span>' + title + '</span></div>';
                                tinymce.activeEditor.insertContent(video, {format: 'raw'});
                            }else if(page == 'ariticapp'){
                                video = '<div class="rectrace-iframe-video" style="width: 400px; display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/></a><br/><span>' + title + '</span></div>';
                                
                                var froalaEditor = app.data(document.getElementsByClassName('editor')[0], 'froala.editor');
                                froalaEditor = froalaEditor[0];
                                froalaEditor.selection.save();
                                froalaEditor.selection.restore();
                                froalaEditor.html.insert(video);
                            }else if(page == 'hubspot'){							
                                video = '<div data-block="true"><div  class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><div class="rectrace-iframe-video" style="width: 400px; display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/></a><br /><span>' + title + '</span></div></div></div>';
                                
                                var editor = document.getElementsByClassName('public-DraftEditor-content')[0];
                                var text = editor.innerHTML;
                                editor.innerHTML  = text + video;						
                                
                            }else if(page == 'zoho'){							
                                video = '<div data-block="true"><div  class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr"><div class="rectrace-iframe-video" style="width: 400px; display: inline-block; text-align:left;"><a href="' + link + '"><img src="' + thumbnail + '" width="400" height="225"/></a><br /><span>' + title + '</span></div></div></div>';
                                var iframe = document.getElementsByTagName('iframe')[0];
                                var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                                var editor = innerDoc.getElementsByClassName('ze_body')[0];
                                app.embedTheImage(editor, video);					
                            }
                        }
                    }
                }
            }, false);
        },
        embedTheImage: function (editor,content) {
            var isOpenedTag = false;
            var caretIndex = app.getCaretPosition(editor);
            var counter = 0;
            editor.innerHTML = editor.innerHTML.trim().replace(/&nbsp;/g, '');
            var html = editor.innerHTML;
            

			if(html.length){
				for (var i = 0; i < html.length; i++) {
					if (counter < caretIndex) {
						if (html[i] != '<' && !isOpenedTag) {
							counter++;
						} else if (html[i] == '<') {
							isOpenedTag = true;
							continue;
						}
						else if (isOpenedTag) {
							isOpenedTag = html[i] === '>' ? false : isOpenedTag; 
						}
					}
					else {
						editor.innerHTML = html.slice(0, i) + content + html.slice(i);
						i = html.length + 1;
					}
				}
			}else{
				editor.innerHTML = content;
			}
        },
        getCaretPosition: function (element) {
				var caretOffset = 0;
				var doc = element.ownerDocument || element.document;
				var win = doc.defaultView || doc.parentWindow;
				var sel;
				if (typeof win.getSelection != "undefined") {
					sel = win.getSelection();
					if (sel.rangeCount > 0) {
						var range = win.getSelection().getRangeAt(0);
						var preCaretRange = range.cloneRange();
						preCaretRange.selectNodeContents(element);
						preCaretRange.setEnd(range.endContainer, range.endOffset);
						caretOffset = preCaretRange.toString().trim().replace(/&nbsp;/g, '').length;
					}
				} else if ( (sel = doc.selection) && sel.type != "Control") {
					var textRange = sel.createRange();
					var preCaretTextRange = doc.body.createTextRange();
					preCaretTextRange.moveToElementText(element);
					preCaretTextRange.setEndPoint("EndToEnd", textRange);
					caretOffset = preCaretTextRange.text.trim().replace(/&nbsp;/g, '').length;
				}
				return caretOffset;
        }
    }
    
    app.init();
})();