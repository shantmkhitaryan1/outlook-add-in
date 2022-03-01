function injectStyle(file, node, id) {
	if(document.getElementById(id) == null){
		var th = document.getElementsByTagName(node)[0];
		var s = document.createElement('link');
		s.id = id;
		s.setAttribute('type', 'text/css');
		s.setAttribute('rel', 'stylesheet');
		s.setAttribute('href', file);
		th.appendChild(s);
	} 
}

function injectScript(file, node, id) {
	if(document.getElementById(id) == null){
		var th = document.getElementsByTagName(node)[0];
		var s = document.createElement('script');
		s.id = id;
		s.setAttribute('type', 'text/javascript');
		s.setAttribute('src', file);
		th.appendChild(s);
	}
}
injectStyle( chrome.extension.getURL('css/main.css'), 'body', "cincopa_main_css");
injectScript( chrome.extension.getURL('js/injected.js'), 'body', "rectrace_extension_js");
