// js/lessons-kangxuan.js
// 康軒版各單元的「基礎教學」內容：學習目標、重點小節與簡短自我檢查。
// 內容為自行撰寫的學習導覽說明，非課本文字或題目。
// 第2單元「分數除法」直接沿用 js/lessons.js 的 fraction-divide 教學內容
// （見 js/curriculum.js 的 getLessonForVersion），此檔案不重複收錄。

function basicLesson({ title, goal, sections, checks }) {
  return {
    title,
    intro: goal,
    concepts: sections.map((s) => `本單元包含小節：${s}`),
    steps: ["先閱讀本單元的學習目標與小節重點。", "跟著課本習作逐步練習每個小節。", "遇到不懂的地方，先回頭複習前一個小節。"],
    mistakes: ["跳過小節直接寫題目，導致觀念不熟。", "沒有先弄懂名詞定義就開始計算。"],
    examples: [
      {
        question: "（教學導覽）本單元重點是什麼？",
        answer: goal,
        explanation: "先掌握學習目標，再依序閱讀各小節重點，會更容易理解後續練習。",
      },
    ],
    checks: checks && checks.length ? checks : ["我知道這個單元的學習目標。", "我知道這個單元包含哪些小節。"],
  };
}

export const KANGXUAN_LESSONS = {
  "kx-unit1": basicLesson({
    title: "最大公因數與最小公倍數 教學導覽",
    goal: "認識質數與合數的差別，學會質因數分解，並能求出兩數的最大公因數與最小公倍數。",
    sections: ["質數和合數", "質因數和質因數分解", "最大公因數", "最小公倍數"],
    checks: ["我能分辨一個數是質數還是合數。", "我會用短除法求最大公因數與最小公倍數。"],
  }),
  "kx-unit3": basicLesson({
    title: "數量關係 教學導覽",
    goal: "觀察圖形與數字的排列規律，理解「和差積商不變」的性質，並能解決間隔問題。",
    sections: ["圖形和數形的規律", "和差積商不變", "間隔問題"],
    checks: ["我能從一組數字中找出規律。", "我了解間隔問題的計算方式。"],
  }),
  "kx-unit4": basicLesson({
    title: "小數除法 教學導覽",
    goal: "學會整數除以小數、小數除以小數的計算方法，並能應用在生活情境中。",
    sections: ["整數÷小數", "小數÷小數", "小數除法的應用", "被除數、除數和商的關係"],
    checks: ["我會把小數除法轉換成整數除法再計算。", "我知道被除數、除數和商之間的關係。"],
  }),
  "kx-unit5": basicLesson({
    title: "比與比值 教學導覽",
    goal: "認識比與比值的意義，學會化簡比、找出相等的比，並能應用在生活問題中。",
    sections: ["比與比值", "相等的比", "比的應用"],
    checks: ["我知道比和比值有什麼不同。", "我會化簡一個比。"],
  }),
  "kx-review1": basicLesson({
    title: "複習（一）教學導覽",
    goal: "統整複習第1～5單元：因數倍數、分數除法、數量關係、小數除法與比的重點觀念。",
    sections: ["第1～5單元重點整理"],
    checks: ["我能說出第1～5單元各自的重點。"],
  }),
  "kx-unit6": basicLesson({
    title: "圓周長與扇形周長 教學導覽",
    goal: "認識圓周率的意義，學會計算圓周長與扇形周長。",
    sections: ["認識圓周率", "圓周長", "扇形周長"],
    checks: ["我知道圓周率大約是多少。", "我會用公式算出圓周長。"],
  }),
  "kx-unit7": basicLesson({
    title: "圓面積與扇形面積 教學導覽",
    goal: "學會圓面積與扇形面積的計算方法，並能應用在生活情境中。",
    sections: ["圓面積", "扇形面積"],
    checks: ["我會用公式算出圓面積。", "我知道扇形面積跟圓心角有關。"],
  }),
  "kx-unit8": basicLesson({
    title: "認識速率 教學導覽",
    goal: "認識速率的意義，理解距離、時間與速率的關係，並學會速率單位的換算。",
    sections: ["速率", "距離、時間和速率的關係", "速率單位的換算"],
    checks: ["我知道速率是「單位時間內走的距離」。", "我會換算不同的速率單位。"],
  }),
  "kx-unit9": basicLesson({
    title: "放大圖、縮圖與比例尺 教學導覽",
    goal: "認識放大圖與縮圖的概念，學會繪製放大圖、縮圖，並理解比例尺的應用。",
    sections: ["放大圖和縮圖", "繪製放大圖和縮圖", "比例尺"],
    checks: ["我知道放大圖和縮圖的差別。", "我會用比例尺換算實際距離。"],
  }),
  "kx-review2": basicLesson({
    title: "複習（二）教學導覽",
    goal: "統整複習第6～9單元：圓周長、圓面積、速率與比例尺的重點觀念。",
    sections: ["第6～9單元重點整理"],
    checks: ["我能說出第6～9單元各自的重點。"],
  }),
};

export function getKangxuanLesson(unitId) {
  return KANGXUAN_LESSONS[unitId];
}
