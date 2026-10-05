// UI text in Hebrew and English. t('key', {var}) fills {var} placeholders.
(function (root) {
  'use strict';

  const STR = {
    he: {
      logo1: 'מבחנות', logo2: '',
      play: 'שחק', level: 'שלב {n}', collection: 'אוסף', levels: 'שלבים',
      restart: 'מחדש', undo: 'ביטול', hint: 'רמז', tube: 'מבחנה',
      eggsWaiting: '{n} ביצים מחכות לבקיעה!', eggWaiting: 'ביצה מחכה לבקיעה!', tapToHatch: 'הקש כדי לבקוע',
      levelsToEgg1: 'עוד שלב אחד לביצה הבאה', levelsToEgg: 'עוד {n} שלבים לביצה הבאה',
      noCoins: 'אין מספיק מטבעות. מטבעות מרוויחים בסיום כל שלב.',
      noUndo: 'אין מהלך לבטל',
      searchingHint: 'מחפש רמז…',
      noSolution: 'אין פתרון מהמצב הזה. בטל כמה מהלכים, הוסף מבחנה או התחל מחדש.',
      hintToast: 'העבר מהמבחנה הצהובה לירוקה',
      oneTube: 'אפשר להוסיף מבחנה אחת בכל שלב',
      hardBadge: '★ שלב קשה ★', hiddenBadge: 'כדורים נסתרים',
      tip: 'הקש על מבחנה כדי להרים את הכדורים העליונים, ואז על מבחנה אחרת כדי להעביר אותם',
      wellDone: 'כל הכבוד!', solvedIn: 'שלב {n} הושלם ב-{m} מהלכים',
      bonusIncl: 'כולל בונוס {b} על פתרון מושלם',
      bonusHow: 'פתרון ב-{p} מהלכים או פחות = 3 כוכבים ובונוס',
      replayNoCoins: 'שלב שכבר נפתר בעבר אינו מזכה במטבעות',
      newEggWaiting: '🥚 ביצה חדשה מחכה לך!',
      hatchIt: 'לבקוע את הביצה', nextLevel: 'לשלב הבא', backToLevel: 'חזרה לשלב {n}', home: 'בית',
      noMoves: 'אין יותר מהלכים',
      noMovesText: 'אפשר לבטל מהלך, להוסיף מבחנה או להתחיל את השלב מחדש.',
      undoMove: 'ביטול מהלך', addTube: 'הוספת מבחנה', restartLevel: 'התחלה מחדש',
      restartQ: 'להתחיל מחדש?', restartText: 'השלב יחזור למצב ההתחלתי.', restartKeepTube: ' המבחנה שנוספה תישאר.',
      yesRestart: 'כן, מחדש', no: 'לא',
      newBg: 'רקע חדש', newTube: 'מבחנה חדשה', newSkin: 'כדורים חדשים', plusCoins: '+{n} מטבעות',
      newEgg: 'ביצה חדשה!', collect: 'אסוף',
      tabEggs: 'ביצים', tabBg: 'רקעים', tabTube: 'מבחנות', tabSkin: 'כדורים',
      eggsCollected: 'נאספו {n} מתוך {t} · ביצה חדשה כל {k} שלבים',
      selected: 'נבחר ✓', choose: 'בחירה', eggAtLevel: '🔒 ביצה בשלב {n}', buyQ: 'לקנות?',
      youHave: 'יש לך <b>{n}</b> מטבעות',
      chooseLevel: 'בחירת שלב', chooseLevelText: 'אפשר לחזור לכל שלב שכבר נפתר',
      settings: 'הגדרות', sound: 'צלילים', vibration: 'רטט', language: 'שפה', langName: 'עברית', howToPlay: 'איך משחקים',
      help1: 'המטרה: לסדר את הכדורים כך שבכל מבחנה יהיו רק כדורים בצבע אחד.',
      help2: 'הקש על מבחנה כדי להרים את הכדור העליון, ואז הקש על מבחנה אחרת כדי להעביר אותו לשם. אפשר להעביר רק למבחנה ריקה, או על כדור באותו צבע כשיש מקום.',
      help3: 'אם מתחת לכדור העליון יש עוד כדורים באותו צבע, כולם עוברים יחד, כמה שנכנסים במבחנה.',
      help4: 'על כל שלב מקבלים {w} מטבעות, ועוד {b} על פתרון מושלם (3 כוכבים). במטבעות קונים ביטול מהלך, רמז, מבחנה נוספת ועיצובים.',
      help5: 'כל {k} שלבים בוקעת ביצה חדשה לאוסף. חלק מהביצים פותחות רקעים, מבחנות וסגנונות כדורים חדשים.',
      help6: 'מחיר הביטול והרמז מוכפל בכל שימוש וחוזר להתחלה בכל שלב חדש. מבחנה נוספת אפשר לקנות פעם אחת בשלב.',
      back: 'חזרה', letsGo: 'מתחילים!',
    },
    en: {
      logo1: 'Test', logo2: 'Tubes',
      play: 'Play', level: 'Level {n}', collection: 'Collection', levels: 'Levels',
      restart: 'Restart', undo: 'Undo', hint: 'Hint', tube: 'Tube',
      eggsWaiting: '{n} eggs are ready to hatch!', eggWaiting: 'An egg is ready to hatch!', tapToHatch: 'Tap to hatch',
      levelsToEgg1: '1 more level to the next egg', levelsToEgg: '{n} more levels to the next egg',
      noCoins: 'Not enough coins. You earn coins by finishing levels.',
      noUndo: 'Nothing to undo',
      searchingHint: 'Looking for a hint…',
      noSolution: 'No solution from here. Undo a few moves, add a tube or restart.',
      hintToast: 'Move from the yellow tube to the green one',
      oneTube: 'You can add one tube per level',
      hardBadge: '★ Hard level ★', hiddenBadge: 'Hidden balls',
      tip: 'Tap a tube to pick up the top balls, then tap another tube to move them there',
      wellDone: 'Well done!', solvedIn: 'Level {n} solved in {m} moves',
      bonusIncl: 'Includes a {b} bonus for a perfect solve',
      bonusHow: 'Solve in {p} moves or fewer for 3 stars and a bonus',
      replayNoCoins: 'Replayed levels don’t earn coins',
      newEggWaiting: '🥚 A new egg is waiting for you!',
      hatchIt: 'Hatch the egg', nextLevel: 'Next level', backToLevel: 'Back to level {n}', home: 'Home',
      noMoves: 'No more moves',
      noMovesText: 'You can undo a move, add a tube or restart the level.',
      undoMove: 'Undo move', addTube: 'Add a tube', restartLevel: 'Restart',
      restartQ: 'Restart?', restartText: 'The level will go back to the start.', restartKeepTube: ' The added tube stays.',
      yesRestart: 'Yes, restart', no: 'No',
      newBg: 'New background', newTube: 'New tube', newSkin: 'New balls', plusCoins: '+{n} coins',
      newEgg: 'New egg!', collect: 'Collect',
      tabEggs: 'Eggs', tabBg: 'Scenes', tabTube: 'Tubes', tabSkin: 'Balls',
      eggsCollected: '{n} of {t} collected · a new egg every {k} levels',
      selected: 'Selected ✓', choose: 'Choose', eggAtLevel: '🔒 Egg at level {n}', buyQ: 'Buy?',
      youHave: 'You have <b>{n}</b> coins',
      chooseLevel: 'Choose level', chooseLevelText: 'You can replay any level you’ve solved',
      settings: 'Settings', sound: 'Sound', vibration: 'Vibration', language: 'Language', langName: 'English', howToPlay: 'How to play',
      help1: 'Goal: sort the balls so each tube holds only one colour.',
      help2: 'Tap a tube to pick up its top ball, then tap another tube to move it there. You can only move onto an empty tube, or onto a ball of the same colour when there’s room.',
      help3: 'If there are more balls of the same colour right under the top one, they all move together, as many as fit.',
      help4: 'Each level gives {w} coins, plus {b} for a perfect solve (3 stars). Coins buy undos, hints, an extra tube and new looks.',
      help5: 'Every {k} levels a new egg hatches into your collection. Some eggs unlock new scenes, tubes and ball styles.',
      help6: 'Undo and hint prices double with each use and reset every level. You can buy one extra tube per level.',
      back: 'Back', letsGo: 'Let’s go!',
    },
  };

  let lang = 'he';
  function setLang(l) { lang = STR[l] ? l : 'he'; }
  function getLang() { return lang; }
  function t(key, vars) {
    let s = key in STR[lang] ? STR[lang][key] : key in STR.he ? STR.he[key] : key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  // Name of a catalog entry (egg, item, rarity) in the current language.
  function nm(o) { return lang === 'en' && o.en ? o.en : o.name; }

  root.I18n = { t, nm, setLang, getLang };
})(this);
