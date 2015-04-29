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

#### Step 2. Extrude to 3D

*In implementation, the extrusions are all handled by an instance of `NType`, which handles extrusion, rotation, and rendering, for documentation I'm just going to explain these steps irrespective to the specifics of their implementation*

The actual extrusion process is really pretty simple. Now that the letter is of unit size, extrusion is a matter of adding a third dimension to the 2D vertices, copying these vertices, and translating the new vertices one unit in the `z` dimension. But, since we're trying to center the form on the origin point `[0,0]`, we should set the `z` vertices for each set to `-0.5` and `0.5` instead of `0` and `1`.

The other thing we need to keep track of when performing this translation is the joins. First we'll need to add the joins that connect the translated vertices to themselves. To do this, we can use our `[i, i+1]` loop from above, but instead of simply using `i`, we'll need to make sure we're referencing the second set of vertices by pushing joins for `[i + vertices.length/2, i + 1 + vertices.length/2]`.

Now we'll need to connect the original vertices to the cloned vertices. We know that each vertex pair is offset from each other by half of the length of the `vertices` array they live in. So, for each of the original vertices we'll push `[i, i+vertices.length/2]` to the `joins` array.

This pattern should reliably take a set of 2D vertices and joins and return a set of 3D vertices and joins that represent a unit-length extrusion of the 2D form into 3D space.

#### Extrude to 4D

Surprisingly, once the mechanics for extruding to 3D have been established, extruding to 4D is a relatively simple proposition. The idea is the same: take a vertex set of `n` dimensions, copy it, add a new dimension (offsetting the copied set by 1 unit). To compute the joins, the idea is again the same: first copy the joins from the first set and add 1/2 of the (new, 4D) `vertices` array length to them, then make a new join between each vertex `i` in the original vertex set and its corresponding `i + vertices.length/2` vertex in the new set.

This two-step extrusion will programatically create a set of 4D vertices and joins from each of our flat letterforms.