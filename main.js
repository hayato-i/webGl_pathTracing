var c, gl, gPos = 0, vs, fs, run, q, qt;
let vPosition = [
     0.0, 0.0, 0.0,
];

// マウスムーブイベントに登録する処理
function qtnMouse(e){
	var cw = c.width;
	var ch = c.height;
	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
	var x = e.clientX - c.offsetLeft - cw * 0.5;
	var y = e.clientY - c.offsetTop - ch * 0.5;
	var sq = Math.sqrt(x * x + y * y);
	var r = sq * 2.0 * Math.PI * wh;
	if(sq != 1){
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	q.rotate(r, [y, x, 0.0], qt);
}


window.onload = function(){
    // - 変数の定義 ---------------------------------------------------------------
	let vSource, fSource, vShader, fShader;

	// - keydown イベントへの関数の登録 -------------------------------------------
	window.addEventListener('keydown', function(eve){run = eve.keyCode !== 27;}, true);

	// - canvas と WebGL コンテキストの初期化 -------------------------------------
	// canvasエレメントを取得
	c = document.getElementById('canvas');

	// canvasのサイズをスクリーン全体に広げる
	c.width = 512;
	c.height = 512;

    c.addEventListener('click', rndmLine, false);

	// WebGL コンテキストの取得
	gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    
    /// パスを飛ばすシェーダとプログラムオブジェクトの初期化--------------------------------------------------------

    // パスのシェーダソースを取得
    vSource = document.getElementById('pathVS').textContent;
    fSource = document.getElementById('pathFS').textContent;
    
    // 頂点シェーダとフラグメントシェーダの生成
    vShader = create_shader(vSource, gl.VERTEX_SHADER);
    fShader = create_shader(fSource, gl.FRAGMENT_SHADER);

    // プログラムオブジェクトの生成とリンク
    pathPrg = create_program(vShader, fShader);
  
    // パス描画用
    pathAttStride = 3;

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

    // VBOの生成からやり直さなければならない？


    function renderLine(){

        // canvasを初期化する色を設定する
    	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	    // canvasを初期化する際の深度を設定する
	    gl.clearDepth(1.0);

	    // canvasを初期化
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(pathPrg);

        pathAttLocation = gl.getAttribLocation(pathPrg, 'position');
        
        // VBO生成
        let vbo = create_vbo(vPosition);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        gl.enableVertexAttribArray(pathAttLocation);

        gl.vertexAttribPointer(pathAttLocation, pathAttStride, gl.FLOAT, false, 0, 0);

	    // - uniform 関連の初期化と登録 -----------------------------------------------
	    // uniformLocationの取得
	    var uniLocation = gl.getUniformLocation(pathPrg, 'mvpMatrix');

	    // uniformLocationへ座標変換行列を登録
	    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

	    // - レンダリング -------------------------------------------------------------
	    // モデルの描画
	    gl.drawArrays(gl.LINES, 0, gPos);

	    // コンテキストの再描画
	    gl.flush();
    }

    function rndmLine(){
        let rndm = Math.random();
        let rndmX = Math.sin(rndm);
        let rndmY = Math.cos(rndm);
        vPosition.push(rndmX);
        vPosition.push(rndmY);
        vPosition.push(0);
        gPos++;
        renderLine();
    }
};




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
