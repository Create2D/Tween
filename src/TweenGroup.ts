import AbstractTween from "./AbstractTween";
import Timeline from "./Timeline";
import Tween from "./Tween";

export default class TweenGroup extends AbstractTween {
    private _tweens: AbstractTween[] = [];
    private __onComplete: any;

    /**
     * @param {Boolean} [paused] The initial paused property value for this group.
     * @param {Number} [timeScale] The intiial timeScale property value for this group.
     */
    constructor(paused: boolean = false, timeScale: number = 1) {
        super();
        this.paused = paused;
        this.timeScale = timeScale;
        this.__onComplete = this._onComplete.bind(this);
    }

    /**
     * Pauses or unpauses the group. The value is propagated to every tween or group that has been added to this group.
     * @type {Boolean}
     */
    get paused(): boolean {
        return this._paused;
    }
    set paused(value: boolean) {
        const tweens = this._tweens;
        this._paused = value;
        for (let i = tweens.length - 1; i >= 0; i--) {
            tweens[i].paused = value;
        }
    }

    /**
     * Sets the time scale of the group. The value is propagated to every tween or group that has been added to this group.
     **/
    get timeScale(): number {
        return this._timeScale;
    }
    set timeScale(value: number) {
        const tweens = this._tweens;
        this._timeScale = value;
        for (let i = tweens.length - 1; i >= 0; i--) {
            tweens[i].timeScale = value;
        }
    }

    /**
     * Shortcut method to create a new tween instance via {@link Tween.get} and immediately add it to this group.
     * @param {Object} target The target object that will have its properties tweened.
     * @param {Object} [props] The configuration properties to apply to this instance.
     * @return {AbstractTween} A reference to the created tween.
     */
    get(target: any, props: any): AbstractTween {
        return this.add(Tween.get(target, props));
    }

    /**
     * Adds a Tween, Timeline, or TweenGroup instance to this group. The added object will immediately have its `paused` and `timeScale` properties
     * set to the value of this group's corresponding properties.
     *
     * @example
     * myGroup.paused = true;
     * myGroup.add(myTween); // myTween is now paused
     * // ...
     * myGroup.paused = false; // myTween is now unpaused
     * // can also add multiple objects:
     * myGroup.add(myTween, myTween2, myTimeline, myOtherGroup);
     *
     * @param {... Tween|Timeline|TweenGroup} tweens The tween, timeline, or tween group to add.
     * @return {Object} This tween that was added.
     */
    add(...tweens: AbstractTween[]): AbstractTween {
        const l = tweens.length;
        for (let i = 0; i < l; i++) {
            const tween = tweens[i];
            tween.paused = this._paused;
            if (this._timeScale !== null) { tween.timeScale = this._timeScale; }
            this._tweens.push(tween);
            tween.addEventListener && tween.addEventListener("complete", this._onComplete);
        }
        return tweens[l - 1];
    }

    /**
     * Removes a Tween, Timeline, or TweenGroup instance from this group.
     * Note that tweens and timelines are automatically removed when their `complete` event fires.
     *
     * @example
     * myGroup.remove(myTween);
     * // can also remove multiple objects:
     * myGroup.remove(myTween, myTween2, myTimeline, myOtherGroup);
     *
     * @param {...Tween|Timeline|TweenGroup} tweens The tween, timeline, or tween group to remove.
     */
    remove(...tweens: (Tween|TweenGroup|Timeline)[]) {
        const l = tweens.length;
        const t = this._tweens;
        for (let i = 0; i < l; i++) {
            const tween = tweens[i];
            for (let j = t.length - 1; j >= 0; j--) {
                if (t[j] === tween) {
                    t.splice(j, 1);
                    tween.removeEventListener && tween.removeEventListener("complete", this.__onComplete);
                }
            }
        }
    }

    /**
     * Pauses all child tweens/timelines/groups and removes them from this group. Child groups will also be reset.
     * @param {Boolean} keepGroups If true, groups will not be removed, only reset.
     * @return {TweenGroup} This instance (for chaining calls).
     * @chainable
     */
    reset(keepGroups: boolean = true): TweenGroup {
        const tweens = this._tweens;
        for (let i = tweens.length - 1; i >= 0; i--) {
            const tween = tweens[i];
            if (tween instanceof TweenGroup) {
                tween.reset();
                if (keepGroups) { continue; }
            }
            tweens.splice(i,1);
            tween.paused = true;
            tween.removeEventListener && tween.removeEventListener("complete", this.__onComplete);
        }
        return this;
    }

    clone(): TweenGroup {
        throw new Error("Method not implemented.");
    }

    _onComplete(evt: any) {
        this.remove(evt.target);
    }
    _runActions(startRawPos: number, endRawPos: number, jump: boolean, includeStart: boolean) {
        throw new Error("Method not implemented.");
    }
    _runActionsRange(startPos: number, endPos: number, jump: boolean, includeStart: boolean): boolean {
        throw new Error("Method not implemented.");
    }
    _updatePosition(jump: boolean, end?: boolean | undefined): void {
        throw new Error("Method not implemented.");
    }
}
