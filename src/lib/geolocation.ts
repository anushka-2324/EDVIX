export type BrowserLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

export async function getCurrentBrowserLocation(): Promise<BrowserLocation> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported in this browser");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      () => {
        reject(new Error("Location access is required to verify classroom attendance"));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      }
    );
  });
}
