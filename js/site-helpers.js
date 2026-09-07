(function () {
  const storage = window.localStorage || null;

  function safeStorageSet(key, value) {
    try {
      if (!storage) return Promise.resolve(false);
      storage.setItem(key, value);
      return Promise.resolve(true);
    } catch (err) {
      console.warn('Storage unavailable:', err);
      return Promise.resolve(false);
    }
  }

  function safeStorageGet(key) {
    try {
      if (!storage) return null;
      return storage.getItem(key);
    } catch (err) {
      console.warn('Storage read unavailable:', err);
      return null;
    }
  }

  function safeStorageRemove(key) {
    try {
      if (!storage) return Promise.resolve(false);
      storage.removeItem(key);
      return Promise.resolve(true);
    } catch (err) {
      console.warn('Storage removal unavailable:', err);
      return Promise.resolve(false);
    }
  }

  async function sendBookingNotification(booking) {
    const endpoint = window.SITE_CONFIG && window.SITE_CONFIG.bookingNotificationEndpoint;
    if (!endpoint) return false;
    try {
      const body = new URLSearchParams({
          _subject: `New Jyotish booking ${booking.bookingId}`,
          _captcha: 'false',
          booking_id: booking.bookingId,
          service_type: booking.kind,
          online_option: booking.subOption || 'Direct consultation',
          customer_name: booking.name,
          phone: booking.phone,
          email: booking.email,
          birth_date_ad: booking.dobAd,
          birth_date_bs: `${booking.dobBsYear || ''}-${booking.dobBsMonth || ''}-${booking.dobBsDay || ''}`,
          birth_time: booking.tob,
          place_of_birth: booking.pob,
          country: booking.birthCountry,
          payment_reference: booking.paymentRef,
          message: booking.message
      });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body
      });
      return response.ok;
    } catch (err) {
      console.warn('Booking email notification failed:', err);
      return false;
    }
  }

  async function sendKundaliNotification(kundali) {
    const endpoint = window.SITE_CONFIG && window.SITE_CONFIG.bookingNotificationEndpoint;
    if (!endpoint) return false;
    try {
      const chart = kundali.chart || {};
      const planets = (chart.planets || []).map(planet =>
        `${planet.ne} (${planet.en}): ${chart.rashi[planet.rashi - 1]} ${planet.degree}°`
      ).join('\n');
      const body = new URLSearchParams({
          _subject: `New Kundali request - ${kundali.name || 'unnamed'}`,
          _captcha: 'false',
          request_type: 'Kundali',
          customer_name: kundali.name,
          gender: kundali.gender,
          email: kundali.email,
          phone: kundali.phone,
          birth_date_ad: kundali.dob,
          birth_date_bs: `${kundali.dobBsYear || ''}-${kundali.dobBsMonth || ''}-${kundali.dobBsDay || ''}`,
          birth_time: kundali.tob,
          place_of_birth: kundali.pob,
          country: kundali.country,
          calculation_mode: chart.engine,
          ascendant: chart.ascendant ? `${chart.ascendant.name} (${chart.ascendant.longitude.toFixed(1)}°)` : '',
          planets,
          purpose: kundali.purpose
      });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body
      });
      return response.ok;
    } catch (err) {
      console.warn('Kundali email notification failed:', err);
      return false;
    }
  }

  function openWhatsAppNotification(type, data) {
    const number = (window.SITE_CONFIG && window.SITE_CONFIG.whatsappNumber) || '9779851001890';
    const label = type === 'kundali' ? 'Kundali request' : 'Booking request';
    const lines = [
      `*${label}*`,
      `Name: ${data.name || ''}`,
      `Phone: ${data.phone || ''}`,
      `Email: ${data.email || ''}`,
      `Birth date AD: ${data.dob || ''}`,
      `Birth date BS: ${data.dobBsYear || ''}-${data.dobBsMonth || ''}-${data.dobBsDay || ''}`,
      `Birth time: ${data.tob || ''}`,
      `Birth place: ${data.pob || ''}`,
      `Country: ${data.country || data.birthCountry || ''}`,
      `Purpose: ${data.purpose || data.message || ''}`
    ];
    if (type === 'booking') lines.splice(1, 0, `Service: ${data.kind || ''}`, `Booking ID: ${data.bookingId || ''}`);
    if (type === 'kundali' && data.chart) {
      lines.push(`Ascendant: ${data.chart.ascendant?.name || ''}`);
      lines.push(`Planets: ${(data.chart.planets || []).map(p => `${p.ne} ${data.chart.rashi[p.rashi - 1]} ${p.degree}°`).join(', ')}`);
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  }

  window.JYOTISH_HELPERS = {
    safeStorageSet,
    safeStorageGet,
    safeStorageRemove,
    sendBookingNotification,
    sendKundaliNotification,
    openWhatsAppNotification,
    website: {
      defaultLang: 'ne',
      contactNumber: '+9779851001890',
      whatsappLink: 'https://wa.me/9779851001890'
    }
  };
})();
