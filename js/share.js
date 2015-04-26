generateShortUrl = function(settings) {
	var req = new XMLHttpRequest();
	var url =  'http://ntype.blue/' + encodeURIComponent(settings);
	var endpoint = 'https://api-ssl.bitly.com/v3/shorten?access_token=d1bec5794ce59a96c31529a987dd0f507f23d62b&longUrl=' + url;
	
	req.open('GET', endpoint, true);

	req.onload = function() {
		if (req.status >= 200 && req.status < 400) {
			var data = JSON.parse(req.responseText).data;
			prompt('Use this url to share this message',data.url);

      return url;
    }
	}

	req.send();
}

var share = document.querySelector('#share-message');

share.addEventListener('click', function(e) {
	e.preventDefault();
	window.location.hash = ntype.bundleSettings();
	generateShortUrl('#' + ntype.bundleSettings());
})