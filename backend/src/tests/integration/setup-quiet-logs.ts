// Integration tests trigger many expected 4xx responses. The app logs each one
// as a JSON line; drop those so real failures are easy to read.
// Set TEST_VERBOSE_LOGS=1 to see them.
if (!process.env.TEST_VERBOSE_LOGS) {
  for (const method of ["log", "error"] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string" && first.startsWith('{"event":"http.')) return;
      original(...args);
    };
  }
}
