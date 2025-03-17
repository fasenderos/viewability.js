<p align="center">
    <a href="https://www.npmjs.com/package/viewability.js" target="_blank"><img src="https://img.shields.io/npm/v/viewability.js?color=blue" alt="NPM Version"></a>
    <a href="https://github.com/fasenderos/viewability.js/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/viewability.js" alt="Package License"></a>
    <a href="https://www.npmjs.com/package/viewability.js" target="_blank"><img src="https://img.shields.io/npm/dm/viewability.js" alt="NPM Downloads"></a>
    <a href="https://codecov.io/gh/fasenderos/viewability.js/tree" ><img src="https://codecov.io/gh/fasenderos/viewability.js/graph/badge.svg?token=83A7U05ZYU"/></a>
    <a href="https://github.com/fasenderos/viewability.js"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label" alt="Built with TypeScript"></a>
</p>

# Viewability.js

Viewability.js is a lightweight JavaScript library that tracks the visibility of a DOM element within the viewport using the IntersectionObserver API. It allows developers to measure how much of an element is visible and for how long, making it useful for ad tracking, analytics, and user engagement monitoring.

By default, the library follows the **IAB Standard** for viewability measurement (50% visibility for at least 1 second), but these values can be fully customized to fit specific needs.

[DEMO](https://codesandbox.io/p/sandbox/viewability-js-997wl8)

<p align="center">
:star: Star me on GitHub — it motivates me a lot!
</p>

## Features

- Uses [**IntersectionObserver**](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) for efficient viewability tracking
- Uses [**IAB Standard Guidelines**](https://www.iab.com/wp-content/uploads/2015/06/MRC-Viewable-Ad-Impression-Measurement-Guideline.pdf) for viewability measurement. Default to 50%, and 30% for large element sized at 242,500 pixels.
- Supports **custom viewability thresholds**
- Measures **time in view** before marking an element as fully viewed (default to 1 second)
- Advanced [**visibility detection**](#visibility-detection)
- Exposes a **public API** for manual control
- Provides an **onComplete callback** when the element meets the viewability criteria
- Accepts an [**element reference**](https://developer.mozilla.org/en-US/docs/Web/API/Element), an element [**ID string**](https://developer.mozilla.org/en-US/docs/Web/API/Element/id), or a [**CSS selector**](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) to specify the target element

## Visibility Detection

In addition to checking if an element is within the viewport, the library includes advanced **visibility** checks to determine whether an element is truly visible in the viewport.

When the `isVisible` option is enabled (by default), the library performs additional checks to ensure an element is not just in the viewport, but actually visible:

- **CSS Visibility Checks**: Detects if the element is hidden using styles like display: none, visibility: hidden, opacity: 0, etc.
- **Parent Visibility**: Ensures that no parent element is applying styles that make the target element invisible.
- **Overlapping Elements**: Determines if the element is covered by another element based on the `coverageThreshold` (value greater than 0 and up to 1).
  - A threshold of 0.1 means that even minimal coverage will mark the element as hidden.
  - A threshold of 1 means the element must be completely covered to be considered hidden.

## Installation

You can install the library via npm or simply include it in your project:

### Install via npm

```sh
npm install viewability.js
```

### Include via `<script>` tag

```html
<script src="path/to/viewability.js"></script>
```

## Usage

### Selecting the Element to Monitor

The library allows you to pass:

- A direct **HTMLElement** reference.
- A **string representing an element ID** (without `#`).
- A **CSS selector** string (e.g., `.class-name`).

If multiple elements match a given selector, **only the first one found will be tracked**.

#### Example:

```js
import { Viewability } from "viewability.js";

// Pass an element reference
new Viewability(document.getElementById("target"));

// Pass an ID string (equivalent to document.getElementById)
new Viewability("target");

// Pass a CSS selector (selects the first matching element)
new Viewability(".target");
```

### Basic Example

```js
import { Viewability } from "viewability.js";

const tracker = new Viewability("target", {
  onComplete: () => console.log("Element fully viewed!"),
  onError: (err) => console.error(err.message),
});

// or

const tracker = new Viewability("target");
tracker.onComplete = () => console.log("Element fully viewed!");
tracker.onError = (err) => console.error(err.message);
```

### Options

| Option              | Type     | Default     | Description                                                                                                                                                           |
| ------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autostart`         | Boolean  | `true`      | Automatically starts tracking on initialization.                                                                                                                      |
| `autostop`          | Boolean  | `true`      | Automatically stop tracking and disconnects the observer when viewability is completed.                                                                               |
| `coverageThreshold` | Number   | `0.1`       | When `isVisible` is `true`, this is the fraction of the element's area that must be covered in order to consider the element as covered (greater than 0 and up to 1). |
| `inViewThreshold`   | Number   | `0.5`       | Percentage of the element that must be visible (0 to 1).                                                                                                              |
| `isVisible`         | Boolean  | `true`      | Whether to check if the element is truly visible in the viewport.                                                                                                     |
| `timeInView`        | Number   | `1000`      | Time (in milliseconds) the element must remain in view to be considered fully viewed.                                                                                 |
| `onComplete`        | Function | `undefined` | Callback function executed when the element meets the viewability criteria.                                                                                           |
| `onError`           | Function | `undefined` | Callback function executed when something wrong.                                                                                                                      |

### Methods

| Method    | Description                                   |
| --------- | --------------------------------------------- |
| `start()` | Starts tracking if it hasn't already started. |
| `stop()`  | Stops tracking and disconnects the observer.  |

### Example: Manually Starting Tracking

```js
const tracker = new Viewability("target", { autostart: false });
tracker.onComplete = () => console.log("Element fully viewed!");
tracker.onError = (err) => console.error(err.message);
tracker.start();
```

### Example: Stopping Tracking

```js
tracker.stop();
```

## Browser Support

Viewability.js relies on the **IntersectionObserver API**, which is supported in all modern browsers. For older browsers (e.g., Internet Explorer), a [polyfill](https://github.com/w3c/IntersectionObserver) may be required.

## Contributing

I would greatly appreciate any contributions to make this project better. Please make sure to follow the below guidelines before getting your hands dirty.

1. Fork the repository
2. Create your branch (git checkout -b my-branch)
3. Commit any changes to your branch
4. Push your changes to your remote branch
5. Open a pull request

## License

Copyright [Andrea Fassina](https://github.com/fasenderos), Licensed under [MIT](LICENSE).
