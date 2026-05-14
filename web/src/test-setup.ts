import "@testing-library/jest-dom";

// R3F's <Canvas> measures itself via react-use-measure, which depends on
// ResizeObserver. jsdom doesn't ship one, so the Sky View dome inside the
// wizard throws on mount in component tests. Stub it — tests don't need
// real layout measurements.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}
