// jest-dom adds custom Jest matchers for DOM assertions.
import '@testing-library/jest-dom';

// jsdom lacks matchMedia; components use it for theme detection.
// Plain function (not jest.fn) so CRA's resetMocks:true can't wipe it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Some chart libs (recharts) use ResizeObserver.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;
