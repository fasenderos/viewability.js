<p align="center">
    <a href="https://www.npmjs.com/package/viewability.js" target="_blank"><img src="https://img.shields.io/npm/v/viewability.js?color=blue" alt="NPM Version"></a>
    <a href="https://github.com/fasenderos/viewability.js/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/viewability.js" alt="Package License"></a>
    <a href="https://www.npmjs.com/package/viewability.js" target="_blank"><img src="https://img.shields.io/npm/dm/viewability.js" alt="NPM Downloads"></a>
    <a href="https://github.com/fasenderos/viewability.js"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label" alt="Built with TypeScript"></a>
</p>

# Viewability.js

Viewability.js is a lightweight JavaScript library that tracks the visibility of a DOM element within the viewport using the IntersectionObserver API. It allows developers to measure how much of an element is visible and for how long, making it useful for ad tracking, analytics, and user engagement monitoring.

<p align="center">
:star: Star me on GitHub — it motivates me a lot!
</p>

## Features

- Uses **IntersectionObserver** for efficient viewability tracking
- Supports **custom visibility thresholds** (e.g., 50% in view)
- Measures **time in view** before marking an element as fully viewed
- Supports **automatic tracking** on initialization
- Exposes a **public API** for manual control
- Provides an **onComplete callback** when the element meets the viewability criteria

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

### Basic Example

```js
import { Viewability } from "viewability-js";

const tracker = new Viewability(document.getElementById("target-element"), {
  inViewThreshold: 0.5, // 50% of the element must be visible
  timeInView: 1000, // Must be in view for 1 second
  autostart: true, // Automatically start tracking
  onComplete: () => console.log("Element fully viewed!"), // Callback when viewability is completed
});
```

### Options

| Option            | Type     | Default     | Description                                                                           |
| ----------------- | -------- | ----------- | ------------------------------------------------------------------------------------- |
| `autostart`       | Boolean  | `true`      | Automatically starts tracking on initialization.                                      |
| `inViewThreshold` | Number   | `0.5`       | Percentage of the element that must be visible (0 to 1).                              |
| `timeInView`      | Number   | `1000`      | Time (in milliseconds) the element must remain in view to be considered fully viewed. |
| `onComplete`      | Function | `undefined` | Callback function executed when the element meets the viewability criteria.           |

### Methods

| Method    | Description                                   |
| --------- | --------------------------------------------- |
| `start()` | Starts tracking if it hasn't already started. |
| `stop()`  | Stops tracking and disconnects the observer.  |

### Example: Manually Starting Tracking

```js
const tracker = new Viewability("#ad-banner", { autostart: false });
tracker.start();
```

### Example: Stopping Tracking

```js
tracker.stop();
```

## Browser Support

Viewability.js relies on the **IntersectionObserver API**, which is supported in all modern browsers. For older browsers (e.g., Internet Explorer), a [polyfill](https://github.com/w3c/IntersectionObserver) may be required.

## License

MIT License

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## Author

Developed by Andrea Fassina 🚀
