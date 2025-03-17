export type ViewabilityOptions = {
  /**
   * Automatically starts tracking on instantiation
   * @default true
   */
  autostart?: boolean;
  /**
   * Automatically stop tracking and disconnects the observer when viewability is completed
   * @default true
   */
  autostop?: boolean;
  /**
   * A numeric threshold (from 0 to 1) representing the minimum fraction of the element's area
   * that must be visible (i.e., not covered by other elements) for it to be considered "really visible".
   * For example, a value of 0.5 indicates that at least 50% of the element's area must be uncovered.
   *
   * @default 0.1 means that if 10% of the element is obscured by other element, is not considered really visibile
   */
  coverageThreshold?: number;
  /**
   * The percentage of visibility required to consider the element "in view" (between 0 and 1)
   * @default 0.5
   */
  inViewThreshold?: number;
  /**
   * Whether to check if the element is truly visible in the viewport.
   * When `true`, the element is considered visible only if it is not hidden
   * by CSS, has a non-zero size, is within the viewport, and is not
   * covered by another element.
   * If `false`, only its presence in the viewport is checked.
   * @default true
   */
  isVisible?: boolean;
  /**
   * Time (in milliseconds) the element must remain in view to be considered fully viewed
   * @default 1000
   */
  timeInView?: number;
  /** Callback function triggered when viewability is completed */
  onComplete?: (() => void) | undefined;
  /** Callback function triggered on error */
  onError?: ((error: Error) => void) | undefined;
};

export class Viewability {
  el: HTMLElement | string = "";
  element: HTMLElement | null = null;
  largeSizeElement = 242_500;
  options: Required<Omit<ViewabilityOptions, "onComplete" | "onError">> & {
    onComplete?: () => void;
    onError?: (error: Error) => void;
  };
  
  onComplete: (() => void) | undefined;
  onError: ((error: Error) => void) | undefined;

  completed = false;
  inView = false;
  started = false;
  observer: IntersectionObserver | null = null;
  timer: NodeJS.Timeout | undefined;

  constructor(
    elem: HTMLElement | string,
    options: Partial<ViewabilityOptions> = {}
  ) {
    this.options = Object.assign(
      {
        autostart: true,
        autostop: true,
        coverageThreshold: 0.1, // means that if 10% of the element is obscured by other element, is not considered really visibile
        inViewThreshold: 0.5, // IAB Standard default
        isVisible: true,
        timeInView: 1000, // IAB Standard default
      },
      options
    );
    if (!this._validateOptions()) {
      return;
    }
    this.el = elem;
    if (this.options.autostart) this.start();
  }

  /** Starts the IntersectionObserver to track viewability */
  start(): void {
    this._initializeElement();
    // Avoid multiple observers
    if (this.observer !== null || this.element === null) return;
    /**
     * If the `inViewThreshold` is the one defined by the IAB standard and the area of
     * the element is >= 242.500 set the threshold to 30% as per IAB definition
     * https://www.iab.com/wp-content/uploads/2015/06/MRC-Viewable-Ad-Impression-Measurement-Guideline.pdf
     */
    if (this.options.inViewThreshold === 0.5) {
      const rect = this.element.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area >= this.largeSizeElement) this.options.inViewThreshold = 0.3;
    }

    this.observer = new window.IntersectionObserver(
      this._viewableChange.bind(this),
      { threshold: this.options.inViewThreshold }
    );
    this.observer.observe(this.element);
  }

  /** Stops observing the element and cleans up the observer and timer */
  stop(): void {
    this._unobserve();
    this._stopTimer();
  }

  _initializeElement() {
    if (this.element === null) {
      const element = this._getElement(this.el);
      if (!element) {
        this._handleError(new Error("Element not found"));
        return;
      }
      this.element = element;
    }
  }

  _unobserve() {
    if (this.observer && this.element) {
      this.observer.unobserve(this.element);
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Callback function triggered when viewability changes
   * @param  {Array} entries - change entries
   */
  _viewableChange(entries: IntersectionObserverEntry[]): void {
    const entry = entries[0];
    if (!entry || this.completed) return;

    const rect = entry.boundingClientRect;
    /* c8 ignore next */
    if (this.options.isVisible && !this._isReallyVisible(rect)) return;

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
  _inView(): void {
    this.started = true;
    this.inView = true;
    this.timer = setTimeout(() => this._onComplete(), this.options.timeInView);
  }

  /** Handles element leaving the viewability threshold */
  _outView(): void {
    this.inView = false;
    this._stopTimer();
  }

  /** Cleans up the timer */
  _stopTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /** Marks the element as completely viewed and stops tracking */
  _onComplete(): void {
    if (!this.completed) {
      this.completed = true;
      const onComplete = this.options.onComplete ?? this.onComplete;
      if (typeof onComplete === "function") onComplete();
    }
    // Stop tracking element
    if (this.options.autostop) this._unobserve();
    // Always stop timer onComplete
    this._stopTimer();
  }

  /** Retrieves the DOM element from a selector or HTMLElement */
  _getElement(elem: HTMLElement | string): HTMLElement | null {
    if (typeof elem === "string") {
      return document.getElementById(elem) ?? document.querySelector(elem);
    }
    if (elem instanceof HTMLElement) return elem;
    return null;
  }

  /** Validates the provided options */
  _validateOptions(): boolean {
    const {
      autostart,
      autostop,
      coverageThreshold,
      inViewThreshold,
      isVisible,
      timeInView,
    } = this.options;
    if (typeof autostart !== "boolean") {
      this._handleError(
        new Error("'coverageThreshold' must be 'true' or 'false'")
      );
      return false;
    }
    if (typeof autostop !== "boolean") {
      this._handleError(
        new Error("'coverageThreshold' must be 'true' or 'false'")
      );
      return false;
    }
    if (typeof isVisible !== "boolean") {
      this._handleError(
        new Error("'coverageThreshold' must be 'true' or 'false'")
      );
      return false;
    }
    if (
      typeof coverageThreshold !== "number" ||
      coverageThreshold <= 0 ||
      coverageThreshold > 1
    ) {
      this._handleError(
        new Error(
          "'coverageThreshold' must be a number greater than 0 and up to 1"
        )
      );
      return false;
    }
    if (
      typeof inViewThreshold !== "number" ||
      inViewThreshold < 0 ||
      inViewThreshold > 1
    ) {
      this._handleError(
        new Error("'inViewThreshold' must be a number between 0 and 1")
      );
      return false;
    }
    if (typeof timeInView !== "number" || timeInView < 0) {
      this._handleError(
        new Error("'timeInView' must be a number greater than or equal to 0")
      );
      return false;
    }
    return true;
  }

  _isReallyVisible(rect: DOMRect): boolean {
    // Return false immediately if the element is null or undefined
    if (!this.element) return false;

    // Check if the element is hidden via the "hidden" attribute
    if (this.element.hidden) return false;

    // Retrieve computed styles for the element
    const style = window.getComputedStyle(this.element);

    // Basic checks: verify that display, visibility, and opacity indicate visibility
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      Number.parseFloat(style.opacity) === 0
    ) {
      return false;
    }

    // Use getBoundingClientRect to check the element's actual dimensions
    if (rect.width === 0 || rect.height === 0) return false;

    // Check for CSS transformations that might reduce the element's size to zero
    if (style.transform && style.transform !== "none") {
      // Check for 2D transformation matrix
      const matrixMatch = style.transform.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const values = matrixMatch[1].split(",").map(Number.parseFloat);
        // In a 2D matrix, matrix(a, b, c, d, tx, ty), a and d represent scaling factors
        if (values[0] === 0 || values[3] === 0) {
          return false;
        }
      } else if (/scale\(\s*0\s*\)/.test(style.transform)) {
        // Check directly for scale(0)
        return false;
      }
    }

    // Heuristic check if the element is overlapped by another element
    if (this._isObscured(rect)) return false;

    // Recursively check parent elements to determine if any parent hides the element
    let parent = this.element.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (
        parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        parentStyle.visibility === "collapse"
      ) {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  // Helper function that checks if the element is obscured by sampling multiple points
  _isObscured = (rect: DOMRect) => {
    // Return false immediately if the element is null or undefined
    if (!this.element) return false;

    // Define sample points (center, quarter positions, and corners)
    const samplePoints = [
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, // Center
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.25 }, // Top-left quarter
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.25 }, // Top-right quarter
      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.75 }, // Bottom-left quarter
      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.75 }, // Bottom-right quarter
      { x: rect.left + 1, y: rect.top + 1 }, // Top-left corner (offset 1px)
      { x: rect.right - 1, y: rect.top + 1 }, // Top-right corner (offset 1px)
      { x: rect.left + 1, y: rect.bottom - 1 }, // Bottom-left corner (offset 1px)
      { x: rect.right - 1, y: rect.bottom - 1 }, // Bottom-right corner (offset 1px)
    ];

    let coveredCount = 0;
    let validPoints = 0;

    // Check each sample point
    for (const point of samplePoints) {
      // Skip points that are outside the viewport
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x > window.innerWidth ||
        point.y > window.innerHeight
      ) {
        return false;
      }
      validPoints++;
      // Get the topmost element at this point
      const topElement = document.elementFromPoint(point.x, point.y);
      // If the top element is not the target (or one of its descendants), count as covered
      if (
        topElement &&
        !this.element.contains(topElement) &&
        topElement !== this.element
      ) {
        coveredCount++;
      }
    }

    // Calculate the ratio of points that are covered
    const coveredRatio = coveredCount / validPoints;
    return coveredRatio >= this.options.coverageThreshold;
  };

  _handleError(error: Error) {
    const onError = this.options.onError ?? this.onError;
    if (typeof onError === "function") {
      onError(error);
    } else {
      console.error(error.message);
    }
  }
}

if (typeof window !== "undefined") {
  // @ts-expect-error
  window.Viewability = Viewability;
}

export default Viewability;
