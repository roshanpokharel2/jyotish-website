(function () {
  const config = {
    appName: 'Jyotish and Vastu Sewa Kendra',
    phoneNumber: '+9779851001890',
    whatsappNumber: '9779851001890',
    bookingNotificationEndpoint: 'https://formsubmit.co/ajax/crisnapp@gmail.com',
    defaultLang: 'ne',
    supportedLangs: ['ne', 'en', 'hi', 'sa'],
    storageKeys: {
      chat: 'site_chat_',
      vastuPins: 'vastu_annotation_pins',
      order: 'order_',
      enroll: 'enroll_',
      booking: 'booking_',
      chatConsult: 'chat_',
      kundali: 'kundali_',
      contact: 'contact_'
    }
  };

  window.JYOTISH_CONFIG = config;
  window.SITE_CONFIG = config;
})();
