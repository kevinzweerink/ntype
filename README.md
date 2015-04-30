# NType

__4D Type Extrusion__

_[ntype.blue](http://ntype.blue "Ntype.Blue")_

![Ntype](http://ntype.blue/assets/ntype.jpg)

NType is a website for visualizing 4th-dimension extrusions of letterforms. It is rendered with WebGL and Three.js, and uses opentype.js to write and download open type files.

Controls on [ntype.blue](http://ntype.blue):

### Controls & Settings

* __Letters__ Type any letters to see them in 4D.
* __Backspace__ Use backspace to remove letters.
* __Space__ Pause and play the animation.
* __Scrolling While Paused__ Scrub through the animation.
* __Control Panel__ Click the icon in the bottom right to open the control panel and access many different variables of the extrusion visualization.

### Actions

* __Share Message__ Generate a shortened URL to be used for sending the current text and settings through hyperspace to a friend
* __Download Rotation As OTF__ Get a working OTF of the full character set rotated to the current position. *This doesn't quite always work--scroll scrubbing throws off the rotation amount, as does adding new planes mid-rotation.*

## Methods & Implementation

I'm going to try to document this well, because there aren't that many resources for 4D graphics. I'm sure that I do a lot of this poorly or inefficiently, but I figured I should go ahead and document it anyway.

### Acknowledgement

NType uses two open-source libraries:

* __[Three.js](http://threejs.org)__ Handles 3D rendering, matrix math, etc
* __[Opentype.js](http://nodebox.github.io/opentype.js/)__ Handles writing and exporting .otf files

### 4D Extrusion

NType starts with a set of 2D block letters which were designed specifically to maintain legibility through complex extrusion with the fewest number of vertices. These letters were originally drawn on 28x24 unit grid in Illustrator, and then their vertices were manually copied into the file [type.js](http://github.com/kevinzweerink/ntype/tree/master/js/type.js).

	window.TYPE = {};

	window.TYPE.A = [
		[2,0],
		[12,24],
		[17,24],
		[27,0],
		[22,0],
		[20,5],
		[9,5],
		[7,0]
	]

	// ... etc.

#### Step 1. Normalize Letterforms

To make the extrusion simpler, the first step will be to normalize the entire set of letterforms such that the maximum vertex value across the whole alphabet is 1. In `NType.prototype.utils` there is a function called `normalizeLetterSet`. The first action taken by this function is to loop through each letter in the set, determine its offset from 0 on the leftmost side (many of the letters are centered in the 28x24 grid), and move all the vertices so that the shape begins at 0. 

Next the function loops through each vertex in each property of the object passed to it (in this case the `window.TYPE` object) and finds the maximum value. Once the maximum vertex value in the set has been established, the set is again looped through and each value is divided by the maximum value to scale the full set down to a 0-1 range (except for Q, the only letterform in this set with a negative value).

Finally, the width and height of each vertex set is measured again in their new position, and the entire set is again translated by -1/2 of its width and height, so that now the center of the letterform is at `[0,0]`, which will make rotations much simpler.

#### Step 2. Connect vertices

In order to deal with these forms, we'll need to keep track of more than just the vertices themselves, we'll also need an index of which vertices are connected to which other vertices. To start out, with our simple 2D letterform, each vertex is connected to the next vertex in the array, and the final vertex is connected back around to the first.

In `NType.js` there's a data structure called `SimpleDimensionalObject`. This just serves as a place to hold all of the related pieces of data we'll need to keep track of. For now, we need it to keep track of our vertices and our joins index.

To start out, the joins index should just be an array of vertex connections representing the outline of our shape. For example, a square would have the following vertices and joins:

	var square = new SimpleDimensionalObject();
	square.vertices = [
		[0,1],
		[1,1],
		[1,0],
		[0,0]
	];
	square.joins = [
		[0,1],
		[1,2],
		[2,3],
		[3,0]
	];

We can generate these joins pretty easily by looping through our vertices array and pushing `[i, i+1]` to the joins array with a special handler for the last item that pushes `[i, 0]` instead.

#### Step 3. Extrude to 3D

*In implementation, the extrusions are all handled by an instance of `NType`, which handles extrusion, rotation, and rendering, for documentation I'm just going to explain these steps irrespective to the specifics of their implementation*

The actual extrusion process is really pretty simple. Now that the letter is of unit size, extrusion is a matter of adding a third dimension to the 2D vertices, copying these vertices, and translating the new vertices one unit in the `z` dimension. But, since we're trying to center the form on the origin point `[0,0]`, we should set the `z` vertices for each set to `-0.5` and `0.5` instead of `0` and `1`.

The other thing we need to keep track of when performing this translation is the joins. First we'll need to add the joins that connect the translated vertices to themselves. To do this, we can use our `[i, i+1]` loop from above, but instead of simply using `i`, we'll need to make sure we're referencing the second set of vertices by pushing joins for `[i + vertices.length/2, i + 1 + vertices.length/2]`.

Now we'll need to connect the original vertices to the cloned vertices. We know that each vertex pair is offset from each other by half of the length of the `vertices` array they live in. So, for each of the original vertices we'll push `[i, i+vertices.length/2]` to the `joins` array.

This pattern should reliably take a set of 2D vertices and joins and return a set of 3D vertices and joins that represent a unit-length extrusion of the 2D form into 3D space.

#### Step 4. Extrude to 4D

Surprisingly, once the mechanics for extruding to 3D have been established, extruding to 4D is a relatively simple proposition. The idea is the same: take a vertex set of `n` dimensions, copy it, add a new dimension (offsetting the copied set by 1 unit). To compute the joins, the idea is again the same: first copy the joins from the first set and add 1/2 of the (new, 4D) `vertices` array length to them, then make a new join between each vertex `i` in the original vertex set and its corresponding `i + vertices.length/2` vertex in the new set.

This two-step extrusion will programatically create a set of 4D vertices and joins from each of our flat letterforms.

### Projection

Now that we have our 4D extrusion, there are two things we want to do to it. We want to render it in its current position, and we want to begin to rotate it (because 4D shapes look much cooler when you rotate them on the xw, yw, or zw planes).

First, we're going to transform the data from a simple n-dimensional array into a Three.js `Vector4` object, since we want to use these to project into 3D and then draw our projection in 3D space.

Once our data has been transformed, what makes sense is to preserve this first set of vertices in a new array on the `SimpleDimensionalObject` we've made called `originalVertices`. Once we've done that, we can mess with the `vertices` array as much as we want and we'll always be able to get the original extrusion back.

We also want to add a new property to `SimpleDimensionalObject` called `projection`. This will hold the three dimensional vertices of our projected 4D vertex set.

I'm no mathematician, but it seems that, because nobody has ever actually seen 4D, we can just make up a rule for projecting the 4th dimension back into the third, and as long as this rule is applied uniformly and consistently we will create some sort of representation of the 4th dimension in a three dimensional space.

The function for projection used in NType is this:

	projectW : function(v4) {
		var skew = (v4.w * .9) + 2;
		return new THREE.Vector3(
			v4.x * skew,
			v4.y * skew,
			v4.z * skew
		)
	}

The constants in that function are simply a result of tweaking and looking at the result for a while, and don't really mean anything. I'm sure there's a more proper way to handle this, but since nobody can actually verify what 4th dimensional perspective is, this seems to do the trick okay for visualizing rotations.

So, to project our shape we will apply this function to all of its vertices and add the return values to the `projection` property.

### Rendering

To render our shape, we'll need to start to set up some of the standard Three.js scene things. In NType these are all properties of the NType instance. I won't go into too much detail on this setup as it is well documented elsewhere, here is what is created during the instantiation of a new NType object.
	
	this.scene = new THREE.Scene();
	this.w = window.innerWidth;
	this.h = window.innerHeight;

	// NType has two cameras initialized for easy switching, but only ORTHO is used right now
	this.ORTHO = new THREE.OrthographicCamera( this.w / - 2, this.w / 2, this.h / 2, this.h / - 2, -2000, 2000 );
	this.PERSP = new THREE.PerspectiveCamera( 75, this.w / this.h, 0.1, 1000 );
	this.camera = this.ORTHO;
	this.renderer = new THREE.WebGLRenderer({
		antialias : true
	});

Then, we need to set up a rendering loop, which is called `NType.begin()`

	this.begin = function() {
		// must bind to this in order to preserve context
		window.requestAnimationFrame(this.begin.bind(this));
		if (!window.PAUSED) {
			this.rotate();
			this.updateLines();
			this.updateTrails();
		}
		this.renderer.render(this.scene, this.camera);
	}

For now, ignore everything but `requestAnimationFrame`, `this.renderer.render`, and `this.updateLines`. `requestAnimationFrame` and `renderer.render` are the standard pattern for creating a rendering loop in Three.js, so there's not too much to discuss there. 

`updateLines()` is really the important thing to look at now. This is the function that actually creates, updates, and adds our projection to the scene. The `updateLines` function looks like this:

	this.updateLines = function() {
		var that = this;
		this.shapes.forEach(function(s){
			if (s.lines.length == 0)
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

It is essentially a nested loop, first looping through each `SimpleDimensionalObject` in `this.shapes`, and then looping through each `line` in a new property on the `SimpleDimensionalObject` called `lines`. Within the shapes loop, we first check to see if the shape has lines associated with it. If it doesn't, we need to add some lines to it, so we call `addLines` on the current instance of `NType`, passing in a reference to the current `shape` object. Add lines looks like this:

	this.addLines = function(s) {
		var that = this;
		s.lines = s.joins.map(function(j, i) {

			var lineGeo = new THREE.Geometry();
			lineGeo.vertices = j.map(function(v) {
				return s.projection[v];
			});

			// that.materials is a tiny library of three.js material objects elsewhere in NType
			var lineMaterial = that.materials.line;

			var line = new THREE.Line(lineGeo, lineMaterial);
			that.scene.add(line);

			return line;
		});
	}

For each join on the `SimpleDimensionalObject`, we need to create a line linking the two vertices it references. To do this, we first create an empty geometry for each join. Then, we set the vertices of that geometry to the values of the `projection` property at the indices in the current `join`. We then create a line using `THREE.Line`, add it to the scene, and return a reference to the line to be stored in the `shape.line` property.

Now that we've added all the lines, we can proceed with the `updateLines` function. The rest of `updateLines` just updates all of the line vertices to match the `projection` property of each `SimpleDimensionalObject` in `this.shapes`, and tells Three.js that the vertices have been updated.

Now we have a static drawing of a 3D projection of a 4D shape! We did it! Unfortunately, this looks boring if you don't rotate it any. So,

### Rotation

This will just cover the mechanics of rotating the 4D vertices. Three.js actually makes this pretty easy with its `Matrix4` object. In NType, the set up is somewhat complicated because it needs to be able to dynamically generate rotation matrices as the user interacts with the controls, but the basis for that system is a set of six rotation matrices, each of which represents one of the six 4D rotation planes (xy,xz,yz,xw,yw,zw). I found these matrices [here, in an excellent article on four-space.](http://steve.hollasch.net/thesis/chapter2.html). Here's how to import those matrices into Three.js:

	// t is just a rotation speed constant
	var t = Math.PI/200
	var zw = new THREE.Matrix4().set(
			1,      0,      0,      0,
			0,      1,      0,      0,
			0,      0,  cos(t),-sin(t),
			0,      0,  sin(t),  cos(t)
		);
	}

Once all of the matrices have been added, combining them is done as so:

	var compoundRotationMatrix = new THREE.Matrix4().multiply(zw).multiply(xy) // etc

Once we have the rotation matrix we're looking for, we need to apply it to the 4D shape and re-project the new positions of its vertices. This is done in the function `Ntype.rotate`, which you'll remember is called in the `Ntype.begin` rendering function.

`Ntype.rotate` looks something like this:

	this.rotate = function() {
		var that = this,
				_matrix = this.matrix;

		this.shapes.forEach(function(s) {
			s.vertices.forEach(function(v) {
				v.applyMatrix4(_matrix)
			});
		});

		this.project();
	}

It loops through each shape on the NType instance, and applies our compound rotation matrix to each vertex of each shape. Then it calls `this.project` to recalculate the projection of the shape for the new vertex positions. Now, when we call `this.updateLines` from `this.begin`, the lines' vertices will be moved to reflect the new rotation.