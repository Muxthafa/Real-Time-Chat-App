const publicVapidKey =
  "BCP2OKtumi6oAoWMM5iKFpCqGyKESeiVp6oipkRueZE6fSa_Qf82YLc8MChVpAPgRaNeaLca5aipOK8fY3kfPXw";

if ("serviceWorker" in navigator) {
  send().catch((err) => console.error(err));
}
async function send() {
  console.log("registering service worker...");
  const register = await navigator.serviceWorker.register(
    "./serviceworker.js",
    {
      scope: "/",
    }
  );
  console.log("service worker registered...");

  //register push
  console.log("registering push...");
  const subscription = await register.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
  });
  console.log("push registered");

  //send push notification
  console.log("Sending Push...");
  await fetch("https://real-time-chat-applicatn.herokuapp.com/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
    headers: {
      "content-type": "application/json",
    },
  });
  console.log("Push Sent...");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
