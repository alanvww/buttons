(function (D, z) {
	typeof exports == 'object' && typeof module < 'u'
		? z(exports)
		: typeof define == 'function' && define.amd
		? define(['exports'], z)
		: ((D = typeof globalThis < 'u' ? globalThis : D || self),
		  z((D.UnicornStudio = {})));
})(this, function (D) {
	'use strict';
	var Ut = Object.defineProperty;
	var Vt = (D, z, p) =>
		z in D
			? Ut(D, z, { enumerable: !0, configurable: !0, writable: !0, value: p })
			: (D[z] = p);
	var O = (D, z, p) => (Vt(D, typeof z != 'symbol' ? z + '' : z, p), p);
	let z = 0;
	function p() {
		if (!(z > 100)) {
			if (z === 100)
				console.warn('Curtains: too many warnings thrown, stop logging.');
			else {
				const h = Array.prototype.slice.call(arguments);
				console.warn.apply(console, h);
			}
			z++;
		}
	}
	function F() {
		const h = Array.prototype.slice.call(arguments);
		console.error.apply(console, h);
	}
	function re() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (h) => {
			let e = (Math.random() * 16) | 0;
			return (h === 'x' ? e : (e & 3) | 8).toString(16).toUpperCase();
		});
	}
	function N(h) {
		return (h & (h - 1)) === 0;
	}
	function Ce(h, e, t) {
		return (1 - t) * h + t * e;
	}
	let Ie = class {
		constructor(e) {
			if (((this.type = 'Scene'), !e || e.type !== 'Renderer'))
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				F(this.type + ': Renderer WebGL context is undefined', e);
				return;
			}
			(this.renderer = e), (this.gl = e.gl), this.initStacks();
		}
		initStacks() {
			this.stacks = {
				pingPong: [],
				renderTargets: [],
				opaque: [],
				transparent: [],
				renderPasses: [],
				scenePasses: [],
			};
		}
		resetPlaneStacks() {
			(this.stacks.pingPong = []),
				(this.stacks.renderTargets = []),
				(this.stacks.opaque = []),
				(this.stacks.transparent = []);
			for (let e = 0; e < this.renderer.planes.length; e++)
				this.addPlane(this.renderer.planes[e]);
		}
		resetShaderPassStacks() {
			(this.stacks.scenePasses = []), (this.stacks.renderPasses = []);
			for (let e = 0; e < this.renderer.shaderPasses.length; e++)
				(this.renderer.shaderPasses[e].index = e),
					this.renderer.shaderPasses[e]._isScenePass
						? this.stacks.scenePasses.push(this.renderer.shaderPasses[e])
						: this.stacks.renderPasses.push(this.renderer.shaderPasses[e]);
			this.stacks.scenePasses.length === 0 &&
				(this.renderer.state.scenePassIndex = null);
		}
		addToRenderTargetsStack(e) {
			const t = this.renderer.planes.filter(
				(i) => i.type !== 'PingPongPlane' && i.target && i.uuid !== e.uuid
			);
			let s = -1;
			if (e.target._depth) {
				for (let i = t.length - 1; i >= 0; i--)
					if (t[i].target.uuid === e.target.uuid) {
						s = i + 1;
						break;
					}
			} else s = t.findIndex((i) => i.target.uuid === e.target.uuid);
			(s = Math.max(0, s)),
				t.splice(s, 0, e),
				e.target._depth
					? (t.sort((i, r) => i.index - r.index),
					  t.sort((i, r) => r.renderOrder - i.renderOrder))
					: (t.sort((i, r) => r.index - i.index),
					  t.sort((i, r) => i.renderOrder - r.renderOrder)),
				t.sort((i, r) => i.target.index - r.target.index),
				(this.stacks.renderTargets = t);
		}
		addToRegularPlaneStack(e) {
			const t = this.renderer.planes.filter(
				(i) =>
					i.type !== 'PingPongPlane' &&
					!i.target &&
					i._transparent === e._transparent &&
					i.uuid !== e.uuid
			);
			let s = -1;
			for (let i = t.length - 1; i >= 0; i--)
				if (t[i]._geometry.definition.id === e._geometry.definition.id) {
					s = i + 1;
					break;
				}
			return (
				(s = Math.max(0, s)),
				t.splice(s, 0, e),
				t.sort((i, r) => i.index - r.index),
				t
			);
		}
		addPlane(e) {
			if (e.type === 'PingPongPlane') this.stacks.pingPong.push(e);
			else if (e.target) this.addToRenderTargetsStack(e);
			else if (e._transparent) {
				const t = this.addToRegularPlaneStack(e);
				t.sort((s, i) => i.relativeTranslation.z - s.relativeTranslation.z),
					t.sort((s, i) => i.renderOrder - s.renderOrder),
					(this.stacks.transparent = t);
			} else {
				const t = this.addToRegularPlaneStack(e);
				t.sort((s, i) => i.renderOrder - s.renderOrder),
					(this.stacks.opaque = t);
			}
		}
		removePlane(e) {
			e.type === 'PingPongPlane'
				? (this.stacks.pingPong = this.stacks.pingPong.filter(
						(t) => t.uuid !== e.uuid
				  ))
				: e.target
				? (this.stacks.renderTargets = this.stacks.renderTargets.filter(
						(t) => t.uuid !== e.uuid
				  ))
				: e._transparent
				? (this.stacks.transparent = this.stacks.transparent.filter(
						(t) => t.uuid !== e.uuid
				  ))
				: (this.stacks.opaque = this.stacks.opaque.filter(
						(t) => t.uuid !== e.uuid
				  ));
		}
		setPlaneRenderOrder(e) {
			if (e.type === 'ShaderPass')
				this.sortShaderPassStack(
					e._isScenePass ? this.stacks.scenePasses : this.stacks.renderPasses
				);
			else if (e.type === 'PingPongPlane') return;
			if (e.target)
				e.target._depth
					? (this.stacks.renderTargets.sort((t, s) => t.index - s.index),
					  this.stacks.renderTargets.sort(
							(t, s) => s.renderOrder - t.renderOrder
					  ))
					: (this.stacks.renderTargets.sort((t, s) => s.index - t.index),
					  this.stacks.renderTargets.sort(
							(t, s) => t.renderOrder - s.renderOrder
					  )),
					this.stacks.renderTargets.sort(
						(t, s) => t.target.index - s.target.index
					);
			else {
				const t = e._transparent ? this.stacks.transparent : this.stacks.opaque,
					s = this.stacks.scenePasses.find(
						(i, r) => i._isScenePass && !i._depth && r === 0
					);
				!this.renderer.depth || s
					? (t.sort((i, r) => r.index - i.index),
					  e._transparent &&
							t.sort(
								(i, r) => i.relativeTranslation.z - r.relativeTranslation.z
							),
					  t.sort((i, r) => i.renderOrder - r.renderOrder))
					: (t.sort((i, r) => i.index - r.index),
					  e._transparent &&
							t.sort(
								(i, r) => r.relativeTranslation.z - i.relativeTranslation.z
							),
					  t.sort((i, r) => r.renderOrder - i.renderOrder));
			}
		}
		addShaderPass(e) {
			e._isScenePass
				? (this.stacks.scenePasses.push(e),
				  this.sortShaderPassStack(this.stacks.scenePasses))
				: (this.stacks.renderPasses.push(e),
				  this.sortShaderPassStack(this.stacks.renderPasses));
		}
		removeShaderPass(e) {
			this.resetShaderPassStacks();
		}
		sortShaderPassStack(e) {
			e.sort((t, s) => t.index - s.index),
				e.sort((t, s) => t.renderOrder - s.renderOrder);
		}
		enableShaderPass() {
			this.stacks.scenePasses.length &&
				this.stacks.renderPasses.length === 0 &&
				this.renderer.planes.length &&
				((this.renderer.state.scenePassIndex = 0),
				this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
		}
		drawRenderPasses() {
			this.stacks.scenePasses.length &&
				this.stacks.renderPasses.length &&
				this.renderer.planes.length &&
				((this.renderer.state.scenePassIndex = 0),
				this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
			for (let e = 0; e < this.stacks.renderPasses.length; e++)
				this.stacks.renderPasses[e]._startDrawing(), this.renderer.clearDepth();
		}
		drawScenePasses() {
			for (let e = 0; e < this.stacks.scenePasses.length; e++)
				this.stacks.scenePasses[e]._startDrawing();
		}
		drawPingPongStack() {
			for (let e = 0; e < this.stacks.pingPong.length; e++) {
				const t = this.stacks.pingPong[e];
				t && t._startDrawing();
			}
		}
		drawStack(e) {
			for (let t = 0; t < this.stacks[e].length; t++) {
				const s = this.stacks[e][t];
				s && s._startDrawing();
			}
		}
		draw() {
			this.drawPingPongStack(),
				this.enableShaderPass(),
				this.drawStack('renderTargets'),
				this.drawRenderPasses(),
				this.renderer.setBlending(!1),
				this.drawStack('opaque'),
				this.stacks.transparent.length &&
					(this.renderer.setBlending(!0), this.drawStack('transparent')),
				this.drawScenePasses();
		}
	};
	class Le {
		constructor() {
			(this.geometries = []), this.clear();
		}
		clear() {
			(this.textures = []), (this.programs = []);
		}
		getGeometryFromID(e) {
			return this.geometries.find((t) => t.id === e);
		}
		addGeometry(e, t, s) {
			this.geometries.push({ id: e, vertices: t, uvs: s });
		}
		isSameShader(e, t) {
			return e.localeCompare(t) === 0;
		}
		getProgramFromShaders(e, t) {
			return this.programs.find(
				(s) => this.isSameShader(s.vsCode, e) && this.isSameShader(s.fsCode, t)
			);
		}
		addProgram(e) {
			this.programs.push(e);
		}
		getTextureFromSource(e) {
			const t = typeof e == 'string' ? e : e.src;
			return this.textures.find((s) => s.source && s.source.src === t);
		}
		addTexture(e) {
			this.getTextureFromSource(e.source) || this.textures.push(e);
		}
		removeTexture(e) {
			this.textures = this.textures.filter((t) => t.uuid !== e.uuid);
		}
	}
	class Fe {
		constructor() {
			this.clear();
		}
		clear() {
			this.queue = [];
		}
		add(e, t = !1) {
			const s = { callback: e, keep: t, timeout: null };
			return (
				(s.timeout = setTimeout(() => {
					this.queue.push(s);
				}, 0)),
				s
			);
		}
		execute() {
			this.queue.map((e) => {
				e.callback && e.callback(), clearTimeout(this.queue.timeout);
			}),
				(this.queue = this.queue.filter((e) => e.keep));
		}
	}
	class ze {
		constructor({
			alpha: e,
			antialias: t,
			premultipliedAlpha: s,
			depth: i,
			failIfMajorPerformanceCaveat: r,
			preserveDrawingBuffer: a,
			stencil: n,
			container: o,
			pixelRatio: l,
			renderingScale: d,
			production: c,
			onError: f,
			onSuccess: u,
			onContextLost: g,
			onContextRestored: m,
			onDisposed: b,
			onSceneChange: y,
		}) {
			(this.type = 'Renderer'),
				(this.alpha = e),
				(this.antialias = t),
				(this.premultipliedAlpha = s),
				(this.depth = i),
				(this.failIfMajorPerformanceCaveat = r),
				(this.preserveDrawingBuffer = a),
				(this.stencil = n),
				(this.container = o),
				(this.pixelRatio = l),
				(this._renderingScale = d),
				(this.production = c),
				(this.onError = f),
				(this.onSuccess = u),
				(this.onContextLost = g),
				(this.onContextRestored = m),
				(this.onDisposed = b),
				(this.onSceneChange = y),
				this.initState(),
				(this.canvas = document.createElement('canvas'));
			const _ = {
				alpha: this.alpha,
				premultipliedAlpha: this.premultipliedAlpha,
				antialias: this.antialias,
				depth: this.depth,
				failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
				preserveDrawingBuffer: this.preserveDrawingBuffer,
				stencil: this.stencil,
			};
			if (
				((this.gl = this.canvas.getContext('webgl2', _)),
				(this._isWebGL2 = !!this.gl),
				this.gl ||
					(this.gl =
						this.canvas.getContext('webgl', _) ||
						this.canvas.getContext('experimental-webgl', _)),
				this.gl)
			)
				this.onSuccess && this.onSuccess();
			else {
				this.production ||
					p(this.type + ': WebGL context could not be created'),
					(this.state.isActive = !1),
					this.onError && this.onError();
				return;
			}
			this.initRenderer();
		}
		initState() {
			this.state = {
				isActive: !0,
				isContextLost: !0,
				drawingEnabled: !0,
				forceRender: !1,
				currentProgramID: null,
				currentGeometryID: null,
				forceBufferUpdate: !1,
				depthTest: null,
				blending: null,
				cullFace: null,
				frameBufferID: null,
				scenePassIndex: null,
				activeTexture: null,
				unpackAlignment: null,
				flipY: null,
				premultiplyAlpha: null,
			};
		}
		initCallbackQueueManager() {
			this.nextRender = new Fe();
		}
		initRenderer() {
			(this.planes = []),
				(this.renderTargets = []),
				(this.shaderPasses = []),
				(this.state.isContextLost = !1),
				(this.state.maxTextureSize = this.gl.getParameter(
					this.gl.MAX_TEXTURE_SIZE
				)),
				this.initCallbackQueueManager(),
				this.setBlendFunc(),
				this.setDepthFunc(),
				this.setDepthTest(!0),
				(this.cache = new Le()),
				(this.scene = new Ie(this)),
				this.getExtensions(),
				(this._contextLostHandler = this.contextLost.bind(this)),
				this.canvas.addEventListener(
					'webglcontextlost',
					this._contextLostHandler,
					!1
				),
				(this._contextRestoredHandler = this.contextRestored.bind(this)),
				this.canvas.addEventListener(
					'webglcontextrestored',
					this._contextRestoredHandler,
					!1
				);
		}
		getExtensions() {
			(this.extensions = []),
				this._isWebGL2
					? ((this.extensions.EXT_color_buffer_float = this.gl.getExtension(
							'EXT_color_buffer_float'
					  )),
					  (this.extensions.OES_texture_float_linear = this.gl.getExtension(
							'OES_texture_float_linear'
					  )),
					  (this.extensions.EXT_texture_filter_anisotropic =
							this.gl.getExtension('EXT_texture_filter_anisotropic')),
					  (this.extensions.WEBGL_lose_context =
							this.gl.getExtension('WEBGL_lose_context')))
					: ((this.extensions.OES_vertex_array_object = this.gl.getExtension(
							'OES_vertex_array_object'
					  )),
					  (this.extensions.OES_texture_float =
							this.gl.getExtension('OES_texture_float')),
					  (this.extensions.OES_texture_float_linear = this.gl.getExtension(
							'OES_texture_float_linear'
					  )),
					  (this.extensions.OES_texture_half_float = this.gl.getExtension(
							'OES_texture_half_float'
					  )),
					  (this.extensions.OES_texture_half_float_linear =
							this.gl.getExtension('OES_texture_half_float_linear')),
					  (this.extensions.EXT_texture_filter_anisotropic =
							this.gl.getExtension('EXT_texture_filter_anisotropic')),
					  (this.extensions.OES_element_index_uint = this.gl.getExtension(
							'OES_element_index_uint'
					  )),
					  (this.extensions.OES_standard_derivatives = this.gl.getExtension(
							'OES_standard_derivatives'
					  )),
					  (this.extensions.EXT_sRGB = this.gl.getExtension('EXT_sRGB')),
					  (this.extensions.WEBGL_depth_texture = this.gl.getExtension(
							'WEBGL_depth_texture'
					  )),
					  (this.extensions.WEBGL_draw_buffers =
							this.gl.getExtension('WEBGL_draw_buffers')),
					  (this.extensions.WEBGL_lose_context =
							this.gl.getExtension('WEBGL_lose_context')));
		}
		contextLost(e) {
			(this.state.isContextLost = !0),
				this.state.isActive &&
					(e.preventDefault(),
					this.nextRender.add(
						() => this.onContextLost && this.onContextLost()
					));
		}
		restoreContext() {
			this.state.isActive &&
				(this.initState(),
				this.gl && this.extensions.WEBGL_lose_context
					? this.extensions.WEBGL_lose_context.restoreContext()
					: (!this.gl && !this.production
							? p(
									this.type +
										': Could not restore the context because the context is not defined'
							  )
							: !this.extensions.WEBGL_lose_context &&
							  !this.production &&
							  p(
									this.type +
										': Could not restore the context because the restore context extension is not defined'
							  ),
					  this.onError && this.onError()));
		}
		isContextexFullyRestored() {
			let e = !0;
			for (let t = 0; t < this.renderTargets.length; t++) {
				this.renderTargets[t].textures[0]._canDraw || (e = !1);
				break;
			}
			if (e)
				for (let t = 0; t < this.planes.length; t++)
					if (this.planes[t]._canDraw) {
						for (let s = 0; s < this.planes[t].textures.length; s++)
							if (!this.planes[t].textures[s]._canDraw) {
								e = !1;
								break;
							}
					} else {
						e = !1;
						break;
					}
			if (e)
				for (let t = 0; t < this.shaderPasses.length; t++)
					if (this.shaderPasses[t]._canDraw) {
						for (let s = 0; s < this.shaderPasses[t].textures.length; s++)
							if (!this.shaderPasses[t].textures[s]._canDraw) {
								e = !1;
								break;
							}
					} else {
						e = !1;
						break;
					}
			return e;
		}
		contextRestored() {
			this.getExtensions(),
				this.setBlendFunc(),
				this.setDepthFunc(),
				this.setDepthTest(!0),
				this.cache.clear(),
				this.scene.initStacks();
			for (let t = 0; t < this.renderTargets.length; t++)
				this.renderTargets[t]._restoreContext();
			for (let t = 0; t < this.planes.length; t++)
				this.planes[t]._restoreContext();
			for (let t = 0; t < this.shaderPasses.length; t++)
				this.shaderPasses[t]._restoreContext();
			const e = this.nextRender.add(() => {
				this.isContextexFullyRestored() &&
					((e.keep = !1),
					(this.state.isContextLost = !1),
					this.onContextRestored && this.onContextRestored(),
					this.onSceneChange(),
					this.needRender());
			}, !0);
		}
		setPixelRatio(e) {
			this.pixelRatio = e;
		}
		setSize() {
			if (!this.gl) return;
			const e = this.container.getBoundingClientRect();
			(this._boundingRect = {
				width: e.width * this.pixelRatio,
				height: e.height * this.pixelRatio,
				top: e.top * this.pixelRatio,
				left: e.left * this.pixelRatio,
			}),
				(this.canvas.style.width =
					Math.floor(this._boundingRect.width / this.pixelRatio) + 'px'),
				(this.canvas.style.height =
					Math.floor(this._boundingRect.height / this.pixelRatio) + 'px'),
				(this.canvas.width = Math.floor(
					this._boundingRect.width * this._renderingScale
				)),
				(this.canvas.height = Math.floor(
					this._boundingRect.height * this._renderingScale
				)),
				this.gl.viewport(
					0,
					0,
					this.gl.drawingBufferWidth,
					this.gl.drawingBufferHeight
				);
		}
		resize() {
			for (let e = 0; e < this.planes.length; e++)
				this.planes[e]._canDraw && this.planes[e].resize();
			for (let e = 0; e < this.shaderPasses.length; e++)
				this.shaderPasses[e]._canDraw && this.shaderPasses[e].resize();
			for (let e = 0; e < this.renderTargets.length; e++)
				this.renderTargets[e].resize();
			this.needRender();
		}
		clear() {
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		}
		clearDepth() {
			this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
		}
		clearColor() {
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		}
		bindFrameBuffer(e, t) {
			let s = null;
			e
				? ((s = e.index),
				  s !== this.state.frameBufferID &&
						(this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, e._frameBuffer),
						this.gl.viewport(0, 0, e._size.width, e._size.height),
						e._shouldClear && !t && this.clear()))
				: this.state.frameBufferID !== null &&
				  (this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null),
				  this.gl.viewport(
						0,
						0,
						this.gl.drawingBufferWidth,
						this.gl.drawingBufferHeight
				  )),
				(this.state.frameBufferID = s);
		}
		setDepthTest(e) {
			e && !this.state.depthTest
				? ((this.state.depthTest = e), this.gl.enable(this.gl.DEPTH_TEST))
				: !e &&
				  this.state.depthTest &&
				  ((this.state.depthTest = e), this.gl.disable(this.gl.DEPTH_TEST));
		}
		setDepthFunc() {
			this.gl.depthFunc(this.gl.LEQUAL);
		}
		setBlending(e = !1) {
			e && !this.state.blending
				? ((this.state.blending = e), this.gl.enable(this.gl.BLEND))
				: !e &&
				  this.state.blending &&
				  ((this.state.blending = e), this.gl.disable(this.gl.BLEND));
		}
		setBlendFunc() {
			this.gl.enable(this.gl.BLEND),
				this.premultipliedAlpha
					? this.gl.blendFuncSeparate(
							this.gl.ONE,
							this.gl.ONE_MINUS_SRC_ALPHA,
							this.gl.ONE,
							this.gl.ONE_MINUS_SRC_ALPHA
					  )
					: this.gl.blendFuncSeparate(
							this.gl.SRC_ALPHA,
							this.gl.ONE_MINUS_SRC_ALPHA,
							this.gl.ONE,
							this.gl.ONE_MINUS_SRC_ALPHA
					  );
		}
		setFaceCulling(e) {
			if (this.state.cullFace !== e)
				if (((this.state.cullFace = e), e === 'none'))
					this.gl.disable(this.gl.CULL_FACE);
				else {
					const t = e === 'front' ? this.gl.FRONT : this.gl.BACK;
					this.gl.enable(this.gl.CULL_FACE), this.gl.cullFace(t);
				}
		}
		useProgram(e) {
			(this.state.currentProgramID === null ||
				this.state.currentProgramID !== e.id) &&
				(this.gl.useProgram(e.program), (this.state.currentProgramID = e.id));
		}
		removePlane(e) {
			this.gl &&
				((this.planes = this.planes.filter((t) => t.uuid !== e.uuid)),
				this.scene.removePlane(e),
				(e = null),
				this.gl && this.clear(),
				this.onSceneChange());
		}
		removeRenderTarget(e) {
			if (!this.gl) return;
			let t = this.planes.find(
				(s) =>
					s.type !== 'PingPongPlane' && s.target && s.target.uuid === e.uuid
			);
			for (let s = 0; s < this.planes.length; s++)
				this.planes[s].target &&
					this.planes[s].target.uuid === e.uuid &&
					(this.planes[s].target = null);
			this.renderTargets = this.renderTargets.filter((s) => s.uuid !== e.uuid);
			for (let s = 0; s < this.renderTargets.length; s++)
				this.renderTargets[s].index = s;
			(e = null),
				this.gl && this.clear(),
				t && this.scene.resetPlaneStacks(),
				this.onSceneChange();
		}
		removeShaderPass(e) {
			this.gl &&
				((this.shaderPasses = this.shaderPasses.filter(
					(t) => t.uuid !== e.uuid
				)),
				this.scene.removeShaderPass(e),
				(e = null),
				this.gl && this.clear(),
				this.onSceneChange());
		}
		enableDrawing() {
			this.state.drawingEnabled = !0;
		}
		disableDrawing() {
			this.state.drawingEnabled = !1;
		}
		needRender() {
			this.state.forceRender = !0;
		}
		render() {
			this.gl &&
				(this.clear(),
				(this.state.currentGeometryID = null),
				this.scene.draw());
		}
		deletePrograms() {
			for (let e = 0; e < this.cache.programs.length; e++) {
				const t = this.cache.programs[e];
				this.gl.deleteProgram(t.program);
			}
		}
		dispose() {
			if (!this.gl) return;
			for (this.state.isActive = !1; this.planes.length > 0; )
				this.removePlane(this.planes[0]);
			for (; this.shaderPasses.length > 0; )
				this.removeShaderPass(this.shaderPasses[0]);
			for (; this.renderTargets.length > 0; )
				this.removeRenderTarget(this.renderTargets[0]);
			let e = this.nextRender.add(() => {
				this.planes.length === 0 &&
					this.shaderPasses.length === 0 &&
					this.renderTargets.length === 0 &&
					((e.keep = !1),
					this.deletePrograms(),
					this.clear(),
					this.canvas.removeEventListener(
						'webgllost',
						this._contextLostHandler,
						!1
					),
					this.canvas.removeEventListener(
						'webglrestored',
						this._contextRestoredHandler,
						!1
					),
					this.gl &&
						this.extensions.WEBGL_lose_context &&
						this.extensions.WEBGL_lose_context.loseContext(),
					(this.canvas.width = this.canvas.width),
					(this.gl = null),
					this.container.removeChild(this.canvas),
					(this.container = null),
					(this.canvas = null),
					this.onDisposed && this.onDisposed());
			}, !0);
		}
	}
	class ke {
		constructor({
			xOffset: e = 0,
			yOffset: t = 0,
			lastXDelta: s = 0,
			lastYDelta: i = 0,
			shouldWatch: r = !0,
			onScroll: a = () => {},
		} = {}) {
			(this.xOffset = e),
				(this.yOffset = t),
				(this.lastXDelta = s),
				(this.lastYDelta = i),
				(this.shouldWatch = r),
				(this.onScroll = a),
				(this.handler = this.scroll.bind(this, !0)),
				this.shouldWatch &&
					window.addEventListener('scroll', this.handler, { passive: !0 });
		}
		scroll() {
			this.updateScrollValues(window.pageXOffset, window.pageYOffset);
		}
		updateScrollValues(e, t) {
			const s = this.xOffset;
			(this.xOffset = e), (this.lastXDelta = s - this.xOffset);
			const i = this.yOffset;
			(this.yOffset = t),
				(this.lastYDelta = i - this.yOffset),
				this.onScroll && this.onScroll(this.lastXDelta, this.lastYDelta);
		}
		dispose() {
			this.shouldWatch &&
				window.removeEventListener('scroll', this.handler, { passive: !0 });
		}
	}
	class De {
		constructor({
			container: e,
			alpha: t = !0,
			premultipliedAlpha: s = !1,
			antialias: i = !0,
			depth: r = !0,
			failIfMajorPerformanceCaveat: a = !0,
			preserveDrawingBuffer: n = !1,
			stencil: o = !1,
			autoResize: l = !0,
			autoRender: d = !0,
			watchScroll: c = !0,
			pixelRatio: f = window.devicePixelRatio || 1,
			renderingScale: u = 1,
			production: g = !1,
		} = {}) {
			(this.type = 'Curtains'),
				(this._autoResize = l),
				(this._autoRender = d),
				(this._watchScroll = c),
				(this.pixelRatio = f),
				(u = isNaN(u) ? 1 : parseFloat(u)),
				(this._renderingScale = Math.max(0.25, Math.min(1, u))),
				(this.premultipliedAlpha = s),
				(this.alpha = t),
				(this.antialias = i),
				(this.depth = r),
				(this.failIfMajorPerformanceCaveat = a),
				(this.preserveDrawingBuffer = n),
				(this.stencil = o),
				(this.production = g),
				(this.errors = !1),
				e
					? this.setContainer(e)
					: this.production ||
					  p(
							this.type +
								': no container provided in the initial parameters. Use setContainer() method to set one later and initialize the WebGL context'
					  );
		}
		setContainer(e) {
			if (e)
				if (typeof e == 'string')
					if (((e = document.getElementById(e)), e)) this.container = e;
					else {
						let t = document.createElement('div');
						t.setAttribute('id', 'curtains-canvas'),
							document.body.appendChild(t),
							(this.container = t),
							this.production ||
								p(
									'Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead'
								);
					}
				else e instanceof Element && (this.container = e);
			else {
				let t = document.createElement('div');
				t.setAttribute('id', 'curtains-canvas'),
					document.body.appendChild(t),
					(this.container = t),
					this.production ||
						p(
							'Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead'
						);
			}
			this._initCurtains();
		}
		_initCurtains() {
			(this.planes = []),
				(this.renderTargets = []),
				(this.shaderPasses = []),
				this._initRenderer(),
				this.gl &&
					(this._initScroll(),
					this._setSize(),
					this._addListeners(),
					this.container.appendChild(this.canvas),
					(this._animationFrameID = null),
					this._autoRender && this._animate());
		}
		_initRenderer() {
			(this.renderer = new ze({
				alpha: this.alpha,
				antialias: this.antialias,
				premultipliedAlpha: this.premultipliedAlpha,
				depth: this.depth,
				failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
				preserveDrawingBuffer: this.preserveDrawingBuffer,
				stencil: this.stencil,
				container: this.container,
				pixelRatio: this.pixelRatio,
				renderingScale: this._renderingScale,
				production: this.production,
				onError: () => this._onRendererError(),
				onSuccess: () => this._onRendererSuccess(),
				onContextLost: () => this._onRendererContextLost(),
				onContextRestored: () => this._onRendererContextRestored(),
				onDisposed: () => this._onRendererDisposed(),
				onSceneChange: () => this._keepSync(),
			})),
				(this.gl = this.renderer.gl),
				(this.canvas = this.renderer.canvas);
		}
		restoreContext() {
			this.renderer.restoreContext();
		}
		_animate() {
			this.render(),
				(this._animationFrameID = window.requestAnimationFrame(
					this._animate.bind(this)
				));
		}
		enableDrawing() {
			this.renderer.enableDrawing();
		}
		disableDrawing() {
			this.renderer.disableDrawing();
		}
		needRender() {
			this.renderer.needRender();
		}
		nextRender(e, t = !1) {
			return this.renderer.nextRender.add(e, t);
		}
		clear() {
			this.renderer && this.renderer.clear();
		}
		clearDepth() {
			this.renderer && this.renderer.clearDepth();
		}
		clearColor() {
			this.renderer && this.renderer.clearColor();
		}
		isWebGL2() {
			return this.gl ? this.renderer._isWebGL2 : !1;
		}
		render() {
			this.renderer.nextRender.execute(),
				!(
					!this.renderer.state.drawingEnabled &&
					!this.renderer.state.forceRender
				) &&
					(this.renderer.state.forceRender &&
						(this.renderer.state.forceRender = !1),
					this._onRenderCallback && this._onRenderCallback(),
					this.renderer.render());
		}
		_addListeners() {
			(this._resizeHandler = null),
				this._autoResize &&
					((this._resizeHandler = this.resize.bind(this, !0)),
					window.addEventListener('resize', this._resizeHandler, !1));
		}
		setPixelRatio(e, t) {
			(this.pixelRatio = parseFloat(Math.max(e, 1)) || 1),
				this.renderer.setPixelRatio(e),
				this.resize(t);
		}
		_setSize() {
			this.renderer.setSize(),
				this._scrollManager.shouldWatch &&
					((this._scrollManager.xOffset = window.pageXOffset),
					(this._scrollManager.yOffset = window.pageYOffset));
		}
		getBoundingRect() {
			return this.renderer._boundingRect;
		}
		resize(e) {
			this.gl &&
				(this._setSize(),
				this.renderer.resize(),
				this.nextRender(() => {
					this._onAfterResizeCallback && e && this._onAfterResizeCallback();
				}));
		}
		_initScroll() {
			this._scrollManager = new ke({
				xOffset: window.pageXOffset,
				yOffset: 0,
				lastXDelta: 0,
				lastYDelta: 0,
				shouldWatch: this._watchScroll,
				onScroll: (e, t) => this._updateScroll(e, t),
			});
		}
		_updateScroll(e, t) {
			for (let s = 0; s < this.planes.length; s++)
				this.planes[s].watchScroll && this.planes[s].updateScrollPosition(e, t);
			this.renderer.needRender(),
				this._onScrollCallback && this._onScrollCallback();
		}
		updateScrollValues(e, t) {
			this._scrollManager.updateScrollValues(e, t);
		}
		getScrollDeltas() {
			return {
				x: this._scrollManager.lastXDelta,
				y: this._scrollManager.lastYDelta,
			};
		}
		getScrollValues() {
			return { x: this._scrollManager.xOffset, y: this._scrollManager.yOffset };
		}
		_keepSync() {
			(this.planes = this.renderer.planes),
				(this.shaderPasses = this.renderer.shaderPasses),
				(this.renderTargets = this.renderer.renderTargets);
		}
		lerp(e, t, s) {
			return Ce(e, t, s);
		}
		onAfterResize(e) {
			return e && (this._onAfterResizeCallback = e), this;
		}
		onError(e) {
			return e && (this._onErrorCallback = e), this;
		}
		_onRendererError() {
			setTimeout(() => {
				this._onErrorCallback && !this.errors && this._onErrorCallback(),
					(this.errors = !0);
			}, 0);
		}
		onSuccess(e) {
			return e && (this._onSuccessCallback = e), this;
		}
		_onRendererSuccess() {
			setTimeout(() => {
				this._onSuccessCallback && this._onSuccessCallback();
			}, 0);
		}
		onContextLost(e) {
			return e && (this._onContextLostCallback = e), this;
		}
		_onRendererContextLost() {
			this._onContextLostCallback && this._onContextLostCallback();
		}
		onContextRestored(e) {
			return e && (this._onContextRestoredCallback = e), this;
		}
		_onRendererContextRestored() {
			this._onContextRestoredCallback && this._onContextRestoredCallback();
		}
		onRender(e) {
			return e && (this._onRenderCallback = e), this;
		}
		onScroll(e) {
			return e && (this._onScrollCallback = e), this;
		}
		dispose() {
			this.renderer.dispose();
		}
		_onRendererDisposed() {
			this._animationFrameID &&
				window.cancelAnimationFrame(this._animationFrameID),
				this._resizeHandler &&
					window.removeEventListener('resize', this._resizeHandler, !1),
				this._scrollManager && this._scrollManager.dispose();
		}
	}
	class Oe {
		constructor(e, t, s) {
			if (((this.type = 'Uniforms'), !e || e.type !== 'Renderer'))
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				F(this.type + ': Renderer WebGL context is undefined', e);
				return;
			}
			if (
				((this.renderer = e),
				(this.gl = e.gl),
				(this.program = t),
				(this.uniforms = {}),
				s)
			)
				for (const i in s) {
					const r = s[i];
					this.uniforms[i] = {
						name: r.name,
						type: r.type,
						value:
							r.value.clone && typeof r.value.clone == 'function'
								? r.value.clone()
								: r.value,
						update: null,
					};
				}
		}
		handleUniformSetting(e) {
			switch (e.type) {
				case '1i':
					e.update = this.setUniform1i.bind(this);
					break;
				case '1iv':
					e.update = this.setUniform1iv.bind(this);
					break;
				case '1f':
					e.update = this.setUniform1f.bind(this);
					break;
				case '1fv':
					e.update = this.setUniform1fv.bind(this);
					break;
				case '2i':
					e.update = this.setUniform2i.bind(this);
					break;
				case '2iv':
					e.update = this.setUniform2iv.bind(this);
					break;
				case '2f':
					e.update = this.setUniform2f.bind(this);
					break;
				case '2fv':
					e.update = this.setUniform2fv.bind(this);
					break;
				case '3i':
					e.update = this.setUniform3i.bind(this);
					break;
				case '3iv':
					e.update = this.setUniform3iv.bind(this);
					break;
				case '3f':
					e.update = this.setUniform3f.bind(this);
					break;
				case '3fv':
					e.update = this.setUniform3fv.bind(this);
					break;
				case '4i':
					e.update = this.setUniform4i.bind(this);
					break;
				case '4iv':
					e.update = this.setUniform4iv.bind(this);
					break;
				case '4f':
					e.update = this.setUniform4f.bind(this);
					break;
				case '4fv':
					e.update = this.setUniform4fv.bind(this);
					break;
				case 'mat2':
					e.update = this.setUniformMatrix2fv.bind(this);
					break;
				case 'mat3':
					e.update = this.setUniformMatrix3fv.bind(this);
					break;
				case 'mat4':
					e.update = this.setUniformMatrix4fv.bind(this);
					break;
				default:
					this.renderer.production ||
						p(this.type + ': This uniform type is not handled : ', e.type);
			}
		}
		setInternalFormat(e) {
			e.value.type === 'Vec2'
				? ((e._internalFormat = 'Vec2'), (e.lastValue = e.value.clone()))
				: e.value.type === 'Vec3'
				? ((e._internalFormat = 'Vec3'), (e.lastValue = e.value.clone()))
				: e.value.type === 'Mat4'
				? ((e._internalFormat = 'Mat4'), (e.lastValue = e.value.clone()))
				: e.value.type === 'Quat'
				? ((e._internalFormat = 'Quat'), (e.lastValue = e.value.clone()))
				: Array.isArray(e.value)
				? ((e._internalFormat = 'array'), (e.lastValue = Array.from(e.value)))
				: e.value.constructor === Float32Array
				? ((e._internalFormat = 'mat'), (e.lastValue = e.value))
				: ((e._internalFormat = 'float'), (e.lastValue = e.value));
		}
		setUniforms() {
			if (this.uniforms)
				for (const e in this.uniforms) {
					let t = this.uniforms[e];
					(t.location = this.gl.getUniformLocation(this.program, t.name)),
						t._internalFormat || this.setInternalFormat(t),
						t.type ||
							(t._internalFormat === 'Vec2'
								? (t.type = '2f')
								: t._internalFormat === 'Vec3'
								? (t.type = '3f')
								: t._internalFormat === 'Mat4'
								? (t.type = 'mat4')
								: t._internalFormat === 'array'
								? t.value.length === 4
									? ((t.type = '4f'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a 4f (array of 4 floats) uniform type'
											))
									: t.value.length === 3
									? ((t.type = '3f'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a 3f (array of 3 floats) uniform type'
											))
									: t.value.length === 2 &&
									  ((t.type = '2f'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a 2f (array of 2 floats) uniform type'
											))
								: t._internalFormat === 'mat'
								? t.value.length === 16
									? ((t.type = 'mat4'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a mat4 (4x4 matrix array) uniform type'
											))
									: t.value.length === 9
									? ((t.type = 'mat3'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a mat3 (3x3 matrix array) uniform type'
											))
									: t.value.length === 4 &&
									  ((t.type = 'mat2'),
									  this.renderer.production ||
											p(
												this.type +
													': No uniform type declared for ' +
													t.name +
													', applied a mat2 (2x2 matrix array) uniform type'
											))
								: ((t.type = '1f'),
								  this.renderer.production ||
										p(
											this.type +
												': No uniform type declared for ' +
												t.name +
												', applied a 1f (float) uniform type'
										))),
						this.handleUniformSetting(t),
						t.update && t.update(t);
				}
		}
		updateUniforms() {
			if (this.uniforms)
				for (const e in this.uniforms) {
					const t = this.uniforms[e];
					let s = !1;
					t._internalFormat === 'Vec2' ||
					t._internalFormat === 'Vec3' ||
					t._internalFormat === 'Quat'
						? t.value.equals(t.lastValue) ||
						  ((s = !0), t.lastValue.copy(t.value))
						: t.value.length
						? JSON.stringify(t.value) !== JSON.stringify(t.lastValue) &&
						  ((s = !0), (t.lastValue = Array.from(t.value)))
						: t.value !== t.lastValue && ((s = !0), (t.lastValue = t.value)),
						s && t.update && t.update(t);
				}
		}
		setUniform1i(e) {
			this.gl.uniform1i(e.location, e.value);
		}
		setUniform1iv(e) {
			this.gl.uniform1iv(e.location, e.value);
		}
		setUniform1f(e) {
			this.gl.uniform1f(e.location, e.value);
		}
		setUniform1fv(e) {
			this.gl.uniform1fv(e.location, e.value);
		}
		setUniform2i(e) {
			e._internalFormat === 'Vec2'
				? this.gl.uniform2i(e.location, e.value.x, e.value.y)
				: this.gl.uniform2i(e.location, e.value[0], e.value[1]);
		}
		setUniform2iv(e) {
			e._internalFormat === 'Vec2'
				? this.gl.uniform2iv(e.location, [e.value.x, e.value.y])
				: this.gl.uniform2iv(e.location, e.value);
		}
		setUniform2f(e) {
			e._internalFormat === 'Vec2'
				? this.gl.uniform2f(e.location, e.value.x, e.value.y)
				: this.gl.uniform2f(e.location, e.value[0], e.value[1]);
		}
		setUniform2fv(e) {
			e._internalFormat === 'Vec2'
				? this.gl.uniform2fv(e.location, [e.value.x, e.value.y])
				: this.gl.uniform2fv(e.location, e.value);
		}
		setUniform3i(e) {
			e._internalFormat === 'Vec3'
				? this.gl.uniform3i(e.location, e.value.x, e.value.y, e.value.z)
				: this.gl.uniform3i(e.location, e.value[0], e.value[1], e.value[2]);
		}
		setUniform3iv(e) {
			e._internalFormat === 'Vec3'
				? this.gl.uniform3iv(e.location, [e.value.x, e.value.y, e.value.z])
				: this.gl.uniform3iv(e.location, e.value);
		}
		setUniform3f(e) {
			e._internalFormat === 'Vec3'
				? this.gl.uniform3f(e.location, e.value.x, e.value.y, e.value.z)
				: this.gl.uniform3f(e.location, e.value[0], e.value[1], e.value[2]);
		}
		setUniform3fv(e) {
			e._internalFormat === 'Vec3'
				? this.gl.uniform3fv(e.location, [e.value.x, e.value.y, e.value.z])
				: this.gl.uniform3fv(e.location, e.value);
		}
		setUniform4i(e) {
			e._internalFormat === 'Quat'
				? this.gl.uniform4i(
						e.location,
						e.value.elements[0],
						e.value.elements[1],
						e.value.elements[2],
						e.value[3]
				  )
				: this.gl.uniform4i(
						e.location,
						e.value[0],
						e.value[1],
						e.value[2],
						e.value[3]
				  );
		}
		setUniform4iv(e) {
			e._internalFormat === 'Quat'
				? this.gl.uniform4iv(e.location, [
						e.value.elements[0],
						e.value.elements[1],
						e.value.elements[2],
						e.value[3],
				  ])
				: this.gl.uniform4iv(e.location, e.value);
		}
		setUniform4f(e) {
			e._internalFormat === 'Quat'
				? this.gl.uniform4f(
						e.location,
						e.value.elements[0],
						e.value.elements[1],
						e.value.elements[2],
						e.value[3]
				  )
				: this.gl.uniform4f(
						e.location,
						e.value[0],
						e.value[1],
						e.value[2],
						e.value[3]
				  );
		}
		setUniform4fv(e) {
			e._internalFormat === 'Quat'
				? this.gl.uniform4fv(e.location, [
						e.value.elements[0],
						e.value.elements[1],
						e.value.elements[2],
						e.value[3],
				  ])
				: this.gl.uniform4fv(e.location, e.value);
		}
		setUniformMatrix2fv(e) {
			this.gl.uniformMatrix2fv(e.location, !1, e.value);
		}
		setUniformMatrix3fv(e) {
			this.gl.uniformMatrix3fv(e.location, !1, e.value);
		}
		setUniformMatrix4fv(e) {
			e._internalFormat === 'Mat4'
				? this.gl.uniformMatrix4fv(e.location, !1, e.value.elements)
				: this.gl.uniformMatrix4fv(e.location, !1, e.value);
		}
	}
	const J = `
precision mediump float;
`.replace(/\n/g, ''),
		ce = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
`.replace(/\n/g, ''),
		ee = `
varying vec3 vVertexPosition;
varying vec2 vTextureCoord;
`.replace(/\n/g, ''),
		Ue = (
			J +
			ce +
			ee +
			`
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`
		).replace(/\n/g, ''),
		Ve = (
			J +
			ee +
			`
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`
		).replace(/\n/g, ''),
		Ne = (
			J +
			ce +
			ee +
			`
void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = vec4(aVertexPosition, 1.0);
}
`
		).replace(/\n/g, ''),
		Be = (
			J +
			ee +
			`
uniform sampler2D uRenderTexture;

void main() {
    gl_FragColor = texture2D(uRenderTexture, vTextureCoord);
}
`
		).replace(/\n/g, '');
	let ue = 0;
	class fe {
		constructor(e, { parent: t, vertexShader: s, fragmentShader: i } = {}) {
			if (((this.type = 'Program'), !e || e.type !== 'Renderer'))
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				F(this.type + ': Renderer WebGL context is undefined', e);
				return;
			}
			(this.renderer = e),
				(this.gl = this.renderer.gl),
				(this.parent = t),
				(this.defaultVsCode = this.parent.type === 'Plane' ? Ue : Ne),
				(this.defaultFsCode = this.parent.type === 'Plane' ? Ve : Be),
				s
					? (this.vsCode = s)
					: (!this.renderer.production &&
							this.parent.type === 'Plane' &&
							p(
								this.parent.type +
									': No vertex shader provided, will use a default one'
							),
					  (this.vsCode = this.defaultVsCode)),
				i
					? (this.fsCode = i)
					: (this.renderer.production ||
							p(
								this.parent.type +
									': No fragment shader provided, will use a default one'
							),
					  (this.fsCode = this.defaultFsCode)),
				(this.compiled = !0),
				this.setupProgram();
		}
		createShader(e, t) {
			const s = this.gl.createShader(t);
			if (
				(this.gl.shaderSource(s, e),
				this.gl.compileShader(s),
				!this.renderer.production &&
					!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS))
			) {
				const i =
					t === this.gl.VERTEX_SHADER ? 'vertex shader' : 'fragment shader';
				let a = this.gl.getShaderSource(s).split(`
`);
				for (let n = 0; n < a.length; n++) a[n] = n + 1 + ': ' + a[n];
				return (
					(a = a.join(`
`)),
					p(
						this.type + ': Errors occurred while compiling the',
						i,
						`:
`,
						this.gl.getShaderInfoLog(s)
					),
					F(a),
					p(this.type + ': Will use a default', i),
					this.createShader(
						t === this.gl.VERTEX_SHADER
							? this.defaultVsCode
							: this.defaultFsCode,
						t
					)
				);
			}
			return s;
		}
		useNewShaders() {
			(this.vertexShader = this.createShader(
				this.vsCode,
				this.gl.VERTEX_SHADER
			)),
				(this.fragmentShader = this.createShader(
					this.fsCode,
					this.gl.FRAGMENT_SHADER
				)),
				(!this.vertexShader || !this.fragmentShader) &&
					(this.renderer.production ||
						p(
							this.type +
								': Unable to find or compile the vertex or fragment shader'
						));
		}
		setupProgram() {
			let e = this.renderer.cache.getProgramFromShaders(
				this.vsCode,
				this.fsCode
			);
			e
				? ((this.vertexShader = e.vertexShader),
				  (this.fragmentShader = e.fragmentShader),
				  (this.activeUniforms = e.activeUniforms),
				  (this.activeAttributes = e.activeAttributes),
				  this.createProgram())
				: (this.useNewShaders(),
				  this.compiled &&
						(this.createProgram(), this.renderer.cache.addProgram(this)));
		}
		createProgram() {
			if (
				(ue++,
				(this.id = ue),
				(this.program = this.gl.createProgram()),
				this.gl.attachShader(this.program, this.vertexShader),
				this.gl.attachShader(this.program, this.fragmentShader),
				this.gl.linkProgram(this.program),
				!this.renderer.production &&
					!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
			) {
				p(
					this.type +
						': Unable to initialize the shader program: ' +
						this.gl.getProgramInfoLog(this.program)
				),
					p(this.type + ': Will use default vertex and fragment shaders'),
					(this.vertexShader = this.createShader(
						this.defaultVsCode,
						this.gl.VERTEX_SHADER
					)),
					(this.fragmentShader = this.createShader(
						this.defaultFsCode,
						this.gl.FRAGMENT_SHADER
					)),
					this.createProgram();
				return;
			}
			if (
				(this.gl.deleteShader(this.vertexShader),
				this.gl.deleteShader(this.fragmentShader),
				!this.activeUniforms || !this.activeAttributes)
			) {
				this.activeUniforms = { textures: [], textureMatrices: [] };
				const e = this.gl.getProgramParameter(
					this.program,
					this.gl.ACTIVE_UNIFORMS
				);
				for (let s = 0; s < e; s++) {
					const i = this.gl.getActiveUniform(this.program, s);
					i.type === this.gl.SAMPLER_2D &&
						this.activeUniforms.textures.push(i.name),
						i.type === this.gl.FLOAT_MAT4 &&
							i.name !== 'uMVMatrix' &&
							i.name !== 'uPMatrix' &&
							this.activeUniforms.textureMatrices.push(i.name);
				}
				this.activeAttributes = [];
				const t = this.gl.getProgramParameter(
					this.program,
					this.gl.ACTIVE_ATTRIBUTES
				);
				for (let s = 0; s < t; s++) {
					const i = this.gl.getActiveAttrib(this.program, s);
					this.activeAttributes.push(i.name);
				}
			}
		}
		createUniforms(e) {
			(this.uniformsManager = new Oe(this.renderer, this.program, e)),
				this.setUniforms();
		}
		setUniforms() {
			this.renderer.useProgram(this), this.uniformsManager.setUniforms();
		}
		updateUniforms() {
			this.renderer.useProgram(this), this.uniformsManager.updateUniforms();
		}
	}
	class We {
		constructor(e, { program: t = null, width: s = 1, height: i = 1 } = {}) {
			if (((this.type = 'Geometry'), !e || e.type !== 'Renderer'))
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				F(this.type + ': Renderer WebGL context is undefined', e);
				return;
			}
			(this.renderer = e),
				(this.gl = this.renderer.gl),
				(this.definition = { id: s * i + s, width: s, height: i }),
				this.setDefaultAttributes(),
				this.setVerticesUVs();
		}
		restoreContext(e) {
			(this.program = null),
				this.setDefaultAttributes(),
				this.setVerticesUVs(),
				this.setProgram(e);
		}
		setDefaultAttributes() {
			this.attributes = {
				vertexPosition: { name: 'aVertexPosition', size: 3, isActive: !1 },
				textureCoord: { name: 'aTextureCoord', size: 3, isActive: !1 },
			};
		}
		setVerticesUVs() {
			const e = this.renderer.cache.getGeometryFromID(this.definition.id);
			e
				? ((this.attributes.vertexPosition.array = e.vertices),
				  (this.attributes.textureCoord.array = e.uvs))
				: (this.computeVerticesUVs(),
				  this.renderer.cache.addGeometry(
						this.definition.id,
						this.attributes.vertexPosition.array,
						this.attributes.textureCoord.array
				  ));
		}
		setProgram(e) {
			(this.program = e),
				this.initAttributes(),
				this.renderer._isWebGL2
					? ((this._vao = this.gl.createVertexArray()),
					  this.gl.bindVertexArray(this._vao))
					: this.renderer.extensions.OES_vertex_array_object &&
					  ((this._vao =
							this.renderer.extensions.OES_vertex_array_object.createVertexArrayOES()),
					  this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(
							this._vao
					  )),
				this.initializeBuffers();
		}
		initAttributes() {
			for (const e in this.attributes) {
				if (
					((this.attributes[e].isActive =
						this.program.activeAttributes.includes(this.attributes[e].name)),
					!this.attributes[e].isActive)
				)
					return;
				(this.attributes[e].location = this.gl.getAttribLocation(
					this.program.program,
					this.attributes[e].name
				)),
					(this.attributes[e].buffer = this.gl.createBuffer()),
					(this.attributes[e].numberOfItems =
						this.definition.width *
						this.definition.height *
						this.attributes[e].size *
						2);
			}
		}
		computeVerticesUVs() {
			(this.attributes.vertexPosition.array = []),
				(this.attributes.textureCoord.array = []);
			const e = this.attributes.vertexPosition.array,
				t = this.attributes.textureCoord.array;
			for (let s = 0; s < this.definition.height; s++) {
				const i = s / this.definition.height;
				for (let r = 0; r < this.definition.width; r++) {
					const a = r / this.definition.width;
					t.push(a),
						t.push(i),
						t.push(0),
						e.push((a - 0.5) * 2),
						e.push((i - 0.5) * 2),
						e.push(0),
						t.push(a + 1 / this.definition.width),
						t.push(i),
						t.push(0),
						e.push((a + 1 / this.definition.width - 0.5) * 2),
						e.push((i - 0.5) * 2),
						e.push(0),
						t.push(a),
						t.push(i + 1 / this.definition.height),
						t.push(0),
						e.push((a - 0.5) * 2),
						e.push((i + 1 / this.definition.height - 0.5) * 2),
						e.push(0),
						t.push(a),
						t.push(i + 1 / this.definition.height),
						t.push(0),
						e.push((a - 0.5) * 2),
						e.push((i + 1 / this.definition.height - 0.5) * 2),
						e.push(0),
						t.push(a + 1 / this.definition.width),
						t.push(i),
						t.push(0),
						e.push((a + 1 / this.definition.width - 0.5) * 2),
						e.push((i - 0.5) * 2),
						e.push(0),
						t.push(a + 1 / this.definition.width),
						t.push(i + 1 / this.definition.height),
						t.push(0),
						e.push((a + 1 / this.definition.width - 0.5) * 2),
						e.push((i + 1 / this.definition.height - 0.5) * 2),
						e.push(0);
				}
			}
		}
		initializeBuffers() {
			if (this.attributes) {
				for (const e in this.attributes)
					this.attributes[e].isActive &&
						(this.gl.enableVertexAttribArray(this.attributes[e].location),
						this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer),
						this.gl.bufferData(
							this.gl.ARRAY_BUFFER,
							new Float32Array(this.attributes[e].array),
							this.gl.STATIC_DRAW
						),
						this.gl.vertexAttribPointer(
							this.attributes[e].location,
							this.attributes[e].size,
							this.gl.FLOAT,
							!1,
							0,
							0
						));
				this.indices &&
					((this.indexBuffer = this.gl.createBuffer()),
					this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer),
					this.gl.bufferData(
						this.gl.ELEMENT_ARRAY_BUFFER,
						new Uint16Array(this.indices),
						this.gl.STATIC_DRAW
					)),
					(this.renderer.state.currentGeometryID = this.definition.id);
			}
		}
		bindBuffers() {
			if (this._vao)
				this.renderer._isWebGL2
					? this.gl.bindVertexArray(this._vao)
					: this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(
							this._vao
					  );
			else
				for (const e in this.attributes)
					this.attributes[e].isActive &&
						(this.gl.enableVertexAttribArray(this.attributes[e].location),
						this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer),
						this.gl.vertexAttribPointer(
							this.attributes[e].location,
							this.attributes[e].size,
							this.gl.FLOAT,
							!1,
							0,
							0
						));
			this.renderer.state.currentGeometryID = this.definition.id;
		}
		draw() {
			this.indices
				? this.gl.drawElements(
						this.gl.TRIANGLES,
						this.indices.length,
						this.gl.UNSIGNED_SHORT,
						0
				  )
				: this.gl.drawArrays(
						this.gl.TRIANGLES,
						0,
						this.attributes.vertexPosition.numberOfItems
				  );
		}
		dispose() {
			this._vao &&
				(this.renderer._isWebGL2
					? this.gl.deleteVertexArray(this._vao)
					: this.renderer.extensions.OES_vertex_array_object.deleteVertexArrayOES(
							this._vao
					  ));
			for (const e in this.attributes) {
				if (!this.attributes[e].isActive) return;
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer),
					this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW),
					this.gl.deleteBuffer(this.attributes[e].buffer);
			}
			(this.attributes = null), (this.renderer.state.currentGeometryID = null);
		}
	}
	class B {
		constructor(
			e = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
		) {
			(this.type = 'Mat4'), (this.elements = e);
		}
		setFromArray(e) {
			for (let t = 0; t < this.elements.length; t++) this.elements[t] = e[t];
			return this;
		}
		copy(e) {
			const t = e.elements;
			return (
				(this.elements[0] = t[0]),
				(this.elements[1] = t[1]),
				(this.elements[2] = t[2]),
				(this.elements[3] = t[3]),
				(this.elements[4] = t[4]),
				(this.elements[5] = t[5]),
				(this.elements[6] = t[6]),
				(this.elements[7] = t[7]),
				(this.elements[8] = t[8]),
				(this.elements[9] = t[9]),
				(this.elements[10] = t[10]),
				(this.elements[11] = t[11]),
				(this.elements[12] = t[12]),
				(this.elements[13] = t[13]),
				(this.elements[14] = t[14]),
				(this.elements[15] = t[15]),
				this
			);
		}
		clone() {
			return new B().copy(this);
		}
		multiply(e) {
			const t = this.elements,
				s = e.elements;
			let i = new B();
			return (
				(i.elements[0] =
					s[0] * t[0] + s[1] * t[4] + s[2] * t[8] + s[3] * t[12]),
				(i.elements[1] =
					s[0] * t[1] + s[1] * t[5] + s[2] * t[9] + s[3] * t[13]),
				(i.elements[2] =
					s[0] * t[2] + s[1] * t[6] + s[2] * t[10] + s[3] * t[14]),
				(i.elements[3] =
					s[0] * t[3] + s[1] * t[7] + s[2] * t[11] + s[3] * t[15]),
				(i.elements[4] =
					s[4] * t[0] + s[5] * t[4] + s[6] * t[8] + s[7] * t[12]),
				(i.elements[5] =
					s[4] * t[1] + s[5] * t[5] + s[6] * t[9] + s[7] * t[13]),
				(i.elements[6] =
					s[4] * t[2] + s[5] * t[6] + s[6] * t[10] + s[7] * t[14]),
				(i.elements[7] =
					s[4] * t[3] + s[5] * t[7] + s[6] * t[11] + s[7] * t[15]),
				(i.elements[8] =
					s[8] * t[0] + s[9] * t[4] + s[10] * t[8] + s[11] * t[12]),
				(i.elements[9] =
					s[8] * t[1] + s[9] * t[5] + s[10] * t[9] + s[11] * t[13]),
				(i.elements[10] =
					s[8] * t[2] + s[9] * t[6] + s[10] * t[10] + s[11] * t[14]),
				(i.elements[11] =
					s[8] * t[3] + s[9] * t[7] + s[10] * t[11] + s[11] * t[15]),
				(i.elements[12] =
					s[12] * t[0] + s[13] * t[4] + s[14] * t[8] + s[15] * t[12]),
				(i.elements[13] =
					s[12] * t[1] + s[13] * t[5] + s[14] * t[9] + s[15] * t[13]),
				(i.elements[14] =
					s[12] * t[2] + s[13] * t[6] + s[14] * t[10] + s[15] * t[14]),
				(i.elements[15] =
					s[12] * t[3] + s[13] * t[7] + s[14] * t[11] + s[15] * t[15]),
				i
			);
		}
		getInverse() {
			const e = this.elements,
				t = new B(),
				s = t.elements;
			let i = e[0],
				r = e[1],
				a = e[2],
				n = e[3],
				o = e[4],
				l = e[5],
				d = e[6],
				c = e[7],
				f = e[8],
				u = e[9],
				g = e[10],
				m = e[11],
				b = e[12],
				y = e[13],
				_ = e[14],
				x = e[15],
				v = i * l - r * o,
				P = i * d - a * o,
				w = i * c - n * o,
				T = r * d - a * l,
				A = r * c - n * l,
				E = a * c - n * d,
				M = f * y - u * b,
				S = f * _ - g * b,
				I = f * x - m * b,
				H = u * _ - g * y,
				j = u * x - m * y,
				X = g * x - m * _,
				C = v * X - P * j + w * H + T * I - A * S + E * M;
			return C
				? ((C = 1 / C),
				  (s[0] = (l * X - d * j + c * H) * C),
				  (s[1] = (a * j - r * X - n * H) * C),
				  (s[2] = (y * E - _ * A + x * T) * C),
				  (s[3] = (g * A - u * E - m * T) * C),
				  (s[4] = (d * I - o * X - c * S) * C),
				  (s[5] = (i * X - a * I + n * S) * C),
				  (s[6] = (_ * w - b * E - x * P) * C),
				  (s[7] = (f * E - g * w + m * P) * C),
				  (s[8] = (o * j - l * I + c * M) * C),
				  (s[9] = (r * I - i * j - n * M) * C),
				  (s[10] = (b * A - y * w + x * v) * C),
				  (s[11] = (u * w - f * A - m * v) * C),
				  (s[12] = (l * S - o * H - d * M) * C),
				  (s[13] = (i * H - r * S + a * M) * C),
				  (s[14] = (y * P - b * T - _ * v) * C),
				  (s[15] = (f * T - u * P + g * v) * C),
				  t)
				: null;
		}
		scale(e) {
			let t = this.elements;
			return (
				(t[0] *= e.x),
				(t[1] *= e.x),
				(t[2] *= e.x),
				(t[3] *= e.x),
				(t[4] *= e.y),
				(t[5] *= e.y),
				(t[6] *= e.y),
				(t[7] *= e.y),
				(t[8] *= e.z),
				(t[9] *= e.z),
				(t[10] *= e.z),
				(t[11] *= e.z),
				this
			);
		}
		compose(e, t, s) {
			let i = this.elements;
			const r = t.elements[0],
				a = t.elements[1],
				n = t.elements[2],
				o = t.elements[3],
				l = r + r,
				d = a + a,
				c = n + n,
				f = r * l,
				u = r * d,
				g = r * c,
				m = a * d,
				b = a * c,
				y = n * c,
				_ = o * l,
				x = o * d,
				v = o * c,
				P = s.x,
				w = s.y,
				T = s.z;
			return (
				(i[0] = (1 - (m + y)) * P),
				(i[1] = (u + v) * P),
				(i[2] = (g - x) * P),
				(i[3] = 0),
				(i[4] = (u - v) * w),
				(i[5] = (1 - (f + y)) * w),
				(i[6] = (b + _) * w),
				(i[7] = 0),
				(i[8] = (g + x) * T),
				(i[9] = (b - _) * T),
				(i[10] = (1 - (f + m)) * T),
				(i[11] = 0),
				(i[12] = e.x),
				(i[13] = e.y),
				(i[14] = e.z),
				(i[15] = 1),
				this
			);
		}
		composeFromOrigin(e, t, s, i) {
			let r = this.elements;
			const a = t.elements[0],
				n = t.elements[1],
				o = t.elements[2],
				l = t.elements[3],
				d = a + a,
				c = n + n,
				f = o + o,
				u = a * d,
				g = a * c,
				m = a * f,
				b = n * c,
				y = n * f,
				_ = o * f,
				x = l * d,
				v = l * c,
				P = l * f,
				w = s.x,
				T = s.y,
				A = s.z,
				E = i.x,
				M = i.y,
				S = i.z,
				I = (1 - (b + _)) * w,
				H = (g + P) * w,
				j = (m - v) * w,
				X = (g - P) * T,
				C = (1 - (u + _)) * T,
				Se = (y + x) * T,
				Me = (m + v) * A,
				Ee = (y - x) * A,
				Ae = (1 - (u + b)) * A;
			return (
				(r[0] = I),
				(r[1] = H),
				(r[2] = j),
				(r[3] = 0),
				(r[4] = X),
				(r[5] = C),
				(r[6] = Se),
				(r[7] = 0),
				(r[8] = Me),
				(r[9] = Ee),
				(r[10] = Ae),
				(r[11] = 0),
				(r[12] = e.x + E - (I * E + X * M + Me * S)),
				(r[13] = e.y + M - (H * E + C * M + Ee * S)),
				(r[14] = e.z + S - (j * E + Se * M + Ae * S)),
				(r[15] = 1),
				this
			);
		}
	}
	class L {
		constructor(e = 0, t = e) {
			(this.type = 'Vec2'), (this._x = e), (this._y = t);
		}
		get x() {
			return this._x;
		}
		get y() {
			return this._y;
		}
		set x(e) {
			const t = e !== this._x;
			(this._x = e), t && this._onChangeCallback && this._onChangeCallback();
		}
		set y(e) {
			const t = e !== this._y;
			(this._y = e), t && this._onChangeCallback && this._onChangeCallback();
		}
		onChange(e) {
			return e && (this._onChangeCallback = e), this;
		}
		set(e, t) {
			return (this._x = e), (this._y = t), this;
		}
		add(e) {
			return (this._x += e.x), (this._y += e.y), this;
		}
		addScalar(e) {
			return (this._x += e), (this._y += e), this;
		}
		sub(e) {
			return (this._x -= e.x), (this._y -= e.y), this;
		}
		subScalar(e) {
			return (this._x -= e), (this._y -= e), this;
		}
		multiply(e) {
			return (this._x *= e.x), (this._y *= e.y), this;
		}
		multiplyScalar(e) {
			return (this._x *= e), (this._y *= e), this;
		}
		copy(e) {
			return (this._x = e.x), (this._y = e.y), this;
		}
		clone() {
			return new L(this._x, this._y);
		}
		sanitizeNaNValuesWith(e) {
			return (
				(this._x = isNaN(this._x) ? e.x : parseFloat(this._x)),
				(this._y = isNaN(this._y) ? e.y : parseFloat(this._y)),
				this
			);
		}
		max(e) {
			return (
				(this._x = Math.max(this._x, e.x)),
				(this._y = Math.max(this._y, e.y)),
				this
			);
		}
		min(e) {
			return (
				(this._x = Math.min(this._x, e.x)),
				(this._y = Math.min(this._y, e.y)),
				this
			);
		}
		equals(e) {
			return this._x === e.x && this._y === e.y;
		}
		normalize() {
			let e = this._x * this._x + this._y * this._y;
			return (
				e > 0 && (e = 1 / Math.sqrt(e)), (this._x *= e), (this._y *= e), this
			);
		}
		dot(e) {
			return this._x * e.x + this._y * e.y;
		}
	}
	class R {
		constructor(e = 0, t = e, s = e) {
			(this.type = 'Vec3'), (this._x = e), (this._y = t), (this._z = s);
		}
		get x() {
			return this._x;
		}
		get y() {
			return this._y;
		}
		get z() {
			return this._z;
		}
		set x(e) {
			const t = e !== this._x;
			(this._x = e), t && this._onChangeCallback && this._onChangeCallback();
		}
		set y(e) {
			const t = e !== this._y;
			(this._y = e), t && this._onChangeCallback && this._onChangeCallback();
		}
		set z(e) {
			const t = e !== this._z;
			(this._z = e), t && this._onChangeCallback && this._onChangeCallback();
		}
		onChange(e) {
			return e && (this._onChangeCallback = e), this;
		}
		set(e, t, s) {
			return (this._x = e), (this._y = t), (this._z = s), this;
		}
		add(e) {
			return (this._x += e.x), (this._y += e.y), (this._z += e.z), this;
		}
		addScalar(e) {
			return (this._x += e), (this._y += e), (this._z += e), this;
		}
		sub(e) {
			return (this._x -= e.x), (this._y -= e.y), (this._z -= e.z), this;
		}
		subScalar(e) {
			return (this._x -= e), (this._y -= e), (this._z -= e), this;
		}
		multiply(e) {
			return (this._x *= e.x), (this._y *= e.y), (this._z *= e.z), this;
		}
		multiplyScalar(e) {
			return (this._x *= e), (this._y *= e), (this._z *= e), this;
		}
		copy(e) {
			return (this._x = e.x), (this._y = e.y), (this._z = e.z), this;
		}
		clone() {
			return new R(this._x, this._y, this._z);
		}
		sanitizeNaNValuesWith(e) {
			return (
				(this._x = isNaN(this._x) ? e.x : parseFloat(this._x)),
				(this._y = isNaN(this._y) ? e.y : parseFloat(this._y)),
				(this._z = isNaN(this._z) ? e.z : parseFloat(this._z)),
				this
			);
		}
		max(e) {
			return (
				(this._x = Math.max(this._x, e.x)),
				(this._y = Math.max(this._y, e.y)),
				(this._z = Math.max(this._z, e.z)),
				this
			);
		}
		min(e) {
			return (
				(this._x = Math.min(this._x, e.x)),
				(this._y = Math.min(this._y, e.y)),
				(this._z = Math.min(this._z, e.z)),
				this
			);
		}
		equals(e) {
			return this._x === e.x && this._y === e.y && this._z === e.z;
		}
		normalize() {
			let e = this._x * this._x + this._y * this._y + this._z * this._z;
			return (
				e > 0 && (e = 1 / Math.sqrt(e)),
				(this._x *= e),
				(this._y *= e),
				(this._z *= e),
				this
			);
		}
		dot(e) {
			return this._x * e.x + this._y * e.y + this._z * e.z;
		}
		applyMat4(e) {
			const t = this._x,
				s = this._y,
				i = this._z,
				r = e.elements;
			let a = r[3] * t + r[7] * s + r[11] * i + r[15];
			return (
				(a = a || 1),
				(this._x = (r[0] * t + r[4] * s + r[8] * i + r[12]) / a),
				(this._y = (r[1] * t + r[5] * s + r[9] * i + r[13]) / a),
				(this._z = (r[2] * t + r[6] * s + r[10] * i + r[14]) / a),
				this
			);
		}
		applyQuat(e) {
			const t = this._x,
				s = this._y,
				i = this._z,
				r = e.elements[0],
				a = e.elements[1],
				n = e.elements[2],
				o = e.elements[3],
				l = o * t + a * i - n * s,
				d = o * s + n * t - r * i,
				c = o * i + r * s - a * t,
				f = -r * t - a * s - n * i;
			return (
				(this._x = l * o + f * -r + d * -n - c * -a),
				(this._y = d * o + f * -a + c * -r - l * -n),
				(this._z = c * o + f * -n + l * -a - d * -r),
				this
			);
		}
		project(e) {
			return this.applyMat4(e.viewMatrix).applyMat4(e.projectionMatrix), this;
		}
		unproject(e) {
			return (
				this.applyMat4(e.projectionMatrix.getInverse()).applyMat4(
					e.worldMatrix
				),
				this
			);
		}
	}
	const ae = new L(),
		He = new R(),
		Ge = new B();
	class q {
		constructor(
			e,
			{
				isFBOTexture: t = !1,
				fromTexture: s = !1,
				loader: i,
				sampler: r,
				floatingPoint: a = 'none',
				premultiplyAlpha: n = !1,
				anisotropy: o = 1,
				generateMipmap: l = null,
				wrapS: d,
				wrapT: c,
				minFilter: f,
				magFilter: u,
			} = {}
		) {
			if (
				((this.type = 'Texture'),
				(e = (e && e.renderer) || e),
				!e || e.type !== 'Renderer')
			)
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				e.production ||
					F(
						this.type +
							': Unable to create a ' +
							this.type +
							' because the Renderer WebGL context is not defined'
					);
				return;
			}
			if (
				((this.renderer = e),
				(this.gl = this.renderer.gl),
				(this.uuid = re()),
				(this._globalParameters = {
					unpackAlignment: 4,
					flipY: !t,
					premultiplyAlpha: !1,
					shouldPremultiplyAlpha: n,
					floatingPoint: a,
					type: this.gl.UNSIGNED_BYTE,
					internalFormat: this.gl.RGBA,
					format: this.gl.RGBA,
				}),
				(this.parameters = {
					anisotropy: o,
					generateMipmap: l,
					wrapS: d || this.gl.CLAMP_TO_EDGE,
					wrapT: c || this.gl.CLAMP_TO_EDGE,
					minFilter: f || this.gl.LINEAR,
					magFilter: u || this.gl.LINEAR,
					_shouldUpdate: !0,
				}),
				this._initState(),
				(this.sourceType = t ? 'fbo' : 'empty'),
				(this._useCache = !0),
				(this._samplerName = r),
				(this._sampler = {
					isActive: !1,
					isTextureBound: !1,
					texture: this.gl.createTexture(),
				}),
				(this._textureMatrix = { matrix: new B(), isActive: !1 }),
				(this._size = { width: 1, height: 1 }),
				(this.scale = new L(1)),
				this.scale.onChange(() => this.resize()),
				(this.offset = new L()),
				this.offset.onChange(() => this.resize()),
				(this._loader = i),
				(this._sourceLoaded = !1),
				(this._uploaded = !1),
				(this._willUpdate = !1),
				(this.shouldUpdate = !1),
				(this._forceUpdate = !1),
				(this.userData = {}),
				(this._canDraw = !1),
				s)
			) {
				(this._copyOnInit = !0), (this._copiedFrom = s);
				return;
			}
			(this._copyOnInit = !1), this._initTexture();
		}
		_initState() {
			this._state = {
				anisotropy: 1,
				generateMipmap: !1,
				wrapS: null,
				wrapT: null,
				minFilter: null,
				magFilter: this.gl.LINEAR,
			};
		}
		_initTexture() {
			this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
				this.sourceType === 'empty' &&
					((this._globalParameters.flipY = !1),
					this._updateGlobalTexParameters(),
					this.gl.texImage2D(
						this.gl.TEXTURE_2D,
						0,
						this.gl.RGBA,
						1,
						1,
						0,
						this.gl.RGBA,
						this.gl.UNSIGNED_BYTE,
						new Uint8Array([0, 0, 0, 255])
					),
					(this._canDraw = !0));
		}
		_restoreFromTexture() {
			this._copyOnInit || this._initTexture(),
				this._parent && (this._setTextureUniforms(), this._setSize()),
				this.copy(this._copiedFrom),
				(this._canDraw = !0);
		}
		_restoreContext() {
			if (
				((this._canDraw = !1),
				(this._sampler.texture = this.gl.createTexture()),
				(this._sampler.isActive = !1),
				(this._sampler.isTextureBound = !1),
				(this._textureMatrix.isActive = !1),
				this._initState(),
				(this._state.generateMipmap = !1),
				(this.parameters._shouldUpdate = !0),
				!this._copiedFrom)
			)
				this._initTexture(),
					this._parent && this._setParent(),
					this.source &&
						(this.setSource(this.source),
						this.sourceType === 'image'
							? this.renderer.cache.addTexture(this)
							: this.needUpdate()),
					(this._canDraw = !0);
			else {
				const e = this.renderer.nextRender.add(() => {
					this._copiedFrom._canDraw &&
						(this._restoreFromTexture(), (e.keep = !1));
				}, !0);
			}
		}
		addParent(e) {
			if (
				!e ||
				(e.type !== 'Plane' &&
					e.type !== 'PingPongPlane' &&
					e.type !== 'ShaderPass' &&
					e.type !== 'RenderTarget')
			) {
				this.renderer.production ||
					p(
						this.type + ': cannot add texture as a child of ',
						e,
						' because it is not a valid parent'
					);
				return;
			}
			(this._parent = e),
				(this.index = this._parent.textures.length),
				this._parent.textures.push(this),
				this._setParent();
		}
		_setParent() {
			if (
				((this._sampler.name = this._samplerName || 'uSampler' + this.index),
				(this._textureMatrix.name = this._samplerName
					? this._samplerName + 'Matrix'
					: 'uTextureMatrix' + this.index),
				this._parent._program)
			) {
				if (!this._parent._program.compiled) {
					this.renderer.production ||
						p(
							this.type +
								': Unable to create the texture because the program is not valid'
						);
					return;
				}
				if ((this._setTextureUniforms(), this._copyOnInit)) {
					const e = this.renderer.nextRender.add(() => {
						this._copiedFrom._canDraw &&
							this._copiedFrom._uploaded &&
							(this.copy(this._copiedFrom), (e.keep = !1));
					}, !0);
					return;
				}
				this.source
					? this._parent.loader &&
					  this._parent.loader._addSourceToParent(this.source, this.sourceType)
					: (this._size = {
							width: this._parent._boundingRect.document.width,
							height: this._parent._boundingRect.document.height,
					  }),
					this._setSize();
			} else this._parent.type === 'RenderTarget' && ((this._size = { width: (this._parent._size && this._parent._size.width) || this.renderer._boundingRect.width, height: (this._parent._size && this._parent._size.height) || this.renderer._boundingRect.height }), this._upload(), this._updateTexParameters(), (this._canDraw = !0));
		}
		hasParent() {
			return !!this._parent;
		}
		_setTextureUniforms() {
			const e = this._parent._program.activeUniforms;
			for (let t = 0; t < e.textures.length; t++)
				e.textures[t] === this._sampler.name &&
					((this._sampler.isActive = !0),
					this.renderer.useProgram(this._parent._program),
					(this._sampler.location = this.gl.getUniformLocation(
						this._parent._program.program,
						this._sampler.name
					)),
					e.textureMatrices.find((i) => i === this._textureMatrix.name) &&
						((this._textureMatrix.isActive = !0),
						(this._textureMatrix.location = this.gl.getUniformLocation(
							this._parent._program.program,
							this._textureMatrix.name
						))),
					this.gl.uniform1i(this._sampler.location, this.index));
		}
		copy(e) {
			if (!e || e.type !== 'Texture') {
				this.renderer.production ||
					p(this.type + ': Unable to set the texture from texture:', e);
				return;
			}
			(this._globalParameters = Object.assign({}, e._globalParameters)),
				(this._state = Object.assign({}, e._state)),
				(this.parameters.generateMipmap = e.parameters.generateMipmap),
				(this._state.generateMipmap = null),
				(this._size = e._size),
				!this._sourceLoaded &&
					e._sourceLoaded &&
					this._onSourceLoadedCallback &&
					this._onSourceLoadedCallback(),
				(this._sourceLoaded = e._sourceLoaded),
				!this._uploaded &&
					e._uploaded &&
					this._onSourceUploadedCallback &&
					this._onSourceUploadedCallback(),
				(this._uploaded = e._uploaded),
				(this.sourceType = e.sourceType),
				(this.source = e.source),
				(this._videoFrameCallbackID = e._videoFrameCallbackID),
				(this._sampler.texture = e._sampler.texture),
				(this._copiedFrom = e),
				this._parent &&
					this._parent._program &&
					(!this._canDraw || !this._textureMatrix.matrix) &&
					(this._setSize(), (this._canDraw = !0)),
				this._updateTexParameters(),
				this.renderer.needRender();
		}
		setSource(e) {
			this._sourceLoaded ||
				this.renderer.nextRender.add(
					() => this._onSourceLoadedCallback && this._onSourceLoadedCallback()
				);
			const t =
				e.tagName.toUpperCase() === 'IMG' ? 'image' : e.tagName.toLowerCase();
			if (
				((t === 'video' || t === 'canvas') && (this._useCache = !1),
				this._useCache)
			) {
				const s = this.renderer.cache.getTextureFromSource(e);
				if (s && s.uuid !== this.uuid) {
					this._uploaded ||
						(this.renderer.nextRender.add(
							() =>
								this._onSourceUploadedCallback &&
								this._onSourceUploadedCallback()
						),
						(this._uploaded = !0)),
						this.copy(s),
						this.resize();
					return;
				}
			}
			if (this.sourceType === 'empty' || this.sourceType !== t)
				if (t === 'video') (this._willUpdate = !1), (this.shouldUpdate = !0);
				else if (t === 'canvas')
					(this._willUpdate = !0), (this.shouldUpdate = !0);
				else if (t === 'image')
					(this._willUpdate = !1), (this.shouldUpdate = !1);
				else {
					this.renderer.production ||
						p(
							this.type +
								': this HTML tag could not be converted into a texture:',
							e.tagName
						);
					return;
				}
			(this.source = e),
				(this.sourceType = t),
				(this._size = {
					width:
						this.source.naturalWidth ||
						this.source.width ||
						this.source.videoWidth,
					height:
						this.source.naturalHeight ||
						this.source.height ||
						this.source.videoHeight,
				}),
				(this._sourceLoaded = !0),
				this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
				this.resize(),
				(this._globalParameters.flipY = !0),
				(this._globalParameters.premultiplyAlpha =
					this._globalParameters.shouldPremultiplyAlpha),
				this.sourceType === 'image' &&
					((this.parameters.generateMipmap =
						this.parameters.generateMipmap ||
						this.parameters.generateMipmap === null),
					(this.parameters._shouldUpdate = this.parameters.generateMipmap),
					(this._state.generateMipmap = !1),
					this._upload()),
				this.renderer.needRender();
		}
		_updateGlobalTexParameters() {
			this.renderer.state.unpackAlignment !==
				this._globalParameters.unpackAlignment &&
				(this.gl.pixelStorei(
					this.gl.UNPACK_ALIGNMENT,
					this._globalParameters.unpackAlignment
				),
				(this.renderer.state.unpackAlignment =
					this._globalParameters.unpackAlignment)),
				this.renderer.state.flipY !== this._globalParameters.flipY &&
					(this.gl.pixelStorei(
						this.gl.UNPACK_FLIP_Y_WEBGL,
						this._globalParameters.flipY
					),
					(this.renderer.state.flipY = this._globalParameters.flipY)),
				this.renderer.state.premultiplyAlpha !==
					this._globalParameters.premultiplyAlpha &&
					(this.gl.pixelStorei(
						this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
						this._globalParameters.premultiplyAlpha
					),
					(this.renderer.state.premultiplyAlpha =
						this._globalParameters.premultiplyAlpha)),
				this._globalParameters.floatingPoint === 'half-float'
					? this.renderer._isWebGL2 &&
					  this.renderer.extensions.EXT_color_buffer_float
						? ((this._globalParameters.internalFormat = this.gl.RGBA16F),
						  (this._globalParameters.type = this.gl.HALF_FLOAT))
						: this.renderer.extensions.OES_texture_half_float
						? (this._globalParameters.type =
								this.renderer.extensions.OES_texture_half_float.HALF_FLOAT_OES)
						: this.renderer.production ||
						  p(
								this.type +
									': could not use half-float textures because the extension is not available'
						  )
					: this._globalParameters.floatingPoint === 'float' &&
					  (this.renderer._isWebGL2 &&
					  this.renderer.extensions.EXT_color_buffer_float
							? ((this._globalParameters.internalFormat = this.gl.RGBA16F),
							  (this._globalParameters.type = this.gl.FLOAT))
							: this.renderer.extensions.OES_texture_float
							? (this._globalParameters.type =
									this.renderer.extensions.OES_texture_half_float.FLOAT)
							: this.renderer.production ||
							  p(
									this.type +
										': could not use float textures because the extension is not available'
							  ));
		}
		_updateTexParameters() {
			this.index &&
				this.renderer.state.activeTexture !== this.index &&
				this._bindTexture(),
				this.parameters.wrapS !== this._state.wrapS &&
					(!this.renderer._isWebGL2 &&
						(!N(this._size.width) || !N(this._size.height)) &&
						(this.parameters.wrapS = this.gl.CLAMP_TO_EDGE),
					this.parameters.wrapS !== this.gl.REPEAT &&
						this.parameters.wrapS !== this.gl.CLAMP_TO_EDGE &&
						this.parameters.wrapS !== this.gl.MIRRORED_REPEAT &&
						(this.renderer.production ||
							p(
								this.type + ': Wrong wrapS value',
								this.parameters.wrapS,
								'for this texture:',
								this,
								`
gl.CLAMP_TO_EDGE wrapping will be used instead`
							),
						(this.parameters.wrapS = this.gl.CLAMP_TO_EDGE)),
					this.gl.texParameteri(
						this.gl.TEXTURE_2D,
						this.gl.TEXTURE_WRAP_S,
						this.parameters.wrapS
					),
					(this._state.wrapS = this.parameters.wrapS)),
				this.parameters.wrapT !== this._state.wrapT &&
					(!this.renderer._isWebGL2 &&
						(!N(this._size.width) || !N(this._size.height)) &&
						(this.parameters.wrapT = this.gl.CLAMP_TO_EDGE),
					this.parameters.wrapT !== this.gl.REPEAT &&
						this.parameters.wrapT !== this.gl.CLAMP_TO_EDGE &&
						this.parameters.wrapT !== this.gl.MIRRORED_REPEAT &&
						(this.renderer.production ||
							p(
								this.type + ': Wrong wrapT value',
								this.parameters.wrapT,
								'for this texture:',
								this,
								`
gl.CLAMP_TO_EDGE wrapping will be used instead`
							),
						(this.parameters.wrapT = this.gl.CLAMP_TO_EDGE)),
					this.gl.texParameteri(
						this.gl.TEXTURE_2D,
						this.gl.TEXTURE_WRAP_T,
						this.parameters.wrapT
					),
					(this._state.wrapT = this.parameters.wrapT)),
				this.parameters.generateMipmap &&
					!this._state.generateMipmap &&
					this.source &&
					(!this.renderer._isWebGL2 &&
					(!N(this._size.width) || !N(this._size.height))
						? (this.parameters.generateMipmap = !1)
						: this.gl.generateMipmap(this.gl.TEXTURE_2D),
					(this._state.generateMipmap = this.parameters.generateMipmap)),
				this.parameters.minFilter !== this._state.minFilter &&
					(!this.renderer._isWebGL2 &&
						(!N(this._size.width) || !N(this._size.height)) &&
						(this.parameters.minFilter = this.gl.LINEAR),
					!this.parameters.generateMipmap &&
						this.parameters.generateMipmap !== null &&
						(this.parameters.minFilter = this.gl.LINEAR),
					this.parameters.minFilter !== this.gl.LINEAR &&
						this.parameters.minFilter !== this.gl.NEAREST &&
						this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_NEAREST &&
						this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_NEAREST &&
						this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_LINEAR &&
						this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_LINEAR &&
						(this.renderer.production ||
							p(
								this.type + ': Wrong minFilter value',
								this.parameters.minFilter,
								'for this texture:',
								this,
								`
gl.LINEAR filtering will be used instead`
							),
						(this.parameters.minFilter = this.gl.LINEAR)),
					this.gl.texParameteri(
						this.gl.TEXTURE_2D,
						this.gl.TEXTURE_MIN_FILTER,
						this.parameters.minFilter
					),
					(this._state.minFilter = this.parameters.minFilter)),
				this.parameters.magFilter !== this._state.magFilter &&
					(!this.renderer._isWebGL2 &&
						(!N(this._size.width) || !N(this._size.height)) &&
						(this.parameters.magFilter = this.gl.LINEAR),
					this.parameters.magFilter !== this.gl.LINEAR &&
						this.parameters.magFilter !== this.gl.NEAREST &&
						(this.renderer.production ||
							p(
								this.type + ': Wrong magFilter value',
								this.parameters.magFilter,
								'for this texture:',
								this,
								`
gl.LINEAR filtering will be used instead`
							),
						(this.parameters.magFilter = this.gl.LINEAR)),
					this.gl.texParameteri(
						this.gl.TEXTURE_2D,
						this.gl.TEXTURE_MAG_FILTER,
						this.parameters.magFilter
					),
					(this._state.magFilter = this.parameters.magFilter));
			const e = this.renderer.extensions.EXT_texture_filter_anisotropic;
			if (e && this.parameters.anisotropy !== this._state.anisotropy) {
				const t = this.gl.getParameter(e.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
				(this.parameters.anisotropy = Math.max(
					1,
					Math.min(this.parameters.anisotropy, t)
				)),
					this.gl.texParameterf(
						this.gl.TEXTURE_2D,
						e.TEXTURE_MAX_ANISOTROPY_EXT,
						this.parameters.anisotropy
					),
					(this._state.anisotropy = this.parameters.anisotropy);
			}
		}
		setWrapS(e) {
			this.parameters.wrapS !== e &&
				((this.parameters.wrapS = e), (this.parameters._shouldUpdate = !0));
		}
		setWrapT(e) {
			this.parameters.wrapT !== e &&
				((this.parameters.wrapT = e), (this.parameters._shouldUpdate = !0));
		}
		setMinFilter(e) {
			this.parameters.minFilter !== e &&
				((this.parameters.minFilter = e), (this.parameters._shouldUpdate = !0));
		}
		setMagFilter(e) {
			this.parameters.magFilter !== e &&
				((this.parameters.magFilter = e), (this.parameters._shouldUpdate = !0));
		}
		setAnisotropy(e) {
			(e = isNaN(e) ? this.parameters.anisotropy : e),
				this.parameters.anisotropy !== e &&
					((this.parameters.anisotropy = e),
					(this.parameters._shouldUpdate = !0));
		}
		needUpdate() {
			this._forceUpdate = !0;
		}
		_videoFrameCallback() {
			if (((this._willUpdate = !0), this.source))
				this.source.requestVideoFrameCallback(() => this._videoFrameCallback());
			else {
				const e = this.renderer.nextRender.add(() => {
					this.source &&
						((e.keep = !1),
						this.source.requestVideoFrameCallback(() =>
							this._videoFrameCallback()
						));
				}, !0);
			}
		}
		_upload() {
			this._updateGlobalTexParameters(),
				this.source
					? this.gl.texImage2D(
							this.gl.TEXTURE_2D,
							0,
							this._globalParameters.internalFormat,
							this._globalParameters.format,
							this._globalParameters.type,
							this.source
					  )
					: this.sourceType === 'fbo' &&
					  this.gl.texImage2D(
							this.gl.TEXTURE_2D,
							0,
							this._globalParameters.internalFormat,
							this._size.width,
							this._size.height,
							0,
							this._globalParameters.format,
							this._globalParameters.type,
							this.source || null
					  ),
				this._uploaded ||
					(this.renderer.nextRender.add(
						() =>
							this._onSourceUploadedCallback && this._onSourceUploadedCallback()
					),
					(this._uploaded = !0));
		}
		_getSizes() {
			if (this.sourceType === 'fbo')
				return {
					parentWidth: this._parent._boundingRect.document.width,
					parentHeight: this._parent._boundingRect.document.height,
					sourceWidth: this._parent._boundingRect.document.width,
					sourceHeight: this._parent._boundingRect.document.height,
					xOffset: 0,
					yOffset: 0,
				};
			const e = this._parent.scale
					? ae.set(this._parent.scale.x, this._parent.scale.y)
					: ae.set(1, 1),
				t = this._parent._boundingRect.document.width * e.x,
				s = this._parent._boundingRect.document.height * e.y,
				i = this._size.width,
				r = this._size.height,
				a = i / r,
				n = t / s;
			let o = 0,
				l = 0;
			return (
				n > a
					? (l = Math.min(0, s - t * (1 / a)))
					: n < a && (o = Math.min(0, t - s * a)),
				{
					parentWidth: t,
					parentHeight: s,
					sourceWidth: i,
					sourceHeight: r,
					xOffset: o,
					yOffset: l,
				}
			);
		}
		setScale(e) {
			if (!e.type || e.type !== 'Vec2') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set scale because the parameter passed is not of Vec2 type:',
						e
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.scale).max(ae.set(0.001, 0.001)),
				e.equals(this.scale) || (this.scale.copy(e), this.resize());
		}
		setOffset(e) {
			if (!e.type || e.type !== 'Vec2') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set offset because the parameter passed is not of Vec2 type:',
						scale
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.offset),
				e.equals(this.offset) || (this.offset.copy(e), this.resize());
		}
		_setSize() {
			if (this._parent && this._parent._program) {
				const e = this._getSizes();
				this._updateTextureMatrix(e);
			}
		}
		resize() {
			this.sourceType === 'fbo'
				? ((this._size = {
						width:
							(this._parent._size && this._parent._size.width) ||
							this._parent._boundingRect.document.width,
						height:
							(this._parent._size && this._parent._size.height) ||
							this._parent._boundingRect.document.height,
				  }),
				  this._copiedFrom ||
						(this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
						this.gl.texImage2D(
							this.gl.TEXTURE_2D,
							0,
							this._globalParameters.internalFormat,
							this._size.width,
							this._size.height,
							0,
							this._globalParameters.format,
							this._globalParameters.type,
							null
						)))
				: this.source &&
				  (this._size = {
						width:
							this.source.naturalWidth ||
							this.source.width ||
							this.source.videoWidth,
						height:
							this.source.naturalHeight ||
							this.source.height ||
							this.source.videoHeight,
				  }),
				this._setSize();
		}
		_updateTextureMatrix(e) {
			const t = He.set(
				e.parentWidth / (e.parentWidth - e.xOffset),
				e.parentHeight / (e.parentHeight - e.yOffset),
				1
			);
			(t.x /= this.scale.x),
				(t.y /= this.scale.y),
				(this._textureMatrix.matrix = Ge.setFromArray([
					t.x,
					0,
					0,
					0,
					0,
					t.y,
					0,
					0,
					0,
					0,
					1,
					0,
					(1 - t.x) / 2 + this.offset.x,
					(1 - t.y) / 2 + this.offset.y,
					0,
					1,
				])),
				this._updateMatrixUniform();
		}
		_updateMatrixUniform() {
			this._textureMatrix.isActive &&
				(this.renderer.useProgram(this._parent._program),
				this.gl.uniformMatrix4fv(
					this._textureMatrix.location,
					!1,
					this._textureMatrix.matrix.elements
				));
		}
		_onSourceLoaded(e) {
			this.setSource(e),
				this.sourceType === 'image' && this.renderer.cache.addTexture(this);
		}
		_bindTexture() {
			this._canDraw &&
				(this.renderer.state.activeTexture !== this.index &&
					(this.gl.activeTexture(this.gl.TEXTURE0 + this.index),
					(this.renderer.state.activeTexture = this.index)),
				this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture),
				this._sampler.isTextureBound ||
					((this._sampler.isTextureBound = !!this.gl.getParameter(
						this.gl.TEXTURE_BINDING_2D
					)),
					this._sampler.isTextureBound && this.renderer.needRender()));
		}
		_draw() {
			this._sampler.isActive &&
				(this._bindTexture(),
				this.sourceType === 'video' &&
					this.source &&
					!this._videoFrameCallbackID &&
					this.source.readyState >= this.source.HAVE_CURRENT_DATA &&
					!this.source.paused &&
					(this._willUpdate = !0),
				(this._forceUpdate || (this._willUpdate && this.shouldUpdate)) &&
					((this._state.generateMipmap = !1), this._upload()),
				this.sourceType === 'video' && (this._willUpdate = !1),
				(this._forceUpdate = !1)),
				this.parameters._shouldUpdate &&
					(this._updateTexParameters(), (this.parameters._shouldUpdate = !1));
		}
		onSourceLoaded(e) {
			return e && (this._onSourceLoadedCallback = e), this;
		}
		onSourceUploaded(e) {
			return e && (this._onSourceUploadedCallback = e), this;
		}
		_dispose(e = !1) {
			var s;
			this.sourceType === 'video' ||
			(this.sourceType === 'image' && !this.renderer.state.isActive)
				? (this._loader && this._loader._removeSource(this),
				  (this.source = null))
				: this.sourceType === 'canvas' &&
				  this.source &&
				  ((this.source.width = (s = this.source) == null ? void 0 : s.width),
				  (this.source = null)),
				(this._parent = null),
				this.gl &&
					!this._copiedFrom &&
					(e || this.sourceType !== 'image' || !this.renderer.state.isActive) &&
					((this._canDraw = !1),
					this.renderer.cache.removeTexture(this),
					this.gl.activeTexture(this.gl.TEXTURE0 + this.index),
					this.gl.bindTexture(this.gl.TEXTURE_2D, null),
					this.gl.deleteTexture(this._sampler.texture));
		}
	}
	class pe {
		constructor(e, t = 'anonymous') {
			if (
				((this.type = 'TextureLoader'),
				(e = (e && e.renderer) || e),
				!e || e.type !== 'Renderer')
			)
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				F(this.type + ': Renderer WebGL context is undefined', e);
				return;
			}
			(this.renderer = e),
				(this.gl = this.renderer.gl),
				(this.crossOrigin = t),
				(this.elements = []);
		}
		_addElement(e, t, s, i) {
			const r = {
				source: e,
				texture: t,
				load: this._sourceLoaded.bind(this, e, t, s),
				error: this._sourceLoadError.bind(this, e, i),
			};
			return this.elements.push(r), r;
		}
		_sourceLoadError(e, t, s) {
			t && t(e, s);
		}
		_sourceLoaded(e, t, s) {
			t._sourceLoaded ||
				(t._onSourceLoaded(e),
				this._parent &&
					(this._increment && this._increment(),
					this.renderer.nextRender.add(
						() =>
							this._parent._onLoadingCallback &&
							this._parent._onLoadingCallback(t)
					)),
				s && s(t));
		}
		_getSourceType(e) {
			let t;
			return (
				typeof e == 'string'
					? e.match(
							/\.(jpeg|jpg|jfif|pjpeg|pjp|gif|bmp|png|webp|svg|avif|apng)$/
					  ) !== null
						? (t = 'image')
						: e.match(/\.(webm|mp4|mpg|mpeg|avi|ogg|ogm|ogv|mov|av1)$/) !==
								null && (t = 'video')
					: e.tagName.toUpperCase() === 'IMG'
					? (t = 'image')
					: e.tagName.toUpperCase() === 'VIDEO'
					? (t = 'video')
					: e.tagName.toUpperCase() === 'CANVAS' && (t = 'canvas'),
				t
			);
		}
		_createImage(e) {
			if (typeof e == 'string' || !e.hasAttribute('crossOrigin')) {
				const t = new Image();
				return (
					(t.crossOrigin = this.crossOrigin),
					typeof e == 'string'
						? (t.src = e)
						: ((t.src = e.src),
						  e.hasAttribute('data-sampler') &&
								t.setAttribute('data-sampler', e.getAttribute('data-sampler'))),
					t
				);
			} else return e;
		}
		_createVideo(e) {
			if (typeof e == 'string' || e.getAttribute('crossOrigin') === null) {
				const t = document.createElement('video');
				return (
					(t.crossOrigin = this.crossOrigin),
					typeof e == 'string'
						? (t.src = e)
						: ((t.src = e.src),
						  e.hasAttribute('data-sampler') &&
								t.setAttribute('data-sampler', e.getAttribute('data-sampler'))),
					t
				);
			} else return e;
		}
		loadSource(e, t, s, i) {
			switch (this._getSourceType(e)) {
				case 'image':
					this.loadImage(e, t, s, i);
					break;
				case 'video':
					this.loadVideo(e, t, s, i);
					break;
				case 'canvas':
					this.loadCanvas(e, t, s);
					break;
				default:
					this._sourceLoadError(
						e,
						i,
						'this source could not be converted into a texture: ' + e
					);
					break;
			}
		}
		loadSources(e, t, s, i) {
			for (let r = 0; r < e.length; r++) this.loadSource(e[r], t, s, i);
		}
		loadImage(e, t = {}, s, i) {
			const r = this.renderer.cache.getTextureFromSource(e);
			let a = Object.assign({}, t);
			if (
				(this._parent && (a = Object.assign(a, this._parent._texturesOptions)),
				(a.loader = this),
				r)
			) {
				(a.sampler =
					typeof e != 'string' && e.hasAttribute('data-sampler')
						? e.getAttribute('data-sampler')
						: a.sampler),
					(a.fromTexture = r);
				const d = new q(this.renderer, a);
				this._sourceLoaded(r.source, d, s),
					this._parent && this._addToParent(d, r.source, 'image');
				return;
			}
			const n = this._createImage(e);
			a.sampler = n.hasAttribute('data-sampler')
				? n.getAttribute('data-sampler')
				: a.sampler;
			const o = new q(this.renderer, a),
				l = this._addElement(n, o, s, i);
			n.complete
				? this._sourceLoaded(n, o, s)
				: n.decode
				? n
						.decode()
						.then(this._sourceLoaded.bind(this, n, o, s))
						.catch(() => {
							n.addEventListener('load', l.load, !1),
								n.addEventListener('error', l.error, !1);
						})
				: (n.addEventListener('load', l.load, !1),
				  n.addEventListener('error', l.error, !1)),
				this._parent && this._addToParent(o, n, 'image');
		}
		loadImages(e, t, s, i) {
			for (let r = 0; r < e.length; r++) this.loadImage(e[r], t, s, i);
		}
		loadVideo(e, t = {}, s, i) {
			const r = this._createVideo(e);
			(r.preload = !0),
				(r.muted = !0),
				(r.loop = !0),
				r.setAttribute('playsinline', ''),
				(r.crossOrigin = this.crossOrigin);
			let a = Object.assign({}, t);
			this._parent && (a = Object.assign(t, this._parent._texturesOptions)),
				(a.loader = this),
				(a.sampler = r.hasAttribute('data-sampler')
					? r.getAttribute('data-sampler')
					: a.sampler);
			const n = new q(this.renderer, a),
				o = this._addElement(r, n, s, i);
			r.addEventListener('canplaythrough', o.load, !1),
				r.addEventListener('error', o.error, !1),
				r.readyState >= r.HAVE_FUTURE_DATA && s && this._sourceLoaded(r, n, s),
				r.load(),
				this._addToParent && this._addToParent(n, r, 'video'),
				'requestVideoFrameCallback' in HTMLVideoElement.prototype &&
					((o.videoFrameCallback = n._videoFrameCallback.bind(n)),
					(n._videoFrameCallbackID = r.requestVideoFrameCallback(
						o.videoFrameCallback
					)));
		}
		loadVideos(e, t, s, i) {
			for (let r = 0; r < e.length; r++) this.loadVideo(e[r], t, s, i);
		}
		loadCanvas(e, t = {}, s) {
			let i = Object.assign({}, t);
			this._parent && (i = Object.assign(t, this._parent._texturesOptions)),
				(i.loader = this),
				(i.sampler = e.hasAttribute('data-sampler')
					? e.getAttribute('data-sampler')
					: i.sampler);
			const r = new q(this.renderer, i);
			this._addElement(e, r, s, null),
				this._sourceLoaded(e, r, s),
				this._parent && this._addToParent(r, e, 'canvas');
		}
		loadCanvases(e, t, s) {
			for (let i = 0; i < e.length; i++) this.loadCanvas(e[i], t, s);
		}
		_removeSource(e) {
			const t = this.elements.find((s) => s.texture.uuid === e.uuid);
			t &&
				(e.sourceType === 'image'
					? t.source.removeEventListener('load', t.load, !1)
					: e.sourceType === 'video' &&
					  (t.videoFrameCallback &&
							e._videoFrameCallbackID &&
							t.source.cancelVideoFrameCallback(e._videoFrameCallbackID),
					  t.source.removeEventListener('canplaythrough', t.load, !1),
					  t.source.pause(),
					  t.source.removeAttribute('src'),
					  t.source.load()),
				t.source.removeEventListener('error', t.error, !1));
		}
	}
	class je extends pe {
		constructor(
			e,
			t,
			{
				sourcesLoaded: s = 0,
				sourcesToLoad: i = 0,
				complete: r = !1,
				onComplete: a = () => {},
			} = {}
		) {
			super(e, t.crossOrigin),
				(this.type = 'PlaneTextureLoader'),
				(this._parent = t),
				this._parent.type !== 'Plane' &&
					this._parent.type !== 'PingPongPlane' &&
					this._parent.type !== 'ShaderPass' &&
					(p(this.type + ': Wrong parent type assigned to this loader'),
					(this._parent = null)),
				(this.sourcesLoaded = s),
				(this.sourcesToLoad = i),
				(this.complete = r),
				(this.onComplete = a);
		}
		_setLoaderSize(e) {
			(this.sourcesToLoad = e),
				this.sourcesToLoad === 0 &&
					((this.complete = !0),
					this.renderer.nextRender.add(
						() => this.onComplete && this.onComplete()
					));
		}
		_increment() {
			this.sourcesLoaded++,
				this.sourcesLoaded >= this.sourcesToLoad &&
					!this.complete &&
					((this.complete = !0),
					this.renderer.nextRender.add(
						() => this.onComplete && this.onComplete()
					));
		}
		_addSourceToParent(e, t) {
			if (t === 'image') {
				const s = this._parent.images;
				!s.find((r) => r.src === e.src) && s.push(e);
			} else if (t === 'video') {
				const s = this._parent.videos;
				!s.find((r) => r.src === e.src) && s.push(e);
			} else if (t === 'canvas') {
				const s = this._parent.canvases;
				!s.find((r) => r.isSameNode(e)) && s.push(e);
			}
		}
		_addToParent(e, t, s) {
			this._addSourceToParent(t, s), this._parent && e.addParent(this._parent);
		}
	}
	class Xe {
		constructor(
			e,
			t = 'Mesh',
			{
				vertexShaderID: s,
				fragmentShaderID: i,
				vertexShader: r,
				fragmentShader: a,
				uniforms: n = {},
				widthSegments: o = 1,
				heightSegments: l = 1,
				renderOrder: d = 0,
				depthTest: c = !0,
				cullFace: f = 'back',
				texturesOptions: u = {},
				crossOrigin: g = 'anonymous',
			} = {}
		) {
			if (
				((this.type = t),
				(e = (e && e.renderer) || e),
				(!e || e.type !== 'Renderer') &&
					(F(
						this.type +
							': Curtains not passed as first argument or Curtains Renderer is missing',
						e
					),
					setTimeout(() => {
						this._onErrorCallback && this._onErrorCallback();
					}, 0)),
				(this.renderer = e),
				(this.gl = this.renderer.gl),
				!this.gl)
			) {
				this.renderer.production ||
					F(
						this.type +
							': Unable to create a ' +
							this.type +
							' because the Renderer WebGL context is not defined'
					),
					setTimeout(() => {
						this._onErrorCallback && this._onErrorCallback();
					}, 0);
				return;
			}
			(this._canDraw = !1),
				(this.renderOrder = d),
				(this._depthTest = c),
				(this.cullFace = f),
				this.cullFace !== 'back' &&
					this.cullFace !== 'front' &&
					this.cullFace !== 'none' &&
					(this.cullFace = 'back'),
				(this.textures = []),
				(this._texturesOptions = Object.assign(
					{
						premultiplyAlpha: !1,
						anisotropy: 1,
						floatingPoint: 'none',
						wrapS: this.gl.CLAMP_TO_EDGE,
						wrapT: this.gl.CLAMP_TO_EDGE,
						minFilter: this.gl.LINEAR,
						magFilter: this.gl.LINEAR,
					},
					u
				)),
				(this.crossOrigin = g),
				!r &&
					s &&
					document.getElementById(s) &&
					(r = document.getElementById(s).innerHTML),
				!a &&
					i &&
					document.getElementById(i) &&
					(a = document.getElementById(i).innerHTML),
				this._initMesh(),
				(o = parseInt(o)),
				(l = parseInt(l)),
				(this._geometry = new We(this.renderer, { width: o, height: l })),
				(this._program = new fe(this.renderer, {
					parent: this,
					vertexShader: r,
					fragmentShader: a,
				})),
				this._program.compiled
					? (this._program.createUniforms(n),
					  (this.uniforms = this._program.uniformsManager.uniforms),
					  this._geometry.setProgram(this._program),
					  this.renderer.onSceneChange())
					: this.renderer.nextRender.add(
							() => this._onErrorCallback && this._onErrorCallback()
					  );
		}
		_initMesh() {
			(this.uuid = re()),
				(this.loader = new je(this.renderer, this, {
					sourcesLoaded: 0,
					initSourcesToLoad: 0,
					complete: !1,
					onComplete: () => {
						this._onReadyCallback && this._onReadyCallback(),
							this.renderer.needRender();
					},
				})),
				(this.images = []),
				(this.videos = []),
				(this.canvases = []),
				(this.userData = {}),
				(this._canDraw = !0);
		}
		_restoreContext() {
			(this._canDraw = !1),
				this._matrices && (this._matrices = null),
				(this._program = new fe(this.renderer, {
					parent: this,
					vertexShader: this._program.vsCode,
					fragmentShader: this._program.fsCode,
				})),
				this._program.compiled &&
					(this._geometry.restoreContext(this._program),
					this._program.createUniforms(this.uniforms),
					(this.uniforms = this._program.uniformsManager.uniforms),
					this._programRestored());
		}
		setRenderTarget(e) {
			if (!e || e.type !== 'RenderTarget') {
				this.renderer.production ||
					p(
						this.type +
							': Could not set the render target because the argument passed is not a RenderTarget class object',
						e
					);
				return;
			}
			this.type === 'Plane' && this.renderer.scene.removePlane(this),
				(this.target = e),
				this.type === 'Plane' && this.renderer.scene.addPlane(this);
		}
		setRenderOrder(e = 0) {
			(e = isNaN(e) ? this.renderOrder : parseInt(e)),
				e !== this.renderOrder &&
					((this.renderOrder = e),
					this.renderer.scene.setPlaneRenderOrder(this));
		}
		createTexture(e = {}) {
			const t = new q(this.renderer, Object.assign(e, this._texturesOptions));
			return t.addParent(this), t;
		}
		addTexture(e) {
			if (!e || e.type !== 'Texture') {
				this.renderer.production ||
					p(
						this.type + ': cannot add ',
						e,
						' to this ' + this.type + ' because it is not a valid texture'
					);
				return;
			}
			e.addParent(this);
		}
		loadSources(e, t = {}, s, i) {
			for (let r = 0; r < e.length; r++) this.loadSource(e[r], t, s, i);
		}
		loadSource(e, t = {}, s, i) {
			this.loader.loadSource(
				e,
				Object.assign(t, this._texturesOptions),
				(r) => {
					s && s(r);
				},
				(r, a) => {
					this.renderer.production ||
						p(
							this.type +
								': this HTML tag could not be converted into a texture:',
							r.tagName
						),
						i && i(r, a);
				}
			);
		}
		loadImage(e, t = {}, s, i) {
			this.loader.loadImage(
				e,
				Object.assign(t, this._texturesOptions),
				(r) => {
					s && s(r);
				},
				(r, a) => {
					this.renderer.production ||
						p(
							this.type +
								`: There has been an error:
`,
							a,
							`
while loading this image:
`,
							r
						),
						i && i(r, a);
				}
			);
		}
		loadVideo(e, t = {}, s, i) {
			this.loader.loadVideo(
				e,
				Object.assign(t, this._texturesOptions),
				(r) => {
					s && s(r);
				},
				(r, a) => {
					this.renderer.production ||
						p(
							this.type +
								`: There has been an error:
`,
							a,
							`
while loading this video:
`,
							r
						),
						i && i(r, a);
				}
			);
		}
		loadCanvas(e, t = {}, s) {
			this.loader.loadCanvas(
				e,
				Object.assign(t, this._texturesOptions),
				(i) => {
					s && s(i);
				}
			);
		}
		loadImages(e, t = {}, s, i) {
			for (let r = 0; r < e.length; r++) this.loadImage(e[r], t, s, i);
		}
		loadVideos(e, t = {}, s, i) {
			for (let r = 0; r < e.length; r++) this.loadVideo(e[r], t, s, i);
		}
		loadCanvases(e, t = {}, s) {
			for (let i = 0; i < e.length; i++) this.loadCanvas(e[i], t, s);
		}
		playVideos() {
			for (let e = 0; e < this.textures.length; e++) {
				const t = this.textures[e];
				if (t.sourceType === 'video') {
					const s = t.source.play();
					s !== void 0 &&
						s.catch((i) => {
							this.renderer.production ||
								p(this.type + ': Could not play the video : ', i);
						});
				}
			}
		}
		_draw() {
			this.renderer.setDepthTest(this._depthTest),
				this.renderer.setFaceCulling(this.cullFace),
				this._program.updateUniforms(),
				this._geometry.bindBuffers(),
				(this.renderer.state.forceBufferUpdate = !1);
			for (let e = 0; e < this.textures.length; e++)
				if (
					(this.textures[e]._draw(),
					this.textures[e]._sampler.isActive &&
						!this.textures[e]._sampler.isTextureBound)
				)
					return;
			this._geometry.draw(),
				(this.renderer.state.activeTexture = null),
				this._onAfterRenderCallback && this._onAfterRenderCallback();
		}
		onError(e) {
			return e && (this._onErrorCallback = e), this;
		}
		onLoading(e) {
			return e && (this._onLoadingCallback = e), this;
		}
		onReady(e) {
			return e && (this._onReadyCallback = e), this;
		}
		onRender(e) {
			return e && (this._onRenderCallback = e), this;
		}
		onAfterRender(e) {
			return e && (this._onAfterRenderCallback = e), this;
		}
		remove() {
			(this._canDraw = !1),
				this.target && this.renderer.bindFrameBuffer(null),
				this._dispose(),
				this.type === 'Plane'
					? this.renderer.removePlane(this)
					: this.type === 'ShaderPass' &&
					  (this.target &&
							((this.target._shaderPass = null),
							this.target.remove(),
							(this.target = null)),
					  this.renderer.removeShaderPass(this));
		}
		_dispose() {
			if (this.gl) {
				this._geometry && this._geometry.dispose(),
					this.target &&
						this.type === 'ShaderPass' &&
						(this.renderer.removeRenderTarget(this.target),
						this.textures.shift());
				for (let e = 0; e < this.textures.length; e++)
					this.textures[e]._dispose();
				this.textures = [];
			}
		}
	}
	const ge = new L(),
		Ye = new L();
	class qe extends Xe {
		constructor(
			e,
			t,
			s = 'DOMMesh',
			{
				widthSegments: i,
				heightSegments: r,
				renderOrder: a,
				depthTest: n,
				cullFace: o,
				uniforms: l,
				vertexShaderID: d,
				fragmentShaderID: c,
				vertexShader: f,
				fragmentShader: u,
				texturesOptions: g,
				crossOrigin: m,
			} = {}
		) {
			(d = d || (t && t.getAttribute('data-vs-id'))),
				(c = c || (t && t.getAttribute('data-fs-id'))),
				super(e, s, {
					widthSegments: i,
					heightSegments: r,
					renderOrder: a,
					depthTest: n,
					cullFace: o,
					uniforms: l,
					vertexShaderID: d,
					fragmentShaderID: c,
					vertexShader: f,
					fragmentShader: u,
					texturesOptions: g,
					crossOrigin: m,
				}),
				this.gl &&
					((this.htmlElement = t),
					(!this.htmlElement || this.htmlElement.length === 0) &&
						(this.renderer.production ||
							p(
								this.type +
									': The HTML element you specified does not currently exists in the DOM'
							)),
					this._setDocumentSizes());
		}
		_setDocumentSizes() {
			let e = this.htmlElement.getBoundingClientRect();
			this._boundingRect || (this._boundingRect = {}),
				(this._boundingRect.document = {
					width: e.width * this.renderer.pixelRatio,
					height: e.height * this.renderer.pixelRatio,
					top: e.top * this.renderer.pixelRatio,
					left: e.left * this.renderer.pixelRatio,
				});
		}
		getBoundingRect() {
			return {
				width: this._boundingRect.document.width,
				height: this._boundingRect.document.height,
				top: this._boundingRect.document.top,
				left: this._boundingRect.document.left,
				right:
					this._boundingRect.document.left + this._boundingRect.document.width,
				bottom:
					this._boundingRect.document.top + this._boundingRect.document.height,
			};
		}
		resize() {
			this._setDocumentSizes(),
				this.type === 'Plane' &&
					(this.setPerspective(
						this.camera.fov,
						this.camera.near,
						this.camera.far
					),
					this._setWorldSizes(),
					this._applyWorldPositions());
			for (let e = 0; e < this.textures.length; e++) this.textures[e].resize();
			this.renderer.nextRender.add(
				() => this._onAfterResizeCallback && this._onAfterResizeCallback()
			);
		}
		mouseToPlaneCoords(e) {
			const t = this.scale ? this.scale : Ye.set(1, 1),
				s = ge.set(
					(this._boundingRect.document.width -
						this._boundingRect.document.width * t.x) /
						2,
					(this._boundingRect.document.height -
						this._boundingRect.document.height * t.y) /
						2
				),
				i = {
					width:
						(this._boundingRect.document.width * t.x) /
						this.renderer.pixelRatio,
					height:
						(this._boundingRect.document.height * t.y) /
						this.renderer.pixelRatio,
					top:
						(this._boundingRect.document.top + s.y) / this.renderer.pixelRatio,
					left:
						(this._boundingRect.document.left + s.x) / this.renderer.pixelRatio,
				};
			return ge.set(
				((e.x - i.left) / i.width) * 2 - 1,
				1 - ((e.y - i.top) / i.height) * 2
			);
		}
		onAfterResize(e) {
			return e && (this._onAfterResizeCallback = e), this;
		}
	}
	class $e {
		constructor({
			fov: e = 50,
			near: t = 0.1,
			far: s = 150,
			width: i,
			height: r,
			pixelRatio: a = 1,
		} = {}) {
			(this.position = new R()),
				(this.projectionMatrix = new B()),
				(this.worldMatrix = new B()),
				(this.viewMatrix = new B()),
				(this._shouldUpdate = !1),
				this.setSize(),
				this.setPerspective(e, t, s, i, r, a);
		}
		setFov(e) {
			(e = isNaN(e) ? this.fov : parseFloat(e)),
				(e = Math.max(1, Math.min(e, 179))),
				e !== this.fov &&
					((this.fov = e), this.setPosition(), (this._shouldUpdate = !0)),
				this.setCSSPerspective();
		}
		setNear(e) {
			(e = isNaN(e) ? this.near : parseFloat(e)),
				(e = Math.max(e, 0.01)),
				e !== this.near && ((this.near = e), (this._shouldUpdate = !0));
		}
		setFar(e) {
			(e = isNaN(e) ? this.far : parseFloat(e)),
				(e = Math.max(e, 50)),
				e !== this.far && ((this.far = e), (this._shouldUpdate = !0));
		}
		setPixelRatio(e) {
			e !== this.pixelRatio && (this._shouldUpdate = !0), (this.pixelRatio = e);
		}
		setSize(e, t) {
			(e !== this.width || t !== this.height) && (this._shouldUpdate = !0),
				(this.width = e),
				(this.height = t);
		}
		setPerspective(e, t, s, i, r, a) {
			this.setPixelRatio(a),
				this.setSize(i, r),
				this.setFov(e),
				this.setNear(t),
				this.setFar(s),
				this._shouldUpdate && this.updateProjectionMatrix();
		}
		setPosition() {
			this.position.set(0, 0, 1),
				this.worldMatrix.setFromArray([
					1,
					0,
					0,
					0,
					0,
					1,
					0,
					0,
					0,
					0,
					1,
					0,
					this.position.x,
					this.position.y,
					this.position.z,
					1,
				]),
				(this.viewMatrix = this.viewMatrix.copy(this.worldMatrix).getInverse());
		}
		setCSSPerspective() {
			this.CSSPerspective =
				Math.pow(
					Math.pow(this.width / (2 * this.pixelRatio), 2) +
						Math.pow(this.height / (2 * this.pixelRatio), 2),
					0.5
				) / Math.tan((this.fov * 0.5 * Math.PI) / 180);
		}
		getScreenRatiosFromFov(e = 0) {
			const t = this.position.z;
			e < t ? (e -= t) : (e += t);
			const s = (this.fov * Math.PI) / 180,
				i = 2 * Math.tan(s / 2) * Math.abs(e);
			return { width: (i * this.width) / this.height, height: i };
		}
		updateProjectionMatrix() {
			const e = this.width / this.height,
				t = this.near * Math.tan((Math.PI / 180) * 0.5 * this.fov),
				s = 2 * t,
				i = e * s,
				r = -0.5 * i,
				a = r + i,
				n = t - s,
				o = (2 * this.near) / (a - r),
				l = (2 * this.near) / (t - n),
				d = (a + r) / (a - r),
				c = (t + n) / (t - n),
				f = -(this.far + this.near) / (this.far - this.near),
				u = (-2 * this.far * this.near) / (this.far - this.near);
			this.projectionMatrix.setFromArray([
				o,
				0,
				0,
				0,
				0,
				l,
				0,
				0,
				d,
				c,
				f,
				-1,
				0,
				0,
				u,
				0,
			]);
		}
		forceUpdate() {
			this._shouldUpdate = !0;
		}
		cancelUpdate() {
			this._shouldUpdate = !1;
		}
	}
	class te {
		constructor(e = new Float32Array([0, 0, 0, 1]), t = 'XYZ') {
			(this.type = 'Quat'), (this.elements = e), (this.axisOrder = t);
		}
		setFromArray(e) {
			return (
				(this.elements[0] = e[0]),
				(this.elements[1] = e[1]),
				(this.elements[2] = e[2]),
				(this.elements[3] = e[3]),
				this
			);
		}
		setAxisOrder(e) {
			switch (((e = e.toUpperCase()), e)) {
				case 'XYZ':
				case 'YXZ':
				case 'ZXY':
				case 'ZYX':
				case 'YZX':
				case 'XZY':
					this.axisOrder = e;
					break;
				default:
					this.axisOrder = 'XYZ';
			}
			return this;
		}
		copy(e) {
			return (this.elements = e.elements), (this.axisOrder = e.axisOrder), this;
		}
		clone() {
			return new te().copy(this);
		}
		equals(e) {
			return (
				this.elements[0] === e.elements[0] &&
				this.elements[1] === e.elements[1] &&
				this.elements[2] === e.elements[2] &&
				this.elements[3] === e.elements[3] &&
				this.axisOrder === e.axisOrder
			);
		}
		setFromVec3(e) {
			const t = e.x * 0.5,
				s = e.y * 0.5,
				i = e.z * 0.5,
				r = Math.cos(t),
				a = Math.cos(s),
				n = Math.cos(i),
				o = Math.sin(t),
				l = Math.sin(s),
				d = Math.sin(i);
			return (
				this.axisOrder === 'XYZ'
					? ((this.elements[0] = o * a * n + r * l * d),
					  (this.elements[1] = r * l * n - o * a * d),
					  (this.elements[2] = r * a * d + o * l * n),
					  (this.elements[3] = r * a * n - o * l * d))
					: this.axisOrder === 'YXZ'
					? ((this.elements[0] = o * a * n + r * l * d),
					  (this.elements[1] = r * l * n - o * a * d),
					  (this.elements[2] = r * a * d - o * l * n),
					  (this.elements[3] = r * a * n + o * l * d))
					: this.axisOrder === 'ZXY'
					? ((this.elements[0] = o * a * n - r * l * d),
					  (this.elements[1] = r * l * n + o * a * d),
					  (this.elements[2] = r * a * d + o * l * n),
					  (this.elements[3] = r * a * n - o * l * d))
					: this.axisOrder === 'ZYX'
					? ((this.elements[0] = o * a * n - r * l * d),
					  (this.elements[1] = r * l * n + o * a * d),
					  (this.elements[2] = r * a * d - o * l * n),
					  (this.elements[3] = r * a * n + o * l * d))
					: this.axisOrder === 'YZX'
					? ((this.elements[0] = o * a * n + r * l * d),
					  (this.elements[1] = r * l * n + o * a * d),
					  (this.elements[2] = r * a * d - o * l * n),
					  (this.elements[3] = r * a * n - o * l * d))
					: this.axisOrder === 'XZY' &&
					  ((this.elements[0] = o * a * n - r * l * d),
					  (this.elements[1] = r * l * n - o * a * d),
					  (this.elements[2] = r * a * d + o * l * n),
					  (this.elements[3] = r * a * n + o * l * d)),
				this
			);
		}
	}
	const Qe = new L(),
		Ze = new R(),
		Ke = new R(),
		Je = new R(),
		et = new R(),
		tt = new R(),
		st = new R(),
		U = new R(),
		V = new R(),
		me = new te(),
		it = new R(0.5, 0.5, 0),
		rt = new R(),
		at = new R(),
		nt = new R(),
		ht = new R(),
		ot = new L();
	class _e extends qe {
		constructor(
			e,
			t,
			{
				widthSegments: s,
				heightSegments: i,
				renderOrder: r,
				depthTest: a,
				cullFace: n,
				uniforms: o,
				vertexShaderID: l,
				fragmentShaderID: d,
				vertexShader: c,
				fragmentShader: f,
				texturesOptions: u,
				crossOrigin: g,
				alwaysDraw: m = !1,
				visible: b = !0,
				transparent: y = !1,
				drawCheckMargins: _ = { top: 0, right: 0, bottom: 0, left: 0 },
				autoloadSources: x = !0,
				watchScroll: v = !0,
				fov: P = 50,
			} = {}
		) {
			super(e, t, 'Plane', {
				widthSegments: s,
				heightSegments: i,
				renderOrder: r,
				depthTest: a,
				cullFace: n,
				uniforms: o,
				vertexShaderID: l,
				fragmentShaderID: d,
				vertexShader: c,
				fragmentShader: f,
				texturesOptions: u,
				crossOrigin: g,
			}),
				this.gl &&
					((this.index = this.renderer.planes.length),
					(this.target = null),
					(this.alwaysDraw = m),
					(this._shouldDraw = !0),
					(this.visible = b),
					(this._transparent = y),
					(this.drawCheckMargins = _),
					(this.autoloadSources = x),
					(this.watchScroll = v),
					(this._updateMVMatrix = !1),
					(this.camera = new $e({
						fov: P,
						width: this.renderer._boundingRect.width,
						height: this.renderer._boundingRect.height,
						pixelRatio: this.renderer.pixelRatio,
					})),
					this._program.compiled &&
						(this._initPlane(),
						this.renderer.scene.addPlane(this),
						this.renderer.planes.push(this)));
		}
		_programRestored() {
			this.target &&
				this.setRenderTarget(this.renderer.renderTargets[this.target.index]),
				this._initMatrices(),
				this.setPerspective(this.camera.fov, this.camera.near, this.camera.far),
				this._setWorldSizes(),
				this._applyWorldPositions(),
				this.renderer.scene.addPlane(this);
			for (let e = 0; e < this.textures.length; e++)
				(this.textures[e]._parent = this), this.textures[e]._restoreContext();
			this._canDraw = !0;
		}
		_initPlane() {
			this._initTransformValues(),
				this._initPositions(),
				this.setPerspective(this.camera.fov, this.camera.near, this.camera.far),
				this._initSources();
		}
		_initTransformValues() {
			(this.rotation = new R()),
				this.rotation.onChange(() => this._applyRotation()),
				(this.quaternion = new te()),
				(this.relativeTranslation = new R()),
				this.relativeTranslation.onChange(() => this._setTranslation()),
				(this._translation = new R()),
				(this.scale = new R(1)),
				this.scale.onChange(() => {
					(this.scale.z = 1), this._applyScale();
				}),
				(this.transformOrigin = new R(0.5, 0.5, 0)),
				this.transformOrigin.onChange(() => {
					this._setWorldTransformOrigin(), (this._updateMVMatrix = !0);
				});
		}
		resetPlane(e) {
			this._initTransformValues(),
				this._setWorldTransformOrigin(),
				e !== null && e
					? ((this.htmlElement = e), this.resize())
					: !e &&
					  !this.renderer.production &&
					  p(
							this.type +
								': You are trying to reset a plane with a HTML element that does not exist. The old HTML element will be kept instead.'
					  );
		}
		removeRenderTarget() {
			this.target &&
				(this.renderer.scene.removePlane(this),
				(this.target = null),
				this.renderer.scene.addPlane(this));
		}
		_initPositions() {
			this._initMatrices(), this._setWorldSizes(), this._applyWorldPositions();
		}
		_initMatrices() {
			const e = new B();
			this._matrices = {
				world: { matrix: e },
				modelView: {
					name: 'uMVMatrix',
					matrix: e,
					location: this.gl.getUniformLocation(
						this._program.program,
						'uMVMatrix'
					),
				},
				projection: {
					name: 'uPMatrix',
					matrix: e,
					location: this.gl.getUniformLocation(
						this._program.program,
						'uPMatrix'
					),
				},
				modelViewProjection: { matrix: e },
			};
		}
		_setPerspectiveMatrix() {
			this.camera._shouldUpdate &&
				(this.renderer.useProgram(this._program),
				this.gl.uniformMatrix4fv(
					this._matrices.projection.location,
					!1,
					this._matrices.projection.matrix.elements
				)),
				this.camera.cancelUpdate();
		}
		setPerspective(e, t, s) {
			this.camera.setPerspective(
				e,
				t,
				s,
				this.renderer._boundingRect.width,
				this.renderer._boundingRect.height,
				this.renderer.pixelRatio
			),
				this.renderer.state.isContextLost && this.camera.forceUpdate(),
				(this._matrices.projection.matrix = this.camera.projectionMatrix),
				this.camera._shouldUpdate &&
					(this._setWorldSizes(),
					this._applyWorldPositions(),
					(this._translation.z =
						this.relativeTranslation.z / this.camera.CSSPerspective)),
				(this._updateMVMatrix = this.camera._shouldUpdate);
		}
		_setMVMatrix() {
			this._updateMVMatrix &&
				((this._matrices.world.matrix =
					this._matrices.world.matrix.composeFromOrigin(
						this._translation,
						this.quaternion,
						this.scale,
						this._boundingRect.world.transformOrigin
					)),
				this._matrices.world.matrix.scale({
					x: this._boundingRect.world.width,
					y: this._boundingRect.world.height,
					z: 1,
				}),
				this._matrices.modelView.matrix.copy(this._matrices.world.matrix),
				(this._matrices.modelView.matrix.elements[14] -=
					this.camera.position.z),
				(this._matrices.modelViewProjection.matrix =
					this._matrices.projection.matrix.multiply(
						this._matrices.modelView.matrix
					)),
				this.alwaysDraw || this._shouldDrawCheck(),
				this.renderer.useProgram(this._program),
				this.gl.uniformMatrix4fv(
					this._matrices.modelView.location,
					!1,
					this._matrices.modelView.matrix.elements
				)),
				(this._updateMVMatrix = !1);
		}
		_setWorldTransformOrigin() {
			this._boundingRect.world.transformOrigin = new R(
				(this.transformOrigin.x * 2 - 1) * this._boundingRect.world.width,
				-(this.transformOrigin.y * 2 - 1) * this._boundingRect.world.height,
				this.transformOrigin.z
			);
		}
		_documentToWorldSpace(e) {
			return Ke.set(
				((e.x * this.renderer.pixelRatio) / this.renderer._boundingRect.width) *
					this._boundingRect.world.ratios.width,
				-(
					(e.y * this.renderer.pixelRatio) /
					this.renderer._boundingRect.height
				) * this._boundingRect.world.ratios.height,
				e.z
			);
		}
		_setWorldSizes() {
			const e = this.camera.getScreenRatiosFromFov();
			(this._boundingRect.world = {
				width:
					((this._boundingRect.document.width /
						this.renderer._boundingRect.width) *
						e.width) /
					2,
				height:
					((this._boundingRect.document.height /
						this.renderer._boundingRect.height) *
						e.height) /
					2,
				ratios: e,
			}),
				this._setWorldTransformOrigin();
		}
		_setWorldPosition() {
			const e = {
					x:
						this._boundingRect.document.width / 2 +
						this._boundingRect.document.left,
					y:
						this._boundingRect.document.height / 2 +
						this._boundingRect.document.top,
				},
				t = {
					x:
						this.renderer._boundingRect.width / 2 +
						this.renderer._boundingRect.left,
					y:
						this.renderer._boundingRect.height / 2 +
						this.renderer._boundingRect.top,
				};
			(this._boundingRect.world.top =
				((t.y - e.y) / this.renderer._boundingRect.height) *
				this._boundingRect.world.ratios.height),
				(this._boundingRect.world.left =
					((e.x - t.x) / this.renderer._boundingRect.width) *
					this._boundingRect.world.ratios.width);
		}
		setScale(e) {
			if (!e.type || e.type !== 'Vec2') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set scale because the parameter passed is not of Vec2 type:',
						e
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.scale).max(Qe.set(0.001, 0.001)),
				(e.x !== this.scale.x || e.y !== this.scale.y) &&
					(this.scale.set(e.x, e.y, 1), this._applyScale());
		}
		_applyScale() {
			for (let e = 0; e < this.textures.length; e++) this.textures[e].resize();
			this._updateMVMatrix = !0;
		}
		setRotation(e) {
			if (!e.type || e.type !== 'Vec3') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set rotation because the parameter passed is not of Vec3 type:',
						e
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.rotation),
				e.equals(this.rotation) ||
					(this.rotation.copy(e), this._applyRotation());
		}
		_applyRotation() {
			this.quaternion.setFromVec3(this.rotation), (this._updateMVMatrix = !0);
		}
		setTransformOrigin(e) {
			if (!e.type || e.type !== 'Vec3') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set transform origin because the parameter passed is not of Vec3 type:',
						e
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.transformOrigin),
				e.equals(this.transformOrigin) ||
					(this.transformOrigin.copy(e),
					this._setWorldTransformOrigin(),
					(this._updateMVMatrix = !0));
		}
		_setTranslation() {
			let e = Ze.set(0, 0, 0);
			this.relativeTranslation.equals(e) ||
				(e = this._documentToWorldSpace(this.relativeTranslation)),
				this._translation.set(
					this._boundingRect.world.left + e.x,
					this._boundingRect.world.top + e.y,
					this.relativeTranslation.z / this.camera.CSSPerspective
				),
				(this._updateMVMatrix = !0);
		}
		setRelativeTranslation(e) {
			if (!e.type || e.type !== 'Vec3') {
				this.renderer.production ||
					p(
						this.type +
							': Cannot set translation because the parameter passed is not of Vec3 type:',
						e
					);
				return;
			}
			e.sanitizeNaNValuesWith(this.relativeTranslation),
				e.equals(this.relativeTranslation) ||
					(this.relativeTranslation.copy(e), this._setTranslation());
		}
		_applyWorldPositions() {
			this._setWorldPosition(), this._setTranslation();
		}
		updatePosition() {
			this._setDocumentSizes(), this._applyWorldPositions();
		}
		updateScrollPosition(e, t) {
			(e || t) &&
				((this._boundingRect.document.top += t * this.renderer.pixelRatio),
				(this._boundingRect.document.left += e * this.renderer.pixelRatio),
				this._applyWorldPositions());
		}
		_getIntersection(e, t) {
			let s = t.clone().sub(e),
				i = e.clone();
			for (; i.z > -1; ) i.add(s);
			return i;
		}
		_getNearPlaneIntersections(e, t, s) {
			const i = this._matrices.modelViewProjection.matrix;
			if (s.length === 1)
				s[0] === 0
					? ((t[0] = this._getIntersection(
							t[1],
							U.set(0.95, 1, 0).applyMat4(i)
					  )),
					  t.push(
							this._getIntersection(t[3], V.set(-1, -0.95, 0).applyMat4(i))
					  ))
					: s[0] === 1
					? ((t[1] = this._getIntersection(
							t[0],
							U.set(-0.95, 1, 0).applyMat4(i)
					  )),
					  t.push(
							this._getIntersection(t[2], V.set(1, -0.95, 0).applyMat4(i))
					  ))
					: s[0] === 2
					? ((t[2] = this._getIntersection(
							t[3],
							U.set(-0.95, -1, 0).applyMat4(i)
					  )),
					  t.push(this._getIntersection(t[1], V.set(1, 0.95, 0).applyMat4(i))))
					: s[0] === 3 &&
					  ((t[3] = this._getIntersection(
							t[2],
							U.set(0.95, -1, 0).applyMat4(i)
					  )),
					  t.push(
							this._getIntersection(t[0], V.set(-1, 0.95, 0).applyMat4(i))
					  ));
			else if (s.length === 2)
				s[0] === 0 && s[1] === 1
					? ((t[0] = this._getIntersection(
							t[3],
							U.set(-1, -0.95, 0).applyMat4(i)
					  )),
					  (t[1] = this._getIntersection(
							t[2],
							V.set(1, -0.95, 0).applyMat4(i)
					  )))
					: s[0] === 1 && s[1] === 2
					? ((t[1] = this._getIntersection(
							t[0],
							U.set(-0.95, 1, 0).applyMat4(i)
					  )),
					  (t[2] = this._getIntersection(
							t[3],
							V.set(-0.95, -1, 0).applyMat4(i)
					  )))
					: s[0] === 2 && s[1] === 3
					? ((t[2] = this._getIntersection(
							t[1],
							U.set(1, 0.95, 0).applyMat4(i)
					  )),
					  (t[3] = this._getIntersection(
							t[0],
							V.set(-1, 0.95, 0).applyMat4(i)
					  )))
					: s[0] === 0 &&
					  s[1] === 3 &&
					  ((t[0] = this._getIntersection(
							t[1],
							U.set(0.95, 1, 0).applyMat4(i)
					  )),
					  (t[3] = this._getIntersection(
							t[2],
							V.set(0.95, -1, 0).applyMat4(i)
					  )));
			else if (s.length === 3) {
				let r = 0;
				for (let a = 0; a < e.length; a++) s.includes(a) || (r = a);
				(t = [t[r]]),
					r === 0
						? (t.push(
								this._getIntersection(t[0], U.set(-0.95, 1, 0).applyMat4(i))
						  ),
						  t.push(
								this._getIntersection(t[0], V.set(-1, 0.95, 0).applyMat4(i))
						  ))
						: r === 1
						? (t.push(
								this._getIntersection(t[0], U.set(0.95, 1, 0).applyMat4(i))
						  ),
						  t.push(
								this._getIntersection(t[0], V.set(1, 0.95, 0).applyMat4(i))
						  ))
						: r === 2
						? (t.push(
								this._getIntersection(t[0], U.set(0.95, -1, 0).applyMat4(i))
						  ),
						  t.push(
								this._getIntersection(t[0], V.set(1, -0.95, 0).applyMat4(i))
						  ))
						: r === 3 &&
						  (t.push(
								this._getIntersection(t[0], U.set(-0.95, -1, 0).applyMat4(i))
						  ),
						  t.push(
								this._getIntersection(t[0], V.set(-1 - 0.95, 0).applyMat4(i))
						  ));
			} else
				for (let r = 0; r < e.length; r++) (t[r][0] = 1e4), (t[r][1] = 1e4);
			return t;
		}
		_getWorldCoords() {
			const e = [
				Je.set(-1, 1, 0),
				et.set(1, 1, 0),
				tt.set(1, -1, 0),
				st.set(-1, -1, 0),
			];
			let t = [],
				s = [];
			for (let o = 0; o < e.length; o++) {
				const l = e[o].applyMat4(this._matrices.modelViewProjection.matrix);
				t.push(l), Math.abs(l.z) > 1 && s.push(o);
			}
			s.length && (t = this._getNearPlaneIntersections(e, t, s));
			let i = 1 / 0,
				r = -1 / 0,
				a = 1 / 0,
				n = -1 / 0;
			for (let o = 0; o < t.length; o++) {
				const l = t[o];
				l.x < i && (i = l.x),
					l.x > r && (r = l.x),
					l.y < a && (a = l.y),
					l.y > n && (n = l.y);
			}
			return { top: n, right: r, bottom: a, left: i };
		}
		_computeWebGLBoundingRect() {
			const e = this._getWorldCoords();
			let t = {
				top: 1 - (e.top + 1) / 2,
				right: (e.right + 1) / 2,
				bottom: 1 - (e.bottom + 1) / 2,
				left: (e.left + 1) / 2,
			};
			(t.width = t.right - t.left),
				(t.height = t.bottom - t.top),
				(this._boundingRect.worldToDocument = {
					width: t.width * this.renderer._boundingRect.width,
					height: t.height * this.renderer._boundingRect.height,
					top:
						t.top * this.renderer._boundingRect.height +
						this.renderer._boundingRect.top,
					left:
						t.left * this.renderer._boundingRect.width +
						this.renderer._boundingRect.left,
					right:
						t.left * this.renderer._boundingRect.width +
						this.renderer._boundingRect.left +
						t.width * this.renderer._boundingRect.width,
					bottom:
						t.top * this.renderer._boundingRect.height +
						this.renderer._boundingRect.top +
						t.height * this.renderer._boundingRect.height,
				});
		}
		getWebGLBoundingRect() {
			if (this._matrices.modelViewProjection)
				(!this._boundingRect.worldToDocument || this.alwaysDraw) &&
					this._computeWebGLBoundingRect();
			else return this._boundingRect.document;
			return this._boundingRect.worldToDocument;
		}
		_getWebGLDrawRect() {
			return (
				this._computeWebGLBoundingRect(),
				{
					top:
						this._boundingRect.worldToDocument.top - this.drawCheckMargins.top,
					right:
						this._boundingRect.worldToDocument.right +
						this.drawCheckMargins.right,
					bottom:
						this._boundingRect.worldToDocument.bottom +
						this.drawCheckMargins.bottom,
					left:
						this._boundingRect.worldToDocument.left -
						this.drawCheckMargins.left,
				}
			);
		}
		_shouldDrawCheck() {
			const e = this._getWebGLDrawRect();
			Math.round(e.right) <= this.renderer._boundingRect.left ||
			Math.round(e.left) >=
				this.renderer._boundingRect.left + this.renderer._boundingRect.width ||
			Math.round(e.bottom) <= this.renderer._boundingRect.top ||
			Math.round(e.top) >=
				this.renderer._boundingRect.top + this.renderer._boundingRect.height
				? this._shouldDraw &&
				  ((this._shouldDraw = !1),
				  this.renderer.nextRender.add(
						() => this._onLeaveViewCallback && this._onLeaveViewCallback()
				  ))
				: (this._shouldDraw ||
						this.renderer.nextRender.add(
							() => this._onReEnterViewCallback && this._onReEnterViewCallback()
						),
				  (this._shouldDraw = !0));
		}
		isDrawn() {
			return (
				this._canDraw && this.visible && (this._shouldDraw || this.alwaysDraw)
			);
		}
		enableDepthTest(e) {
			this._depthTest = e;
		}
		_initSources() {
			let e = 0;
			if (this.autoloadSources) {
				const t = this.htmlElement.getElementsByTagName('img'),
					s = this.htmlElement.getElementsByTagName('video'),
					i = this.htmlElement.getElementsByTagName('canvas');
				t.length && this.loadImages(t),
					s.length && this.loadVideos(s),
					i.length && this.loadCanvases(i),
					(e = t.length + s.length + i.length);
			}
			this.loader._setLoaderSize(e), (this._canDraw = !0);
		}
		_startDrawing() {
			this._canDraw &&
				(this._onRenderCallback && this._onRenderCallback(),
				this.target
					? this.renderer.bindFrameBuffer(this.target)
					: this.renderer.state.scenePassIndex === null &&
					  this.renderer.bindFrameBuffer(null),
				this._setPerspectiveMatrix(),
				this._setMVMatrix(),
				(this.alwaysDraw || this._shouldDraw) && this.visible && this._draw());
		}
		mouseToPlaneCoords(e) {
			if (
				(me.setAxisOrder(this.quaternion.axisOrder),
				me.equals(this.quaternion) && it.equals(this.transformOrigin))
			)
				return super.mouseToPlaneCoords(e);
			{
				const t = {
						x:
							2 *
								(e.x /
									(this.renderer._boundingRect.width /
										this.renderer.pixelRatio)) -
							1,
						y:
							2 *
								(1 -
									e.y /
										(this.renderer._boundingRect.height /
											this.renderer.pixelRatio)) -
							1,
					},
					s = this.camera.position.clone(),
					i = rt.set(t.x, t.y, -0.5);
				i.unproject(this.camera), i.sub(s).normalize();
				const r = at.set(0, 0, -1);
				r.applyQuat(this.quaternion).normalize();
				const a = ht.set(0, 0, 0),
					n = r.dot(i);
				if (Math.abs(n) >= 1e-4) {
					const o = this._matrices.world.matrix
							.getInverse()
							.multiply(this.camera.viewMatrix),
						l = this._boundingRect.world.transformOrigin
							.clone()
							.add(this._translation),
						d = nt.set(
							this._translation.x - l.x,
							this._translation.y - l.y,
							this._translation.z - l.z
						);
					d.applyQuat(this.quaternion), l.add(d);
					const c = r.dot(l.clone().sub(s)) / n;
					a.copy(s.add(i.multiplyScalar(c))), a.applyMat4(o);
				} else a.set(1 / 0, 1 / 0, 1 / 0);
				return ot.set(a.x, a.y);
			}
		}
		onReEnterView(e) {
			return e && (this._onReEnterViewCallback = e), this;
		}
		onLeaveView(e) {
			return e && (this._onLeaveViewCallback = e), this;
		}
	}
	class ne {
		constructor(
			e,
			{
				shaderPass: t,
				depth: s = !1,
				clear: i = !0,
				maxWidth: r,
				maxHeight: a,
				minWidth: n = 1024,
				minHeight: o = 1024,
				texturesOptions: l = {},
			} = {}
		) {
			if (
				((this.type = 'RenderTarget'),
				(e = (e && e.renderer) || e),
				!e || e.type !== 'Renderer')
			)
				F(this.type + ': Renderer not passed as first argument', e);
			else if (!e.gl) {
				e.production ||
					F(
						this.type +
							': Unable to create a ' +
							this.type +
							' because the Renderer WebGL context is not defined'
					);
				return;
			}
			(this.renderer = e),
				(this.gl = this.renderer.gl),
				(this.index = this.renderer.renderTargets.length),
				(this._shaderPass = t),
				(this._depth = s),
				(this._shouldClear = i),
				(this._maxSize = {
					width: r
						? Math.min(this.renderer.state.maxTextureSize / 4, r)
						: this.renderer.state.maxTextureSize / 4,
					height: a
						? Math.min(this.renderer.state.maxTextureSize / 4, a)
						: this.renderer.state.maxTextureSize / 4,
				}),
				(this._minSize = {
					width: n * this.renderer.pixelRatio,
					height: o * this.renderer.pixelRatio,
				}),
				(l = Object.assign(
					{
						sampler: 'uRenderTexture',
						isFBOTexture: !0,
						premultiplyAlpha: !1,
						anisotropy: 1,
						generateMipmap: !1,
						floatingPoint: 'none',
						wrapS: this.gl.CLAMP_TO_EDGE,
						wrapT: this.gl.CLAMP_TO_EDGE,
						minFilter: this.gl.LINEAR,
						magFilter: this.gl.LINEAR,
					},
					l
				)),
				(this._texturesOptions = l),
				(this.userData = {}),
				(this.uuid = re()),
				this.renderer.renderTargets.push(this),
				this.renderer.onSceneChange(),
				this._initRenderTarget();
		}
		_initRenderTarget() {
			this._setSize(), (this.textures = []), this._createFrameBuffer();
		}
		_restoreContext() {
			this._setSize(), this._createFrameBuffer();
		}
		_setSize() {
			this._shaderPass && this._shaderPass._isScenePass
				? (this._size = {
						width: this.renderer._boundingRect.width,
						height: this.renderer._boundingRect.height,
				  })
				: (this._size = {
						width: Math.min(
							this._maxSize.width,
							Math.max(this._minSize.width, this.renderer._boundingRect.width)
						),
						height: Math.min(
							this._maxSize.height,
							Math.max(this._minSize.height, this.renderer._boundingRect.height)
						),
				  });
		}
		resize() {
			this._shaderPass &&
				(this._setSize(),
				this.textures[0].resize(),
				this.renderer.bindFrameBuffer(this, !0),
				this._depth && this._bindDepthBuffer(),
				this.renderer.bindFrameBuffer(null));
		}
		_bindDepthBuffer() {
			this._depthBuffer &&
				(this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this._depthBuffer),
				this.gl.renderbufferStorage(
					this.gl.RENDERBUFFER,
					this.gl.DEPTH_COMPONENT16,
					this._size.width,
					this._size.height
				),
				this.gl.framebufferRenderbuffer(
					this.gl.FRAMEBUFFER,
					this.gl.DEPTH_ATTACHMENT,
					this.gl.RENDERBUFFER,
					this._depthBuffer
				));
		}
		_createFrameBuffer() {
			(this._frameBuffer = this.gl.createFramebuffer()),
				this.renderer.bindFrameBuffer(this, !0),
				this.textures.length
					? ((this.textures[0]._parent = this),
					  this.textures[0]._restoreContext())
					: new q(this.renderer, this._texturesOptions).addParent(this),
				this.gl.framebufferTexture2D(
					this.gl.FRAMEBUFFER,
					this.gl.COLOR_ATTACHMENT0,
					this.gl.TEXTURE_2D,
					this.textures[0]._sampler.texture,
					0
				),
				this._depth &&
					((this._depthBuffer = this.gl.createRenderbuffer()),
					this._bindDepthBuffer()),
				this.renderer.bindFrameBuffer(null);
		}
		getTexture() {
			return this.textures[0];
		}
		remove() {
			if (this._shaderPass) {
				this.renderer.production ||
					p(
						this.type +
							": You're trying to remove a RenderTarget attached to a ShaderPass. You should remove that ShaderPass instead:",
						this._shaderPass
					);
				return;
			}
			this._dispose(), this.renderer.removeRenderTarget(this);
		}
		_dispose() {
			this._frameBuffer &&
				(this.gl.deleteFramebuffer(this._frameBuffer),
				(this._frameBuffer = null)),
				this._depthBuffer &&
					(this.gl.deleteRenderbuffer(this._depthBuffer),
					(this._depthBuffer = null)),
				this.textures[0]._dispose(),
				(this.textures = []);
		}
	}
	class lt extends _e {
		constructor(
			e,
			t,
			{
				sampler: s = 'uPingPongTexture',
				widthSegments: i,
				heightSegments: r,
				renderOrder: a,
				depthTest: n,
				cullFace: o,
				uniforms: l,
				vertexShaderID: d,
				fragmentShaderID: c,
				vertexShader: f,
				fragmentShader: u,
				texturesOptions: g,
				crossOrigin: m,
				alwaysDraw: b,
				visible: y,
				transparent: _,
				drawCheckMargins: x,
				autoloadSources: v,
				watchScroll: P,
				fov: w,
			} = {}
		) {
			if (
				((n = !1),
				(v = !1),
				super(e, t, {
					widthSegments: i,
					heightSegments: r,
					renderOrder: a,
					depthTest: n,
					cullFace: o,
					uniforms: l,
					vertexShaderID: d,
					fragmentShaderID: c,
					vertexShader: f,
					fragmentShader: u,
					texturesOptions: g,
					crossOrigin: m,
					alwaysDraw: b,
					visible: y,
					transparent: _,
					drawCheckMargins: x,
					autoloadSources: v,
					watchScroll: P,
					fov: w,
				}),
				!this.gl)
			)
				return;
			this.renderer.scene.removePlane(this),
				(this.type = 'PingPongPlane'),
				this.renderer.scene.addPlane(this),
				(this.readPass = new ne(e, {
					depth: !1,
					clear: !1,
					texturesOptions: g,
				})),
				(this.writePass = new ne(e, {
					depth: !1,
					clear: !1,
					texturesOptions: g,
				})),
				this.createTexture({ sampler: s });
			let T = 0;
			this.readPass.getTexture().onSourceUploaded(() => {
				T++, this._checkIfReady(T);
			}),
				this.writePass.getTexture().onSourceUploaded(() => {
					T++, this._checkIfReady(T);
				}),
				this.setRenderTarget(this.readPass),
				(this._onRenderCallback = () => {
					this.readPass &&
						this.writePass &&
						this.textures[0] &&
						this.textures[0]._uploaded &&
						this.setRenderTarget(this.writePass),
						this._onPingPongRenderCallback && this._onPingPongRenderCallback();
				}),
				(this._onAfterRenderCallback = () => {
					this.readPass &&
						this.writePass &&
						this.textures[0] &&
						this.textures[0]._uploaded &&
						this._swapPasses(),
						this._onPingPongAfterRenderCallback &&
							this._onPingPongAfterRenderCallback();
				});
		}
		_checkIfReady(e) {
			e === 2 &&
				this.renderer.nextRender.add(() => {
					this.textures[0].copy(this.target.getTexture());
				});
		}
		_swapPasses() {
			const e = this.readPass;
			(this.readPass = this.writePass),
				(this.writePass = e),
				this.textures[0].copy(this.readPass.getTexture());
		}
		getTexture() {
			return this.textures[0];
		}
		onRender(e) {
			return e && (this._onPingPongRenderCallback = e), this;
		}
		onAfterRender(e) {
			return e && (this._onPingPongAfterRenderCallback = e), this;
		}
		remove() {
			(this.target = null),
				this.renderer.bindFrameBuffer(null),
				this.writePass && (this.writePass.remove(), (this.writePass = null)),
				this.readPass && (this.readPass.remove(), (this.readPass = null)),
				super.remove();
		}
	}
	(function (h) {
		var e = {};
		function t(s) {
			if (e[s]) return e[s].exports;
			var i = (e[s] = { i: s, l: !1, exports: {} });
			return h[s].call(i.exports, i, i.exports, t), (i.l = !0), i.exports;
		}
		(t.m = h),
			(t.c = e),
			(t.d = function (s, i, r) {
				t.o(s, i) || Object.defineProperty(s, i, { enumerable: !0, get: r });
			}),
			(t.r = function (s) {
				typeof Symbol < 'u' &&
					Symbol.toStringTag &&
					Object.defineProperty(s, Symbol.toStringTag, { value: 'Module' }),
					Object.defineProperty(s, '__esModule', { value: !0 });
			}),
			(t.t = function (s, i) {
				if (
					(1 & i && (s = t(s)),
					8 & i || (4 & i && typeof s == 'object' && s && s.__esModule))
				)
					return s;
				var r = Object.create(null);
				if (
					(t.r(r),
					Object.defineProperty(r, 'default', { enumerable: !0, value: s }),
					2 & i && typeof s != 'string')
				)
					for (var a in s)
						t.d(
							r,
							a,
							function (n) {
								return s[n];
							}.bind(null, a)
						);
				return r;
			}),
			(t.n = function (s) {
				var i =
					s && s.__esModule
						? function () {
								return s.default;
						  }
						: function () {
								return s;
						  };
				return t.d(i, 'a', i), i;
			}),
			(t.o = function (s, i) {
				return Object.prototype.hasOwnProperty.call(s, i);
			}),
			(t.p = ''),
			t((t.s = 0));
	})([
		function (h, e, t) {
			var s =
				(this && this.__spreadArray) ||
				function (n, o) {
					for (var l = 0, d = o.length, c = n.length; l < d; l++, c++)
						n[c] = o[l];
					return n;
				};
			Object.defineProperty(e, '__esModule', { value: !0 }),
				(e.ConicalGradient = void 0);
			var i = t(1);
			function r(n, o, l, d, c, f, u) {
				o === void 0 &&
					(o = [
						[0, '#fff'],
						[1, '#fff'],
					]),
					l === void 0 && (l = 0),
					d === void 0 && (d = 0),
					c === void 0 && (c = 0),
					f === void 0 && (f = 2 * Math.PI),
					u === void 0 && (u = !1);
				var g = Math.floor((180 * c) / Math.PI),
					m = Math.ceil((180 * f) / Math.PI),
					b = document.createElement('canvas');
				(b.width = n.canvas.width), (b.height = n.canvas.height);
				var y = b.getContext('2d'),
					_ = [
						[0, 0],
						[n.canvas.width, 0],
						[n.canvas.width, n.canvas.height],
						[0, n.canvas.height],
					],
					x =
						Math.max.apply(
							Math,
							_.map(function (E) {
								var M = E[0],
									S = E[1];
								return Math.sqrt(Math.pow(M - l, 2) + Math.pow(S - d, 2));
							})
						) + 10;
				y.translate(l, d);
				for (
					var v = (2 * Math.PI * (x + 20)) / 360,
						P = new i.default(o, m - g + 1),
						w = g;
					w <= m;
					w++
				)
					y.save(),
						y.rotate(((u ? -1 : 1) * (Math.PI * w)) / 180),
						y.beginPath(),
						y.moveTo(0, 0),
						y.lineTo(x, -2 * v),
						y.lineTo(x, 0),
						(y.fillStyle = P.getColor(w - g)),
						y.fill(),
						y.closePath(),
						y.restore();
				var T = document.createElement('canvas');
				(T.width = n.canvas.width), (T.height = n.canvas.height);
				var A = T.getContext('2d');
				return (
					A.beginPath(),
					A.arc(l, d, x, c, f, u),
					A.lineTo(l, d),
					A.closePath(),
					(A.fillStyle = A.createPattern(b, 'no-repeat')),
					A.fill(),
					n.createPattern(T, 'no-repeat')
				);
			}
			(e.default = r),
				(CanvasRenderingContext2D.prototype.createConicalGradient =
					function () {
						for (var n = [], o = 0; o < arguments.length; o++)
							n[o] = arguments[o];
						var l = this,
							d = {
								stops: [],
								addColorStop: function (c, f) {
									this.stops.push([c, f]);
								},
								get pattern() {
									return r.apply(void 0, s([l, this.stops], n));
								},
							};
						return d;
					});
			var a = t(2);
			Object.defineProperty(e, 'ConicalGradient', {
				enumerable: !0,
				get: function () {
					return a.ConicalGradient;
				},
			});
		},
		function (h, e, t) {
			Object.defineProperty(e, '__esModule', { value: !0 });
			var s = (function () {
				function i(r, a) {
					r === void 0 && (r = []), a === void 0 && (a = 100);
					var n = document.createElement('canvas');
					(n.width = a), (n.height = 1), (this.ctx = n.getContext('2d'));
					for (
						var o = this.ctx.createLinearGradient(0, 0, a, 0), l = 0, d = r;
						l < d.length;
						l++
					) {
						var c = d[l];
						o.addColorStop.apply(o, c);
					}
					(this.ctx.fillStyle = o),
						this.ctx.fillRect(0, 0, a, 1),
						(this.rgbaSet = this.ctx.getImageData(0, 0, a, 1).data);
				}
				return (
					(i.prototype.getColor = function (r) {
						var a = this.rgbaSet.slice(4 * r, 4 * r + 4);
						return (
							'rgba(' +
							a[0] +
							', ' +
							a[1] +
							', ' +
							a[2] +
							', ' +
							a[3] / 255 +
							')'
						);
					}),
					i
				);
			})();
			e.default = s;
		},
		function (h, e, t) {
			Object.defineProperty(e, '__esModule', { value: !0 });
		},
	]);
	const dt = (h, e, t, s, i) => {
			var r = (Math.PI / 180) * i,
				a = Math.cos(r),
				n = Math.sin(r),
				o = a * (t - h) + n * (s - e) + h,
				l = a * (s - e) - n * (t - h) + e;
			return [+o.toFixed(1), +l.toFixed(1)];
		},
		Y = (h, e) => {
			const t = e || 1,
				s = Math.min(...h.map((l) => l[0])),
				i = Math.max(...h.map((l) => l[0])),
				r = Math.min(...h.map((l) => l[1])),
				a = Math.max(...h.map((l) => l[1])),
				n = Math.abs(i - s),
				o = Math.abs(a - r);
			return {
				width: Math.round(n / t),
				height: Math.round(o / t),
				aspectRatio: n / t / (o / t),
				center: {
					x: Math.round((n / 2 + s) / t),
					y: Math.round((o / 2 + r) / t),
				},
				corners: [
					[s, r],
					[i, r],
					[i, a],
					[s, a],
				],
			};
		},
		xe = (h, e, t) => {
			let s;
			const i = Y(t);
			if (e.fill.length > 1) {
				let r = e.gradientAngle ? +e.gradientAngle * 2 * Math.PI : 0,
					a = i.center.x,
					n = i.center.y;
				if (
					(e.gradientType === 'radial' &&
						(s = h.createRadialGradient(
							a,
							n,
							Math.max(i.width, i.height) * 0.7,
							a,
							n,
							0
						)),
					e.gradientType === 'linear' &&
						(s = h.createLinearGradient(
							a - (Math.cos(r) * i.width) / 2,
							n - (Math.sin(r) * i.height) / 2,
							a + (Math.cos(r) * i.width) / 2,
							n + (Math.sin(r) * i.height) / 2
						)),
					e.gradientType === 'conic')
				) {
					s = h.createConicalGradient(a, n, -Math.PI + r, Math.PI + r);
					const o = [...e.fill, ...e.fill.slice().reverse()];
					o.forEach((d, c) => {
						s.addColorStop(c * (1 / (o.length - 1)), d);
					}),
						document
							.createElementNS('http://www.w3.org/2000/svg', 'svg')
							.createSVGMatrix(),
						(s = s.pattern);
				} else
					e.fill.forEach((o, l) => {
						s.addColorStop(l * (1 / (e.fill.length - 1)), o);
					});
			} else s = e.fill[0];
			return s;
		};
	let se, ie, ye;
	typeof document.hidden < 'u'
		? ((se = 'hidden'), (ie = 'visibilitychange'))
		: typeof document.msHidden < 'u'
		? ((se = 'msHidden'), (ie = 'msvisibilitychange'))
		: typeof document.webkitHidden < 'u' &&
		  ((se = 'webkitHidden'), (ie = 'webkitvisibilitychange'));
	const ct = {
		NORMAL: 'Normal',
		ADD: 'Add',
		SUBTRACT: 'Subtract',
		MULTIPLY: 'Multiply',
		SCREEN: 'Screen',
		OVERLAY: 'Overlay',
		DARKEN: 'Darken',
		LIGHTEN: 'Lighten',
		COLOR_DODGE: 'Color dodge',
		COLOR_BURN: 'Color burn',
		LINEAR_BURN: 'Linear burn',
		HARD_LIGHT: 'Hard light',
		SOFT_LIGHT: 'Soft light',
		DIFFERENCE: 'Difference',
		EXCLUSION: 'Exclusion',
		LINEAR_LIGHT: 'Linear light',
		PIN_LIGHT: 'Pin light',
		VIVID_LIGHT: 'Vivid light',
	};
	function ut(h, e) {
		let t;
		return function (...s) {
			clearTimeout(t),
				(t = setTimeout(() => {
					h.apply(this, s);
				}, e));
		};
	}
	const be = () => {
		var h = new Date().getTime(),
			e =
				(typeof performance < 'u' &&
					performance.now &&
					performance.now() * 1e3) ||
				0;
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (t) {
				var s = Math.random() * 16;
				return (
					h > 0
						? ((s = (h + s) % 16 | 0), (h = Math.floor(h / 16)))
						: ((s = (e + s) % 16 | 0), (e = Math.floor(e / 16))),
					(t === 'x' ? s : (s & 3) | 8).toString(16)
				);
			}
		);
	};
	function G(h) {
		return h && typeof h == 'string' && (h = JSON.parse(h)), Object.values(h);
	}
	function Z(h, e, t) {
		for (let s = 0; s < t; s++) h = (h + e) / 2;
		return +((h + e) / 2).toFixed(4);
	}
	function ft(h) {
		const e = Y(h.coords),
			t = h.getPositionOffset();
		let s = h.coords.map(([i, r]) =>
			dt(e.center.x, e.center.y, i, r, -h.rotation * 360)
		);
		return (
			(s = s.map(([i, r]) => [Math.round(i + t.x), Math.round(r + t.y)])), s
		);
	}
	function $(h, e) {
		const t = h[0] / h[1],
			s = Math.sqrt(t * (3e5 * (e || 1)));
		return [s, s / t];
	}
	function he() {
		return /Android|iPhone/i.test(navigator.userAgent);
	}
	function Q(h) {
		const e =
			('trackMouse' in h && h.trackMouse > 0) ||
			('axisTilt' in h && h.axisTilt > 0) ||
			('trackMouseMove' in h && h.trackMouseMove > 0);
		let t = h.states && h.states.scroll.length,
			s = h.states && h.states.appear.length,
			i = h.layerType === 'effect' && h.animating;
		return e || i || t || s;
	}
	function pt(h, e, t) {
		const s = [];
		return (
			h.forEach((i) => {
				switch (i.layerType) {
					case 'text':
						s.push(new Rt(i, e, null, t).unpackage());
						break;
					case 'image':
						s.push(new Tt(i, e, t).unpackage());
						break;
					case 'fill':
						s.push(new we(i, e, t).unpackage());
						break;
					case 'shape':
						s.push(new Pt(i, e, t).unpackage());
						break;
					case 'effect':
						s.push(new we(i, e, t).unpackage());
						break;
				}
			}),
			s
		);
	}
	function gt(h, e) {
		if (h.length) {
			const t = document.createElement('style');
			for (let s = 0; s < h.length; s++) {
				let i = ['normal', 'regular'].includes(h[s].fontStyle)
					? ''
					: `:wght@${h[s].fontStyle}`;
				h[s].fontStyle === 'italic' && (i = ''),
					h[s].fontCSS
						? (t.innerHTML += `
        @font-face {
          font-family: '${h[s].fontCSS.family}';
          src: url('${h[s].fontCSS.src}');
          font-display: swap;
        }`)
						: (t.innerHTML += `@import url(https://fonts.googleapis.com/css2?family=${h[
								s
						  ].fontFamily
								.split(' ')
								.join('+')}${i});`);
			}
			document.head.appendChild(t);
		}
	}
	function mt(h, e) {
		const t = document.createElement('a');
		(t.href = 'https://unicorn.studio?utm_source=public-url'),
			(t.style =
				'position: absolute; display: flex; bottom: 30px; left: 0; width: 190px; margin: 0 auto; right: 0rem; padding: 10px; border-radius: 6px; background-color: rgba(255, 255, 255, 1); box-shadow: 0 3px 9px 0 rgba(0, 0, 0, .2); z-index: 99999999; box-sizing: border-box;'),
			(t.target = '_blank');
		const s = document.createElement('img');
		(s.src = 'https://assets.unicorn.studio/media/made_in_us_small_web.svg'),
			(s.alt = 'Made in unicorn.studio'),
			(s.style = 'width: 170px; height: auto;'),
			t.appendChild(s),
			e.appendChild(t);
	}
	function _t(h, e) {
		const s =
				$([e.offsetWidth || h.width, e.offsetHeight || h.height])[0] /
				e.offsetWidth,
			i = h.getPositionOffset(),
			r = document.createElement('div');
		r.setAttribute('data-us-text', 'loading'),
			r.setAttribute('data-us-project', h.local.sceneId),
			(r.style.width = h.width / s + 'px'),
			(r.style.height = h.height / s + 'px'),
			(r.style.top = i.y / s + e.offsetTop + 'px'),
			(r.style.left = i.x / s + e.offsetLeft + 'px'),
			(r.style.fontSize = h.fontSize / s + 'px'),
			(r.style.lineHeight = h.lineHeight / s + 'px'),
			(r.style.letterSpacing = h.letterSpacing / s + 'px'),
			(r.style.fontFamily = h.fontFamily),
			(r.style.fontWeight = h.fontWeight),
			(r.style.textAlign = h.textAlign),
			(r.style.wordBreak = 'break-word'),
			(r.style.transform = `rotateZ(${Math.round(h.rotation * 360)}deg)`),
			(r.style.color = 'transparent'),
			(r.style.zIndex = 2),
			(r.innerText = h.textContent),
			e.appendChild(r);
	}
	let K;
	function xt() {
		k.forEach((h, e) => {
			document.body.contains(h.element) ||
				(h.curtain.dispose(), k.splice(e, 1));
		});
	}
	function oe() {
		cancelAnimationFrame(K);
		const h = k.filter((t) => t.getAnimatingEffects().length),
			e = (t) => {
				const s = h.filter((i) => i.isInView && i.initialized);
				k.forEach((i) => {
					i.rendering = s.includes(i);
				}),
					s.length
						? (At(),
						  s.forEach((i) => {
								t - i.lastTime >= i.frameDuration &&
									(i.updateMouseTrail(), i.curtain.render(), (i.lastTime = t));
						  }),
						  (K = requestAnimationFrame(e)))
						: cancelAnimationFrame(K);
			};
		h.length && (K = requestAnimationFrame(e));
	}
	function yt(h, e) {
		return new Promise((t) => {
			const s = setInterval(() => {
				h.local[e] && (clearInterval(s), t());
			}, 20);
		});
	}
	function W(h, e, t) {
		return h + (e - h) * t;
	}
	function bt(h) {
		switch (h) {
			case 'linear':
				return (e) => e;
			case 'easeInQuad':
				return (e) => e * e;
			case 'easeOutQuad':
				return (e) => 1 - (1 - e) * (1 - e);
			case 'easeInOutQuad':
				return (e) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);
			case 'easeInCubic':
				return (e) => e * e * e;
			case 'easeInOutCubic':
				return (e) =>
					e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
			case 'easeOutCubic':
				return (e) => 1 - Math.pow(1 - e, 3);
			case 'easeInQuart':
				return (e) => e * e * e * e;
			case 'easeOutQuart':
				return (e) => 1 - Math.pow(1 - e, 4);
			case 'easeInOutQuart':
				return (e) =>
					e < 0.5 ? 8 * e * e * e * e : 1 - Math.pow(-2 * e + 2, 4) / 2;
			case 'easeInQuint':
				return (e) => e * e * e * e * e;
			case 'easeOutQuint':
				return (e) => 1 - Math.pow(1 - e, 5);
			case 'easeInOutQuint':
				return (e) =>
					e < 0.5 ? 16 * e * e * e * e * e : 1 - Math.pow(-2 * e + 2, 5) / 2;
			case 'easeOutElastic':
				return (e) => {
					const t = (2 * Math.PI) / 3;
					return e === 0
						? 0
						: e === 1
						? 1
						: Math.pow(2, -10 * e) * Math.sin((e * 10 - 0.75) * t) + 1;
				};
			case 'easeInElastic':
				return (e) => {
					const t = (2 * Math.PI) / 3;
					return e === 0
						? 0
						: e === 1
						? 1
						: -Math.pow(2, 10 * e - 10) * Math.sin((e * 10 - 10.75) * t);
				};
			case 'easeInOutElastic':
				return (e) => {
					const t = (2 * Math.PI) / 4.5;
					return e === 0
						? 0
						: e === 1
						? 1
						: e < 0.5
						? -(Math.pow(2, 20 * e - 10) * Math.sin((20 * e - 11.125) * t)) / 2
						: (Math.pow(2, -20 * e + 10) * Math.sin((20 * e - 11.125) * t)) /
								2 +
						  1;
				};
			case 'easeInSine':
				return (e) => 1 - Math.cos((e * Math.PI) / 2);
			case 'easeOutSine':
				return (e) => Math.sin((e * Math.PI) / 2);
			case 'easeInOutSine':
				return (e) => -(Math.cos(Math.PI * e) - 1) / 2;
			case 'easeInCirc':
				return (e) => 1 - Math.sqrt(1 - Math.pow(e, 2));
			case 'easeOutCirc':
				return (e) => Math.sqrt(1 - Math.pow(e - 1, 2));
			case 'easeInOutCirc':
				return (e) =>
					e < 0.5
						? (1 - Math.sqrt(1 - Math.pow(2 * e, 2))) / 2
						: (Math.sqrt(1 - Math.pow(-2 * e + 2, 2)) + 1) / 2;
			case 'easeInExpo':
				return (e) => (e === 0 ? 0 : Math.pow(2, 10 * e - 10));
			case 'easeOutExpo':
				return (e) => (e === 1 ? 1 : 1 - Math.pow(2, -10 * e));
			case 'easeInOutExpo':
				return (e) =>
					e === 0
						? 0
						: e === 1
						? 1
						: e < 0.5
						? Math.pow(2, 20 * e - 10) / 2
						: (2 - Math.pow(2, -20 * e + 10)) / 2;
			default:
				return (e) => e;
		}
	}
	class vt {
		constructor({ prop: e, value: t, transition: s, uniformData: i }) {
			(this.prop = e),
				(this.value = t),
				(this.transition = s),
				(this.complete = !1),
				(this.progress = 0),
				(this.initialStateSet = !1),
				(this.uniformData = i),
				typeof this.value == 'object' &&
					(this.value.type === 'Vec2'
						? (this.value = new L(this.value._x, this.value._y))
						: this.value.type === 'Vec3' &&
						  (this.value = new R(
								this.value._x,
								this.value._y,
								this.value._z
						  )));
		}
		cloneVector(e) {
			let t;
			return (
				e.type === 'Vec2'
					? ((t = new L(e._x, e._y)), this.prop === 'pos' && (t.y = 1 - t.y))
					: e.type === 'Vec3' && (t = new R(e._x, e._y, e._z)),
				t
			);
		}
		initializeState(e, t) {
			if (
				(t !== void 0 &&
					(typeof t == 'object'
						? ((this.endVal = this.cloneVector(t)),
						  (this.startVal = this.cloneVector(this.value)))
						: (this.endVal = t)),
				e)
			) {
				if (typeof this.value == 'object') {
					let r;
					this.value.type === 'Vec2'
						? (r = new L(this.value._x, this.value._y))
						: this.value.type === 'Vec3' &&
						  (r = new R(this.value._x, this.value._y, this.value._z)),
						(e.value = r);
				} else e.value = this.value;
				this.initialStateSet = !0;
			}
		}
		updateEffect(e) {
			const t = typeof this.value == 'object';
			if (this.complete || !e.userData.createdAt || !this.initialStateSet)
				return !1;
			const s = performance.now(),
				i = e.uniforms[this.prop],
				r = bt(this.transition.ease),
				a = e.userData.createdAt + this.transition.delay,
				n = Math.max(0, Math.min(1, (s - a) / this.transition.duration));
			let o = this.value;
			if (n > 0 && n <= 1) {
				let l = r(n);
				t
					? ((i.value.x = W(o.x, this.endVal.x, l)),
					  this.prop === 'pos'
							? (i.value.y = W(1 - o.y, this.endVal.y, l))
							: (i.value.y = W(o.y, this.endVal.y, l)),
					  o.type === 'Vec3' && (i.value.z = W(o.z, this.endVal.z, l)))
					: (i.value = W(o, this.endVal, l));
			} else t ? (i.value = this.cloneVector(this.value)) : (i.value = this.value);
			return (
				n >= 1 && ((this.complete = !0), (this.progress = 0)),
				(this.lastTick = s),
				!0
			);
		}
		resetState() {
			(this.progress = 0), (this.complete = !1), (this.initialStateSet = !1);
		}
	}
	class wt {
		constructor({
			prop: e,
			value: t,
			range: s,
			offset: i,
			momentum: r,
			uniformData: a,
		}) {
			O(this, 'type', 'scroll');
			(this.prop = e),
				(this.value = t),
				(this.progress = 0),
				(this.momentum = r),
				(this.range = s),
				(this.offset = i),
				(this.uniformData = a),
				typeof this.value == 'object' &&
					(this.value.type === 'Vec2'
						? (this.value = new L(this.value._x, this.value._y))
						: this.value.type === 'Vec3' &&
						  (this.value = new R(
								this.value._x,
								this.value._y,
								this.value._z
						  )));
		}
		package() {
			let e = {
				id: this.id,
				prop: this.prop,
				value: this.value,
				range: this.range,
				offset: this.offset,
				momentum: this.momentum,
			};
			return (
				typeof this.value == 'object' &&
					(this.value.type === 'Vec2'
						? (e.value = {
								type: this.value.type,
								_x: this.value._x,
								_y: this.value._y,
						  })
						: this.value.type === 'Vec3' &&
						  (e.value = {
								type: 'Vec3',
								_x: this.value._x,
								_y: this.value._y,
								_z: this.value._z,
						  })),
				e
			);
		}
		cloneVector(e) {
			let t;
			return (
				e.type === 'Vec2'
					? ((t = new L(e._x, e._y)), this.prop === 'pos' && (t.y = 1 - t.y))
					: e.type === 'Vec3' && (t = new R(e._x, e._y, e._z)),
				t
			);
		}
		updateEffect(e, t, { top: s, height: i }) {
			if (t === void 0) return !1;
			this.startVal ||
				(typeof this.value == 'object'
					? (this.startVal = this.cloneVector(t))
					: (this.startVal = t));
			const r = typeof this.value == 'object',
				a = e.uniforms[this.prop],
				n = window.innerHeight,
				o = window.scrollY || window.pageYOffset,
				l = s + o - n * this.offset,
				d = l + (n + i) * this.range;
			let c = (o - l) / (d - l),
				f = this.value;
			if (!a) return !1;
			let u = Math.max(0, Math.min(1, c));
			return (
				this.lastTick !== void 0 &&
					(u = Z(u, this.lastTick, this.momentum * 2)),
				this.lastTick !== void 0 && Math.abs(this.lastTick - u) < 0.001
					? !1
					: (r
							? ((a.value.x = W(this.startVal.x, f.x, u)),
							  this.prop === 'pos'
									? (a.value.y = W(1 - this.startVal.y, f.y, u))
									: (a.value.y = W(this.startVal.y, f.y, u)),
							  this.startVal.type === 'Vec3' &&
									(a.value.z = W(this.startVal.z, f.z, u)))
							: (a.value = W(this.startVal, f, u)),
					  (this.lastTick = u),
					  !0)
			);
		}
		resetState() {
			this.lastTick = void 0;
		}
	}
	class ve {
		constructor(e, t) {
			O(this, 'local', { id: '', projectId: '' });
			(this.visible = e.visible !== void 0 ? e.visible : !e.hidden || !0),
				(this.locked = e.locked || !1),
				(this.aspectRatio = e.aspectRatio || 1),
				(this.local.sceneId = t),
				(this.local.id = be());
		}
		state() {
			return k.find((e) => e.id === this.local.sceneId) || this.initOptions;
		}
		getIndex() {
			return this.state()
				.layers.map((e) => e.local.id)
				.indexOf(this.local.id);
		}
		getPlane() {
			return this.state().curtain.planes.find(
				(e) => e.userData.id === this.local.id
			);
		}
		getPlanes() {
			return this.state().curtain.planes.filter(
				(e) => e.userData.id === this.local.id
			);
		}
		getMaskedItem() {
			return this.mask
				? this.state().layers.filter((e) => e.visible && !e.parentLayer)[
						this.getIndex() - 1
				  ]
				: !1;
		}
		getChildEffectItems() {
			if (this.effects && this.effects.length) {
				const e = this.state().layers.filter((s) =>
					this.effects.includes(s.parentLayer)
				);
				return this.effects
					.map((s) => e.find((i) => i.parentLayer === s))
					.filter((s) => s !== void 0);
			} else return [];
		}
	}
	let le = class extends ve {
		constructor(t, s, i) {
			super(t, s);
			O(this, 'isElement', !0);
			(this.initOptions = i),
				(this.opacity = t.opacity || 1),
				(this.displace = t.displace || 0),
				(this.trackMouse = t.trackMouse || 0),
				(this.axisTilt = t.axisTilt || 0),
				(this.bgDisplace = t.bgDisplace || 0),
				(this.dispersion = t.dispersion || 0),
				(this.mouseMomentum = t.mouseMomentum || 0),
				(this.blendMode = t.blendMode || 'NORMAL'),
				(this.compiledFragmentShaders = t.compiledFragmentShaders || []),
				(this.compiledVertexShaders = t.compiledVertexShaders || []);
		}
		createLocalCanvas() {
			const t = this.state(),
				s = document.createElement('canvas'),
				i = t.dpi * t.scale;
			(s.width = t.element.offsetWidth * i),
				(s.height = t.element.offsetHeight * i);
			const a =
					$([t.element.offsetWidth, t.element.offsetHeight])[0] /
					t.element.offsetWidth,
				n = s.getContext('2d');
			n.scale(i / a, i / a), (this.local.canvas = s), (this.local.ctx = n);
		}
		resize() {
			const t = this.state();
			if (this.local.canvas) {
				const s = +t.dpi * t.scale,
					r =
						$([t.element.offsetWidth, t.element.offsetHeight])[0] /
						t.element.offsetWidth;
				(this.local.canvas.width = t.canvasWidth),
					(this.local.canvas.height = t.canvasHeight),
					this.local.ctx.scale(s / r, s / r);
			}
		}
		getPositionOffset() {
			const t = this.state(),
				s = t.canvasWidth / t.canvasHeight,
				i = this.aspectRatio / s,
				r = t.canvasWidth * Math.sqrt(i),
				a = t.canvasHeight / Math.sqrt(i),
				o =
					$([t.element.offsetWidth, t.element.offsetHeight])[0] /
					t.element.offsetWidth;
			let l = (t.canvasWidth * o - r * o) / (t.dpi * 2),
				d = (t.canvasHeight * o - a * o) / (t.dpi * 2);
			this.layerType === 'image' &&
				((l += (r * o) / (t.dpi * 2)), (d += (a * o) / (t.dpi * 2)));
			let c = this.translateX + l,
				f = this.translateY + d;
			return { x: c, y: f, offX: l, offY: d };
		}
	};
	class Pt extends le {
		constructor(t, s, i) {
			super(t, s);
			O(this, 'layerType', 'shape');
			O(this, 'isElement', !0);
			this.initOptions = i;
			let r = this.default(t || {});
			for (let a in r) this[a] = r[a];
			Object.keys(t).length && (this.createLocalCanvas(), this.render());
		}
		default(t) {
			return {
				blendMode: t.blendMode || 'NORMAL',
				borderRadius: t.borderRadius || 0,
				coords: t.coords || [],
				displace: t.displace || 0,
				dispersion: t.dispersion || 0,
				bgDisplace: t.bgDisplace || 0,
				effects: t.effects || [],
				fill: t.fill || ['#777777'],
				gradientAngle: t.gradientAngle || t.gradAngle || 0,
				gradientType: t.gradientType || t.gradType || 'linear',
				mask: t.mask || 0,
				numSides: t.numSides || 3,
				opacity: t.opacity || 1,
				rotation: t.rotation || 0,
				translateX: t.translateX || 0,
				translateY: t.translateY || 0,
				type: t.type || 'rectangle',
			};
		}
		unpackage() {
			return (
				(this.fill = G(this.fill)),
				(this.coords = G(this.coords)),
				(this.effects = G(this.effects)),
				this
			);
		}
		render() {
			let t = ft(this);
			if ((this.local.ctx.beginPath(), this.type === 'rectangle')) {
				const s = Y(this.coords);
				let i = (this.borderRadius * Math.min(s.width, s.height)) / 2;
				const r = (n, o, l) => {
						const d = Math.cos(l),
							c = Math.sin(l);
						return [n * d - o * c, n * c + o * d];
					},
					a = this.rotation * 2 * Math.PI;
				if (t.length) {
					this.local.ctx.beginPath();
					let n = this.coords[0][0] < this.coords[1][0],
						o = this.coords[0][1] > this.coords[2][1],
						l = [-1, 1, -1, 1];
					n && (l = [-1, -1, -1, -1]),
						o && (l = [1, 1, 1, 1]),
						n && o && (l = [1, -1, 1, -1]);
					for (let d = 0; d < t.length; d++) {
						const [c, f] = t[d],
							[u, g] = t[(d + 1) % t.length],
							m = ((d + 1) * Math.PI) / 2 + a,
							[b, y] = r(i, 0, m);
						let _ = l[d];
						this.local.ctx.lineTo(c - b * _, f - y * _),
							this.local.ctx.arcTo(c, f, u, g, i);
					}
					this.local.ctx.closePath(), this.local.ctx.stroke();
				}
			} else if (this.type === 'circle') {
				let s = Y(t);
				const i = Y(this.coords);
				this.local.ctx.ellipse(
					s.center.x,
					s.center.y,
					i.width / 2,
					i.height / 2,
					this.rotation * Math.PI * 2,
					0,
					2 * Math.PI
				);
			} else if (this.type === 'polygon') {
				const s = this.numSides;
				if (t.length >= 2) {
					const i = Y(t),
						r = Y(this.coords),
						a = this.coords[0][1] > this.coords[2][1],
						n = i.center.y,
						o = i.center.x,
						l = (u, g, m, b, y) => {
							const _ = Math.cos(m),
								x = Math.sin(m);
							(u -= b), (g -= y);
							const v = u * _ - g * x,
								P = u * x + g * _;
							return (u = v + b), (g = P + y), [u, g];
						},
						d = (this.rotation + (a ? 0.5 : 0)) * 2 * Math.PI,
						c = (r.width / Math.sqrt(3)) * 0.86,
						f = (r.height / Math.sqrt(3)) * 0.86;
					this.local.ctx.beginPath();
					for (let u = 0; u < s; u++) {
						const m = -Math.PI / 2 + (2 * Math.PI * u) / s;
						let b = o + c * Math.cos(m),
							y = n + f * Math.sin(m);
						([b, y] = l(b, y, d, o, n)),
							u === 0
								? this.local.ctx.moveTo(b, y)
								: this.local.ctx.lineTo(b, y);
					}
					this.local.ctx.closePath();
				}
			}
			(this.local.ctx.fillStyle = xe(this.local.ctx, this, t)),
				this.local.ctx.clearRect(
					0,
					0,
					this.state().canvasWidth,
					this.state().canvasHeight
				),
				this.local.ctx.fill();
		}
	}
	class we extends ve {
		constructor(t, s, i) {
			super(t, s);
			O(this, 'layerType', 'effect');
			(this.initOptions = i),
				(this.type = t.type || 'sine'),
				(this.speed = t.speed || 0.5),
				(this.data = t.data || {}),
				(this.parentLayer = t.parentLayer || !1),
				(this.animating = t.animating || !1),
				(this.isMask = t.isMask || 0),
				(this.texture = t.texture || null),
				(this.mouseMomentum = t.mouseMomentum || 0),
				(this.compiledFragmentShaders = t.compiledFragmentShaders || []),
				(this.compiledVertexShaders = t.compiledVertexShaders || []),
				(this.states = {
					appear:
						t.states && t.states.appear
							? t.states.appear.map((r) => new vt(r))
							: [],
					scroll:
						t.states && t.states.scroll
							? t.states.scroll.map((r) => new wt(r))
							: [],
				});
			for (let r in t) this[r] || (this[r] = t[r]);
		}
		unpackage() {
			this.type === 'blur' && this.type,
				this.type === 'smoothBlur' && (this.type = 'blur'),
				this.type === 'ungulate' && (this.type = 'noise');
			for (let t in this)
				this[t] &&
					this[t].type &&
					(this[t].type === 'Vec2'
						? (this[t] = new L(this[t]._x, this[t]._y))
						: this[t].type === 'Vec3' &&
						  (this[t] = new R(this[t]._x, this[t]._y, this[t]._z)));
			return this;
		}
		getParent() {
			return this.state()
				.layers.filter((t) => t.effects && t.effects.length)
				.find((t) => t.effects.includes(this.parentLayer));
		}
	}
	class Tt extends le {
		constructor(t, s, i) {
			super(t, s);
			O(this, 'layerType', 'image');
			O(this, 'isElement', !0);
			this.initOptions = i;
			let r = this.default(t || {});
			for (let a in r) this[a] = r[a];
			Object.keys(t).length && (this.createLocalCanvas(), this.loadImage());
		}
		default(t) {
			return {
				bgDisplace: t.bgDisplace || 0,
				dispersion: t.dispersion || 0,
				effects: t.effects || [],
				size: t.size || 0.25,
				rotation: t.rotation || t.angle || 0,
				height: t.height || 50,
				fitToCanvas: t.fitToCanvas || !1,
				displace: t.displace || 0,
				repeat: t.repeat || 0,
				mask: t.mask || 0,
				rotation: t.rotation || 0,
				scaleX: t.scaleX || 1,
				scaleY: t.scaleY || 1,
				src: t.src || '',
				speed: t.speed || 0.5,
				thumb: t.thumb || '',
				translateX: t.translateX || 0,
				translateY: t.translateY || 0,
				width: t.width || 50,
			};
		}
		unpackage() {
			return (this.effects = G(this.effects)), this;
		}
		loadImage() {
			const t = new Image(),
				s = new Image();
			(t.crossOrigin = 'Anonymous'),
				(s.crossOrigin = 'Anonymous'),
				t.addEventListener(
					'load',
					() => {
						(this.local.loaded = !0),
							(this.local.fullyLoaded = !0),
							(this.local.img = t),
							(this.width = t.width),
							(this.height = t.height),
							(this.render = this.renderImage),
							this.render(),
							this.getPlane()
								? this.getPlane()
										.textures.filter((i) => i.sourceType === 'canvas')
										.forEach((i) => {
											i.needUpdate(),
												(i.shouldUpdate = !1),
												this.rendering || this.state().curtain.render();
										})
								: this.rendering || this.state().curtain.render();
					},
					!1
				),
				s.addEventListener(
					'load',
					() => {
						this.local.loaded ||
							((this.local.loaded = !0),
							(this.local.img = s),
							(this.width = s.width),
							(this.height = s.height),
							(this.render = this.renderImage),
							this.render());
					},
					!1
				),
				(t.src = this.src),
				(s.src = this.thumb);
		}
		getRelativeScale() {
			return Math.min(1080 / this.width, 1080 / this.height);
		}
		renderImage() {
			const t = this.getPositionOffset(),
				s = this.state();
			let i = t.x,
				r = t.y;
			const a = this.rotation * 360 * (Math.PI / 180),
				n = this.getRelativeScale();
			let o = this.width * n * this.scaleX,
				l = this.height * n * this.scaleY;
			const d = s.dpi * s.scale;
			if (
				(this.local.ctx.clearRect(0, 0, s.canvasWidth, s.canvasHeight),
				this.fitToCanvas)
			) {
				const f =
					$([s.element.offsetWidth, s.element.offsetHeight])[0] /
					s.element.offsetWidth;
				let u = this.width / this.height,
					g = (s.canvasWidth * f) / d,
					m = (s.canvasHeight * f) / d;
				g / m < u ? ((l = m), (o = m * u)) : ((o = g), (l = g / u)),
					(i = g / 2),
					(r = m / 2),
					this.local.ctx.save(),
					this.local.ctx.translate(i, r),
					this.local.ctx.drawImage(this.local.img, -o / 2, -l / 2, o, l),
					this.local.ctx.restore();
			} else this.local.ctx.save(), this.local.ctx.translate(i, r), this.local.ctx.rotate(a), this.local.ctx.scale(this.size, this.size), this.local.ctx.drawImage(this.local.img, -o / 2, -l / 2, o, l), this.local.ctx.restore();
		}
		render() {}
	}
	class Rt extends le {
		constructor(t, s, i, r) {
			super(t, s);
			O(this, 'layerType', 'text');
			O(this, 'isElement', !0);
			O(this, 'justCreated', !1);
			this.initOptions = r;
			let a = this.default(t || {});
			for (let n in a) this[n] = a[n];
			if (
				((this.isSafari = /^((?!chrome|android).)*safari/i.test(
					navigator.userAgent
				)),
				_t(this, r.element),
				Object.keys(t).length &&
					(this.createLocalCanvas(),
					requestAnimationFrame(() => {
						this.coords = [
							[-2, 0],
							[-2 + this.width, 0],
							[-2 + this.width, 0 + this.height],
							[-2, 0 + this.height],
						];
					})),
				i)
			)
				(this.local.loaded = !0),
					this.render(),
					this.state().renderNFrames(2),
					this.getPlane() &&
						this.getPlane()
							.textures.filter((n) => n.sourceType === 'canvas')
							.forEach((n) => {
								n.needUpdate();
							});
			else {
				const n = new FontFace(this.fontFamily, `url(${this.fontCSS.src})`, {
					style: this.fontStyle.includes('italic') ? 'italic' : 'normal',
					weight: isNaN(parseInt(this.fontStyle))
						? 400
						: parseInt(this.fontStyle),
				});
				document.fonts.add(n),
					n.load().then(() => {
						this.render(),
							this.state().renderNFrames(2),
							(this.local.loaded = !0),
							this.getPlane() &&
								this.getPlane()
									.textures.filter((o) => o.sourceType === 'canvas')
									.forEach((o) => {
										o.needUpdate();
									});
					});
			}
		}
		default(t) {
			return {
				bgDisplace: t.bgDisplace || 0,
				dispersion: t.dispersion || 0,
				effects: t.effects || [],
				fill: t.fill || ['#ffffff'],
				highlight: t.highlight || ['transparent'],
				fontSize: t.fontSize || 24,
				fontCSS: t.fontCSS || null,
				lineHeight: t.lineHeight || 25,
				letterSpacing: t.letterSpacing || 0,
				mask: t.mask || 0,
				fontFamily: t.fontFamily || 'arial',
				fontStyle: t.fontStyle || 'normal',
				fontWeight: t.fontWeight || 'normal',
				textAlign: t.textAlign || 'left',
				textContent: t.textContent || '',
				gradientAngle: t.gradientAngle || t.gradAngle || 0,
				gradientType: t.gradientType || t.gradType || 'linear',
				coords: t.coords || [],
				rotation: t.rotation || 0,
				translateX: t.translateX || 0,
				translateY: t.translateY || 0,
				width: t.width || 200,
				height: t.height || 50,
			};
		}
		unpackage() {
			return (
				(this.fill = G(this.fill)),
				(this.highlight = G(this.highlight)),
				(this.coords = G(this.coords)),
				(this.effects = G(this.effects)),
				this
			);
		}
		render() {
			const t = this.getPositionOffset();
			let s = t.x,
				i = t.y,
				r = 0,
				a = this.width,
				n = this.height,
				o = this.fontSize > 0 ? this.fontSize : 0,
				l = this.lineHeight > 0 ? this.lineHeight : 0,
				d = this.fontStyle.includes('italic') ? 'italic' : 'normal',
				c = '400';
			(this.local.textBoxPos = { x: s, y: i }),
				this.local.ctx.clearRect(
					0,
					0,
					this.state().canvasWidth,
					this.state().canvasHeight
				),
				(this.local.ctx.font = `${d} ${c} ${o}px/${l}px ${this.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`),
				this.isSafari ||
					((this.local.ctx.textAlign = this.textAlign),
					(this.local.ctx.letterSpacing = this.letterSpacing + 'px'));
			const f = this.local.ctx.measureText('m').width;
			(a = Math.max(a, f)),
				this.local.ctx.save(),
				this.local.ctx.translate(s + a / 2, i + n / 2),
				this.local.ctx.rotate((this.rotation * 360 * Math.PI) / 180),
				this.local.ctx.translate(-(s + a / 2), -(i + n / 2)),
				this.textAlign === 'center' && (s += a / 2),
				this.textAlign === 'right' && (s += a),
				(this.local.ctx.fillStyle = xe(this.local.ctx, this, this.coords));
			const u = (_, x, v, P, w, T, A) => {
					let E = x
							.split('')
							.reduce(
								(S, I, H) =>
									S + _.measureText(I).width + (H < x.length - 1 ? w : 0),
								0
							),
						M;
					if (
						(T === 'center' ? (M = v + (A - E) / 2 - A / 2) : (M = v),
						T === 'right')
					)
						for (let S = x.length - 1; S >= 0; S--) {
							const I = x[S];
							(M -= _.measureText(I).width),
								_.fillText(I, M, P),
								S > 0 && (M -= w);
						}
					else
						for (let S = 0; S < x.length; S++)
							_.fillText(x[S], M, P), (M += _.measureText(x[S]).width + w);
				},
				g = (_, x) => {
					let v = i + l * x + l / 2 + o / 3;
					this.isSafari
						? u(this.local.ctx, _, s, v, this.letterSpacing, this.textAlign, a)
						: this.local.ctx.fillText(_, s, v);
				},
				m = this.textContent
					? this.textContent.split(`
`)
					: [''];
			let b = m.length;
			const y = (_, x, v) =>
				x
					.split('')
					.reduce(
						(w, T, A) => (
							(w += _.measureText(T).width), A < x.length - 1 && (w += v), w
						),
						0
					);
			for (let _ = 0; _ < b; _++) {
				let x = '',
					v = m[_].split(/(\s|\n)/);
				for (let P = 0; P < v.length; P++) {
					const w = v[P],
						T = x + w;
					if (
						(this.isSafari && this.letterSpacing
							? y(this.local.ctx, T, this.letterSpacing)
							: this.local.ctx.measureText(T).width) > a ||
						w ===
							`
`
					) {
						if (x !== '')
							(m[_] = x.trim()),
								P !== v.length - 1
									? (m.splice(_ + 1, 0, v.slice(P).join('')), b++)
									: w !==
											`
` && m.push(w);
						else {
							let E = w,
								M = _;
							for (; E.length > 0; ) {
								let S = '';
								for (
									let I = 0;
									I < E.length &&
									(this.local.ctx.measureText(S + E[I]).width <= a || I == 0);
									I++
								)
									S += E[I];
								(E = E.slice(S.length)),
									(m[M] = S.trim()),
									E.length > 0 && (m.splice(M + 1, 0, E), M++, b++);
							}
							v.slice(P + 1).length > 0 && (m[M] += v.slice(P + 1).join(''));
						}
						break;
					} else x = T;
					P === v.length - 1 && (m[_] = x.trim());
				}
			}
			m.forEach((_, x) => {
				g(_, r), x < m.length - 1 && r++;
			}),
				this.local.ctx.translate(-(s + a / 2), -(i + n / 2)),
				this.local.ctx.restore(),
				(this.height = this.lineHeight * r + this.lineHeight);
		}
	}
	function St() {
		document[se] ? cancelAnimationFrame(K) : oe();
	}
	function Mt() {
		k.forEach((h) => {
			h.refresh();
		});
	}
	let Pe = window.scrollY;
	function Et(h) {
		const e = k.filter((s) => s.getAnimatingEffects().length),
			t = k.filter((s) => s.rendering);
		e.length && !t.length && oe(),
			t.length &&
				t.forEach((s) => {
					s.mouse.movePos.y += (window.scrollY - Pe) / 2;
				}),
			(Pe = window.scrollY);
	}
	function At() {
		k.forEach((h) => {
			h.isInView &&
				h.curtain.planes.find((e) => e.uniforms.mousePos) &&
				((he() &&
					h.interactivity &&
					h.interactivity.mouse &&
					h.interactivity.mouse.disableMobile) ||
					((h.mouse.pos.y = h.mouse.movePos.y),
					(h.mouse.pos.x = h.mouse.movePos.x),
					(h.mouse.lastPos.x = h.mouse.pos.x),
					(h.mouse.lastPos.y = h.mouse.pos.y)));
		});
	}
	function Te(h) {
		k
			.filter((e) => e.isInView)
			.forEach((e) => {
				let t = e.bbox,
					s,
					i;
				h.targetTouches
					? ((s = h.targetTouches[0].pageX), (i = h.targetTouches[0].pageY))
					: ((s = h.pageX), (i = h.pageY));
				const r = { x: t.left / 2, y: (t.top + e.scrollY) / 2 },
					a = s / 2 - r.x,
					n = i / 2 - r.y;
				(e.mouse.movePos.x = a), (e.mouse.movePos.y = n);
			}),
			(ye = !0);
	}
	const k = [];
	class Ct {
		constructor(e) {
			O(this, 'scrollY', 0);
			(this.id = e.id),
				(this.projectId = e.projectId),
				(this.canvasWidth =
					e.width || e.element.offsetWidth || window.innerWidth),
				(this.canvasHeight =
					e.height || e.element.offsetHeight || window.innerHeight),
				(this.curtain = void 0),
				(this.curtainRafId = void 0),
				(this.dpi = +e.dpi || Math.min(1.5, window.devicePixelRatio)),
				(this.element = e.element),
				(this.fps = e.fps || 60),
				(this.name = e.name),
				(this.frameDuration = Math.floor(1e3 / (e.fps || 60))),
				(this.layers = e.layers),
				(this.lazyLoad = e.lazyLoad),
				(this.initialized = !1),
				(this.lasTick = null),
				(this.isInView = !1),
				(this.lastTime = 0),
				(this.rendering = !1),
				(this.bbox = {}),
				(this.interactivity = { mouse: { disableMobile: !1 } }),
				(this.mouse = {
					downPos: { x: 0, y: 0 },
					movePos: { x: window.innerWidth / 4, y: window.innerHeight / 4 },
					lastPos: { x: window.innerWidth / 4, y: window.innerHeight / 4 },
					delta: { x: 0, y: 0 },
					dragging: !1,
					trail: [],
					recordTrail: !1,
					pos: { x: window.innerWidth / 4, y: window.innerHeight / 4 },
				}),
				(this.renderingScale = e.renderingScale || 1),
				(this.scale = e.scale || 1),
				(this.size = 'Square'),
				(this.split = !1),
				(this.versionId = ''),
				e.width &&
					e.height &&
					((this.element.style.width = e.width + 'px'),
					(this.element.style.height = e.height + 'px')),
				(this.bbox = this.element.getBoundingClientRect()),
				this.createCurtains(),
				this.setCanvasScale(),
				(this.textureLoader = new pe(this.curtain)),
				(this.preloadedTextures = {});
		}
		preloadTextures() {
			this.layers.forEach((e) => {
				e.local &&
					e.local.canvas &&
					this.preloadCanvasTexture(e, e.local.canvas);
			});
		}
		preloadCanvasTexture(e, t) {
			this.textureLoader.loadCanvas(
				t,
				{ sampler: 'uTexture', premultiplyAlpha: !0 },
				(s) => {
					e.preloadedTexture = s;
				},
				(s, i) => {
					console.error('Error loading canvas texture:', i);
				}
			);
		}
		setCanvasScale() {
			(this.canvasWidth = this.element.offsetWidth * this.dpi * this.scale),
				(this.canvasHeight = this.element.offsetHeight * this.dpi * this.scale);
		}
		destroy() {
			this.element && this.element.setAttribute('data-us-initialized', ''),
				this.curtain.dispose();
		}
		resize() {
			this.setCanvasScale(),
				this.layers
					.filter((e) => e.isElement)
					.forEach((e) => {
						e.resize(),
							e.getPlane() &&
								e
									.getPlane()
									.textures.filter((t) => t.sourceType === 'canvas')
									.forEach((t) => {
										t.needUpdate();
									});
					}),
				this.layers
					.filter((e) => e.render)
					.forEach((e) => {
						e.render();
					}),
				this.curtain.resize(),
				(this.bbox = this.element.getBoundingClientRect());
		}
		refresh() {
			(this.initialized = !1),
				this.curtain.planes.forEach((e) => {
					e.remove();
				}),
				this.layers
					.filter((e) => {
						var t;
						return (t = e.states) == null ? void 0 : t.scroll.length;
					})
					.forEach((e) => {
						e.states.scroll.forEach((t) => {
							t.resetState();
						});
					}),
				(this.lazyLoad = !0),
				requestAnimationFrame(() => {
					this.resize(),
						this.preloadTextures(),
						this.isInView &&
							((this.scrollY = window.scrollY || window.pageYOffset),
							requestAnimationFrame(() => {
								this.initializePlanes();
							}));
				});
		}
		updateMouseTrail() {
			ye &&
				(this.mouse.trail.unshift([
					this.mouse.pos.x / (this.bbox.width * 0.5),
					1 - this.mouse.pos.y / (this.bbox.height * 0.5),
				]),
				this.mouse.trail.length > 4 && this.mouse.trail.pop());
		}
		getScaleFactor(e) {
			return {
				x: Math.sqrt(this.canvasWidth / this.canvasHeight / e),
				y: Math.sqrt((this.canvasHeight / this.canvasWidth) * e),
			};
		}
		getAnimatingEffects() {
			return this.layers.filter((e) => Q(e) && e.visible);
		}
		createCurtains() {
			const e = new De({
				container: this.element,
				premultipliedAlpha: !0,
				antialias: !1,
				autoRender: !1,
				autoResize: !1,
				watchScroll: !1,
				renderingScale: Math.min(Math.max(0.25, this.renderingScale), 1),
				production: !0,
				pixelRatio: this.dpi,
			});
			(this.scrollY = window.scrollY || window.pageYOffset),
				document
					.querySelectorAll(
						`[data-us-text="loading"][data-us-project="${this.id}"]`
					)
					.forEach((t) => {
						t.style.position = 'absolute';
					}),
				(this.curtain = e);
		}
		fullRedraw() {
			(this.fullRedrawEnabled = !0),
				this.curtain.render(),
				(this.fullRedrawEnabled = !1);
		}
		renderNFrames(e, t) {
			let s = 0;
			const i = () => {
				this.curtain.render(),
					s < e ? (s++, requestAnimationFrame(i)) : t && t();
			};
			this.rendering || i();
		}
		setInteractiveParams(e, t) {
			let s = { mouse: { disableMobile: !1 } };
			t &&
				t.mouse &&
				'disableMobile' in t.mouse &&
				(s.mouse.disableMobile = t.mouse.disableMobile),
				e &&
					e.interactivity &&
					e.interactivity.mouse &&
					'disableMobile' in e.interactivity.mouse &&
					(s.mouse.disableMobile = e.interactivity.mouse.disableMobile),
				(this.interactivity = s);
		}
		getSplitOrderedItems() {
			let e = this.getOrderedItems(),
				t = 0,
				s = e[t];
			if (s) {
				let i = s.parentLayer ? s.getParent() : null,
					r = i && Q(i),
					a =
						i &&
						i.effects &&
						i.effects.length &&
						i.getChildEffectItems().filter((n) => Q(n)).length;
				for (; s && !Q(s) && !r && !a; )
					t++,
						(s = e[t]),
						s &&
							((i = s.parentLayer ? s.getParent() : null),
							(r = i && Q(i)),
							(a =
								i &&
								i.effects &&
								i.effects.length &&
								i.getChildEffectItems().filter((n) => Q(n)).length));
				return {
					static: this.getOrderedItems().splice(0, t),
					dynamic: this.getOrderedItems().splice(t),
				};
			} else return { static: [], dynamic: [] };
		}
		initializePlanes(e) {
			(this.initializing = !0),
				this.handleItemPlanes(() => {
					document
						.querySelectorAll(
							`[data-us-text="loading"][data-us-project="${this.id}"]`
						)
						.forEach((t) => {
							t.style.color = 'transparent';
						}),
						this.handlePlaneCreation(),
						e && e(this);
				});
		}
		getPassPlane(e, t) {
			return this.curtain.planes.find(
				(s) => s.userData.id === e.local.id && s.userData.passIndex === t
			);
		}
		getRenderTargets() {
			return this.curtain.renderTargets.filter((e) => e.userData.id);
		}
		getPlanes() {
			return this.curtain.planes.filter((e) => e.type !== 'PingPongPlane');
		}
		removeUnusedPlanes() {
			this.curtain.planes.forEach((e) => {
				e.remove();
			}),
				this.curtain.renderTargets.forEach((e) => {
					e.remove();
				});
		}
		getPlaneParams(e, t) {
			let s = ['noise', 'noiseField', 'sine', 'ripple', 'bulge'].includes(
				e.type
			)
				? 500
				: 1;
			const i = {
				resolution: {
					name: 'uResolution',
					type: '2f',
					value: new L(this.canvasWidth, this.canvasHeight),
				},
				mousePos: { name: 'uMousePos', type: '2f', value: new L(0.5) },
				time: { name: 'uTime', type: '1f', value: 0 },
				dpi: {
					name: 'uDpi',
					type: '1f',
					value: this.dpi * +this.renderingScale,
				},
			};
			e.isElement && (i.sampleBg = { name: 'uSampleBg', type: '1i', value: 1 }),
				e.type === 'mouse' &&
					(i.previousMousePos = {
						name: 'uPreviousMousePos',
						type: '2f',
						value: new L(0.5),
					}),
				e.states &&
					[...e.states.appear, ...e.states.scroll].forEach((n) => {
						i[n.prop] ||
							((i[n.prop] = n.uniformData), (i[n.prop].value = n.value));
					});
			let r = e.compiledFragmentShaders[t] || e.compiledFragmentShaders[0],
				a = e.compiledVertexShaders[t] || e.compiledVertexShaders[0];
			return {
				crossOrigin: '',
				fragmentShader: r,
				vertexShader: a,
				widthSegments: s,
				heightSegments: s,
				texturesOptions: { floatingPoint: 'half-float', premultiplyAlpha: !0 },
				uniforms: i,
			};
		}
		createPlane(e, t, s) {
			var a;
			let i;
			e.isElement
				? (i = this.getPlaneParams(e))
				: (i = this.getPlaneParams(e, s ? s.index : null)),
				(i.watchScroll = !1),
				((a = e.data) != null && a.downSample && !s) ||
				(s != null && s.downSample)
					? ((this.curtain.renderer._renderingScale = this.scale * 0.5),
					  this.curtain.renderer.setSize())
					: ((this.curtain.renderer._renderingScale = this.scale),
					  this.curtain.renderer.setSize());
			const r = new _e(this.curtain, this.curtain.container, i);
			return (
				(r.textures.length = 0),
				(r.userData.id = e.local.id),
				(r.userData.layerType = e.layerType),
				(r.userData.type = e.type),
				r.setRenderOrder(t),
				r
			);
		}
		createPingPongPlane(e, t, s) {
			let i = this.getPlaneParams(e, 1);
			const r = new lt(this.curtain, this.curtain.container, i),
				a = e.getParent();
			if (r)
				return (
					(r.userData.id = e.local.id),
					(r.userData.pingpong = !0),
					r.setRenderOrder(t),
					this.setInitialEffectPlaneUniforms(r, e, a, s),
					r
						.onReady(() => {
							r.userData.isReady = !0;
						})
						.onRender(() => {
							this.setEffectPlaneUniforms(r, e);
						}),
					r
				);
		}
		createEffectPlane(e, t, s) {
			const i = this.createPlane(e, t, s),
				r = e.getParent();
			i &&
				(s
					? ((i.userData.passIndex = s.index),
					  (i.userData.downSample = s.downSample),
					  (i.userData.includeBg = s.includeBg),
					  (i.userData.length = e.data.passes.length),
					  Object.entries(s).forEach(([a, n]) => {
							i.uniforms[a] && (i.uniforms[a].value = n);
					  }))
					: (i.userData.downSample = e.data.downSample),
				this.setInitialEffectPlaneUniforms(i, e, r, s),
				i
					.onReady(() => {
						i.userData.isReady = !0;
					})
					.onRender(() => this.setEffectPlaneUniforms(i, e)));
		}
		createElementPlane(e, t) {
			const s = this.createPlane(e, t);
			s &&
				s
					.onReady(() => {
						s.userData.isReady = !0;
					})
					.onRender(() => this.setElementPlaneUniforms(s, e));
		}
		handleEffectPlane(e, t, s) {
			const i =
				'passIndex' in s ? this.getPassPlane(e, s.passIndex) : e.getPlane();
			let r = this.getRenderTargets()[t - 1],
				a = this.curtain.planes.find(
					(o) => o.type === 'PingPongPlane' && o.userData.id === e.local.id
				);
			a &&
				i &&
				i.createTexture({
					sampler: 'uPingPongTexture',
					fromTexture: a.getTexture(),
				}),
				r &&
					i &&
					i.createTexture({ sampler: 'uTexture', fromTexture: r.getTexture() }),
				s.passIndex > 0 &&
					i &&
					this.getRenderTargets()[t - (1 + s.passIndex)] &&
					i.createTexture({
						sampler: 'uBgTexture',
						fromTexture:
							this.getRenderTargets()[t - (1 + s.passIndex)].getTexture(),
					});
			const n = e.texture || e.data.texture;
			n &&
				((i.userData.textureLoaded = !1),
				i.loadImage(n.src, { sampler: n.sampler }, (o) => {
					(i.userData.textureLoaded = !0), this.curtain.render();
				}));
		}
		handleElementPlane(e, t) {
			const s = e.getPlane(),
				i = e.getChildEffectItems();
			let r = this.getRenderTargets()[t - 1];
			if (
				(i.length || (s.textures.length = 0),
				r && i.length && s
					? s.createTexture({
							sampler: 'uTexture',
							premultipliedAlpha: !0,
							fromTexture: r.getTexture(),
					  })
					: s && s.addTexture(e.preloadedTexture),
				r)
			) {
				if (i.length) {
					let a = i.reduce((o, l) => o + l.getPlanes().length, 0);
					const n = i.filter((o) => o.type === 'mouse').length;
					r = this.getRenderTargets()[t - (1 + a - n)];
				}
				r &&
					s.createTexture({
						sampler: 'uBgTexture',
						premultipliedAlpha: !0,
						fromTexture: r.getTexture(),
					});
			}
		}
		handleChildEffectPlane(e, t, s) {
			const i =
					'passIndex' in s ? this.getPassPlane(e, s.passIndex) : e.getPlane(),
				r = e.getParent();
			let a = this.getRenderTargets()[t - 1],
				n = this.curtain.planes.find(
					(u) => u.type === 'PingPongPlane' && u.userData.id === e.local.id
				),
				o = r.effects.filter((u) => {
					if (this.layers.find((g) => g.parentLayer === u))
						return this.layers.find((g) => g.parentLayer === u).visible;
				}),
				l = o.indexOf(e.parentLayer),
				d = o.at(-1) === o[l],
				c = s.passIndex === s.length;
			n &&
				e.type === 'mouse' &&
				i.createTexture({
					sampler: 'uPingPongTexture',
					fromTexture: n.getTexture(),
				}),
				i.userData.includeBg && i.addTexture(r.preloadedTexture),
				i && a && (l || s.passIndex > 0)
					? (e.isMask &&
							(!s.length || (d && c)) &&
							i.addTexture(r.preloadedTexture),
					  i.createTexture({
							sampler: 'uTexture',
							premultipliedAlpha: !0,
							fromTexture: a.getTexture(),
					  }))
					: i && e.isMask
					? (d && c && i.addTexture(r.preloadedTexture),
					  a &&
							i.createTexture({
								sampler: 'uTexture',
								premultipliedAlpha: !0,
								fromTexture: a.getTexture(),
							}))
					: i && i.addTexture(r.preloadedTexture),
				e.type === 'custom' &&
					i.createTexture({
						sampler: 'uCustomTexture',
						premultipliedAlpha: !0,
						fromTexture: this.getRenderTargets()[t],
					});
			const f = e.texture || e.data.texture;
			f &&
				((i.userData.textureLoaded = !1),
				i.loadImage(f.src, { sampler: f.sampler }, (u) => {
					(i.userData.textureLoaded = !0), this.curtain.render();
				}));
		}
		createPlanes() {
			this.getOrderedItems().forEach((e, t) => {
				e.getPlanes().length
					? e.getPlanes().forEach((s) => s.setRenderOrder(t))
					: e.isElement
					? this.createElementPlane(e, t)
					: this.createEffectPlanes(e, t);
			});
		}
		createEffectPlanes(e, t) {
			const s = e.data;
			s.passes && s.passes.length
				? (this.createEffectPlane(e, t, {
						index: 0,
						length: s.passes.length + 1,
						downSample: s.downSample,
				  }),
				  s.passes.forEach((i, r) => {
						this.createEffectPlane(e, t, {
							index: r + 1,
							length: s.passes.length + 1,
							downSample: i.downSample,
							[i.prop]: i.value,
							includeBg: i.includeBg,
						});
				  }))
				: (this.createEffectPlane(e, t),
				  e.type === 'mouse' && this.createPingPongPlane(e, t));
		}
		createTextures() {
			const e = this.getPlanes()
					.filter((s) => s.visible)
					.sort((s, i) => s.renderOrder - i.renderOrder),
				t = e.length;
			for (let s = 0; s < t; s++) {
				const i = e[s];
				let r = this.layers.find((a) => a.local.id === i.userData.id);
				s < t - 1 && this.assignRenderTargetToPlane(e, s, r, i),
					this.handleTextures(r, s, i.userData);
			}
		}
		assignRenderTargetToPlane(e, t, s, i) {
			let r = this.getTextureParams(e, t, s),
				a = this.getRenderTargets()[t] || new ne(this.curtain, r);
			(a.userData.id = i.userData.id), i.setRenderTarget(a);
		}
		handleTextures(e, t, s) {
			e.isElement
				? this.handleElementPlane(e, t)
				: e.parentLayer
				? this.handleChildEffectPlane(e, t, s)
				: this.handleEffectPlane(e, t, s);
		}
		handleItemPlanes(e) {
			this.createPlanes(), this.createTextures(), this.checkIfReady(e);
		}
		isNotReady(e) {
			const t = this.layers.find((n) => n.local.id === e.userData.id),
				s = t.layerType === 'image' && !t.local.loaded,
				i = t.layerType === 'text' && !t.local.loaded,
				r = 'textureLoaded' in e.userData && !e.userData.textureLoaded;
			return (this.split ? s || i || r : !1) || !e.userData.isReady;
		}
		checkIfReady(e) {
			const t = () => {
				this.curtain.planes.filter((s) => this.isNotReady(s)).length
					? (this.curtain.render(), requestAnimationFrame(t))
					: e();
			};
			t();
		}
		setInitialEffectPlaneUniforms(e, t, s, i) {
			if (!e.userData.initialUniformsSet || !e.userData.isReady) {
				for (let r in e.uniforms) r in t && (e.uniforms[r].value = t[r]);
				s &&
					i &&
					i.index < i.length - 1 &&
					e.uniforms.isMask &&
					(e.uniforms.isMask.value = 0),
					t.states &&
						t.states.appear.length &&
						t.states.appear.forEach((r) => {
							e.uniforms[r.prop] &&
								r.initializeState(e.uniforms[r.prop], t[r.prop]);
						}),
					s && t.isMask && (t.mouseMomentum = s.mouseMomentum),
					(e.userData.initialUniformsSet = !0);
			}
		}
		handleStateEffects(e, t) {
			if (
				(this.isInView &&
					!e.userData.createdAt &&
					(e.userData.createdAt = performance.now()),
				!t.states || ![...t.states.appear, ...t.states.scroll].length)
			)
				return !1;
			t.states.appear.forEach((s) => {
				s.updateEffect(e);
			}),
				t.states.scroll.forEach((s) => {
					let i = this.element.getBoundingClientRect();
					s.updateEffect(e, t[s.prop], { top: i.top, height: i.height });
				});
		}
		setElementPlaneUniforms(e, t) {
			let s = this.element.offsetWidth * 0.5,
				i = this.element.offsetHeight * 0.5;
			if (e.uniforms.mousePos) {
				let r = this.mouse.pos.x,
					a = this.mouse.pos.y,
					n = r / s,
					o = 1 - a / i;
				if (t.mouseMomentum && t.type !== 'mouse') {
					t.local.lastMousePos || (t.local.lastMousePos = { x: n, y: o });
					let l = t.local.lastMousePos.x * s,
						d = (1 - t.local.lastMousePos.y) * i;
					(r = Z(r, l, t.mouseMomentum * 2)),
						(a = Z(a, d, t.mouseMomentum * 2)),
						(t.local.lastMousePos.x = r / s),
						(t.local.lastMousePos.y = 1 - a / i);
				}
				(e.uniforms.mousePos.value.x = r / s),
					(e.uniforms.mousePos.value.y = 1 - a / i);
			}
			(e.uniforms.resolution.value.x = this.curtain.canvas.width),
				(e.uniforms.resolution.value.y = this.curtain.canvas.height),
				e.uniforms.sampleBg &&
					(e.renderOrder === 0
						? (e.uniforms.sampleBg.value = 0)
						: (e.uniforms.sampleBg.value = 1)),
				!e.userData.isReady &&
					!t.compiledFragmentShaders.length &&
					((e.uniforms.opacity.value = t.visible ? t.opacity : 0),
					(e.uniforms.trackMouse.value = t.trackMouse || 0),
					e.uniforms.displace &&
						((e.uniforms.displace.value = t.displace),
						(e.uniforms.bgDisplace.value = t.bgDisplace),
						(e.uniforms.dispersion.value = t.dispersion)),
					e.uniforms.blendMode &&
						(e.uniforms.blendMode.value = Object.keys(ct).indexOf(t.blendMode)),
					e.uniforms.mask &&
						'mask' in t &&
						((e.uniforms.mask.value = t.mask),
						(e.uniforms.maskAlpha.value = t.maskAlpha || 0),
						(e.uniforms.maskBackground.value.x = t.maskBackground.x),
						(e.uniforms.maskBackground.value.y = t.maskBackground.y),
						(e.uniforms.maskBackground.value.z = t.maskBackground.z)));
		}
		setEffectPlaneUniforms(e, t) {
			t.animating &&
				e.uniforms.time &&
				(e.uniforms.time.value += ((t.speed || 1) * 60) / this.fps),
				this.handleStateEffects(e, t);
			let s = this.bbox.width / 2,
				i = this.bbox.height / 2;
			if (e.uniforms.mousePos) {
				let r = this.mouse.pos.x,
					a = this.mouse.pos.y;
				if (t.mouseMomentum && t.type !== 'mouse') {
					t.local.lastMousePos ||
						(t.local.lastMousePos = { x: r / s, y: 1 - a / i });
					let n = t.local.lastMousePos.x * s,
						o = (1 - t.local.lastMousePos.y) * i;
					(r = Z(r, n, t.mouseMomentum * 2)),
						(a = Z(a, o, t.mouseMomentum * 2)),
						(t.local.lastMousePos.x = r / s),
						(t.local.lastMousePos.y = 1 - a / i);
				}
				(e.uniforms.mousePos.value.x = r / s),
					(e.uniforms.mousePos.value.y = 1 - a / i);
			}
			e.uniforms.previousMousePos &&
				(this.mouse.trail.length > 2
					? ((e.uniforms.previousMousePos.value.x = this.mouse.trail.at(2)[0]),
					  (e.uniforms.previousMousePos.value.y = this.mouse.trail.at(2)[1]))
					: ((e.uniforms.previousMousePos.value.x =
							e.uniforms.mousePos.value.x),
					  (e.uniforms.previousMousePos.value.y =
							e.uniforms.mousePos.value.y))),
				(e.uniforms.resolution.value.x = this.curtain.canvas.width),
				(e.uniforms.resolution.value.y = this.curtain.canvas.height);
		}
		getOrderedItems() {
			let e = [];
			return (
				this.layers
					.filter((t) => !t.parentLayer && t.visible)
					.forEach((t) => {
						t.effects && t.effects.length && e.push(...t.getChildEffectItems()),
							e.push(t);
					}),
				e
			);
		}
		getTextureParams(e, t, s) {
			var n;
			const r = e[t].userData.downSample ? 0.5 : 1,
				a = {
					maxWidth: this.curtain.canvas.width,
					maxHeight: this.curtain.canvas.height,
					depth:
						((n = s == null ? void 0 : s.data) == null ? void 0 : n.depth) ||
						(s == null ? void 0 : s.type) === 'bulge',
				};
			return (
				r &&
					((a.maxWidth = this.canvasWidth * r),
					(a.maxHeight = this.canvasHeight * r)),
				a
			);
		}
		cloneCanvas(e) {
			const t = document.createElement('canvas');
			(t.width = e.width), (t.height = e.height);
			const s = t.getContext('2d'),
				i = this.scale;
			return s.scale(i, i), s.drawImage(e, 0, 0), t;
		}
		handlePlaneCreation() {
			this.layers
				.filter((e) => e.isElement)
				.forEach((e) => {
					e.render(),
						e.getPlane() &&
							e
								.getPlane()
								.textures.filter((t) => t.sourceType === 'canvas')
								.forEach((t) => {
									t.needUpdate(), (t.shouldUpdate = !1);
								});
				}),
				(this.initialized = !0),
				(this.initializing = !1),
				this.rendering || (this.fullRedraw(), this.renderNFrames(2)),
				this.removePlanes(),
				this.curtain.setPixelRatio(
					Math.min(Math.min(this.dpi || 1.5, 2), this.dpi)
				),
				oe();
		}
		async removePlanes() {
			const e = this.getSplitOrderedItems();
			e.dynamic.length || e.static.pop();
			for (const t of e.static) {
				const s = t.layerType === 'text' && !t.local.loaded,
					i = t.layerType === 'image' && !t.local.fullyLoaded;
				(s || i) && (await yt(t, s ? 'loaded' : 'fullyLoaded'));
				const r = t.getPlanes();
				for (const a of r) a.remove(), a.uuid, r.at(-1).uuid;
			}
		}
	}
	function It(h) {
		return typeof HTMLElement == 'object'
			? h instanceof HTMLElement
			: h &&
					typeof h == 'object' &&
					h !== null &&
					h.nodeType === 1 &&
					typeof h.nodeName == 'string';
	}
	function Lt() {
		window.addEventListener('mousemove', Te),
			window.addEventListener('touchmove', Te),
			window.addEventListener('scroll', Et),
			window.addEventListener('routeChange', xt),
			he() || window.addEventListener('resize', ut(Mt, 100)),
			document.addEventListener(ie, St, !1);
	}
	function Ft(h, e, t) {
		return (
			$([h.offsetWidth, h.offsetHeight]),
			{
				canvasWidth: h.offsetWidth * t,
				canvasHeight: h.offsetHeight * t,
				scale: e,
				dpi: t,
				element: h,
			}
		);
	}
	function zt() {
		k.forEach((h) => {
			h.destroy();
		}),
			(k.length = 0);
	}
	function kt(h, e, t, s, i) {
		let r;
		if (t) {
			if (((r = t), document.getElementById(t))) {
				let a = JSON.parse(document.getElementById(t).innerText);
				if (a.options && a.history) return a;
				s(new Error(`Did not find valid JSON inside ${t}`));
			}
		} else {
			let a = 'https://storage.googleapis.com/unicornstudio-production';
			(i || (e != null && e.includes('production=true'))) &&
				((a = 'https://assets.unicorn.studio'), (e = `v=${Date.now()}`)),
				(r = `${a}/embeds/${h}${e ? '?' + e : ''}`);
		}
		return fetch(r)
			.then((a) => a.json())
			.then((a) => a)
			.catch((a) => console.error('Error fetching data:', a));
	}
	let de;
	function Dt() {
		de ||
			(de = new IntersectionObserver(
				(h) => {
					h.forEach((e) => {
						const t = e.target.getAttribute('data-scene-id'),
							s = k.find((i) => i.id === t);
						s &&
							(e.isIntersecting
								? ((s.isInView = !0),
								  s.lazyLoad &&
										!s.initialized &&
										!s.initializing &&
										s.initializePlanes())
								: (s.isInView = !1));
					});
				},
				{ threshold: 0.001 }
			));
	}
	function Re(h) {
		Dt();
		let e = h.projectId ? h.projectId.split('?')[0] : null,
			t = h.projectId ? h.projectId.split('?')[1] : null;
		return new Promise((s, i) => {
			kt(e, t, h.filePath, i, h.production)
				.then((r) => {
					const a = r.options || {},
						n = It(h.element)
							? h.element
							: document.getElementById(h.elementId);
					if (!n) {
						i(
							new Error(
								`Couldn't find an element with id '${h.elementId}' on the page.`
							)
						);
						return;
					}
					const o = be();
					n.setAttribute('data-scene-id', o);
					const l = pt(
						r.history,
						o,
						Ft(
							n,
							h.scale || a.scale || 1,
							h.dpi || Math.min(1.5, window.devicePixelRatio)
						)
					);
					gt(l.filter((c) => c.layerType === 'text'));
					const d = new Ct({
						id: o,
						fps: h.fps || a.fps || 60,
						dpi: h.dpi,
						name: a.name,
						projectId: e || h.filePath.split('.')[0],
						renderingScale: h.scale || a.scale || 1,
						element: n,
						lazyLoad: h.lazyLoad,
						width: h.width,
						height: h.height,
					});
					h.altText && (d.curtain.canvas.innerText = h.altText),
						h.ariaLabel &&
							d.curtain.canvas.setAttribute('aria-label', h.ariaLabel),
						d.curtain.canvas.setAttribute('role', 'image'),
						(a.freePlan || a.includeLogo) && mt(o, n),
						k.push(d),
						(d.layers = l),
						d.preloadTextures(),
						(d.mouse.recordTrail = !!d.layers.find((c) => c.type == 'mouse')),
						d.setInteractiveParams(h, a),
						(he() || !d.lazyLoad) && d.initializePlanes(),
						de.observe(d.element),
						s(d);
				})
				.catch((r) => {
					console.log(r), i(r);
				});
		});
	}
	function Ot() {
		return new Promise((h, e) => {
			const t = [
				...document.querySelectorAll('[data-us-project]'),
				...document.querySelectorAll('[data-us-project-src]'),
			];
			[...t]
				.filter((s) => !s.getAttribute('data-us-initialized'))
				.forEach((s, i) => {
					const r = s.getAttribute('data-us-project'),
						a = s.getAttribute('data-us-project-src'),
						n = s.getAttribute('data-us-dpi'),
						o = s.getAttribute('data-us-scale'),
						l = s.getAttribute('data-us-lazyload'),
						d = s.getAttribute('data-us-production'),
						c = s.getAttribute('data-us-fps'),
						f =
							s.getAttribute('data-us-altText') ||
							s.getAttribute('data-us-alttext'),
						u =
							s.getAttribute('data-us-ariaLabel') ||
							s.getAttribute('data-us-arialabel'),
						g =
							s.getAttribute('data-us-disableMobile') ||
							s.getAttribute('data-us-disablemobile');
					s.setAttribute('data-us-initialized', !0),
						Re({
							projectId: r,
							filePath: a,
							element: s,
							dpi: +n,
							scale: +o,
							production: d,
							fps: +c,
							lazyLoad: l,
							altText: f,
							ariaLabel: u,
							interactivity: g ? { mouse: { disableMobile: !0 } } : null,
						}).then((m) => {
							i === t.length - 1 && h(k);
						});
				});
		});
	}
	Lt(),
		(D.addScene = Re),
		(D.destroy = zt),
		(D.init = Ot),
		Object.defineProperty(D, Symbol.toStringTag, { value: 'Module' });
});
