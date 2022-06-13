import {Ticker, Event} from "@create2d/core";

import AbstractTween, {AnyProps, TweenAction, AbstractTweenProps, TweenStep} from "./AbstractTween";
import Ease, {EaseFunction} from "./Ease";

interface TweenProps extends AbstractTweenProps {
	override?: any;
	pluginData?: any;
}

export default class Tween extends AbstractTween {

	private static _inited: boolean = false;

	pluginData: any = null;

	/**
	 * The target of this tween. This is the object on which the tweened properties will be changed.
	 **/
	target: any;

	/**
	 * Indicates the tween's current position is within a passive wait.
	 **/
	passive: boolean = false;

	/**
	 * The position within the current step. Used by MovieClip.
	 **/
	_stepPosition: number = 0;

	/**
	 * Plugins added to this tween instance.
	 **/
	_plugins: any[] | null = null;

	/**
	 * Hash for quickly looking up added plugins. undef until a plugin is added.
	 **/
	_pluginIds?: any;


	/**
	 * Used by plugins to inject new properties.
	 **/
	_injected: any = null;

	_stepHead = new TweenStep();
	_stepTail: TweenStep = this._stepHead;
	_actionHead?: TweenAction;
	_actionTail?: TweenAction;

	constructor(target: AnyProps, props: TweenProps = {}) {
		super(props);

		this.target = target;
		if (props) {
			this.pluginData = props.pluginData;
			if (props.override) {
				Tween.removeTweens(target);
			}
		}
		if (!this.pluginData) {
			this.pluginData = {};
		}

		super._init(props);
	}

	/**
	 * Returns a new tween instance. This is functionally identical to using `new Tween(...)`, but may look cleaner
	 * with the chained syntax of TweenJS.
	 **/
	static get(target: AnyProps, props?: TweenProps): Tween {
		return new Tween(target, props);
	}

	/**
	 * Advances all tweens. This typically uses the {@link Ticker} class, but you can call it
	 * manually if you prefer to use your own "heartbeat" implementation.
	 *
	 * @static
	 *
	 * @param {Number} delta The change in time in milliseconds since the last tick. Required unless all tweens have
	 * `useTicks` set to true.
	 * @param {Boolean} paused Indicates whether a global pause is in effect. Tweens with {@link Tween#ignoreGlobalPause}
	 * will ignore this, but all others will pause if this is `true`.
	 **/
	static tick(delta: number = 1, paused: boolean = false) {
		let tween = Tween._tweenHead;
		const t = Tween._inTick = Date.now();
		while (tween) {
			let next = tween._next, status = tween._status;
			tween._lastTick = t;
			if (status === 1) {
				tween._status = 0;
			} // new, ignore
			else if (status === -1) {
				Tween._delist(tween);
			} // removed, delist
			else if ((paused && !tween.ignoreGlobalPause) || tween._paused) { /* paused */
			} else {
				tween.advance(tween.useTicks ? 1 : delta);
			}
			tween = next as Tween|undefined;
		}
		Tween._inTick = 0;
	}

	/**
	 * Handle events that result from Tween being used as an event handler. This is included to allow Tween to handle
	 * {@link Event} events from the {@link Ticker}.
	 * No other events are handled in Tween.
	 *
	 * @static
	 * @since 0.4.2
	 *
	 * @param {Object} event An event object passed in by the {@link EventDispatcher}. Will
	 * usually be of type "tick".
	 **/
	static handleEvent(event: Event) {
		if (event.type === "tick") {
			this.tick(event.delta, event.paused);
		}
	}

	/**
	 * Removes all existing tweens for a target. This is called automatically by new tweens if the `override`
	 * property is `true`.
	 *
	 * @static
	 *
	 * @param {Object} target The target object to remove existing tweens from.
	 **/
	static removeTweens(target: any) {
		if (!target.tweenjs_count) {
			return;
		}
		let tween = Tween._tweenHead;
		while (tween) {
			let next = tween._next;
			if (tween.target === target) {
				tween.paused = true;
			}
			tween = next as Tween|undefined;
		}
		target.tweenjs_count = 0;
	}

	/**
	 * Stop and remove all existing tweens.
	 **/
	static removeAllTweens() {
		let tween = Tween._tweenHead;
		while (tween) {
			let next = tween._next;
			tween._paused = true;
			tween.target && (tween.target.tweenjs_count = 0);
			tween._next = tween._prev = undefined;
			tween = next as Tween|undefined;
		}
		Tween._tweenHead = Tween._tweenTail = undefined;
	}

	/**
	 * Indicates whether there are any active tweens on the target object (if specified) or in general.
	 **/
	static hasActiveTweens(target: any): boolean {
		if (target) {
			return !!target.tweenjs_count;
		}
		return !!Tween._tweenHead;
	}

	/**
	 * Installs a plugin, which can modify how certain properties are handled when tweened. See the {@link SamplePlugin}
	 * for an example of how to write TweenJS plugins. Plugins should generally be installed via their own `install` method, in order to provide
	 * the plugin with an opportunity to configure itself.
	 *
	 * @static
	 *
	 * @param {Object} plugin The plugin to install
	 * @param {Object} props The props to pass to the plugin
	 */
	static installPlugin(plugin: any, props?: {[k: string]: any}) {
		plugin.install(props);
		const priority = (plugin.priority = plugin.priority || 0), arr = (Tween._plugins = Tween._plugins || []);
		const l = arr.length;
		let i;
		for (i = 0; i < l; i++) {
			if (priority < arr[i].priority) {
				break;
			}
		}
		arr.splice(i, 0, plugin);
	}

	/**
	 * Registers or unregisters a tween with the ticking system.
	 *
	 * @param {Tween} tween The tween instance to register or unregister.
	 * @param {Boolean} paused If `false`, the tween is registered. If `true` the tween is unregistered.
	 **/
	public static _register(tween: Tween, paused: boolean) {
		const target = tween.target;
		if (!paused && tween._paused) {
			// TODO: this approach might fail if a dev is using sealed objects
			if (target) {
				target.tweenjs_count = target.tweenjs_count ? target.tweenjs_count + 1 : 1;
			}
			let tail = Tween._tweenTail;
			if (!tail) {
				Tween._tweenHead = Tween._tweenTail = tween;
			} else {
				Tween._tweenTail = tail._next = tween;
				tween._prev = tail;
			}
			tween._status = Tween._inTick ? 1 : 0;
			if (!Tween._inited) {
				Ticker.addEventListener("tick", Tween);
				Tween._inited = true;
			}
		} else if (paused && !tween._paused) {
			if (target) {
				target.tweenjs_count--;
			}
			// tick handles delist if we're in a tick stack and the tween hasn't advanced yet:
			if (!Tween._inTick || tween._lastTick === Tween._inTick) {
				Tween._delist(tween);
			}
			tween._status = -1;
		}
		tween._paused = paused;
	}

	/**
	 * @param {Tween} tween
	 */
	private static _delist(tween: Tween) {
		let next = tween._next,
			prev = tween._prev;
		if (next) {
			next._prev = prev;
		} else {
			Tween._tweenTail = prev as Tween|undefined;
		} // was tail
		if (prev) {
			prev._next = next;
		} else {
			Tween._tweenHead = next as Tween|undefined;
		} // was head.
		tween._next = tween._prev = undefined;
	}

	/**
	 * Adds a wait (essentially an empty tween).
	 *
	 * @example
	 * // This tween will wait 1s before alpha is faded to 0.
	 * Tween.get(target)
	 *   .wait(1000)
	 *   .to({ alpha: 0 }, 1000);
	 *
	 * @param {Number} duration The duration of the wait in milliseconds (or in ticks if `useTicks` is true).
	 * @param {Boolean} [passive=false] Tween properties will not be updated during a passive wait. This
	 * is mostly useful for use with {@link Timeline} instances that contain multiple tweens
	 * affecting the same target at different times.
	 * @chainable
	 */
	wait(duration: number, passive: boolean = false): Tween {
		if (duration > 0) {
			this._addStep(+duration, this._stepTail.props, Ease.none, passive);
		}
		return this;
	}

	/**
	 * Adds a tween from the current values to the specified properties. Set duration to 0 to jump to these value.
	 * Numeric properties will be tweened from their current value in the tween to the target value. Non-numeric
	 * properties will be set at the end of the specified duration.
	 *
	 * @example
	 * Tween.get(target)
	 *   .to({ alpha: 0, visible: false }, 1000);
	 *
	 * @param {Object} props An object specifying property target values for this tween (Ex. `{x:300}` would tween the x
	 * property of the target to 300).
	 * @param {Number} [duration=0] The duration of the tween in milliseconds (or in ticks if `useTicks` is true).
	 * @param {Function} [ease=Ease.linear] The easing function to use for this tween. See the {@link Ease}
	 * class for a list of built-in ease functions.
	 * @chainable
	 */
	to(props: any, duration = 0, ease = Ease.linear): Tween {
		if (duration < 0) {
			duration = 0;
		}
		const step = this._addStep(+duration, null, ease);
		this._appendProps(props, step);
		return this;
	}

	/**
	 * Adds a label that can be used with {@link Tween#gotoAndPlay}/{@link Tween#gotoAndStop}
	 * at the current point in the tween.
	 *
	 * @param {String} label The label name.
	 * @chainable
	 **/
	label(label: string): Tween {
		this.addLabel(label, this.duration);
		return this;
	}

	/**
	 * Adds an action to call the specified function.
	 *
	 * @param {Function} callback The function to call.
	 * @param {Array} [params]. The parameters to call the function with. If this is omitted, then the function
	 * will be called with a single param pointing to this tween.
	 * @param {Object} [scope]. The scope to call the function in. If omitted, it will be called in the target's scope.
	 * @chainable
	 */
	call(callback: Function, params?: Object[], scope?: Object): Tween {
		return this._addAction(scope || this.target, callback, params || [this]);
	}

	/**
	 * Adds an action to set the specified props on the specified target. If `target` is null, it will use this tween's
	 * target. Note that for properties on the target object, you should consider using a zero duration {@link Tween#to}
	 * operation instead so the values are registered as tweened props.
	 *
	 * @param {Object} props The properties to set (ex. `{ visible: false }`).
	 * @param {Object} [target] The target to set the properties on. If omitted, they will be set on the tween's target.
	 * @chainable
	 **/
	set(props: any, target?: any): Tween {
		return this._addAction(target || this.target, this._set, [props]);
	}

	/**
	 * Adds an action to play (unpause) the specified tween. This enables you to sequence multiple tweens.
	 *
	 * @param {Tween} [tween] The tween to play. Defaults to this tween.
	 * @chainable
	 **/
	play(tween?: Tween): Tween {
		return this._addAction(tween || this, this._set, [{paused: false}]);
	}

	/**
	 * Adds an action to pause the specified tween.
	 * At 60fps the tween will advance by ~16ms per tick, if the tween above was at 999ms prior to the current tick, it
	 * will advance to 1015ms (15ms into the second "step") and then pause.
	 *
	 * @param {Tween} [tween] The tween to pause. Defaults to this tween.
	 * @chainable
	 **/
	pause(tween?: Tween): Tween {
		return this._addAction(tween || this, this._set, [{paused: false}]);
	}

	get paused(): boolean {
		return this._paused;
	}

	set paused(paused: boolean) {
		Tween._register(this, paused);
		this._paused = paused;
	}

	toString(): string {
		throw new Error("Method not implemented.");
	}

	clone(): Tween {
		throw "Tween can not be cloned.";
	}

	/**
	 * @private
	 * @param {Object} plugin
	 */
	_addPlugin(plugin: any) {
		let ids = this._pluginIds || (this._pluginIds = {}), id = plugin.id;
		if (!id || ids[id]) {
			return;
		} // already added

		ids[id] = true;
		let plugins = this._plugins || (this._plugins = []), priority = plugin.priority || 0;
		for (let i = 0, l = plugins.length; i < l; i++) {
			if (priority < plugins[i].priority) {
				plugins.splice(i, 0, plugin);
				return;
			}
		}
		plugins.push(plugin);
	}

	_updatePosition(jump: boolean, end?: boolean) {
		let step = this._stepHead.next, t = this.position, d = this.duration;
		if (this.target && step) {
			// find our new step index:
			let stepNext = step.next;
			while (stepNext && stepNext.t <= t) {
				step = stepNext;
				stepNext = step && step.next;
			}
			let ratio = end ? d === 0 ? 1 : t / d : (t - step.t) / step.d; // TODO: revisit this.
			this._updateTargetProps(step, ratio, end);
		}
		this._stepPosition = step ? t - step.t : 0;
	}

	_updateTargetProps(step: TweenStep, ratio: number, end?: boolean) {
		if (this.passive = !!step.passive) {
			return;
		} // don't update props.

		let v, v0, v1, ease;
		let p0: AnyProps = step.prev && step.prev.props || {};
		let p1: AnyProps = step.props;
		if (ease = step.ease) {
			ratio = ease(ratio, 0, 1, 1);
		}

		let plugins = this._plugins;
		proploop:
		for (let n in p0) {
			v0 = p0[n];
			v1 = p1[n];

			console.log(n, v0, v1);

			// values are different & it is numeric then interpolate:
			if (v0 !== v1 && (typeof (v0) === "number")) {
				v = v0 + (v1 - v0) * ratio;
			} else {
				v = ratio >= 1 ? v1 : v0;
			}

			if (plugins) {
				for (let i = 0, l = plugins.length; i < l; i++) {
					let value: any = plugins[i].change(this, step, n, v, ratio, end);
					if (value === Tween.IGNORE) {
						continue proploop;
					}
					if (value !== undefined) {
						v = value;
					}
				}
			}
			this.target[n] = v;
		}

	}

	_runActions(startRawPos: number, endRawPos: number, jump: boolean, includeStart: boolean) {
		if (!this._actionHead) {
			return;
		}

		const d = this.duration, loopCount = this.loop;
		let reversed = this.reversed, bounce = this.bounce;
		let loop0, loop1, t0, t1;

		if (d === 0) {
			// deal with 0 length tweens:
			loop0 = loop1 = t0 = t1 = 0;
			reversed = bounce = false;
		} else {
			loop0 = startRawPos / d | 0;
			loop1 = endRawPos / d | 0;
			t0 = startRawPos - loop0 * d;
			t1 = endRawPos - loop1 * d;
		}

		// catch positions that are past the end:
		if (loopCount !== -1) {
			if (loop1 > loopCount) {
				t1 = d;
				loop1 = loopCount;
			}
			if (loop0 > loopCount) {
				t0 = d;
				loop0 = loopCount;
			}
		}

		// special cases:
		if (jump) {
			return this._runActionsRange(t1, t1, jump, includeStart);
		} // jump.
		else if (loop0 === loop1 && t0 === t1 && !jump && !includeStart) {
			return;
		} // no actions if the position is identical and we aren't including the start
		else if (loop0 === -1) {
			loop0 = t0 = 0;
		} // correct the -1 value for first advance, important with useTicks.

		const dir = (startRawPos <= endRawPos);
		let loop = loop0;
		do {
			let rev = !reversed !== !(bounce && loop % 2);
			let start = (loop === loop0) ? t0 : dir ? 0 : d;
			let end = (loop === loop1) ? t1 : dir ? d : 0;

			if (rev) {
				start = d - start;
				end = d - end;
			}

			if (bounce && loop !== loop0 && start === end) { /* bounced onto the same time/frame, don't re-execute end actions */
			} else if (this._runActionsRange(start, end, jump, includeStart || (loop !== loop0 && !bounce))) {
				return true;
			}

			includeStart = false;
		} while ((dir && ++loop <= loop1) || (!dir && --loop >= loop1));
	}

	_runActionsRange(startPos: number, endPos: number, jump: boolean, includeStart: boolean): boolean {
		let rev = startPos > endPos;
		let action = rev ? this._actionTail : this._actionHead;
		let ePos = endPos, sPos = startPos;
		if (rev) {
			ePos = startPos;
			sPos = endPos;
		}
		let t = this.position;
		while (action) {
			let pos = action.t;
			if (pos === endPos || (pos > sPos && pos < ePos) || (includeStart && pos === startPos)) {
				action.funct.apply(action.scope, action.params);
				if (t !== this.position) {
					return true;
				}
			}
			action = rev ? action.prev : action.next;
		}
		return false;
	}

	_appendProps(props: AnyProps, step: TweenStep, stepPlugins?: any) {
		let initProps = this._stepHead.props, target = this.target, plugins = Tween._plugins;
		let n: string, i, l, value, initValue, inject;

		let oldStep = step.prev,
			oldProps = oldStep && oldStep.props || {};
		let stepProps = step.props || (step.props = this._cloneProps(oldProps));
		let cleanProps: AnyProps = {};

		let ignored: AnyProps = {};
		for (n in props) {
			if (!props.hasOwnProperty(n)) {
				continue;
			}

			cleanProps[n] = stepProps[n] = props[n];

			if (initProps[n] !== undefined) {
				continue;
			}

			initValue = undefined; // accessing missing properties on DOMElements when using CSSPlugin is INSANELY expensive, so we let the plugin take a first swing at it.
			if (plugins) {
				for (i = plugins.length - 1; i >= 0; i--) {
					value = plugins[i].init(this, n, initValue);
					if (value !== undefined) {
						initValue = value;
					}
					if (initValue === Tween.IGNORE) {
						(ignored = ignored || {})[n] = true;
						delete (stepProps[n]);
						delete (cleanProps[n]);
						break;
					}
				}
			}

			if (initValue !== Tween.IGNORE) {
				if (initValue === undefined) {
					initValue = target[n];
				}
				oldProps[n] = (initValue === undefined) ? null : initValue;
			}
		}

		for (n in cleanProps) {
			value = props[n];

			// propagate old value to previous steps:
			let o, prev = oldStep;
			while ((o = prev) && (prev = o.prev)) {
				if (prev.props === o.props) {
					continue;
				} // wait step
				if (prev.props[n] !== undefined) {
					break;
				} // already has a value, we're done.
				prev.props[n] = oldProps[n];
			}
		}

		if (stepPlugins && (plugins = this._plugins)) {
			for (i = plugins.length - 1; i >= 0; i--) {
				plugins[i].step(this, step, cleanProps);
			}
		}

		if (inject = this._injected) {
			this._injected = null;
			this._appendProps(inject, step, false);
		}
	}

	/**
	 * Used by plugins to inject properties onto the current step. Called from within `Plugin.step` calls.
	 * For example, a plugin dealing with color, could read a hex color, and inject red, green, and blue props into the tween.
	 * See the SamplePlugin for more info.
	 **/
	_injectProp(name: string, value: any) {
		let o = this._injected || (this._injected = {});
		o[name] = value;
	}

	_addStep(duration: number, props: TweenProps|null, ease: EaseFunction, passive: boolean = false): TweenStep {
		let step = new TweenStep(this._stepTail, this.duration, duration, props||undefined, ease, passive);
		this.duration += duration;
		return this._stepTail = (this._stepTail.next = step);
	}

	_addAction(scope: Object, funct: Function, params: any) {
		let action = new TweenAction(this._actionTail, this.duration, scope, funct, params);
		if (this._actionTail) {
			this._actionTail.next = action;
		} else {
			this._actionHead = action;
		}
		this._actionTail = action;
		return this;
	}

	_set(props: any) {
		for (let n in props) {
			(this as any)[n] = props[n];
		}
	}

	_cloneProps(props: AnyProps): AnyProps {
		let o: AnyProps = {};
		for (let n in props) {
			o[n] = props[n];
		}
		return o;
	}

// static properties
	/**
	 * Constant returned by plugins to tell the tween not to use default assignment.
	 **/
	private static IGNORE = {};
	private static _tweens: Tween[] = [];
	private static _plugins: any = null;
	private static _tweenHead?: Tween;
	private static _tweenTail?: Tween;
	/**
	 * 0 if not in tick, otherwise a tick ID (currently just a timestamp).
	 **/
	private static _inTick = 0;
}