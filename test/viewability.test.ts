import { beforeEach, describe, expect, test, vi } from "vitest";
import { Viewability } from "../src/viewability";

// Mock IntersectionObserver (not supported by jsdom)
// https://vitest.dev/guide/mocking.html#globals
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("Viewability.js", () => {
  let element: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="test-element" class="test-class" style="width:100px; height:100px;"></div>';
    element = document.getElementById("test-element") as HTMLElement;
  });

  test("should initialize with default options", () => {
    const tracker = new Viewability(element);
    expect(tracker.element).toBeDefined();
    expect(tracker.options.inViewThreshold).toBe(0.5); // IAB Standard default
    expect(tracker.options.timeInView).toBe(1000); // IAB Standard default
    expect(tracker.started).toBe(false);
  });

  test("should validate wrong options", () => {
    {
      // Threshold greather than 1
      const tracker = new Viewability(element, {
        inViewThreshold: 2,
      });
      expect(tracker.element).toBeUndefined();
    }

    {
      // Threshold lower than 0
      const tracker = new Viewability(element, {
        inViewThreshold: -1,
      });
      expect(tracker.element).toBeUndefined();
    }

    {
      // TimeInView lower than 0
      const tracker = new Viewability(element, {
        timeInView: -1,
      });
      expect(tracker.element).toBeUndefined();
    }
  });

  test("should accept an element by ID string", () => {
    const tracker = new Viewability("test-element");
    expect(tracker.element).toBe(element);
  });

  test("should accept a css selector", () => {
    const tracker = new Viewability(".test-class");
    expect(tracker.element).toBe(element);
  });

  test("should not start if element not found", () => {
    {
      // Wrong ID
      const tracker = new Viewability("wrong-id");
      expect(tracker.element).toBeUndefined();
    }
    {
      // Element not found
      const elem = document.getElementById("wrong-id");
      // @ts-expect-error we expect elem is null here
      const tracker = new Viewability(elem);
      expect(tracker.element).toBeUndefined();
    }
  });

  test("should execute onComplete (as option) callback when criteria are met", async () => {
    const mockCallback = vi.fn();

    // Test onComplete option
    const tracker = new Viewability(element, {
      onComplete: mockCallback,
    });

    // Test for missing entries
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([] as IntersectionObserverEntry[]);
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).toBeUndefined();

    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  test("should execute onComplete (as function) callback when criteria are met", async () => {
    const mockCallback = vi.fn();

    // Test onComplete function
    const tracker = new Viewability(element);
    tracker.onComplete = mockCallback;
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  test("should execute onComplete with custom TimeInView", async () => {
    const mockCallback = vi.fn();
    // Test onComplete function
    const tracker = new Viewability(element, { timeInView: 500 });
    tracker.onComplete = mockCallback;
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);

    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  test("should execute onComplete with custom inViewThreshold", async () => {
    const mockCallback = vi.fn();
    // Test onComplete function
    const tracker = new Viewability(element, {
      inViewThreshold: 0.6,
      timeInView: 200,
    });
    tracker.onComplete = mockCallback;
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
    expect(tracker.timer).toBeUndefined();

    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.6,
      } as IntersectionObserverEntry,
    ]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockCallback).toHaveBeenCalled();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });

  test("test inView/outView with onComplete function", async () => {
    const mockCallback = vi.fn();

    // Test onComplete function
    const tracker = new Viewability(element);
    tracker.onComplete = mockCallback;
    // In View
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);
    // Out View
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0,
      } as IntersectionObserverEntry,
    ]);
    expect(tracker.timer).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
  });

  test("test inView/outView with onComplete option", async () => {
    const mockCallback = vi.fn();

    // Test onComplete option
    const tracker = new Viewability(element, {
      onComplete: mockCallback,
    });
    // In View
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0.5,
      } as IntersectionObserverEntry,
    ]);
    // Out View
    // @ts-expect-error _viewableChange is private
    tracker._viewableChange([
      {
        intersectionRatio: 0,
      } as IntersectionObserverEntry,
    ]);
    expect(tracker.timer).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mockCallback).not.toHaveBeenCalled();
    expect(tracker.observer).not.toBeNull();
  });

  test("should stop tracking when stop() is called", () => {
    const tracker = new Viewability(element);
    tracker.start();
    tracker.stop();
    expect(tracker.observer).toBeNull();
    expect(tracker.timer).toBeUndefined();
  });
});
