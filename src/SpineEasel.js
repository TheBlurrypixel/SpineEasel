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
			var obj = new this.lib[item.name];
			obj.name = item.name;

			if(this.charData.skins.default[item.name][item.name].x) obj.x = this.charData.skins.default[item.name][item.name].x;
			if(this.charData.skins.default[item.name][item.name].y) obj.y = -this.charData.skins.default[item.name][item.name].y;
			if(this.charData.skins.default[item.name][item.name].width) obj.regX = this.charData.skins.default[item.name][item.name].width/2;
			if(this.charData.skins.default[item.name][item.name].height) obj.regY = this.charData.skins.default[item.name][item.name].height/2;

			this.bones[item.bone].addChildAt(obj, 0);
		});

		this.bones['root'].scaleX = this.bones['root'].scaleY = this.rootScale;
		this.rootContainer.addChild(this.bones['root']);

		var event = new createjs.Event("ready");
		this.dispatchEvent(event);
	}

	pause() {
		// getters for paused dont work correctly in pre v.1.0.0 versions - use _paused instead
		if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item._paused = true);
		if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item._paused = true);
		if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item._paused = true);
		// if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item.paused = true);
		// if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item.paused = true);
		// if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item.paused = true);
		var event = new createjs.Event("pause");
		this.dispatchEvent(event);
	}

	resume() {
		// getters for paused dont work correctly in pre v.1.0.0 versions - use _paused instead
		if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item._paused = false);
		if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item._paused = false);
		if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item._paused = false);
		// if(this.t_Tweens.length > 0) this.t_Tweens.forEach( item => item.paused = false);
		// if(this.r_Tweens.length > 0) this.r_Tweens.forEach( item => item.paused = false);
		// if(this.s_Tweens.length > 0) this.s_Tweens.forEach( item => item.paused = false);
		var event = new createjs.Event("resume");
		this.dispatchEvent(event);
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

				var	a_longestTime = { time: 0, tween: null },
						t_longestTime = { time: 0, tween: null },
						r_longestTime = { time: 0, tween: null },
						s_longestTime = { time: 0, tween: null };

				if(animState.translate) {
					let timeStamp = 0;
					let initialPosition = new createjs.Point(this.bones[item.name].initialX, this.bones[item.name].initialY);
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					t_longestTime.tween = tweenObj;
					animState.translate.forEach( (t_item) => {
						let duration = (t_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = t_item.time;
						tweenObj.to( { x: initialPosition.x + t_item.x, y: initialPosition.y - t_item.y }, duration, (t_item.curve && Array.isArray(t_item.curve))  ? hermite.call(this, ...t_item.curve) : null );
						if(t_item.time > t_longestTime.time) t_longestTime.time = t_item.time;
					});
					if(!this.loop)
						tweenObj.call( () => {
							var event = new createjs.Event("stop");
							event.propCompleted = 'translate';
							this.dispatchEvent(event);
						});
					this.t_Tweens.push(tweenObj.wait(1));
				}

				if(animState.rotate) {
					let timeStamp = 0;
					let initialRotation = this.bones[item.name].initialRotation;
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					r_longestTime.tween = tweenObj;
					animState.rotate.forEach( (r_item) => {
						let duration = (r_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = r_item.time;
						tweenObj.to( { rotation: initialRotation - r_item.angle }, duration );
						if(r_item.time > r_longestTime.time) r_longestTime.time = r_item.time;
					});
					if(!this.loop)
						tweenObj.call( () => {
							var event = new createjs.Event("stop");
							event.propCompleted = 'rotate';
							this.dispatchEvent(event);
						});
					this.r_Tweens.push(tweenObj.wait(1));
				}

				if(animState.scale) {
					let timeStamp = 0;
					let initialScale = new createjs.Point(this.bones[item.name].initialScaleX, this.bones[item.name].initialScaleY);
					let tweenObj = createjs.Tween.get(this.bones[item.name]);
					tweenObj.loop = this.loop;
					s_longestTime.tween = tweenObj;
					animState.scale.forEach( (s_item) => {
						let duration = (s_item.time - timeStamp) * 1000/speedFactor;
						timeStamp = s_item.time;
						tweenObj.to( { scaleX: initialScale.x * s_item.x, scaleY: initialScale.y * s_item.y }, duration );
						if(s_item.time > s_longestTime.time) s_longestTime.time = s_item.time;
					});
					if(!this.loop)
						tweenObj.call( () => {
							var event = new createjs.Event("stop");
							event.propCompleted = 'scale';
							this.dispatchEvent(event);
						});
					this.s_Tweens.push(tweenObj.wait(1));
				}

				// get the largest among the transforms
				var temp = t_longestTime.time > r_longestTime.time ? t_longestTime : r_longestTime;
				var tempTime = temp.time > s_longestTime.time ? temp : s_longestTime;
				a_longestTime = a_longestTime.time > tempTime.time ? a_longestTime : tempTime;
			}
		});
		var event = new createjs.Event("play");
		this.dispatchEvent(event);
	}
}

// inheritance via ES6 class instead
// createjs.EventDispatcher.initialize(SpineEasel.prototype);

export default SpineEasel;
