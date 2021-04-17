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
            this.setLabels(props.labels);
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

    _runActionsRange (startPos: number, endPos: number, jump: boolean, includeStart: boolean): boolean {
        //console.log("	range", startPos, endPos, jump, includeStart);
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