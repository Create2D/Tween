export type EaseFunction = (t: number) => number;

export default class Ease {

    public static linear(t: number): number {
        return t;
    }

    /**
     * Mimics the simple -100 to 100 easing in Flash Pro.
     * @param {Number} amount A value from -1 (ease in) to 1 (ease out) indicating the strength and direction of the ease.
     **/
    public static get(amount: number): EaseFunction {
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
    public static getPowIn(pow: number): EaseFunction {
        return function (t: number): number {
            return Math.pow(t, pow);
        };
    }

    /**
     * Configurable exponential ease.
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     **/
    public static getPowOut(pow: number): EaseFunction {
        return function (t: number): number {
            return 1 - Math.pow(1 - t, pow);
        };
    }

    /**
     * Configurable exponential ease.
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     **/
    public static getPowInOut(pow: number): EaseFunction {
        return function (t: number): number {
            if ((t *= 2) < 1) return 0.5 * Math.pow(t, pow);
            return 1 - 0.5 * Math.abs(Math.pow(2 - t, pow));
        };
    }

    /**
     * @param {Number} t
     **/
    public static sineIn(t: number): number {
        return 1 - Math.cos(t * Math.PI / 2);
    }

    /**
     * @param {Number} t
     **/
    public static sineOut(t: number): number {
        return Math.sin(t * Math.PI / 2);
    }

    /**
     * @param {Number} t
     */
    public static sineInOut(t: number): number {
        return -0.5 * (Math.cos(Math.PI * t) - 1);
    }

    /**
     * Configurable "back in" ease.
     * @param {Number} amount The strength of the ease.
     **/
    public static getBackIn(amount: number): EaseFunction {
        return function (t: number): number {
            return t * t * ((amount + 1) * t - amount);
        };
    }

    /**
     * Configurable "back out" ease.
     * @param {Number} amount The strength of the ease.
     **/
    public static getBackOut(amount: number): EaseFunction {
        return function (t: number): number {
            return (--t * t * ((amount + 1) * t + amount) + 1);
        };
    }

    /**
     * Configurable "back in out" ease.
     * @param {Number} amount The strength of the ease.
     **/
    public static getBackInOut(amount: number): EaseFunction {
        amount *= 1.525;
        return function (t: number): number {
            if ((t *= 2) < 1) return 0.5 * (t * t * ((amount + 1) * t - amount));
            return 0.5 * ((t -= 2) * t * ((amount + 1) * t + amount) + 2);
        };
    }

    /**
     * @param {Number} t
     **/
    public static circIn(t: number): number {
        return -(Math.sqrt(1 - t * t) - 1);
    }

    /**
     * @param {Number} t
     **/
    public static circOut(t: number): number {
        return Math.sqrt(1 - --t * t);
    }

    /**
     * @param {Number} t
     **/
    public static circInOut(t: number): number {
        if ((t *= 2) < 1) {
            return -0.5 * (Math.sqrt(1 - t * t) - 1);
        } else {
            return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
        }
    }

    /**
     * @param {Number} t
     **/
    public static bounceIn(t: number): number {
        return 1 - Ease.bounceOut(1 - t);
    }

    /**
     * @param {Number} t
     **/
    public static bounceOut(t: number): number {
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
    public static bounceInOut(t: number): number {
        if (t < 0.5) {
            return Ease.bounceIn(t * 2) * 0.5;
        } else {
            return Ease.bounceOut(t * 2 - 1) * 0.5 + 0.5;
        }
    }

    /**
     * Configurable elastic ease.
     * @param {Number} amplitude
     * @param {Number} period
     **/
    public static getElasticIn(amplitude: number, period: number): EaseFunction {
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
    public static getElasticOut(amplitude: number, period: number): EaseFunction {
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
    public static getElasticInOut(amplitude: number, period: number): EaseFunction {
        let pi2 = Math.PI * 2;
        return function (t: number): number {
            let s = period / pi2 * Math.asin(1 / amplitude);
            if ((t *= 2) < 1) return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * pi2 / period));
            return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * pi2 / period) * 0.5 + 1;
        };
    }

    public static none: EaseFunction = Ease.linear;
    public static quadIn: EaseFunction = Ease.getPowIn(2);
    public static quadOut: EaseFunction = Ease.getPowOut(2);
    public static quadInOut: EaseFunction = Ease.getPowInOut(2);
    public static cubicIn: EaseFunction = Ease.getPowIn(3);
    public static cubicOut: EaseFunction = Ease.getPowOut(3);
    public static cubicInOut: EaseFunction = Ease.getPowInOut(3);
    public static quartIn: EaseFunction = Ease.getPowIn(4);
    public static quartOut: EaseFunction = Ease.getPowOut(4);
    public static quartInOut: EaseFunction = Ease.getPowInOut(4);
    public static quintIn: EaseFunction = Ease.getPowIn(5);
    public static quintOut: EaseFunction = Ease.getPowOut(5);
    public static quintInOut: EaseFunction = Ease.getPowInOut(5);
    public static backIn: EaseFunction = Ease.getBackIn(1.7);
    public static backOut: EaseFunction = Ease.getBackOut(1.7);
    public static backInOut: EaseFunction = Ease.getBackInOut(1.7);
    public static elasticIn: EaseFunction = Ease.getElasticIn(1, 0.3);
    public static elasticOut: EaseFunction = Ease.getElasticOut(1, 0.3);
    public static elasticInOut: EaseFunction = Ease.getElasticInOut(1, 0.3 * 1.5);
}