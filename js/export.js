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
	ntype.addString(stringCache);
	ntype.rotate(matrix);
	ntype.updateTrails();
	ntype.updateLines();

	var Font = new opentype.Font({familyName : 'NType-Testing', styleName : '' + matrix.determinant(), 'unitsPerEm' : 200, glyphs : glyphs});
	Font.download();
}

document.querySelector('#download').addEventListener('click', function(e) {
	e.preventDefault();
	exportOTF(new THREE.Matrix4().copy(ntype.accumulationMatrix));	
});