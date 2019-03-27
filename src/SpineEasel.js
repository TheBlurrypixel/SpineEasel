if(!createjs) console.log( "createjs undefined");

function hermite(a, b, c, d)
{
	if(a &&b && c && d) {
		var p1 = {x: a, y: b}, p3 = {x: c, y: d};
		return function(t) {
			return 	(Math.pow(t,3) - 2 * t * t + t) * p1.y + (- 2 * Math.pow(t,3) + 3*t*t) + ( Math.pow(t,3) - t*t) * p3.y;
		};
	}
	else {
		return function(t) {
			return t;
		};
	}
}

// we extend the class below the class definition
export class SpineEasel extends createjs.EventDispatcher {
	constructor(inRootContainer, inSkeletonPath, inLib, inAnimationClip, rootScale = 1.0, loop = 0, inSpeedFactor = 1.0) {
		super();
		this.rootContainer = inRootContainer;
		this.skeletonPath = inSkeletonPath;
		this.lib = inLib;
		this.animationClip = inAnimationClip;
		this.loop = (loop === true) ? -1 : ((loop === false) ? 0 : loop);
		this.speedFactor = inSpeedFactor;
		this.bones = new Array();
		this.slots = new Array();
		this.rootScale = rootScale;

		this.charData = null;
		this.t_Tweens = null;
		this.r_Tweens = null;
		this.s_Tweens = null;

		var xhr = new XMLHttpRequest();
		xhr.open("GET", this.skeletonPath, true);
		xhr.onload = this.skeletonLoadHandler.bind(this);
		xhr.onprogress = this.skeletonProgressHandler.bind(this);
		xhr.send();
	}

	set rootScale(inRootScale) {
		this._rootScale = inRootScale;
	}

	get rootScale() {
		return this._rootScale;
	}

	set loop(inLoop) {
		this._loop = inLoop;
	}

	get loop() {
		return this._loop;
	}

	set speedFactor(inSpeedFactor) {
		this._speedFactor = inSpeedFactor;
	}

	get speedFactor() {
		return this._speedFactor;
	}

	skeletonProgressHandler(event) {
		var progress = event.loaded / event.total;
	}

	skeletonLoadHandler(event) {
		this.charData = JSON.parse(event.target.response);

		this.charData.bones.forEach( (item) => {
			var obj = new createjs.Container();
			obj.name = item.name;
			this.bones[item.name] = obj;
		});

		// reparent and translate
		this.charData.bones.forEach( (item) => {
				this.bones[item.name].x = this.bones[item.name].initialX = 0;
				this.bones[item.name].y = this.bones[item.name].initialY = 0;
				this.bones[item.name].rotation = this.bones[item.name].initialRotation = 0;
				this.bones[item.name].scaleX = this.bones[item.name].initialScaleX = 1;
				this.bones[item.name].scaleY = this.bones[item.name].initialScaleY = 1;

				if(item.x) this.bones[item.name].x = this.bones[item.name].initialX = item.x;
				if(item.y) this.bones[item.name].y = this.bones[item.name].initialY = -item.y;
				if(item.rotation) this.bones[item.name].rotation = this.bones[item.name].initialRotation = -item.rotation;
				if(item.scaleX) this.bones[item.name].scaleX = this.bones[item.name].initialScaleX = item.scaleX;
				if(item.scaleY) this.bones[item.name].scaleY = this.bones[item.name].initialScaleY = -item.scaleY;

				if(item.parent)
					this.bones[item.parent].addChildAt(this.bones[item.name], 0);
		});

		// attach a MovieClip to the bones
		this.charData.slots.forEach( (item) => {
			var skinnable = this.charData.skins.default[item.name];
			Object.keys(skinnable).forEach( (ky) => {
				var obj = new this.lib[ky];
				obj.name = ky;

				if(skinnable[ky].x) obj.x = skinnable[ky].x;
				if(skinnable[ky].y) obj.y = -skinnable[ky].y;
				if(skinnable[ky].width) obj.regX = skinnable[ky].width/2;
				if(skinnable[ky].height) obj.regY = skinnable[ky].height/2;

				this.bones[item.bone].addChildAt(obj, 0);
			});
		});

		this.bones['root'].scaleX = this.bones['root'].scaleY = this.rootScale;
		this.rootContainer.addChild(this.bones['root']);

		var readyEvent = new createjs.Event('ready');
		this.dispatchEvent(readyEvent);
	}

	pause() {
		// getters for paused dont work correctly in pre v.1.0.0 versions - use _paused instead
		if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item._paused = true);
		if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item._paused = true);
		if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item._paused = true);
		// if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item.paused = true);
		// if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item.paused = true);
		// if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item.paused = true);
		var pauseEvent = new createjs.Event('pause');
		this.dispatchEvent(pauseEvent);
	}

	resume() {
		// getters for paused dont work correctly in pre v.1.0.0 versions - use _paused instead
		if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item._paused = false);
		if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item._paused = false);
		if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item._paused = false);
		// if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item.paused = false);
		// if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item.paused = false);
		// if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item.paused = false);
		var resumeEvent = new createjs.Event('resume');
		this.dispatchEvent(resumeEvent);
	}

	restart() {
		this.charData.bones.forEach( (item) => {
			createjs.Tween.removeTweens(this.bones[item.name]);
		});
		this.start();
	}

	start() {
		var speedFactor = this.speedFactor;
		this.t_Tweens = new Array();
		this.r_Tweens = new Array();
		this.s_Tweens = new Array();

		this.charData.bones.forEach( (item) => {
			var animState = this.charData.animations[this.animationClip].bones[item.name];
			if(animState) {

				if(animState.translate) {
					let timeStamp = 0;
					let initialPosition = new createjs.Point(this.bones[item.name].initialX, this.bones[item.name].initialY);
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					animState.translate.forEach( (t_item) => {
						let duration = (t_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = t_item.time;
						tweenObj.to( { x: initialPosition.x + t_item.x, y: initialPosition.y - t_item.y }, duration, (t_item.curve && Array.isArray(t_item.curve))  ? hermite.call(this, ...t_item.curve) : null );
					});
					this.t_Tweens.push(tweenObj.wait(1));
				}

				if(animState.rotate) {
					let timeStamp = 0;
					let initialRotation = this.bones[item.name].initialRotation;
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					animState.rotate.forEach( (r_item) => {
						let duration = (r_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = r_item.time;
						tweenObj.to( { rotation: initialRotation - r_item.angle }, duration );
					});
					this.r_Tweens.push(tweenObj.wait(1));
				}

				if(animState.scale) {
					let timeStamp = 0;
					let initialScale = new createjs.Point(this.bones[item.name].initialScaleX, this.bones[item.name].initialScaleY);
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					animState.scale.forEach( (s_item) => {
						let duration = (s_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = s_item.time;
						tweenObj.to( { scaleX: initialScale.x * s_item.x, scaleY: initialScale.y * s_item.y }, duration );
					});
					this.s_Tweens.push(tweenObj.wait(1));
				}
			}
		});

		// get the longestTween and call stopEvent from it
		var t_longTween = this.t_Tweens.length > 0 ? this.t_Tweens.reduce( (accum, curVal) => (curVal.duration > accum.duration) ? curVal : accum ) : null;
		var r_longTween = this.r_Tweens.length > 0 ? this.r_Tweens.reduce( (accum, curVal) => (curVal.duration > accum.duration) ? curVal : accum ) : null;
		var s_longTween = this.s_Tweens.length > 0 ? this.s_Tweens.reduce( (accum, curVal) => (curVal.duration > accum.duration) ? curVal : accum ) : null;

		var tempTween = null;
		var longTween = null;

		if(t_longTween && r_longTween) {
			tempTween = t_longTween.duration > r_longTween.duration ? t_longTween : r_longTween;
		}
		else {
			tempTween = t_longTween || r_longTween;
		}

		if(tempTween && s_longTween) {
			longTween = tempTween.duration > s_longTween.duration ? tempTween : s_longTween;
		}
		else {
			longTween = tempTween || s_longTween;
		}
		if(longTween) {
			longTween.call( () => {
				var endEvent = new createjs.Event('stop');
				endEvent.currentTarget = longTween;
				this.dispatchEvent(endEvent);
			});
		}

		var playEvent = new createjs.Event('play');
		this.dispatchEvent(playEvent);
	}
}

// inheritance via ES6 class instead
// createjs.EventDispatcher.initialize(SpineEasel.prototype);

export default SpineEasel;
