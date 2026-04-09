export type Locale = "en" | "fi";

type Messages = Record<string, string>;

const en: Messages = {
  // Header
  "header.pickYourTea": "pick your tea",

  // Tea list
  "teaList.or": "or",
  "teaList.askAi": "Ask AI",
  "teaList.askAiDesc": "Describe your tea, get brew parameters",
  "teaList.custom": "Custom",
  "teaList.customDesc": "Set your own parameters",
  "teaList.teaSelection": "Tea selection",

  // Tea detail
  "detail.vessel": "Vessel",
  "detail.leaf": "Leaf",
  "detail.adjusted": "adjusted",
  "detail.resetDefaults": "Reset to defaults",
  "detail.temp": "Temp",
  "detail.ratio": "Ratio",
  "detail.rinse": "Rinse",
  "detail.rinseYes": "Yes",
  "detail.rinseNo": "No",
  "detail.rinse2x": "2×",
  "detail.infusionSchedule": "Infusion schedule (seconds)",
  "detail.startBrewing": "Start Brewing",
  "detail.decreaseVessel": "Decrease vessel size",
  "detail.increaseVessel": "Increase vessel size",
  "detail.decreaseLeaf": "Decrease leaf amount",
  "detail.increaseLeaf": "Increase leaf amount",

  // Brewing timer
  "timer.beforeYouBrew": "Before you brew",
  "timer.infusion": "Infusion {n}",
  "timer.infusionComplete": "Infusion {n} complete",
  "timer.rinseDone": "Rinse done",
  "timer.rinseOnce": "Rinse once, then brew",
  "timer.rinseTwice": "Rinse twice, then brew",
  "timer.twoRinses": "Two rinses for this tea",
  "timer.brewNext": "Brew Next",
  "timer.schedule": "Schedule",
  "timer.temp": "Temp",
  "timer.ratio": "Ratio",
  "timer.vessel": "Vessel",
  "timer.endSession": "End session",
  "timer.yesEndSession": "Yes, end session",
  "timer.cancel": "Cancel",
  "timer.pause": "Pause",
  "timer.play": "Play",
  "timer.secondsRemaining": "{n} seconds remaining",
  "timer.decreaseTime": "Decrease next infusion time by 3 seconds",
  "timer.increaseTime": "Increase next infusion time by 3 seconds",

  // Session summary
  "session.complete": "Session complete",
  "session.infusions": "Infusions",
  "session.totalTime": "Total time",
  "session.leaf": "Leaf",
  "session.vessel": "Vessel",
  "session.done": "Done",

  // AI advisor
  "ai.placeholder": "e.g. \"Da Hong Pao\" or \"2020 Yiwu sheng\"",
  "ai.describeYourTea": "Describe your tea",
  "ai.identifying": "Identifying\u2026",
  "ai.identify": "Identify",
  "ai.error": "Couldn\u2019t identify that tea. Try a different description, or use Custom Mode instead.",
  "ai.rinse": "Rinse",
  "ai.rinse2x": "Rinse 2\u00d7",
  "ai.noRinse": "No rinse",
  "ai.nInfusions": "{n} infusions",
  "ai.infusionSchedule": "Infusion schedule (seconds)",
  "ai.startBrewing": "Start Brewing",
  "ai.identifyingTea": "Identifying tea\u2026",

  // Custom mode
  "custom.baseSteep": "Base steep",
  "custom.infusions": "Infusions",
  "custom.rinse": "Rinse",
  "custom.none": "None",
  "custom.once": "Once",
  "custom.twice": "Twice",
  "custom.extensionCurve": "Extension curve",
  "custom.gentle": "Gentle",
  "custom.standard": "Standard",
  "custom.steep": "Steep",
  "custom.infusionSchedule": "Infusion schedule (seconds)",
  "custom.startBrewing": "Start Brewing",
  "custom.teaName": "Custom Tea",
  "custom.decreaseBaseSteep": "Decrease base steep time",
  "custom.increaseBaseSteep": "Increase base steep time",
  "custom.decreaseInfusions": "Decrease number of infusions",
  "custom.increaseInfusions": "Increase number of infusions",

  // Secondary paths
  "secondary.customBrew": "Custom brew",
  "secondary.setParams": "Set your own parameters",

  // Inline view header
  "inline.teaList": "Tea list",

  // Page
  "page.brewingTitle": "Brewing {name} \u2014 Gongfu Cha",
  "page.title": "Gongfu Cha",
  "page.skipToContent": "Skip to main content",
};

const fi: Messages = {
  // Header
  "header.pickYourTea": "valitse tee",

  // Tea list
  "teaList.or": "tai",
  "teaList.askAi": "Tunnista tee",
  "teaList.askAiDesc": "Kuvaile \u2013 tunnistamme sen",
  "teaList.custom": "Vapaa haudutus",
  "teaList.customDesc": "Omat ajat ja asetukset",
  "teaList.teaSelection": "Teet",

  // Tea detail
  "detail.vessel": "Astia",
  "detail.leaf": "Lehti",
  "detail.adjusted": "s\u00e4\u00e4detty",
  "detail.resetDefaults": "Palauta oletukset",
  "detail.temp": "L\u00e4mp\u00f6",
  "detail.ratio": "Suhde",
  "detail.rinse": "Huuhtelu",
  "detail.rinseYes": "Kyll\u00e4",
  "detail.rinseNo": "Ei",
  "detail.rinse2x": "2\u00d7",
  "detail.infusionSchedule": "Haudutusajat (s)",
  "detail.startBrewing": "Aloita haudutus",
  "detail.decreaseVessel": "Pienenn\u00e4 astiaa",
  "detail.increaseVessel": "Suurenna astiaa",
  "detail.decreaseLeaf": "V\u00e4henn\u00e4 lehte\u00e4",
  "detail.increaseLeaf": "Lis\u00e4\u00e4 lehte\u00e4",

  // Brewing timer
  "timer.beforeYouBrew": "Ennen haudutusta",
  "timer.infusion": "Haudutus {n}",
  "timer.infusionComplete": "Haudutus {n} valmis",
  "timer.rinseDone": "Huuhdeltu",
  "timer.rinseOnce": "Yksi huuhtelu, sitten haudutus",
  "timer.rinseTwice": "Kaksi huuhtelua, sitten haudutus",
  "timer.twoRinses": "T\u00e4m\u00e4 tee huuhdellaan kahdesti",
  "timer.brewNext": "Seuraava haudutus",
  "timer.schedule": "Aikataulu",
  "timer.temp": "L\u00e4mp\u00f6",
  "timer.ratio": "Suhde",
  "timer.vessel": "Astia",
  "timer.endSession": "Lopeta sessio",
  "timer.yesEndSession": "Kyll\u00e4, lopeta",
  "timer.cancel": "Peruuta",
  "timer.pause": "Tauko",
  "timer.play": "Toista",
  "timer.secondsRemaining": "{n} sekuntia j\u00e4ljell\u00e4",
  "timer.decreaseTime": "Lyhenn\u00e4 seuraavaa haudutusta 3 sekunnilla",
  "timer.increaseTime": "Pidenn\u00e4 seuraavaa haudutusta 3 sekunnilla",

  // Session summary
  "session.complete": "Sessio valmis",
  "session.infusions": "Haudutukset",
  "session.totalTime": "Kokonaisaika",
  "session.leaf": "Lehti",
  "session.vessel": "Astia",
  "session.done": "Valmis",

  // AI advisor
  "ai.placeholder": "esim. \u201dDa Hong Pao\u201d tai \u201d2020 Yiwu sheng\u201d",
  "ai.describeYourTea": "Kuvaile teet\u00e4si",
  "ai.identifying": "Tunnistetaan\u2026",
  "ai.identify": "Tunnista",
  "ai.error": "Teet\u00e4 ei tunnistettu. Kokeile toista kuvausta tai k\u00e4yt\u00e4 vapaata haudutusta.",
  "ai.rinse": "Huuhtelu",
  "ai.rinse2x": "Huuhtelu 2\u00d7",
  "ai.noRinse": "Ei huuhtelua",
  "ai.nInfusions": "{n} haudutusta",
  "ai.infusionSchedule": "Haudutusajat (s)",
  "ai.startBrewing": "Aloita haudutus",
  "ai.identifyingTea": "Tunnistetaan teet\u00e4\u2026",

  // Custom mode
  "custom.baseSteep": "Perusaika",
  "custom.infusions": "Haudutukset",
  "custom.rinse": "Huuhtelu",
  "custom.none": "Ei",
  "custom.once": "Kerran",
  "custom.twice": "Kahdesti",
  "custom.extensionCurve": "Pidennys",
  "custom.gentle": "Loiva",
  "custom.standard": "Normaali",
  "custom.steep": "Jyrkk\u00e4",
  "custom.infusionSchedule": "Haudutusajat (s)",
  "custom.startBrewing": "Aloita haudutus",
  "custom.teaName": "Oma tee",
  "custom.decreaseBaseSteep": "Lyhenn\u00e4 perusaikaa",
  "custom.increaseBaseSteep": "Pidenn\u00e4 perusaikaa",
  "custom.decreaseInfusions": "V\u00e4henn\u00e4 haudutuksia",
  "custom.increaseInfusions": "Lis\u00e4\u00e4 haudutuksia",

  // Secondary paths
  "secondary.customBrew": "Vapaa haudutus",
  "secondary.setParams": "Omat ajat ja asetukset",

  // Inline view header
  "inline.teaList": "Teet",

  // Page
  "page.brewingTitle": "{name} \u2013 Gongfu Cha",
  "page.title": "Gongfu Cha",
  "page.skipToContent": "Siirry p\u00e4\u00e4sis\u00e4lt\u00f6\u00f6n",
};

export const messages: Record<Locale, Messages> = { en, fi };
