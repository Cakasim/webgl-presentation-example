attribute vec3 aVertexPosition;

uniform mat4 mVMatrix;
uniform mat4 pMatrix;

void main(void)
{
    gl_Position = pMatrix * mVMatrix * vec4(aVertexPosition, 1.0);
}