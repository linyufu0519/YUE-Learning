// js/data-kangxuan.js
// 康軒版《國民小學數學習作》第十一冊（六上）單元目錄。
// 僅依課本目錄建立單元／小節「標題」與教學導覽用的重點清單，不複製課本內容或題目。
// 目前完整動態題庫涵蓋「最大公因數與最小公倍數」與「分數除法」；
// 其餘單元先提供教學模式的基礎介紹，練習入口標示「題庫建置中」。

export const KANGXUAN_UNITS = [
  {
    id: "kx-unit1",
    title: "第1單元 最大公因數與最小公倍數",
    semester: "六上",
    icon: "🔢",
    available: true,
    description: "認識質數、合數與質因數分解，並學會求最大公因數與最小公倍數。",
    sections: ["1-1 質數和合數", "1-2 質因數和質因數分解", "1-3 最大公因數", "1-4 最小公倍數"],
    practiceBankKey: "kx-gcf-lcm",
  },
  {
    id: "kx-unit2",
    title: "第2單元 分數除法",
    semester: "六上",
    icon: "➗",
    available: true,
    description: "最簡分數、同分母與異分母分數的除法，以及除法應用問題。",
    sections: [
      "2-1 最簡分數",
      "2-2 同分母分數的除法",
      "2-3 異分母分數的除法",
      "2-4 分數除法的應用",
      "2-5 被除數、除數和商的關係",
    ],
    // 沿用既有「分數的除法」動態題庫與教學內容（見 curriculum.js 的對應設定）。
    practiceBankKey: "fraction-divide",
    reuseLessonKey: "fraction-divide",
  },
  {
    id: "kx-unit3",
    title: "第3單元 數量關係",
    semester: "六上",
    icon: "📈",
    available: true,
    description: "觀察圖形與數形的規律，理解和差積商不變性質與間隔問題。",
    sections: ["3-1 圖形和數形的規律", "3-2 和差積商不變", "3-3 間隔問題"],
    practiceBankKey: "kx-quantity-relations",
  },
  {
    id: "kx-unit4",
    title: "第4單元 小數除法",
    semester: "六上",
    icon: "🔟",
    available: true,
    description: "整數除以小數、小數除以小數的計算方法與應用問題。",
    sections: [
      "4-1 整數÷小數",
      "4-2 小數÷小數",
      "4-3 小數除法的應用",
      "4-4 被除數、除數和商的關係",
    ],
    practiceBankKey: "kx-decimal-division",
  },
  {
    id: "kx-unit5",
    title: "第5單元 比與比值",
    semester: "六上",
    icon: "⚖️",
    available: true,
    description: "認識比與比值、找出相等的比，並應用在生活情境中。",
    sections: ["5-1 比與比值", "5-2 相等的比", "5-3 比的應用"],
  },
  {
    id: "kx-review1",
    title: "複習（一）",
    semester: "六上",
    icon: "📝",
    available: true,
    description: "複習第1～5單元：因數倍數、分數除法、數量關係、小數除法與比。",
    sections: ["第1～5單元重點整理"],
    isReview: true,
  },
  {
    id: "kx-unit6",
    title: "第6單元 圓周長與扇形周長",
    semester: "六上",
    icon: "⭕",
    available: true,
    description: "認識圓周率，並計算圓周長與扇形周長。",
    sections: ["6-1 認識圓周率", "6-2 圓周長", "6-3 扇形周長"],
  },
  {
    id: "kx-unit7",
    title: "第7單元 圓面積與扇形面積",
    semester: "六上",
    icon: "🟠",
    available: true,
    description: "圓面積與扇形面積的計算方法與應用。",
    sections: ["7-1 圓面積", "7-2 扇形面積"],
  },
  {
    id: "kx-unit8",
    title: "第8單元 認識速率",
    semester: "六上",
    icon: "🚗",
    available: true,
    description: "認識速率的意義、距離時間速率關係與速率單位換算。",
    sections: ["8-1 速率", "8-2 距離、時間和速率的關係", "8-3 速率單位的換算"],
  },
  {
    id: "kx-unit9",
    title: "第9單元 放大圖、縮圖與比例尺",
    semester: "六上",
    icon: "🗺️",
    available: true,
    description: "認識放大圖與縮圖，並學會繪製與應用比例尺。",
    sections: ["9-1 放大圖和縮圖", "9-2 繪製放大圖和縮圖", "9-3 比例尺"],
  },
  {
    id: "kx-review2",
    title: "複習（二）",
    semester: "六上",
    icon: "📝",
    available: true,
    description: "複習第6～9單元：圓周長、圓面積、速率與比例尺。",
    sections: ["第6～9單元重點整理"],
    isReview: true,
  },
];

export function getKangxuanUnitById(id) {
  return KANGXUAN_UNITS.find((u) => u.id === id);
}
