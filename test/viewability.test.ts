import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Viewability } from "../src/viewability";

// Mock IntersectionObserver (not supported by jsdom)
// https://vitest.dev/guide/mocking.html#globals
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));

const getIntersectionEntry = (
  opts: Partial<IntersectionObserverEntry> = {},
): IntersectionObserverEntry => {
  return {
    intersectionRatio: 0.5,
    boundingClientRect: {
      left: 0,
      top: 0,
      width: 300,
      height: 250,
      right: 300,
      bottom: 250,
      x: 0,
      y: 0,
      toJSON: () => {},
      ...opts.boundingClientRect,
    },
    ...opts,
  } as IntersectionObserverEntry;
};

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("Viewability.js", () => {
  let element: HTMLElement;
  let originalConsoleError: typeof console.error;
  let originalGetBoundingClientRect: typeof element.getBoundingClientRect;

  beforeEach(() => {
    // Set viewport dimensions to ensure all sample points are inside
    window.innerWidth = 1024;
    window.innerHeight = 768;

    // Create a 300x250 element and append it to the body
    element = document.createElement("div");
    element.id = "test-element";
    element.classList.add("test-class");
    element.style.width = "300px";
    element.style.height = "250px";

    document.body.appendChild(element);
    document.elementFromPoint = vi.fn(() => element);

    originalConsoleError = console.error;
    originalGetBoundingClientRect = element.getBoundingClientRect;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    // Restore document.elementFromPoint
    // @ts-ignore
    document.elementFromPoint = document.__proto__.elementFromPoint;
    // Restore original console.error
    console.error = originalConsoleError;
    element.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it("should initialize with default options", () => {
    const tracker = new Viewability(element);
    expect(tracker.element).toBeDefined();
    expect(tracker.options).toEqual({
      autostart: true,
      autostop: true,
      coverageThreshold: 0.1,
      inViewThreshold: 0.5, // IAB Standard default
      isVisible: true,
      timeInView: 1000, // IAB Standard default
    });
    expect(tracker.started).toBe(false);
  });

  it("should validate wrong options", () => {
    {
      // autostart should be boolean
      const tracker = new Viewability(element, {
        // @ts-expect-error must be a boolean
        autostart: 0,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // autostop should be boolean
      const tracker = new Viewability(element, {
        // @ts-expect-error must be a boolean
        autostop: 0,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // isVisible should be boolean
      const tracker = new Viewability(element, {
        // @ts-expect-error must be a boolean
        isVisible: 0,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // coverageThreshold greather than 1
      const tracker = new Viewability(element, {
        coverageThreshold: 2,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // coverageThreshold equal to 0
      const tracker = new Viewability(element, {
        coverageThreshold: 0,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // coverageThreshold lower than 0
      const tracker = new Viewability(element, {
        coverageThreshold: -1,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // Threshold greather than 1
      const tracker = new Viewability(element, {
        inViewThreshold: 2,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // Threshold lower than 0
      const tracker = new Viewability(element, {
        inViewThreshold: -1,
      });
      expect(tracker.element).toBeNull();
    }

    {
      // TimeInView lower than 0
      const tracker = new Viewability(element, {
        timeInView: -1,
      });
      expect(tracker.element).toBeNull();
    }
  });

  it("should accept an element by ID string", () => {
    const tracker = new Viewability("test-element");
    expect(tracker.element).toBe(element);
  });

  it("should accept a css selector", () => {
    const tracker = new Viewability(".test-class");
    expect(tracker.element).toBe(element);
  });

  it("should not start if element not found", () => {
    {
      // Wrong ID
      const tracker = new Viewability("wrong-id");
      expect(tracker.element).toBeNull();
    }
    {
      // Element not found
      const elem = document.getElementById("wrong-id");
      // @ts-expect-error we expect elem is null here
      const tracker = new Viewability(elem);
      expect(tracker.element).toBeNull();
    }
  });

  it("should not start if autostart is false", () => {
    const tracker = new Viewability(element, { autostart: false });
    expect(tracker.timer).toBeUndefined();
  });

  it("should execute onComplete (as option) callback when criteria are met", async () => {
    const mockCallback = vi.fn();

    // Test onComplete option
    const tracker = new Viewability(element, {
      onComplete: mockCallback,
    });

    // Test for missing entries
    tracker._viewableChange([] as IntersectionObserverEntry[]);
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).toBeUndefined();

    tracker._viewableChange([getIntersectionEntry()]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("should execute onComplete (as function) callback when criteria are met", async () => {
    const mockCallback = vi.fn();

    // Test onComplete function
    const tracker = new Viewability(element);
    tracker.onComplete = mockCallback;
    tracker._viewableChange([getIntersectionEntry()]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("should execute onComplete with custom TimeInView", async () => {
    const mockCallback = vi.fn();
    // Test onComplete function
    const tracker = new Viewability(element, { timeInView: 500 });
    tracker.onComplete = mockCallback;
    tracker._viewableChange([getIntersectionEntry()]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("should execute onComplete with custom inViewThreshold", async () => {
    const mockCallback = vi.fn();
    // Test onComplete function
    const tracker = new Viewability(element, {
      inViewThreshold: 0.6,
      timeInView: 200,
    });
    tracker.onComplete = mockCallback;
    tracker._viewableChange([getIntersectionEntry()]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).toBeUndefined();

    tracker._viewableChange([getIntersectionEntry({ intersectionRatio: 0.6 })]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("test inView/outView with onComplete function", async () => {
    const mockCallback = vi.fn();

    // Test onComplete function
    const tracker = new Viewability(element);
    tracker.onComplete = mockCallback;
    // In View
    tracker._viewableChange([getIntersectionEntry()]);
    // Out View
    tracker._viewableChange([getIntersectionEntry({ intersectionRatio: 0 })]);
    expect(tracker.timer).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
  });

  it("test inView/outView with onComplete option", async () => {
    const mockCallback = vi.fn();

    // Test onComplete option
    const tracker = new Viewability(element, {
      onComplete: mockCallback,
    });
    // In View
    tracker._viewableChange([getIntersectionEntry()]);
    // Out View
    tracker._viewableChange([getIntersectionEntry({ intersectionRatio: 0 })]);
    expect(tracker.timer).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
  });

  it("should stop tracking when stop() is called", () => {
    const tracker = new Viewability(element);
    tracker.start();
    tracker.stop();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("should not stop if autostop is false after onComplete is fired", async () => {
    const mockCallback = vi.fn();
    const tracker = new Viewability(element, {
      onComplete: mockCallback,
      autostop: false,
      timeInView: 200,
    });
    tracker._viewableChange([getIntersectionEntry()]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalled();
    // observer should not be disconnected
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  it("should adjust the inViewThreshold for large element", async () => {
    // 970 x 250 = 242.500
    element.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 970,
          height: 250,
        }) as DOMRect,
    );
    const tracker = new Viewability(element);
    tracker.start();
    expect(tracker.options.inViewThreshold).toBe(0.3);
  });

  describe("_isReallyVisible", () => {
    it("should not be called when isVisible is false", () => {
      const tracker = new Viewability(element, { isVisible: false });
      const mockedFn = vi.fn();
      tracker._isReallyVisible = mockedFn;

      tracker._viewableChange([getIntersectionEntry()]);
      expect(mockedFn).not.toHaveBeenCalled();
    });

    it("should return false if element not exists", () => {
      const tracker = new Viewability("wrong-id");
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if element is hidden", () => {
      const tracker = new Viewability(element);
      element.hidden = true;
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if element has style display 'none'", () => {
      const tracker = new Viewability(element);
      element.style.display = "none";
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if element has style visibility 'hidden'", () => {
      const tracker = new Viewability(element);
      element.style.visibility = "hidden";
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if element has style visibility 'collapse'", () => {
      const tracker = new Viewability(element);
      element.style.visibility = "collapse";
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if element has opacity 0", () => {
      const tracker = new Viewability(element);
      element.style.opacity = "0";
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false if rect width or height is 0", () => {
      const tracker = new Viewability(element);
      {
        const result = tracker._isReallyVisible(
          Object.assign(getIntersectionEntry().boundingClientRect, {
            width: 0,
          }),
        );
        expect(result).toBe(false);
      }

      {
        const result = tracker._isReallyVisible(
          Object.assign(getIntersectionEntry().boundingClientRect, {
            height: 0,
          }),
        );
        expect(result).toBe(false);
      }
    });

    it("should return false for transform scale(0)", () => {
      const tracker = new Viewability(element);
      element.style.transform = "scale(0)";
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false for a matrix transform with zero scaleX'", () => {
      const tracker = new Viewability(element);
      // In a 2D matrix, matrix(a, b, c, d, tx, ty), a and d represent scaling factors
      element.style.transform = "matrix(0, 0, 0, 1, 0, 0)"; // scaleX is 0
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should return false for a matrix transform with zero scaleY'", () => {
      const tracker = new Viewability(element);
      // In a 2D matrix, matrix(a, b, c, d, tx, ty), a and d represent scaling factors
      element.style.transform = "matrix(1, 0, 0, 0, 0, 0)"; // scaleY is 0
      const result = tracker._isReallyVisible(
        getIntersectionEntry().boundingClientRect,
      );
      expect(result).toBe(false);
    });

    it("should check if any parent element is hidden", () => {
      const tracker = new Viewability(element);
      const parent = document.createElement("div");
      // Remove the current element and append it to a parent element
      element.parentElement?.removeChild(element);
      parent.appendChild(element);
      document.body.appendChild(parent);

      {
        // Parent not hidden
        const result = tracker._isReallyVisible(
          getIntersectionEntry().boundingClientRect,
        );
        expect(result).toBe(true);
      }

      {
        // Parent hidden
        parent.style.display = "none";
        const result = tracker._isReallyVisible(
          getIntersectionEntry().boundingClientRect,
        );
        expect(result).toBe(false);
      }
      parent.remove();
    });

    // it's the same check in the _isObscured describe, only for coverage purpouse
    it("should return false if element is obscured", () => {
      const tracker = new Viewability(element);
      const coverElement = document.createElement("div");
      // male elementFromPoint to return the overlapping element
      document.elementFromPoint = vi.fn(() => coverElement);
      expect(
        tracker._isReallyVisible(getIntersectionEntry().boundingClientRect),
      ).toBe(false);
    });
  });

  describe("_isObscured", () => {
    it("should return false if element not exists", () => {
      const tracker = new Viewability("wrong-id");
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(false);
    });

    it("should return false if element is not obscured", () => {
      const tracker = new Viewability(element);
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(false);
    });

    it("should return false if any sample point is outside the viewport", () => {
      const tracker = new Viewability(element);
      // Cache the original window.innerWidth
      const originalInnerWidth = window.innerWidth;
      // Set a lower innerWidth compared to some sample points
      window.innerWidth = 200;
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(false);
      // Restore the original innerWidth
      window.innerWidth = originalInnerWidth;
    });

    it("should return true if element is fully obscured", () => {
      const tracker = new Viewability(element);
      const coverElement = document.createElement("div");
      // male elementFromPoint to return the overlapping element
      document.elementFromPoint = vi.fn(() => coverElement);
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(true);
    });

    it("should correctly calculate covered ratio relative to threshold", () => {
      const tracker = new Viewability(element);
      // Make some point to be covered and some other to be visibile
      let callCount = 0;
      document.elementFromPoint = vi.fn(() => {
        callCount++;
        // For the first 5 calls return an overlapping element, then the target element
        return callCount <= 5 ? document.createElement("div") : element;
      });
      tracker.options.coverageThreshold = 0.5; // 5/9 ≈ 0.56 => must return true
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(true);

      // Reset e test with an higher threshold
      callCount = 0;
      document.elementFromPoint = vi.fn(() => {
        callCount++;
        // For the first 3 calls return an overlapping element, then the target element
        return callCount <= 3 ? document.createElement("div") : element;
      });
      tracker.options.coverageThreshold = 0.5; // 3/9 ≈ 0.33 => must return false
      expect(
        tracker._isObscured(getIntersectionEntry().boundingClientRect),
      ).toBe(false);
    });
  });

  describe("_onError", () => {
    it("should call user defined onError function passed as option", () => {
      const onError = vi.fn();
      const err = new Error("Some error");
      const tracker = new Viewability(element, { onError });
      tracker._handleError(err);
      expect(onError).toHaveBeenCalledWith(err);
    });

    it("should call chained onError function", () => {
      const onError = vi.fn();
      const err = new Error("Some error");
      const tracker = new Viewability(element);
      tracker.onError = onError;
      tracker._handleError(err);
      expect(onError).toHaveBeenCalledWith(err);
    });

    it("should call console.error when user has not defined an onError function", () => {
      const onError = vi.fn();
      const err = new Error("Some error");
      const tracker = new Viewability(element);
      console.error = onError;
      tracker._handleError(err);
      expect(onError).toHaveBeenCalledWith(err.message);
    });
  });
});
