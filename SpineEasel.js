if(!createjs) console.log( "createjs undefined");

function hermite(a, b, c, d)
{
	var p1 = {x: a, y: b}, p3 = {x: c, y: d};
	return function(t) {
		return 	(Math.pow(t,3) - 2 * t * t + t) * p1.y + (- 2 * Math.pow(t,3) + 3*t*t) + ( Math.pow(t,3) - t*t) * p3.y;
	};
}

export class SpineEasel {
	constructor(inRootContainer, inStage, inSkeletonPath, inLib, inAnimationClip) {
		this.rootContainer = inRootContainer;
		this.stage = inStage;
		this.skeletonPath = inSkeletonPath;
		this.lib = inLib;
		this.animationClip = inAnimationClip;
		this.bones = new Array();
		this.slots = new Array();

		this.charData;

		var xhr = new XMLHttpRequest();
		xhr.open("GET", this.skeletonPath, true);
		xhr.onload = this.skeletonLoadHandler.bind(this);
		xhr.onprogress = this.skeletonProgressHandler.bind(this);
		xhr.send();
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
			if(item.parent) {
				this.bones[item.name].initialX = 0;
				this.bones[item.name].initialY = 0;
				this.bones[item.name].initialRotation = 0;
				this.bones[item.name].initialScaleX = 1;
				this.bones[item.name].initialScaleY = 1;

				if(item.x) this.bones[item.name].x = this.bones[item.name].initialX = item.x;
				if(item.y) this.bones[item.name].y = this.bones[item.name].initialY = -item.y;
				if(item.rotation) this.bones[item.name].rotation = this.bones[item.name].initialRotation = -item.rotation;
				if(item.scaleX) this.bones[item.name].scaleX = this.bones[item.name].initialScaleX = item.scaleX;
				if(item.scaleY) this.bones[item.name].scaleY = this.bones[item.name].initialScaleY = -item.scaleY;

				this.bones[item.parent].addChildAt(this.bones[item.name], 0);
			}
		});

		// attach a MovieClip to the bones
		this.charData.slots.forEach( (item) => {
			var obj = new this.lib[item.name + 'MC'];
			obj.name = item.name + 'MC';

			if(this.charData.skins.default[item.name][item.name].x) obj.x = this.charData.skins.default[item.name][item.name].x;
			if(this.charData.skins.default[item.name][item.name].y) obj.y = -this.charData.skins.default[item.name][item.name].y;
			if(this.charData.skins.default[item.name][item.name].width) obj.regX = this.charData.skins.default[item.name][item.name].width/2;
			if(this.charData.skins.default[item.name][item.name].height) obj.regY = this.charData.skins.default[item.name][item.name].height/2;

			this.bones[item.bone].addChildAt(obj, 0);
		});

		this.rootContainer.addChild(this.bones['root']);
		this.rootContainer.x = 1200;
		this.rootContainer.y = 950;
		this.stage.update();

		var event = new createjs.Event("ready");
		this.dispatchEvent(event);
	}

	startAnimation() {
		this.charData.slots.forEach( (item) => {
			var animState = this.charData.animations[this.animationClip].bones[item.bone];
			if(animState) {

				if(animState.translate) {
					let timeStamp = 0;
					let initialPosition = new createjs.Point(this.bones[item.bone].x, this.bones[item.bone].y);
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.translate.forEach( (t_item) => {
						let duration = (t_item.time - timeStamp) * 1000;
						timeStamp = t_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { x: initialPosition.x + t_item.x, y: initialPosition.y - t_item.y }, duration, t_item.curve ? hermite.call(this, ...t_item.curve) : null );
					});
					tweenObj.wait(1);
				}

				if(animState.rotate) {
					let timeStamp = 0;
					let initialRotation = this.bones[item.bone].rotation;
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.rotate.forEach( (r_item) => {
						let duration = (r_item.time - timeStamp) * 1000;
						timeStamp = r_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { rotation: initialRotation - r_item.angle }, duration );
					});
					tweenObj.wait(1);
				}

				if(animState.scale) {
					let timeStamp = 0;
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.scale.forEach( (s_item) => {
						let duration = (s_item.time - timeStamp) * 1000;
						timeStamp = s_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { scaleX: s_item.x, scaleY: s_item.y }, duration );
					});
					tweenObj.wait(1);
				}
			}
		});
	}

	loopAnimation() {
		var longestTime = 0;
		this.charData.slots.forEach( (item) => {
			var animState = this.charData.animations[this.animationClip].bones[item.bone];
			if(animState) {

				var a_longestTime = 0,
					t_longestTime = 0,
					r_longestTime = 0,
					s_longestTime = 0;
				if(animState.translate) {
					let timeStamp = 0;
					let initialPosition = new createjs.Point(this.bones[item.bone].initialX, this.bones[item.bone].initialY);
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.translate.forEach( (t_item) => {
						let duration = (t_item.time - timeStamp) * 1000;
						timeStamp = t_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { x: initialPosition.x + t_item.x, y: initialPosition.y - t_item.y }, duration, t_item.curve ? hermite.call(this, ...t_item.curve) : null );
						t_longestTime = t_item.time > t_longestTime ? t_item.time : t_longestTime;
					});
					tweenObj.wait(1);
				}

				if(animState.rotate) {
					let timeStamp = 0;
					let initialRotation = this.bones[item.bone].initialRotation;
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.rotate.forEach( (r_item) => {
						let duration = (r_item.time - timeStamp) * 1000;
						timeStamp = r_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { rotation: initialRotation - r_item.angle }, duration );
						r_longestTime = r_item.time > r_longestTime ? r_item.time : r_longestTime;
					});
					tweenObj.wait(1);
				}

				if(animState.scale) {
					let timeStamp = 0;
					let initialScale = new createjs.Point(this.bones[item.bone].initialScaleX, this.bones[item.bone].initialScaleY);
					let tweenObj = createjs.Tween.get(this.bones[item.bone]);
					animState.scale.forEach( (s_item) => {
						let duration = (s_item.time - timeStamp) * 1000;
						timeStamp = s_item.time;
						if(duration > 0)
							tweenObj = tweenObj.to( { scaleX: initialScale.x * s_item.x, scaleY: initialScale.y * s_item.y }, duration );
						s_longestTime = s_item.time > s_longestTime ? s_item.time : s_longestTime;
					});
					tweenObj.wait(1);
				}
				a_longestTime = t_longestTime > s_longestTime ? (t_longestTime > r_longestTime ? t_longestTime : r_longestTime) : s_longestTime;
				longestTime = a_longestTime > longestTime ? a_longestTime : longestTime;
			}
		});
		if(longestTime > 0) {
			setTimeout(this.loopAnimation.bind(this), longestTime * 1000 + 33);
		}
	}
}

createjs.EventDispatcher.initialize(SpineEasel.prototype);

export default SpineEasel;
