self.addEventListener("push", event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico", // or any icon you want
    });
  });
  