let _pending: string[] | null = null;

export const capturedPhotos = {
  set(uris: string[]) {
    _pending = uris;
  },
  consume(): string[] | null {
    const p = _pending;
    _pending = null;
    return p;
  },
};
