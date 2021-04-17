export type EaseFunction = (t: number) => number;

export namespace Ease {

    export function linear(t: number): number {
        return t;
    }

    /**
     * Mimics the simple -100 to 100 easing in Flash Pro.
     * @param {Number} amount A value from -1 (ease in) to 1 (ease out) indicating the strength and direction of the ease.
     **/
    export function get(amount: number): EaseFunction {
        amount = Math.max(-1, Math.min(amount, 1));
        return function (t: number): number {
            if (amount == 0) {
                return t;
            }
            if (amount < 0) {
                return t * (t * -amount + 1 + amount);
            }
            return t * ((2 - t) * amount + (1 - amount));
        };
    }

    /**
     * Configurable exponential ease.
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     **/
    export function getPowIn(pow: number): EaseFunction {
        return function (t: number): number {
            return Math.pow(t, pow);
        };
    }

    /**
     * Configurable exponential ease.
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     **/
    export function getPowOut(pow: number): EaseFunction {
        return function (t: number): number {
            return 1 - Math.pow(1 - t, pow);
        };
    }

    /**
     * Configurable exponential ease.
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     **/
    export function getPowInOut(pow: number): EaseFunction {
        return function (t: number): number {
            if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow);
            return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow));
        };
    }

    /**
     * @param {Number} t
     **/
    export function sineIn(t: number): number {
        return 1 - Math.cos(t * Math.PI / 2);
    }

    /**
     * @param {Number} t
     **/
    export function sineOut(t: number): number {
        return Math.sin(t * Math.PI / 2);
    }

    /**
     * @param {Number} t
     */
    export function sineInOut(t: number): number {
        return -0.5 * (Math.cos(Math.PI * t) - 1);
    }

    /**
     * Configurable "back in" ease.
     * @param {Number} amount The strength of the ease.
     **/
    export function getBackIn(amount: number): EaseFunction {
        return function (t: number): number {
            return t * t * ((amount + 1) * t - amount);
        };
    }

    /**
     * Configurable "back out" ease.
     * @param {Number} amount The strength of the ease.
     **/
    export function getBackOut(amount: number): EaseFunction {
        return function (t: number): number {
            return (--t * t * ((amount + 1) * t + amount) + 1);
        };
    }

    /**
     * Configurable "back in out" ease.
     * @param {Number} amount The strength of the ease.
     **/
    export function getBackInOut(amount: number): EaseFunction {
        amount *= 1.525;
        return function (t: number): number {
            if ((t *= 2) < 1) return 0.5 * (t * t * ((amount + 1) * t - amount));
            return 0.5 * ((t -= 2) * t * ((amount + 1) * t + amount) + 2);
        };
    }

    /**
     * @param {Number} t
     **/
    export function circIn(t: number): number {
        return -(Math.sqrt(1 - t * t) - 1);
    }

    /**
     * @param {Number} t
     **/
    export function circOut(t: number): number {
        return Math.sqrt(1 - --t * t);
    }

    /**
     * @param {Number} t
     **/
    export function circInOut(t: number): number {
        if ((t *= 2) < 1) {
            return -0.5 * (Math.sqrt(1 - t * t) - 1);
        } else {
            return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
        }
    }

    /**
     * @param {Number} t
     **/
    export function bounceIn(t: number): number {
        return 1 - bounceOut(1 - t);
    }

    /**
     * @param {Number} t
     **/
    export function bounceOut(t: number): number {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }

    /**
     * @param {Number} t
     **/
    export function bounceInOut(t: number): number {
        if (t < 0.5) {
            return bounceIn(t * 2) * 0.5;
        } else {
            return bounceOut(t * 2 - 1) * 0.5 + 0.5;
        }
    }

    /**
     * Configurable elastic ease.
     * @param {Number} amplitude
     * @param {Number} period
     **/
    export function getElasticIn(amplitude: number, period: number): EaseFunction {
        let pi2 = Math.PI * 2;
        return function (t: number): number {
            if (t === 0 || t === 1) return t;
            let s = period / pi2 * Math.asin(1 / amplitude);
            return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
        };
    }

    /**
     * Configurable elastic ease.
     * @param {Number} amplitude
     * @param {Number} period
     **/
    export function getElasticOut(amplitude: number, period: number): EaseFunction {
        let pi2 = Math.PI * 2;
        return function (t: number): number {
            if (t === 0 || t === 1) return t;
            let s = period / pi2 * Math.asin(1 / amplitude);
            return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * pi2 / period) + 1;
        };
    }

    /**
     * Configurable elastic ease.
     * @param {Number} amplitude
     * @param {Number} period
     **/
    export function getElasticInOut(amplitude: number, period: number): EaseFunction {
        let pi2 = Math.PI * 2;
        return function (t: number): number {
            let s = period / pi2 * Math.asin(1 / amplitude);
            if ((t *= 2) < 1) return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
            return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * pi2 / period) * 0.5 + 1;
        };
    }

    export const none: EaseFunction = linear;
    export const quadIn: EaseFunction = getPowIn(2);
    export const quadOut: EaseFunction = getPowOut(2);
    export const quadInOut: EaseFunction = getPowInOut(2);
    export const cubicIn: EaseFunction = getPowIn(3);
    export const cubicOut: EaseFunction = getPowOut(3);
    export const cubicInOut: EaseFunction = getPowInOut(3);
    export const quartIn: EaseFunction = getPowIn(4);
    export const quartOut: EaseFunction = getPowOut(4);
    export const quartInOut: EaseFunction = getPowInOut(4);
    export const quintIn: EaseFunction = getPowIn(5);
    export const quintOut: EaseFunction = getPowOut(5);
    export const quintInOut: EaseFunction = getPowInOut(5);
    export const backIn: EaseFunction = getBackIn(1.7);
    export const backOut: EaseFunction = getBackOut(1.7);
    export const backInOut: EaseFunction = getBackInOut(1.7);
    export const elasticIn: EaseFunction = getElasticIn(1, 0.3);
    export const elasticOut: EaseFunction = getElasticOut(1, 0.3);
    export const elasticInOut: EaseFunction = getElasticInOut(1, 0.3 * 1.5);
}