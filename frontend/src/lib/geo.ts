export function getCurrentPosition(): Promise<{ lat: string; lng: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location isn't available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }),
      () => reject(new Error("Couldn't get your location. Check your location permission.")),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });
}
