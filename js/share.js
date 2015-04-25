generateShortUrl = function() {
	var req = new XMLHttpRequest();
	var url =  'http://kevinzweerink.com/scraps/ntype/';
	var endpoint = 'https://api-ssl.bitly.com/v3/shorten?access_token=d1bec5794ce59a96c31529a987dd0f507f23d62b&longUrl=' + url;

	console.log(url, endpoint);

	req.open('GET', endpoint, true);

	req.onload = function() {
		if (req.status >= 200 && req.status < 400) {
			var data = JSON.parse(req.responseText).data;
      return url;
    }
	}

	req.send();
}