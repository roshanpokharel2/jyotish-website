(function () {
  // Customer records are not kept in the browser (Phase 1, Checkpoint K): signed-in
  // submissions go to the database, where the account holder and staff can read them
  // under RLS. Earlier versions stored every submission -- names, phone numbers, birth
  // details, payment references -- in localStorage with no expiry, readable by anyone
  // using the same browser. Remove those copies on every load.
  const RETIRED_KEY = /^(booking_|chat_|kundali_|order_|enroll_|contact_|site_chat_|ask_question_|vastu_request_|vastu_annotation_pins|jyotish_ask_birth_profile$|jyotish_ask_history$)/;
  try {
    const storage = window.localStorage;
    // Collect first: removing while walking by index skips keys (the order can change).
    Object.keys(storage).filter((key) => RETIRED_KEY.test(key)).forEach((key) => storage.removeItem(key));
  } catch (err) {
    // Storage blocked or unavailable: nothing to clean.
  }

  window.JYOTISH_HELPERS = {
    website: {
      defaultLang: 'ne',
      contactNumber: '+9779851001890',
      whatsappLink: 'https://wa.me/9779851001890'
    }
  };
})();
