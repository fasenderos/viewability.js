export type ViewabilityOptions = {
  /**
   * Automatically starts tracking on instantiation
   * @default true
   */
  autostart: boolean;
  /**
   * The percentage of visibility required to consider the element "in view" (between 0 and 1)
   * @default 0.5
   */
  inViewThreshold: number;
  /**
   * Time (in milliseconds) the element must remain in view to be considered fully viewed
   * @default 1000
   */
  timeInView: number;
  /** Callback function triggered when viewability is completed */
  onComplete?: (() => void) | undefined;
};

export class Viewability {
  // @ts-expect-error assigned in constructor
  element: HTMLElement;
  options: ViewabilityOptions;
  observer: IntersectionObserver | null = null;
  started = false;
  percentViewable = 0;
  inView = false;
  timer: NodeJS.Timeout | undefined;
  completed = false;
  onComplete: (() => void) | undefined;

  constructor(
    elem: HTMLElement | string,
    options: Partial<ViewabilityOptions> = {}
  ) {
    this.options = Object.assign(
      {
        inViewThreshold: 0.5,
        timeInView: 1000,
        autostart: true,
      },
      options
    );
    if (!this._validateOptions()) {
      return;
    }

    const element = this._getElement(elem);
    if (!element) {
      console.error("Element not found");
      return;
    }

    this.element = element;
    if (this.options.autostart) this.start();
  }

  /** Starts the IntersectionObserver to track viewability */
  start(): void {
    if (this.observer) return; // Avoid multiple observers
    this.observer = new window.IntersectionObserver(
      this._viewableChange.bind(this),
      { threshold: this.options.inViewThreshold }
    );
    this.observer.observe(this.element);
  }

  /** Stops observing the element and cleans up the observer and timer */
  stop(): void {
    if (this.observer) {
      this.observer.unobserve(this.element);
      this.observer.disconnect();
      this.observer = null;
    }
    this._stopTimer();
  }

  /**
   * Callback function triggered when viewability changes
   * @param  {Array} entries - change entries
   */
  private _viewableChange(entries: IntersectionObserverEntry[]): void {
    const entry = entries[0];
    if (!entry || this.completed) return;
    this.percentViewable = entry.intersectionRatio;
    if (
      entry.intersectionRatio < this.options.inViewThreshold &&
      this.started &&
      this.inView
    ) {
      this._outView();
    }
    if (
      entry.intersectionRatio >= this.options.inViewThreshold &&
      !this.inView
    ) {
      this._inView();
    }
  }

  /** Handles element entering the viewability threshold */
  private _inView(): void {
    this.started = true;
    this.inView = true;
    this.timer = setTimeout(() => this._onComplete(), this.options.timeInView);
  }

  /** Handles element leaving the viewability threshold */
  private _outView(): void {
    this.inView = false;
    this._stopTimer();
  }

  /** Cleans up the timer */
  private _stopTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /** Marks the element as completely viewed and stops tracking */
  private _onComplete(): void {
    if (!this.completed) {
      this.completed = true;
      const onComplete = this.options.onComplete ?? this.onComplete;
      if (typeof onComplete === "function") onComplete();
    }
    this.stop();
  }

  /** Retrieves the DOM element from a selector or HTMLElement */
  private _getElement(elem: HTMLElement | string): HTMLElement | null {
    if (typeof elem === "string") {
      return document.getElementById(elem) ?? document.querySelector(elem);
    }
    if (elem instanceof HTMLElement) return elem;
    return null;
  }

  /** Validates the provided options */
  private _validateOptions(): boolean {
    const { inViewThreshold, timeInView } = this.options;
    if (
      typeof inViewThreshold !== "number" ||
      inViewThreshold < 0 ||
      inViewThreshold > 1
    ) {
      console.error("'inViewThreshold' must be a number between 0 and 1");
      return false;
    }
    if (typeof timeInView !== "number" || timeInView < 0) {
      console.error("'timeInView' must be a number greater than or equal to 0");
      return false;
    }
    return true;
  }
}

if (typeof window !== "undefined") {
  // @ts-expect-error
  window.Viewability = Viewability;
}

export default Viewability;
