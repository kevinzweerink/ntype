NType.prototype.utils.normalizeLetterSet(window.TYPE);

var ntype = new NType(window);

if ( !ntype.importSettings() )
	ntype.addString('NTYPE');

ntype.begin();

window.addEventListener('keydown', function(e) {
	if (e.keyCode == 8) {
		e.preventDefault();
	}
});

window.addEventListener('keyup', function(e) {
	var key = String.fromCharCode(e.keyCode);

	if (window.TYPE[key] && window.TYPE[key].length > 0) {
		ntype.addLetter(key);
	}

	if (e.keyCode == 32) {
		e.preventDefault();
		window.PAUSED = !window.PAUSED;
		setPaused(window.PAUSED);
	}

	if (e.keyCode == 8) {
		e.preventDefault();
		ntype.backspace();
	}
});
