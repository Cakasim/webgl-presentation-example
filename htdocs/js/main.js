"use strict";

/* Select the canvas element and set its dimensions to the
   current window width and height. */
var canvasElement = $('#example');
canvasElement.attr('width', $(window).width());
canvasElement.attr('height', $(window).height());

/* This array contains all possible WebGL context names.
   We will iterate through the array later to ensure
   better browser support. */
var glContextNames = [
    "webgl",
    "experimental-webgl",
    "webkit-3d",
    "moz-webgl"
];

/* This is perhaps the most important variable we will use.
   It stores the WebGL canvas context that we will obtain
   in the next lines. */
var glContext;

/* We iterate through the glContextNames until we were able to obtain
   a context or we reached the end of the names array. */
for (var i = 0; !glContext && i < glContextNames.length; i++)
{
    glContext = canvasElement[0].getContext(glContextNames[i]);
}

/* If we reached the end of the array and no context could be created
   we throw an error. */
if (!glContext)
{
    throw new Error('Couldn\'t get the WebGL canvas context.');
}

/* We store the current width and height of the canvas in some self defined variables.
   WebGL will not touch this variables by itself. */
glContext.viewportWidth = canvasElement.width();
glContext.viewportHeight = canvasElement.height();

/* Perform the first of two requests to get the vertex shader source. */
jQuery.ajax('shader/simple-vertex-shader.glsl', {
    success: function(vertexShaderSource) {

        /* Create a vertex shader object, define its source and compile it. */
        var vertexShader = glContext.createShader(glContext.VERTEX_SHADER);
        glContext.shaderSource(vertexShader, vertexShaderSource);
        glContext.compileShader(vertexShader);

        /* Request the shader compile status to be shure that the shader code is
           ready to use and without any errors. Otherwise we throw an error. */
        if (!glContext.getShaderParameter(vertexShader, glContext.COMPILE_STATUS))
        {
            throw new Error('Couldn\'t compile the vertex shader: ' + glContext.getShaderInfoLog(vertexShader));
        }

        /* If we are at this point we now that the vertex shader has compiled successfully
           and we do the same steps for the fragment shader. */
        jQuery.ajax('shader/simple-fragment-shader.glsl', {
            success: function(fragmentShaderSource) {
                var fragmentShader = glContext.createShader(glContext.FRAGMENT_SHADER);
                glContext.shaderSource(fragmentShader, fragmentShaderSource);
                glContext.compileShader(fragmentShader);

                if (!glContext.getShaderParameter(fragmentShader, glContext.COMPILE_STATUS))
                {
                    throw new Error('Couldn\'t compile the fragment shader: ' + glContext.getShaderInfoLog(fragmentShader));
                }

                /* The vertex and the fragment shader are ready for use. To use them we
                   need to create a shader program and attach our shaders to this program.
                   Once the shaders are attached we link the program. */
                var shaderProgram = glContext.createProgram();
                glContext.attachShader(shaderProgram, vertexShader);
                glContext.attachShader(shaderProgram, fragmentShader);
                glContext.linkProgram(shaderProgram);

                /* If there are problems during the program creation an linking process
                   we will find them now and throw an error. */
                if (!glContext.getProgramParameter(shaderProgram, glContext.LINK_STATUS))
                {
                    throw new Error('Unable to link shader program.');
                }

                /* The last step is to tell WebGL that we want to use the program. */
                glContext.useProgram(shaderProgram);

                /* We need to access the ressources inside the shaders to provide different data
                   like the vertex positions. This is donw now. We make shure that we can use the
                   vertex position and create links to the perspective matrix (pMatrix) and
                   as well as the model-view matrix (mVMatrix). */
                shaderProgram.vertexPositionAttribute = glContext.getAttribLocation(shaderProgram, "aVertexPosition");
                glContext.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
                shaderProgram.pMatrixUniform = glContext.getUniformLocation(shaderProgram, "pMatrix");
                shaderProgram.mvMatrixUniform = glContext.getUniformLocation(shaderProgram, "mVMatrix");

                /* Somehow we need to get the vertex data. Such data can be extracted from a model file
                   which comes from different apps like Blender or Cinema4D. There are many libraries that
                   offer you methods to read the vertex data from the many file formats existing in the 3D branche.
                   But this would be definitely too much for our purposes. Anyway we use hard coded vertex data which
                   is not more than just the vertex positions (yes, vertices can have more than the position attribute
                   like color). To store our data we need two kinds of buffers - one stores the
                   vertex positions (vertexPositionBuffer) and the other defines which vertices form a triangle and
                   in which order. Enough theory we create the buffer objects and bind them to their usage. */
                var vertexPositionBuffer = glContext.createBuffer();
                var indexBuffer = glContext.createBuffer();
                glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexPositionBuffer);
                glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);

                /* The native JavaScript array that stores our raw vertex positions.
                   The vertices define the edged of a cube. */
                var vertices = [

                    -0.25, -0.25,  0.25, // A  (0)
                     0.25, -0.25,  0.25, // B  (1)
                    -0.25,  0.25,  0.25, // C  (2)
                     0.25,  0.25,  0.25, // D  (3)

                    -0.25, -0.25, 0,     // A* (4)
                     0.25, -0.25, 0,     // B* (5)
                    -0.25,  0.25, 0,     // C* (6)
                     0.25,  0.25, 0      // D* (7)
                ];

                /* This array containes the indices of the vertices. */
                var indices = [

                    0, 3, 1, // Front
                    0, 3, 2,

                    4, 7, 5, // Back
                    4, 7, 6,

                    2, 7, 6, // Top
                    2, 7, 3,

                    0, 5, 4, // Bottom
                    0, 5, 1,

                    1, 7, 3, // Right
                    1, 7, 5,

                    0, 6, 2, // Left
                    0, 6, 4

                ];

                /* Use the array data for the buffers. */
                glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STATIC_DRAW);
                vertexPositionBuffer.itemSize = 3;
                vertexPositionBuffer.numItems = 8;
                glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), glContext.STATIC_DRAW);

                /* Create model-view and perspective matrix objects. */
                var mvMatrix = mat4.create();
                var pMatrix = mat4.create();

                /* Fill the perspective matrix. */
                mat4.perspective(pMatrix, 40, glContext.viewportWidth/glContext.viewportHeight, 0.1, 5.0);

                /* Move the objects to the provided vector. */
                mat4.identity(mvMatrix);
                mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(0, -1, -1));

                /* Make settings that are consistent for each frame. */
                glContext.clearColor(0, 0, 0, 1.0);
                glContext.enable(glContext.DEPTH_TEST);
                glContext.viewport(0, 0, glContext.viewportWidth, glContext.viewportHeight);
                glContext.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, glContext.FLOAT, false, 0, 0);
                glContext.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);

                /*  */
                setInterval(function() {

                    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

                    mat4.rotateZ(mvMatrix, mvMatrix, (90/360)*Math.PI);
                    //mat4.rotateY(mvMatrix, mvMatrix, 0.005);
                    //mat4.rotateX(mvMatrix, mvMatrix, 0.0025);
                    //mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(1, 1, 1));

                    glContext.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

                    glContext.drawElements(glContext.TRIANGLES, 36, glContext.UNSIGNED_SHORT, 0);

                }, 1000);

            }
        });
    }
});