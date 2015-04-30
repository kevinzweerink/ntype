
NodeList.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.reduce = Array.prototype.reduce;

var controlsToggle = document.querySelector('#controls-toggle');
var controlPanel = document.querySelector('#controls');
var planeSelectors = document.querySelectorAll('.plane-selector');
var speed = document.querySelector('#speed');
var pause = document.querySelector('.button--pause');
var play = document.querySelector('.button--play');
var reset = document.querySelector('.button--reset');
var forms = document.querySelector('#forms');
var trails = document.querySelector('#trails');
var fpr = document.querySelector('#fpr');
var infoToggle = document.querySelector('#info-toggle');
var closeInfo = document.querySelector("#info-overlay__close")
var info = document.querySelector('#info-overlay')

var speedCache = 0;

function gatherPlanes() {
	ntype.setMatrix(planeSelectors.reduce(
		function(planes, ps) {
			if (ps.checked)
				planes.push(ps.getAttribute('id'));
			return planes;
		}, []).sort()
	)
}

function setPaused(paused) {
	if (paused) {
		if ( pause.classList.contains('pressed') ) {
			return;
		}
		play.classList.remove('pressed');
		pause.classList.add('pressed');
	} else {
		if ( play.classList.contains('pressed') ){
			return;
		}

		play.classList.add('pressed');
		pause.classList.remove('pressed');
	}
}

function toggleInfo() {
	info.classList.toggle('open');
}

infoToggle.addEventListener('click', function(e) {
	e.preventDefault();
	toggleInfo();
});

closeInfo.addEventListener('click', function(e) {
	e.preventDefault();
	toggleInfo();
});

controlsToggle.addEventListener('click', function(e) {
	e.preventDefault();
	controlPanel.classList.toggle('open');
	this.classList.toggle('open');
});

planeSelectors.forEach(function(ps){
	ps.addEventListener('change', function(e) {
		e.preventDefault;
		gatherPlanes();
	});
});

speed.addEventListener('input', function(e) {
	ntype.setSpeed(this.value);
})

pause.addEventListener('click', function(e) {
	if (this.classList.contains('pressed'))
		return

	this.classList.add('pressed');
	play.classList.remove('pressed');
	window.PAUSED = true;
});

play.addEventListener('click', function(e) {
	if (this.classList.contains('pressed'))
		return

	this.classList.add('pressed');
	pause.classList.remove('pressed');
	window.PAUSED = false;
});

reset.addEventListener('click', function(e) {
	ntype.reset();
});

forms.addEventListener('change', function(e){
	ntype.setDrawForms(this.checked);
});

fpr.addEventListener('change', function(e) {
	ntype.setFpr(this.value);
})

trails.addEventListener('change', function(e) {
	ntype.setDrawTrails(this.checked);
});

window.addEventListener('mousewheel', function(e) {
	if (window.PAUSED) {
		ntype.setScrollSpeed(e.wheelDeltaY/5000)
		gatherPlanes();

		ntype.rotate(ntype.scrollMatrix);
		ntype.updateLines();
		ntype.updateTrails();
	}
});

window.addEventListener('MozMousePixelScroll', function(e) {
	if (window.PAUSED) {
		ntype.rotate();
		ntype.updateLines();
		ntype.updateTrails();
	}
});

window.addEventListener('defaultsLoaded', function(e) {
	var settings = window.defaults;

	if (settings.rotationPlanes) {

		planeSelectors.forEach(function(ps) {
			ps.checked = false;
		});

		settings.rotationPlanes.forEach(function(plane) {
			planeSelectors.forEach(function(ps) {
				if (plane == ps.getAttribute('id')) {
					ps.checked = true;
				}
			});
		});
	}

	if (settings.speed) {
		speed.value = settings.speed;
	}

	if (settings.fpr) {
		fpr.value = settings.fpr;
	}

	if (settings.drawTrails != undefined) {
		trails.checked = settings.drawTrails;
	}

	if (settings.drawForms != undefined) {
		forms.checked = settings.drawForms;
	}
});