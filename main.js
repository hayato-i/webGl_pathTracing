var c, gl, gPos = 0, vs, fs, run, q, qt;
let vPosition = [
     0.0, 0.0, 0.0
];

const MAX_REFLECTION = 4;
const PATH_NUMBER = 4;
let reflection = 1;

window.onload = function(){
    // - 変数の定義 ---------------------------------------------------------------
	let vSource, fSource, vShader, fShader;
    let xyzVSource, xyzFSource, xyzVShader, xyzFShader;

	// 飛ばす線分の数だけVBOを呼び出し、描画を繰り返す必要がある。
	// 線分はLINE STRIPでは描かないこと　ひとつ前の座標を保持できるようにする。
	// 合わせてINDEXを検討すること

	// - canvas と WebGL コンテキストの初期化 -------------------------------------
	// canvasエレメントを取得
	c = document.getElementById('canvas');

	// canvasのサイズをスクリーン全体に広げる
	c.width = 512;
	c.height = 512;

    c.addEventListener('click', stepLine, false);

	// WebGL コンテキストの取得
	gl = c.getContext('webgl') || c.getContext('experimental-webgl');

	/*
    // XYZ軸データ初期化
    let xyzLine = setXYZ(1); 

    // 原点座標空間のシェーダソースを取得--------------------------------------------
    xyzVSource = document.getElementById('defaultXYZ_VS').textContent;
    xyzFSource = document.getElementById('defaultXYZ_FS').textContent;

    xyzVShader = create_shader(xyzVSource, gl.VERTEX_SHADER);
    xyzFShader = create_shader(xyzFSource, gl.FRAGMENT_SHADER);

    // 宣言
    let xyzPrg;        // 原点表示用シェーダのプログラムオブジェクト
	let xyzAttLocation // 原点表示用の attribute location
	let xyzAttStride   // 原点表示用の attribute stride
	let xyzUniLocation // 原点表示用の uniform location
	let xyzVBOList     // 原点表示用の VBO のリスト

    xyzPrg = create_program(xyzVShader, xyzFShader);
    xyzAttLocation = [];
    xyzAttLocation[0] = gl.getAttribLocation(xyzPrg, 'position');

    xyzAttStride = [];
	xyzAttStride[0] = 3;

    xyzVBOList = [];
    xyzVBOList[0] = create_vbo(xyzLine.p);
    
	set_attribute(xyzVBOList, xyzAttLocation, xyzAttStride);
	*/

	/// パスを飛ばすシェーダとプログラムオブジェクトの初期化----------------------------

    // パスのシェーダソースを取得
    vSource = document.getElementById('pathVS').textContent;
    fSource = document.getElementById('pathFS').textContent;
    
    // 頂点シェーダとフラグメントシェーダの生成
    vShader = create_shader(vSource, gl.VERTEX_SHADER);
    fShader = create_shader(fSource, gl.FRAGMENT_SHADER);

	// クラス生成
	let pathTrace = new PathTracing(PATH_NUMBER, MAX_REFLECTION);

	// 初期化
	pathTrace.initPath();

	//console.log(pathTrace.position);
    
	// プログラムオブジェクトの生成とリンク
    let pathPrg;
	let pathAttLocation;
	let pathAttStride;
	let pathUniLocation;
	let pathVBOList;
	let pathIBO;

	pathPrg = create_program(vShader, fShader);
	
	pathAttLocation = [];
	pathAttLocation[0] = gl.getAttribLocation(pathPrg, 'position');
	
	pathAttStride = [];
	pathAttStride[0] = 3;
	
	pathVBOList = [];
	pathVBOList[0] = create_vbo(pathTrace.position);

	set_attribute(pathVBOList, pathAttLocation, pathAttStride);

	pathUniLocation = [];
	pathUniLocation[0] = gl.getUniformLocation(pathPrg, 'mvpMatrix');

    // - 行列の初期化 -------------------------------------------------------------
    // minMatrix.js を用いた行列関連処理
	// matIVオブジェクトを生成
	var m = new matIV();

	// 各種行列の生成と初期化
	var mMatrix = m.identity(m.create());
	var vMatrix = m.identity(m.create());
	var pMatrix = m.identity(m.create());
	var vpMatrix = m.identity(m.create());
	var mvpMatrix = m.identity(m.create());

    // - レンダリングのための WebGL 初期化設定 ------------------------------------
	// ビューポートを設定する
	gl.viewport(0, 0, c.width, c.height);

    // canvasを初期化する色を設定する
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// canvasを初期化する際の深度を設定する
	gl.clearDepth(1.0);

	// canvasを初期化
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


	// - 行列の計算 ---------------------------------------------------------------
	// ビュー座標変換行列
	m.lookAt([0.0, 0.0, 3.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);

	// プロジェクション座標変換行列
	m.perspective(45, c.width / c.height, 0.1, 10.0, pMatrix);

	// 各行列を掛け合わせ座標変換行列を完成させる
	m.multiply(pMatrix, vMatrix, vpMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);	

	// uniformLocationへ座標変換行列を登録
	gl.uniformMatrix4fv(pathUniLocation[0], false, mvpMatrix);
	
	gl.flush();

	function draw(){
		
		// canvasを初期化
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		// reflection : 反射回数(描画回数)
		// j : パス本数
		// k : パス1本に対するStride
		for(let j = 0; j < PATH_NUMBER; j++){
			let k =  j * 3 * MAX_REFLECTION; // 各パスのオフセット
			gl.drawArrays(gl.LINES, k, reflection);
			console.log("I'm path index" + j + "!");
			console.log(reflection);
		}

		gl.flush();
		reflection++;
	}
	

	function stepLine(){
		if(reflection !== MAX_REFLECTION){
			draw();
		}
	}

};



class PathTracing {
	/************************************************************************* 
    * 描画用線分を管理するクラス                                               *
    * @param {number} number パスの本数（indexに使う）                        *
    * @param {number} reflection パスの反射回数(指定された回数反射するとDEAD)   *
    *************************************************************************/
	constructor(number, reflection){
		this.position = [];
		this.reflection = reflection;
		this.number = number;
		for(let i = 0; i < this.number;i++){
			this.position[i*this.reflection] = 0.0;
			this.position[i*this.reflection+1] = 0.0;
			this.position[i*this.reflection+2] = 0.0;
		}
		//this.uvcXYZ = [];
	}

	/* 
	position[vec3[number]] has first position.
	position[vec3[number*reflection]] has final position.
	*/

	/* 本数分初期化 */
	/* テスト段階のため単位円上を描画する線を描くメソッドとする*/

	initPath(){
		for(let i = 0; i < this.number; i++){
			for(let j = 0; j <this.reflection-1;j++){
				//let rndm1 = Math.random() * 180 * 2 - 180;
				let rndm2 = Math.random() * 360 * 2 - 360;
				let rndmX = Math.sin(rndm2);// + Math.cos(rndm2);
				let rndmY = Math.cos(rndm2);// + Math.sin(rndm2);
				let rndmZ = 0.0				// Math.cos(rndm2);

				let k = 3 + i * j;

				this.position[3+k] = rndmX;
				this.position[3+k+1] = rndmY;
				this.position[3+k+2] = rndmZ;
			}
		}
	}
	/*
	setPath(){
		// 前回座標の退避
		let px = this.position[number*3];
		let py = this.position[number*3+1];
		let pz = this.position[number*3+2];
	}

	getUnitVector(){
		let ux = this.position[number*3];
		let uy = this.position[number*3+1];
		let uz = this.position[number*3+2];

		this.uvcXYZ.push(ux, uy, uz);
	}
	*/
}




// - 各種ユーティリティ関数 ---------------------------------------------------
/**
 * シェーダを生成する関数
 * @param {string} source シェーダのソースとなるテキスト
 * @param {number} type シェーダのタイプを表す定数 gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @return {object} 生成に成功した場合はシェーダオブジェクト、失敗した場合は null
 */
function create_shader(source, type){
	// シェーダを格納する変数
	var shader;
	
	// シェーダの生成
	shader = gl.createShader(type);
	
	// 生成されたシェーダにソースを割り当てる
	gl.shaderSource(shader, source);
	
	// シェーダをコンパイルする
	gl.compileShader(shader);
	
	// シェーダが正しくコンパイルされたかチェック
	if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		
		// 成功していたらシェーダを返して終了
		return shader;
	}else{
		
		// 失敗していたらエラーログをアラートする
		alert(gl.getShaderInfoLog(shader));
		
		// null を返して終了
		return null;
	}
}

/**
 * プログラムオブジェクトを生成しシェーダをリンクする関数
 * @param {object} vs 頂点シェーダとして生成したシェーダオブジェクト
 * @param {object} fs フラグメントシェーダとして生成したシェーダオブジェクト
 * @return {object} 生成に成功した場合はプログラムオブジェクト、失敗した場合は null
 */
function create_program(vs, fs){
	// プログラムオブジェクトの生成
	var program = gl.createProgram();
	
	// プログラムオブジェクトにシェーダを割り当てる
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	
	// シェーダをリンク
	gl.linkProgram(program);
	
	// シェーダのリンクが正しく行なわれたかチェック
	if(gl.getProgramParameter(program, gl.LINK_STATUS)){
	
		// 成功していたらプログラムオブジェクトを有効にする
		gl.useProgram(program);
		
		// プログラムオブジェクトを返して終了
		return program;
	}else{
		
		// 失敗していたらエラーログをアラートする
		alert(gl.getProgramInfoLog(program));
		
		// null を返して終了
		return null;
	}
}

/**
 * VBOを生成する関数
 * @param {Array.<number>} data 頂点属性を格納した一次元配列
 * @return {object} 頂点バッファオブジェクト
 */
function create_vbo(data){
	// バッファオブジェクトの生成
	var vbo = gl.createBuffer();
	
	// バッファをバインドする
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	
	// バッファにデータをセット
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	
	// バッファのバインドを無効化
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// 生成した VBO を返して終了
	return vbo;
}

/**
 * IBOを生成する関数
 * @param {Array.<number>} data 頂点インデックスを格納した一次元配列
 * @return {object} インデックスバッファオブジェクト
 */
function create_ibo(data){
	// バッファオブジェクトの生成
	var ibo = gl.createBuffer();
	
	// バッファをバインドする
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	
	// バッファにデータをセット
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	
	// バッファのバインドを無効化
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	// 生成したIBOを返して終了
	return ibo;
}

/**
 * VBOをバインドし登録する関数
 * @param {object} vbo 頂点バッファオブジェクト
 * @param {Array.<number>} attribute location を格納した配列
 * @param {Array.<number>} アトリビュートのストライドを格納した配列
 */
function set_attribute(vbo, attL, attS){
	// 引数として受け取った配列を処理する
	for(var i in vbo){
		// バッファをバインドする
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
		
		// attributeLocationを有効にする
		gl.enableVertexAttribArray(attL[i]);
		
		// attributeLocationを通知し登録する
		gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
	}
}

/**
 * テクスチャを生成する関数
 * @param {string} source テクスチャに適用する画像ファイルのパス
 * @param {number} number テクスチャ用配列に格納するためのインデックス
 */
function create_texture(source, number){
	// イメージオブジェクトの生成
	var img = new Image();
	
	// データのオンロードをトリガーにする
	img.onload = function(){
		// テクスチャオブジェクトの生成
		var tex = gl.createTexture();
		
		// テクスチャをバインドする
		gl.bindTexture(gl.TEXTURE_2D, tex);
		
		// テクスチャへイメージを適用
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		
		// ミップマップを生成
		gl.generateMipmap(gl.TEXTURE_2D);
		
		// テクスチャのバインドを無効化
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		// 生成したテクスチャを変数に代入
		textures[number] = tex;
	};
	
	// イメージオブジェクトのソースを指定
	img.src = source;
}

/**
 * フレームバッファをオブジェクトとして生成する関数
 * @param {number} width フレームバッファの横幅をピクセル単位で指定
 * @param {number} height フレームバッファの縦幅をピクセル単位で指定
 * @return {object} フレームバッファとレンダーバッファ、カラーバッファ用のテクスチャを含むオブジェクト
 */
function create_framebuffer(width, height){
	// フレームバッファの生成
	var frameBuffer = gl.createFramebuffer();
	
	// フレームバッファをWebGLにバインド
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	
	// 深度バッファ用レンダーバッファの生成とバインド
	var depthRenderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
	
	// レンダーバッファを深度バッファとして設定
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	
	// フレームバッファにレンダーバッファを関連付ける
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
	
	// フレームバッファ用テクスチャの生成
	var fTexture = gl.createTexture();
	
	// フレームバッファ用のテクスチャをバインド
	gl.bindTexture(gl.TEXTURE_2D, fTexture);
	
	// フレームバッファ用のテクスチャにカラー用のメモリ領域を確保
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	
	// テクスチャパラメータ
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// フレームバッファにテクスチャを関連付ける
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
	
	// 各種オブジェクトのバインドを解除
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	// オブジェクトを返して終了
	return {f : frameBuffer, d : depthRenderBuffer, t : fTexture};
}
