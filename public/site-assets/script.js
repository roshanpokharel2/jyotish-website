/* ============================================================
   ICONS
============================================================ */
const ICONS = {
  chart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 4v16h16M8 15l3-4 3 3 5-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  compass:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M15 9l-2 6-4-2 2-6 4 2z" fill="currentColor"/></svg>',
  heart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.4-9.3-8.8C1.2 8 3 4.8 6.2 4.4c1.8-.2 3.4.7 4.3 2.1.9-1.4 2.5-2.3 4.3-2.1 3.2.4 5 3.6 3.5 6.8C19 15.6 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg>',
  briefcase:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.5"/></svg>',
  temple:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 4H9l3-4zM4 21V9l8-5 8 5v12M4 21h16M8 21v-6h8v6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  star:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20l1.4-6.3-4.8-4.3 6.4-.6L12 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  home2:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7M5 10v10h14V10" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  building:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" stroke="currentColor" stroke-width="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" stroke="currentColor" stroke-width="1.5"/></svg>',
  bed:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 18h18M5 13V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.4"/></svg>',
  gate:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 21V7l8-4 8 4v14M4 21h16M9 21v-8h6v8" stroke="currentColor" stroke-width="1.4"/></svg>',
  factory:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21V11l5 3v-3l5 3V9l6-3v15H3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  fire:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c4 0 6-2.7 6-6 0-3-2-4.8-3-7 0 2-1.5 3-2.5 2 .5-2 0-4.5-1.5-6C10 7.5 8 9 8 12c-1 0-2-1-2-2.5C4.8 11.2 4 13.3 4 16c0 3.3 2 6 8 6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  clock:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  shield:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  book:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5zM20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  check:'<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevron:'<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  phoneIcon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" stroke="currentColor" stroke-width="1.6"/></svg>',
  mailIcon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.6"/></svg>',
  pinIcon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-7.4 7-13a7 7 0 1 0-14 0c0 5.6 7 13 7 13z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="9" r="2.4" stroke="currentColor" stroke-width="1.4"/></svg>',
  viberIcon:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3c-5 0-8.5 3-8.5 7.6 0 2.9 1.5 5.3 4 6.8l-.7 3.6 3.9-2.1c.4 0 .9.1 1.3.1 5 0 8.5-3 8.5-7.6C20.5 6 17 3 12 3z" stroke="currentColor" stroke-width="1.4"/></svg>',
  walletIcon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18M16 14h2" stroke="currentColor" stroke-width="1.5"/></svg>',
  gem:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3h12l4 6-10 12L2 9l4-6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
};

/* ============================================================
   DATA: TRANSLATIONS + CONTENT
============================================================ */
const T = {
ne: {
  brand:"ज्योतिष तथा वास्तु सेवा केन्द्र", brandTag:"वैदिक ज्योतिष र वास्तुशास्त्र",
  nav:{home:"गृहपृष्ठ",astrology:"ज्योतिष",rashifal:"राशिफल",vastu:"वास्तु",karmakanda:"कर्मकाण्ड",directory:"विशेषज्ञ",classes:"अनलाइन कक्षा",shop:"पसल",kundali:"कुण्डली",booking:"परामर्श बुक",bookings:"बुकिङ रेकर्ड",contact:"सम्पर्क",login:"लगइन",account:"मेरो खाता"},
  headerCta:"परामर्शको लागि बुकिङ गर्नुहोस्",
  heroEyebrow:"शास्त्रीय वैदिक ज्योतिष • वास्तुशास्त्र • नेपाल",
  heroTitle:"ज्योतिष तथा वास्तु सेवाको विश्वसनीय केन्द्र",
  heroLead:"शास्त्रीय ज्योतिष, वास्तुशास्त्र तथा वैदिक परम्परामा आधारित व्यक्तिगत परामर्श — अनलाइन र प्रत्यक्ष दुवै रूपमा उपलब्ध।",
  heroCta1:"परामर्श बुक गर्नुहोस्", heroCta2:"हाम्रा सेवाहरू हेर्नुहोस्",
  qlCall:"अहिले फोन गर्नुहोस्", qlWa:"ह्वाट्सएप", qlViber:"भाइबर", qlBook:"अपोइन्टमेन्ट",
  heroCardTitle:"परामर्श कसरी अगाडि बढ्छ",
  heroCardList:["सेवा र मिति छनोट गर्नुहोस्","आफ्नो जन्म विवरण पेश गर्नुहोस्","अनलाइन वा प्रत्यक्ष परामर्श लिनुहोस्","सुरक्षित रिपोर्ट प्राप्त गर्नुहोस्"],
  panchangTithi:"मिति: ६ भाद्र २०८३ • तिथि: दशमी (शुक्ल पक्ष)*",
  panchangNote:"*स्न्यापसट डेटा — लाइभ पञ्चाङ्ग इन्जिन जडान भएपछि दैनिक स्वतः अपडेट हुनेछ",
  statLabels:["वर्षको अनुभव","सम्पन्न परामर्श","उपलब्ध सेवाहरू","अनलाइन र प्रत्यक्ष"],
  statNote:"(प्रशासकबाट अपडेट गरिने)",
  svcEyebrow:"हाम्रा सेवाहरू", svcTitle:"ज्योतिष र वास्तु सेवाहरू", svcSub:"परम्परागत ज्ञान र आधुनिक परामर्श विधिको संयोजनमा उपलब्ध सम्पूर्ण सेवाहरू।",
  overview:[
    {icon:'chart',t:"जन्म कुण्डली तथा फलादेश",d:"पूर्ण जन्म कुण्डली विश्लेषण र व्यक्तिगत मार्गदर्शन।",cta:"हेर्नुहोस्",view:"astrology"},
    {icon:'heart',t:"विवाह कुण्डली मिलान",d:"गुण मिलान, दोष विश्लेषण र वैवाहिक परामर्श।",cta:"हेर्नुहोस्",view:"astrology"},
    {icon:'briefcase',t:"करियर र व्यवसाय ज्योतिष",d:"शिक्षा, करियर, व्यवसाय र वित्तीय दिशाबारे मार्गदर्शन।",cta:"हेर्नुहोस्",view:"astrology"},
    {icon:'home2',t:"वास्तु परामर्श",d:"आवासीय, व्यावसायिक तथा जग्गा छनोट सम्बन्धी वास्तु सेवा।",cta:"हेर्नुहोस्",view:"vastu"},
    {icon:'compass',t:"मुहूर्त निर्धारण",d:"विवाह, गृहप्रवेश, भूमिपूजन लगायत शुभ मुहूर्त निर्धारण।",cta:"थप जान्नुहोस्",view:"booking"},
    {icon:'temple',t:"पूजा तथा धार्मिक अनुष्ठान",d:"ग्रहशान्ति, नवग्रह पूजा र परम्परागत संस्कार सेवा।",cta:"थप जान्नुहोस्",view:"booking"}
  ],
  whyEyebrow:"किन हामीलाई छनोट गर्ने", whyTitle:"हामीलाई छनोट गर्नुका कारणहरू",
  why:[
    {icon:'book',t:"शास्त्रीय आधार",d:"वैदिक ज्योतिष र शास्त्रीय ग्रन्थमा आधारित विश्लेषण।"},
    {icon:'heart',t:"व्यक्तिगत परामर्श",d:"प्रत्येक ग्राहकको अवस्थाअनुसार विशेष मार्गदर्शन।"},
    {icon:'compass',t:"अनलाइन तथा प्रत्यक्ष सेवा",d:"आफ्नो सुविधाअनुसार अनलाइन वा कार्यालयमा परामर्श।"},
    {icon:'shield',t:"गोपनीयता",d:"तपाईंको व्यक्तिगत विवरण पूर्ण रूपमा सुरक्षित राखिन्छ।"},
    {icon:'briefcase',t:"व्यवहारिक मार्गदर्शन",d:"व्यावहारिक जीवनमा लागू हुने ठोस सुझावहरू।"},
    {icon:'building',t:"परम्परा + आधुनिक प्रविधि",d:"परम्परागत ज्ञानलाई आधुनिक बुकिङ प्रणालीसँग जोडेको।"}
  ],
  aboutEyebrow:"हाम्रोबारे", aboutTitle:"ज्योतिषीको परिचय", aboutSub:"थप विवरण प्रशासकबाट चाँडै अपडेट गरिनेछ।",
  profName:"आचार्य कृष्ण प्रसाद पोखरेल",
  profFields:[["शिक्षा","ज्योतिषमा स्नातकोत्तर (Master's in Jyotish)"],["अनुभव","१५ वर्ष"],["विशेषज्ञता","सम्पूर्ण ज्योतिष विषयमा दक्ष (जन्म कुण्डली, विवाह मिलान, वास्तु, मुहूर्त, पूजा)"],["भाषा","नेपाली • हिन्दी • English"]],
  profBio:"आचार्य कृष्ण प्रसाद पोखरेल — ज्योतिषमा स्नातकोत्तर उपाधिप्राप्त र १५ वर्षको अनुभव भएका ज्योतिषी। जन्म कुण्डली, विवाह मिलान, वास्तुशास्त्र, मुहूर्त निर्धारण र पूजा सम्बन्धी सम्पूर्ण क्षेत्रमा दक्ष। बालम्बु, चन्द्रागिरी, नेपालमा आधारित।",
  profReadMore:"पूर्ण प्रोफाइल हेर्नुहोस्",
  howEyebrow:"प्रक्रिया", howTitle:"परामर्श कसरी काम गर्छ",
  how:[["सेवा छनोट गर्नुहोस्","आफ्नो आवश्यकताअनुसार सेवा छान्नुहोस्।"],["मिति र समय छनोट गर्नुहोस्","उपलब्ध समयमध्ये एक छनोट गर्नुहोस्।"],["आवश्यक विवरण पठाउनुहोस्","जन्म विवरण र प्रश्न भर्नुहोस्।"],["ज्योतिषीसँग परामर्श लिनुहोस्","अनलाइन वा प्रत्यक्ष परामर्श प्राप्त गर्नुहोस्।"]],
  howCta:"अहिले नै बुक गर्नुहोस्",
  artEyebrow:"ज्ञान केन्द्र", artTitle:"ताजा लेखहरू", artSub:"ज्योतिष, वास्तु र वैदिक परम्परा सम्बन्धी शैक्षिक सामग्री।",
  articles:[
    ["नक्षत्र भनेको के हो?","२७ नक्षत्रको आधारभूत परिचय।"],
    ["वास्तुका आधारभूत सिद्धान्त","घर निर्माणमा दिशा र तत्वको महत्त्व।"],
    ["दशा-अन्तर्दशा बुझ्ने तरिका","ग्रहदशाले जीवनमा पार्ने प्रभाव।"]
  ],
  artCta:"पढ्नुहोस्",
  vidEyebrow:"भिडियो", vidTitle:"YouTube च्यानल", vidSub:"राशिफल, वास्तु र शैक्षिक भिडियोहरू।",
  vidCta:"YouTube मा सब्स्क्राइब गर्नुहोस्", vidNote:"नयाँ भिडियोहरू YouTube च्यानलबाट स्वचालित रूपमा देखिनेछन्।",
  testiEyebrow:"प्रतिक्रिया", testiTitle:"ग्राहक अनुभव",
  testiEmpty:"प्रमाणित ग्राहक समीक्षाहरू छिट्टै यहाँ थपिनेछन्। असत्यापित समीक्षा हामी प्रकाशित गर्दैनौं।",
  testiGoogle:"Google Reviews हेर्नुहोस्",
  faqEyebrow:"जिज्ञासा", faqTitle:"बारम्बार सोधिने प्रश्नहरू",
  faqCats:["ज्योतिष","कुण्डली","वास्तु","बुकिङ"],
  faq:{
    "ज्योतिष":[["ज्योतिष परामर्शका लागि कति समय लाग्छ?","सामान्यतया सेवा अनुसार ३०-६० मिनेट लाग्छ, यो सेवा प्रकारमा निर्भर गर्छ।"],["के अनलाइन परामर्श उपलब्ध छ?","हो, ह्वाट्सएप, फोन र भिडियो कलमार्फत अनलाइन परामर्श उपलब्ध छ।"]],
    "कुण्डली":[["कुण्डलीका लागि कस्तो जानकारी चाहिन्छ?","पूरा नाम, जन्म मिति, ठ्याक्कै जन्म समय र जन्मस्थान आवश्यक हुन्छ।"],["जन्म समय ठ्याक्कै थाहा नभए के गर्ने?","अनुमानित समय दिनुहोस्, तर सकेसम्म सही समय उपलब्ध गराउनुहोस्।"]],
    "वास्तु":[["वास्तु परामर्श कसरी हुन्छ?","तपाईंले पठाउनुभएको नक्सा/फोटोको आधारमा दिशा र संरचना विश्लेषण गरिन्छ।"],["के म घरको नक्सा अपलोड गर्न सक्छु?","हो, PDF, JPG वा PNG ढाँचामा नक्सा अपलोड गर्न सकिन्छ।"]],
    "बुकिङ":[["अपोइन्टमेन्ट कसरी बुक गर्ने?","'परामर्श बुक गर्नुहोस्' बटनबाट सेवा, मिति र समय छनोट गरी बुक गर्न सकिन्छ।"],["के म समय परिवर्तन गर्न सक्छु?","हो, बुकिङपछि हामीलाई सम्पर्क गरेर पुनःतालिका मिलाउन सकिन्छ।"]]
  },
  contactEyebrow:"सम्पर्क", contactTitle:"हामीलाई सम्पर्क गर्नुहोस्",
  contactAddr:"ठेगाना", contactAddrV:"बालम्बु, चन्द्रागिरी, नेपाल",
  contactPhone:"फोन", contactPhoneV:"+977-985-1001890",
  contactWa:"ह्वाट्सएप / भाइबर", contactWaV:"+977-985-1001890",
  contactEmail:"इमेल", contactEmailV:"info@jyotishvastusewakendra.com.np",
  contactHours:"कार्य समय", contactHoursV:"आइतबार - शुक्रबार, बिहान ९ - साँझ ६",
  contactFullBtn:"पूर्ण सम्पर्क पृष्ठ हेर्नुहोस्",
  astroBread:"गृहपृष्ठ / ज्योतिष", astroH1:"ज्योतिष सेवाहरू", astroP:"वैदिक ज्योतिषमा आधारित सम्पूर्ण परामर्श सेवाहरू — जन्म कुण्डलीदेखि मुहूर्तसम्म।",
  vastuBread:"गृहपृष्ठ / वास्तु", vastuH1:"वास्तु विश्लेषण तथा समाधान", vastuP:"आफ्नो घर, जग्गा, कार्यालय वा व्यवसायिक स्थानको नक्सा तथा विवरणका आधारमा वास्तु विश्लेषण, सम्भावित दोष र सुधारका उपायहरू प्राप्त गर्नुहोस्।", vastuMapCta:"नक्सा जाँच गर्नुहोस्", vastuAnalysisCta:"वास्तु विश्लेषण सुरु गर्नुहोस्", vastuPlatformEyebrow:"वास्तु विश्लेषण तथा समाधान", vastuPlatformTitle:"वास्तु विश्लेषण तथा समाधान", vastuPlatformSub:"नक्सा, फोटो र सम्पत्ति विवरणका आधारमा प्रारम्भिक संकेत तथा expert-configured विस्तृत विश्लेषण प्राप्त गर्नुहोस्।", vastuUploadNotice:"कृपया नक्सा स्पष्ट रूपमा Upload गर्नुहोस्।", vastuServiceTypeLabel:"वास्तु सेवा", vastuTopicLabel:"विशेष विषय", vastuEntranceLabel:"मुख्य प्रवेशद्वार दिशा", vastuStatusLabel:"निर्माण अवस्था", vastuPurposeLabel:"सम्पत्तिको उद्देश्य", vastuRoomsLabel:"कोठा संख्या",
  uploadEyebrow:"नक्सा अपलोड", uploadTitle:"आफ्नो घर/जग्गाको नक्सा अपलोड गर्नुहोस्",
  uploadLabel:"फाइल छनोट गर्न यहाँ क्लिक गर्नुहोस्", uploadHint:"PDF, JPG, PNG (अधिकतम १० MB)",
  lblDirection:"मुख्य ढोकाको दिशा", lblBuildingType:"भवनको प्रकार", lblLocationV:"स्थान", lblFloors:"तला संख्या", lblProblem:"समस्या/प्रश्न विवरण",
  directions:["उत्तर","दक्षिण","पूर्व","पश्चिम","उत्तर-पूर्व","उत्तर-पश्चिम","दक्षिण-पूर्व","दक्षिण-पश्चिम"],
  buildingTypes:["घर","अपार्टमेन्ट","कार्यालय","पसल/व्यवसाय","कारखाना","जग्गा/प्लट"],
  vastuSubmitBtn:"वास्तु अनुरोध पठाउनुहोस्",
  bookBread:"गृहपृष्ठ / परामर्श बुक", bookH1:"परामर्श बुक गर्नुहोस्", bookP:"तलका चरणहरू पूरा गरी आफ्नो अपोइन्टमेन्ट सुरक्षित गर्नुहोस्।",
  steps:["सेवा","मोड","मिति/समय","विवरण","भुक्तानी","पुष्टि"],
  chooseService:"सेवा छनोट गर्नुहोस्", chooseMode:"परामर्श मोड छनोट गर्नुहोस्",
  modes:[["अनलाइन","गुगल मिट / जुम / फोन / ह्वाट्सएप"],["प्रत्यक्ष","कार्यालयमा प्रत्यक्ष भेट"]],
  chooseDate:"मिति छनोट गर्नुहोस्", chooseSlot:"उपलब्ध समय छनोट गर्नुहोस्",
  yourDetails:"तपाईंको विवरण",
  labels:{name:"पूरा नाम",phone:"फोन नम्बर",email:"इमेल",dob:"जन्म मिति",tob:"जन्म समय",pob:"जन्म स्थान",gender:"लिङ्ग",country:"देश",message:"तपाईंको प्रश्न/सन्देश",topics:"तपाईं के छलफल गर्न चाहनुहुन्छ?",subject:"विषय",purpose:"परामर्शको उद्देश्य",accuracy:"जन्म समयको शुद्धता"},
  genders:["महिला","पुरुष","अन्य"],
  topics:["करियर","विवाह","सम्बन्ध","व्यवसाय","वित्त","शिक्षा","विदेश यात्रा","सम्पत्ति","परिवार","स्वास्थ्य सम्बन्धी चासो","सन्तान","कानूनी विषय","आध्यात्मिक विषय","वास्तु","मुहूर्त","सामान्य जीवन मार्गदर्शन","अन्य"],
  paymentTitle:"भुक्तानी विकल्प", payLater:"पछि भुक्तानी गर्नुहोस्", payConfirm:"भुक्तानी पुष्टि गरिएको",
  paymentNote:"eSewa र Khalti (नम्बर: 9851001890) मार्फत भुक्तानी लिन सकिन्छ। अनलाइन गेटवे एकीकरण चाँडै थपिनेछ।",
  reviewTitle:"आफ्नो बुकिङ समीक्षा गर्नुहोस्",
  back:"पछाडि", next:"अर्को", confirmBooking:"बुकिङ पुष्टि गर्नुहोस्",
  confirmedTitle:"तपाईंको अपोइन्टमेन्ट पुष्टि भयो!", confirmedNote:"पुष्टिकरण इमेल र ह्वाट्सएप सन्देश चाँडै पठाइनेछ।",
  bookingIdLabel:"बुकिङ आईडी", newBooking:"नयाँ बुकिङ गर्नुहोस्",
  kundBread:"गृहपृष्ठ / कुण्डली", kundH1:"कुण्डली अनुरोध", kundP:"आफ्नो जन्म विवरण पेश गर्नुहोस्, हाम्रा ज्योतिषीले कुण्डली तयार गर्नुहुनेछ।",
  kundDisclaimer:"⚠️ तपाईंले दिएको जन्म मिति, समय र स्थानका आधारमा प्रारम्भिक कुण्डली गणना हुन्छ। ठ्याक्कै फलादेशका लागि प्रमाणित पञ्चाङ्ग/ephemeris र ज्योतिषी प्रमाणीकरण आवश्यक हुन्छ।",
  kundSubmit:"कुण्डली अनुरोध पठाउनुहोस्", kundSuccessTitle:"अनुरोध प्राप्त भयो!", kundSuccessNote:"हाम्रो टोलीले सम्पर्क गरी आवश्यक विवरण पुष्टि गर्नेछ।",
  cBread:"गृहपृष्ठ / सम्पर्क", cH1:"सम्पर्क", cP:"कुनै प्रश्न वा जिज्ञासाका लागि तलको फारम भर्नुहोस् वा सिधै सम्पर्क गर्नुहोस्।",
  contactSubmit:"सन्देश पठाउनुहोस्", contactSuccess:"धन्यवाद! तपाईंको सन्देश प्राप्त भयो, हामी चाँडै सम्पर्क गर्नेछौं।",
  fServicesH:"सेवाहरू", fQuickH:"द्रुत लिङ्क", fContactH:"सम्पर्क",
  fLinkAstro:"ज्योतिष सेवा", fLinkVastu:"वास्तु सेवा", fLinkKundali:"कुण्डली अनुरोध", fLinkBook:"परामर्श बुक",
  fLinkHome:"गृहपृष्ठ", fLinkAbout:"हाम्रोबारे", fLinkContact2:"सम्पर्क", fLinkPrivacy:"गोपनीयता नीति", fLinkTerms:"नियम तथा शर्तहरू",
  footerAbout:"शास्त्रीय वैदिक ज्योतिष र वास्तुशास्त्रमा आधारित व्यावसायिक परामर्श सेवा — अनलाइन र प्रत्यक्ष दुवै रूपमा उपलब्ध।",
  fCopyright:"© 2026 ज्योतिष तथा वास्तु सेवा केन्द्र। सर्वाधिकार सुरक्षित।",
  fDisclaimerShort:"ज्योतिष परामर्श परम्परागत मार्गदर्शनका लागि हो, यो चिकित्सा वा कानूनी सल्लाहको विकल्प होइन।",
  bottomHome:"गृह", bottomServices:"सेवा", bottomBook:"बुक", bottomWa:"ह्वाट्सएप", bottomCall:"कल",
  toastKundali:"कुण्डली अनुरोध सुरक्षित भयो!", toastVastu:"वास्तु अनुरोध सुरक्षित भयो!", toastContact:"सन्देश पठाइयो!",
  healthNote:"⚠️ स्वास्थ्य सम्बन्धी ज्योतिषीय मार्गदर्शन चिकित्सा निदान होइन र यसले पेशेवर चिकित्सा परामर्शको विकल्प लिन सक्दैन।",
  pricePlaceholder:"मूल्यका लागि सम्पर्क गर्नुहोस्",
  langSelectorLabel:"भाषा छनोट",
  fabCallLabel:"प्रत्यक्ष कल गर्नुहोस्", fabChatLabel:"च्याट गर्नुहोस्", fabBookLabel:"बुकिङ गर्नुहोस्",
  chatWidgetSubtitle:"सामान्यतया केही मिनेटमा जवाफ दिन्छौं",
  chatWelcomeMsg:"नमस्कार! 🙏 म तपाईंलाई कसरी सहयोग गर्न सक्छु? आफ्नो प्रश्न वा जिज्ञासा तल लेख्नुहोस्।",
  chatInputPlaceholder:"आफ्नो सन्देश लेख्नुहोस्...",
  chatConnectingMsg:"धन्यवाद! तपाईंको सन्देश लिएर अहिले नै WhatsApp मा जोड्दैछौं, जहाँ हाम्रो टोलीले तुरुन्तै जवाफ दिनेछ।",
  chatBotBadge:"स्वचालित सहायक — वास्तविक व्यक्तिसँग कुरा गर्न तल क्लिक गर्नुहोस्",
  chatTalkHumanBtn:"मानिससँग कुरा गर्नुहोस्",
  classesEyebrow:"सिकाइ केन्द्र", classesTitle:"अनलाइन कक्षाहरू", classesSub:"ज्योतिष, वास्तु र सम्बन्धित विषयमा अनलाइन तालिम — घरैबाट सिक्नुहोस्।",
  classesList:[
    ["ज्योतिष कक्षा","आधारभूतदेखि उन्नत स्तरसम्मको ज्योतिष तालिम।",'chart'],
    ["वास्तु कक्षा","वास्तुशास्त्रका सिद्धान्त तथा व्यावहारिक प्रयोग सिकाइने कक्षा।",'home2'],
    ["अंकशास्त्र कक्षा","अंकशास्त्रको आधारभूत ज्ञान तथा प्रयोग।",'chart'],
    ["पञ्चाङ्ग/मुहूर्त कक्षा","पञ्चाङ्ग पठन तथा मुहूर्त निर्धारण सिकाइने कक्षा।",'clock'],
    ["कर्मकाण्ड कक्षा","पूजा तथा कर्मकाण्ड विधि सम्बन्धी तालिम।",'temple'],
    ["संस्कृत/परम्परागत ज्ञान कक्षा","संस्कृत भाषा तथा परम्परागत शास्त्रीय ज्ञान।",'book']
  ],
  lblInstructor:"शिक्षक", lblDuration:"अवधि", lblLevel:"स्तर", durationTBD:"प्रशासकबाट अपडेट हुनेछ",
  levelAllLabel:"सुरुवातीदेखि उन्नतसम्म",
  enrollBtn:"भर्ना हुनुहोस्", enrollFormTitle:"भर्ना फारम", enrollCourseLabel:"छानिएको कक्षा",
  enrollSubmitBtn:"भर्नाको लागि अनुरोध पठाउनुहोस्",
  enrollSuccessTitle:"भर्ना अनुरोध प्राप्त भयो!", enrollSuccessNote:"हाम्रो टोलीले कक्षा सुरु हुने मिति, समय र शुल्क पुष्टि गर्न सम्पर्क गर्नेछ।",
  moreInfoLabel:"थप जानकारी",
  vastuDisclaimerNumerology:"यो परम्परागत अंकशास्त्र तथा वास्तुमा आधारित मार्गदर्शन हो — ग्यारेन्टीकृत भविष्यवाणी होइन।",
  vastuDisclaimerDosha:"यो परम्परागत ज्योतिष/वास्तु व्याख्या हो — धार्मिक तथा परम्परागत मान्यतामा आधारित परामर्श हो, वैज्ञानिक रूपमा प्रमाणित तथ्य होइन।",
  vastuDisclaimerRemedies:"यो परम्परागत उपायसम्बन्धी मार्गदर्शन हो। स्वास्थ्य/आयुर्वेद सम्बन्धी विषयमा योग्य चिकित्सकको सल्लाह लिनु आवश्यक छ — यो चिकित्सकीय उपचारको विकल्प होइन।",
  vastuDisclaimerGeneral:"अन्तिम व्याख्या तथा सिफारिस योग्य परामर्शदाताद्वारा गरिनेछ।",
  vastuCatBusiness:"व्यवसाय वास्तु", vastuCatPersonal:"व्यक्तिगत ऊर्जा", vastuCatHouse:"घर तथा कोठा वास्तु",
  vastuCatNumerology:"अंकशास्त्र + वास्तु", vastuCatDirection:"दिशा तथा स्थान विश्लेषण", vastuCatColor:"रङ वास्तु",
  vastuCatPlacement:"वस्तु स्थान निर्धारण", vastuCatDosha:"वास्तु तथा परम्परागत दोष", vastuCatRemedies:"परम्परागत तथा आधुनिक उपाय",
  vastuCatGeneral:"अन्य वास्तु सेवाहरू",
  homeVastuHighlightEyebrow:"वास्तु सम्बन्धी", homeVastuHighlightTitle:"प्रमुख वास्तु सेवाहरू",
  viewAllVastuBtn:"सबै वास्तु सेवाहरू हेर्नुहोस्",
  topicsEyebrow:"हामी सहयोग गर्ने विषयहरू", topicsTitle:"हामी के-केमा सहयोग गर्छौं", topicsSub:"जीवनका विविध पक्षमा देखिने समस्याहरूको ज्योतिषीय तथा वास्तुशास्त्रीय समाधान।",
  topicsList:[
    ["चिना हेर्ने, रेमेडी गर्ने तथा चिना बनाउने",'chart'],
    ["मानसिक तनावसम्बन्धी ज्योतिषीय परामर्श",'heart'],
    ["कटि तथा यन्त्रसम्बन्धी परामर्श",'compass'],
    ["स्टोन / रत्नसम्बन्धी परामर्श",'gem'],
    ["सन्तान प्राप्तिमा देखिएका ज्योतिषीय अवरोधसम्बन्धी परामर्श",'heart'],
    ["अध्ययन तथा रोजगारसम्बन्धी समाधान",'book'],
    ["व्यवसायमा देखिएका रोकावटसम्बन्धी परामर्श तथा उपाय",'briefcase'],
    ["पार्टनरशिप तथा साझेदारी सम्बन्धी मेलमिलापका उपाय",'briefcase'],
    ["व्यक्तिगत तथा पारिवारिक समस्यासम्बन्धी परामर्श तथा उपाय",'heart'],
    ["परम्परागत टोटका तथा उपायसम्बन्धी परामर्श",'shield'],
    ["घर–जग्गा तथा भूमिसम्बन्धी वास्तु परामर्श",'home2'],
    ["घर–जग्गामा देखिएका वास्तु समस्या तथा रेमेडीसम्बन्धी सम्पूर्ण कार्य",'building'],
    ["हराएको सामान / वस्तुसम्बन्धी प्रश्न ज्योतिष परामर्श",'star'],
    ["व्यवसाय कहिले सुरु गर्ने र कस्तो व्यवसाय उपयुक्त हुने?",'compass'],
    ["वैदेशिक यात्रा तथा विदेशसम्बन्धी ज्योतिषीय परामर्श",'compass'],
    ["वैवाहिक जीवन तथा दाम्पत्यसम्बन्धी परामर्श",'heart'],
    ["स्वास्थ्य तथा रोगसम्बन्धी ज्योतिषीय परामर्श",'shield'],
    ["वास्तु परामर्श",'home2'],
    ["पूजा–आजा तथा कर्मकाण्डसम्बन्धी हस्तसहायता / परामर्श",'temple'],
    ["कुण्डलीको आधारमा घर तथा वास्तु विश्लेषण",'chart'],
    ["अनलाइन ज्योतिष तथा वास्तु कक्षाहरू",'book']
  ],
  originalGuaranteeNote:"✅ यहाँबाट खरिद गरिएका सम्पूर्ण वस्तुहरू १००% ओरिजिनल (Original) हुनेछन् — यसको सम्पूर्ण ग्यारेन्टी हाम्रो कम्पनीले लिन्छ।",
  specialOfferBanner:"🎉 विशेष अफर! सीमित समयको लागि सबै सामानमा विशेष छुट उपलब्ध छ। मूल्य र छुट जान्न सम्पर्क गर्नुहोस्।",
  mukhiLabel:"मुखी छान्नुहोस्", caratLabel:"क्यारेट छान्नुहोस्",
  shopList2:[
    {id:'vastukalash', t:"वास्तु कलश", d:"शुभ वास्तु कलश — घर तथा कार्यालयका लागि।", icon:'home2'},
    {id:'shaligram', t:"सालिग्राम", d:"पूजनीय सालिग्राम शिला।", icon:'temple'},
    {id:'shivling', t:"शिवलिङ्ग", d:"पूजाका लागि शिवलिङ्ग।", icon:'temple'},
    {id:'suryayantra', t:"सूर्य यन्त्र", d:"सूर्य ग्रह शान्तिका लागि यन्त्र।", icon:'compass'},
    {id:'lakshmiyantra', t:"लक्ष्मी यन्त्र", d:"धन-समृद्धिका लागि लक्ष्मी यन्त्र।", icon:'compass'},
    {id:'vyaparkadi', t:"व्यापार कडी", d:"व्यापार वृद्धिका लागि परम्परागत कडी।", icon:'briefcase'},
    {id:'kuberyantra', t:"कुवेर यन्त्र", d:"धनवृद्धिका लागि कुवेर यन्त्र।", icon:'compass'},
    {id:'rashiitem', t:"राशि आइटम", d:"आफ्नो राशि अनुसारको विशेष सामग्री।", icon:'star'},
    {id:'murti', t:"मूर्तिहरू", d:"देवी-देवताका पूजनीय मूर्तिहरू।", icon:'temple'},
    {id:'shrikhand', t:"श्रीखण्ड", d:"शुद्ध श्रीखण्ड (चन्दन)।", icon:'gem'},
    {id:'kaudi', t:"कौडा", d:"लक्ष्मी पूजाका लागि कौडा।", icon:'gem'},
    {id:'vagbeli', t:"वागवेली बुटी", d:"परम्परागत वागवेली बुटी।", icon:'book'},
    {id:'mantraash', t:"मन्त्रिएको खरानी", d:"विधिपूर्वक मन्त्रिएको पवित्र खरानी।", icon:'fire'},
    {id:'energyyantra', t:"ऊर्जा बुस्टिङ यन्त्र", d:"सकारात्मक ऊर्जा वृद्धिका लागि यन्त्र।", icon:'compass'},
    {id:'updevatayantra', t:"उपदेवता यन्त्र", d:"उपदेवता सम्बन्धी विशेष यन्त्र।", icon:'compass'},
    {id:'crystalquartz', t:"Crystal Quartz", d:"शुद्ध क्रिस्टल क्वार्ट्ज।", icon:'gem'},
    {id:'stone', t:"Stone (उपचार ढुङ्गा)", d:"परम्परागत उपचार ढुङ्गा।", icon:'gem'}
  ],
  bookPortalTitle:"परामर्शको लागि बुकिङ गर्नुहोस्",
  chooseKindHeading:"परामर्शको प्रकार छनोट गर्नुहोस्",
  kindOnline:"अनलाइन परामर्श", kindDirect:"प्रत्यक्ष परामर्श",
  kindOnlineD:"गुगल मिट/जुम/फोन मार्फत अनलाइन परामर्श।", kindDirectD:"कार्यालयमा प्रत्यक्ष उपस्थित भई परामर्श।",
  chooseOnlineOptionHeading:"अनलाइन परामर्श विधि छनोट गर्नुहोस्",
  optLiveCall:"लाइभ कल", optLiveCallD:"फोन/भिडियो मार्फत प्रत्यक्ष कुराकानी।",
  optLiveChart:"लाइभ अनलाइन चार्ट", optLiveChartD:"तपाईंको कुण्डली/चार्ट हेर्दै ज्योतिषीसँग छलफल।",
  optLiveQA:"लाइभ प्रश्न–उत्तर", optLiveQAD:"लाइभ च्याटमार्फत प्रत्यक्ष प्रश्नोत्तर।",
  chooseAstrologerHeading:"ज्योतिषी छनोट गर्नुहोस्",
  astrologerMoreNote:"थप ज्योतिषीहरू प्रशासकबाट क्रमशः थपिँदै जानेछन्।",
  directMeetingHeading:"प्रत्यक्ष भेटघाट",
  directMeetingNote:"मिति, समय र स्थान भुक्तानी र विवरणपछि पुष्टि गरिनेछ। कार्यालयको ठेगाना सम्पर्क पृष्ठमा हेर्नुहोस्।",
  termsHeading:"नियम तथा सर्तहरू", termsInfoHeading:"सूचना तथा जानकारी",
  termsPoints:["कल सेवा समय आधारित हुन्छ।","कल बीचमै विच्छेद भएमा बाँकी समयको आधारमा पुनः जडान गर्न वा सेवा निरन्तरता दिन Call History जाँच गर्नुहोस्।","यदि ज्योतिषीले कललाई \"सम्पन्न\" भएको भनी चिन्ह लगाइसकेको अवस्थामा खरिद गरिएको टिकट/सेवा शुल्क फिर्ता हुने छैन।"],
  termsFooterNote:"कल सेवा समय आधारित हुन्छ। त्यसैले निर्धारित समयभित्र उपलब्ध सेवा प्रयोग गर्नु ग्राहकको जिम्मेवारी हुनेछ।",
  termsCheckboxLabel:"मैले नियम तथा सर्तहरू पढेको र स्वीकार गरेको छु।",
  termsRequired:"अगाडि बढ्नुअघि कृपया नियम तथा सर्तहरू स्वीकार गर्नुहोस्।",
  tokenLabel:"टोकन नम्बर",
  tokenIssuedNote:"कृपया परामर्शको समयमा यो टोकन नम्बर देखाउनुहोस्।",
  liveLinkLabel:"लाइभ पञ्चाङ्ग र मुहूर्त हेर्नुहोस्",
  panchangaPageTitle:"लाइभ पञ्चाङ्ग", panchangaPageSub:"काठमाडौं, नेपालको लागि आजको पञ्चाङ्ग विवरण।",
  lblAdDate:"ईस्वी मिति", lblBsDate:"विक्रम सम्वत", lblWeekday:"वार",
  lblSunrise:"सूर्योदय", lblSunset:"सूर्यास्त",
  lblTithi:"तिथि", lblNakshatra:"नक्षत्र", lblYoga:"योग", lblKarana:"करण", lblMoonRashi:"चन्द्र राशि", lblRitu:"ऋतु", lblAyana:"अयन", lblDishashool:"दिशाशूल", lblChandraNivasa:"चन्द्र निवास",
  adminUpdatedNote:"(प्रशासक/पञ्चाङ्ग इन्जिनबाट अपडेट हुनेछ)",
  muhurtaTitle:"लाइभ मुहूर्त", muhurtaSub:"आजको दिनका शुभ-अशुभ समयावधि — सूर्योदय/सूर्यास्तको आधारमा गणना गरिएको।",
  muhurtaNow:"अहिले", muhurtaUpcoming:"आउँदै", muhurtaDone:"समाप्त",
  muhLabels:{rahu:"राहुकाल", yama:"यम घण्टक", gulika:"गुलिक काल", abhijit:"अभिजित मुहूर्त"}, horaTitle:"होरा", horaCurrent:"हालको होरा", choghadiyaTitle:"चौघडिया", choghadiyaDay:"दिन", choghadiyaNight:"रात",
  panchangaAccuracyNote:"⚠️ यहाँ देखिने सूर्योदय, सूर्यास्त, तिथि, नक्षत्र, योग, करण, राहुकाल, यमगण्ड, गुलिक काल र अभिजित् मुहूर्त — सबै काठमाडौंको लागि मानक खगोलीय सूत्रबाट स्वतः गणना गरिएका हुन् (होइन कि कुनै व्यक्तिले म्यानुअली अपडेट गरेको)। तिथि/नक्षत्र गणनाको शुद्धता करिब ±०.३-०.५ डिग्री (झन्डै आधा-एक घण्टा) सम्म हुन सक्छ, त्यसैले ठ्याक्कै तिथि परिवर्तन हुने समयमा (जस्तै विवाह मुहूर्त तोक्दा) प्रमाणित पञ्चाङ्ग वा ज्योतिषीसँग पुनः जाँच गर्नुहोस्।",
  refreshBtn:"पुनः लोड गर्नुहोस्",
  dobBsLabel:"मिति (वि.सं.)", dobAdLabel:"मिति (ईस्वी)",
  dobConvertNote:"वि.सं. वा ईस्वी मध्ये कुनै एक मिति भर्नुहोस् — अर्को स्वतः गणना हुनेछ।",
  optionalLabel:"(वैकल्पिक)",
  chooseModeHeading:"परामर्श मोड छनोट गर्नुहोस्",
  modeRequired:"कृपया परामर्श मोड (अनलाइन वा प्रत्यक्ष) छनोट गर्नुहोस्।",
  stepDetails:"विवरण", stepPayment:"भुक्तानी", stepConfirmation:"पुष्टि",
  stepType:"प्रकार", stepAstro:"ज्योतिषी", stepMethod:"विधि", stepTerms:"सर्त",
  askSteps:["विवरण","प्रश्न","भुक्तानी","पेश","उत्तर"],
  feeOnline:"रु. 1,000", feeChat:"रु. 600", feeAsk:"रु. 100",
  birthCountryLabel:"जन्म देश",
  validationRequired:"कृपया सबै आवश्यक (*) विवरण भर्नुहोस्।",
  payInstructions:"आफ्नो eSewa वा Khalti एप खोलेर 9851001890 मा {fee} पठाउनुहोस्, त्यसपछि तल 'मैले भुक्तानी गरें' मा क्लिक गर्नुहोस्।",
  payAttestLabel:"मैले भुक्तानी गरिसकें", payRefLabel:"ट्रान्जेक्सन/सन्दर्भ नम्बर (ऐच्छिक)",
  payAttestRequired:"अगाडि बढ्नुअघि कृपया भुक्तानी गरेको पुष्टि गर्नुहोस्।",
  payPendingBadge:"भुक्तानी पुष्टि हुन बाँकी", payPendingNote:"हाम्रो टोलीले तपाईंको भुक्तानी रुजु गरी फोन वा ह्वाट्सएपमार्फत अन्तिम पुष्टि गर्नेछ।",
  onlineBookedMsg:"तपाईंको अनलाइन परामर्श सफलतापूर्वक बुक भयो।",
  chatBookedMsg:"तपाईंको च्याट परामर्श सफलतापूर्वक बुक भयो।",
  chatActivateNote:"भुक्तानी पुष्टि भएपछि हामी तपाईंलाई ह्वाट्सएपमार्फत विशेषज्ञसँगको निजी च्याट लिंक पठाउनेछौं।",
  askOneNotice:"यो शुल्क एउटा प्रश्नका लागि मात्र हो। अर्को प्रश्न सोध्न पुनः रु. १०० भुक्तानी गर्नुपर्नेछ।",
  askAnotherBtn:"अर्को प्रश्न सोध्नुहोस् — रु. १००",
  askDashboardEyebrow:"प्रश्न परामर्श", askEditProfile:"जन्म विवरण सम्पादन", askBirthDetails:"जन्म विवरण", askTotalQuestions:"कुल प्रश्न", askAnswered:"उत्तर प्राप्त", askPending:"उत्तर बाँकी", askHistoryTitle:"मेरा प्रश्नहरू", askNoQuestions:"अहिलेसम्म कुनै प्रश्न पठाइएको छैन।", askFeeNote:"प्रति प्रश्न शुल्क: रु. १००", askInstruction:"आफ्नो एउटा स्पष्ट प्रश्न लेख्नुहोस्।", askPlaceholder:"यहाँ आफ्नो एउटा प्रश्न लेख्नुहोस्...", askPreviewTitle:"प्रश्नको पुष्टि", askYourQuestion:"तपाईंको प्रश्न", consultationFee:"परामर्श शुल्क", askPaymentPreviewBtn:"भुक्तानीतर्फ जानुहोस्", askFollowupRule:"नयाँ वा फरक प्रश्नका लागि नयाँ भुक्तानी आवश्यक हुनेछ।", questionRequired:"कृपया एउटा प्रश्न लेख्नुहोस्।", oneQuestionWarning:"एकपटकको शुल्कमा एउटा मात्र प्रश्न सोध्न सकिन्छ। कृपया एउटा मुख्य प्रश्न मात्र लेख्नुहोस्।", questionRequestLabel:"अनुरोध सन्दर्भ", questionConsultationsTitle:"प्रश्न परामर्शहरू",
  answerPendingNote:"विशेषज्ञले जवाफ दिएपछि यहाँ देखिनेछ र तपाईंलाई सूचना पठाइनेछ।",
  questionIdLabel:"प्रश्न आईडी",
  navShop:"पसल",
  shopEyebrow:"अनलाइन पसल", shopTitle:"ज्योतिष, वास्तु तथा पूजा सामग्री", shopSub:"प्रमाणित परम्परागत सामग्री — अर्डर गर्नुहोस्, हाम्रो टोलीले मूल्य र भुक्तानी पुष्टि गर्न सम्पर्क गर्नेछ।",
  shopList:[
    {id:'rudraksha', t:"रुद्राक्ष माला", d:"शुद्ध तथा प्रमाणित रुद्राक्ष माला।", icon:'gem'},
    {id:'navratna', t:"नवरत्न/रत्न औंठी", d:"कुण्डली अनुसार सिफारिस गरिने रत्न।", icon:'star'},
    {id:'sriyantra', t:"श्री यन्त्र", d:"घर वा व्यवसायका लागि श्री यन्त्र।", icon:'compass'},
    {id:'vastupyramid', t:"वास्तु पिरामिड सेट", d:"वास्तु दोष सुधारका लागि पिरामिड सेट।", icon:'home2'},
    {id:'navagraha', t:"नवग्रह यन्त्र", d:"नवग्रह शान्तिका लागि यन्त्र।", icon:'compass'},
    {id:'pujakit', t:"पूजा सामग्री किट", d:"सम्पूर्ण पूजा सामग्री भएको किट।", icon:'temple'},
    {id:'sphatik', t:"स्फटिक माला", d:"जप तथा ध्यानका लागि स्फटिक माला।", icon:'gem'},
    {id:'camphorset', t:"कर्पूर, धूप तथा अगरबत्ती सेट", d:"दैनिक पूजाका लागि सामग्री सेट।", icon:'fire'}
  ],
  orderNowBtn:"अर्डर गर्नुहोस्", orderPanelTitle:"अर्डर विवरण",
  orderProductLabel:"छानिएको सामान", orderQtyLabel:"परिमाण", orderAddressLabel:"ठेगाना (डेलिभरीका लागि)", orderNotesLabel:"थप टिप्पणी",
  orderSubmitBtn:"अर्डर पेश गर्नुहोस्",
  orderNote:"⚠️ यो अर्डर अनुरोध मात्र हो — मूल्य र भुक्तानी हाम्रो टोलीले फोन/ह्वाट्सएपमार्फत पुष्टि गरेपछि मात्र अर्डर टुंगिन्छ।",
  orderSuccessTitle:"अर्डर अनुरोध प्राप्त भयो!", orderSuccessNote:"हाम्रो टोलीले चाँडै मूल्य र डेलिभरी पुष्टि गर्न सम्पर्क गर्नेछ।",
  orderIdLabel:"अर्डर आईडी", selectProductFirst:"कृपया पहिले माथिबाट कुनै सामान छान्नुहोस्।",
  navKarmakanda:"कर्मकाण्ड", navDirectory:"विशेषज्ञ", navLogin:"लगइन", navAccount:"मेरो खाता",
  kkEyebrow:"धार्मिक सेवा", kkTitle:"कर्मकाण्ड तथा धार्मिक अनुष्ठान सेवाहरू", kkSub:"परम्परागत विधिपूर्वक सम्पन्न गरिने संस्कार तथा पूजाहरू।",
  kkChoosePurohitLabel:"पुरोहित छान्नुहोस्",
  kkPurohitNote:"हाल आचार्य कृष्ण प्रसाद पोखरेल उपलब्ध हुनुहुन्छ। थप प्रमाणित पुरोहितहरू क्रमशः थपिँदै जानेछन्।",
  kkList:[
    ["विवाह संस्कार","विवाह सम्बन्धी पूर्ण विधि तथा पूजा।"],
    ["व्रतबन्ध","उपनयन संस्कार।"],
    ["अन्नप्राशन","शिशुको अन्नप्राशन संस्कार।"],
    ["नामकरण संस्कार","शिशुको नामकरण विधि।"],
    ["गृहप्रवेश","नयाँ घरमा प्रवेश गर्दा गरिने पूजा।"],
    ["रुद्री पाठ","रुद्री पाठ तथा अनुष्ठान।"],
    ["नवग्रह पूजा","नवग्रह शान्तिका लागि पूजा।"],
    ["सत्यनारायण पूजा","सत्यनारायण भगवानको पूजा।"],
    ["श्राद्ध","पितृ श्राद्ध सम्बन्धी विधि।"],
    ["अन्त्येष्टि सम्बन्धी कर्म","अन्त्येष्टि संस्कार सम्बन्धी सेवा।"],
    ["शान्ति कर्म","विविध शान्ति कर्महरू।"],
    ["ग्रहशान्ति","ग्रह दोष शान्तिका लागि पूजा।"],
    ["वास्तु शान्ति","वास्तु दोष शान्तिका लागि पूजा।"],
    ["अन्य धार्मिक संस्कार","अन्य परम्परागत पूजा तथा संस्कार।"]
  ],
  dirEyebrow:"विशेषज्ञ निर्देशिका", dirTitle:"ज्योतिषी तथा पुरोहित", dirSub:"प्रमाणित विशेषज्ञहरूसँग सिधै परामर्श लिनुहोस्।",
  dirAstroSectionTitle:"ज्योतिषीहरू", dirPurohitSectionTitle:"पुरोहितहरू",
  dirPurohitEmpty:"प्रमाणित पुरोहितहरूको सूची चाँडै थपिनेछ। हामी असत्यापित प्रोफाइल सूचीकरण गर्दैनौं — सम्पर्क गरे हामी उपयुक्त पुरोहितसँग जोड्न सहयोग गर्नेछौं।",
  dirBookBtn:"परामर्श बुक गर्नुहोस्", dirChatBtn:"च्याट सुरु गर्नुहोस्", dirAskBtn:"प्रश्न सोध्नुहोस्",
  ctPickerTitle:"परामर्शको प्रकार छनोट गर्नुहोस्",
  ctOnline:"अनलाइन परामर्श / प्रत्यक्ष परामर्श", ctOnlineD:"गुगल मिट/जुम/फोन मार्फत वा कार्यालयमा प्रत्यक्ष पूर्ण समयको परामर्श।",
  ctChat:"च्याट परामर्श", ctChatD:"निश्चित समयावधिभित्र लिखित च्याटमार्फत परामर्श।",
  ctAsk:"प्रश्न सोध्नुहोस्", ctAskD:"तपाईंको विशेष प्रश्नको छोटो, किफायती जवाफ।",
  ctContinue:"अगाडि बढ्नुहोस्",
  askExpert:"विशेषज्ञ छनोट गर्नुहोस्", askQuestionLabel:"तपाईंको प्रश्न लेख्नुहोस्", askSubmitBtn:"प्रश्न र भुक्तानी पेश गर्नुहोस्",
  askPerQuestion:"प्रति प्रश्न",
  askNote:"भुक्तानीपछि विशेषज्ञले प्रश्नको जवाफ दिनुहुनेछ। जवाफ तपाईंको खातामा उपलब्ध हुनेछ।",
  askSuccessTitle:"प्रश्न प्राप्त भयो!", askSuccessNote:"विशेषज्ञले चाँडै जवाफ दिनुहुनेछ। सूचना इमेल/ह्वाट्सएपमार्फत पठाइनेछ।",
  chatInfoTitle:"च्याट परामर्श कसरी काम गर्छ", chatInfoBody:"भुक्तानीपछि तोकिएको समयावधिभित्र विशेषज्ञसँग निजी च्याट सुरु हुन्छ, जहाँ तपाईं लेख्न, फोटो र कागजात पठाउन सक्नुहुन्छ। (यो लाइभ च्याट प्रणाली अहिले निर्माणाधीन छ — हाल यसका लागि ह्वाट्सएपमार्फत सम्पर्क गर्नुहोस्।)",
  chatStartBtn:"ह्वाट्सएपमार्फत च्याट सुरु गर्नुहोस्",
  authLoginTab:"लगइन", authRegisterTab:"दर्ता गर्नुहोस्", authFullName:"पूरा नाम", authPhoneLabel:"मोबाइल नम्बर", authEmailLabel:"इमेल",
  authPasswordLabel:"पासवर्ड", authConfirmLabel:"पासवर्ड पुष्टि गर्नुहोस्", authPrefLangLabel:"रुचाइएको भाषा",
  authLoginSubmit:"लगइन गर्नुहोस्", authRegisterSubmit:"खाता बनाउनुहोस्",
  authDemoBanner:"🔒 सुरक्षित Supabase खाता प्रणाली — आफ्नो email बाट दर्ता गरी पुष्टि गरेपछि login गर्नुहोस्।",
  authForgotLink:"पासवर्ड बिर्सनुभयो?", authSwitchToRegister:"खाता छैन? दर्ता गर्नुहोस्", authSwitchToLogin:"पहिले नै खाता छ? लगइन गर्नुहोस्",
  myAccTitle:"मेरो खाता", myAccSub:"तपाईंको बुकिङ, कुण्डली, रिपोर्ट र भुक्तानी एकै ठाउँमा।",
  bookingsTitle:"बुकिङ रेकर्ड", bookingsSub:"बुकिङ गरेका व्यक्तिहरूका सेवा र सम्पूर्ण विवरण नामअनुसार।", bookingsPeopleLabel:"व्यक्ति", bookingsRecordsLabel:"रेकर्ड", bookingsEmpty:"अहिलेसम्म कुनै record भेटिएन।", bookingsRefresh:"रिफ्रेस", bookingsExportAll:"सबै डाउनलोड", bookingsDownloadPerson:"व्यक्तिको data डाउनलोड",
  myAccSections:["मेरो प्रोफाइल","मेरा बुकिङहरू","आगामी परामर्श","विगतका परामर्श","च्याट","मेरा प्रश्नहरू","मेरा रिपोर्टहरू","भुक्तानीहरू","सूचनाहरू"],
  myAccDemoNote:"⚠️ यो 'मेरो खाता' पृष्ठ हाल नमूना मात्र हो — वास्तविक डेटा हेर्न लगइन प्रणाली निर्माण हुनुपर्छ।",
  vcEyebrow:"वास्तु एनोटेसन", vcTitle:"नक्सामा प्रत्यक्ष चिन्ह लगाउनुहोस्",
  vcHint:"माथिको नक्सामा जुनसुकै ठाउँमा क्लिक गरेर पिन थप्नुहोस्, त्यसपछि कोठा/दिशा र टिप्पणी लेख्नुहोस्।",
  vcRoomLabel:"कोठा/दिशा", vcNoteLabel:"टिप्पणी", vcSaveNote:"पिन सुरक्षित गर्नुहोस्", vcDownload:"एनोटेट नक्सा डाउनलोड गर्नुहोस्",
  vcClear:"सबै पिन हटाउनुहोस्", vcPinsHeading:"थपिएका टिप्पणीहरू", vcNoPins:"अहिलेसम्म कुनै पिन थपिएको छैन।",
  vcUploadFirst:"पहिले माथि नक्सा अपलोड गर्नुहोस्।", vcDelete:"हटाउनुहोस्"
},
en: {
  brand:"Jyotish and Vastu Sewa Kendra", brandTag:"Vedic Astrology & Vastu Shastra",
  nav:{home:"Home",astrology:"Astrology",rashifal:"Rashifal",vastu:"Vastu",karmakanda:"Karmakanda",directory:"Experts",classes:"Online Classes",shop:"Shop",kundali:"Kundali",booking:"Book Appointment",bookings:"Booked Services",contact:"Contact",login:"Login",account:"My Account"},
  headerCta:"Book a Consultation",
  heroEyebrow:"Classical Vedic Jyotish • Vastu Shastra • Nepal",
  heroTitle:"Your Trusted Center for Jyotish and Vastu Consultation",
  heroLead:"Personalized guidance based on classical Vedic Jyotish, Vastu Shastra and traditional knowledge — available online and in person.",
  heroCta1:"Book Consultation", heroCta2:"View Our Services",
  qlCall:"Call Now", qlWa:"WhatsApp", qlViber:"Viber", qlBook:"Appointment",
  heroCardTitle:"How Consultation Works",
  heroCardList:["Choose service and date","Submit your birth details","Meet online or in person","Receive a secure report"],
  panchangTithi:"Date: 6 Bhadra 2083 • Tithi: Dashami (Shukla Paksha)*",
  panchangNote:"*Snapshot data — will auto-update daily once a live Panchang engine is connected",
  statLabels:["Years of Experience","Consultations Completed","Services Available","Online & Offline"],
  statNote:"(to be updated by admin)",
  svcEyebrow:"Our Services", svcTitle:"Astrology & Vastu Services", svcSub:"A complete range of services blending traditional knowledge with modern consultation methods.",
  overview:[
    {icon:'chart',t:"Birth Chart & Analysis",d:"Complete Kundali analysis, Dasha-Antardasha and transit predictions.",cta:"View",view:"astrology"},
    {icon:'heart',t:"Marriage Compatibility",d:"Guna matching, dosha analysis and marriage consultation.",cta:"View",view:"astrology"},
    {icon:'briefcase',t:"Career & Business Astrology",d:"Guidance on education, career, business and financial direction.",cta:"View",view:"astrology"},
    {icon:'home2',t:"Vastu Consultation",d:"Residential, commercial and land-selection Vastu services.",cta:"View",view:"vastu"},
    {icon:'compass',t:"Muhurta (Auspicious Timing)",d:"Timing for marriage, housewarming, groundbreaking and more.",cta:"Learn more",view:"booking"},
    {icon:'temple',t:"Puja & Religious Rituals",d:"Graha Shanti, Navagraha Puja and traditional ceremonies.",cta:"Learn more",view:"booking"}
  ],
  whyEyebrow:"Why Choose Us", whyTitle:"Why Clients Choose Us",
  why:[
    {icon:'book',t:"Classical Approach",d:"Analysis grounded in Vedic astrology and classical texts."},
    {icon:'heart',t:"Personalized Consultation",d:"Guidance tailored to every client's unique situation."},
    {icon:'compass',t:"Online & Offline Consultation",d:"Consult online or visit our office, whichever suits you."},
    {icon:'shield',t:"Privacy",d:"Your personal details are kept completely confidential."},
    {icon:'briefcase',t:"Practical Guidance",d:"Concrete suggestions you can apply in real life."},
    {icon:'building',t:"Tradition + Modern Technology",d:"Traditional knowledge paired with a modern booking system."}
  ],
  aboutEyebrow:"About Us", aboutTitle:"About the Astrologer", aboutSub:"Full details will be updated by the admin soon.",
  profName:"Acharya Krishna Prasad Pokharel",
  profFields:[["Education","Master's in Jyotish"],["Experience","15 years"],["Specialization","Specialist across all fields of Jyotish (birth charts, marriage matching, Vastu, Muhurta, Puja)"],["Languages","Nepali • Hindi • English"]],
  profBio:"Acharya Krishna Prasad Pokharel holds a Master's degree in Jyotish and has 15 years of consultation experience. He specializes across birth chart analysis, marriage compatibility, Vastu Shastra, Muhurta and Puja consultation. Based in Balambu, Chandragiri, Nepal.",
  profReadMore:"Read Full Profile",
  howEyebrow:"Process", howTitle:"How Consultation Works",
  how:[["Choose Service","Select the service that fits your need."],["Select Date & Time","Pick from the available time slots."],["Submit Details","Fill in your birth details and question."],["Meet Your Astrologer","Consult online or in person."]],
  howCta:"Book Now",
  artEyebrow:"Knowledge Center", artTitle:"Latest Articles", artSub:"Educational content on Jyotish, Vastu and Vedic tradition.",
  articles:[
    ["What is a Nakshatra?","A basic introduction to the 27 lunar mansions."],
    ["Fundamentals of Vastu Shastra","The importance of direction and elements in construction."],
    ["Understanding Dasha & Antardasha","How planetary periods influence life events."]
  ],
  artCta:"Read",
  vidEyebrow:"Videos", vidTitle:"Our YouTube Channel", vidSub:"Rashifal, Vastu tips and educational videos.",
  vidCta:"Subscribe on YouTube", vidNote:"New videos will appear here automatically from our YouTube channel.",
  testiEyebrow:"Testimonials", testiTitle:"Client Experiences",
  testiEmpty:"Verified client reviews will be added here soon. We never publish unverified testimonials.",
  testiGoogle:"View Google Reviews",
  faqEyebrow:"FAQ", faqTitle:"Frequently Asked Questions",
  faqCats:["Astrology","Kundali","Vastu","Booking"],
  faq:{
    "Astrology":[["How long does a consultation take?","Typically 30–60 minutes depending on the service."],["Is online consultation available?","Yes, via WhatsApp, phone call or video call."]],
    "Kundali":[["What information is needed for a Kundali?","Full name, date of birth, exact time of birth and birthplace."],["What if I don't know the exact birth time?","Provide your best estimate, but an accurate time is preferred."]],
    "Vastu":[["How does a Vastu consultation work?","Analysis is based on the floor plan or photos you submit."],["Can I upload my house plan?","Yes, in PDF, JPG or PNG format."]],
    "Booking":[["How do I book an appointment?","Use the 'Book Consultation' button to choose service, date and time."],["Can I reschedule?","Yes, contact us after booking to arrange a new time."]]
  },
  contactEyebrow:"Contact", contactTitle:"Get in Touch",
  contactAddr:"Address", contactAddrV:"Balambu, Chandragiri, Nepal",
  contactPhone:"Phone", contactPhoneV:"+977-985-1001890",
  contactWa:"WhatsApp / Viber", contactWaV:"+977-985-1001890",
  contactEmail:"Email", contactEmailV:"info@jyotishvastusewakendra.com.np",
  contactHours:"Business Hours", contactHoursV:"Sunday - Friday, 9:00 AM - 6:00 PM",
  contactFullBtn:"View Full Contact Page",
  astroBread:"Home / Astrology", astroH1:"Astrology Services", astroP:"Complete Vedic astrology consultation services — from birth charts to auspicious timing.",
  vastuBread:"Home / Vastu", vastuH1:"Vastu Analysis and Remedies", vastuP:"Receive map-based Vastu analysis, possible concerns and improvement guidance for your home, land, office or business property.", vastuMapCta:"Check Your Map", vastuAnalysisCta:"Start Vastu Analysis", vastuPlatformEyebrow:"Vastu Analysis & Remedy", vastuPlatformTitle:"Vastu Analysis and Remedies", vastuPlatformSub:"Get an initial insight and expert-configured detailed analysis based on your map, photos and property details.", vastuUploadNotice:"Please upload a clear map, floor plan or property photo.", vastuServiceTypeLabel:"Vastu service", vastuTopicLabel:"Specific topic", vastuEntranceLabel:"Main entrance direction", vastuStatusLabel:"Construction status", vastuPurposeLabel:"Purpose of property", vastuRoomsLabel:"Number of rooms",
  uploadEyebrow:"Floor Plan Upload", uploadTitle:"Upload Your House / Land Plan",
  uploadLabel:"Click here to select a file", uploadHint:"PDF, JPG, PNG (max 10 MB)",
  lblDirection:"Main Door Direction", lblBuildingType:"Building Type", lblLocationV:"Location", lblFloors:"Number of Floors", lblProblem:"Problem / Question Details",
  directions:["North","South","East","West","North-East","North-West","South-East","South-West"],
  buildingTypes:["House","Apartment","Office","Shop/Business","Factory","Land/Plot"],
  vastuSubmitBtn:"Submit Vastu Request",
  bookBread:"Home / Book Appointment", bookH1:"Book a Consultation", bookP:"Complete the steps below to secure your appointment.",
  steps:["Service","Mode","Date/Time","Details","Payment","Confirm"],
  chooseService:"Choose a Service", chooseMode:"Choose Consultation Mode",
  modes:[["Online","Google Meet / Zoom / Phone / WhatsApp"],["Offline","In-person visit to our office"]],
  chooseDate:"Select Date", chooseSlot:"Select an Available Time",
  yourDetails:"Your Details",
  labels:{name:"Full Name",phone:"Phone Number",email:"Email",dob:"Date of Birth",tob:"Time of Birth",pob:"Birth Place",gender:"Gender",country:"Country",message:"Your Question / Message",topics:"What would you like to discuss?",subject:"Subject",purpose:"Purpose of Consultation",accuracy:"Birth Time Accuracy"},
  genders:["Female","Male","Other"],
  topics:["Career","Marriage","Relationship","Business","Finance","Education","Foreign Travel","Property","Family","Health-related concerns","Children","Legal matters","Spiritual matters","Vastu","Muhurta","General Life Guidance","Other"],
  paymentTitle:"Payment Option", payLater:"Pay Later", payConfirm:"Payment Confirmed",
  paymentNote:"eSewa and Khalti payments accepted at 9851001890. Direct online gateway integration is coming soon.",
  reviewTitle:"Review Your Booking",
  back:"Back", next:"Next", confirmBooking:"Confirm Booking",
  confirmedTitle:"Your Appointment is Confirmed!", confirmedNote:"A confirmation email and WhatsApp message will be sent shortly.",
  bookingIdLabel:"Booking ID", newBooking:"Make a New Booking",
  kundBread:"Home / Kundali", kundH1:"Kundali Request", kundP:"Submit your birth details and our astrologer will prepare your Kundali.",
  kundDisclaimer:"⚠️ An initial Kundali is calculated from your birth date, time and place. Exact readings require verified Panchanga/ephemeris data and astrologer review.",
  kundSubmit:"Submit Kundali Request", kundSuccessTitle:"Request Received!", kundSuccessNote:"Our team will contact you to confirm the details.",
  cBread:"Home / Contact", cH1:"Contact Us", cP:"Fill out the form below or reach us directly for any questions.",
  contactSubmit:"Send Message", contactSuccess:"Thank you! Your message has been received, we'll be in touch soon.",
  fServicesH:"Services", fQuickH:"Quick Links", fContactH:"Contact",
  fLinkAstro:"Astrology Services", fLinkVastu:"Vastu Services", fLinkKundali:"Kundali Request", fLinkBook:"Book Consultation",
  fLinkHome:"Home", fLinkAbout:"About Us", fLinkContact2:"Contact", fLinkPrivacy:"Privacy Policy", fLinkTerms:"Terms & Conditions",
  footerAbout:"A professional consultation service grounded in classical Vedic astrology and Vastu Shastra — available online and in person.",
  fCopyright:"© 2026 Jyotish and Vastu Sewa Kendra. All rights reserved.",
  fDisclaimerShort:"Astrological consultation is for traditional guidance and is not a substitute for medical or legal advice.",
  bottomHome:"Home", bottomServices:"Services", bottomBook:"Book", bottomWa:"WhatsApp", bottomCall:"Call",
  toastKundali:"Kundali request saved!", toastVastu:"Vastu request saved!", toastContact:"Message sent!",
  healthNote:"⚠️ Astrological guidance on health matters is not a medical diagnosis and cannot replace professional medical advice.",
  pricePlaceholder:"Contact for price",
  langSelectorLabel:"Language",
  fabCallLabel:"Call Now", fabChatLabel:"Chat Now", fabBookLabel:"Book Now",
  chatWidgetSubtitle:"We usually reply within a few minutes",
  chatWelcomeMsg:"Hello! \ud83d\ude4f How can I help you? Write your question or query below.",
  chatInputPlaceholder:"Type your message...",
  chatConnectingMsg:"Thank you! Taking your message and connecting you to WhatsApp now, where our team will reply right away.",
  chatBotBadge:"Automated Assistant — click below to talk to a real person",
  chatTalkHumanBtn:"Talk to a Person",
  classesEyebrow:"Learning Center", classesTitle:"Online Classes", classesSub:"Online training in Jyotish, Vastu and related subjects — learn from home.",
  classesList:[
    ["Astrology Classes","Training from beginner to advanced level in Jyotish.",'chart'],
    ["Vastu Classes","Classes covering Vastu Shastra principles and practical application.",'home2'],
    ["Numerology Classes","Foundational knowledge and application of Numerology.",'chart'],
    ["Panchanga/Muhurta Classes","Classes on reading the Panchanga and determining Muhurta.",'clock'],
    ["Karmakanda Classes","Training on Puja and Karmakanda procedures.",'temple'],
    ["Sanskrit/Traditional Knowledge Classes","Sanskrit language and traditional classical knowledge.",'book']
  ],
  lblInstructor:"Instructor", lblDuration:"Duration", lblLevel:"Level", durationTBD:"To be updated by admin",
  levelAllLabel:"Beginner to Advanced",
  enrollBtn:"Enroll", enrollFormTitle:"Enrollment Form", enrollCourseLabel:"Selected Course",
  enrollSubmitBtn:"Submit Enrollment Request",
  enrollSuccessTitle:"Enrollment Request Received!", enrollSuccessNote:"Our team will contact you to confirm the class schedule, timing and fee.",
  moreInfoLabel:"Learn More",
  vastuDisclaimerNumerology:"This is Numerology and Vastu based guidance — not a guaranteed prediction.",
  vastuDisclaimerDosha:"This is a traditional Jyotish/Vastu interpretation — guidance based on religious and traditional belief, not a scientifically proven fact.",
  vastuDisclaimerRemedies:"This is traditional remedy guidance. For health or Ayurveda-related matters, please consult a qualified healthcare professional — this is not a substitute for medical treatment.",
  vastuDisclaimerGeneral:"Final interpretation and recommendations are made by the qualified consultant.",
  vastuCatBusiness:"Business Vastu", vastuCatPersonal:"Personal Energy", vastuCatHouse:"House & Room Vastu",
  vastuCatNumerology:"Numerology + Vastu", vastuCatDirection:"Direction & Space Analysis", vastuCatColor:"Color Vastu",
  vastuCatPlacement:"Object Placement", vastuCatDosha:"Vastu & Traditional Dosha", vastuCatRemedies:"Traditional & Modern Remedies",
  vastuCatGeneral:"Other Vastu Services",
  homeVastuHighlightEyebrow:"Vastu Shastra", homeVastuHighlightTitle:"Featured Vastu Services",
  viewAllVastuBtn:"View All Vastu Services",
  topicsEyebrow:"Areas We Help With", topicsTitle:"What We Help You With", topicsSub:"Astrological and Vastu-based solutions for the everyday concerns life brings.",
  topicsList:[
    ["Birth Chart Reading, Remedies & Birth Chart Preparation",'chart'],
    ["Astrological Guidance for Mental Stress",'heart'],
    ["Kati and Yantra Consultation",'compass'],
    ["Gemstone / Stone Consultation",'gem'],
    ["Astrological Consultation Regarding Delays or Obstacles in Parenthood",'heart'],
    ["Education & Employment Guidance",'book'],
    ["Business Obstacles Consultation & Traditional Remedies",'briefcase'],
    ["Partnership & Business Relationship Guidance",'briefcase'],
    ["Personal & Family Consultation and Traditional Guidance",'heart'],
    ["Traditional Remedies & Guidance",'shield'],
    ["House, Land & Property Vastu Consultation",'home2'],
    ["Complete Vastu Assessment & Traditional Remedies",'building'],
    ["Prashna Jyotish for Lost Items",'star'],
    ["Business Timing & Business Selection Guidance",'compass'],
    ["Foreign Travel & Overseas Guidance",'compass'],
    ["Marriage & Relationship Consultation",'heart'],
    ["Astrology-Based Health Guidance",'shield'],
    ["Vastu Shastra Consultation",'home2'],
    ["Puja, Ritual & Karmakanda Guidance",'temple'],
    ["House & Vastu Analysis Based on Birth Chart",'chart'],
    ["Online Astrology & Vastu Classes",'book']
  ],
  originalGuaranteeNote:"✅ Every item purchased here is 100% original — fully guaranteed by our company.",
  specialOfferBanner:"🎉 Special Offer! A limited-time special discount is available on all items. Contact us for pricing and discount details.",
  mukhiLabel:"Choose Mukhi (Face)", caratLabel:"Choose Carat",
  shopList2:[
    {id:'vastukalash', t:"Vastu Kalash", d:"Auspicious Vastu Kalash for home or office.", icon:'home2'},
    {id:'shaligram', t:"Shaligram", d:"Sacred Shaligram stone.", icon:'temple'},
    {id:'shivling', t:"Shivling", d:"Shivling for worship.", icon:'temple'},
    {id:'suryayantra', t:"Surya Yantra", d:"Yantra for pacifying the Sun.", icon:'compass'},
    {id:'lakshmiyantra', t:"Lakshmi Yantra", d:"Yantra for wealth and prosperity.", icon:'compass'},
    {id:'vyaparkadi', t:"Vyapar Kadi", d:"Traditional chain/bracelet for business growth.", icon:'briefcase'},
    {id:'kuberyantra', t:"Kuber Yantra", d:"Yantra for financial growth.", icon:'compass'},
    {id:'rashiitem', t:"Rashi Item", d:"Special item based on your zodiac sign.", icon:'star'},
    {id:'murti', t:"Murtis (Idols)", d:"Sacred idols of deities.", icon:'temple'},
    {id:'shrikhand', t:"Shrikhand (Sandalwood)", d:"Pure sandalwood.", icon:'gem'},
    {id:'kaudi', t:"Kaudi (Cowrie Shells)", d:"Cowrie shells for Lakshmi puja.", icon:'gem'},
    {id:'vagbeli', t:"Vagbeli Booti", d:"Traditional Vagbeli herb.", icon:'book'},
    {id:'mantraash', t:"Mantra-Blessed Ash", d:"Sacred ash blessed with proper ritual.", icon:'fire'},
    {id:'energyyantra', t:"Energy Boosting Yantra", d:"Yantra for enhancing positive energy.", icon:'compass'},
    {id:'updevatayantra', t:"Sub-Deity Yantra", d:"Special yantra for sub-deities.", icon:'compass'},
    {id:'crystalquartz', t:"Crystal Quartz", d:"Pure crystal quartz.", icon:'gem'},
    {id:'stone', t:"Stone (Healing Stone)", d:"Traditional healing stone.", icon:'gem'}
  ],
  bookPortalTitle:"Book a Consultation",
  chooseKindHeading:"Choose Consultation Type",
  kindOnline:"Online Consultation", kindDirect:"Direct Consultation",
  kindOnlineD:"Online consultation via Google Meet / Zoom / phone.", kindDirectD:"In-person consultation at our office.",
  chooseOnlineOptionHeading:"Choose an Online Consultation Method",
  optLiveCall:"Live Call", optLiveCallD:"Real-time conversation via phone/video.",
  optLiveChart:"Live Online Chart", optLiveChartD:"Discuss your birth chart with the astrologer live.",
  optLiveQA:"Live Question & Answer", optLiveQAD:"Real-time Q&A over live chat.",
  chooseAstrologerHeading:"Choose Astrologer",
  astrologerMoreNote:"More astrologers will be added progressively by the admin.",
  directMeetingHeading:"Direct / In-Person Consultation",
  directMeetingNote:"Date, time and location will be confirmed after payment and details. See our office address on the Contact page.",
  termsHeading:"Terms & Conditions", termsInfoHeading:"Notice & Information",
  termsPoints:["The call service is time-based.","If the call is disconnected midway, check Call History to reconnect or continue the service based on remaining time.","If the astrologer has already marked the call as \"Completed\", the purchased ticket/service fee will not be refunded."],
  termsFooterNote:"The call service is time-based. It is the customer's responsibility to use the available service within the scheduled time.",
  termsCheckboxLabel:"I have read and accept the Terms & Conditions.",
  termsRequired:"Please accept the Terms & Conditions before proceeding.",
  tokenLabel:"Token Number",
  tokenIssuedNote:"Please present this token number at the time of your consultation.",
  liveLinkLabel:"View Live Panchanga",
  panchangaPageTitle:"Live Panchanga", panchangaPageSub:"Today's Panchanga details for Kathmandu, Nepal.",
  lblAdDate:"AD Date", lblBsDate:"Bikram Sambat", lblWeekday:"Weekday",
  lblSunrise:"Sunrise", lblSunset:"Sunset",
  lblTithi:"Tithi", lblNakshatra:"Nakshatra", lblYoga:"Yoga", lblKarana:"Karana", lblMoonRashi:"Moon Rashi", lblRitu:"Ritu", lblAyana:"Ayana", lblDishashool:"Dishashool", lblChandraNivasa:"Chandra Nivasa",
  adminUpdatedNote:"(to be updated via admin / Panchang engine)",
  muhurtaTitle:"Live Muhurta", muhurtaSub:"Today's auspicious/inauspicious periods — calculated from sunrise/sunset.",
  muhurtaNow:"NOW", muhurtaUpcoming:"UPCOMING", muhurtaDone:"COMPLETED",
  muhLabels:{rahu:"Rahu Kaal", yama:"Yam Ghantak", gulika:"Gulika Kaal", abhijit:"Abhijit Muhurta"}, horaTitle:"Hora", horaCurrent:"Current Hora", choghadiyaTitle:"Choghadiya", choghadiyaDay:"Day", choghadiyaNight:"Night",
  panchangaAccuracyNote:"⚠️ Sunrise, sunset, Tithi, Nakshatra, Yoga, Karana, Rahu Kaal, Yamaganda, Gulika Kaal and Abhijit Muhurta shown here are all calculated live from standard astronomical formulas for Kathmandu (not manually entered). Tithi/Nakshatra accuracy is roughly ±0.3-0.5°, i.e. within about half an hour to an hour of an exact boundary — so for time-critical decisions (like fixing a wedding muhurta), please cross-check with a verified Panchang or your astrologer near the exact transition time.",
  refreshBtn:"Refresh",
  dobBsLabel:"Date of Birth (BS)", dobAdLabel:"Date of Birth (AD)",
  dobConvertNote:"Enter either the BS or AD date — the other will be calculated automatically.",
  optionalLabel:"(Optional)",
  chooseModeHeading:"Choose Consultation Mode",
  modeRequired:"Please choose a consultation mode (Online or Direct).",
  stepDetails:"Details", stepPayment:"Payment", stepConfirmation:"Confirmation",
  stepType:"Type", stepAstro:"Astrologer", stepMethod:"Method", stepTerms:"Terms",
  askSteps:["Details","Question","Payment","Submit","Answer"],
  feeOnline:"NPR 1,000", feeChat:"NPR 600", feeAsk:"NPR 100",
  birthCountryLabel:"Birth Country",
  validationRequired:"Please fill in all required (*) details.",
  payInstructions:"Open your eSewa or Khalti app and send {fee} to 9851001890, then click \"I've completed the payment\" below.",
  payAttestLabel:"I've completed the payment", payRefLabel:"Transaction/Reference Number (optional)",
  payAttestRequired:"Please confirm you've completed the payment before proceeding.",
  payPendingBadge:"Payment Verification Pending", payPendingNote:"Our team will verify your payment and give final confirmation shortly via phone or WhatsApp.",
  onlineBookedMsg:"Your Online Consultation has been successfully booked.",
  chatBookedMsg:"Your Chat Consultation has been successfully booked.",
  chatActivateNote:"Once your payment is verified, we'll send you a private consultation link with the expert via WhatsApp.",
  askOneNotice:"This payment is valid for one question only. A new payment of NPR 100 is required for each additional question.",
  askAnotherBtn:"Ask Another Question — NPR 100",
  askDashboardEyebrow:"Question Consultation", askEditProfile:"Edit Birth Details", askBirthDetails:"Birth details", askTotalQuestions:"Total questions", askAnswered:"Answered", askPending:"Pending", askHistoryTitle:"My Questions", askNoQuestions:"No questions submitted yet.", askFeeNote:"Fee per question: NPR 100", askInstruction:"Write one clear question.", askPlaceholder:"Write your question here...", askPreviewTitle:"Question Preview", askYourQuestion:"Your question", consultationFee:"Consultation fee", askPaymentPreviewBtn:"Continue to payment", askFollowupRule:"A new payment is required for every new or materially different question.", questionRequired:"Please write one question.", oneQuestionWarning:"Only one question is included per payment. Please write one main question.", questionRequestLabel:"Request reference", questionConsultationsTitle:"Question Consultations",
  answerPendingNote:"Once the expert answers, it will appear here and you'll be notified.",
  questionIdLabel:"Question ID",
  navShop:"Shop",
  shopEyebrow:"Online Shop", shopTitle:"Jyotish, Vastu & Puja Products", shopSub:"Verified traditional items — place an order and our team will contact you to confirm price and payment.",
  shopList:[
    {id:'rudraksha', t:"Rudraksha Mala", d:"Pure, verified Rudraksha prayer beads.", icon:'gem'},
    {id:'navratna', t:"Gemstone Ring (Navratna)", d:"Gemstones recommended based on your Kundali.", icon:'star'},
    {id:'sriyantra', t:"Sri Yantra", d:"Sri Yantra for home or business.", icon:'compass'},
    {id:'vastupyramid', t:"Vastu Pyramid Set", d:"Pyramid set for correcting Vastu doshas.", icon:'home2'},
    {id:'navagraha', t:"Navagraha Yantra", d:"Yantra for pacifying the nine planets.", icon:'compass'},
    {id:'pujakit', t:"Puja Samagri Kit", d:"A complete kit of puja essentials.", icon:'temple'},
    {id:'sphatik', t:"Sphatik (Crystal) Mala", d:"Crystal mala for japa and meditation.", icon:'gem'},
    {id:'camphorset', t:"Camphor, Incense & Dhoop Set", d:"Essentials set for daily puja.", icon:'fire'}
  ],
  orderNowBtn:"Order Now", orderPanelTitle:"Order Details",
  orderProductLabel:"Selected Item", orderQtyLabel:"Quantity", orderAddressLabel:"Delivery Address", orderNotesLabel:"Additional Notes",
  orderSubmitBtn:"Submit Order",
  orderNote:"⚠️ This is an order request only — price and payment are confirmed by our team over phone/WhatsApp before the order is finalized.",
  orderSuccessTitle:"Order Request Received!", orderSuccessNote:"Our team will contact you shortly to confirm price and delivery.",
  orderIdLabel:"Order ID", selectProductFirst:"Please choose an item above first.",
  navKarmakanda:"Karmakanda", navDirectory:"Experts", navLogin:"Login", navAccount:"My Account",
  kkEyebrow:"Religious Services", kkTitle:"Karmakanda & Religious Ritual Services", kkSub:"Traditional ceremonies and rites performed according to classical procedure.",
  kkChoosePurohitLabel:"Choose a Purohit",
  kkPurohitNote:"Acharya Krishna Prasad Pokharel is currently available. More verified Purohits will be added progressively.",
  kkList:[
    ["Marriage Ceremony","Complete wedding rites and puja."],
    ["Bratabandha","Sacred thread (Upanayana) ceremony."],
    ["Annaprashan","Baby's first rice-feeding ceremony."],
    ["Naming Ceremony","Traditional naming (Namakaran) rite for a newborn."],
    ["Griha Pravesh","Housewarming puja for a new home."],
    ["Rudri Path","Rudri recitation and ritual."],
    ["Navagraha Puja","Puja for pacifying the nine planets."],
    ["Satyanarayan Puja","Puja to Lord Satyanarayan."],
    ["Shraddha","Ancestral rites (Shraddha) ceremony."],
    ["Antyeshti Rites","Funeral rite related services."],
    ["Shanti Karma","Various peace/pacification rituals."],
    ["Graha Shanti","Puja to pacify planetary doshas."],
    ["Vastu Shanti","Puja to pacify Vastu doshas."],
    ["Other Religious Rites","Other traditional puja and ceremonies."]
  ],
  dirEyebrow:"Expert Directory", dirTitle:"Astrologers & Purohits", dirSub:"Consult directly with verified experts.",
  dirAstroSectionTitle:"Astrologers", dirPurohitSectionTitle:"Purohits",
  dirPurohitEmpty:"A list of verified Purohits will be added here soon. We don't list unverified profiles — contact us and we'll help connect you with a suitable Purohit.",
  dirBookBtn:"Book Consultation", dirChatBtn:"Start Chat", dirAskBtn:"Ask a Question",
  ctPickerTitle:"Choose Your Consultation Type",
  ctOnline:"Online Consultation / Direct Consultation", ctOnlineD:"Full-length consultation via Google Meet / Zoom / phone, or in person at our office.",
  ctChat:"Chat Consultation", ctChatD:"Written consultation over chat within a set validity period.",
  ctAsk:"Ask a Question", ctAskD:"A short, affordable answer to your specific question.",
  ctContinue:"Continue",
  askExpert:"Choose Expert", askQuestionLabel:"Write Your Question", askSubmitBtn:"Submit Question & Payment",
  askPerQuestion:"Per Question",
  askNote:"After payment, the expert will answer your question. The answer will be available in your account.",
  askSuccessTitle:"Question Received!", askSuccessNote:"The expert will answer soon. You'll be notified via email/WhatsApp.",
  chatInfoTitle:"How Chat Consultation Works", chatInfoBody:"After payment, a private chat opens with the expert for the validity period, where you can send text, photos and documents. (This live chat system is currently under construction — for now, please reach us via WhatsApp instead.)",
  chatStartBtn:"Start Chat via WhatsApp",
  authLoginTab:"Login", authRegisterTab:"Register", authFullName:"Full Name", authPhoneLabel:"Mobile Number", authEmailLabel:"Email",
  authPasswordLabel:"Password", authConfirmLabel:"Confirm Password", authPrefLangLabel:"Preferred Language",
  authLoginSubmit:"Login", authRegisterSubmit:"Create Account",
  authDemoBanner:"🔒 Secure Supabase account system — register with your email, confirm it, then sign in.",
  authForgotLink:"Forgot password?", authSwitchToRegister:"No account? Register", authSwitchToLogin:"Already have an account? Login",
  myAccTitle:"My Account", myAccSub:"Your bookings, Kundali, reports and payments in one place.",
  bookingsTitle:"Booked Services", bookingsSub:"All submitted service records grouped by person.", bookingsPeopleLabel:"people", bookingsRecordsLabel:"records", bookingsEmpty:"No stored records found yet.", bookingsRefresh:"Refresh", bookingsExportAll:"Download all", bookingsDownloadPerson:"Download person data",
  myAccSections:["My Profile","My Bookings","Upcoming Consultations","Past Consultations","Chat","My Questions","My Reports","Payments","Notifications"],
  myAccDemoNote:"⚠️ This 'My Account' page is currently a mockup only — a real login system is needed to show actual data.",
  vcEyebrow:"Vastu Annotation", vcTitle:"Mark Up the Plan Directly",
  vcHint:"Click anywhere on the plan above to add a pin, then write the room/direction and a note.",
  vcRoomLabel:"Room/Direction", vcNoteLabel:"Note", vcSaveNote:"Save Pin", vcDownload:"Download Annotated Plan",
  vcClear:"Remove All Pins", vcPinsHeading:"Added Notes", vcNoPins:"No pins added yet.",
  vcUploadFirst:"Upload a plan above first.", vcDelete:"Remove"
},
hi: {
  brand:"ज्योतिष एवं वास्तु सेवा केंद्र", brandTag:"वैदिक ज्योतिष एवं वास्तु शास्त्र",
  nav:{home:"होम",astrology:"ज्योतिष",rashifal:"राशिफल",vastu:"वास्तु",karmakanda:"कर्मकांड",directory:"विशेषज्ञ",classes:"ऑनलाइन कक्षाएँ",shop:"दुकान",kundali:"कुंडली",booking:"परामर्श बुक करें",bookings:"बुकिंग रिकॉर्ड",contact:"संपर्क",login:"लॉगिन",account:"मेरा खाता"},
  headerCta:"परामर्श हेतु बुकिंग करें",
  heroEyebrow:"शास्त्रीय वैदिक ज्योतिष • वास्तु शास्त्र • नेपाल",
  heroTitle:"ज्योतिष एवं वास्तु सेवा का विश्वसनीय केंद्र",
  heroLead:"शास्त्रीय ज्योतिष, वास्तु शास्त्र एवं वैदिक परंपरा पर आधारित व्यक्तिगत परामर्श — ऑनलाइन एवं प्रत्यक्ष दोनों रूप में उपलब्ध।",
  heroCta1:"परामर्श बुक करें", heroCta2:"हमारी सेवाएं देखें",
  qlCall:"अभी कॉल करें", qlWa:"व्हाट्सएप", qlViber:"वाइबर", qlBook:"अपॉइंटमेंट",
  heroCardTitle:"परामर्श कैसे आगे बढ़ता है",
  heroCardList:["सेवा और तिथि चुनें","अपना जन्म विवरण दें","ऑनलाइन या प्रत्यक्ष परामर्श लें","सुरक्षित रिपोर्ट प्राप्त करें"],
  panchangTithi:"तिथि: ६ भाद्र २०८३ • तिथि: दशमी (शुक्ल पक्ष)*",
  panchangNote:"*स्नैपशॉट डेटा — लाइव पंचांग इंजन जुड़ने पर प्रतिदिन स्वतः अपडेट होगा",
  statLabels:["वर्षों का अनुभव","पूर्ण परामर्श","उपलब्ध सेवाएं","ऑनलाइन एवं प्रत्यक्ष"],
  statNote:"(एडमिन द्वारा अपडेट किया जाएगा)",
  svcEyebrow:"हमारी सेवाएं", svcTitle:"ज्योतिष एवं वास्तु सेवाएं", svcSub:"पारंपरिक ज्ञान और आधुनिक परामर्श विधि के संयोजन में उपलब्ध संपूर्ण सेवाएं।",
  overview:[
    {icon:'chart',t:"जन्म कुंडली एवं फलादेश",d:"पूर्ण जन्म कुंडली विश्लेषण एवं व्यक्तिगत मार्गदर्शन।",cta:"देखें",view:"astrology"},
    {icon:'heart',t:"विवाह कुंडली मिलान",d:"गुण मिलान, दोष विश्लेषण एवं वैवाहिक परामर्श।",cta:"देखें",view:"astrology"},
    {icon:'briefcase',t:"करियर एवं व्यवसाय ज्योतिष",d:"शिक्षा, करियर, व्यवसाय एवं वित्तीय दिशा संबंधी मार्गदर्शन।",cta:"देखें",view:"astrology"},
    {icon:'home2',t:"वास्तु परामर्श",d:"आवासीय, व्यावसायिक एवं भूमि चयन संबंधी वास्तु सेवा।",cta:"देखें",view:"vastu"},
    {icon:'compass',t:"मुहूर्त निर्धारण",d:"विवाह, गृहप्रवेश, भूमिपूजन सहित शुभ मुहूर्त निर्धारण।",cta:"और जानें",view:"booking"},
    {icon:'temple',t:"पूजा एवं धार्मिक अनुष्ठान",d:"ग्रहशांति, नवग्रह पूजा एवं पारंपरिक संस्कार सेवा।",cta:"और जानें",view:"booking"}
  ],
  whyEyebrow:"हमें क्यों चुनें", whyTitle:"हमें चुनने के कारण",
  why:[
    {icon:'book',t:"शास्त्रीय आधार",d:"वैदिक ज्योतिष एवं शास्त्रीय ग्रंथों पर आधारित विश्लेषण।"},
    {icon:'heart',t:"व्यक्तिगत परामर्श",d:"प्रत्येक ग्राहक की स्थिति अनुसार विशेष मार्गदर्शन।"},
    {icon:'compass',t:"ऑनलाइन एवं प्रत्यक्ष सेवा",d:"अपनी सुविधा अनुसार ऑनलाइन या कार्यालय में परामर्श।"},
    {icon:'shield',t:"गोपनीयता",d:"आपका व्यक्तिगत विवरण पूर्णतः सुरक्षित रखा जाता है।"},
    {icon:'briefcase',t:"व्यावहारिक मार्गदर्शन",d:"वास्तविक जीवन में लागू होने वाले ठोस सुझाव।"},
    {icon:'building',t:"परंपरा + आधुनिक तकनीक",d:"पारंपरिक ज्ञान को आधुनिक बुकिंग प्रणाली से जोड़ा गया।"}
  ],
  aboutEyebrow:"हमारे बारे में", aboutTitle:"ज्योतिषी का परिचय", aboutSub:"अधिक विवरण एडमिन द्वारा शीघ्र अपडेट किया जाएगा।",
  profName:"आचार्य कृष्ण प्रसाद पोखरेल",
  profFields:[["शिक्षा","ज्योतिष में स्नातकोत्तर (Master's in Jyotish)"],["अनुभव","१५ वर्ष"],["विशेषज्ञता","ज्योतिष के सभी क्षेत्रों में दक्ष (जन्म कुंडली, विवाह मिलान, वास्तु, मुहूर्त, पूजा)"],["भाषा","नेपाली • हिन्दी • English"]],
  profBio:"आचार्य कृष्ण प्रसाद पोखरेल — ज्योतिष में स्नातकोत्तर उपाधिधारी एवं 15 वर्ष के अनुभव वाले ज्योतिषी। जन्म कुंडली, विवाह मिलान, वास्तु शास्त्र, मुहूर्त निर्धारण एवं पूजा संबंधी सभी क्षेत्रों में दक्ष। बालम्बु, चंद्रागिरी, नेपाल में स्थित।",
  profReadMore:"पूरी प्रोफाइल देखें",
  howEyebrow:"प्रक्रिया", howTitle:"परामर्श कैसे काम करता है",
  how:[["सेवा चुनें","अपनी आवश्यकता अनुसार सेवा चुनें।"],["तिथि एवं समय चुनें","उपलब्ध समय में से एक चुनें।"],["आवश्यक विवरण भेजें","जन्म विवरण एवं प्रश्न भरें।"],["ज्योतिषी से परामर्श लें","ऑनलाइन या प्रत्यक्ष परामर्श प्राप्त करें।"]],
  howCta:"अभी बुक करें",
  artEyebrow:"ज्ञान केंद्र", artTitle:"नवीनतम लेख", artSub:"ज्योतिष, वास्तु एवं वैदिक परंपरा संबंधी शैक्षिक सामग्री।",
  articles:[
    ["नक्षत्र क्या है?","२७ नक्षत्रों का आधारभूत परिचय।"],
    ["वास्तु के आधारभूत सिद्धांत","घर निर्माण में दिशा एवं तत्वों का महत्व।"],
    ["दशा-अंतर्दशा समझने का तरीका","ग्रहदशा जीवन पर कैसे प्रभाव डालती है।"]
  ],
  artCta:"पढ़ें",
  vidEyebrow:"वीडियो", vidTitle:"YouTube चैनल", vidSub:"राशिफल, वास्तु एवं शैक्षिक वीडियो।",
  vidCta:"YouTube पर सब्सक्राइब करें", vidNote:"नए वीडियो यहां YouTube चैनल से स्वचालित रूप से दिखेंगे।",
  testiEyebrow:"प्रतिक्रिया", testiTitle:"ग्राहक अनुभव",
  testiEmpty:"सत्यापित ग्राहक समीक्षाएं शीघ्र यहां जोड़ी जाएंगी। हम असत्यापित समीक्षा प्रकाशित नहीं करते।",
  testiGoogle:"Google Reviews देखें",
  faqEyebrow:"जिज्ञासा", faqTitle:"अक्सर पूछे जाने वाले प्रश्न",
  faqCats:["ज्योतिष","कुंडली","वास्तु","बुकिंग"],
  faq:{
    "ज्योतिष":[["ज्योतिष परामर्श में कितना समय लगता है?","सामान्यतः सेवा अनुसार ३०-६० मिनट लगते हैं, यह सेवा प्रकार पर निर्भर करता है।"],["क्या ऑनलाइन परामर्श उपलब्ध है?","हां, व्हाट्सएप, फोन एवं वीडियो कॉल के माध्यम से ऑनलाइन परामर्श उपलब्ध है।"]],
    "कुंडली":[["कुंडली के लिए क्या जानकारी चाहिए?","पूरा नाम, जन्म तिथि, सटीक जन्म समय एवं जन्मस्थान आवश्यक है।"],["यदि जन्म समय सटीक न पता हो तो क्या करें?","अनुमानित समय दें, परंतु यथासंभव सही समय उपलब्ध कराएं।"]],
    "वास्तु":[["वास्तु परामर्श कैसे होता है?","आपके द्वारा भेजे गए नक्शे/फोटो के आधार पर दिशा एवं संरचना का विश्लेषण किया जाता है।"],["क्या मैं घर का नक्शा अपलोड कर सकता हूं?","हां, PDF, JPG या PNG प्रारूप में नक्शा अपलोड किया जा सकता है।"]],
    "बुकिंग":[["अपॉइंटमेंट कैसे बुक करें?","'परामर्श बुक करें' बटन से सेवा, तिथि एवं समय चुनकर बुक किया जा सकता है।"],["क्या मैं समय बदल सकता हूं?","हां, बुकिंग के बाद हमसे संपर्क करके पुनः समय निर्धारित किया जा सकता है।"]]
  },
  contactEyebrow:"संपर्क", contactTitle:"हमसे संपर्क करें",
  contactAddr:"पता", contactAddrV:"बालम्बु, चंद्रागिरी, नेपाल",
  contactPhone:"फोन", contactPhoneV:"+977-985-1001890",
  contactWa:"व्हाट्सएप / वाइबर", contactWaV:"+977-985-1001890",
  contactEmail:"ईमेल", contactEmailV:"info@jyotishvastusewakendra.com.np",
  contactHours:"कार्य समय", contactHoursV:"रविवार - शुक्रवार, सुबह ९ - शाम ६",
  contactFullBtn:"पूर्ण संपर्क पृष्ठ देखें",
  astroBread:"होम / ज्योतिष", astroH1:"ज्योतिष सेवाएं", astroP:"वैदिक ज्योतिष पर आधारित संपूर्ण परामर्श सेवाएं — जन्म कुंडली से मुहूर्त तक।",
  vastuBread:"होम / वास्तु", vastuH1:"वास्तु विश्लेषण एवं समाधान", vastuP:"अपने घर, भूमि, कार्यालय या व्यवसायिक स्थान के नक्शे और विवरण के आधार पर वास्तु विश्लेषण एवं सुधार मार्गदर्शन प्राप्त करें।", vastuMapCta:"नक्शा जांचें", vastuAnalysisCta:"वास्तु विश्लेषण शुरू करें", vastuPlatformEyebrow:"वास्तु विश्लेषण एवं समाधान", vastuPlatformTitle:"वास्तु विश्लेषण एवं समाधान", vastuPlatformSub:"नक्शे, फोटो और संपत्ति विवरण के आधार पर प्रारंभिक संकेत तथा विशेषज्ञ-नियंत्रित विस्तृत विश्लेषण प्राप्त करें।", vastuUploadNotice:"कृपया स्पष्ट नक्शा, फ्लोर प्लान या संपत्ति का फोटो अपलोड करें।", vastuServiceTypeLabel:"वास्तु सेवा", vastuTopicLabel:"विशेष विषय", vastuEntranceLabel:"मुख्य प्रवेश दिशा", vastuStatusLabel:"निर्माण स्थिति", vastuPurposeLabel:"संपत्ति का उद्देश्य", vastuRoomsLabel:"कमरों की संख्या",
  uploadEyebrow:"नक्शा अपलोड", uploadTitle:"अपने घर/भूमि का नक्शा अपलोड करें",
  uploadLabel:"फ़ाइल चुनने के लिए यहां क्लिक करें", uploadHint:"PDF, JPG, PNG (अधिकतम १० MB)",
  lblDirection:"मुख्य द्वार की दिशा", lblBuildingType:"भवन का प्रकार", lblLocationV:"स्थान", lblFloors:"मंजिलों की संख्या", lblProblem:"समस्या/प्रश्न विवरण",
  directions:["उत्तर","दक्षिण","पूर्व","पश्चिम","उत्तर-पूर्व","उत्तर-पश्चिम","दक्षिण-पूर्व","दक्षिण-पश्चिम"],
  buildingTypes:["घर","अपार्टमेंट","कार्यालय","दुकान/व्यवसाय","फैक्ट्री","भूमि/प्लॉट"],
  vastuSubmitBtn:"वास्तु अनुरोध भेजें",
  bookBread:"होम / परामर्श बुक करें", bookH1:"परामर्श बुक करें", bookP:"नीचे दिए चरण पूरे करके अपना अपॉइंटमेंट सुरक्षित करें।",
  steps:["सेवा","मोड","तिथि/समय","विवरण","भुगतान","पुष्टि"],
  chooseService:"सेवा चुनें", chooseMode:"परामर्श मोड चुनें",
  modes:[["ऑनलाइन","गूगल मीट / ज़ूम / फोन / व्हाट्सएप"],["प्रत्यक्ष","कार्यालय में प्रत्यक्ष मुलाकात"]],
  chooseDate:"तिथि चुनें", chooseSlot:"उपलब्ध समय चुनें",
  yourDetails:"आपका विवरण",
  labels:{name:"पूरा नाम",phone:"फोन नंबर",email:"ईमेल",dob:"जन्म तिथि",tob:"जन्म समय",pob:"जन्म स्थान",gender:"लिंग",country:"देश",message:"आपका प्रश्न/संदेश",topics:"आप किस विषय पर चर्चा करना चाहते हैं?",subject:"विषय",purpose:"परामर्श का उद्देश्य",accuracy:"जन्म समय की सटीकता"},
  genders:["महिला","पुरुष","अन्य"],
  topics:["करियर","विवाह","संबंध","व्यवसाय","वित्त","शिक्षा","विदेश यात्रा","संपत्ति","परिवार","स्वास्थ्य संबंधी चिंता","संतान","कानूनी विषय","आध्यात्मिक विषय","वास्तु","मुहूर्त","सामान्य जीवन मार्गदर्शन","अन्य"],
  paymentTitle:"भुगतान विकल्प", payLater:"बाद में भुगतान करें", payConfirm:"भुगतान पुष्टि हो गया",
  paymentNote:"eSewa एवं Khalti (नंबर: 9851001890) द्वारा भुगतान स्वीकार किया जाता है। ऑनलाइन गेटवे एकीकरण शीघ्र जोड़ा जाएगा।",
  reviewTitle:"अपनी बुकिंग की समीक्षा करें",
  back:"पीछे", next:"अगला", confirmBooking:"बुकिंग पुष्टि करें",
  confirmedTitle:"आपका अपॉइंटमेंट पुष्टि हो गया है!", confirmedNote:"पुष्टिकरण ईमेल एवं व्हाट्सएप संदेश शीघ्र भेजा जाएगा।",
  bookingIdLabel:"बुकिंग आईडी", newBooking:"नई बुकिंग करें",
  kundBread:"होम / कुंडली", kundH1:"कुंडली अनुरोध", kundP:"अपना जन्म विवरण भेजें, हमारे ज्योतिषी आपकी कुंडली तैयार करेंगे।",
  kundDisclaimer:"⚠️ आपके जन्म विवरण के आधार पर प्रारंभिक कुंडली गणना की जाती है। सटीक फलादेश के लिए प्रमाणित पंचांग/ephemeris और ज्योतिषी सत्यापन आवश्यक है।",
  kundSubmit:"कुंडली अनुरोध भेजें", kundSuccessTitle:"अनुरोध प्राप्त हुआ!", kundSuccessNote:"हमारी टीम संपर्क करके आवश्यक विवरण की पुष्टि करेगी।",
  cBread:"होम / संपर्क", cH1:"संपर्क करें", cP:"किसी भी प्रश्न के लिए नीचे दिया फॉर्म भरें या सीधे संपर्क करें।",
  contactSubmit:"संदेश भेजें", contactSuccess:"धन्यवाद! आपका संदेश प्राप्त हो गया है, हम शीघ्र संपर्क करेंगे।",
  fServicesH:"सेवाएं", fQuickH:"त्वरित लिंक", fContactH:"संपर्क",
  fLinkAstro:"ज्योतिष सेवा", fLinkVastu:"वास्तु सेवा", fLinkKundali:"कुंडली अनुरोध", fLinkBook:"परामर्श बुक करें",
  fLinkHome:"होम", fLinkAbout:"हमारे बारे में", fLinkContact2:"संपर्क", fLinkPrivacy:"गोपनीयता नीति", fLinkTerms:"नियम एवं शर्तें",
  footerAbout:"शास्त्रीय वैदिक ज्योतिष एवं वास्तु शास्त्र पर आधारित व्यावसायिक परामर्श सेवा — ऑनलाइन एवं प्रत्यक्ष दोनों रूप में उपलब्ध।",
  fCopyright:"© 2026 ज्योतिष एवं वास्तु सेवा केंद्र। सर्वाधिकार सुरक्षित।",
  fDisclaimerShort:"ज्योतिष परामर्श पारंपरिक मार्गदर्शन के लिए है, यह चिकित्सा या कानूनी सलाह का विकल्प नहीं है।",
  bottomHome:"होम", bottomServices:"सेवा", bottomBook:"बुक करें", bottomWa:"व्हाट्सएप", bottomCall:"कॉल",
  toastKundali:"कुंडली अनुरोध सुरक्षित हुआ!", toastVastu:"वास्तु अनुरोध सुरक्षित हुआ!", toastContact:"संदेश भेजा गया!",
  healthNote:"⚠️ स्वास्थ्य संबंधी ज्योतिषीय मार्गदर्शन चिकित्सा निदान नहीं है और यह पेशेवर चिकित्सा सलाह का विकल्प नहीं ले सकता।",
  pricePlaceholder:"मूल्य हेतु संपर्क करें",
  langSelectorLabel:"भाषा चयन",
  fabCallLabel:"सीधा कॉल करें", fabChatLabel:"चैट करें", fabBookLabel:"बुकिंग करें",
  chatWidgetSubtitle:"हम आमतौर पर कुछ मिनटों में उत्तर देते हैं",
  chatWelcomeMsg:"नमस्ते! \ud83d\ude4f मैं आपकी कैसे सहायता कर सकता हूं? अपना प्रश्न नीचे लिखें।",
  chatInputPlaceholder:"अपना संदेश लिखें...",
  chatConnectingMsg:"धन्यवाद! आपका संदेश लेकर अभी WhatsApp से जोड़ रहे हैं, जहां हमारी टीम तुरंत उत्तर देगी।",
  chatBotBadge:"स्वचालित सहायक — वास्तविक व्यक्ति से बात करने हेतु नीचे क्लिक करें",
  chatTalkHumanBtn:"व्यक्ति से बात करें",
  classesEyebrow:"शिक्षण केंद्र", classesTitle:"ऑनलाइन कक्षाएं", classesSub:"ज्योतिष, वास्तु एवं संबंधित विषयों में ऑनलाइन प्रशिक्षण — घर से सीखें।",
  classesList:[
    ["ज्योतिष कक्षा","शुरुआती से उन्नत स्तर तक ज्योतिष प्रशिक्षण।",'chart'],
    ["वास्तु कक्षा","वास्तु शास्त्र के सिद्धांत एवं व्यावहारिक प्रयोग सिखाई जाने वाली कक्षा।",'home2'],
    ["अंकशास्त्र कक्षा","अंकशास्त्र का बुनियादी ज्ञान एवं प्रयोग।",'chart'],
    ["पंचांग/मुहूर्त कक्षा","पंचांग पठन एवं मुहूर्त निर्धारण सिखाई जाने वाली कक्षा।",'clock'],
    ["कर्मकांड कक्षा","पूजा एवं कर्मकांड विधि संबंधी प्रशिक्षण।",'temple'],
    ["संस्कृत/पारंपरिक ज्ञान कक्षा","संस्कृत भाषा एवं पारंपरिक शास्त्रीय ज्ञान।",'book']
  ],
  lblInstructor:"शिक्षक", lblDuration:"अवधि", lblLevel:"स्तर", durationTBD:"एडमिन द्वारा अपडेट किया जाएगा",
  levelAllLabel:"शुरुआती से उन्नत तक",
  enrollBtn:"नामांकन करें", enrollFormTitle:"नामांकन फॉर्म", enrollCourseLabel:"चयनित कक्षा",
  enrollSubmitBtn:"नामांकन अनुरोध भेजें",
  enrollSuccessTitle:"नामांकन अनुरोध प्राप्त हुआ!", enrollSuccessNote:"हमारी टीम कक्षा प्रारंभ तिथि, समय एवं शुल्क की पुष्टि हेतु संपर्क करेगी।",
  moreInfoLabel:"अधिक जानकारी",
  vastuDisclaimerNumerology:"यह पारंपरिक अंकशास्त्र एवं वास्तु पर आधारित मार्गदर्शन है — गारंटीकृत भविष्यवाणी नहीं।",
  vastuDisclaimerDosha:"यह पारंपरिक ज्योतिष/वास्तु व्याख्या है — धार्मिक एवं पारंपरिक मान्यता पर आधारित परामर्श है, वैज्ञानिक रूप से प्रमाणित तथ्य नहीं।",
  vastuDisclaimerRemedies:"यह पारंपरिक उपाय संबंधी मार्गदर्शन है। स्वास्थ्य/आयुर्वेद संबंधी विषयों में योग्य चिकित्सक से सलाह लेना आवश्यक है — यह चिकित्सकीय उपचार का विकल्प नहीं है।",
  vastuDisclaimerGeneral:"अंतिम व्याख्या एवं सिफारिश योग्य परामर्शदाता द्वारा की जाएगी।",
  vastuCatBusiness:"व्यवसाय वास्तु", vastuCatPersonal:"व्यक्तिगत ऊर्जा", vastuCatHouse:"घर एवं कमरा वास्तु",
  vastuCatNumerology:"अंकशास्त्र + वास्तु", vastuCatDirection:"दिशा एवं स्थान विश्लेषण", vastuCatColor:"रंग वास्तु",
  vastuCatPlacement:"वस्तु स्थान निर्धारण", vastuCatDosha:"वास्तु एवं पारंपरिक दोष", vastuCatRemedies:"पारंपरिक एवं आधुनिक उपाय",
  vastuCatGeneral:"अन्य वास्तु सेवाएं",
  homeVastuHighlightEyebrow:"वास्तु शास्त्र", homeVastuHighlightTitle:"प्रमुख वास्तु सेवाएं",
  viewAllVastuBtn:"सभी वास्तु सेवाएं देखें",
  topicsEyebrow:"हम जिन विषयों में सहायता करते हैं", topicsTitle:"हम किन-किन विषयों में सहायता करते हैं", topicsSub:"जीवन के विभिन्न पहलुओं में आने वाली समस्याओं का ज्योतिषीय एवं वास्तुशास्त्रीय समाधान।",
  topicsList:[
    ["जन्म कुंडली पठन, उपाय एवं कुंडली निर्माण",'chart'],
    ["मानसिक तनाव संबंधी ज्योतिषीय परामर्श",'heart'],
    ["कटि एवं यंत्र संबंधी परामर्श",'compass'],
    ["स्टोन/रत्न संबंधी परामर्श",'gem'],
    ["संतान प्राप्ति में आ रही ज्योतिषीय बाधा संबंधी परामर्श",'heart'],
    ["शिक्षा एवं रोजगार संबंधी समाधान",'book'],
    ["व्यवसाय में आ रही बाधा संबंधी परामर्श एवं उपाय",'briefcase'],
    ["पार्टनरशिप एवं साझेदारी संबंधी मेलमिलाप के उपाय",'briefcase'],
    ["व्यक्तिगत एवं पारिवारिक समस्या संबंधी परामर्श एवं उपाय",'heart'],
    ["पारंपरिक टोटके एवं उपाय संबंधी परामर्श",'shield'],
    ["घर-जमीन एवं संपत्ति संबंधी वास्तु परामर्श",'home2'],
    ["घर-जमीन में वास्तु समस्या एवं उपाय संबंधी संपूर्ण कार्य",'building'],
    ["खोई हुई वस्तु संबंधी प्रश्न ज्योतिष परामर्श",'star'],
    ["व्यवसाय कब शुरू करें एवं कौन सा व्यवसाय उपयुक्त होगा?",'compass'],
    ["विदेश यात्रा एवं विदेश संबंधी ज्योतिषीय परामर्श",'compass'],
    ["वैवाहिक जीवन एवं दांपत्य संबंधी परामर्श",'heart'],
    ["स्वास्थ्य एवं रोग संबंधी ज्योतिषीय परामर्श",'shield'],
    ["वास्तु शास्त्र परामर्श",'home2'],
    ["पूजा-आज्ञा एवं कर्मकांड संबंधी सहायता/परामर्श",'temple'],
    ["कुंडली के आधार पर घर एवं वास्तु विश्लेषण",'chart'],
    ["ऑनलाइन ज्योतिष एवं वास्तु कक्षाएं",'book']
  ],
  originalGuaranteeNote:"✅ यहां से खरीदी गई सभी वस्तुएं 100% ओरिजिनल होंगी — इसकी पूरी गारंटी हमारी कंपनी लेती है।",
  specialOfferBanner:"🎉 विशेष ऑफर! सीमित समय के लिए सभी वस्तुओं पर विशेष छूट उपलब्ध है। मूल्य एवं छूट जानने हेतु संपर्क करें।",
  mukhiLabel:"मुखी चुनें", caratLabel:"कैरेट चुनें",
  shopList2:[
    {id:'vastukalash', t:"वास्तु कलश", d:"घर एवं कार्यालय हेतु शुभ वास्तु कलश।", icon:'home2'},
    {id:'shaligram', t:"शालिग्राम", d:"पूजनीय शालिग्राम शिला।", icon:'temple'},
    {id:'shivling', t:"शिवलिंग", d:"पूजा हेतु शिवलिंग।", icon:'temple'},
    {id:'suryayantra', t:"सूर्य यंत्र", d:"सूर्य ग्रह शांति हेतु यंत्र।", icon:'compass'},
    {id:'lakshmiyantra', t:"लक्ष्मी यंत्र", d:"धन-समृद्धि हेतु लक्ष्मी यंत्र।", icon:'compass'},
    {id:'vyaparkadi', t:"व्यापार कड़ी", d:"व्यापार वृद्धि हेतु पारंपरिक कड़ी।", icon:'briefcase'},
    {id:'kuberyantra', t:"कुबेर यंत्र", d:"धन वृद्धि हेतु कुबेर यंत्र।", icon:'compass'},
    {id:'rashiitem', t:"राशि आइटम", d:"अपनी राशि अनुसार विशेष सामग्री।", icon:'star'},
    {id:'murti', t:"मूर्तियां", d:"देवी-देवताओं की पूजनीय मूर्तियां।", icon:'temple'},
    {id:'shrikhand', t:"श्रीखंड", d:"शुद्ध श्रीखंड (चंदन)।", icon:'gem'},
    {id:'kaudi', t:"कौड़ी", d:"लक्ष्मी पूजा हेतु कौड़ी।", icon:'gem'},
    {id:'vagbeli', t:"वागवेली बूटी", d:"पारंपरिक वागवेली बूटी।", icon:'book'},
    {id:'mantraash', t:"मंत्रित भस्म", d:"विधिपूर्वक मंत्रित पवित्र भस्म।", icon:'fire'},
    {id:'energyyantra', t:"ऊर्जा बूस्टिंग यंत्र", d:"सकारात्मक ऊर्जा वृद्धि हेतु यंत्र।", icon:'compass'},
    {id:'updevatayantra', t:"उपदेवता यंत्र", d:"उपदेवता संबंधी विशेष यंत्र।", icon:'compass'},
    {id:'crystalquartz', t:"क्रिस्टल क्वार्ट्ज़", d:"शुद्ध क्रिस्टल क्वार्ट्ज़।", icon:'gem'},
    {id:'stone', t:"स्टोन (उपचार पत्थर)", d:"पारंपरिक उपचार पत्थर।", icon:'gem'}
  ],
  bookPortalTitle:"परामर्श हेतु बुकिंग करें",
  chooseKindHeading:"परामर्श का प्रकार चुनें",
  kindOnline:"ऑनलाइन परामर्श", kindDirect:"प्रत्यक्ष परामर्श",
  kindOnlineD:"गूगल मीट/ज़ूम/फोन द्वारा ऑनलाइन परामर्श।", kindDirectD:"कार्यालय में प्रत्यक्ष उपस्थित होकर परामर्श।",
  chooseOnlineOptionHeading:"ऑनलाइन परामर्श विधि चुनें",
  optLiveCall:"लाइव कॉल", optLiveCallD:"फोन/वीडियो द्वारा सीधी बातचीत।",
  optLiveChart:"लाइव ऑनलाइन चार्ट", optLiveChartD:"अपनी कुंडली/चार्ट देखते हुए ज्योतिषी से चर्चा।",
  optLiveQA:"लाइव प्रश्न–उत्तर", optLiveQAD:"लाइव चैट द्वारा सीधा प्रश्नोत्तर।",
  chooseAstrologerHeading:"ज्योतिषी चुनें",
  astrologerMoreNote:"अधिक ज्योतिषी एडमिन द्वारा क्रमशः जोड़े जाएंगे।",
  directMeetingHeading:"प्रत्यक्ष भेंट",
  directMeetingNote:"तिथि, समय एवं स्थान भुगतान एवं विवरण के बाद पुष्टि किए जाएंगे। कार्यालय का पता संपर्क पृष्ठ पर देखें।",
  termsHeading:"नियम एवं शर्तें", termsInfoHeading:"सूचना एवं जानकारी",
  termsPoints:["कॉल सेवा समय आधारित होती है।","यदि कॉल बीच में कट जाए तो शेष समय के आधार पर पुनः जुड़ने या सेवा जारी रखने हेतु Call History देखें।","यदि ज्योतिषी द्वारा कॉल को \"पूर्ण\" चिह्नित किया जा चुका है तो खरीदा गया टिकट/सेवा शुल्क वापस नहीं होगा।"],
  termsFooterNote:"कॉल सेवा समय आधारित है। निर्धारित समय के भीतर उपलब्ध सेवा का उपयोग करना ग्राहक की जिम्मेदारी होगी।",
  termsCheckboxLabel:"मैंने नियम एवं शर्तें पढ़ ली हैं और स्वीकार करता/करती हूं।",
  termsRequired:"आगे बढ़ने से पहले कृपया नियम एवं शर्तें स्वीकार करें।",
  tokenLabel:"टोकन नंबर",
  tokenIssuedNote:"कृपया परामर्श के समय यह टोकन नंबर दिखाएं।",
  liveLinkLabel:"लाइव पंचांग देखें",
  panchangaPageTitle:"लाइव पंचांग", panchangaPageSub:"काठमांडू, नेपाल के लिए आज का पंचांग विवरण।",
  lblAdDate:"ई. तिथि", lblBsDate:"विक्रम संवत", lblWeekday:"वार",
  lblSunrise:"सूर्योदय", lblSunset:"सूर्यास्त",
  lblTithi:"तिथि", lblNakshatra:"नक्षत्र", lblYoga:"योग", lblKarana:"करण", lblMoonRashi:"चन्द्र राशि", lblRitu:"ऋतु", lblAyana:"अयन", lblDishashool:"दिशाशूल", lblChandraNivasa:"चन्द्र निवास",
  adminUpdatedNote:"(एडमिन/पंचांग इंजन द्वारा अपडेट किया जाएगा)",
  muhurtaTitle:"लाइव मुहूर्त", muhurtaSub:"आज के शुभ-अशुभ समय — सूर्योदय/सूर्यास्त के आधार पर गणना किए गए।",
  muhurtaNow:"अभी", muhurtaUpcoming:"आगामी", muhurtaDone:"समाप्त",
  muhLabels:{rahu:"राहुकाल", yama:"यम घण्टक", gulika:"गुलिक काल", abhijit:"अभिजित मुहूर्त"}, horaTitle:"होरा", horaCurrent:"वर्तमान होरा", choghadiyaTitle:"चौघडिया", choghadiyaDay:"दिन", choghadiyaNight:"रात",
  panchangaAccuracyNote:"⚠️ यहां दिख रहे सूर्योदय, सूर्यास्त, तिथि, नक्षत्र, योग, करण, राहुकाल, यमगण्ड, गुलिक काल एवं अभिजित मुहूर्त — सभी काठमांडू हेतु मानक खगोलीय सूत्रों से स्वतः गणना किए गए हैं (मैन्युअल रूप से नहीं डाले गए)। तिथि/नक्षत्र गणना की सटीकता लगभग ±0.3-0.5 डिग्री (करीब आधा-एक घंटा) तक हो सकती है, अतः ठीक तिथि-परिवर्तन के समय (जैसे विवाह मुहूर्त तय करते समय) कृपया प्रमाणित पंचांग या ज्योतिषी से पुनः पुष्टि करें।",
  refreshBtn:"रीफ्रेश करें",
  dobBsLabel:"जन्म तिथि (वि.सं.)", dobAdLabel:"जन्म तिथि (ई.)",
  dobConvertNote:"वि.सं. या ई. में से कोई एक तिथि भरें — दूसरी स्वतः गणना होगी।",
  optionalLabel:"(वैकल्पिक)",
  chooseModeHeading:"परामर्श मोड चुनें",
  modeRequired:"कृपया परामर्श मोड (ऑनलाइन या प्रत्यक्ष) चुनें।",
  stepDetails:"विवरण", stepPayment:"भुगतान", stepConfirmation:"पुष्टि",
  stepType:"प्रकार", stepAstro:"ज्योतिषी", stepMethod:"विधि", stepTerms:"शर्तें",
  askSteps:["विवरण","प्रश्न","भुगतान","सबमिट","उत्तर"],
  feeOnline:"रु. 1,000", feeChat:"रु. 600", feeAsk:"रु. 100",
  birthCountryLabel:"जन्म देश",
  validationRequired:"कृपया सभी आवश्यक (*) विवरण भरें।",
  payInstructions:"अपना eSewa या Khalti ऐप खोलकर 9851001890 पर {fee} भेजें, फिर नीचे 'मैंने भुगतान कर दिया है' पर क्लिक करें।",
  payAttestLabel:"मैंने भुगतान कर दिया है", payRefLabel:"ट्रांजेक्शन/संदर्भ नंबर (वैकल्पिक)",
  payAttestRequired:"आगे बढ़ने से पहले कृपया भुगतान की पुष्टि करें।",
  payPendingBadge:"भुगतान पुष्टि लंबित", payPendingNote:"हमारी टीम आपके भुगतान की जांच कर फोन या व्हाट्सएप द्वारा अंतिम पुष्टि करेगी।",
  onlineBookedMsg:"आपका ऑनलाइन परामर्श सफलतापूर्वक बुक हो गया है।",
  chatBookedMsg:"आपका चैट परामर्श सफलतापूर्वक बुक हो गया है।",
  chatActivateNote:"भुगतान पुष्टि होने के बाद हम आपको व्हाट्सएप द्वारा विशेषज्ञ के साथ निजी चैट लिंक भेजेंगे।",
  askOneNotice:"यह शुल्क केवल एक प्रश्न के लिए है। अतिरिक्त प्रश्न हेतु पुनः रु. 100 भुगतान करना होगा।",
  askAnotherBtn:"एक और प्रश्न पूछें — रु. 100",
  answerPendingNote:"विशेषज्ञ के उत्तर देने पर यह यहां दिखेगा और आपको सूचित किया जाएगा।",
  questionIdLabel:"प्रश्न आईडी",
  navShop:"दुकान",
  shopEyebrow:"ऑनलाइन दुकान", shopTitle:"ज्योतिष, वास्तु एवं पूजा सामग्री", shopSub:"प्रमाणित पारंपरिक सामग्री — ऑर्डर करें, हमारी टीम मूल्य एवं भुगतान की पुष्टि हेतु संपर्क करेगी।",
  shopList:[
    {id:'rudraksha', t:"रुद्राक्ष माला", d:"शुद्ध एवं प्रमाणित रुद्राक्ष माला।", icon:'gem'},
    {id:'navratna', t:"नवरत्न/रत्न अंगूठी", d:"कुंडली अनुसार अनुशंसित रत्न।", icon:'star'},
    {id:'sriyantra', t:"श्री यंत्र", d:"घर या व्यवसाय हेतु श्री यंत्र।", icon:'compass'},
    {id:'vastupyramid', t:"वास्तु पिरामिड सेट", d:"वास्तु दोष सुधार हेतु पिरामिड सेट।", icon:'home2'},
    {id:'navagraha', t:"नवग्रह यंत्र", d:"नवग्रह शांति हेतु यंत्र।", icon:'compass'},
    {id:'pujakit', t:"पूजा सामग्री किट", d:"संपूर्ण पूजा सामग्री का किट।", icon:'temple'},
    {id:'sphatik', t:"स्फटिक माला", d:"जप एवं ध्यान हेतु स्फटिक माला।", icon:'gem'},
    {id:'camphorset', t:"कपूर, धूप एवं अगरबत्ती सेट", d:"दैनिक पूजा हेतु सामग्री सेट।", icon:'fire'}
  ],
  orderNowBtn:"ऑर्डर करें", orderPanelTitle:"ऑर्डर विवरण",
  orderProductLabel:"चयनित वस्तु", orderQtyLabel:"मात्रा", orderAddressLabel:"पता (डिलीवरी हेतु)", orderNotesLabel:"अतिरिक्त टिप्पणी",
  orderSubmitBtn:"ऑर्डर भेजें",
  orderNote:"⚠️ यह केवल ऑर्डर अनुरोध है — मूल्य एवं भुगतान की पुष्टि हमारी टीम द्वारा फोन/व्हाट्सएप पर होने के बाद ही ऑर्डर अंतिम होगा।",
  orderSuccessTitle:"ऑर्डर अनुरोध प्राप्त हुआ!", orderSuccessNote:"हमारी टीम शीघ्र मूल्य एवं डिलीवरी की पुष्टि हेतु संपर्क करेगी।",
  orderIdLabel:"ऑर्डर आईडी", selectProductFirst:"कृपया पहले ऊपर से कोई वस्तु चुनें।",
  navKarmakanda:"कर्मकांड", navDirectory:"विशेषज्ञ", navLogin:"लॉगिन", navAccount:"मेरा खाता",
  kkEyebrow:"धार्मिक सेवाएं", kkTitle:"कर्मकांड एवं धार्मिक अनुष्ठान सेवाएं", kkSub:"पारंपरिक विधि अनुसार सम्पन्न किए जाने वाले संस्कार एवं पूजाएं।",
  kkChoosePurohitLabel:"पुरोहित चुनें",
  kkPurohitNote:"फिलहाल आचार्य कृष्ण प्रसाद पोखरेल उपलब्ध हैं। अधिक प्रमाणित पुरोहित क्रमशः जोड़े जाएंगे।",
  kkList:[
    ["विवाह संस्कार","विवाह संबंधी पूर्ण विधि एवं पूजा।"],
    ["व्रतबंध","उपनयन संस्कार।"],
    ["अन्नप्राशन","शिशु का अन्नप्राशन संस्कार।"],
    ["नामकरण संस्कार","शिशु का नामकरण विधि।"],
    ["गृहप्रवेश","नए घर में प्रवेश पर की जाने वाली पूजा।"],
    ["रुद्री पाठ","रुद्री पाठ एवं अनुष्ठान।"],
    ["नवग्रह पूजा","नवग्रह शांति हेतु पूजा।"],
    ["सत्यनारायण पूजा","भगवान सत्यनारायण की पूजा।"],
    ["श्राद्ध","पितृ श्राद्ध संबंधी विधि।"],
    ["अंत्येष्टि संबंधी कर्म","अंत्येष्टि संस्कार संबंधी सेवा।"],
    ["शांति कर्म","विविध शांति कर्म।"],
    ["ग्रहशांति","ग्रह दोष शांति हेतु पूजा।"],
    ["वास्तु शांति","वास्तु दोष शांति हेतु पूजा।"],
    ["अन्य धार्मिक संस्कार","अन्य पारंपरिक पूजा एवं संस्कार।"]
  ],
  dirEyebrow:"विशेषज्ञ निर्देशिका", dirTitle:"ज्योतिषी एवं पुरोहित", dirSub:"प्रमाणित विशेषज्ञों से सीधे परामर्श लें।",
  dirAstroSectionTitle:"ज्योतिषी", dirPurohitSectionTitle:"पुरोहित",
  dirPurohitEmpty:"प्रमाणित पुरोहितों की सूची शीघ्र जोड़ी जाएगी। हम असत्यापित प्रोफाइल सूचीबद्ध नहीं करते — संपर्क करें, हम उपयुक्त पुरोहित से जोड़ने में सहायता करेंगे।",
  dirBookBtn:"परामर्श बुक करें", dirChatBtn:"चैट शुरू करें", dirAskBtn:"प्रश्न पूछें",
  ctPickerTitle:"परामर्श का प्रकार चुनें",
  ctOnline:"ऑनलाइन परामर्श / प्रत्यक्ष परामर्श", ctOnlineD:"गूगल मीट/ज़ूम/फोन द्वारा अथवा कार्यालय में प्रत्यक्ष पूर्ण समय का परामर्श।",
  ctChat:"चैट परामर्श", ctChatD:"निर्धारित अवधि के भीतर लिखित चैट द्वारा परामर्श।",
  ctAsk:"प्रश्न पूछें", ctAskD:"आपके विशिष्ट प्रश्न का संक्षिप्त, किफायती उत्तर।",
  ctContinue:"आगे बढ़ें",
  askExpert:"विशेषज्ञ चुनें", askQuestionLabel:"अपना प्रश्न लिखें", askSubmitBtn:"प्रश्न एवं भुगतान भेजें",
  askPerQuestion:"प्रति प्रश्न",
  askNote:"भुगतान के बाद विशेषज्ञ आपके प्रश्न का उत्तर देंगे। उत्तर आपके खाते में उपलब्ध होगा।",
  askSuccessTitle:"प्रश्न प्राप्त हुआ!", askSuccessNote:"विशेषज्ञ शीघ्र उत्तर देंगे। सूचना ईमेल/व्हाट्सएप द्वारा भेजी जाएगी।",
  chatInfoTitle:"चैट परामर्श कैसे कार्य करता है", chatInfoBody:"भुगतान के बाद निर्धारित अवधि के लिए विशेषज्ञ के साथ निजी चैट खुलती है, जहां आप टेक्स्ट, फोटो एवं दस्तावेज़ भेज सकते हैं। (यह लाइव चैट प्रणाली वर्तमान में निर्माणाधीन है — फिलहाल कृपया व्हाट्सएप द्वारा संपर्क करें।)",
  chatStartBtn:"व्हाट्सएप द्वारा चैट शुरू करें",
  authLoginTab:"लॉगिन", authRegisterTab:"पंजीकरण करें", authFullName:"पूरा नाम", authPhoneLabel:"मोबाइल नंबर", authEmailLabel:"ईमेल",
  authPasswordLabel:"पासवर्ड", authConfirmLabel:"पासवर्ड की पुष्टि करें", authPrefLangLabel:"पसंदीदा भाषा",
  authLoginSubmit:"लॉगिन करें", authRegisterSubmit:"खाता बनाएं",
  authDemoBanner:"🔒 सुरक्षित Supabase खाता प्रणाली — ईमेल से पंजीकरण करें, पुष्टि करें और फिर लॉगिन करें।",
  authForgotLink:"पासवर्ड भूल गए?", authSwitchToRegister:"खाता नहीं है? पंजीकरण करें", authSwitchToLogin:"पहले से खाता है? लॉगिन करें",
  myAccTitle:"मेरा खाता", myAccSub:"आपकी बुकिंग, कुंडली, रिपोर्ट एवं भुगतान एक ही स्थान पर।",
  bookingsTitle:"बुकिंग रिकॉर्ड", bookingsSub:"सभी सेवा रिकॉर्ड व्यक्ति के नाम के अनुसार समूहित हैं।", bookingsPeopleLabel:"व्यक्ति", bookingsRecordsLabel:"रिकॉर्ड", bookingsEmpty:"अभी कोई रिकॉर्ड नहीं मिला।", bookingsRefresh:"रिफ्रेश", bookingsExportAll:"सभी डाउनलोड", bookingsDownloadPerson:"व्यक्ति का data डाउनलोड",
  myAccSections:["मेरी प्रोफाइल","मेरी बुकिंग","आगामी परामर्श","पिछले परामर्श","चैट","मेरे प्रश्न","मेरी रिपोर्ट","भुगतान","सूचनाएं"],
  myAccDemoNote:"⚠️ यह 'मेरा खाता' पृष्ठ फिलहाल केवल एक नमूना है — वास्तविक डेटा देखने के लिए लॉगिन प्रणाली बनानी होगी।",
  vcEyebrow:"वास्तु एनोटेशन", vcTitle:"नक्शे पर सीधे चिह्न लगाएं",
  vcHint:"ऊपर दिए नक्शे पर कहीं भी क्लिक करके पिन जोड़ें, फिर कमरा/दिशा एवं टिप्पणी लिखें।",
  vcRoomLabel:"कमरा/दिशा", vcNoteLabel:"टिप्पणी", vcSaveNote:"पिन सुरक्षित करें", vcDownload:"एनोटेटेड नक्शा डाउनलोड करें",
  vcClear:"सभी पिन हटाएं", vcPinsHeading:"जोड़ी गई टिप्पणियां", vcNoPins:"अभी तक कोई पिन नहीं जोड़ा गया।",
  vcUploadFirst:"पहले ऊपर नक्शा अपलोड करें।", vcDelete:"हटाएं"
},
sa: {
  brand:"ज्योतिष-वास्तु-सेवा-केन्द्रम्", brandTag:"वैदिकज्योतिषम् वास्तुशास्त्रं च",
  nav:{home:"गृहपृष्ठम्",astrology:"ज्योतिषम्",rashifal:"राशिफलम्",vastu:"वास्तु",karmakanda:"कर्मकाण्डम्",directory:"विशेषज्ञाः",classes:"ऑनलाइन-अध्ययनम्",shop:"विपणिः",kundali:"कुण्डली",booking:"परामर्शः आरक्ष्यताम्",bookings:"आरक्षण-लेखाः",contact:"सम्पर्कः",login:"प्रवेशः",account:"मम कक्षः"},
  headerCta:"परामर्शार्थम् आरक्षणं क्रियताम्",
  heroEyebrow:"शास्त्रीयं वैदिकज्योतिषम् • वास्तुशास्त्रम् • नेपालः",
  heroTitle:"ज्योतिष-वास्तु-सेवायाः विश्वसनीयं केन्द्रम्",
  heroLead:"शास्त्रीयज्योतिषे वास्तुशास्त्रे वैदिकपरम्परायां च आधारितः वैयक्तिकः परामर्शः — अन्तर्जालेन प्रत्यक्षेण च उपलब्धः।",
  heroCta1:"परामर्शः आरक्ष्यताम्", heroCta2:"अस्माकं सेवाः पश्यन्तु",
  qlCall:"सम्प्रति दूरभाषं कुर्वन्तु", qlWa:"WhatsApp", qlViber:"Viber", qlBook:"नियुक्तिः",
  heroCardTitle:"परामर्शस्य प्रक्रिया",
  heroCardList:["सेवां तिथिं च चिन्वन्तु","स्वजन्मविवरणं ददतु","अन्तर्जालेन प्रत्यक्षेण वा परामर्शं गृह्णन्तु","सुरक्षितं प्रतिवेदनं प्राप्नुवन्तु"],
  panchangTithi:"तिथिः: भाद्रपदशुक्ल ६, २०८३ विक्रमाब्दः • तिथिः: दशमी (शुक्लपक्षः)*",
  panchangNote:"*एतत् स्न्यापशॉट-दत्तांशः — सजीव-पञ्चाङ्ग-यन्त्रस्य सम्बद्धतायां प्रतिदिनं स्वयमेव नूतनीभविष्यति",
  statLabels:["अनुभवस्य वर्षाणि","सम्पन्नाः परामर्शाः","उपलब्धाः सेवाः","अन्तर्जालेन प्रत्यक्षेण च"],
  statNote:"(प्रशासकेन नूतनीकरिष्यते)",
  svcEyebrow:"अस्माकं सेवाः", svcTitle:"ज्योतिष-वास्तु-सेवाः", svcSub:"पारम्परिकज्ञानस्य आधुनिकपरामर्शविधेः च संयोजने उपलब्धाः सर्वाः सेवाः।",
  overview:[
    {icon:'chart',t:"जन्मकुण्डली फलादेशश्च",d:"सम्पूर्णं जन्मकुण्डली-विश्लेषणं, दशा-अन्तर्दशा, गोचरफलादेशश्च।",cta:"पश्यन्तु",view:"astrology"},
    {icon:'heart',t:"विवाहकुण्डली-मेलनम्",d:"गुणमेलनं, दोषविश्लेषणं, वैवाहिकपरामर्शश्च।",cta:"पश्यन्तु",view:"astrology"},
    {icon:'briefcase',t:"वृत्ति-व्यवसाय-ज्योतिषम्",d:"शिक्षा, वृत्तिः, व्यवसायः, आर्थिकदिशा च विषये मार्गदर्शनम्।",cta:"पश्यन्तु",view:"astrology"},
    {icon:'home2',t:"वास्तुपरामर्शः",d:"आवासीय-व्यावसायिक-भूमिचयनसम्बद्धा वास्तुसेवा।",cta:"पश्यन्तु",view:"vastu"},
    {icon:'compass',t:"मुहूर्तनिर्धारणम्",d:"विवाहः, गृहप्रवेशः, भूमिपूजनम् इत्यादिषु शुभमुहूर्तनिर्धारणम्।",cta:"अधिकं जानन्तु",view:"booking"},
    {icon:'temple',t:"पूजा धार्मिकानुष्ठानानि च",d:"ग्रहशान्तिः, नवग्रहपूजा, पारम्परिकसंस्काराः च।",cta:"अधिकं जानन्तु",view:"booking"}
  ],
  whyEyebrow:"अस्मान् किमर्थं चिन्वन्तु", whyTitle:"अस्मान् चयनस्य कारणानि",
  why:[
    {icon:'book',t:"शास्त्रीयाधारः",d:"वैदिकज्योतिषे शास्त्रीयग्रन्थेषु च आधारितं विश्लेषणम्।"},
    {icon:'heart',t:"वैयक्तिकः परामर्शः",d:"प्रत्येकस्य ग्राहकस्य स्थित्यनुसारं विशेषं मार्गदर्शनम्।"},
    {icon:'compass',t:"अन्तर्जाल-प्रत्यक्ष-सेवा",d:"स्वसुविधानुसारं अन्तर्जालेन कार्यालये वा परामर्शः।"},
    {icon:'shield',t:"गोपनीयता",d:"भवतः वैयक्तिकं विवरणं पूर्णतया सुरक्षितं राखयते।"},
    {icon:'briefcase',t:"व्यावहारिकं मार्गदर्शनम्",d:"वास्तविकजीवने उपयोगी ठोसाः सूचनाः।"},
    {icon:'building',t:"परम्परा + आधुनिकप्रविधिः",d:"पारम्परिकज्ञानं आधुनिकआरक्षणप्रणाल्या सह संयोजितम्।"}
  ],
  aboutEyebrow:"अस्माकं विषये", aboutTitle:"ज्योतिषिनः परिचयः", aboutSub:"अधिकं विवरणं प्रशासकेन शीघ्रं नूतनीकरिष्यते।",
  profName:"आचार्यः कृष्णप्रसादः पोखरेलः",
  profFields:[["शिक्षा","ज्योतिषे स्नातकोत्तरः (Master's in Jyotish)"],["अनुभवः","१५ वर्षाणि"],["विशेषज्ञता","सर्वेषु ज्योतिषविषयेषु दक्षः (जन्मकुण्डली, विवाहमेलनम्, वास्तु, मुहूर्तः, पूजा)"],["भाषाः","नेपालभाषा • हिन्दी • आङ्ग्लभाषा"]],
  profBio:"आचार्यः कृष्णप्रसादः पोखरेलः — ज्योतिषे स्नातकोत्तरोपाधिधारी, १५ वर्षाणां अनुभवयुक्तः ज्योतिषी। जन्मकुण्डली, विवाहमेलनम्, वास्तुशास्त्रम्, मुहूर्तनिर्धारणम्, पूजा च सर्वेषु क्षेत्रेषु दक्षः। बालम्बु-चन्द्रागिरि-नेपालस्थः।",
  profReadMore:"सम्पूर्णं परिचयं पश्यन्तु",
  howEyebrow:"प्रक्रिया", howTitle:"परामर्शः कथं कार्यं करोति",
  how:[["सेवां चिन्वन्तु","स्वावश्यकतानुसारं सेवां चयनं कुर्वन्तु।"],["तिथिं समयं च चिन्वन्तु","उपलब्धसमयेषु एकं चिन्वन्तु।"],["आवश्यकं विवरणं प्रेषयन्तु","जन्मविवरणं प्रश्नं च पूरयन्तु।"],["ज्योतिषिना सह परामर्शं गृह्णन्तु","अन्तर्जालेन प्रत्यक्षेण वा परामर्शं प्राप्नुवन्तु।"]],
  howCta:"सम्प्रति आरक्ष्यताम्",
  artEyebrow:"ज्ञानकेन्द्रम्", artTitle:"नूतनाः लेखाः", artSub:"ज्योतिष-वास्तु-वैदिकपरम्परासम्बद्धा शैक्षिकसामग्री।",
  articles:[
    ["नक्षत्रं किम्?","सप्तविंशतिनक्षत्राणां आधारभूतः परिचयः।"],
    ["वास्तुशास्त्रस्य मूलसिद्धान्ताः","गृहनिर्माणे दिशायाः तत्त्वानां च महत्त्वम्।"],
    ["दशा-अन्तर्दशा अवगमनविधिः","ग्रहदशा जीवने कथं प्रभावं करोति।"]
  ],
  artCta:"पठन्तु",
  vidEyebrow:"दृश्यचित्राणि", vidTitle:"YouTube वाहिनी", vidSub:"राशिफलं, वास्तुसूचनाः, शैक्षिकदृश्यचित्राणि च।",
  vidCta:"YouTube-मध्ये सदस्यताम् गृह्णन्तु", vidNote:"नूतनानि दृश्यचित्राणि अत्र YouTube-वाहिन्याः स्वयमेव दृश्यन्ते।",
  testiEyebrow:"प्रतिक्रिया", testiTitle:"ग्राहकानाम् अनुभवाः",
  testiEmpty:"सत्यापिताः ग्राहकसमीक्षाः शीघ्रम् अत्र संयोजिष्यन्ते। वयं असत्यापितसमीक्षां न प्रकाशयामः।",
  testiGoogle:"Google Reviews पश्यन्तु",
  faqEyebrow:"जिज्ञासा", faqTitle:"बहुधापृष्टाः प्रश्नाः",
  faqCats:["ज्योतिषम्","कुण्डली","वास्तु","आरक्षणम्"],
  faq:{
    "ज्योतिषम्":[["ज्योतिषपरामर्शाय कियान् समयः अपेक्ष्यते?","साधारणतया सेवानुसारं ३०-६० निमेषाः भवन्ति, इदं सेवाप्रकारे निर्भरं करोति।"],["किम् अन्तर्जालपरामर्शः उपलब्धः?","आम्, WhatsApp, दूरभाषेण, दृश्यसम्भाषणेन च अन्तर्जालपरामर्शः उपलब्धः।"]],
    "कुण्डली":[["कुण्डल्यर्थं का सूचना आवश्यका?","पूर्णं नाम, जन्मतिथिः, यथार्थः जन्मसमयः, जन्मस्थानं च आवश्यकम्।"],["यदि जन्मसमयः यथार्थतया न ज्ञायते तर्हि किं कर्तव्यम्?","अनुमानितं समयं ददतु, परन्तु यथासम्भवं शुद्धं समयं उपलब्धं कुर्वन्तु।"]],
    "वास्तु":[["वास्तुपरामर्शः कथं भवति?","भवद्भिः प्रेषितस्य नक्शस्य/चित्रस्य आधारेण दिशायाः संरचनायाः च विश्लेषणं क्रियते।"],["किम् अहं गृहनक्शं प्रेषयितुं शक्नोमि?","आम्, PDF, JPG, अथवा PNG रूपेण नक्शः प्रेषणीयः।"]],
    "आरक्षणम्":[["नियुक्तिः कथम् आरक्ष्यताम्?","'परामर्शः आरक्ष्यताम्' इति बटनद्वारा सेवां तिथिं समयं च चित्वा आरक्षणं क्रियताम्।"],["किम् अहं समयं परिवर्तयितुं शक्नोमि?","आम्, आरक्षणानन्तरं अस्माभिः सम्पर्कं कृत्वा पुनः समयनिर्धारणं क्रियताम्।"]]
  },
  contactEyebrow:"सम्पर्कः", contactTitle:"अस्माभिः सम्पर्कं कुर्वन्तु",
  contactAddr:"ठेगानम्", contactAddrV:"बालम्बु, चन्द्रागिरि, नेपालः",
  contactPhone:"दूरभाषः", contactPhoneV:"+977-985-1001890",
  contactWa:"WhatsApp / Viber", contactWaV:"+977-985-1001890",
  contactEmail:"विद्युत्पत्रम्", contactEmailV:"info@jyotishvastusewakendra.com.np",
  contactHours:"कार्यसमयः", contactHoursV:"रविवासरात् शुक्रवासरं यावत्, प्रातः ९ सायं ६ पर्यन्तम्",
  contactFullBtn:"सम्पूर्णं सम्पर्कपृष्ठं पश्यन्तु",
  astroBread:"गृहपृष्ठम् / ज्योतिषम्", astroH1:"ज्योतिषसेवाः", astroP:"वैदिकज्योतिषे आधारिताः सर्वाः परामर्शसेवाः — जन्मकुण्डलीतः मुहूर्तपर्यन्तम्।",
  vastuBread:"गृहपृष्ठम् / वास्तु", vastuH1:"वास्तुविश्लेषणं समाधानं च", vastuP:"गृह-भूमि-कार्यालय-व्यवसायस्थानानां नकाशा-विवरणाधारेण वास्तुविश्लेषणं सम्भावितदोषानां सुधारमार्गदर्शनं च प्राप्नुवन्तु।", vastuMapCta:"नकाशां परीक्षताम्", vastuAnalysisCta:"वास्तुविश्लेषणं प्रारभताम्", vastuPlatformEyebrow:"वास्तुविश्लेषणं समाधानं च", vastuPlatformTitle:"वास्तुविश्लेषणं समाधानं च", vastuPlatformSub:"नकाशा-चित्र-विवरणाधारेण प्रारम्भिकसंकेतं विशेषज्ञनियन्त्रितं विस्तृतविश्लेषणं च प्राप्नुवन्तु।", vastuUploadNotice:"कृपया स्पष्टं नकाशां भवनयोजनां वा चित्रं प्रेषयन्तु।", vastuServiceTypeLabel:"वास्तुसेवा", vastuTopicLabel:"विशिष्टविषयः", vastuEntranceLabel:"मुख्यप्रवेशदिशा", vastuStatusLabel:"निर्माणावस्था", vastuPurposeLabel:"सम्पत्तेः प्रयोजनम्", vastuRoomsLabel:"कक्षाणां संख्या",
  uploadEyebrow:"नक्शप्रेषणम्", uploadTitle:"स्वगृह-भूमेः नक्शं प्रेषयन्तु",
  uploadLabel:"फ़ाइलं चयनार्थम् अत्र क्लिक् कुर्वन्तु", uploadHint:"PDF, JPG, PNG (अधिकतमम् १० MB)",
  lblDirection:"मुख्यद्वारस्य दिशा", lblBuildingType:"भवनप्रकारः", lblLocationV:"स्थानम्", lblFloors:"तलानां संख्या", lblProblem:"समस्या/प्रश्नविवरणम्",
  directions:["उत्तरा","दक्षिणा","पूर्वा","पश्चिमा","ईशान्या","वायव्या","आग्नेय्या","नैर्ऋत्या"],
  buildingTypes:["गृहम्","अपार्टमेण्ट्","कार्यालयः","विपणिः/व्यवसायः","कारखाना","भूमिः/प्लॉट्"],
  vastuSubmitBtn:"वास्तु-अनुरोधः प्रेष्यताम्",
  bookBread:"गृहपृष्ठम् / परामर्शः आरक्ष्यताम्", bookH1:"परामर्शः आरक्ष्यताम्", bookP:"अधोलिखितसोपानानि पूरयित्वा स्वनियुक्तिं सुरक्षितां कुर्वन्तु।",
  steps:["सेवा","विधिः","तिथि/समयः","विवरणम्","भुगतानम्","पुष्टिः"],
  chooseService:"सेवां चिन्वन्तु", chooseMode:"परामर्शविधिं चिन्वन्तु",
  modes:[["अन्तर्जालम्","Google Meet / Zoom / दूरभाषः / WhatsApp"],["प्रत्यक्षम्","कार्यालये प्रत्यक्षभेटः"]],
  chooseDate:"तिथिं चिन्वन्तु", chooseSlot:"उपलब्धं समयं चिन्वन्तु",
  yourDetails:"भवतः विवरणम्",
  labels:{name:"पूर्णं नाम",phone:"दूरभाषसंख्या",email:"विद्युत्पत्रम्",dob:"जन्मतिथिः",tob:"जन्मसमयः",pob:"जन्मस्थानम्",gender:"लिङ्गम्",country:"देशः",message:"भवतः प्रश्नः/सन्देशः",topics:"भवान् किं विषयं चर्चयितुम् इच्छति?",subject:"विषयः",purpose:"परामर्शस्य उद्देश्यम्",accuracy:"जन्मसमयस्य शुद्धता"},
  genders:["स्त्री","पुरुषः","अन्यत्"],
  topics:["वृत्तिः","विवाहः","सम्बन्धः","व्यवसायः","अर्थम्","शिक्षा","विदेशयात्रा","सम्पत्तिः","परिवारः","आरोग्यसम्बद्धा चिन्ता","सन्ततिः","विधिविषयकम्","आध्यात्मिकविषयः","वास्तु","मुहूर्तः","सामान्यजीवनमार्गदर्शनम्","अन्यत्"],
  paymentTitle:"भुगतानविकल्पः", payLater:"पश्चात् भुगतानं करिष्यामि", payConfirm:"भुगतानं पुष्टम्",
  paymentNote:"eSewa Khalti च (संख्या: 9851001890) द्वारा भुगतानं स्वीक्रियते। अन्तर्जाल-प्रवेशद्वार-एकीकरणं शीघ्रं संयोजिष्यते।",
  reviewTitle:"स्वआरक्षणस्य समीक्षां कुर्वन्तु",
  back:"पूर्वम्", next:"अग्रे", confirmBooking:"आरक्षणं पुष्टं कुर्वन्तु",
  confirmedTitle:"भवतः नियुक्तिः पुष्टा अस्ति!", confirmedNote:"पुष्टिकरण-विद्युत्पत्रं WhatsApp-सन्देशश्च शीघ्रं प्रेष्यते।",
  bookingIdLabel:"आरक्षण-परिचयः", newBooking:"नूतनम् आरक्षणं कुर्वन्तु",
  kundBread:"गृहपृष्ठम् / कुण्डली", kundH1:"कुण्डली-अनुरोधः", kundP:"स्वजन्मविवरणं प्रेषयन्तु, अस्माकं ज्योतिषी भवतः कुण्डलीं निर्मास्यति।",
  kundDisclaimer:"⚠️ भवतः जन्मविवरणस्य आधारेण प्रारम्भिकं कुण्डलीगणनं भवति। सटीकफलादेशाय प्रमाणितपञ्चाङ्गम्/ephemeris तथा ज्योतिषिप्रमाणीकरणम् आवश्यकम्।",
  kundSubmit:"कुण्डली-अनुरोधः प्रेष्यताम्", kundSuccessTitle:"अनुरोधः प्राप्तः!", kundSuccessNote:"अस्माकं दलं सम्पर्कं कृत्वा आवश्यकविवरणं पुष्टं करिष्यति।",
  cBread:"गृहपृष्ठम् / सम्पर्कः", cH1:"सम्पर्कं कुर्वन्तु", cP:"कस्यचित् प्रश्नस्य कृते अधोलिखितं फॉर्मं पूरयन्तु अथवा प्रत्यक्षं सम्पर्कं कुर्वन्तु।",
  contactSubmit:"सन्देशः प्रेष्यताम्", contactSuccess:"धन्यवादः! भवतः सन्देशः प्राप्तः, वयं शीघ्रं सम्पर्कं करिष्यामः।",
  fServicesH:"सेवाः", fQuickH:"त्वरितसम्बन्धाः", fContactH:"सम्पर्कः",
  fLinkAstro:"ज्योतिषसेवा", fLinkVastu:"वास्तुसेवा", fLinkKundali:"कुण्डली-अनुरोधः", fLinkBook:"परामर्शः आरक्ष्यताम्",
  fLinkHome:"गृहपृष्ठम्", fLinkAbout:"अस्माकं विषये", fLinkContact2:"सम्पर्कः", fLinkPrivacy:"गोपनीयतानीतिः", fLinkTerms:"नियमाः शर्ताः च",
  footerAbout:"शास्त्रीयवैदिकज्योतिषे वास्तुशास्त्रे च आधारिता व्यावसायिकी परामर्शसेवा — अन्तर्जालेन प्रत्यक्षेण च उपलब्धा।",
  fCopyright:"© 2026 ज्योतिष-वास्तु-सेवा-केन्द्रम्। सर्वाधिकाराः सुरक्षिताः।",
  fDisclaimerShort:"ज्योतिषपरामर्शः पारम्परिकमार्गदर्शनार्थम् अस्ति, एतत् चिकित्सा-विधि-परामर्शयोः विकल्पः न भवति।",
  bottomHome:"गृहम्", bottomServices:"सेवाः", bottomBook:"आरक्षणम्", bottomWa:"WhatsApp", bottomCall:"दूरभाषः",
  toastKundali:"कुण्डली-अनुरोधः सुरक्षितः!", toastVastu:"वास्तु-अनुरोधः सुरक्षितः!", toastContact:"सन्देशः प्रेषितः!",
  healthNote:"⚠️ आरोग्यसम्बद्धं ज्योतिषीयं मार्गदर्शनं चिकित्सानिदानं न भवति, एतत् व्यावसायिकचिकित्सापरामर्शस्य विकल्पं दातुं न शक्नोति।",
  pricePlaceholder:"मूल्यार्थं सम्पर्कं कुर्वन्तु",
  langSelectorLabel:"भाषाचयनम्",
  fabCallLabel:"प्रत्यक्षं दूरभाषं कुर्वन्तु", fabChatLabel:"संभाषणं कुर्वन्तु", fabBookLabel:"आरक्षणं कुर्वन्तु",
  chatWidgetSubtitle:"वयं सामान्यतया निमेषेषु उत्तरं दद्मः",
  chatWelcomeMsg:"नमस्कारः! \ud83d\ude4f अहं भवते कथं साहाय्यं कर्तुं शक्नोमि? स्वप्रश्नं टिप्पणीं वा अधः लिखन्तु।",
  chatInputPlaceholder:"स्वसन्देशं लिखन्तु...",
  chatConnectingMsg:"धन्यवादः! भवतः सन्देशं गृहीत्वा सम्प्रति WhatsApp-सह सम्बद्धं कुर्मः, यत्र अस्माकं दलं तत्क्षणम् उत्तरं दास्यति।",
  chatBotBadge:"स्वचालितः सहायकः — यथार्थव्यक्तिना सह वदितुं अधः क्लिक् कुर्वन्तु",
  chatTalkHumanBtn:"व्यक्तिना सह वदन्तु",
  classesEyebrow:"शिक्षणकेन्द्रम्", classesTitle:"अन्तर्जाल-कक्षाः", classesSub:"ज्योतिष-वास्तु-सम्बद्धविषयेषु अन्तर्जालप्रशिक्षणम् — गृहात् एव शिक्षन्ताम्।",
  classesList:[
    ["ज्योतिषकक्षा","आरम्भिकात् उन्नतस्तरपर्यन्तं ज्योतिषप्रशिक्षणम्।",'chart'],
    ["वास्तुकक्षा","वास्तुशास्त्रसिद्धान्तानां व्यावहारिकप्रयोगस्य च कक्षा।",'home2'],
    ["अङ्कशास्त्रकक्षा","अङ्कशास्त्रस्य आधारभूतं ज्ञानं प्रयोगश्च।",'chart'],
    ["पञ्चाङ्ग/मुहूर्तकक्षा","पञ्चाङ्गपठनं मुहूर्तनिर्धारणं च शिक्ष्यते।",'clock'],
    ["कर्मकाण्डकक्षा","पूजा-कर्मकाण्डविधिसम्बद्धं प्रशिक्षणम्।",'temple'],
    ["संस्कृत/पारम्परिकज्ञानकक्षा","संस्कृतभाषा पारम्परिकं शास्त्रीयज्ञानं च।",'book']
  ],
  lblInstructor:"शिक्षकः", lblDuration:"अवधिः", lblLevel:"स्तरः", durationTBD:"प्रशासकेन नूतनीकरिष्यते",
  levelAllLabel:"आरम्भिकात् उन्नतपर्यन्तम्",
  enrollBtn:"नामाङ्कनं क्रियताम्", enrollFormTitle:"नामाङ्कनपत्रम्", enrollCourseLabel:"चयनिता कक्षा",
  enrollSubmitBtn:"नामाङ्कनानुरोधः प्रेष्यताम्",
  enrollSuccessTitle:"नामाङ्कनानुरोधः प्राप्तः!", enrollSuccessNote:"अस्माकं दलं कक्षारम्भतिथिं समयं शुल्कं च पुष्टीकर्तुं सम्पर्कं करिष्यति।",
  moreInfoLabel:"अधिकं ज्ञातव्यम्",
  vastuDisclaimerNumerology:"इदं पारम्परिकाङ्कशास्त्र-वास्तु-आधारितं मार्गदर्शनम् अस्ति — न तु निश्चितं भविष्यकथनम्।",
  vastuDisclaimerDosha:"इयं पारम्परिकी ज्योतिष-वास्तु-व्याख्या अस्ति — धार्मिक-पारम्परिकमान्यताधारितः परामर्शः, न तु वैज्ञानिकरूपेण प्रमाणितं तथ्यम्।",
  vastuDisclaimerRemedies:"इदं पारम्परिकोपायसम्बद्धं मार्गदर्शनम् अस्ति। आरोग्य/आयुर्वेदसम्बद्धविषये योग्यचिकित्सकस्य सल्लाहः आवश्यकः — इदं चिकित्सकीयोपचारस्य विकल्पः न भवति।",
  vastuDisclaimerGeneral:"अन्तिमा व्याख्या सुझावाश्च योग्येन परामर्शदात्रा एव क्रियन्ते।",
  vastuCatBusiness:"व्यवसायवास्तु", vastuCatPersonal:"वैयक्तिकी ऊर्जा", vastuCatHouse:"गृह-कक्षवास्तु",
  vastuCatNumerology:"अङ्कशास्त्रं + वास्तु", vastuCatDirection:"दिशा-स्थानविश्लेषणम्", vastuCatColor:"वर्णवास्तु",
  vastuCatPlacement:"वस्तुस्थाननिर्धारणम्", vastuCatDosha:"वास्तु-पारम्परिकदोषौ", vastuCatRemedies:"पारम्परिक-आधुनिकोपायाः",
  vastuCatGeneral:"अन्याः वास्तुसेवाः",
  homeVastuHighlightEyebrow:"वास्तुशास्त्रम्", homeVastuHighlightTitle:"प्रमुखाः वास्तुसेवाः",
  viewAllVastuBtn:"सर्वाः वास्तुसेवाः पश्यन्तु",
  topicsEyebrow:"वयं यत्र साहाय्यं कुर्मः", topicsTitle:"वयं केषु विषयेषु साहाय्यं कुर्मः", topicsSub:"जीवनस्य विविधपक्षेषु दृश्यमानानां समस्यानां ज्योतिषीया वास्तुशास्त्रीया च समाधानम्।",
  topicsList:[
    ["जन्मकुण्डलीपठनम्, उपायाः, कुण्डलीनिर्माणं च",'chart'],
    ["मानसिकतनावसम्बद्धः ज्योतिषीयपरामर्शः",'heart'],
    ["कटि-यन्त्रसम्बद्धः परामर्शः",'compass'],
    ["रत्न/प्रस्तरसम्बद्धः परामर्शः",'gem'],
    ["सन्ततिप्राप्तौ दृश्यमानज्योतिषीयबाधासम्बद्धः परामर्शः",'heart'],
    ["शिक्षा-रोजगारसम्बद्धं समाधानम्",'book'],
    ["व्यवसाये दृश्यमानाबाधासम्बद्धः परामर्शः उपायाश्च",'briefcase'],
    ["भागीदारी-साझेदारीसम्बद्धाः सामञ्जस्योपायाः",'briefcase'],
    ["वैयक्तिक-पारिवारिकसमस्यासम्बद्धः परामर्शः उपायाश्च",'heart'],
    ["पारम्परिकोपायसम्बद्धः परामर्शः",'shield'],
    ["गृह-भूमि-सम्पत्तिसम्बद्धः वास्तुपरामर्शः",'home2'],
    ["गृह-भूमौ वास्तुसमस्या-उपायसम्बद्धं सम्पूर्णं कार्यम्",'building'],
    ["नष्टवस्तुसम्बद्धः प्रश्नज्योतिषपरामर्शः",'star'],
    ["व्यवसायः कदा आरभ्यताम्, कीदृशः व्यवसायः उपयुक्तः स्यात्?",'compass'],
    ["विदेशयात्रा-विदेशसम्बद्धः ज्योतिषीयपरामर्शः",'compass'],
    ["वैवाहिकजीवन-दाम्पत्यसम्बद्धः परामर्शः",'heart'],
    ["आरोग्य-रोगसम्बद्धः ज्योतिषीयपरामर्शः",'shield'],
    ["वास्तुशास्त्रपरामर्शः",'home2'],
    ["पूजा-कर्मकाण्डसम्बद्धं साहाय्यं परामर्शश्च",'temple'],
    ["कुण्डल्याधारेण गृह-वास्तुविश्लेषणम्",'chart'],
    ["अन्तर्जाल-ज्योतिष-वास्तु-कक्षाः",'book']
  ],
  originalGuaranteeNote:"✅ अत्र क्रीताः सर्वाः वस्तवः शतप्रतिशतम् (100%) मौलिकाः (Original) भविष्यन्ति — अस्य सम्पूर्णां गारण्टीं अस्माकं कम्पनी गृह्णाति।",
  specialOfferBanner:"🎉 विशेषाऽवसरः! परिमितकालार्थं सर्वासु वस्तुषु विशेषा छूट् उपलब्धा अस्ति। मूल्यं छूट् च ज्ञातुं सम्पर्कं कुर्वन्तु।",
  mukhiLabel:"मुखी चिन्वन्तु", caratLabel:"क्यारेट् चिन्वन्तु",
  shopList2:[
    {id:'vastukalash', t:"वास्तुकलशः", d:"गृह-कार्यालयार्थं शुभः वास्तुकलशः।", icon:'home2'},
    {id:'shaligram', t:"शालिग्रामः", d:"पूजनीया शालिग्रामशिला।", icon:'temple'},
    {id:'shivling', t:"शिवलिङ्गम्", d:"पूजार्थं शिवलिङ्गम्।", icon:'temple'},
    {id:'suryayantra', t:"सूर्ययन्त्रम्", d:"सूर्यग्रहशान्त्यर्थं यन्त्रम्।", icon:'compass'},
    {id:'lakshmiyantra', t:"लक्ष्मीयन्त्रम्", d:"धन-समृद्ध्यर्थं लक्ष्मीयन्त्रम्।", icon:'compass'},
    {id:'vyaparkadi', t:"व्यापार-कटिः", d:"व्यापारवृद्ध्यर्थं पारम्परिकी कटिः।", icon:'briefcase'},
    {id:'kuberyantra', t:"कुबेरयन्त्रम्", d:"धनवृद्ध्यर्थं कुबेरयन्त्रम्।", icon:'compass'},
    {id:'rashiitem', t:"राशि-वस्तु", d:"स्वराश्यनुसारं विशेषा सामग्री।", icon:'star'},
    {id:'murti', t:"मूर्तयः", d:"देवदेवीनां पूजनीयाः मूर्तयः।", icon:'temple'},
    {id:'shrikhand', t:"श्रीखण्डम्", d:"शुद्धं श्रीखण्डम् (चन्दनम्)।", icon:'gem'},
    {id:'kaudi', t:"कौडी", d:"लक्ष्मीपूजार्थं कौडी।", icon:'gem'},
    {id:'vagbeli', t:"वागवेली-बूटी", d:"पारम्परिकी वागवेली-बूटी।", icon:'book'},
    {id:'mantraash', t:"मन्त्रितभस्म", d:"विधिपूर्वकं मन्त्रितं पवित्रं भस्म।", icon:'fire'},
    {id:'energyyantra', t:"ऊर्जा-बूस्टिंग्-यन्त्रम्", d:"सकारात्मक-ऊर्जावृद्ध्यर्थं यन्त्रम्।", icon:'compass'},
    {id:'updevatayantra', t:"उपदेवतायन्त्रम्", d:"उपदेवतासम्बद्धं विशेषं यन्त्रम्।", icon:'compass'},
    {id:'crystalquartz', t:"Crystal Quartz", d:"शुद्धः क्रिस्टल्-क्वार्ट्ज़्।", icon:'gem'},
    {id:'stone', t:"Stone (उपचार-प्रस्तरः)", d:"पारम्परिकः उपचार-प्रस्तरः।", icon:'gem'}
  ],
  bookPortalTitle:"परामर्शार्थम् आरक्षणं क्रियताम्",
  chooseKindHeading:"परामर्शप्रकारं चिन्वन्तु",
  kindOnline:"अन्तर्जालपरामर्शः", kindDirect:"प्रत्यक्षपरामर्शः",
  kindOnlineD:"Google Meet/Zoom/दूरभाषेण अन्तर्जालपरामर्शः।", kindDirectD:"कार्यालये प्रत्यक्षम् उपस्थित्या परामर्शः।",
  chooseOnlineOptionHeading:"अन्तर्जालपरामर्शविधिं चिन्वन्तु",
  optLiveCall:"सजीवः कॉलः", optLiveCallD:"दूरभाष/दृश्येन प्रत्यक्षं सम्भाषणम्।",
  optLiveChart:"सजीवम् अन्तर्जालचार्टम्", optLiveChartD:"स्वकुण्डली/चार्टं पश्यन् ज्योतिषिणा सह चर्चा।",
  optLiveQA:"सजीवः प्रश्नोत्तरः", optLiveQAD:"सजीवसंभाषणेन प्रत्यक्षः प्रश्नोत्तरः।",
  chooseAstrologerHeading:"ज्योतिषिणं चिन्वन्तु",
  astrologerMoreNote:"अधिकाः ज्योतिषिणः प्रशासकेन क्रमशः योजिष्यन्ते।",
  directMeetingHeading:"प्रत्यक्षभेटः",
  directMeetingNote:"तिथिः, समयः, स्थानं च भुगतान-विवरणानन्तरं पुष्टं भविष्यति। कार्यालयस्य ठेगानं सम्पर्कपृष्ठे पश्यन्तु।",
  termsHeading:"नियमाः शर्ताश्च", termsInfoHeading:"सूचना ज्ञापनं च",
  termsPoints:["कॉल-सेवा समयाधारिता भवति।","कॉलः मध्ये विच्छिन्नः चेत् शेषसमयस्य आधारेण पुनः सम्बद्धीकरणार्थं वा सेवां निरन्तरं दातुं Call History पश्यन्तु।","यदि ज्योतिषिणा कॉलः \"सम्पन्नः\" इति चिह्नितः, तर्हि क्रीतं टिकट्/सेवाशुल्कं न प्रत्यागमिष्यति।"],
  termsFooterNote:"कॉल-सेवा समयाधारिता भवति। अतः निर्धारितसमयाभ्यन्तरे उपलब्धां सेवां उपयोक्तुं ग्राहकस्य दायित्वं भविष्यति।",
  termsCheckboxLabel:"मया नियमाः शर्ताश्च पठिताः स्वीकृताश्च सन्ति।",
  termsRequired:"अग्रे गमनात् पूर्वं कृपया नियमान् शर्तांश्च स्वीकुर्वन्तु।",
  tokenLabel:"टोकन-संख्या",
  tokenIssuedNote:"कृपया परामर्शकाले एतां टोकन-संख्यां दर्शयन्तु।",
  liveLinkLabel:"सजीवपञ्चाङ्गं पश्यन्तु",
  panchangaPageTitle:"सजीवपञ्चाङ्गम्", panchangaPageSub:"काठमाण्डु-नेपालार्थम् अद्यतनं पञ्चाङ्गविवरणम्।",
  lblAdDate:"ई. तिथिः", lblBsDate:"विक्रमाब्दः", lblWeekday:"वासरः",
  lblSunrise:"सूर्योदयः", lblSunset:"सूर्यास्तः",
  lblTithi:"तिथिः", lblNakshatra:"नक्षत्रम्", lblYoga:"योगः", lblKarana:"करणम्", lblMoonRashi:"चन्द्रराशिः", lblRitu:"ऋतुः", lblAyana:"अयनम्", lblDishashool:"दिशाशूलम्", lblChandraNivasa:"चन्द्रनिवासः",
  adminUpdatedNote:"(प्रशासकेन/पञ्चाङ्गयन्त्रेण नूतनीकरिष्यते)",
  muhurtaTitle:"सजीवमुहूर्तम्", muhurtaSub:"अद्य शुभाशुभकालाः — सूर्योदय-सूर्यास्तयोः आधारेण गणिताः।",
  muhurtaNow:"सम्प्रति", muhurtaUpcoming:"आगामी", muhurtaDone:"समाप्तः",
  muhLabels:{rahu:"राहुकालः", yama:"यमघण्टकः", gulika:"गुलिककालः", abhijit:"अभिजिन्मुहूर्तः"}, horaTitle:"होरा", horaCurrent:"वर्तमानहोरा", choghadiyaTitle:"चतुर्घटिका", choghadiyaDay:"दिवसः", choghadiyaNight:"रात्रिः",
  panchangaAccuracyNote:"⚠️ अत्र दृश्यमानाः सूर्योदयः, सूर्यास्तः, तिथिः, नक्षत्रम्, योगः, करणम्, राहुकालः, यमगण्डः, गुलिककालः, अभिजिन्मुहूर्तश्च सर्वे काठमाण्ड्वर्थं मानकखगोलसूत्रैः स्वयमेव गणिताः सन्ति (न तु हस्तेन प्रविष्टाः)। तिथि-नक्षत्रगणनायाः शुद्धता प्रायः ±०.३-०.५ अंशपर्यन्तं (अर्धघण्टा-एकघण्टापर्यन्तम्) भवितुम् अर्हति, अतः ठ्याक्कतिथिपरिवर्तनसमये (यथा विवाहमुहूर्तनिर्धारणे) कृपया प्रमाणितपञ्चाङ्गेन ज्योतिषिणा वा पुनः पुष्टिं कुर्वन्तु।",
  refreshBtn:"पुनः लोडयन्तु",
  dobBsLabel:"जन्मतिथिः (वि.सं.)", dobAdLabel:"जन्मतिथिः (ई.)",
  dobConvertNote:"वि.सं. अथवा ई. मध्ये कामपि एकां तिथिं पूरयन्तु — अन्या स्वयमेव गण्यते।",
  optionalLabel:"(ऐच्छिकम्)",
  chooseModeHeading:"परामर्शविधिं चिन्वन्तु",
  modeRequired:"कृपया परामर्शविधिं (अन्तर्जालम् अथवा प्रत्यक्षम्) चिन्वन्तु।",
  stepDetails:"विवरणम्", stepPayment:"भुगतानम्", stepConfirmation:"पुष्टिः",
  stepType:"प्रकारः", stepAstro:"ज्योतिषी", stepMethod:"विधिः", stepTerms:"शर्ताः",
  askSteps:["विवरणम्","प्रश्नः","भुगतानम्","प्रेषणम्","उत्तरम्"],
  feeOnline:"रु. 1,000", feeChat:"रु. 600", feeAsk:"रु. 100",
  birthCountryLabel:"जन्मदेशः",
  validationRequired:"कृपया सर्वाणि आवश्यकानि (*) विवरणानि पूरयन्तु।",
  payInstructions:"स्वकीयं eSewa अथवा Khalti एप् उद्घाट्य 9851001890 मध्ये {fee} प्रेषयन्तु, ततः अधः 'मया भुगतानं कृतम्' इति क्लिक् कुर्वन्तु।",
  payAttestLabel:"मया भुगतानं कृतम्", payRefLabel:"व्यवहार-संदर्भसंख्या (ऐच्छिकम्)",
  payAttestRequired:"अग्रे गमनात् पूर्वं कृपया भुगतानस्य पुष्टिं कुर्वन्तु।",
  payPendingBadge:"भुगतानपुष्टिः प्रलम्बिता", payPendingNote:"अस्माकं दलं भवतः भुगतानं परीक्ष्य दूरभाषेण/WhatsApp-द्वारा अन्तिमां पुष्टिं करिष्यति।",
  onlineBookedMsg:"भवतः अन्तर्जालपरामर्शः सफलतया आरक्षितः अस्ति।",
  chatBookedMsg:"भवतः संभाषणपरामर्शः सफलतया आरक्षितः अस्ति।",
  chatActivateNote:"भुगतानपुष्टेः अनन्तरं वयं भवते WhatsApp-द्वारा विशेषज्ञेन सह गोपनीयं संभाषणसम्बन्धं प्रेषयिष्यामः।",
  askOneNotice:"इदं शुल्कं केवलम् एकस्मै प्रश्नाय अस्ति। अतिरिक्तप्रश्नार्थं पुनः रु. १०० भुगतानं कर्तव्यम्।",
  askAnotherBtn:"अन्यः प्रश्नः पृच्छ्यताम् — रु. १००",
  answerPendingNote:"विशेषज्ञेन उत्तरे दत्ते सति इदं अत्र दृश्यते, भवन्तं च सूचना प्रेष्यते।",
  questionIdLabel:"प्रश्न-परिचयः",
  navShop:"विपणिः",
  shopEyebrow:"अन्तर्जालविपणिः", shopTitle:"ज्योतिष-वास्तु-पूजा-सामग्री", shopSub:"प्रमाणिता पारम्परिकी सामग्री — आदेशं ददतु, अस्माकं दलं मूल्यं भुगतानं च पुष्टीकर्तुं सम्पर्कं करिष्यति।",
  shopList:[
    {id:'rudraksha', t:"रुद्राक्षमाला", d:"शुद्धा प्रमाणिता च रुद्राक्षमाला।", icon:'gem'},
    {id:'navratna', t:"नवरत्न-मुद्रिका", d:"कुण्डल्यनुसारं सुझाविताः रत्नाः।", icon:'star'},
    {id:'sriyantra', t:"श्रीयन्त्रम्", d:"गृहार्थं व्यवसायार्थं वा श्रीयन्त्रम्।", icon:'compass'},
    {id:'vastupyramid', t:"वास्तुपिरामिड्-सेट्", d:"वास्तुदोषसंशोधनार्थं पिरामिड्-सेट्।", icon:'home2'},
    {id:'navagraha', t:"नवग्रहयन्त्रम्", d:"नवग्रहशान्त्यर्थं यन्त्रम्।", icon:'compass'},
    {id:'pujakit', t:"पूजासामग्री-किट्", d:"सम्पूर्णा पूजासामग्री।", icon:'temple'},
    {id:'sphatik', t:"स्फटिकमाला", d:"जप-ध्यानार्थं स्फटिकमाला।", icon:'gem'},
    {id:'camphorset', t:"कर्पूर-धूप-अगरबत्ती-सेट्", d:"दैनिकपूजार्थं सामग्री-सेट्।", icon:'fire'}
  ],
  orderNowBtn:"आदेशः दीयताम्", orderPanelTitle:"आदेशविवरणम्",
  orderProductLabel:"चयनितं वस्तु", orderQtyLabel:"परिमाणम्", orderAddressLabel:"ठेगानम् (वितरणार्थम्)", orderNotesLabel:"अतिरिक्तटिप्पणी",
  orderSubmitBtn:"आदेशः प्रेष्यताम्",
  orderNote:"⚠️ इदं केवलम् आदेशानुरोधः अस्ति — अस्माकं दलेन दूरभाषेण/WhatsApp-द्वारा मूल्यं भुगतानं च पुष्टीकृते सति एव आदेशः अन्तिमो भविष्यति।",
  orderSuccessTitle:"आदेशानुरोधः प्राप्तः!", orderSuccessNote:"अस्माकं दलं शीघ्रं मूल्यं वितरणं च पुष्टीकर्तुं सम्पर्कं करिष्यति।",
  orderIdLabel:"आदेश-परिचयः", selectProductFirst:"कृपया प्रथमं उपरि कस्यचित् वस्तुनः चयनं कुर्वन्तु।",
  navKarmakanda:"कर्मकाण्डम्", navDirectory:"विशेषज्ञाः", navLogin:"प्रवेशः", navAccount:"मम कक्षः",
  kkEyebrow:"धार्मिकसेवाः", kkTitle:"कर्मकाण्ड-धार्मिकानुष्ठान-सेवाः", kkSub:"शास्त्रीयविधिना सम्पाद्यमानाः संस्काराः पूजाश्च।",
  kkChoosePurohitLabel:"पुरोहितं चिन्वन्तु",
  kkPurohitNote:"सम्प्रति आचार्यः कृष्णप्रसादः पोखरेलः उपलब्धः अस्ति। अधिकाः प्रमाणिताः पुरोहिताः क्रमशः योजिष्यन्ते।",
  kkList:[
    ["विवाहसंस्कारः","विवाहसम्बद्धा पूर्णविधिः पूजा च।"],
    ["व्रतबन्धः","उपनयनसंस्कारः।"],
    ["अन्नप्राशनम्","शिशोः अन्नप्राशनसंस्कारः।"],
    ["नामकरणसंस्कारः","शिशोः नामकरणविधिः।"],
    ["गृहप्रवेशः","नूतनगृहे प्रवेशकाले क्रियमाणा पूजा।"],
    ["रुद्रीपाठः","रुद्रीपाठः अनुष्ठानं च।"],
    ["नवग्रहपूजा","नवग्रहशान्त्यर्थं पूजा।"],
    ["सत्यनारायणपूजा","भगवतः सत्यनारायणस्य पूजा।"],
    ["श्राद्धम्","पितृश्राद्धसम्बद्धा विधिः।"],
    ["अन्त्येष्टिकर्म","अन्त्येष्टिसंस्कारसम्बद्धा सेवा।"],
    ["शान्तिकर्म","विविधानि शान्तिकर्माणि।"],
    ["ग्रहशान्तिः","ग्रहदोषशान्त्यर्थं पूजा।"],
    ["वास्तुशान्तिः","वास्तुदोषशान्त्यर्थं पूजा।"],
    ["अन्ये धार्मिकसंस्काराः","अन्याः पारम्परिकाः पूजाः संस्काराश्च।"]
  ],
  dirEyebrow:"विशेषज्ञ-निर्देशिका", dirTitle:"ज्योतिषिणः पुरोहिताश्च", dirSub:"प्रमाणितविशेषज्ञैः सह प्रत्यक्षं परामर्शं गृह्णन्तु।",
  dirAstroSectionTitle:"ज्योतिषिणः", dirPurohitSectionTitle:"पुरोहिताः",
  dirPurohitEmpty:"प्रमाणितानां पुरोहितानां सूची शीघ्रम् अत्र संयोजिष्यते। वयम् असत्यापितं परिचयं न सूचयामः — सम्पर्कं कुर्वन्तु, वयं योग्येन पुरोहितेन सह सम्बन्धं कर्तुं साहाय्यं करिष्यामः।",
  dirBookBtn:"परामर्शः आरक्ष्यताम्", dirChatBtn:"संभाषणम् आरभ्यताम्", dirAskBtn:"प्रश्नः पृच्छ्यताम्",
  ctPickerTitle:"परामर्शप्रकारं चिन्वन्तु",
  ctOnline:"अन्तर्जालपरामर्शः / प्रत्यक्षपरामर्शः", ctOnlineD:"Google Meet/Zoom/दूरभाषेण अथवा कार्यालये प्रत्यक्षं पूर्णकालीनः परामर्शः।",
  ctChat:"संभाषणपरामर्शः", ctChatD:"निर्धारितकालावधौ लिखितसंभाषणेन परामर्शः।",
  ctAsk:"प्रश्नः पृच्छ्यताम्", ctAskD:"भवतः विशिष्टप्रश्नस्य संक्षिप्तः, मितव्ययः उत्तरः।",
  ctContinue:"अग्रे गच्छन्तु",
  askExpert:"विशेषज्ञं चिन्वन्तु", askQuestionLabel:"स्वप्रश्नं लिखन्तु", askSubmitBtn:"प्रश्नं भुगतानं च प्रेषयन्तु",
  askPerQuestion:"प्रतिप्रश्नम्",
  askNote:"भुगतानानन्तरं विशेषज्ञः भवतः प्रश्नस्य उत्तरं दास्यति। उत्तरं भवतः कक्षे उपलब्धं भविष्यति।",
  askSuccessTitle:"प्रश्नः प्राप्तः!", askSuccessNote:"विशेषज्ञः शीघ्रं उत्तरं दास्यति। सूचना विद्युत्पत्रेण/WhatsApp-द्वारा प्रेष्यते।",
  chatInfoTitle:"संभाषणपरामर्शः कथं कार्यं करोति", chatInfoBody:"भुगतानानन्तरं निर्धारितकालावधौ विशेषज्ञेन सह गोपनीयं संभाषणम् उद्घाट्यते, यत्र भवान् लेखं, चित्राणि, दस्तावेजांश्च प्रेषयितुं शक्नोति। (इयं सजीवसंभाषणप्रणाली सम्प्रति निर्माणाधीना अस्ति — सम्प्रति कृपया WhatsApp-द्वारा सम्पर्कं कुर्वन्तु।)",
  chatStartBtn:"WhatsApp-द्वारा संभाषणम् आरभ्यताम्",
  authLoginTab:"प्रवेशः", authRegisterTab:"नामाङ्कनम्", authFullName:"पूर्णं नाम", authPhoneLabel:"चलदूरभाषसंख्या", authEmailLabel:"विद्युत्पत्रम्",
  authPasswordLabel:"गुप्तशब्दः", authConfirmLabel:"गुप्तशब्दं पुष्टं कुर्वन्तु", authPrefLangLabel:"अभीष्टा भाषा",
  authLoginSubmit:"प्रविश्यताम्", authRegisterSubmit:"कक्षः निर्मीयताम्",
  authDemoBanner:"🔒 सुरक्षितं Supabase-खाता-तन्त्रम् — ईमेलद्वारा नामाङ्कनं कृत्वा पुष्टिं विधाय प्रवेशं कुर्वन्तु।",
  authForgotLink:"गुप्तशब्दं विस्मृतवान्?", authSwitchToRegister:"कक्षः नास्ति? नामाङ्कनं कुर्वन्तु", authSwitchToLogin:"पूर्वमेव कक्षः अस्ति? प्रविश्यताम्",
  myAccTitle:"मम कक्षः", myAccSub:"भवतः आरक्षणानि, कुण्डली, प्रतिवेदनानि, भुगतानानि च एकत्र स्थाने।",
  bookingsTitle:"आरक्षण-लेखाः", bookingsSub:"व्यक्तिनामानुसारं सर्वेषां सेवाऽभिलेखानां समूहः।", bookingsPeopleLabel:"व्यक्तयः", bookingsRecordsLabel:"अभिलेखाः", bookingsEmpty:"अद्यापि कश्चित् अभिलेखः न प्राप्तः।", bookingsRefresh:"पुनः पश्यताम्", bookingsExportAll:"सर्वं डाउनलोड", bookingsDownloadPerson:"व्यक्तेः data डाउनलोड",
  myAccSections:["मम परिचयः","मम आरक्षणानि","आगामिनः परामर्शाः","गताः परामर्शाः","संभाषणम्","मम प्रश्नाः","मम प्रतिवेदनानि","भुगतानानि","सूचनाः"],
  myAccDemoNote:"⚠️ इदं 'मम कक्षः' पृष्ठं सम्प्रति केवलं नमूना अस्ति — यथार्थदत्तांशदर्शनार्थं प्रवेशप्रणाली निर्मातव्या।",
  vcEyebrow:"वास्तु-एनोटेशन", vcTitle:"नक्शे प्रत्यक्षं चिह्नं स्थापयन्तु",
  vcHint:"उपरिस्थे नक्शे कुत्रापि क्लिक् कृत्वा पिनं योजयन्तु, ततः कक्षं/दिशां टिप्पणीं च लिखन्तु।",
  vcRoomLabel:"कक्षः/दिशा", vcNoteLabel:"टिप्पणी", vcSaveNote:"पिनं सुरक्षितं कुर्वन्तु", vcDownload:"एनोटेट-नक्शं डाउनलोड् कुर्वन्तु",
  vcClear:"सर्वाणि पिनानि अपाकुर्वन्तु", vcPinsHeading:"योजिताः टिप्पण्यः", vcNoPins:"अद्यापि कोऽपि पिनः न योजितः।",
  vcUploadFirst:"प्रथमं उपरि नक्शं प्रेषयन्तु।", vcDelete:"अपाकुर्वन्तु"
}

};

/* Astrology & Vastu full service lists (ne/en pairs) */
const ASTRO_SERVICES = [
 {ne:"जन्म कुण्डली निर्माण",en:"Birth Chart Preparation",hi:"जन्म कुंडली निर्माण",sa:"जन्मकुण्डलीनिर्माणम्",icon:'chart'},
 {ne:"कुण्डली फलादेश",en:"Birth Chart Analysis",hi:"कुंडली फलादेश",sa:"कुण्डलीफलादेशः",icon:'chart'},
 {ne:"वार्षिक फलादेश",en:"Annual Horoscope Analysis",hi:"वार्षिक फलादेश",sa:"वार्षिकफलादेशः",icon:'star'},
 {ne:"विवाह कुण्डली मिलान",en:"Marriage Compatibility",hi:"विवाह कुंडली मिलान",sa:"विवाहकुण्डलीमेलनम्",icon:'heart'},
 {ne:"विवाह सम्बन्धी परामर्श",en:"Marriage Consultation",hi:"विवाह संबंधी परामर्श",sa:"विवाहसम्बद्धः परामर्शः",icon:'heart'},
 {ne:"शिक्षा सम्बन्धी ज्योतिष",en:"Education Astrology",hi:"शिक्षा संबंधी ज्योतिष",sa:"शिक्षासम्बद्धं ज्योतिषम्",icon:'book'},
 {ne:"करियर ज्योतिष",en:"Career Astrology",hi:"करियर ज्योतिष",sa:"वृत्तिज्योतिषम्",icon:'briefcase'},
 {ne:"व्यवसाय ज्योतिष",en:"Business Astrology",hi:"व्यवसाय ज्योतिष",sa:"व्यवसायज्योतिषम्",icon:'briefcase'},
 {ne:"आर्थिक/वित्तीय ज्योतिष",en:"Financial Astrology",hi:"आर्थिक/वित्तीय ज्योतिष",sa:"आर्थिकज्योतिषम्",icon:'briefcase'},
 {ne:"सन्तान सम्बन्धी ज्योतिष",en:"Children/Family Consultation",hi:"संतान संबंधी ज्योतिष",sa:"सन्ततिसम्बद्धः परामर्शः",icon:'heart'},
 {ne:"स्वास्थ्य सम्बन्धी ज्योतिष",en:"Astrological Health Guidance",hi:"स्वास्थ्य संबंधी ज्योतिष",sa:"आरोग्यसम्बद्धं ज्योतिषम्",icon:'shield',health:true},
 {ne:"विदेश यात्रा / अध्ययन ज्योतिष",en:"Foreign Travel / Study Abroad Astrology",hi:"विदेश यात्रा / अध्ययन ज्योतिष",sa:"विदेशयात्रा-अध्ययन-ज्योतिषम्",icon:'compass'},
 {ne:"प्रश्न ज्योतिष",en:"Prashna Jyotish",hi:"प्रश्न ज्योतिष",sa:"प्रश्नज्योतिषम्",icon:'star'},
 {ne:"मुहूर्त परामर्श",en:"Muhurta Consultation",hi:"मुहूर्त परामर्श",sa:"मुहूर्तपरामर्शः",icon:'clock'},
 {ne:"नामकरण परामर्श",en:"Naming Consultation",hi:"नामकरण परामर्श",sa:"नामकरणपरामर्शः",icon:'book'},
 {ne:"अंक ज्योतिष",en:"Numerology",hi:"अंक ज्योतिष",sa:"अङ्कज्योतिषम्",icon:'chart'}
];
const VASTU_SERVICES = [
 {ne:"आवासीय वास्तु",en:"Residential Vastu",hi:"आवासीय वास्तु",sa:"आवासीयवास्तु",icon:'home2'},
 {ne:"व्यावसायिक वास्तु",en:"Commercial Vastu",hi:"व्यावसायिक वास्तु",sa:"व्यावसायिकवास्तु",icon:'building'},
 {ne:"कार्यालय वास्तु",en:"Office Vastu",hi:"कार्यालय वास्तु",sa:"कार्यालयवास्तु",icon:'briefcase'},
 {ne:"जग्गा छनोट",en:"Land Selection",hi:"भूमि चयन",sa:"भूमिचयनम्",icon:'compass'},
 {ne:"घर नक्सा वास्तु",en:"House Plan Vastu",hi:"गृह नक्शा वास्तु",sa:"गृहनक्शवास्तु",icon:'chart'},
 {ne:"अपार्टमेन्ट वास्तु",en:"Apartment Vastu",hi:"अपार्टमेंट वास्तु",sa:"अपार्टमेण्ट्-वास्तु",icon:'building'},
 {ne:"शयनकक्ष वास्तु",en:"Bedroom Vastu",hi:"शयनकक्ष वास्तु",sa:"शयनकक्षवास्तु",icon:'bed'},
 {ne:"भान्सा वास्तु",en:"Kitchen Vastu",hi:"रसोई वास्तु",sa:"पाकशालावास्तु",icon:'fire'},
 {ne:"प्रवेशद्वार वास्तु",en:"Entrance/Gate Vastu",hi:"प्रवेशद्वार वास्तु",sa:"प्रवेशद्वारवास्तु",icon:'gate'},
 {ne:"पूजा कोठा वास्तु",en:"Temple/Puja Room Vastu",hi:"पूजा कक्ष वास्तु",sa:"पूजाकक्षवास्तु",icon:'temple'},
 {ne:"व्यवसाय वास्तु",en:"Business Vastu",hi:"व्यवसाय वास्तु",sa:"व्यवसायवास्तु",icon:'briefcase'},
 {ne:"कारखाना वास्तु",en:"Factory/Industrial Vastu",hi:"फैक्ट्री वास्तु",sa:"कारखानावास्तु",icon:'factory'},
 {ne:"प्लट वास्तु",en:"Plot Vastu",hi:"प्लॉट वास्तु",sa:"भूखण्डवास्तु",icon:'compass'},
 {ne:"भइरहेको भवन वास्तु",en:"Existing Building Vastu",hi:"मौजूदा भवन वास्तु",sa:"विद्यमानभवनवास्तु",icon:'building'},
 {ne:"वास्तु दोष सुधार",en:"Vastu Correction",hi:"वास्तु दोष सुधार",sa:"वास्तुदोषसंशोधनम्",icon:'shield'},
 {ne:"अनलाइन वास्तु परामर्श",en:"Online Vastu Consultation",hi:"ऑनलाइन वास्तु परामर्श",sa:"अन्तर्जालवास्तुपरामर्शः",icon:'home2'}
];

const CHATBOT_INTENTS = [
  { kw:{ne:['नमस्ते','नमस्कार','हेलो','हाइ'], en:['hello','hi','hey'], hi:['नमस्ते','नमस्कार','हैलो'], sa:['नमस्कार','नमस्ते']},
    reply:{ne:'नमस्कार! 🙏 म तपाईंलाई सेवा, मूल्य, ठेगाना, समय वा बुकिङबारे जानकारी दिन सक्छु। के जान्न चाहनुहुन्छ?',
      en:"Hello! 🙏 I can tell you about our services, pricing, address, hours or booking. What would you like to know?",
      hi:'नमस्ते! 🙏 मैं आपको सेवा, मूल्य, पता, समय या बुकिंग के बारे में बता सकता हूं। आप क्या जानना चाहेंगे?',
      sa:'नमस्कारः! 🙏 अहं भवते सेवा-मूल्य-ठेगान-समय-आरक्षणसम्बद्धं ज्ञातुं शक्नोमि। किं ज्ञातुम् इच्छति?'} },
  { kw:{ne:['मूल्य','शुल्क','दाम','कति पैसा','कति लाग्छ'], en:['price','cost','fee','how much'], hi:['मूल्य','शुल्क','दाम','कितना','कीमत'], sa:['मूल्य','शुल्क']},
    reply:{ne:'अनलाइन/प्रत्यक्ष परामर्श रु. १,०००, च्याट परामर्श रु. ६००, र प्रश्न सोध्नु रु. १०० प्रति प्रश्न हो। पसलका सामानको मूल्यका लागि सम्पर्क गर्नुहोस्।',
      en:'Online/Direct Consultation is NPR 1,000, Chat Consultation NPR 600, and Ask a Question NPR 100 per question. For shop item pricing, please contact us.',
      hi:'ऑनलाइन/प्रत्यक्ष परामर्श रु. 1,000, चैट परामर्श रु. 600, तथा प्रश्न पूछना रु. 100 प्रति प्रश्न है। दुकान की वस्तुओं के मूल्य हेतु संपर्क करें।',
      sa:'अन्तर्जाल/प्रत्यक्षपरामर्शः रु.१,०००, संभाषणपरामर्शः रु.६००, प्रश्नः रु.१०० प्रतिप्रश्नम्। विपण्याः वस्तूनां मूल्यार्थं सम्पर्कं कुर्वन्तु।'} },
  { kw:{ne:['ठेगाना','कहाँ छ','कार्यालय कहाँ','ठेगाना के हो'], en:['address','location','where are you','where is your office'], hi:['पता','कहां है','कार्यालय कहां'], sa:['ठेगानम्','कुत्र']},
    reply:{ne:'हाम्रो कार्यालय बालम्बु, चन्द्रागिरी, नेपालमा छ। पूर्ण नक्सा सम्पर्क पृष्ठमा हेर्न सकिन्छ।',
      en:'Our office is in Balambu, Chandragiri, Nepal. You can see the full map on the Contact page.',
      hi:'हमारा कार्यालय बालम्बु, चंद्रागिरी, नेपाल में है। पूरा नक्शा संपर्क पृष्ठ पर देखें।',
      sa:'अस्माकं कार्यालयं बालम्बु-चन्द्रागिरि-नेपालस्थम् अस्ति। सम्पूर्णं नक्शं सम्पर्कपृष्ठे पश्यन्तु।'} },
  { kw:{ne:['समय','खुल्ने समय','कति बजे','खुला हुन्छ'], en:['hours','open','opening time','when are you open'], hi:['समय','कब खुलता','खुलने का समय'], sa:['समयः','कदा']},
    reply:{ne:'हाम्रो कार्य समय आइतबार देखि शुक्रबार, बिहान ९ बजेदेखि साँझ ६ बजेसम्म हो।',
      en:'Our business hours are Sunday to Friday, 9:00 AM to 6:00 PM.',
      hi:'हमारा कार्य समय रविवार से शुक्रवार, सुबह 9 बजे से शाम 6 बजे तक है।',
      sa:'अस्माकं कार्यसमयः रविवासरात् शुक्रवासरं यावत्, प्रातः ९ सायं ६ पर्यन्तम्।'} },
  { kw:{ne:['बुक','बुकिङ','अपोइन्टमेन्ट','कसरी बुक'], en:['book','booking','appointment','how to book'], hi:['बुक','बुकिंग','अपॉइंटमेंट','कैसे बुक'], sa:['आरक्षणम्','कथम्']},
    reply:{ne:'माथिको सुनौलो "बुकिङ गर्नुहोस्" बटन थिच्नुहोस् — त्यहाँबाट अनलाइन/प्रत्यक्ष परामर्श, च्याट वा प्रश्न सोध्ने सेवा छनोट गरी विवरण भर्न सकिन्छ।',
      en:'Tap the gold "Book Now" button — from there you can choose Online/Direct Consultation, Chat, or Ask a Question and fill in your details.',
      hi:'ऊपर दिए सुनहरे "बुकिंग करें" बटन को दबाएं — वहां से ऑनलाइन/प्रत्यक्ष परामर्श, चैट या प्रश्न पूछने की सेवा चुनकर विवरण भरें।',
      sa:'उपरिस्थं स्वर्णवर्णं "आरक्षणं कुर्वन्तु" बटनं स्पृशन्तु — ततः अन्तर्जाल/प्रत्यक्षपरामर्शं, संभाषणं, प्रश्नं वा चित्वा विवरणं पूरयन्तु।'} },
  { kw:{ne:['सेवा','के के सेवा','सेवाहरू'], en:['services','what do you offer','what services'], hi:['सेवा','सेवाएं','क्या सेवाएं'], sa:['सेवाः','काः सेवाः']},
    reply:{ne:'हामी ज्योतिष (कुण्डली, विवाह मिलान, मुहूर्त आदि), वास्तु परामर्श, कर्मकाण्ड/पूजा सेवा, र ज्योतिष-वास्तु सामग्री पसल उपलब्ध गराउँछौं।',
      en:'We offer Jyotish (Kundali, marriage matching, muhurta, etc.), Vastu consultation, Karmakanda/Puja services, and a shop for Jyotish-Vastu products.',
      hi:'हम ज्योतिष (कुंडली, विवाह मिलान, मुहूर्त आदि), वास्तु परामर्श, कर्मकांड/पूजा सेवा, तथा ज्योतिष-वास्तु सामग्री की दुकान उपलब्ध कराते हैं।',
      sa:'वयं ज्योतिषं (कुण्डली, विवाहमेलनम्, मुहूर्तादि), वास्तुपरामर्शं, कर्मकाण्ड-पूजासेवां, ज्योतिष-वास्तु-विपणिं च उपलभ्यामः।'} },
  { kw:{ne:['ज्योतिषी','को हो','ज्योतिषीको नाम'], en:['astrologer','who is the astrologer','instructor'], hi:['ज्योतिषी','कौन है','ज्योतिषी का नाम'], sa:['ज्योतिषी','कः']},
    reply:{ne:'हाम्रा ज्योतिषी आचार्य कृष्ण प्रसाद पोखरेल हुनुहुन्छ — ज्योतिषमा स्नातकोत्तर, १५ वर्षको अनुभव।',
      en:"Our astrologer is Acharya Krishna Prasad Pokharel — Master's in Jyotish, with 15 years of experience.",
      hi:'हमारे ज्योतिषी आचार्य कृष्ण प्रसाद पोखरेल हैं — ज्योतिष में स्नातकोत्तर, 15 वर्ष का अनुभव।',
      sa:'अस्माकं ज्योतिषी आचार्यः कृष्णप्रसादः पोखरेलः अस्ति — ज्योतिषे स्नातकोत्तरः, १५ वर्षाणाम् अनुभवयुक्तः।'} },
  { kw:{ne:['कुण्डली','जन्म कुण्डली'], en:['kundali','birth chart'], hi:['कुंडली','जन्म कुंडली'], sa:['कुण्डली','जन्मकुण्डली']},
    reply:{ne:'कुण्डली अनुरोध पृष्ठमा गई आफ्नो जन्म विवरण पेश गर्नुहोस् — हाम्रा ज्योतिषीले म्यानुअली कुण्डली तयार गरिदिनुहुनेछ।',
      en:'Go to the Kundali Request page and submit your birth details — our astrologer will prepare your Kundali manually.',
      hi:'कुंडली अनुरोध पृष्ठ पर जाकर अपना जन्म विवरण भेजें — हमारे ज्योतिषी मैन्युअली आपकी कुंडली तैयार करेंगे।',
      sa:'कुण्डली-अनुरोध-पृष्ठं गत्वा स्वजन्मविवरणं प्रेषयन्तु — अस्माकं ज्योतिषी हस्तेन भवतः कुण्डलीं निर्मास्यति।'} },
  { kw:{ne:['धन्यवाद','थ्यांक्यु'], en:['thanks','thank you'], hi:['धन्यवाद','शुक्रिया'], sa:['धन्यवादः']},
    reply:{ne:'धन्यवाद! अरू केही सोध्न चाहनुहुन्छ भने लेख्नुहोस् — म यहीँ छु।',
      en:"You're welcome! Feel free to ask anything else — I'm right here.",
      hi:'आपका स्वागत है! कुछ और पूछना चाहें तो लिखें — मैं यहीं हूं।',
      sa:'स्वागतम्! अन्यत् किमपि पृच्छितुम् इच्छति चेत् लिखतु — अहम् अत्रैव अस्मि।'} }
];

const CHATBOT_FALLBACK = {
  ne:'माफ गर्नुहोस्, मैले त्यो राम्ररी बुझिनँ। सेवा, मूल्य, ठेगाना, समय वा बुकिङबारे सोध्न सक्नुहुन्छ — वा तलको बटनबाट सिधै हाम्रो टोलीसँग कुरा गर्न सक्नुहुन्छ।',
  en:"Sorry, I didn't quite understand that. You can ask about services, pricing, address, hours or booking — or use the button below to talk to our team directly.",
  hi:'क्षमा करें, मैं इसे ठीक से समझ नहीं पाया। आप सेवा, मूल्य, पता, समय या बुकिंग के बारे में पूछ सकते हैं — या नीचे दिए बटन से सीधे हमारी टीम से बात करें।',
  sa:'क्षम्यताम्, अहं तत् सम्यक् न अवगतवान्। सेवा-मूल्य-ठेगान-समय-आरक्षणविषये पृच्छन्तु — अथवा अधोदत्तेन बटनेन सीधा अस्माकं दलेन सह वदन्तु।'
};

function matchChatbotIntent(text, lang){
  const lower = text.toLowerCase();
  for(const intent of CHATBOT_INTENTS){
    const allKw = [].concat(intent.kw.ne, intent.kw.en, intent.kw.hi, intent.kw.sa);
    if(allKw.some(k=>lower.includes(k.toLowerCase()))){
      return intent.reply[lang] || intent.reply.en;
    }
  }
  return null;
}

/* ============================================================
   REAL AI CHAT (Claude API) — with rule-based fallback if the
   API call fails (e.g. no network in this preview environment)
============================================================ */
const AI_CHAT_SYSTEM_PROMPT = `You are the warm, friendly virtual reception assistant for "Jyotish and Vastu Sewa Kendra", a Nepal-based astrology, Vastu, and Karmakanda consultation business.

BUSINESS FACTS (use these; never invent additional credentials or claims beyond them):
- Astrologer: Acharya Krishna Prasad Pokharel — Master's degree in Jyotish, 15 years of consultation experience. Specializes in birth chart (Kundali) reading, marriage compatibility matching, Vastu Shastra, Muhurta (auspicious timing), and Puja/Karmakanda consultation. Languages: Nepali, Hindi, English.
- Phone / WhatsApp / Viber: 9851001890 — always share this number if anyone asks for a phone number, contact number, or how to reach the astrologer directly.
- Address: Balambu, Chandragiri, Nepal.
- Business hours: Sunday to Friday, 9:00 AM to 6:00 PM.
- Services & pricing: Online/Direct Consultation NPR 1,000; Chat Consultation NPR 600; Ask a Question NPR 100 per question. Also: full Vastu consultation (business, home, dosha, remedies, etc.), Karmakanda/Puja services, Kundali preparation, and a shop for Jyotish/Vastu products (Rudraksha, gemstones, yantras, etc.).
- The site has a "Book a Consultation" flow, a Vastu services page, a Karmakanda page, an online Shop, and Online Classes.

YOUR GOAL: Be genuinely helpful and warm, answer questions about astrology, Vastu, and the business clearly, and naturally, gently encourage the person toward booking a consultation with Acharya Krishna Prasad Pokharel when it fits the conversation — without being pushy, repetitive, or making guaranteed promises. A soft, caring nudge ("would you like me to help you book a session with Acharya-ji so he can look at this in detail?") is good; hard-selling every message is not.

LANGUAGE: Always reply in the same language the person is writing in (Nepali, English, Hindi, or Sanskrit) — match their language, not the site's UI language.

STYLE: Keep replies short and conversational — 2 to 4 sentences — suitable for a small chat widget, not long essays.

IMPORTANT GUARDRAILS:
- Never guarantee specific predictions or outcomes ("your business will definitely succeed"); frame astrology, Vastu, and numerology guidance as traditional/classical guidance, not scientifically proven fact.
- For health-related questions, note this is not a substitute for professional medical advice and a qualified doctor should be consulted.
- Do not invent astrologer credentials, awards, or client numbers beyond what is stated above.
- If you don't know something specific (like exact product prices), say so honestly and offer to connect them with the team via WhatsApp/call at 9851001890 rather than guessing.`;

async function getAiChatReply(conversationHistory){
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: AI_CHAT_SYSTEM_PROMPT,
        messages: conversationHistory
      })
    });
    if(!response.ok) return null;
    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    return textBlock && textBlock.text ? textBlock.text.trim() : null;
  }catch(e){
    console.warn('AI chat unavailable, using offline fallback', e);
    return null;
  }
}

const VASTU_CATEGORIES = [
  {id:'business', ne:"व्यवसाय वास्तु", en:"Business Vastu", hi:"व्यवसाय वास्तु", sa:"व्यवसायवास्तु"},
  {id:'personal', ne:"व्यक्तिगत ऊर्जा", en:"Personal Energy", hi:"व्यक्तिगत ऊर्जा", sa:"वैयक्तिकी ऊर्जा"},
  {id:'house', ne:"घर तथा कोठा वास्तु", en:"House & Room Vastu", hi:"घर एवं कमरा वास्तु", sa:"गृह-कक्षवास्तु"},
  {id:'numerology', ne:"अंकशास्त्र + वास्तु", en:"Numerology + Vastu", hi:"अंकशास्त्र + वास्तु", sa:"अङ्कशास्त्रं + वास्तु"},
  {id:'direction', ne:"दिशा तथा स्थान विश्लेषण", en:"Direction & Space Analysis", hi:"दिशा एवं स्थान विश्लेषण", sa:"दिशा-स्थानविश्लेषणम्"},
  {id:'color', ne:"रङ वास्तु", en:"Color Vastu", hi:"रंग वास्तु", sa:"वर्णवास्तु"},
  {id:'placement', ne:"वस्तु स्थान निर्धारण", en:"Object Placement", hi:"वस्तु स्थान निर्धारण", sa:"वस्तुस्थाननिर्धारणम्"},
  {id:'dosha', ne:"वास्तु तथा परम्परागत दोष", en:"Vastu & Traditional Dosha", hi:"वास्तु एवं पारंपरिक दोष", sa:"वास्तु-पारम्परिकदोषौ"},
  {id:'remedies', ne:"परम्परागत तथा आधुनिक उपाय", en:"Traditional & Modern Remedies", hi:"पारंपरिक एवं आधुनिक उपाय", sa:"पारम्परिक-आधुनिकोपायाः"},
  {id:'general', ne:"अन्य वास्तु सेवाहरू", en:"Other Vastu Services", hi:"अन्य वास्तु सेवाएं", sa:"अन्याः वास्तुसेवाः"}
];

const VASTU_SERVICES_DETAILED = [
  // BUSINESS VASTU
  {cat:'business', icon:'briefcase',
    ne:"व्यवसाय केन्द्रित वास्तु विश्लेषण तथा वास्तु रेमेडी", neD:"व्यवसायको वृद्धिका लागि वास्तु विश्लेषण र उपाय।",
    en:"Business Focusing & Vastu Remedy", enD:"Vastu analysis and remedy focused on business growth.",
    hi:"व्यवसाय केंद्रित वास्तु विश्लेषण एवं वास्तु उपाय", hiD:"व्यवसाय वृद्धि हेतु वास्तु विश्लेषण एवं उपाय।",
    sa:"व्यवसायकेन्द्रितं वास्तुविश्लेषणं वास्तूपायश्च", saD:"व्यवसायवृद्ध्यर्थं वास्तुविश्लेषणम् उपायश्च।"},
  {cat:'business', icon:'building',
    ne:"व्यवसायिक स्थान/कार्यालय/कम्प्लेक्सको Energy Test तथा Vastu Management", neD:"व्यावसायिक भवनको ऊर्जा परीक्षण तथा वास्तु व्यवस्थापन।",
    en:"Business/Office/Complex Energy Test & Treatment", enD:"Energy test and Vastu management for commercial properties.",
    hi:"व्यावसायिक स्थान/कार्यालय/कॉम्प्लेक्स एनर्जी टेस्ट एवं वास्तु प्रबंधन", hiD:"व्यावसायिक भवन की ऊर्जा जांच एवं वास्तु प्रबंधन।",
    sa:"व्यावसायिकस्थान-कार्यालय-सङ्कुलानाम् ऊर्जापरीक्षणं वास्तुव्यवस्थापनं च", saD:"व्यावसायिकभवनस्य ऊर्जापरीक्षणं वास्तुव्यवस्थापनं च।"},
  {cat:'business', icon:'compass',
    ne:"व्यवसाय सञ्चालन स्थानको दिशा, ऊर्जा प्रवाह, प्रवेशद्वार विश्लेषण", neD:"व्यवसाय स्थानको दिशा, ऊर्जा प्रवाह र प्रवेशद्वारसम्बन्धी विश्लेषण।",
    en:"Business Vastu Energy Analysis", enD:"Analysis of direction, energy flow and entrance of your business premises.",
    hi:"व्यवसाय वास्तु ऊर्जा विश्लेषण", hiD:"व्यवसाय स्थान की दिशा, ऊर्जा प्रवाह एवं प्रवेशद्वार का विश्लेषण।",
    sa:"व्यवसायवास्तु-ऊर्जाविश्लेषणम्", saD:"व्यवसायस्थानस्य दिशा, ऊर्जाप्रवाहः, प्रवेशद्वारं च विश्लेष्यते।"},

  // PERSONAL ENERGY
  {cat:'personal', icon:'heart',
    ne:"व्यक्तिगत ऊर्जा परीक्षण", neD:"व्यक्तिगत ऊर्जा परीक्षण तथा Vastu-based Energy Analysis।",
    en:"Personal Energy Test", enD:"Personal energy test and Vastu-based energy analysis.",
    hi:"व्यक्तिगत ऊर्जा परीक्षण", hiD:"व्यक्तिगत ऊर्जा जांच एवं वास्तु आधारित ऊर्जा विश्लेषण।",
    sa:"वैयक्तिकी ऊर्जापरीक्षा", saD:"वैयक्तिकी ऊर्जापरीक्षा वास्तु-आधारित-ऊर्जाविश्लेषणं च।"},
  {cat:'personal', icon:'heart',
    ne:"व्यक्तिगत ऊर्जा तथा स्थान अनुकूलता विश्लेषण", neD:"व्यक्ति र बसोबास/कार्यस्थलबीचको ऊर्जा सम्बन्धी विश्लेषण।",
    en:"Personal Energy & Space Compatibility", enD:"Analysis of energy compatibility between a person and their living/work space.",
    hi:"व्यक्तिगत ऊर्जा एवं स्थान अनुकूलता विश्लेषण", hiD:"व्यक्ति एवं निवास/कार्यस्थल के बीच ऊर्जा संबंधी विश्लेषण।",
    sa:"वैयक्तिकी ऊर्जा-स्थानानुकूलताविश्लेषणम्", saD:"व्यक्तेः वासस्थान-कार्यस्थलयोः मध्ये ऊर्जासम्बद्धं विश्लेषणम्।"},

  // HOUSE & ROOM VASTU
  {cat:'house', icon:'home2',
    ne:"कोठा तथा घरको Vastu Energy Test, Management तथा Remedy", neD:"कोठा र घरको वास्तु ऊर्जा परीक्षण, व्यवस्थापन र उपाय।",
    en:"Room & House Vastu Energy Test and Management with Remedy", enD:"Vastu energy test, management and remedy for rooms and homes.",
    hi:"कमरा एवं घर वास्तु ऊर्जा परीक्षण, प्रबंधन एवं उपाय", hiD:"कमरे एवं घर की वास्तु ऊर्जा जांच, प्रबंधन एवं उपाय।",
    sa:"कक्ष-गृहयोः वास्तु-ऊर्जापरीक्षा-व्यवस्थापन-उपायाः", saD:"कक्षस्य गृहस्य च वास्तु-ऊर्जापरीक्षा, व्यवस्थापनम्, उपायाश्च।"},
  {cat:'house', icon:'building',
    ne:"सम्पूर्ण घरको वास्तु परीक्षण तथा व्यवस्थापन", neD:"सम्पूर्ण घरको विस्तृत वास्तु विश्लेषण।",
    en:"Complete House Vastu Analysis", enD:"A detailed Vastu analysis of your entire house.",
    hi:"संपूर्ण घर वास्तु विश्लेषण", hiD:"संपूर्ण घर का विस्तृत वास्तु विश्लेषण।",
    sa:"सम्पूर्णगृहवास्तुविश्लेषणम्", saD:"सम्पूर्णस्य गृहस्य विस्तृतं वास्तुविश्लेषणम्।"},
  {cat:'house', icon:'bed',
    ne:"प्रत्येक कोठाको दिशा, स्थान, प्रयोगसम्बन्धी सुझाव", neD:"कोठा अनुसार दिशा र प्रयोगसम्बन्धी विस्तृत सुझाव।",
    en:"Room-wise Vastu Analysis", enD:"Direction, location and usage guidance for each room.",
    hi:"कमरा-वार वास्तु विश्लेषण", hiD:"प्रत्येक कमरे की दिशा, स्थान एवं उपयोग संबंधी सुझाव।",
    sa:"कक्षानुसारं वास्तुविश्लेषणम्", saD:"प्रत्येककक्षस्य दिशा, स्थानं, उपयोगसम्बद्धाः सुझावाश्च।"},

  // NUMEROLOGY + VASTU + ASTROLOGY
  {cat:'numerology', icon:'chart',
    ne:"मोबाइल नम्बर (Mobile Numerology) को आधारमा उपाय", neD:"मोबाइल नम्बर अनुसार परम्परागत वास्तु/अंकशास्त्र मार्गदर्शन।",
    en:"Remedy with Mobile Numerology", enD:"Traditional Vastu/Numerology guidance based on your mobile number.",
    hi:"मोबाइल न्यूमरोलॉजी आधारित उपाय", hiD:"मोबाइल नंबर के आधार पर पारंपरिक वास्तु/अंकशास्त्र मार्गदर्शन।",
    sa:"चलदूरभाषाङ्कशास्त्राधारितः उपायः", saD:"चलदूरभाषसंख्यानुसारं पारम्परिकं वास्तु/अङ्कशास्त्रमार्गदर्शनम्।"},
  {cat:'numerology', icon:'star',
    ne:"Numerology तथा Vastu को संयुक्त प्रणालीबाट भविष्यसम्बन्धी परामर्श", neD:"अंकशास्त्र र वास्तुको संयुक्त विश्लेषणमा आधारित मार्गदर्शन।",
    en:"Forecasting Guidance by Numerology + Vastu System", enD:"Guidance based on a combined Numerology and Vastu system.",
    hi:"न्यूमरोलॉजी + वास्तु संयुक्त प्रणाली से मार्गदर्शन", hiD:"अंकशास्त्र एवं वास्तु के संयुक्त विश्लेषण पर आधारित मार्गदर्शन।",
    sa:"अङ्कशास्त्र-वास्तु-संयुक्तप्रणाल्या मार्गदर्शनम्", saD:"अङ्कशास्त्र-वास्तुयोः संयुक्तविश्लेषणाधारितं मार्गदर्शनम्।"},
  {cat:'numerology', icon:'chart',
    ne:"Numerology + Astrology संयुक्त विश्लेषण", neD:"अंकशास्त्र र ज्योतिषको संयुक्त विश्लेषण।",
    en:"Numerology + Astrology", enD:"Combined analysis of Numerology and Astrology.",
    hi:"न्यूमरोलॉजी + ज्योतिष", hiD:"अंकशास्त्र एवं ज्योतिष का संयुक्त विश्लेषण।",
    sa:"अङ्कशास्त्रं + ज्योतिषम्", saD:"अङ्कशास्त्र-ज्योतिषयोः संयुक्तं विश्लेषणम्।"},

  // DIRECTION & SPACE ANALYSIS
  {cat:'direction', icon:'compass',
    ne:"दिशा–विदिशा परीक्षण", neD:"घर वा भवनको दिशा तथा उपदिशा सम्बन्धी परीक्षण।",
    en:"Direction & Sub-direction Analysis", enD:"Analysis of primary and sub-directions of your house or building.",
    hi:"दिशा–उपदिशा विश्लेषण", hiD:"घर या भवन की दिशा एवं उपदिशा संबंधी विश्लेषण।",
    sa:"दिशा-विदिशापरीक्षणम्", saD:"गृह-भवनयोः दिशा-विदिशासम्बद्धं परीक्षणम्।"},
  {cat:'direction', icon:'gate',
    ne:"मुख्य गेट / प्रवेशद्वारको दिशा तथा वास्तु विश्लेषण", neD:"मुख्य प्रवेशद्वारको दिशासम्बन्धी वास्तु विश्लेषण।",
    en:"Main Gate Analysis", enD:"Vastu and direction analysis of the main gate/entrance.",
    hi:"मुख्य गेट विश्लेषण", hiD:"मुख्य प्रवेशद्वार की दिशा संबंधी वास्तु विश्लेषण।",
    sa:"मुख्यद्वारविश्लेषणम्", saD:"मुख्यप्रवेशद्वारस्य दिशासम्बद्धं वास्तुविश्लेषणम्।"},
  {cat:'direction', icon:'compass',
    ne:"घर तथा भवनभित्र हावाको बहाव (Air Flow) विश्लेषण", neD:"भवनभित्र हावाको बहाव र ventilation सम्बन्धी विश्लेषण।",
    en:"Air Flow Analysis", enD:"Analysis of air flow, ventilation and space flow within the building.",
    hi:"वायु प्रवाह विश्लेषण", hiD:"भवन के भीतर वायु प्रवाह एवं वेंटिलेशन संबंधी विश्लेषण।",
    sa:"वायुप्रवाहविश्लेषणम्", saD:"भवनाभ्यन्तरे वायुप्रवाह-वातायनसम्बद्धं विश्लेषणम्।"},
  {cat:'direction', icon:'chart',
    ne:"फिल्ड जाँच तथा नक्सा/भवन योजना जाँच", neD:"स्थलगत निरीक्षण तथा नक्सा/भवन योजनाको जाँच — नक्सा, फोटो, भिडियो अपलोड गर्न सकिन्छ।",
    en:"Field Inspection & Map/Plan Inspection", enD:"On-site inspection plus review of map/building plan — upload maps, photos, or video.",
    hi:"फील्ड निरीक्षण एवं नक्शा/भवन योजना जांच", hiD:"स्थलगत निरीक्षण एवं नक्शा/भवन योजना की जांच।",
    sa:"क्षेत्रनिरीक्षणं नक्शा-भवनयोजनानिरीक्षणं च", saD:"स्थलीयं निरीक्षणं नक्शा-भवनयोजनायाः च परीक्षणम्।"},

  // COLOR VASTU
  {cat:'color', icon:'gem',
    ne:"रङ छनोट तथा वास्तु मार्गदर्शन (Color Vastu)", neD:"घर, कार्यालय, कोठा, प्रवेशद्वार, भित्ता, फर्निचरका लागि उपयुक्त रङसम्बन्धी मार्गदर्शन।",
    en:"Color Selection & Vastu Guidance", enD:"Guidance on appropriate colors for house, office, rooms, entrance, walls and furniture.",
    hi:"रंग चयन एवं वास्तु मार्गदर्शन", hiD:"घर, कार्यालय, कमरे, प्रवेशद्वार, दीवार एवं फर्नीचर हेतु उपयुक्त रंग संबंधी मार्गदर्शन।",
    sa:"वर्णचयनं वास्तुमार्गदर्शनं च", saD:"गृह-कार्यालय-कक्ष-प्रवेशद्वार-भित्ति-फर्निचरार्थम् उपयुक्तवर्णसम्बद्धं मार्गदर्शनम्।"},

  // OBJECT PLACEMENT
  {cat:'placement', icon:'home2',
    ne:"घर तथा कार्यालयमा वस्तुहरूको उचित स्थान निर्धारण", neD:"शौचालय, भण्डारण ट्यांकी, भ्यूँ, घडी, ऐना, दराज, तिजोरी, भान्सा, बेडरूम, पूजा कोठा आदिको उचित स्थान, दिशा र उपायसम्बन्धी सुझाव।",
    en:"Proper Placement of Household & Office Objects", enD:"Guidance on correct placement/direction for toilet, water tank, staircase, clock, mirror, cupboard, locker, kitchen, bedroom, puja room and more — including remedies if already misplaced.",
    hi:"घर एवं कार्यालय में वस्तुओं का उचित स्थान निर्धारण", hiD:"शौचालय, पानी टंकी, सीढ़ी, घड़ी, दर्पण, अलमारी, लॉकर, रसोई, शयनकक्ष, पूजा कक्ष आदि हेतु उचित स्थान एवं उपाय।",
    sa:"गृह-कार्यालययोः वस्तूनां समुचितस्थाननिर्धारणम्", saD:"शौचालय-जलाधार-सोपान-घटिका-दर्पण-आलमारी-लॉकर-पाकशाला-शयनकक्ष-पूजाकक्षादीनां समुचितं स्थानं दिशा उपायाश्च।"},

  // VASTU DOSHA / TRADITIONAL ANALYSIS
  {cat:'dosha', icon:'shield',
    ne:"वास्तु दोष परीक्षण", neD:"घर वा भवनमा भएको सम्भावित वास्तु दोषको पहिचान।",
    en:"Vastu Dosha Analysis", enD:"Identification of possible Vastu doshas in your house or building.",
    hi:"वास्तु दोष विश्लेषण", hiD:"घर या भवन में संभावित वास्तु दोष की पहचान।",
    sa:"वास्तुदोषपरीक्षणम्", saD:"गृह-भवनयोः सम्भाव्यवास्तुदोषस्य पहिचानः।"},
  {cat:'dosha', icon:'shield',
    ne:"पितृदोषसम्बन्धी परामर्श", neD:"पितृदोष सम्बन्धी परम्परागत परामर्श।",
    en:"Pitru Dosha Related Consultation", enD:"Traditional consultation regarding Pitru Dosha (ancestral affliction).",
    hi:"पितृदोष संबंधी परामर्श", hiD:"पितृदोष संबंधी पारंपरिक परामर्श।",
    sa:"पितृदोषसम्बद्धः परामर्शः", saD:"पितृदोषसम्बद्धः पारम्परिकः परामर्शः।"},
  {cat:'dosha', icon:'shield',
    ne:"कुलदोषसम्बन्धी परामर्श", neD:"कुलदोष सम्बन्धी परम्परागत परामर्श।",
    en:"Kula Dosha Related Consultation", enD:"Traditional consultation regarding Kula Dosha (lineage affliction).",
    hi:"कुलदोष संबंधी परामर्श", hiD:"कुलदोष संबंधी पारंपरिक परामर्श।",
    sa:"कुलदोषसम्बद्धः परामर्शः", saD:"कुलदोषसम्बद्धः पारम्परिकः परामर्शः।"},
  {cat:'dosha', icon:'shield',
    ne:"नागदोष तथा नागसम्बन्धी परम्परागत परामर्श", neD:"नागदोष सम्बन्धी परम्परागत मान्यतामा आधारित परामर्श।",
    en:"Naga Dosha / Naga-related Traditional Consultation", enD:"Traditional consultation regarding Naga Dosha based on customary belief.",
    hi:"नागदोष एवं नाग संबंधी पारंपरिक परामर्श", hiD:"नागदोष संबंधी पारंपरिक मान्यता पर आधारित परामर्श।",
    sa:"नागदोषः नागसम्बद्धः पारम्परिकः परामर्शश्च", saD:"नागदोषसम्बद्धः पारम्परिकमान्यताधारितः परामर्शः।"},
  {cat:'dosha', icon:'shield',
    ne:"नागसम्बन्धी परम्परागत पहिचान तथा विश्लेषण", neD:"परम्परागत मान्यताका आधारमा नागसम्बन्धी पहिचान।",
    en:"Naga Identification / Traditional Naga-related Analysis", enD:"Traditional identification and analysis related to Naga based on customary belief.",
    hi:"नाग संबंधी पारंपरिक पहचान एवं विश्लेषण", hiD:"पारंपरिक मान्यता के आधार पर नाग संबंधी पहचान।",
    sa:"नागसम्बद्धा पारम्परिकी पहिचानः विश्लेषणं च", saD:"पारम्परिकमान्यताधारेण नागसम्बद्धा पहिचानः।"},
  {cat:'dosha', icon:'shield',
    ne:"पिशाचादि तथा अन्य परम्परागत दोषसम्बन्धी परामर्श", neD:"अन्य परम्परागत दोष सम्बन्धी मान्यतामा आधारित परामर्श।",
    en:"Traditional Pishacha / Other Dosha Consultation", enD:"Consultation regarding other traditional doshas based on customary belief.",
    hi:"पिशाच आदि एवं अन्य पारंपरिक दोष संबंधी परामर्श", hiD:"अन्य पारंपरिक दोष संबंधी मान्यता पर आधारित परामर्श।",
    sa:"पिशाचादि-अन्यपारम्परिकदोषसम्बद्धः परामर्शः", saD:"अन्यपारम्परिकदोषसम्बद्धमान्यताधारितः परामर्शः।"},

  // TRADITIONAL & MODERN REMEDIES
  {cat:'remedies', icon:'book',
    ne:"आयुर्वेदिक तथा परम्परागत उपायसम्बन्धी मार्गदर्शन", neD:"आयुर्वेद तथा परम्परामा आधारित सामान्य मार्गदर्शन।",
    en:"Ayurvedic / Traditional Guidance", enD:"General guidance based on Ayurveda and tradition.",
    hi:"आयुर्वेदिक एवं पारंपरिक मार्गदर्शन", hiD:"आयुर्वेद एवं परंपरा पर आधारित सामान्य मार्गदर्शन।",
    sa:"आयुर्वेदिक-पारम्परिकोपायसम्बद्धं मार्गदर्शनम्", saD:"आयुर्वेद-परम्पराधारितं सामान्यं मार्गदर्शनम्।"},
  {cat:'remedies', icon:'fire',
    ne:"तन्त्र, मन्त्र तथा यन्त्रसम्बन्धी परम्परागत उपाय", neD:"परम्परागत मान्यताका आधारमा तन्त्र-मन्त्र-यन्त्र सम्बन्धी उपाय।",
    en:"Tantra, Mantra & Yantra Based Traditional Remedies", enD:"Traditional remedies based on Tantra, Mantra and Yantra as per customary belief.",
    hi:"तंत्र, मंत्र एवं यंत्र आधारित पारंपरिक उपाय", hiD:"पारंपरिक मान्यता के आधार पर तंत्र-मंत्र-यंत्र संबंधी उपाय।",
    sa:"तन्त्र-मन्त्र-यन्त्राधारिताः पारम्परिकोपायाः", saD:"पारम्परिकमान्यताधारेण तन्त्र-मन्त्र-यन्त्रसम्बद्धाः उपायाः।"},
  {cat:'remedies', icon:'home2',
    ne:"आधुनिक वास्तु व्यवस्थापन तथा Remedy", neD:"आधुनिक शैलीमा वास्तु व्यवस्थापन र उपाय।",
    en:"Modern Vastu Remedy Methods", enD:"Vastu management and remedies using modern approaches.",
    hi:"आधुनिक वास्तु प्रबंधन एवं उपाय", hiD:"आधुनिक शैली में वास्तु प्रबंधन एवं उपाय।",
    sa:"आधुनिकवास्तुव्यवस्थापनम् उपायाश्च", saD:"आधुनिकशैल्या वास्तुव्यवस्थापनम् उपायाश्च।"},
  {cat:'remedies', icon:'compass',
    ne:"वास्तु, ज्योतिष, अंकशास्त्र तथा परम्परागत उपायहरूको समन्वित परामर्श", neD:"वास्तु, ज्योतिष र अंकशास्त्रलाई एकीकृत गरी दिइने परामर्श।",
    en:"Integrated Vastu Remedy", enD:"Consultation integrating Vastu, Astrology, Numerology and traditional remedies.",
    hi:"एकीकृत वास्तु उपाय", hiD:"वास्तु, ज्योतिष एवं अंकशास्त्र को एकीकृत कर दिया जाने वाला परामर्श।",
    sa:"समन्वितः वास्तूपायः", saD:"वास्तु-ज्योतिष-अङ्कशास्त्राणां समन्वितः परामर्शः।"}
];

const SITE_CONFIG = window.JYOTISH_CONFIG || {};
let LANG = SITE_CONFIG.defaultLang || 'ne';
let currentView = 'home';
let consultType = 'online';
let authTab = 'login';
let vastuActiveCat = 'general';
let demoLoggedIn = false;
function announce(message){ const live = document.getElementById('uiAnnouncement'); if(live){ live.textContent=''; window.setTimeout(()=>{ live.textContent=message; },20); } }
/* ============================================================
   RENDER NAV / STATIC LABELS
============================================================ */
function buildNav(container, isDrawer){
  container.innerHTML='';
  const items = [['home','home'],['astrology','astrology'],['rashifal','rashifal'],['vastu','vastu'],['karmakanda','karmakanda'],['classes','classes'],['shop','shop'],['kundali','kundali'],['bookings','bookings'],['contact','contact'],['login','account']];
  items.forEach(([key,view])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = T[LANG].nav[key];
    b.setAttribute('aria-current', currentView === view ? 'page' : 'false');
    if(isDrawer) b.className='nav-item';
    b.onclick = ()=>{
      goView(view);
      if(isDrawer) toggleDrawer(false);
    };
    container.appendChild(b);
  });
}

const SERVICE_MENU_ITEMS = {
  astrology: [
    ['जन्म कुण्डली निर्माण', 'जन्म कुण्डली निर्माणको लागि बुकिङ गर्नुहोस्', 'kundali'],
    ['वार्षिक फलादेश', 'वार्षिक फलादेश', 'astrology'],
    ['दैनिक फलादेश', 'आजको दैनिक फलादेश', 'dailyHoroscopeSection'],
    ['विवाह कुण्डली मिलान', 'दुई जन्म विवरणको वास्तविक मिलान', 'marriage'],
    ['प्रश्न ज्योतिष', 'प्रति प्रश्न रु. १००', 'ask']
  ],
  vastu: [
    ['वास्तु विज्ञ तथा समाधान', 'अनुभवी वास्तु विज्ञहरूको विशेषज्ञ सेवा', 'vastuProjectStart'],
    ['वास्तु सेवा तथा विषयहरू', 'दिशा, कोठा, दोष, रेमेडी तथा निरीक्षण', 'vastuGrid'],
    ['नक्सा अपलोड गरी वास्तु विश्लेषण गर्नुहोस्', 'नक्सा तथा विवरणबाट प्रारम्भिक विश्लेषण', 'uploadTitle']
  ]
};

function openServiceMenu(type){
  const overlay = document.getElementById('serviceMenuOverlay');
  const title = document.getElementById('serviceMenuTitle');
  const grid = document.getElementById('serviceMenuGrid');
  if(!overlay || !title || !grid) return;
  title.textContent = type==='astrology' ? 'ज्योतिष' : 'वास्तु';
  document.getElementById('serviceMenuEyebrow').textContent = type==='astrology' ? 'ज्योतिष सेवाहरू' : 'वास्तु सेवाहरू';
  grid.innerHTML = SERVICE_MENU_ITEMS[type].map(([name,description,target])=>`<button class="service-menu-item" onclick="selectServiceMenu('${type}','${target}')"><strong>${name}</strong><span>${description}</span></button>`).join('');
  overlay.classList.add('open');
}

function closeServiceMenu(){ document.getElementById('serviceMenuOverlay')?.classList.remove('open'); }
function jumpToSection(targetId){
  const id = targetId || '';
  if(!id) return;
  const tryScroll = (attempt) => {
    const el = document.getElementById(id);
    if(el){
      const stickyOffset = 96;
      const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset;
      window.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    if(attempt < 4){ setTimeout(()=>tryScroll(attempt + 1), 120); }
  };
  tryScroll(0);
}

function selectServiceMenu(type,target){
  closeServiceMenu();
  const sectionIdMap = {
    marriage: 'marriageMatchingSection',
    dailyHoroscopeSection: 'dailyHoroscopeSection',
    vastuProjectStart: 'vastuProjectStart',
    vastuGrid: 'vastuGrid',
    uploadTitle: 'uploadTitle',
    kundali: 'view-kundali',
    ask: 'view-booking'
  };
  if(target==='kundali'){ goView('kundali'); return; }
  if(target==='ask'){ goToBookingWithType('ask'); return; }
  goView(type);
  const resolvedTarget = sectionIdMap[target] || target;
  setTimeout(()=>jumpToSection(resolvedTarget), 80);
}

function setText(id, val){ const el=document.getElementById(id); if(el) el.textContent=val; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
function isValidEmail(value){ return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()); }
function isValidPhone(value){ return !value || /^[+\d][\d\s().-]{6,19}$/.test(String(value).trim()); }

function renderStatic(){
  const t = T[LANG];
  document.documentElement.lang = LANG;
  setText('langSelectorLabel', t.langSelectorLabel);
  setText('fabCallLabel', t.fabCallLabel); setText('fabChatLabel', t.fabChatLabel); setText('fabBookLabel', t.fabBookLabel);
  renderChatWidgetStatic();
  document.getElementById('langNe').classList.toggle('active', LANG==='ne');
  document.getElementById('langEn').classList.toggle('active', LANG==='en');
  document.getElementById('langHi').classList.toggle('active', LANG==='hi');
  document.getElementById('langSa').classList.toggle('active', LANG==='sa');

  setText('brandName', t.brand);
  setText('footerBrandName', t.brand);
  document.getElementById('headerCta').textContent = t.headerCta;
  buildNav(document.getElementById('mainNav'), false);
  buildNav(document.getElementById('drawerNav'), true);

  // hero
  setText('heroEyebrow', t.heroEyebrow); setText('heroTitle', t.heroTitle); setText('heroLead', t.heroLead);
  setText('heroCta1', t.heroCta1); setText('heroCta2', t.heroCta2);
  setText('qlCall', t.qlCall); setText('qlWa', t.qlWa); setText('qlBook', t.qlBook);
  setText('heroCardTitle', t.heroCardTitle);
  const hcl = document.getElementById('heroCardList'); hcl.innerHTML='';
  t.heroCardList.forEach(x=>{ const li=document.createElement('li'); li.innerHTML = ICONS.check.replace('width="30" height="30"','width="16" height="16"') + '<span>'+x+'</span>'; hcl.appendChild(li); });

  // panchang bar (sitewide, below header)
  const now = new Date();
  const localeMap = {ne:'ne-NP', en:'en-US', hi:'hi-IN', sa:'hi-IN'};
  let adStr;
  try{ adStr = now.toLocaleDateString(localeMap[LANG]||'en-US', {year:'numeric',month:'long',day:'numeric'}); }
  catch(e){ adStr = now.toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}); }
  const bsLabel = {ne:'विक्रम सम्वत: ', en:'Bikram Sambat: ', hi:'विक्रम संवत: ', sa:'विक्रमाब्दः: '};
  let bsStrTop = '—';
  try{
    const NepaliDateCtor = nepaliDateConstructor();
    if(NepaliDateCtor){
      const nd = new NepaliDateCtor(now);
      const mName = (LANG==='en'?BS_MONTHS_EN:BS_MONTHS_NE)[nd.getMonth()];
      bsStrTop = `${nd.getDate()} ${mName} ${nd.getYear()}`;
    }
  }catch(e){ console.warn(e); }
  setText('panchangBS', bsLabel[LANG]+bsStrTop);
  setText('panchangAD', (LANG==='ne'?'ईस्वी: ':'AD: ')+adStr);
  setText('panchangDay', WEEKDAY_NAMES[LANG][now.getDay()]);
  setText('panchangLiveLink', t.liveLinkLabel);

  // stats
  const sg = document.getElementById('statsGrid'); sg.innerHTML='';
  t.statLabels.forEach(l=>{
    sg.insertAdjacentHTML('beforeend', `<div class="stat-card"><div class="stat-num">—</div><div class="stat-label">${l}</div><div class="stat-note">${t.statNote}</div></div>`);
  });

  // service overview
  setText('svcEyebrow', t.svcEyebrow); setText('svcTitle', t.svcTitle); setText('svcSub', t.svcSub);
  const sog = document.getElementById('serviceOverviewGrid'); sog.innerHTML='';
  t.overview.forEach(s=>{
    sog.insertAdjacentHTML('beforeend', `<div class="service-card">
      <div class="service-icon">${ICONS[s.icon]}</div>
      <h4>${s.t}</h4><p>${s.d}</p>
      <a href="#" class="btn btn-ghost" style="padding:8px 16px;font-size:.8rem;" onclick="goView('${s.view}');return false;">${s.cta}</a>
    </div>`);
  });

  // topics we help with
  setText('topicsEyebrow', t.topicsEyebrow); setText('topicsTitle', t.topicsTitle); setText('topicsSub', t.topicsSub);
  const tg = document.getElementById('topicsGrid'); if(tg){
    tg.innerHTML = t.topicsList.map(item=>`
      <div class="service-card">
        <div class="service-icon">${ICONS[item[1]] || ICONS.star}</div>
        <h4 style="font-size:.98rem;">${item[0]}</h4>
        <a href="#" class="btn btn-ghost" style="padding:8px 16px;font-size:.8rem;margin-top:8px;" onclick="goView('booking');return false;">${t.dirBookBtn}</a>
      </div>`).join('');
  }

  // homepage vastu highlight
  setText('homeVastuEyebrowEl', t.homeVastuHighlightEyebrow); setText('homeVastuTitleEl', t.homeVastuHighlightTitle);
  setText('viewAllVastuBtnEl', t.viewAllVastuBtn);
  const hvg = document.getElementById('homeVastuGrid');
  if(hvg){
    const highlightIdx = [0,6,3,17,15,8];
    hvg.innerHTML = highlightIdx.map(i=>{
      const s = VASTU_SERVICES_DETAILED[i];
      if(!s) return '';
      return `<div class="service-card">
        <div class="service-icon">${ICONS[s.icon]}</div>
        <h4 style="font-size:.95rem;">${s[LANG]}</h4>
        <p style="font-size:.83rem;">${s[LANG+'D']}</p>
      </div>`;
    }).join('');
  }

  // why choose us
  setText('whyEyebrow', t.whyEyebrow); setText('whyTitle', t.whyTitle);
  const wg = document.getElementById('whyGrid'); wg.innerHTML='';
  t.why.forEach(w=>{
    wg.insertAdjacentHTML('beforeend', `<div class="why-card"><div class="service-icon">${ICONS[w.icon]}</div><h4>${w.t}</h4><p>${w.d}</p></div>`);
  });

  // about
  setText('aboutEyebrow', t.aboutEyebrow); setText('aboutTitle', t.aboutTitle); setText('aboutSub', t.aboutSub);
  setText('profName', t.profName); setText('profBio', t.profBio); setText('profReadMore', t.profReadMore);
  const pf = document.getElementById('profFields'); pf.innerHTML='';
  t.profFields.forEach(f=>{ pf.insertAdjacentHTML('beforeend', `<div><b>${f[0]}</b><span class="placeholder-text">${f[1]}</span></div>`); });

  // how it works
  setText('howEyebrow', t.howEyebrow); setText('howTitle', t.howTitle); setText('howCta', t.howCta);
  const hg = document.getElementById('howGrid'); hg.innerHTML='';
  t.how.forEach((s,i)=>{ hg.insertAdjacentHTML('beforeend', `<div class="step-card"><div class="step-num">${i+1}</div><h4 style="font-size:1rem;">${s[0]}</h4><p style="font-size:.85rem;margin:0;">${s[1]}</p></div>`); });

  // articles
  setText('artEyebrow', t.artEyebrow); setText('artTitle', t.artTitle); setText('artSub', t.artSub);
  const ag = document.getElementById('articleGrid'); ag.innerHTML='';
  t.articles.forEach(a=>{ ag.insertAdjacentHTML('beforeend', `<div class="service-card"><div class="service-icon">${ICONS.book}</div><h4>${a[0]}</h4><p>${a[1]}</p><a href="#" class="btn btn-ghost" style="padding:8px 16px;font-size:.8rem;" onclick="return false;">${t.artCta}</a></div>`); });

  // videos
  setText('vidEyebrow', t.vidEyebrow); setText('vidTitle', t.vidTitle); setText('vidSub', t.vidSub);
  setText('vidCta', t.vidCta); setText('vidNote', t.vidNote);

  // testimonials
  setText('testiEyebrow', t.testiEyebrow); setText('testiTitle', t.testiTitle);
  setText('testiEmpty', t.testiEmpty); setText('testiGoogle', t.testiGoogle);

  // faq
  setText('faqEyebrow', t.faqEyebrow); setText('faqTitle', t.faqTitle);
  renderFaq(t.faqCats[0]);
  const ft = document.getElementById('faqTabs'); ft.innerHTML='';
  t.faqCats.forEach((c,i)=>{
    const b=document.createElement('button'); b.className='faq-tab'+(i===0?' active':''); b.textContent=c;
    b.onclick=()=>{ document.querySelectorAll('.faq-tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderFaq(c); };
    ft.appendChild(b);
  });

  // contact preview + full
  setText('contactEyebrow', t.contactEyebrow); setText('contactTitle', t.contactTitle); setText('contactFullBtn', t.contactFullBtn);
  const cBlockHtml = contactBlockHtml(t);
  document.getElementById('contactInfoBlock').innerHTML = cBlockHtml;
  document.getElementById('contactInfoBlockFull').innerHTML = cBlockHtml;

  // page heroes
  setText('astroBread', t.astroBread); setText('astroH1', t.astroH1); setText('astroP', t.astroP);
  setText('vastuBread', t.vastuBread); setText('vastuH1', t.vastuH1); setText('vastuP', t.vastuP);
  setText('bookBread', t.bookBread); setText('bookH1', t.bookH1); setText('bookP', t.bookP);
  setText('kundBread', t.kundBread); setText('kundH1', t.kundH1); setText('kundP', t.kundP);
  setText('cBread', t.cBread); setText('cH1', t.cH1); setText('cP', t.cP);
  setText('kundDisclaimer', t.kundDisclaimer);

  // astrology grid
  const ag2 = document.getElementById('astrologyGrid'); ag2.innerHTML='';
  ASTRO_SERVICES.forEach(s=>{
    const name = s[LANG];
    ag2.insertAdjacentHTML('beforeend', `<div class="service-card">
      <div class="service-icon">${ICONS[s.icon]}</div>
      <h4>${name}</h4>
      ${s.health?`<p style="font-size:.76rem;color:#a15b1f;">${t.healthNote}</p>`:''}
      ${s.ne==='वार्षिक फलादेश' ? '<p>दैनिक तथा वार्षिक मार्गदर्शन प्रशासकद्वारा प्रकाशित हुनेछ।</p>' : s.ne==='विवाह कुण्डली मिलान' ? '<div class="service-meta"><span>दुई प्रोफाइल आवश्यक</span><a href="#marriageMatchingSection" style="font-weight:700;color:var(--navy);">मिलान सुरु गर्नुहोस् →</a></div>' : `<div class="service-meta"><span class="price-pill">${s.ne==='प्रश्न ज्योतिष'?'रु. १०० प्रति प्रश्न':t.pricePlaceholder}</span>
      <a href="#" onclick="${s.ne==='प्रश्न ज्योतिष'?"goToBookingWithType('ask')":"goView('booking')"};return false;" style="font-weight:700;color:var(--navy);">${s.ne==='प्रश्न ज्योतिष'?'रु. १०० मा प्रश्न सोध्नुहोस्':LANG==='ne'?'बुक →':'Book →'}</a></div>`}
    </div>`);
  });

  // vastu grid (categorized)
  const vcTabs = document.getElementById('vastuCatTabs');
  if(vcTabs){
    vcTabs.innerHTML = VASTU_CATEGORIES.map(c=>`<button class="faq-tab ${vastuActiveCat===c.id?'active':''}" onclick="setVastuCat('${c.id}')">${c[LANG]}</button>`).join('');
  }
  const vg2 = document.getElementById('vastuGrid'); vg2.innerHTML='';
  if(vastuActiveCat==='general'){
    VASTU_SERVICES.forEach(s=>{
      const name = s[LANG];
      vg2.insertAdjacentHTML('beforeend', `<div class="service-card">
        <div class="service-icon">${ICONS[s.icon]}</div><h4>${name}</h4>
        <div class="service-meta"><span class="price-pill">${t.pricePlaceholder}</span>
        <a href="#" onclick="goView('booking');return false;" style="font-weight:700;color:var(--navy);">${LANG==='ne'?'बुक →':'Book →'}</a></div>
      </div>`);
    });
  } else {
    const items = VASTU_SERVICES_DETAILED.filter(s=>s.cat===vastuActiveCat);
    const disclaimerFor = (cat)=> cat==='numerology' ? t.vastuDisclaimerNumerology : cat==='dosha' ? t.vastuDisclaimerDosha : cat==='remedies' ? t.vastuDisclaimerRemedies : t.vastuDisclaimerGeneral;
    items.forEach((s,idx)=>{
      const title = s[LANG];
      const desc = s[LANG+'D'];
      vg2.insertAdjacentHTML('beforeend', `<div class="service-card">
        <div class="service-icon">${ICONS[s.icon]}</div>
        <h4 style="font-size:.98rem;">${title}</h4>
        <p style="font-size:.85rem;">${desc}</p>
        <details style="margin:6px 0 10px;">
          <summary style="cursor:pointer;color:var(--gold);font-weight:700;font-size:.8rem;">${t.moreInfoLabel}</summary>
          <p style="font-size:.78rem;color:var(--ink-soft);margin-top:6px;">${disclaimerFor(s.cat)}</p>
        </details>
        <div class="service-meta"><span class="price-pill">${t.pricePlaceholder}</span>
        <a href="#" onclick="goView('booking');return false;" style="font-weight:700;color:var(--navy);">${LANG==='ne'?'बुक →':'Book →'}</a></div>
      </div>`);
    });
  }

  // vastu upload form
  setText('vastuMapCta', t.vastuMapCta || (LANG==='en'?'Check Your Map':'नक्सा जाँच गर्नुहोस्'));
  setText('vastuAnalysisCta', t.vastuAnalysisCta || (LANG==='en'?'Start Vastu Analysis':'वास्तु विश्लेषण सुरु गर्नुहोस्'));
  setText('vastuPlatformEyebrow', t.vastuPlatformEyebrow || (LANG==='en'?'Vastu Analysis & Remedy':'Vastu Analysis & Remedy'));
  setText('vastuPlatformTitle', t.vastuPlatformTitle || (LANG==='en'?'Vastu Analysis and Remedies':'वास्तु विश्लेषण तथा समाधान'));
  setText('vastuPlatformSub', t.vastuPlatformSub || (LANG==='en'?'Get a map-based initial insight, then unlock a detailed expert-configured analysis.':'आफ्नो नक्सा तथा विवरणका आधारमा प्रारम्भिक संकेत र expert-configured विस्तृत विश्लेषण प्राप्त गर्नुहोस्।'));
  setText('uploadEyebrow', t.uploadEyebrow); setText('uploadTitle', t.uploadTitle);
  setText('vastuContextEyebrow', t.vastuPlatformEyebrow);
  setText('vastuContextTitle', t.vastuPlatformTitle);
  setText('vastuUploadContext', t.vastuPlatformSub || t.uploadHint);
  setText('uploadLabel', t.uploadLabel); setText('uploadHint', t.uploadHint);
  setText('vastuUploadNotice', t.vastuUploadNotice || (LANG==='en'?'Upload a clear map, floor plan or property photo.':'कृपया नक्सा स्पष्ट रूपमा Upload गर्नुहोस्।'));
  setText('vastuServiceTypeLabel', t.vastuServiceTypeLabel || (LANG==='en'?'Vastu service':'वास्तु सेवा'));
  setText('vastuTopicLabel', t.vastuTopicLabel || (LANG==='en'?'Specific topic':'विशेष विषय'));
  setText('vastuEntranceLabel', t.vastuEntranceLabel || (LANG==='en'?'Main entrance direction':'मुख्य प्रवेशद्वार दिशा'));
  setText('vastuStatusLabel', t.vastuStatusLabel || (LANG==='en'?'Construction status':'निर्माण अवस्था'));
  setText('lblDirection', t.lblDirection); setText('lblBuildingType', t.lblBuildingType);
  setText('lblLocationV', t.lblLocationV); setText('lblFloors', t.lblFloors); setText('lblProblem', t.lblProblem);
  setText('vastuSubmitBtn', t.vastuSubmitBtn);
  fillSelect('vDirection', t.directions); fillSelect('vBuildingType', t.buildingTypes);
  renderVastuDirectionFields();
  if(typeof loadLatestDailyHoroscope === 'function') loadLatestDailyHoroscope();
    if(typeof renderRashifal === 'function') renderRashifal();
  if(typeof renderVastuPlatform === 'function') renderVastuPlatform();
  if(typeof renderMarriageMatchForm === 'function') renderMarriageMatchForm();

  // footer
  setText('fServicesH', t.fServicesH); setText('fQuickH', t.fQuickH); setText('fContactH', t.fContactH);
  setText('fLinkAstro', t.fLinkAstro); setText('fLinkVastu', t.fLinkVastu); setText('fLinkKundali', t.fLinkKundali); setText('fLinkBook', t.fLinkBook);
  setText('fLinkDirectory', t.nav.directory); setText('fLinkClasses', t.nav.classes);
  setText('fLinkHome', t.fLinkHome); setText('fLinkAbout', t.fLinkAbout); setText('fLinkContact2', t.fLinkContact2);
  setText('fLinkPrivacy', t.fLinkPrivacy); setText('fLinkTerms', t.fLinkTerms);
  setText('footerAbout', t.footerAbout);
  setText('fAddr', t.contactAddr+': '+t.contactAddrV);
  setText('fPhone', t.contactPhone+': '+t.contactPhoneV);
  setText('fEmail', t.contactEmail+': '+t.contactEmailV);
  setText('fCopyright', t.fCopyright); setText('fDisclaimerShort', t.fDisclaimerShort);

  // bottom nav
  const bn = document.getElementById('bottomNav');
  bn.innerHTML = `
   <button onclick="goView('home')" class="${currentView==='home'?'active':''}">${ICONS.home2}<span>${t.bottomHome}</span></button>
   <button onclick="goView('astrology')" class="${currentView==='astrology'?'active':''}">${ICONS.star}<span>${t.bottomServices}</span></button>
   <button onclick="goView('booking')" class="book ${currentView==='booking'?'active':''}">${ICONS.compass}<span>${t.bottomBook}</span></button>
   <a href="https://wa.me/9779851001890" target="_blank" rel="noopener" style="flex:1;text-align:center;text-decoration:none;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink-soft);font-size:.66rem;font-weight:600;">${ICONS.chart.replace(/chart|<svg[^>]*>/,'')}<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 3.9A10 10 0 0 0 3.6 16.4L2 22l5.8-1.5A10 10 0 1 0 20 3.9z" stroke="currentColor" stroke-width="1.6"/></svg><span>${t.bottomWa}</span></a>
   <a href="tel:+9779851001890" style="flex:1;text-align:center;text-decoration:none;padding:9px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink-soft);font-size:.66rem;font-weight:600;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" stroke="currentColor" stroke-width="1.6"/></svg><span>${t.bottomCall}</span></a>
  `;

  renderBooking();
  renderKundali();
  renderContactForm();
  renderBookingsAdmin();
  setText('questionConsultationsTitleEl', t.questionConsultationsTitle);
  setText('questionConsultationsRefreshEl', t.bookingsRefresh);
  if(typeof renderQuestionConsultationsAdmin === 'function') renderQuestionConsultationsAdmin();
  if(typeof renderDailyHoroscopeAdmin === 'function') renderDailyHoroscopeAdmin();
  if(typeof renderRashifalAdmin === 'function') renderRashifalAdmin();

  // ---- new sections ----
  setText('kkTitleEl', t.kkTitle); setText('kkSubEl', t.kkSub);
  setText('kkChoosePurohitLabel', t.kkChoosePurohitLabel); setText('kkPurohitNote', t.kkPurohitNote);
  const kps = document.getElementById('kkPurohitSelect');
  if(kps){ kps.innerHTML = `<option>${t.profName}</option>`; }
  setText('qlCallBook', t.qlCall); setText('qlWaBook', t.qlWa); setText('qlViberBook', t.qlViber);
  const kg = document.getElementById('kkGrid'); if(kg){
    kg.innerHTML='';
    t.kkList.forEach(k=>{ kg.insertAdjacentHTML('beforeend', `<div class="service-card"><div class="service-icon">${ICONS.temple}</div><h4>${k[0]}</h4><p>${k[1]}</p><a href="#" class="btn btn-ghost" style="padding:8px 16px;font-size:.8rem;" onclick="goView('booking');return false;">${t.dirBookBtn}</a></div>`); });
  }

  setText('dirTitleEl', t.dirTitle); setText('dirSubEl', t.dirSub);
  setText('dirAstroHeading', t.dirAstroSectionTitle); setText('dirPurohitHeading', t.dirPurohitSectionTitle);
  setText('dirPurohitEmptyEl', t.dirPurohitEmpty);
  setText('dirProfName', t.profName);
  setText('dirBookBtnEl', t.dirBookBtn); setText('dirChatBtnEl', t.dirChatBtn); setText('dirAskBtnEl', t.dirAskBtn);
  const dpf = document.getElementById('dirProfFields'); if(dpf){
    dpf.innerHTML=''; t.profFields.forEach(f=>{ dpf.insertAdjacentHTML('beforeend', `<div><b>${f[0]}</b><span>${f[1]}</span></div>`); });
  }
  const dcb = document.getElementById('dirChatBtnEl'), dab = document.getElementById('dirAskBtnEl');
  if(dcb) dcb.onclick = (e)=>{ e.preventDefault(); goToBookingWithType('chat'); };
  if(dab) dab.onclick = (e)=>{ e.preventDefault(); goToBookingWithType('ask'); };

  renderCtPicker();
  updateCtVisibility();
  if(consultType==='ask') renderAsk();
  if(consultType==='chat') renderChat();

  setText('accHeading', demoLoggedIn ? t.myAccTitle : (authTab==='login'?t.authLoginTab:t.authRegisterTab));
  setText('authDemoBannerEl', t.authDemoBanner);
  setText('authTabLoginBtn', t.authLoginTab); setText('authTabRegisterBtn', t.authRegisterTab);
  document.getElementById('authTabLoginBtn')?.classList.toggle('active', authTab==='login');
  document.getElementById('authTabRegisterBtn')?.classList.toggle('active', authTab==='register');
  setText('myAccDemoNoteEl', t.myAccDemoNote);
  setText('demoLogoutBtn', LANG==='ne'?'लगआउट गर्नुहोस्':LANG==='hi'?'लॉगआउट करें':LANG==='sa'?'निर्गच्छतु':'Log Out');
  document.getElementById('accAuthBlock').style.display = demoLoggedIn ? 'none' : 'block';
  document.getElementById('accMyAccountBlock').style.display = demoLoggedIn ? 'block' : 'none';
  if(demoLoggedIn){ renderMyAccount(); } else { renderAuthForm(); }

  setText('vcEyebrow', t.vcEyebrow); setText('vcTitle', t.vcTitle); setText('vcHint', t.vcHint);
  setText('vcRoomLabelEl', t.vcRoomLabel); setText('vcNoteLabelEl', t.vcNoteLabel); setText('vcSaveBtn', t.vcSaveNote);
  setText('vcPinsHeadingEl', t.vcPinsHeading); setText('vcDownloadBtn', t.vcDownload); setText('vcClearBtn', t.vcClear);
  const vcMsg = document.getElementById('vcNoPlanMsg');
  if(vcMsg && !vcState.img){ vcMsg.textContent = t.vcUploadFirst; }
  renderVcPinsList();
  renderShop();
  renderClasses();
  renderPanchangaPage();
}

function contactBlockHtml(t){
  return `
   <div class="service-card" style="margin-bottom:14px;display:flex;gap:12px;align-items:flex-start;"><span style="color:var(--gold);flex-shrink:0;margin-top:2px;">${ICONS.pinIcon}</span><div><b style="color:var(--navy);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;">${t.contactAddr}</b><p style="margin:6px 0 0;">${t.contactAddrV}</p></div></div>
   <div class="service-card" style="margin-bottom:14px;display:flex;gap:12px;align-items:flex-start;"><span style="color:var(--gold);flex-shrink:0;margin-top:2px;">${ICONS.phoneIcon}</span><div><b style="color:var(--navy);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;">${t.contactPhone} / ${t.contactWa}</b><p style="margin:6px 0 0;">${t.contactPhoneV}</p></div></div>
   <div class="service-card" style="margin-bottom:14px;display:flex;gap:12px;align-items:flex-start;"><span style="color:var(--gold);flex-shrink:0;margin-top:2px;">${ICONS.mailIcon}</span><div><b style="color:var(--navy);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;">${t.contactEmail}</b><p style="margin:6px 0 0;">${t.contactEmailV}</p></div></div>
   <div class="service-card" style="display:flex;gap:12px;align-items:flex-start;"><span style="color:var(--gold);flex-shrink:0;margin-top:2px;">${ICONS.clock}</span><div><b style="color:var(--navy);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;">${t.contactHours}</b><p style="margin:6px 0 0;">${t.contactHoursV}</p></div></div>
  `;
}

function fillSelect(id, arr){
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML=''; arr.forEach(v=>{ const o=document.createElement('option'); o.textContent=v; el.appendChild(o); });
}

function renderFaq(cat){
  const t = T[LANG];
  const list = document.getElementById('faqList'); list.innerHTML='';
  (t.faq[cat]||[]).forEach(([q,a])=>{
    const div = document.createElement('div'); div.className='faq-item';
    div.innerHTML = `<button class="faq-q">${q} ${ICONS.chevron}</button><div class="faq-a"><p>${a}</p></div>`;
    div.querySelector('.faq-q').onclick = ()=> div.classList.toggle('open');
    list.appendChild(div);
  });
}

/* ============================================================
   VIEW / LANG SWITCH
============================================================ */
function scrollFormPanelToTop(){
  const preferredByView = {
    astrology: '#marriageMatchingSection',
    vastu: '#uploadTitle',
    classes: '#enrollPanelWrap',
    shop: '#orderPanelWrap',
    kundali: '#kundaliPanel',
    booking: '#bookingPanel',
    contact: '#contactForm'
  };

  const candidates = [
    preferredByView[currentView],
    '#marriageMatchingSection',
    '#dailyHoroscopeSection',
    '#uploadTitle',
    '#enrollPanelWrap',
    '#orderPanelWrap',
    '#kundaliPanel',
    '#kundaliChartPanel',
    '#vastuProjectStart',
    '#bookingPanel',
    '#contactForm'
  ].filter(Boolean);

  const target = candidates.find(selector => {
    const el = document.querySelector(selector);
    if(!el) return false;
    const inActiveView = !el.closest('.view') || el.closest('.view')?.classList.contains('active');
    const visible = window.getComputedStyle(el).display !== 'none' && (el.offsetParent !== null || el.getClientRects().length > 0);
    return inActiveView && visible;
  });

  const finalTarget = target ? document.querySelector(target) : null;
  if(finalTarget){
    finalTarget.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }

  window.scrollTo({top:0, behavior:'smooth'});
}

function setVastuCat(catId){
  vastuActiveCat = catId;
  renderStatic();
  setTimeout(scrollFormPanelToTop, 60);
}

function goView(view, anchor){
  currentView = view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  window.scrollTo({top:0, behavior:'instant' in window ? 'auto':'auto'});
  window.scrollTo(0,0);
  renderStatic(); // refresh active states (bottom nav)
  const activeView = document.getElementById('view-'+view);
  const heading = activeView?.querySelector('h1, h2');
  if(heading){
    heading.setAttribute('tabindex','-1');
    window.setTimeout(()=>heading.focus({preventScroll:true}),60);
  }
  announce(activeView?.querySelector('h1')?.textContent || view);
  if(anchor){
    setTimeout(()=>{ const el=document.getElementById('anchor-'+anchor); if(el) el.scrollIntoView({behavior:'smooth'}); }, 60);
    return;
  }
  setTimeout(scrollFormPanelToTop, 80);
}

function openQuickAction(type){
  if(type === 'call'){
    window.location.href = 'tel:+9779851001890';
    return;
  }
  if(type === 'whatsapp'){
    window.open('https://wa.me/9779851001890', '_blank', 'noopener');
    return;
  }
  if(type === 'viber'){
    window.location.href = 'viber://chat?number=%2B9779851001890';
    return;
  }
  if(type === 'booking'){
    goView('booking');
    return;
  }
}

function setLang(l){ LANG = l; renderStatic(); closeLangMenu(); announce((T[LANG]?.langSelectorLabel || 'Language') + ': ' + (T[LANG]?.nav?.home || l)); }

function toggleLangMenu(e){
  if(e) e.stopPropagation();
  const menu = document.getElementById('langMenu');
  const btn = document.getElementById('langSwitchBtn');
  const willOpen = !menu.classList.contains('open');
  menu.classList.toggle('open', willOpen);
  btn.classList.toggle('open', willOpen);
  btn.setAttribute('aria-expanded', String(willOpen));
}
function closeLangMenu(){
  document.getElementById('langMenu')?.classList.remove('open');
  document.getElementById('langSwitchBtn')?.classList.remove('open');
  document.getElementById('langSwitchBtn')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', function(e){
  const wrap = document.querySelector('.lang-switch');
  if(wrap && !wrap.contains(e.target)) closeLangMenu();
});

function toggleDrawer(open){
  const drawer = document.getElementById('drawer');
  if(!drawer) return;
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  if(open) drawer.querySelector('.drawer-close')?.focus();
  else document.querySelector('.burger')?.focus();
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2600);
}

/* ============================================================
   IN-SITE CHAT WIDGET MODULE
   Chat widget logic is now in js/chat-widget.js
============================================================ */

/* ============================================================
   VASTU UPLOAD MODULE
   Vastu annotation logic is now in js/vastu-upload.js
   Functions: handlePlanUpload, loadVcImage, redrawVcCanvas, vcCanvasClick,
   saveVcPin, deleteVcPin, clearVcPins, downloadVcCanvas, renderVcPinsList,
   submitVastu — and the vcState object are all defined in the vastu-upload module.
============================================================ */

/* ============================================================
   CONSULTATION TYPE PICKER (Online / Chat / Ask One Question)
============================================================ */
function renderCtPicker(){
  const t = T[LANG];
  const el = document.getElementById('ctPicker');
  if(!el) return;
  const cards = [
    ['online', t.ctOnline, t.feeOnline, 'compass', t.ctOnlineD || ''],
    ['chat', t.ctChat, t.feeChat, 'briefcase', t.ctChatD || ''],
    ['ask', t.ctAsk, t.feeAsk, 'star', t.ctAskD || '']
  ];
  el.innerHTML = cards.map(([type,title,fee,icon,desc])=>`
    <button type="button" class="consult-type-card ${consultType===type ? 'selected' : ''}" onclick="setConsultType('${type}')">
      <span class="consult-type-icon">${ICONS[icon]}</span>
      <span class="consult-type-copy">
        <strong>${title}</strong>
        <small>${desc || ''}</small>
      </span>
      <span class="consult-type-price">${fee}</span>
    </button>`).join('');
  setText('ctPickerTitleEl', t.ctPickerTitle);
}

function updateCtVisibility(){
  const onlineBlock = document.getElementById('ctOnlineBlock');
  const chatBlock = document.getElementById('ctChatBlock');
  const askBlock = document.getElementById('ctAskBlock');
  if(onlineBlock) onlineBlock.style.display = consultType==='online' ? 'block' : 'none';
  if(chatBlock) chatBlock.style.display = consultType==='chat' ? 'block' : 'none';
  if(askBlock) askBlock.style.display = consultType==='ask' ? 'block' : 'none';
}

function setConsultType(type){
  consultType = type;
  renderCtPicker();
  updateCtVisibility();
  if(type==='ask') renderAsk();
  if(type==='chat') renderChat();
}

function goToBookingWithType(type){
  consultType = type;
  goView('booking');
}

/* ============================================================
   ASK ONE QUESTION MODULE
   Ask question logic is now in js/ask-flow.js
============================================================ */

/* ============================================================
   AUTH / ACCOUNT MODULE
   Demo login/register logic is now in js/auth-module.js
============================================================ */

/* ============================================================
   SHOP / ORDER MODULE
   Order flow is now in js/shop-module.js
============================================================ */

/* ============================================================
   ONLINE CLASSES + ENROLL MODULE
   Enrollment flow is now in js/classes-module.js
============================================================ */

/* ============================================================
   BOOKING WIZARD
============================================================ */
function renderTopStepBar(elId, topStep, labels){
  const t = T[LANG];
  const bar = document.getElementById(elId);
  if(!bar) return;
  const lbls = labels || [t.stepDetails, t.stepPayment, t.stepConfirmation];
  bar.innerHTML = lbls.map((s,i)=>{
    const n=i+1; let cls = n<topStep?'done':(n===topStep?'current':'');
    return `<div class="b-step ${cls}">${s}</div>`;
  }).join('');
}

/* ---- shared BS/AD-aware "Your Details" form ---- */
const BS_MONTHS_EN = ['Baisakh','Jestha','Asar','Shrawan','Bhadra','Aswin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const BS_MONTHS_NE = ['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पौष','माघ','फाल्गुण','चैत्र'];

function nepaliDateConstructor(){
  return typeof NepaliDate === 'function' ? NepaliDate : (NepaliDate && NepaliDate.default);
}
function yearOptions(sel){ let s='<option value="">--</option>'; for(let y=2000;y<=2090;y++){ s+=`<option value="${y}" ${String(sel)===String(y)?'selected':''}>${y}</option>`; } return s; }
function monthOptions(sel){ const names = LANG==='en'?BS_MONTHS_EN:BS_MONTHS_NE; let s='<option value="">--</option>'; names.forEach((n,i)=>{ const v=i+1; s+=`<option value="${v}" ${String(sel)===String(v)?'selected':''}>${n}</option>`; }); return s; }
function dayOptions(sel){ let s='<option value="">--</option>'; for(let d=1;d<=32;d++){ s+=`<option value="${d}" ${String(sel)===String(d)?'selected':''}>${d}</option>`; } return s; }

function bsToAdString(y,m,d){
  try{
    const NepaliDateCtor = nepaliDateConstructor();
    if(!NepaliDateCtor) return null;
    const nd = new NepaliDateCtor(parseInt(y,10), parseInt(m,10)-1, parseInt(d,10));
    const jsDate = nd.toJsDate();
    if(!jsDate || isNaN(jsDate.getTime())) return null;
    return `${jsDate.getFullYear()}-${String(jsDate.getMonth()+1).padStart(2,'0')}-${String(jsDate.getDate()).padStart(2,'0')}`;
  }catch(e){ console.warn('BS→AD conversion failed', e); return null; }
}
function adStringToBs(adStr){
  try{
    const NepaliDateCtor = nepaliDateConstructor();
    if(!NepaliDateCtor || !adStr) return null;
    const parts = adStr.split('-').map(Number);
    const localDate = new Date(parts[0], parts[1]-1, parts[2]);
    const nd = new NepaliDateCtor(localDate);
    return { year: nd.getYear(), month: nd.getMonth()+1, day: nd.getDate() };
  }catch(e){ console.warn('AD→BS conversion failed', e); return null; }
}

function getFlowState(flow){ if(flow==='booking') return bookingState; if(flow==='chat') return chatState; if(flow==='ask') return askState; }
function rerenderFlow(flow){ if(flow==='booking') renderBooking(); if(flow==='chat') renderChat(); if(flow==='ask') renderAsk(); }
function setFlowField(flow, field, value){ getFlowState(flow)[field] = value; }
function setFlowBs(flow, part, value){
  const s = getFlowState(flow);
  if(part==='year') s.dobBsYear=value;
  if(part==='month') s.dobBsMonth=value;
  if(part==='day') s.dobBsDay=value;
  if(s.dobBsYear && s.dobBsMonth && s.dobBsDay){
    const ad = bsToAdString(s.dobBsYear, s.dobBsMonth, s.dobBsDay);
    if(ad) s.dobAd = ad;
  }
  s._error = null;
  rerenderFlow(flow);
}
function setFlowAd(flow, value){
  const s = getFlowState(flow);
  s.dobAd = value;
  if(value){
    const bs = adStringToBs(value);
    if(bs){ s.dobBsYear=bs.year; s.dobBsMonth=bs.month; s.dobBsDay=bs.day; }
  }
  s._error = null;
  rerenderFlow(flow);
}

function renderDetailsFieldsHtml(flow, state, t, includeMessage){
  const l = t.labels;
  const optTag = `<span style="font-weight:400;color:var(--ink-soft);font-size:.76rem;"> ${t.optionalLabel}</span>`;
  let preview = '';
  if(state.dobBsYear && state.dobBsMonth && state.dobBsDay && state.dobAd){
    const mName = (LANG==='en'?BS_MONTHS_EN:BS_MONTHS_NE)[state.dobBsMonth-1] || state.dobBsMonth;
    preview = `<p style="font-size:.82rem;color:var(--navy);font-weight:600;margin-top:8px;">${escapeHtml(state.dobBsDay)} ${escapeHtml(mName)} ${escapeHtml(state.dobBsYear)} वि.सं. &nbsp;•&nbsp; AD ${escapeHtml(state.dobAd)}</p>`;
  }
  let html = `<h3>${t.yourDetails}</h3><div class="form-grid cols-2">
    <div class="field"><label>${l.name} *</label><input value="${escapeHtml(state.name)}" oninput="setFlowField('${flow}','name',this.value)"></div>
    <div class="field"><label>${l.phone}${optTag}</label><input value="${escapeHtml(state.phone)}" oninput="setFlowField('${flow}','phone',this.value)"></div>
    <div class="field"><label>${l.email}${optTag}</label><input type="email" value="${escapeHtml(state.email)}" oninput="setFlowField('${flow}','email',this.value)"></div>
    <div class="field"><label>${l.pob} *</label><input value="${escapeHtml(state.pob)}" oninput="setFlowField('${flow}','pob',this.value)"></div>
    <div class="field"><label>${t.birthCountryLabel} *</label><input value="${escapeHtml(state.birthCountry)}" oninput="setFlowField('${flow}','birthCountry',this.value)"></div>
    <div class="field"><label>${l.tob} *</label><input type="time" value="${escapeHtml(state.tob)}" onchange="setFlowField('${flow}','tob',this.value)"></div>
  </div>
  <div style="margin-top:16px;border:1px solid var(--line);border-radius:12px;padding:16px;background:var(--cream);">
    <label style="font-weight:700;color:var(--navy);">${l.dob} *</label>
    <div class="form-grid cols-2" style="margin-top:10px;">
      <div>
        <label style="font-size:.78rem;">${t.dobBsLabel}</label>
        <div style="display:flex;gap:6px;">
          <select onchange="setFlowBs('${flow}','year',this.value)">${yearOptions(state.dobBsYear)}</select>
          <select onchange="setFlowBs('${flow}','month',this.value)">${monthOptions(state.dobBsMonth)}</select>
          <select onchange="setFlowBs('${flow}','day',this.value)">${dayOptions(state.dobBsDay)}</select>
        </div>
      </div>
      <div>
        <label style="font-size:.78rem;">${t.dobAdLabel}</label>
        <input type="date" value="${escapeHtml(state.dobAd||'')}" onchange="setFlowAd('${flow}',this.value)">
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--ink-soft);margin-top:8px;">${t.dobConvertNote}</p>
    ${preview}
  </div>`;
  if(includeMessage){
    html += `<div class="field" style="margin-top:14px;"><label>${l.message}</label><textarea rows="3" oninput="setFlowField('${flow}','message',this.value)">${escapeHtml(state.message||'')}</textarea></div>`;
  }
  return html;
}

function renderPaymentStepHtmlFor(prefix, t, fee, state){
  const instr = t.payInstructions.replace('{fee}', `<b>${fee}</b>`);
  return `<div class="payment-step-wrap">
      <div class="payment-header">
        <h3>${t.paymentTitle}</h3>
        <span class="payment-badge">${fee}</span>
      </div>
      <div class="disclaimer-box payment-box">${instr}</div>
      <div class="payment-option-row">
        <label class="payment-check">
          <input type="checkbox" ${state.paymentAttested?'checked':''} onchange="${prefix}_setAttested(this.checked)">
          <span>${t.payAttestLabel}</span>
        </label>
      </div>
      <div class="field payment-field"><label>${t.payRefLabel}</label><input value="${escapeHtml(state.paymentRef)}" oninput="${prefix}_setPaymentRef(this.value)"></div>
    </div>`;
}

function detailsValidationError(state){
  const missing = !state.name || !state.pob || !state.birthCountry || !state.tob || !state.dobAd;
  if(missing) return T[LANG].validationRequired;
  if(!isValidEmail(state.email)) return LANG==='ne' ? 'कृपया मान्य इमेल लेख्नुहोस्।' : 'Please enter a valid email address.';
  if(!isValidPhone(state.phone)) return LANG==='ne' ? 'कृपया मान्य फोन नम्बर लेख्नुहोस्।' : 'Please enter a valid phone number.';
  const birthDate = new Date(`${state.dobAd}T00:00:00`);
  if(Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return LANG==='ne' ? 'जन्म मिति मान्य र भविष्यको नभएको हुनुपर्छ।' : 'Birth date must be valid and cannot be in the future.';
  return '';
}
function detailsValid(state){ return !detailsValidationError(state); }

/* ============================================================
   LIVE PANCHANGA / MUHURTA MODULE
   Panchanga calculations are now in js/panchanga-muhurta.js
============================================================ */

/* ============================================================
   BOOKING WIZARD MODULE
   Booking logic is now in js/booking-flow.js
============================================================ */

/* ============================================================
   KUNDALI FORM MODULE
   Kundali form logic is now in js/kundali-form.js
============================================================ */

/* ============================================================
   CONTACT FORM MODULE
   Contact form logic is now in js/contact-form.js
============================================================ */

/* ============================================================
   INIT
============================================================ */
// bootstrap handled by site-bootstrap.js to keep startup decoupled

