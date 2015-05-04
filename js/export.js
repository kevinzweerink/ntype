// Test rotation state stuff

function exportOTF(matrix) {

	var glyphs = [];
	var notdefPath = new opentype.Path();
	notdefPath.moveTo(100, 0);
	notdefPath.lineTo(100, 700);
	notdefPath.lineTo(0,700);
	notdefPath.close();
	var notdefGlyph = new opentype.Glyph({
	    name: '.notdef',
	    unicode: 0,
	    advanceWidth: 650,
	    path: notdefPath
	});

	glyphs.push(notdefGlyph);

	var stringCache = ntype.string;

	for (var key in window.TYPE) {
		ntype.clear();
		ntype.reset();
		ntype.addLetter(key);
		ntype.rotate(matrix);
		ntype.updateTrails();
		ntype.updateLines();

		var projectedLines = ntype.shapes[0].get2DProjection(ntype.camera),
				glyph = new opentype.Glyph({
					name : key,
					unicode : key.charCodeAt(0),
					advanceWidth : 300
				});

		glyph.path = projectedLines.reduce(function(path, line) {
			var point1 = line[0],
					point2 = line[1],
					matrix = new THREE.Matrix4().makeRotationZ(Math.PI/2);
					lineOffset = new THREE.Vector3().copy(point2).sub(point1).applyMatrix4(matrix).normalize();

			path.moveTo(point1.x - lineOffset.x, point1.y - lineOffset.y);
			path.lineTo(point1.x + lineOffset.x, point1.y + lineOffset.y);
			path.lineTo(point2.x + lineOffset.x, point2.y + lineOffset.y);
			path.lineTo(point2.x - lineOffset.x, point2.y - lineOffset.y);
			path.close();

			return path;
		}, new opentype.Path());

		glyphs.push(glyph);
	}

	ntype.clear();
	ntype.reset();
	ntype.addString(stringCache);
	ntype.rotate(matrix);
	ntype.trailsNeedReset = true;
	ntype.updateTrails();
	ntype.updateLines();

	var Font = new opentype.Font({familyName : 'NType', styleName : 'Rotation-' + matrix.determinant(), 'unitsPerEm' : 200, glyphs : glyphs});
	try {
		Font.download();
	}

	catch(err) {
		
		var req = new XMLHttpRequest();
		var settings = '#' + ntype.bundleSettings();
		var url =  'http://ntype.blue/' + encodeURIComponent(settings);
		var endpoint = 'https://api-ssl.bitly.com/v3/shorten?access_token=d1bec5794ce59a96c31529a987dd0f507f23d62b&longUrl=' + url;
	
		req.open('GET', endpoint, true);

		req.onload = function() {
			if (req.status >= 200 && req.status < 400) {
				var data = JSON.parse(req.responseText).data;
				prompt("Looks like your browser doesn't support this feature yet. Open this URL in Chrome to restore the current settings.", data.url);
	      return url;
	    }
		}

		req.send();
	}
}

document.querySelector('#download').addEventListener('click', function(e) {
	e.preventDefault();
	exportOTF(new THREE.Matrix4().copy(ntype.accumulationMatrix));	
});