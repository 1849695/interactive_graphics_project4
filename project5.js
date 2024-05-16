// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotx = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), -Math.sin(rotationX), 0,
		0, Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];
	var roty = [
		Math.cos(rotationY), 0, Math.sin(rotationY), 0,
		0, 1, 0, 0,
		-Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];
	trans = MatrixMult(trans, roty);
	trans = MatrixMult(trans, rotx);
	var mv = trans;
	return mv;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{

		// [TO-DO] initializations

		var objVS = `
		attribute vec3 vertPos;
		attribute vec3 vertNormal;
		attribute vec2 vertTexCoord;

		uniform mat4 mvp;
		uniform mat4 mv;
		uniform mat3 normalMatrix;

		varying vec2 fragTexCoord;
		varying vec3 viewNormal;
		varying vec4 fragPos;

		uniform bool useSwap;
		void main()
		{		
			vec3 position = vertPos;

    		if(useSwap){
       			viewNormal = normalMatrix * vec3 (vertNormal.x, vertNormal.z, vertNormal.y);
        		position = vec3 (vertPos.x, vertPos.z, vertPos.y);
        		fragPos = mv * vec4(position, 1.0);
        		gl_Position = mvp * vec4(position, 1.0);
    		}
    		else {
        		viewNormal = normalMatrix * vertNormal;
        		fragPos = mv * vec4(vertPos, 1.0);
        		gl_Position = mvp * vec4(vertPos, 1.0);
    		}
    		fragTexCoord = vertTexCoord;

		}
		`;
		var objFS =  `
        precision mediump float;

        uniform sampler2D sampler;
        uniform vec3 lightDir;
        uniform float shininess;

        varying vec2 fragTexCoord;
        varying vec3 viewNormal;
        varying vec4 fragPos;

        uniform bool showText;

        void main()
		{
			vec3 Colorbase = vec3(1.0);
	
			if (showText && fragTexCoord != vec2(0.0, 0.0)) {
				Colorbase = texture2D(sampler, fragTexCoord).rgb;
			}
	
			vec3 lightDirection = normalize(lightDir);
			vec3 viewDirection = normalize(-fragPos.xyz);
			vec3 halfVector = normalize(lightDirection + viewDirection);

			float diffuseTerm = max(dot(viewNormal, lightDirection), 0.0);
			float specularTerm = pow(max(dot(viewNormal, halfVector), 0.0), shininess);

			vec3 diffuseColor = vec3(1.0); 
    		vec3 specularColor = vec3(1.0); 

			vec3 finalColor = diffuseColor * diffuseTerm + specularColor * specularTerm;
    		finalColor *= Colorbase; // Multiply with texture color

    		gl_FragColor = vec4(finalColor, 1.0);
		}
		`;
		this.program = InitShaderProgram(objVS, objFS);

		this.mvpLoc = gl.getUniformLocation( this.program, "mvp" );
		this.mvLoc = gl.getUniformLocation( this.program, "mv" );
		this.texLoc = gl.getUniformLocation( this.program, "sampler" );
		this.normLoc = gl.getUniformLocation( this.program, "normalMatrix" );
		this.lightDir = gl.getUniformLocation( this.program, "lightDir" );
		this.shin = gl.getUniformLocation( this.program, "shininess" );


		this.vertexBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.normBuffer = gl.createBuffer();
		
		
		this.vertexPos = gl.getAttribLocation( this.program, "vertPos" );
		this.texCoord = gl.getAttribLocation( this.program, "vertTexCoord" );
		this.norm = gl.getAttribLocation( this.program, "vertNormal" );

		this.swapLoc = gl.getUniformLocation( this.program, "useSwap" );
		this.showText = gl.getUniformLocation( this.program, "showText" );
		
		gl.useProgram(this.program);
		gl.uniform1i(this.showText, true);

	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertPos ), gl.STATIC_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.texBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( texCoords ), gl.STATIC_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.normBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( normals ), gl.STATIC_DRAW );

		this.numTriangles = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		gl.useProgram( this.program );
		
		var useSwap = swap;
		gl.uniform1i( this.swapLoc, useSwap ? 1 : 0 );
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram( this.program );

		gl.uniformMatrix4fv( this.mvpLoc, false, matrixMVP );
		gl.uniformMatrix4fv( this.mvLoc, false, matrixMV );
		gl.uniformMatrix3fv( this.normLoc, false, matrixNormal );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.vertexAttribPointer( this.vertexPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertexPos );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.normBuffer );
		gl.vertexAttribPointer( this.norm, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.norm );

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );

	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
		gl.bindBuffer( gl.ARRAY_BUFFER, this.texBuffer );
		gl.vertexAttribPointer( this.texCoord, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoord );

		// You can set the texture image data using the following command.
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);


		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.useProgram( this.program );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		
		// Texture parameters
		
		//gl.generateMipmap(gl.TEXTURE_2D); 

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	
		gl.activeTexture( gl.TEXTURE0 );
		gl.uniform1i( this.texLoc, 0 );
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram( this.program );
		gl.uniform1i(this.showText, show);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.

		gl.useProgram( this.program );
		gl.uniform3f( this.lightDir, x, y, z );

	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		gl.useProgram( this.program );
		gl.uniform1f( this.shin, shininess );
	}
}





