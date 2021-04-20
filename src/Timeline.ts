import AbstractTween, {TweenProps} from "./AbstractTween";
import Tween from "./Tween";

export interface TimelineProps extends TweenProps {
    tweens?: Tween[],
    labels?: any
}

export default class Timeline extends AbstractTween {

    /**
     * The array of tweens in the timeline. It is *strongly* recommended that you use
     * {@link Tween#addTween} and {@link Tween#removeTween},
     * rather than accessing this directly, but it is included for advanced uses.
     **/
    tweens: Tween[] = [];

    constructor (props: TimelineProps) {
        super(props);


        if (props.tweens) {
            this.addTween(...props.tweens);
        }
        if (props.labels) {
            this.labels = props.labels;
        }

        this._init(props);
    }

    /**
     * Adds one or more tweens (or timelines) to this timeline. The tweens will be paused (to remove them from the
     * normal ticking system) and managed by this timeline. Adding a tween to multiple timelines will result in
     * unexpected behaviour.
     **/
    addTween (...tweens: Tween[]): Tween|null {
        const l = tweens.length;
        if (l === 1) {
            const tween = tweens[0];
            this.tweens.push(tween);
            tween._parent = this;
            tween.paused = true;
            let d = tween.duration;
            if (tween.loop > 0) { d *= tween.loop + 1; }
            if (d > this.duration) { this.duration = d; }
            if (this.rawPosition >= 0) { tween.setPosition(this.rawPosition); }
            return tween;
        }
        if (l > 1) {
            for (let i = 0; i < l; i++) {
                this.addTween(tweens[i]);
            }
            return tweens[l - 1];
        }
        return null;
    }

    /**
     * Removes one or more tweens from this timeline.
     **/
    removeTween (...tweens: Tween[]): boolean {
        const l = tweens.length;
        if (l === 1) {
            const tw = this.tweens;
            const tween = tweens[0];
            let i = tw.length;
            while (i--) {
                if (tw[i] === tween) {
                    tw.splice(i, 1);
                    tween._parent = undefined;
                    if (tween.duration >= this.duration) { this.updateDuration(); }
                    return true;
                }
            }
            return false;
        }
        if (l > 1) {
            let good = true;
            for (let i = 0; i < l; i++) { good = good && this.removeTween(tweens[i]); }
            return good;
        }
        return true;
    }

    /**
     * Recalculates the duration of the timeline. The duration is automatically updated when tweens are added or removed,
     * but this method is useful if you modify a tween after it was added to the timeline.
     **/
    updateDuration () {
        this.duration = 0;
        for (let i = 0, l = this.tweens.length; i < l; i++) {
            let tween = this.tweens[i];
            let d = tween.duration;
            if (tween.loop > 0) { d *= tween.loop + 1; }
            if (d > this.duration) { this.duration = d; }
        }
    }

    get paused(): boolean {
        return this._paused;
    }

    set paused(paused: boolean) {
        this._paused = paused;
    }

    /**
     * @throws Timeline cannot be cloned.
     **/
    clone () {
        throw "Timeline can not be cloned.";
    }

    _updatePosition (jump: boolean, end?: boolean) {
        const t = this.position;
        for (let i = 0, l = this.tweens.length; i < l; i++) {
            this.tweens[i].setPosition(t, true, jump); // actions will run after all the tweens update.
        }
    }

    _runActions(startRawPos: number, endRawPos: number, jump: boolean, includeStart: boolean){
        if (!this._actionHead && !this.tweens) {
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

    _runActionsRange (startPos: number, endPos: number, jump: boolean, includeStart: boolean): boolean {
        const t = this.position;
        for (let i = 0, l = this.tweens.length; i < l; i++) {
            this.tweens[i]._runActions(startPos, endPos, jump, includeStart);
            if (t !== this.position) {
                return true; // an action changed this timeline's position.
            }
        }
        return false;
    }
}