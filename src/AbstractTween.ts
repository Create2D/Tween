import {EventDispatcher} from "@create2d/core";

import Ease, {EaseFunction} from "./Ease";

export interface TweenProps {
	useTicks?: boolean,
	ignoreGlobalPause?: boolean,
	loop?: number|boolean,
	reversed?: boolean,
	bounce?: boolean,
	timeScale?: number,
	pluginData?: any,
	paused?: boolean,
	position?: number,
	onChange?: (e: Object|Event) => boolean|void,
	onComplete?: (e: Object|Event) => boolean|void,
	override?: boolean
}

export default abstract class AbstractTween extends EventDispatcher {
	name ?: string;

	/**
	 * Causes this tween to continue playing when a global pause is active. For example, if TweenJS is using {@link Ticker},
	 * then setting this to false (the default) will cause this tween to be paused when `Ticker.setPaused(true)`
	 * is called. See the {@link Tween#tick} method for more info. Can be set via the `props` parameter.
	 **/
	ignoreGlobalPause: boolean = false;

	/**
	 * Indicates the number of times to loop. If set to -1, the tween will loop continuously.
	 **/
	loop: number = 0;

	/**
	 * Uses ticks for all durations instead of milliseconds. This also changes the behaviour of some actions (such as `call`).
	 * Changing this value on a running tween could have unexpected results.
	 **/
	useTicks: boolean = false;

	/**
	 * Causes the tween to play in reverse.
	 **/
	reversed: boolean = false;

	/**
	 * Causes the tween to reverse direction at the end of each loop.
	 **/
	bounce: boolean = false;

	/**
	 * Changes the rate at which the tween advances. For example, a `timeScale` value of `2` will double the
	 * playback speed, a value of `0.5` would halve it.
	 **/
	_timeScale: number = 1;
	get timeScale(): number { return this._timeScale; }
	set timeScale(value: number) { this._timeScale = value; }

	/**
	 * Indicates the duration of this tween in milliseconds (or ticks if `useTicks` is true), irrespective of `loops`.
	 * This value is automatically updated as you modify the tween. Changing it directly could result in unexpected behaviour.
	 **/
	duration: number = 0;

	/**
	 * The current normalized position of the tween. This will always be a value between 0 and `duration`.
	 * Changing this property directly will have unexpected results, use {@link Tween#setPosition}.
	 **/
	position: number = 0;

	/**
	 * The raw tween position. This value will be between `0` and `loops * duration` while the tween is active, or -1 before it activates.
	 **/
	rawPosition: number = -1;

	_paused: boolean = true;
	_next?: AbstractTween;
	_prev?: AbstractTween;
	_parent?: AbstractTween;

	_stepHead = new TweenStep();
	_stepTail: TweenStep = this._stepHead;
	_actionHead?: TweenAction;
	_actionTail?: TweenAction;

	private _labels: {[label: string]: number} = {};

	private _labelList: { label: string, position: number }[] = [];

	/**
	 * Status in tick list:
	 * 0 = in list
	 * 1 = added to list in the current tick stack
	 * -1 = removed from list (or to be removed in this tick stack)
	 **/
	protected _status: -1 | 0 | 1 = -1;

	/**
	 * Tick id compared to Tween._inTick when removing tweens from the tick list in a tick stack.
	 **/
	protected _lastTick: number = 0;


	protected constructor(props?: TweenProps) {
		super();
		if (props) {
			this.useTicks = !!props.useTicks;
			this.ignoreGlobalPause = !!props.ignoreGlobalPause;
			this.loop = props.loop === true ? -1 : (props.loop || 0);
			this.reversed = !!props.reversed;
			this.bounce = !!props.bounce;
			this.timeScale = props.timeScale || 1;
			props.onChange && this.addEventListener("change", props.onChange);
			props.onComplete && this.addEventListener("complete", props.onComplete);
		}

		// while `position` is shared, it needs to happen after ALL props are set, so it's handled in _init()
	}

	/**
	 * Returns a list of the labels defined on this tween sorted by position.
	 **/
	get labels(): {label: string, position: number}[] {
		if (!this._labelList) {
			this._labelList = [];
			for (let label of Object.keys(this._labels)) {
				this._labelList.push({label, position: this._labels[label]});
			}
			this._labelList.sort((a, b) => a.position - b.position);
		}
		return this._labelList.map(a => {return {label: a.label, position: a.position}});
	}

	set labels(labels: {label: string, position: number}[]) {
		for (const label of labels) {
			this._labels[label.label] = label.position;
		}
		this._labelList = [];
	}

	/**
	 * Returns the name of the label on or immediately before the current position. For example, given a tween with
	 * two labels, "first" on frame index 4, and "second" on frame 8, currentLabel would return:
	 * <ul>
	 *   <li>null if the current position is 2.</li>
	 *   <li>"first" if the current position is 4.</li>
	 *   <li>"first" if the current position is 7.</li>
	 *   <li>"second" if the current position is 15.</li>
	 * </ul>
	 **/
	get currentLabel(): string | null {
		let labels = this._labels;
		let pos = this.position;
		let i = 0;
		const l = labels.length;
		for ( ; i < l; i++) {
			if (pos < labels[i]) {
				break;
			}
		}
		return (i === 0) ? null : Object.keys(labels)[i - 1];
	}

	/**
	 * Pauses or unpauses the tween. A paused tween is removed from the global registry and is eligible for garbage collection
	 * if no other references to it exist.
	 **/
	abstract get paused(): boolean;

	abstract set paused(paused: boolean);

	/**
	 * Advances the tween by a specified amount.
	 **/
	advance(delta: number, ignoreActions: boolean = false) {
		this.setPosition(this.rawPosition + delta * this.timeScale, ignoreActions);
	}

	/**
	 * Advances the tween to a specified position.
	 *
	 * @emits tweenjs.AbstractTween#event:change
	 * @emits tweenjs.AbstractTween#event:complete
	 *
	 * @param {Number} rawPosition The raw position to seek to in milliseconds (or ticks if useTicks is true).
	 * @param {Boolean} [ignoreActions=false] If true, do not run any actions that would be triggered by this operation.
	 * @param {Boolean} [jump=false] If true, only actions at the new position will be run. If false, actions between the old and new position are run.
	 * @param {Function} [callback] Primarily for use with MovieClip, this callback is called after properties are updated, but before actions are run.
	 */
	setPosition(rawPosition: number, ignoreActions: boolean = false, jump: boolean = false, callback?: (tween: AbstractTween) => void) {
		const d = this.duration, loopCount = this.loop, prevRawPos = this.rawPosition;
		let loop = 0, t = 0;
		let end: boolean;

		// normalize position:
		if (rawPosition < 0) {
			rawPosition = 0;
		}

		if (d === 0) {
			// deal with 0 length tweens.
			end = true;
			if (prevRawPos !== -1) {
				return end;
			} // we can avoid doing anything else if we're already at 0.
		} else {
			loop = rawPosition / d | 0;
			t = rawPosition - loop * d;

			end = (loopCount !== -1 && rawPosition >= loopCount * d + d);
			if (end) {
				rawPosition = (t = d) * (loop = loopCount) + d;
			}
			if (rawPosition === prevRawPos) {
				return end;
			} // no need to update

			// current loop is reversed
			if (!this.reversed !== !(this.bounce && loop % 2)) {
				t = d - t;
			}
		}

		// set this in advance in case an action modifies position:
		this.position = t;
		this.rawPosition = rawPosition;

		this._updatePosition(jump, end);
		if (end) {
			this.paused = true;
		}

		callback && callback(this);

		if (!ignoreActions) {
			this._runActions(prevRawPos, rawPosition, jump, !jump && prevRawPos === -1);
		}

		this.dispatchEvent("change");
		if (end) {
			this.dispatchEvent("complete");
		}
	}

	/**
	 * Calculates a normalized position based on a raw position.
	 **/
	calculatePosition(rawPosition: number): number {
		// largely duplicated from setPosition, but necessary to avoid having to instantiate generic objects to pass values (end, loop, position) back.
		const d = this.duration, loopCount = this.loop;
		let loop = 0, t = 0;

		if (d === 0) {
			return 0;
		}
		if (loopCount !== -1 && rawPosition >= loopCount * d + d) {
			t = d;
			loop = loopCount
		} else if (rawPosition < 0) {
			t = 0;
		} else {
			loop = rawPosition / d | 0;
			t = rawPosition - loop * d;
		}

		return (!this.reversed !== !(this.bounce && loop % 2)) ? d - t : t;
	}

	/**
	 * Adds a label that can be used with {@link Timeline#gotoAndPlay} and {@link Timeline#gotoAndStop}.
	 **/
	addLabel(label: string, position: number) {
		if (!this._labels) {
			this._labels = {};
		}
		this._labels[label] = position;
		const list = this._labelList;
		if (list) {
			let i, l;
			for (i = 0, l = list.length; i < l; i++) {
				if (position < list[i].position) {
					break;
				}
			}
			list.splice(i, 0, {label, position});
		}
	}

	/**
	 * Unpauses this timeline and jumps to the specified position or label.
	 **/
	gotoAndPlay(positionOrLabel: string | number) {
		this.paused = false;
		this._goto(positionOrLabel);
	}

	/**
	 * Pauses this timeline and jumps to the specified position or label.
	 *
	 * @param {String|Number} positionOrLabel The position in milliseconds (or ticks if `useTicks` is `true`) or label
	 * to jump to.
	 */
	gotoAndStop(positionOrLabel: string | number) {
		this.paused = true;
		this._goto(positionOrLabel);
	}

	/**
	 * If a numeric position is passed, it is returned unchanged. If a string is passed, the position of the
	 * corresponding frame label will be returned, or `null` if a matching label is not defined.
	 *
	 * @param {String|Number} positionOrLabel A numeric position value or label String.
	 */
	resolve(positionOrLabel: string | number): number | null {
		if (typeof(positionOrLabel) == 'number') {
			return positionOrLabel;
		}
		return this._labels && this._labels[positionOrLabel];
	}

	/**
	 * Returns a string representation of this object.
	 *
	 * @return {String} a string representation of the instance.
	 */
	toString(): string {
		return `[${this.constructor.name}${this.name ? ` (name=${this.name})` : ""}]`;
	}

	abstract clone(): AbstractTween;

	/**
	 * Shared logic that executes at the end of the subclass constructor.
	 *
	 * @private
	 *
	 * @param {Object} [props]
	 */
	_init(props: TweenProps) {
		if (!props || !props.paused) {
			this.paused = false;
		}
		if (props && props.position != null) {
			this.setPosition(props.position);
		}
	}

	/**
	 * @private
	 * @param {String|Number} positionOrLabel
	 */
	_goto(positionOrLabel: string | number) {
		const pos = this.resolve(positionOrLabel);
		if (pos != null) {
			this.setPosition(pos, false, true);
		}
	}

	/**
	 * Runs actions between startPos & endPos. Separated to support action deferral.
	 *
	 * @private
	 *
	 * @param {Number} startRawPos
	 * @param {Number} endRawPos
	 * @param {Boolean} jump
	 * @param {Boolean} includeStart
	 */
	abstract _runActions(startRawPos: number, endRawPos: number, jump: boolean, includeStart: boolean): void;

	abstract _runActionsRange(startPos: number, endPos: number, jump: boolean, includeStart: boolean): boolean;

	abstract _updatePosition(jump: boolean, end?: boolean): void;
}



// helpers:
export class TweenStep {
	next?: TweenStep;
	prev?: TweenStep;
	t: number;
	d: number;
	props: TweenProps;
	ease: Function;
	passive: boolean;
	index: number = 0;

	constructor (prev?: TweenStep, t: number = 0, d: number = 0, props: TweenProps = {}, ease: EaseFunction = Ease.linear, passive: boolean = true) {
		this.prev = prev;
		this.t = t;
		this.d = d;
		this.props = props;
		this.ease = ease;
		this.passive = passive;
		this.index = prev ? prev.index + 1 : 0;
	}

}

export class TweenAction {
	next?: TweenAction;
	prev?: TweenAction;
	t: number;
	d: number;
	scope: any;
	funct: Function;
	params: any[];

	constructor (prev: TweenAction|undefined, t: number, scope: any, funct: Function, params: any[]) {
		this.d = 0;
		this.prev = prev;
		this.t = t;
		this.scope = scope;
		this.funct = funct;
		this.params = params;
	}
}