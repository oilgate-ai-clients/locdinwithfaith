// Loc'd In with Faith — 24 flyer-inspired switchable brand logos (all CSS-token styled, Cormorant + DM Sans + vector calligraphy only).
(function () {
  const SPARK = '<svg class="fl-ic fl-spark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5c.8 6.4 3.1 8.7 9.5 9.5-6.4.8-8.7 3.1-9.5 9.5-.8-6.4-3.1-8.7-9.5-9.5 6.4-.8 8.7-3.1 9.5-9.5z"/></svg>';
  const HEART = '<svg class="fl-ic fl-heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M12 20.2C7.2 16.4 3.5 13 3.5 8.8A4.6 4.6 0 0 1 8 4.2c1.8 0 3.2 1 4 2.4.8-1.4 2.2-2.4 4-2.4a4.6 4.6 0 0 1 4.5 4.6c0 4.2-3.7 7.6-8.5 11.4z"/></svg>';
  const HEART_FILL = '<svg class="fl-ic fl-heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.5C7 16.5 3.2 12.8 3.2 8.6A4.7 4.7 0 0 1 7.9 3.9c1.9 0 3.4 1 4.1 2.4.7-1.4 2.2-2.4 4.1-2.4a4.7 4.7 0 0 1 4.7 4.7c0 4.2-3.8 7.9-8.8 11.9z"/></svg>';
  const BOW = '<svg class="fl-ic fl-bow" viewBox="0 0 48 30" aria-hidden="true"><use href="#i-bow"/></svg>';
  const LOC_MARK = '<svg class="fl-ic fl-loc" viewBox="0 0 28 28" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M9 4c4 3 4 7 0 10s-4 7 0 10M19 4c-4 3-4 7 0 10s4 7 0 10M14 3v22"/></svg>';
  const SWOOSH = '<svg class="fl-swoosh" viewBox="0 0 180 14" preserveAspectRatio="none" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M4 10Q62 1 176 7"/></svg>';
  const CROWN = '<svg class="fl-ic fl-crown" viewBox="0 0 28 18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M3 14.5 5 5l6 4.5L14 3l3 6.5L23 5l2 9.5z"/></svg>';
  const SCRIPT_WITH_FAITH = '<svg class="fl-script-svg" viewBox="0 0 7368 2555" aria-hidden="true"><use href="#faith-wordmark"/></svg>';
  const SCRIPT_FAITH = '<svg class="fl-faith-svg" viewBox="0 0 3950 2555" aria-hidden="true"><use href="#faith-signature"/></svg>';

  const wordmarkDefs = [
    {
      id: 'flyer-chrome-pink',
      name: 'Flyer Chrome Pink (Default)',
      group: 'Flyer Chrome & Script',
      note: 'Inspired directly by her black + glossy pink reattachment flyer.',
      render: () => `<span class="fl-logo fl-v-chrome"><span class="fl-deco">${SPARK}</span><span class="fl-stack"><span class="fl-main fl-chrome-text">LOC'D IN</span><span class="fl-subline"><span class="fl-script">${SCRIPT_WITH_FAITH}</span><span class="fl-deco-sm">${HEART}</span></span></span></span>`
    },
    {
      id: 'flyer-stacked-crest',
      name: 'Flyer Stacked Crest',
      group: 'Flyer Chrome & Script',
      note: 'Tracked serif overline with twin flyer hairlines and white-pink script.',
      render: () => `<span class="fl-logo fl-v-crest"><span class="fl-stack"><span class="fl-overline"><i></i><span>LOC'D IN</span><i></i></span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span></span>`
    },
    {
      id: 'neon-gloss-script',
      name: 'Hot Pink Script Glow',
      group: 'Flyer Chrome & Script',
      note: 'Bright bubblegum script forward with double four-point flyer sparkles.',
      render: () => `<span class="fl-logo fl-v-glow"><span class="fl-deco">${SPARK}</span><span class="fl-stack"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-script fl-pink-glow">${SCRIPT_WITH_FAITH}</span></span><span class="fl-deco-sm">${SPARK}</span></span>`
    },
    {
      id: 'chrome-heart-badge',
      name: 'Chrome Heart Emblem',
      group: 'Flyer Chrome & Script',
      note: 'Hand-drawn glossy pink heart mark beside crisp two-tier lettering.',
      render: () => `<span class="fl-logo fl-v-heart"><span class="fl-mark-round">${HEART_FILL}</span><span class="fl-stack"><span class="fl-main fl-pink-soft">LOC'D IN</span><span class="fl-script fl-white">${SCRIPT_WITH_FAITH}</span></span></span>`
    },
    {
      id: 'pink-foil-bar',
      name: 'Glossy Pink Foil Pill',
      group: 'Flyer Chrome & Script',
      note: 'Flyer header pill look: obsidian serif on glossy pink with script.',
      render: () => `<span class="fl-logo fl-v-foil"><span class="fl-foil-box">LOC'D IN</span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span>`
    },
    {
      id: 'sparkle-marquee',
      name: 'Sparkle Marquee',
      group: 'Flyer Chrome & Script',
      note: 'Symmetrical flyer stars framing LOC\'D IN WITH FAITH.',
      render: () => `<span class="fl-logo fl-v-marquee"><span class="fl-deco-sm">${SPARK}</span><span class="fl-inline"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span><span class="fl-deco-sm">${SPARK}</span></span>`
    },
    {
      id: 'editorial-hairline',
      name: 'Editorial Pink Frame',
      group: 'Editorial & Luxury',
      note: 'Fine bright-pink border box inspired by luxury salon cards.',
      render: () => `<span class="fl-logo fl-v-frame"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-sep">·</span><span class="fl-italic fl-pink-bright">with Faith</span></span>`
    },
    {
      id: 'monogram-lf-seal',
      name: 'LF Monogram Seal',
      group: 'Editorial & Luxury',
      note: 'Circular glossy pink monogram crest paired with studio title.',
      render: () => `<span class="fl-logo fl-v-seal"><span class="fl-seal">LF</span><span class="fl-stack"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-micro fl-pink-chrome">WITH FAITH · PHX</span></span></span>`
    },
    {
      id: 'bow-chrome-classic',
      name: 'Bright Pink Bow Classic',
      group: 'Editorial & Luxury',
      note: 'Refined update of her signature bow in vibrant flyer pink.',
      render: () => `<span class="fl-logo fl-v-bow"><span class="fl-bow-wrap">${BOW}</span><span class="fl-inline"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span></span>`
    },
    {
      id: 'ribbon-underline',
      name: 'Ribbon Swoosh Wordmark',
      group: 'Editorial & Luxury',
      note: 'Clean inline wordmark anchored by a pink calligraphic underline.',
      render: () => `<span class="fl-logo fl-v-swoosh"><span class="fl-stack"><span class="fl-inline"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-italic fl-pink-chrome">with Faith</span></span><span class="fl-swoosh-wrap">${SWOOSH}</span></span></span>`
    },
    {
      id: 'arched-studio-crest',
      name: 'Arched Studio Crest',
      group: 'Editorial & Luxury',
      note: 'Soft pink architectural eyebrow over clean Cormorant capitals.',
      render: () => `<span class="fl-logo fl-v-arch"><span class="fl-stack"><span class="fl-micro fl-pink-bright">✦ PHOENIX LOCTICIAN ✦</span><span class="fl-main fl-white">LOC'D IN <em class="fl-pink-chrome">with Faith</em></span></span></span>`
    },
    {
      id: 'loc-twist-mark',
      name: 'Intertwined Loc Emblem',
      group: 'Editorial & Luxury',
      note: 'Minimal intertwined loc-strand emblem next to modern serif type.',
      render: () => `<span class="fl-logo fl-v-twist"><span class="fl-mark-outline">${LOC_MARK}</span><span class="fl-stack"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span></span>`
    },
    {
      id: 'double-heart-flyer',
      name: 'Double Heart Flyer',
      group: 'Signature Script & Marks',
      note: 'Dual flyer hearts flanking crisp white and pink lettering.',
      render: () => `<span class="fl-logo fl-v-dheart"><span class="fl-deco-sm">${HEART}</span><span class="fl-main fl-chrome-text">LOC'D IN</span><span class="fl-script fl-white">${SCRIPT_WITH_FAITH}</span><span class="fl-deco-sm">${HEART}</span></span>`
    },
    {
      id: 'crown-loc-emblem',
      name: 'Crown & Script Lockup',
      group: 'Signature Script & Marks',
      note: 'Delicate hairline crown motif centered over glowing pink script.',
      render: () => `<span class="fl-logo fl-v-crown"><span class="fl-crown-wrap">${CROWN}</span><span class="fl-inline"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-script fl-pink-bright">${SCRIPT_WITH_FAITH}</span></span></span>`
    },
    {
      id: 'studio-stamp',
      name: 'PHX Studio Stamp',
      group: 'Signature Script & Marks',
      note: 'Rounded pink badge stamp with city callout and clean wordmark.',
      render: () => `<span class="fl-logo fl-v-stamp"><span class="fl-stamp-box">PHX</span><span class="fl-stack"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-micro fl-pink-soft">WITH FAITH</span></span></span>`
    },
    {
      id: 'ticket-label',
      name: 'Glossy Flyer Label',
      group: 'Signature Script & Marks',
      note: 'Mirrors the rounded glossy-pink card containers on her flyer.',
      render: () => `<span class="fl-logo fl-v-ticket"><span class="fl-ticket-top">LOC'D IN</span><span class="fl-ticket-bot">WITH FAITH ${HEART_FILL}</span></span>`
    },
    {
      id: 'reverse-pink-pill',
      name: 'Bright Pink Studio Pill',
      group: 'Signature Script & Marks',
      note: 'High-contrast solid pink pill with crisp obsidian serif.',
      render: () => `<span class="fl-logo fl-v-revpill"><span class="fl-solid-bar"><b>LOC'D IN</b> <em>with Faith</em></span></span>`
    },
    {
      id: 'phx-loctician-tag',
      name: 'PHX Loctician Tag',
      group: 'Signature Script & Marks',
      note: 'Bold studio wordmark grounded by a bright pink sub-ribbon.',
      render: () => `<span class="fl-logo fl-v-tag"><span class="fl-stack"><span class="fl-main fl-white">LOC'D IN <em class="fl-pink-chrome">with Faith</em></span><span class="fl-tag-bar">RETWISTS · REATTACHMENTS · PHX</span></span></span>`
    },
    {
      id: 'gloss-italic-bold',
      name: 'Bold Cormorant Italic',
      group: 'Modern & Minimal',
      note: 'High-fashion editorial serif pairing in cream and bright pink.',
      render: () => `<span class="fl-logo fl-v-italic"><span class="fl-serif-xl">Loc'd In <em class="fl-pink-bright">with Faith</em></span></span>`
    },
    {
      id: 'split-divider',
      name: 'Vertical Pink Bar Split',
      group: 'Modern & Minimal',
      note: 'Clean architectural divider between LOC\'D IN and Faith signature.',
      render: () => `<span class="fl-logo fl-v-split"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-vbar"></span><span class="fl-faith-wrap fl-pink-bright">${SCRIPT_FAITH}</span></span>`
    },
    {
      id: 'diamond-monogram',
      name: 'Diamond F Crest',
      group: 'Modern & Minimal',
      note: 'Rotated pink diamond F icon paired with horizontal studio text.',
      render: () => `<span class="fl-logo fl-v-diamond"><span class="fl-diamond"><span>F</span></span><span class="fl-inline"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-italic fl-pink-chrome">with Faith</span></span></span>`
    },
    {
      id: 'y2k-star-heart',
      name: 'Y2K Spark & Heart',
      group: 'Modern & Minimal',
      note: 'Glossy Y2K pink star-and-heart pairing inspired by her promo flyers.',
      render: () => `<span class="fl-logo fl-v-y2k"><span class="fl-deco">${SPARK}</span><span class="fl-main fl-chrome-text">LOC'D IN</span><span class="fl-deco-sm">${HEART_FILL}</span><span class="fl-italic fl-white">Faith</span></span>`
    },
    {
      id: 'minimal-dots',
      name: 'Glowing Dot Wordmark',
      group: 'Modern & Minimal',
      note: 'Spaced luxury capitals linked by bright pink glowing dots.',
      render: () => `<span class="fl-logo fl-v-dots"><span class="fl-main fl-white">LOC'D IN</span><span class="fl-dot"></span><span class="fl-main fl-pink-chrome">WITH FAITH</span></span>`
    },
    {
      id: 'signature-script-hero',
      name: 'Signature Calligraphic',
      group: 'Modern & Minimal',
      note: 'Oversized glowing pink calligraphy with clean sans overline.',
      render: () => `<span class="fl-logo fl-v-sig"><span class="fl-stack"><span class="fl-micro fl-white">LOC'D IN</span><span class="fl-script fl-pink-glow">${SCRIPT_WITH_FAITH}</span></span></span>`
    }
  ];

  // Ensure #faith-wordmark, #faith-signature, #i-bow exist on standalone pages like decisions.html
  function ensureSymbols() {
    if (document.getElementById('faith-wordmark')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs>
      <symbol id="faith-wordmark" viewBox="-25 -1768 7368 2555"><path fill="currentColor" d="M-15 2Q-43 2 -61.5 -13.5Q-80 -29 -80 -62Q-80 -157 35.5 -321.5Q151 -486 358 -679Q392 -673 439 -673Q453 -673 477.0 -674.0Q501 -675 511 -676Q430 -593 342.0 -500.5Q254 -408 179.0 -326.5Q104 -245 61 -194Q-35 -77 -35 -48Q-35 -37 -30.5 -31.5Q-26 -26 -9 -26Q30 -26 103.5 -60.0Q177 -94 298 -185Q365 -234 427.0 -291.0Q489 -348 535 -401Q583 -457 622.0 -499.0Q661 -541 702.0 -583.0Q743 -625 797 -679Q829 -676 842.0 -674.5Q855 -673 878 -673Q922 -673 950 -676Q904 -628 843.5 -563.5Q783 -499 718.0 -430.0Q653 -361 593.5 -295.0Q534 -229 489 -178Q442 -122 425.0 -92.5Q408 -63 408 -49Q408 -26 433 -26Q478 -26 562.5 -64.5Q647 -103 743.0 -169.0Q839 -235 919 -319Q986 -389 1021.5 -436.0Q1057 -483 1071.0 -526.0Q1085 -569 1085 -625Q1085 -662 1104.5 -690.5Q1124 -719 1155 -719Q1221 -719 1221 -654Q1221 -612 1183.5 -541.5Q1146 -471 1022 -347Q1005 -330 984.0 -311.0Q963 -292 940 -273Q927 -240 934.0 -216.5Q941 -193 980 -193Q1015 -193 1056.0 -217.5Q1097 -242 1138.0 -277.5Q1179 -313 1212.5 -348.5Q1246 -384 1265 -406L1287 -389Q1253 -353 1199.5 -300.5Q1146 -248 1086.0 -208.0Q1026 -168 971 -168Q889 -168 905 -244Q827 -183 736.0 -126.5Q645 -70 561.5 -34.0Q478 2 422 2Q388 2 373.5 -16.5Q359 -35 359 -63Q359 -98 374.5 -145.0Q390 -192 427 -253Q396 -225 363.5 -198.0Q331 -171 298 -147Q194 -69 116.5 -33.5Q39 2 -15 2ZM1721 -876Q1693 -876 1676.5 -893.5Q1660 -911 1660 -938Q1660 -973 1689.5 -1002.5Q1719 -1032 1760 -1032Q1788 -1032 1804.5 -1013.5Q1821 -995 1821 -969Q1821 -932 1789.5 -904.0Q1758 -876 1721 -876ZM1210 2Q1149 2 1111.5 -20.5Q1074 -43 1074 -81Q1074 -111 1089.0 -150.5Q1104 -190 1146.5 -254.0Q1189 -318 1270.5 -420.5Q1352 -523 1485 -678Q1494 -677 1528.0 -676.0Q1562 -675 1581 -675Q1598 -675 1606.5 -675.5Q1615 -676 1623 -677Q1477 -505 1384.5 -394.0Q1292 -283 1242.0 -217.0Q1192 -151 1173.0 -116.0Q1154 -81 1154 -60Q1154 -34 1182.0 -30.0Q1210 -26 1227 -26Q1281 -26 1345.0 -62.5Q1409 -99 1472.5 -153.5Q1536 -208 1590.5 -264.0Q1645 -320 1680.0 -360.5Q1715 -401 1721 -407L1741 -389Q1730 -377 1693.0 -334.0Q1656 -291 1601.0 -234.5Q1546 -178 1480.5 -124.0Q1415 -70 1345.5 -34.0Q1276 2 1210 2ZM1650 2Q1595 2 1567.5 -20.0Q1540 -42 1540 -76Q1540 -103 1547.0 -129.5Q1554 -156 1577.0 -197.0Q1600 -238 1647.0 -307.5Q1694 -377 1774 -490L2032 -853H1953Q1923 -853 1923 -866Q1923 -882 1961 -882H2052L2237 -1142Q2250 -1140 2271.5 -1138.5Q2293 -1137 2333 -1138Q2353 -1138 2376 -1142L2183 -882H2441Q2469 -882 2469 -868Q2469 -853 2444 -853H2161L1897 -497Q1803 -371 1746.0 -290.0Q1689 -209 1659.5 -162.0Q1630 -115 1619.5 -92.0Q1609 -69 1609 -58Q1609 -28 1659 -26Q1728 -27 1801.5 -71.5Q1875 -116 1943.0 -180.5Q2011 -245 2065.0 -307.5Q2119 -370 2149 -406L2171 -389Q2142 -355 2086.0 -291.0Q2030 -227 1957.5 -159.5Q1885 -92 1806.0 -45.0Q1727 2 1650 2ZM2557 2Q2511 2 2467.5 -19.0Q2424 -40 2424 -75Q2424 -102 2436.5 -138.5Q2449 -175 2494.0 -239.0Q2539 -303 2637 -413Q2716 -502 2746.0 -551.0Q2776 -600 2776 -624Q2776 -638 2766.5 -649.0Q2757 -660 2729 -660Q2706 -660 2666.5 -647.0Q2627 -634 2580 -603Q2501 -549 2384.0 -436.5Q2267 -324 2120 -141L2028 -19Q2012 -22 1998.0 -23.0Q1984 -24 1970 -24Q1934 -24 1909.5 -20.5Q1885 -17 1874 -14L2981 -1595Q2994 -1594 3015.5 -1592.0Q3037 -1590 3077 -1591Q3085 -1591 3096.0 -1592.5Q3107 -1594 3120 -1595L2128 -218L2133 -207Q2286 -383 2393.0 -483.5Q2500 -584 2571 -632Q2621 -664 2663.5 -674.5Q2706 -685 2738 -685Q2803 -685 2830.5 -653.5Q2858 -622 2856 -584Q2854 -544 2829.0 -488.5Q2804 -433 2742.5 -350.5Q2681 -268 2569 -147Q2519 -93 2508.5 -77.5Q2498 -62 2498 -49Q2498 -39 2520.0 -32.5Q2542 -26 2569 -26Q2632 -26 2696.5 -61.0Q2761 -96 2821.0 -149.0Q2881 -202 2930.0 -257.0Q2979 -312 3012.5 -353.5Q3046 -395 3056 -406L3078 -389Q3065 -376 3030.5 -332.5Q2996 -289 2944.0 -232.5Q2892 -176 2829.0 -122.5Q2766 -69 2696.5 -33.5Q2627 2 2557 2ZM4097 -814Q4021 -814 3975.5 -849.5Q3930 -885 3930 -951Q3930 -1035 3995.5 -1119.5Q4061 -1204 4181.0 -1273.5Q4301 -1343 4463 -1382Q4551 -1402 4642.0 -1408.0Q4733 -1414 4824 -1414Q4932 -1414 5043.0 -1396.5Q5154 -1379 5257 -1379Q5400 -1379 5489.0 -1429.0Q5578 -1479 5624 -1557Q5632 -1569 5637.0 -1571.5Q5642 -1574 5646 -1574Q5655 -1574 5655 -1567Q5655 -1563 5654.0 -1559.0Q5653 -1555 5646 -1547Q5572 -1429 5446.5 -1359.5Q5321 -1290 5132 -1290Q4994 -1290 4854.5 -1313.5Q4715 -1337 4578 -1337Q4464 -1337 4353.5 -1303.5Q4243 -1270 4154.0 -1215.0Q4065 -1160 4012.0 -1093.5Q3959 -1027 3959 -961Q3959 -912 3984.5 -882.0Q4010 -852 4065 -852Q4135 -852 4209.5 -888.0Q4284 -924 4349.0 -980.0Q4414 -1036 4457.0 -1097.5Q4500 -1159 4506 -1210Q4511 -1231 4515 -1231Q4525 -1231 4525 -1210Q4525 -1135 4486.5 -1064.5Q4448 -994 4384.5 -937.5Q4321 -881 4246.0 -847.5Q4171 -814 4097 -814ZM3650 1Q3592 1 3539.0 -19.0Q3486 -39 3452.0 -72.0Q3418 -105 3418 -145Q3418 -189 3449.0 -208.5Q3480 -228 3511 -228Q3528 -228 3545.0 -217.0Q3562 -206 3562 -182Q3562 -163 3545.0 -147.5Q3528 -132 3505 -132Q3492 -132 3480.0 -134.0Q3468 -136 3458 -142V-137Q3458 -88 3516.5 -57.0Q3575 -26 3658 -26Q3725 -26 3798.0 -49.0Q3871 -72 3954.5 -135.0Q4038 -198 4134.5 -317.0Q4231 -436 4345 -628Q4345 -629 4350 -636Q4109 -582 3975.5 -503.5Q3842 -425 3797 -348Q3786 -328 3778 -328Q3771 -328 3771 -336Q3771 -344 3778 -353Q3804 -413 3886.5 -475.5Q3969 -538 4093.5 -591.5Q4218 -645 4370 -676Q4373 -676 4375 -677Q4497 -867 4631.0 -986.5Q4765 -1106 4882.0 -1162.5Q4999 -1219 5068 -1219Q5091 -1219 5091 -1210Q5091 -1206 5083.0 -1204.0Q5075 -1202 5049 -1194Q4932 -1160 4795.0 -1033.5Q4658 -907 4532 -715Q4594 -731 4650.0 -747.0Q4706 -763 4743 -776Q4752 -782 4761.0 -791.0Q4770 -800 4777 -816Q4789 -816 4821.0 -814.0Q4853 -812 4885.0 -808.5Q4917 -805 4929 -801Q4883 -780 4832.0 -736.0Q4781 -692 4737.0 -634.5Q4693 -577 4668 -513Q4659 -497 4651 -497Q4639 -497 4639 -511Q4639 -517 4647 -541Q4670 -601 4689.5 -643.5Q4709 -686 4734 -724Q4694 -711 4631.5 -697.0Q4569 -683 4503 -669L4499 -662Q4343 -408 4206.5 -263.0Q4070 -118 3935.5 -58.5Q3801 1 3650 1ZM4774 2Q4710 2 4680.5 -33.0Q4651 -68 4651 -129Q4651 -196 4679.5 -272.0Q4708 -348 4774 -423Q4909 -580 5026.5 -632.5Q5144 -685 5247 -685Q5299 -685 5335.0 -663.0Q5371 -641 5371 -603Q5371 -574 5359 -544Q5391 -582 5413.5 -610.5Q5436 -639 5457 -665Q5483 -657 5517 -657Q5531 -657 5555.0 -658.0Q5579 -659 5592 -661L5255 -255Q5191 -179 5163.0 -131.5Q5135 -84 5135 -58Q5135 -26 5166 -26Q5220 -26 5278.0 -57.5Q5336 -89 5392.0 -138.5Q5448 -188 5497.0 -241.5Q5546 -295 5583.5 -340.5Q5621 -386 5641 -408L5661 -391Q5639 -366 5599.0 -319.0Q5559 -272 5507.5 -217.0Q5456 -162 5396.5 -112.0Q5337 -62 5274.5 -30.0Q5212 2 5151 2Q5051 2 5051 -60Q5051 -83 5059.5 -106.5Q5068 -130 5094.0 -167.5Q5120 -205 5172 -268L5162 -272Q5040 -122 4936.5 -60.0Q4833 2 4774 2ZM4778 -28Q4842 -28 4947.0 -102.5Q5052 -177 5199 -351Q5223 -380 5243.5 -405.0Q5264 -430 5283 -452Q5306 -487 5324.5 -525.0Q5343 -563 5343 -594Q5343 -625 5321.0 -639.5Q5299 -654 5273 -654Q5224 -654 5114.5 -583.5Q5005 -513 4874 -358Q4799 -268 4766.0 -198.0Q4733 -128 4733 -80Q4733 -28 4778 -28ZM6094 -876Q6066 -876 6049.5 -893.5Q6033 -911 6033 -938Q6033 -973 6062.5 -1002.5Q6092 -1032 6133 -1032Q6161 -1032 6177.5 -1013.5Q6194 -995 6194 -969Q6194 -932 6162.5 -904.0Q6131 -876 6094 -876ZM5583 2Q5522 2 5484.5 -20.5Q5447 -43 5447 -81Q5447 -111 5462.0 -150.5Q5477 -190 5519.5 -254.0Q5562 -318 5643.5 -420.5Q5725 -523 5858 -678Q5867 -677 5901.0 -676.0Q5935 -675 5954 -675Q5971 -675 5979.5 -675.5Q5988 -676 5996 -677Q5850 -505 5757.5 -394.0Q5665 -283 5615.0 -217.0Q5565 -151 5546.0 -116.0Q5527 -81 5527 -60Q5527 -34 5555.0 -30.0Q5583 -26 5600 -26Q5654 -26 5718.0 -62.5Q5782 -99 5845.5 -153.5Q5909 -208 5963.5 -264.0Q6018 -320 6053.0 -360.5Q6088 -401 6094 -407L6114 -389Q6103 -377 6066.0 -334.0Q6029 -291 5974.0 -234.5Q5919 -178 5853.5 -124.0Q5788 -70 5718.5 -34.0Q5649 2 5583 2ZM6023 2Q5968 2 5940.5 -20.0Q5913 -42 5913 -76Q5913 -103 5920.0 -129.5Q5927 -156 5950.0 -197.0Q5973 -238 6020.0 -307.5Q6067 -377 6147 -490L6405 -853H6326Q6296 -853 6296 -866Q6296 -882 6334 -882H6425L6610 -1142Q6623 -1140 6644.5 -1138.5Q6666 -1137 6706 -1138Q6726 -1138 6749 -1142L6556 -882H6814Q6842 -882 6842 -868Q6842 -853 6817 -853H6534L6270 -497Q6176 -371 6119.0 -290.0Q6062 -209 6032.5 -162.0Q6003 -115 5992.5 -92.0Q5982 -69 5982 -58Q5982 -28 6032 -26Q6101 -27 6174.5 -71.5Q6248 -116 6316.0 -180.5Q6384 -245 6438.0 -307.5Q6492 -370 6522 -406L6544 -389Q6515 -355 6459.0 -291.0Q6403 -227 6330.5 -159.5Q6258 -92 6179.0 -45.0Q6100 2 6023 2ZM6930 2Q6884 2 6840.5 -19.0Q6797 -40 6797 -75Q6797 -102 6809.5 -138.5Q6822 -175 6867.0 -239.0Q6912 -303 7010 -413Q7089 -502 7119.0 -551.0Q7149 -600 7149 -624Q7149 -638 7139.5 -649.0Q7130 -660 7102 -660Q7079 -660 7039.5 -647.0Q7000 -634 6953 -603Q6874 -549 6757.0 -436.5Q6640 -324 6493 -141L6401 -19Q6385 -22 6371.0 -23.0Q6357 -24 6343 -24Q6307 -24 6282.5 -20.5Q6258 -17 6247 -14L7354 -1595Q7367 -1594 7388.5 -1592.0Q7410 -1590 7450 -1591Q7458 -1591 7469.0 -1592.5Q7480 -1594 7493 -1595L6501 -218L6506 -207Q6659 -383 6766.0 -483.5Q6873 -584 6944 -632Q6994 -664 7036.5 -674.5Q7079 -685 7111 -685Q7176 -685 7203.5 -653.5Q7231 -622 7229 -584Q7227 -544 7202.0 -488.5Q7177 -433 7115.5 -350.5Q7054 -268 6942 -147Q6892 -93 6881.5 -77.5Q6871 -62 6871 -49Q6871 -39 6893.0 -32.5Q6915 -26 6942 -26Q7005 -26 7069.5 -61.0Q7134 -96 7194.0 -149.0Q7254 -202 7303.0 -257.0Q7352 -312 7385.5 -353.5Q7419 -395 7429 -406L7451 -389Q7438 -376 7403.5 -332.5Q7369 -289 7317.0 -232.5Q7265 -176 7202.0 -122.5Q7139 -69 7069.5 -33.5Q7000 2 6930 2Z"/></symbol>
      <symbol id="faith-signature" viewBox="-25 -1768 3950 2555"><path fill="currentColor" d="M679 -814Q603 -814 557.5 -849.5Q512 -885 512 -951Q512 -1035 577.5 -1119.5Q643 -1204 763.0 -1273.5Q883 -1343 1045 -1382Q1133 -1402 1224.0 -1408.0Q1315 -1414 1406 -1414Q1514 -1414 1625.0 -1396.5Q1736 -1379 1839 -1379Q1982 -1379 2071.0 -1429.0Q2160 -1479 2206 -1557Q2214 -1569 2219.0 -1571.5Q2224 -1574 2228 -1574Q2237 -1574 2237 -1567Q2237 -1563 2236.0 -1559.0Q2235 -1555 2228 -1547Q2154 -1429 2028.5 -1359.5Q1903 -1290 1714 -1290Q1576 -1290 1436.5 -1313.5Q1297 -1337 1160 -1337Q1046 -1337 935.5 -1303.5Q825 -1270 736.0 -1215.0Q647 -1160 594.0 -1093.5Q541 -1027 541 -961Q541 -912 566.5 -882.0Q592 -852 647 -852Q717 -852 791.5 -888.0Q866 -924 931.0 -980.0Q996 -1036 1039.0 -1097.5Q1082 -1159 1088 -1210Q1093 -1231 1097 -1231Q1107 -1231 1107 -1210Q1107 -1135 1068.5 -1064.5Q1030 -994 966.5 -937.5Q903 -881 828.0 -847.5Q753 -814 679 -814ZM232 1Q174 1 121.0 -19.0Q68 -39 34.0 -72.0Q0 -105 0 -145Q0 -189 31.0 -208.5Q62 -228 93 -228Q110 -228 127.0 -217.0Q144 -206 144 -182Q144 -163 127.0 -147.5Q110 -132 87 -132Q74 -132 62.0 -134.0Q50 -136 40 -142V-137Q40 -88 98.5 -57.0Q157 -26 240 -26Q307 -26 380.0 -49.0Q453 -72 536.5 -135.0Q620 -198 716.5 -317.0Q813 -436 927 -628Q927 -629 932 -636Q691 -582 557.5 -503.5Q424 -425 379 -348Q368 -328 360 -328Q353 -328 353 -336Q353 -344 360 -353Q386 -413 468.5 -475.5Q551 -538 675.5 -591.5Q800 -645 952 -676Q955 -676 957 -677Q1079 -867 1213.0 -986.5Q1347 -1106 1464.0 -1162.5Q1581 -1219 1650 -1219Q1673 -1219 1673 -1210Q1673 -1206 1665.0 -1204.0Q1657 -1202 1631 -1194Q1514 -1160 1377.0 -1033.5Q1240 -907 1114 -715Q1176 -731 1232.0 -747.0Q1288 -763 1325 -776Q1334 -782 1343.0 -791.0Q1352 -800 1359 -816Q1371 -816 1403.0 -814.0Q1435 -812 1467.0 -808.5Q1499 -805 1511 -801Q1465 -780 1414.0 -736.0Q1363 -692 1319.0 -634.5Q1275 -577 1250 -513Q1241 -497 1233 -497Q1221 -497 1221 -511Q1221 -517 1229 -541Q1252 -601 1271.5 -643.5Q1291 -686 1316 -724Q1276 -711 1213.5 -697.0Q1151 -683 1085 -669L1081 -662Q925 -408 788.5 -263.0Q652 -118 517.5 -58.5Q383 1 232 1ZM1356 2Q1292 2 1262.5 -33.0Q1233 -68 1233 -129Q1233 -196 1261.5 -272.0Q1290 -348 1356 -423Q1491 -580 1608.5 -632.5Q1726 -685 1829 -685Q1881 -685 1917.0 -663.0Q1953 -641 1953 -603Q1953 -574 1941 -544Q1973 -582 1995.5 -610.5Q2018 -639 2039 -665Q2065 -657 2099 -657Q2113 -657 2137.0 -658.0Q2161 -659 2174 -661L1837 -255Q1773 -179 1745.0 -131.5Q1717 -84 1717 -58Q1717 -26 1748 -26Q1802 -26 1860.0 -57.5Q1918 -89 1974.0 -138.5Q2030 -188 2079.0 -241.5Q2128 -295 2165.5 -340.5Q2203 -386 2223 -408L2243 -391Q2221 -366 2181.0 -319.0Q2141 -272 2089.5 -217.0Q2038 -162 1978.5 -112.0Q1919 -62 1856.5 -30.0Q1794 2 1733 2Q1633 2 1633 -60Q1633 -83 1641.5 -106.5Q1650 -130 1676.0 -167.5Q1702 -205 1754 -268L1744 -272Q1622 -122 1518.5 -60.0Q1415 2 1356 2ZM1360 -28Q1424 -28 1529.0 -102.5Q1634 -177 1781 -351Q1805 -380 1825.5 -405.0Q1846 -430 1865 -452Q1888 -487 1906.5 -525.0Q1925 -563 1925 -594Q1925 -625 1903.0 -639.5Q1881 -654 1855 -654Q1806 -654 1696.5 -583.5Q1587 -513 1456 -358Q1381 -268 1348.0 -198.0Q1315 -128 1315 -80Q1315 -28 1360 -28ZM2676 -876Q2648 -876 2631.5 -893.5Q2615 -911 2615 -938Q2615 -973 2644.5 -1002.5Q2674 -1032 2715 -1032Q2743 -1032 2759.5 -1013.5Q2776 -995 2776 -969Q2776 -932 2744.5 -904.0Q2713 -876 2676 -876ZM2165 2Q2104 2 2066.5 -20.5Q2029 -43 2029 -81Q2029 -111 2044.0 -150.5Q2059 -190 2101.5 -254.0Q2144 -318 2225.5 -420.5Q2307 -523 2440 -678Q2449 -677 2483.0 -676.0Q2517 -675 2536 -675Q2553 -675 2561.5 -675.5Q2570 -676 2578 -677Q2432 -505 2339.5 -394.0Q2247 -283 2197.0 -217.0Q2147 -151 2128.0 -116.0Q2109 -81 2109 -60Q2109 -34 2137.0 -30.0Q2165 -26 2182 -26Q2236 -26 2300.0 -62.5Q2364 -99 2427.5 -153.5Q2491 -208 2545.5 -264.0Q2600 -320 2635.0 -360.5Q2670 -401 2676 -407L2696 -389Q2685 -377 2648.0 -334.0Q2611 -291 2556.0 -234.5Q2501 -178 2435.5 -124.0Q2370 -70 2300.5 -34.0Q2231 2 2165 2ZM2605 2Q2550 2 2522.5 -20.0Q2495 -42 2495 -76Q2495 -103 2502.0 -129.5Q2509 -156 2532.0 -197.0Q2555 -238 2602.0 -307.5Q2649 -377 2729 -490L2987 -853H2908Q2878 -853 2878 -866Q2878 -882 2916 -882H3007L3192 -1142Q3205 -1140 3226.5 -1138.5Q3248 -1137 3288 -1138Q3308 -1138 3331 -1142L3138 -882H3396Q3424 -882 3424 -868Q3424 -853 3399 -853H3116L2852 -497Q2758 -371 2701.0 -290.0Q2644 -209 2614.5 -162.0Q2585 -115 2574.5 -92.0Q2564 -69 2564 -58Q2564 -28 2614 -26Q2683 -27 2756.5 -71.5Q2830 -116 2898.0 -180.5Q2966 -245 3020.0 -307.5Q3074 -370 3104 -406L3126 -389Q3097 -355 3041.0 -291.0Q2985 -227 2912.5 -159.5Q2840 -92 2761.0 -45.0Q2682 2 2605 2ZM3512 2Q3466 2 3422.5 -19.0Q3379 -40 3379 -75Q3379 -102 3391.5 -138.5Q3404 -175 3449.0 -239.0Q3494 -303 3592 -413Q3671 -502 3701.0 -551.0Q3731 -600 3731 -624Q3731 -638 3721.5 -649.0Q3712 -660 3684 -660Q3661 -660 3621.5 -647.0Q3582 -634 3535 -603Q3456 -549 3339.0 -436.5Q3222 -324 3075 -141L2983 -19Q2967 -22 2953.0 -23.0Q2939 -24 2925 -24Q2889 -24 2864.5 -20.5Q2840 -17 2829 -14L3936 -1595Q3949 -1594 3970.5 -1592.0Q3992 -1590 4032 -1591Q4040 -1591 4051.0 -1592.5Q4062 -1594 4075 -1595L3083 -218L3088 -207Q3241 -383 3348.0 -483.5Q3455 -584 3526 -632Q3576 -664 3618.5 -674.5Q3661 -685 3693 -685Q3758 -685 3785.5 -653.5Q3813 -622 3811 -584Q3809 -544 3784.0 -488.5Q3759 -433 3697.5 -350.5Q3636 -268 3524 -147Q3474 -93 3463.5 -77.5Q3453 -62 3453 -49Q3453 -39 3475.0 -32.5Q3497 -26 3524 -26Q3587 -26 3651.5 -61.0Q3716 -96 3776.0 -149.0Q3836 -202 3885.0 -257.0Q3934 -312 3967.5 -353.5Q4001 -395 4011 -406L4033 -389Q4020 -376 3985.5 -332.5Q3951 -289 3899.0 -232.5Q3847 -176 3784.0 -122.5Q3721 -69 3651.5 -33.5Q3582 2 3512 2Z"/></symbol>
      <symbol id="i-bow" viewBox="0 0 48 30"><path fill="currentColor" d="M24 13.5C18.5 5 6.5 1 3.2 6.2.6 10.4 4.8 17.6 24 15.2zM24 13.5C29.5 5 41.5 1 44.8 6.2c2.6 4.2-1.6 11.4-20.8 9z" opacity=".95"/><path fill="currentColor" d="M22.2 15.5 15 28.5l4.6-1.6 2.3 3.1 2.6-14.2zM25.8 15.5 33 28.5l-4.6-1.6-2.3 3.1-2.6-14.2z" opacity=".8"/><ellipse cx="24" cy="14.3" rx="3.4" ry="3.1" fill="currentColor"/></symbol>
    </defs>`;
    document.body.prepend(svg);
  }

  function getActiveId() {
    const picked = window.FAITH_ACTIVE_LOGO || localStorage.getItem('faith_logo_preview') || 'flyer-chrome-pink';
    return wordmarkDefs.some(d => d.id === picked) ? picked : 'flyer-chrome-pink';
  }

  function renderHtml(id) {
    const item = wordmarkDefs.find(d => d.id === id) || wordmarkDefs[0];
    return item.render();
  }

  function apply(id, opts = {}) {
    ensureSymbols();
    const chosen = wordmarkDefs.find(d => d.id === id) || wordmarkDefs[0];
    if (opts.persistLocal) {
      try { localStorage.setItem('faith_logo_preview', chosen.id); } catch {}
    }
    window.FAITH_ACTIVE_LOGO = chosen.id;
    const html = chosen.render();
    document.querySelectorAll('[data-logo-slot]').forEach(el => {
      el.innerHTML = html;
      el.dataset.logoId = chosen.id;
    });
    window.dispatchEvent(new CustomEvent('faith-logo-change', { detail: { id: chosen.id, name: chosen.name } }));
    return chosen;
  }

  window.FAITH_LOGOS = wordmarkDefs;
  window.FAITH_LOGO_API = {
    list: () => wordmarkDefs,
    getActiveId,
    renderHtml,
    apply
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => apply(getActiveId()));
  } else {
    apply(getActiveId());
  }
})();
