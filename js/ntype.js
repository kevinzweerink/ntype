window.cos = Math.cos;
window.sin = Math.sin;

var SimpleDimensionalObject = function() {
	this.originalFaceLength = 0;
	this.originalVertices = [];
	this.vertices = [];
	this.joins = [];
	this.lines = [];
	this.projection = [];
	this.trails = [];

	this.get2DProjection = function(camera) {
		return this.lines.map(function(line) {
			var points = line.geometry.vertices;
			return points.map(function(point) {
				var p2d = new THREE.Vector3().copy(point).project(camera);
				p2d.setX(ntype.w * p2d.x);
				p2d.setY(ntype.h * p2d.y);

				return p2d;
			});
		});
	}
}

var NType = function(el) {
	// THREE Stuff
	this.scene = new THREE.Scene();
	this.w = window.innerWidth;
	this.h = window.innerHeight;
	this.ORTHO = new THREE.OrthographicCamera( this.w / - 2, this.w / 2, this.h / 2, this.h / - 2, -2000, 2000 );
	this.PERSP = new THREE.PerspectiveCamera( 75, this.w / this.h, 0.1, 1000 );
	this.camera = this.ORTHO;
	this.renderer = new THREE.WebGLRenderer({
		antialias : true
	});

	// Settings
	this.drawTrails = false;
	this.drawForms = true;

	// Array of all letterform SDOs
	this.shapes = [];

	// Rotation fraction per frame
	this.speed = Math.PI/200;

	// Number of past vertex positions to be used in drawing trails
	this.fpr = 100;

	// Currently displayed letters as a string
	// Only for reading, setting this to something new
	// has no effect. Or it might break something
	// Probably won't do anything though
	this.string = "";

	// Rotation variables
	// rotationPlanes = array of strings representing the planes to be rotated
	// on. Note that the order of the letters is important
	this.rotationPlanes = [];

	// Defaults
	this.rotationPlanes.push('yz');
	this.rotationPlanes.push('zw');

	// The matrix that will be used to update the position
	// when called each frame from rotate()
	// This is used to transform the vertices of the 4D shape
	// and is a combination of the other planar rotation matrices
	// found in NType.prototype._matrices
	this.matrix = new THREE.Matrix4();

	// The matrix that will be updated on scroll with the mousewheel
	// deltaY property
	this.scrollMatrix = new THREE.Matrix4();

	this.accumulationMatrix = new THREE.Matrix4();

	// Set basic THREE.js rendering things, set matrix, etc
	this.setup = function() {
		this.camera.position.z = 500;
		this.camera.lookAt(new THREE.Vector3(0,0,0));
		this.renderer.setSize(this.w,this.h);
		this.renderer.setClearColor(0xFFFFFF);
		document.body.appendChild(this.renderer.domElement);
		this._matrices.update(this.speed);
		this.setMatrix(this.rotationPlanes);
	}

	// Add lines for a simple dimensional objects
	// projected vertices and joins
	this.addLines = function(s) {
		var that = this;
		s.lines = s.joins.map(function(j, i) {

			var lineGeo = new THREE.Geometry();
			lineGeo.vertices = j.map(function(v) {
				return s.projection[v];
			});

			var lineMaterial = i < s.originalFaceLength || ( i > (s.originalFaceLength * 4) - 1 && i < s.originalFaceLength * 5  ) ? that.materials.lineHeavy : that.materials.line;

			var line = new THREE.Line(lineGeo, lineMaterial);
			that.scene.add(line);

			return line;
		});
	}

	// Sets fpr and clears the trails so that
	// the new value will be respected
	this.setFpr = function(n) {
		this.fpr = parseInt(n);
		this.clearTrails();
	}

	// Also updates matrices for the new speed
	this.setSpeed = function(s) {
		this.speed = parseFloat(s);
		this._matrices.update(this.speed);

		// Technically redundant to call this
		// since this.rotationPlanes is set within this.setMatrix, but
		// it's necessary to update the matrix for the new speed
		this.setMatrix(this.rotationPlanes);
	}

	this.setScrollSpeed = function(s) {
		this.scrollSpeed = parseFloat(s);
		this._scrollMatrices.update(this.scrollSpeed);
		this.setMatrix(this.rotationPlanes);
	}

	this.setMatrix = function(planes) {
		var that = this;
		this.rotationPlanes = planes;
		this.matrix = planes.reduce(function(m, p) {
			if ( that._matrices[p] )
				m.multiply( that._matrices[p] );

			return m;
		}, new THREE.Matrix4());

		this.scrollMatrix = planes.reduce(function(m,p) {
			if (that._scrollMatrices[p]) {
				m.multiply(that._scrollMatrices[p]);
			}
			return m;
		}, new THREE.Matrix4());
	}

	this.clearTrails = function() {
		var that = this;
		this.shapes.forEach(function(s) {
			s.trails.forEach(function(t) {
				that.scene.remove(t);
			});

			s.trails = [];
		});
	}


	// Sets draw forms and also removes or adds
	// the forms themselves if necessary
	this.setDrawForms = function(b) {
		var that = this;
		if (b) {
			this.drawForms = true;
			this.project();
			this.updateLines();
			this.updateTrails();
		} else {
			this.drawForms = false;
			this.shapes.forEach(function(s) {
				s.lines.forEach(function(l) {
					that.scene.remove(l);
				})
				s.lines = [];
			});
		}
	}

	this.setDrawTrails = function(b) {
		var that = this;
		if (b) {
			this.drawTrails = true;
		} else {
			this.drawTrails = false;
			this.shapes.forEach(function(s) {
				s.trails.forEach(function(t){
					that.scene.remove(t);
				});

				s.trails = [];
			});
		}
	}

	this.addShape = function(vertices) {
		this.shapes.push(this.extrude(vertices));
		this.trailsNeedReset = true;
		if (window.PAUSED) {
			this.project();
			this.updateLines();
			this.updateTrails();
		}
	}

	this.updateLines = function() {
		var that = this;
		this.shapes.forEach(function(s){
			if (s.lines.length == 0 && that.drawForms)
				that.addLines(s);

			s.lines.forEach(function(l, i) {
				// each vertex corresponds to part of the joins array at the
				// same position as this iteration
				l.geometry.vertices = s.joins[i].reduce(function(a, j) {
					a.push(s.projection[j]);
					return a;
				}, []);
				l.geometry.verticesNeedUpdate = true;
			});
		});
	}

	// Extrudes a set of 2D vertices (as simple nested arrays)
	// to a 4D SDO
	this.extrude = function(vertices) {
		var that = this;
		var extrusion = this.utils.extrude4(vertices);
		var vertices = extrusion.vertices.map(function(v) {
			var vect = new THREE.Vector4(
				v[0],
				v[1],
				v[2],
				v[3]
			);

			return vect;
		});

		var SDO = new SimpleDimensionalObject();
		SDO.vertices = vertices;
		SDO.joins = extrusion.joins;
		SDO.originalVertices = vertices.map(function(v) {
			return new THREE.Vector4().copy(v);
		});
		SDO.originalFaceLength = extrusion.originalFaceLength;

		return SDO;
	}

	// Convenience method to set the content to 
	// a string
	this.addString = function(str) {
		var that = this;
		var arr = str.split("");
		arr.forEach(function(l) {
			that.addLetter(l);
		});
	}

	this.addLetter = function(letter) {
		this.addShape(window.TYPE[letter]);
		this.string += letter;
	}

	// Deletes last letter in array
	this.backspace = function() {
		var toRemove = this.shapes.pop();
		var that = this;
		toRemove.lines.forEach(function(l) {
			that.scene.remove(l);
		})

		toRemove.trails.forEach(function(t) {
			that.scene.remove(t);
		});

		this.trailsNeedReset = true;
		if (window.PAUSED) {
			this.project();
			this.updateLines();
			this.updateTrails();
		}

		this.string = this.string.substr(0, this.string.length - 1);
	}

	// Calculates the 3D projection of a 4D shape
	this.project = function() {
		var that = this;
		var width = this.w / this.shapes.length;
		if (width > 200)
			width = 200;

		var pad = width * .75;

		var total = width * this.shapes.length;

		this.shapes.forEach(function(s, i) {
			s.projection = s.vertices.map(function(v) {
				var subVector = new THREE.Vector3(
					(total/2) - (i * width) - (width/2),
					0,
					0
				);
				return that.utils.projectW(v).multiplyScalar(width - pad).sub(subVector);
			});
		});
	}

	// Rotates all shapes
	// If matrix is passed in, uses that matrix
	// if no matrix, uses this.matrix
	this.rotate = function(matrix) {
		var that = this,
				_matrix = matrix ? matrix : that.matrix;

		this.shapes.forEach(function(s) {
			s.vertices.forEach(function(v) {
				v.applyMatrix4(_matrix)
			});
		});

		this.accumulationMatrix.multiply(_matrix);

		this.project();
	}

	// Convenience method to generate an array of length n
	// containing only the current vector position v
	this.generateEmptyTrailsArray = function(n, v) {
		var a = [], i = -1;
		while (++i < n) {
			a.push(new THREE.Vector3().copy(v));
		}

		return a;
	}

	this.updateTrails = function() {
		if (!this.drawTrails)
			return;

		var that = this;

		this.shapes.forEach(function(shape, i) {
			shape.projection.forEach(function(vertex, j) {
				if (!shape.trails[j]) {
					var geo = new THREE.Geometry();
					geo.vertices = that.generateEmptyTrailsArray(that.fpr, vertex);
					shape.trails[j] = new THREE.Line(geo, that.materials.lineLight);
					that.scene.add(shape.trails[j]);
				}

				if (that.trailsNeedReset) {
					that.shapes.forEach(function(s) {
						s.trails.forEach(function(t, i) {
							t.geometry.vertices = that.generateEmptyTrailsArray(that.fpr, s.projection[i]);
						})
					});

					that.trailsNeedReset = false;
				}

				shape.trails[j].geometry.vertices.forEach(function(v, i) {
					if (i < shape.trails[j].geometry.vertices.length - 1)
						v.copy(shape.trails[j].geometry.vertices[i+1]);
				});

				shape.trails[j].geometry.vertices[shape.trails[j].geometry.vertices.length - 1].copy(vertex);

				shape.trails[j].geometry.verticesNeedUpdate = true;
			});
		});
	}

	// starts the thing
	this.begin = function() {
		window.requestAnimationFrame(this.begin.bind(this));
		if (!window.PAUSED) {
			this.rotate();
			this.updateLines();
			this.updateTrails();
		}
		this.renderer.render(this.scene, this.camera);
	}

	// resets the all shapes to 0 rotation
	this.reset = function() {
		this.shapes.forEach(function(s) {
			s.vertices = s.originalVertices.map(function(v) {
				return new THREE.Vector4().copy(v);
			});
		});

		this.accumulationMatrix = new THREE.Matrix4();

		this.trailsNeedReset = true;
		this.project();
		this.updateLines();
		this.updateTrails();
	}

	this.clear = function() {
		while (this.string.length > 0) {
			this.backspace();
		}
	}


	this.setup();
}

// Libs
NType.prototype.materials = {
	line : new THREE.LineBasicMaterial({color: 0x0000FF, linewidth : 1.5}),
	lineLight : new THREE.LineBasicMaterial({color: 0x0000FF, lineWidth: 1, opacity: 1, transparent: true}),
	lineHeavy : new THREE.LineBasicMaterial({color: 0x0000FF, linewidth : 3})
}

NType.prototype.utils = {
	projectW : function(v4) {
		var skew = (v4.w * .9) + 2;
		return new THREE.Vector3(
			v4.x * skew,
			v4.y * skew,
			v4.z * skew
		)
	},

	normalizeVertices : function(arr) {
		var max = 1;
		var min = Infinity;
		var newArr = arr.map( function(a) {
			max = Math.max(max, Math.max.apply(null, a));
			min = Math.min(min, Math.min.apply(null, a));
			return a;
		});

		newArr = newArr.map(function(a) {
			return a.map(function(v) {
				return (v - min) / (max - min);
			});
		});

		return newArr;
	},

	loopRange : function(n, start) {
		if (start == undefined)
			start = 0;

		var i = start - 1,
				loop = [];

		while (++i < n - 1) {
			loop.push([i, i+1]);
		}

		loop.push([n - 1, start]);
		return loop;
	},

	connectCrosses : function(faceLength) {
		var i = -1,
				joins = [];

		while (++i < faceLength) {
			joins.push([i, i + faceLength]);
		}

		return joins;
	},

	extrude3 : function(vertices) {
		var extruded = new SimpleDimensionalObject(),
				verts0 = vertices.map(function(v) {
					var vertex = v.slice(0);
					vertex.push(-.5)
					return vertex;
				}),
				verts1 = vertices.map(function(v) {
					var vertex = v.slice(0);
					vertex.push(.5)
					return vertex;
				}),
				combinedVertices = verts0.concat(verts1),
				joins0 = this.loopRange(vertices.length),
				joins1 = joins0.map(function(j) { 
					return j.map(function(v) { 
						return v + vertices.length 
					}); 
				}),
				crosses = this.connectCrosses(vertices.length),
				combinedJoins = joins0.concat(joins1).concat(crosses);

		extruded.vertices = combinedVertices;
		extruded.joins = combinedJoins;

		return extruded;
	},

	extrude4 : function(vertices) {
		var extrusion0 = this.extrude3(vertices),
				extrusion1 = this.extrude3(vertices),
				extruded = new SimpleDimensionalObject();

		extrusion0.vertices.forEach(function(v) {
			v.push(-.5);
		});

		extrusion1.vertices.forEach(function(v) {
			v.push(.5);
		});

		extrusion1.joins.forEach(function(v) {
			v[0] += vertices.length * 2;
			v[1] += vertices.length * 2;
		});

		extruded.vertices = extrusion0.vertices.concat(extrusion1.vertices);

		extruded.joins = extrusion0.joins.concat(extrusion1.joins);
		extruded.joins = extruded.joins.concat( this.connectCrosses( vertices.length * 2 ) );
		extruded.originalFaceLength = vertices.length;

		return extruded;
	}
}

NType.prototype._scrollMatrices = {
	zw : new THREE.Matrix4(),
	yw : new THREE.Matrix4(),
	xw : new THREE.Matrix4(),
	xy : new THREE.Matrix4(),
	yz : new THREE.Matrix4(),
	xz : new THREE.Matrix4(),
	setzw : function(t) {
		this.zw.set(
			1,      0,      0,      0,
			0,      1,      0,      0,
			0,      0,  cos(t),-sin(t),
			0,      0,  sin(t),  cos(t)
		);
	},
	setyw : function(t) {
		this.yw.set(
	      1,      0,      0,      0,
				0, cos(t),      0,-sin(t),
				0,      0,      1,      0,
				0, sin(t),      0,  cos(t)
		)
	},
	setxw : function(t) {
		this.xw.set(
		 cos(t),      0,      0, sin(t),
					0,      1,      0,      0,
					0,      0,      1,      0,
		-sin(t),      0,      0,  cos(t)
		);
	},
	setxy : function(t) {
		this.xy.set(
 cos(t), sin(t),      0,      0,
-sin(t), cos(t),      0,      0,
			0,      0,      1,			0,
			0,      0,  		0,			1
		);
	},
	setyz : function(t) {
		this.yz.set(
			1,      0,      0,      0,
			0, cos(t), sin(t),      0,
			0,-sin(t), cos(t),			0,
			0,      0,  		0,  		1
		);
	},
	setxz : function(t) {
		this.xz.set(
 cos(t), 			0,-sin(t),      0,
			0, 			1,      0,      0,
 sin(t),      0, cos(t),			0,
			0,      0,  		0,			1	
		);
	},

	update : function(t) {
		this.setxw(t);
		this.setxy(t);
		this.setxz(t);
		this.setyw(t);
		this.setyz(t);
		this.setzw(t);
	}
}

NType.prototype._matrices = {
	zw : new THREE.Matrix4(),
	yw : new THREE.Matrix4(),
	xw : new THREE.Matrix4(),
	xy : new THREE.Matrix4(),
	yz : new THREE.Matrix4(),
	xz : new THREE.Matrix4(),
	setzw : function(t) {
		this.zw.set(
			1,      0,      0,      0,
			0,      1,      0,      0,
			0,      0,  cos(t),-sin(t),
			0,      0,  sin(t),  cos(t)
		);
	},
	setyw : function(t) {
		this.yw.set(
	      1,      0,      0,      0,
				0, cos(t),      0,-sin(t),
				0,      0,      1,      0,
				0, sin(t),      0,  cos(t)
		)
	},
	setxw : function(t) {
		this.xw.set(
		 cos(t),      0,      0, sin(t),
					0,      1,      0,      0,
					0,      0,      1,      0,
		-sin(t),      0,      0,  cos(t)
		);
	},
	setxy : function(t) {
		this.xy.set(
 cos(t), sin(t),      0,      0,
-sin(t), cos(t),      0,      0,
			0,      0,      1,			0,
			0,      0,  		0,			1
		);
	},
	setyz : function(t) {
		this.yz.set(
			1,      0,      0,      0,
			0, cos(t), sin(t),      0,
			0,-sin(t), cos(t),			0,
			0,      0,  		0,  		1
		);
	},
	setxz : function(t) {
		this.xz.set(
 cos(t), 			0,-sin(t),      0,
			0, 			1,      0,      0,
 sin(t),      0, cos(t),			0,
			0,      0,  		0,			1	
		);
	},

	update : function(t) {
		this.setxw(t);
		this.setxy(t);
		this.setxz(t);
		this.setyw(t);
		this.setyz(t);
		this.setzw(t);
	}
}

// Exports settings as a string
// ready to be hashed in the url
NType.prototype.bundleSettings = function() {
	var settings = {};
	settings.speed = this.speed;
	settings.rotationPlanes = this.rotationPlanes;
	settings.fpr = this.fpr;
	settings.string = this.string;
	settings.drawForms = this.drawForms;
	settings.drawTrails = this.drawTrails;

	var string = "";

	for (var key in settings) {
		string += key;
		string += '=';
		string += settings[key];
		string += '&';
	}

	string = string.substr(0, string.length - 1);

	return string;
}

NType.prototype.parseUrl = function() {
	var hash = window.location.hash.substr(1),
			settings,
			params;

	if (!hash.length || hash.length < 1) {
		return false;
	}

	params = hash.split('&');
	settings = params.reduce(function(settings, p) {
		var param = p.split('=')
		settings[param[0]] = param[1];

		return settings;
	}, {});

	if (settings.rotationPlanes) {
		settings.rotationPlanes = settings.rotationPlanes.split(',');
	}

	if (settings.drawTrails) {
		settings.drawTrails = (settings.drawTrails === 'true');
	}

	if (settings.drawForms) {
		settings.drawForms = (settings.drawForms === 'true');
	}

	return settings;
}

// Loads settings from url
// Dispatches event so that controls can update
NType.prototype.importSettings = function() {
	var settings = this.parseUrl();

	window.defaults = settings;
	var defaultsLoaded = new Event('defaultsLoaded');
	window.dispatchEvent(defaultsLoaded);

	if (!settings)
		return false;

	if (settings.speed)
		this.setSpeed(parseFloat(settings.speed));

	if (settings.fpr)
		this.setFpr(parseFloat(settings.fpr));

	if (settings.drawForms != undefined) {
		this.setDrawForms(settings.drawForms);
	}

	if (settings.drawTrails != undefined)
		this.setDrawTrails(settings.drawTrails);


	if (settings.rotationPlanes) {
		this.rotationPlanes = settings.rotationPlanes;
		this.setMatrix(this.rotationPlanes);
	}
	
	if (settings.string) {
		this.addString(settings.string);
	}

	return true;
}

// Normalizes all vertices in an object containing arrays
// using the same scalar (maximum value in object)
// Also cancels offset
NType.prototype.utils.normalizeLetterSet = function(set) {
	for (var letterKey in set) {
		var letter = set[letterKey];
		var offset = letter.reduce(function(min, vertex) {
			if (vertex[0] < min)
				min = vertex[0];

			return min;
		}, Infinity);

		letter = letter.map(function(vertex) {
			return [vertex[0] - offset, vertex[1]];
		});
	};

	var max = 0;

	for (var letterKey in set) {
		var letter = set[letterKey];
		letter.forEach(function(vertex) {
			if (vertex[0] > max)
				max = vertex[0];

			if (vertex[1] > max)
				max = vertex[1];
		});
	}

	for (var letterKey in set) {
		var letter = set[letterKey];
		letter.forEach(function(vertex) {
			vertex[0] /= max;
			vertex[1] /= max;
		});

		var size = letter.reduce(function(size, vertex) {
			if (vertex[0] > size.x)
				size.x = vertex[0];

			if (vertex[1] > size.y)
				size.y = vertex[1];

			return size		
		}, {x : 0, y : 0});

		letter.forEach(function(vertex) {
			vertex[0] -= size.x/2;
			vertex[1] -= size.y/2;
		});
	}
}